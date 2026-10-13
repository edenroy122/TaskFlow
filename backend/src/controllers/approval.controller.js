const TaskApproval = require("../models/taskApproval.model");
const Task = require("../models/task.model");
const Project = require("../models/project.model");
const WorkspaceMember = require("../models/workspacemember.model");
const createActivity = require("../utils/createActivity");
const createNotification = require("../utils/createNotification");

const requestApproval = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { comment } = req.body;

        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ message: "Task not found" });

        const project = await Project.findById(task.project);
        if (!project) return res.status(404).json({ message: "Project not found" });

        if (project.isArchived) {
            return res.status(400).json({ message: "Cannot request approval in an archived project" });
        }

        const workspaceMember = await WorkspaceMember.findOne({
            workspace: project.workspace,
            user: req.user.id
        });

        if (!workspaceMember) return res.status(403).json({ message: "Not a workspace member" });

        const isAssignee = task.assignedTo && task.assignedTo.toString() === req.user.id;
        const isManager = project.manager && project.manager.toString() === req.user.id;
        const isOwnerOrAdmin = workspaceMember.permissionRole === "Owner" || workspaceMember.permissionRole === "Admin";

        if (!isAssignee && !isManager && !isOwnerOrAdmin) {
            return res.status(403).json({ message: "Only assignee, manager, or admin can request task approval" });
        }

        // Set task status to Review if not already
        if (task.status !== "Review") {
            task.status = "Review";
            await task.save();
        }

        const approval = await TaskApproval.create({
            task: taskId,
            requestedBy: req.user.id,
            approver: project.manager,
            status: "Pending",
            comment: comment || "Approval requested for completed work"
        });

        const populatedApproval = await TaskApproval.findById(approval._id)
            .populate("requestedBy", "name email")
            .populate("approver", "name email");

        // Log Activity
        await createActivity({
            userId: req.user.id,
            action: "APPROVAL_REQUESTED",
            description: `requested approval for task "${task.title}"`,
            projectId: project._id,
            taskId,
            targetType: "TaskApproval",
            targetId: approval._id
        });

        // Notify Project Manager
        if (project.manager && project.manager.toString() !== req.user.id) {
            await createNotification({
                recipient: project.manager,
                sender: req.user.id,
                type: "APPROVAL_REQUEST",
                message: `Approval requested for task "${task.title}"`,
                project: project._id,
                task: taskId
            });
        }

        res.status(201).json({
            message: "Approval requested successfully",
            data: populatedApproval
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const getTaskApprovals = async (req, res) => {
    try {
        const { taskId } = req.params;

        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ message: "Task not found" });

        const project = await Project.findById(task.project);
        if (!project) return res.status(404).json({ message: "Project not found" });

        const member = await WorkspaceMember.findOne({ workspace: project.workspace, user: req.user.id });
        if (!member) return res.status(403).json({ message: "Not a workspace member" });

        const approvals = await TaskApproval.find({ task: taskId })
            .populate("requestedBy", "name email")
            .populate("approver", "name email")
            .sort({ createdAt: -1 });

        res.status(200).json({ data: approvals });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const respondToApproval = async (req, res) => {
    try {
        const { taskId, approvalId } = req.params;
        const { status, comment } = req.body;

        if (!["Approved", "Rejected"].includes(status)) {
            return res.status(400).json({ message: "Status must be 'Approved' or 'Rejected'" });
        }

        const approval = await TaskApproval.findById(approvalId);
        if (!approval) return res.status(404).json({ message: "Approval request not found" });

        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ message: "Task not found" });

        const project = await Project.findById(task.project);
        if (!project) return res.status(404).json({ message: "Project not found" });

        const workspaceMember = await WorkspaceMember.findOne({
            workspace: project.workspace,
            user: req.user.id
        });

        if (!workspaceMember) return res.status(403).json({ message: "Not a workspace member" });

        const isProjectManager = project.manager && project.manager.toString() === req.user.id;
        const isOwnerOrAdmin = workspaceMember.permissionRole === "Owner" || workspaceMember.permissionRole === "Admin";

        if (!isProjectManager && !isOwnerOrAdmin) {
            return res.status(403).json({ message: "Only project manager or workspace owner/admin can approve/reject" });
        }

        approval.status = status;
        approval.approver = req.user.id;
        approval.respondedAt = new Date();
        if (comment) approval.comment = comment;
        await approval.save();

        if (status === "Approved") {
            // Validate dependencies before completing
            if (task.dependencies && task.dependencies.length > 0) {
                const dependencies = await Task.find({ _id: { $in: task.dependencies } });
                const incomplete = dependencies.find((d) => d.status !== "Completed");
                if (incomplete) {
                    return res.status(400).json({
                        message: `Cannot approve completion. Dependency task "${incomplete.title}" is incomplete.`
                    });
                }
            }
            task.status = "Completed";
            await task.save();

            await createActivity({
                userId: req.user.id,
                action: "APPROVAL_APPROVED",
                description: `approved task "${task.title}"`,
                projectId: project._id,
                taskId
            });

            await createNotification({
                recipient: approval.requestedBy,
                sender: req.user.id,
                type: "APPROVAL_APPROVED",
                message: `Approval APPROVED for task "${task.title}"`,
                project: project._id,
                task: taskId
            });
        } else {
            task.status = "In Progress";
            await task.save();

            await createActivity({
                userId: req.user.id,
                action: "APPROVAL_REJECTED",
                description: `rejected approval for task "${task.title}"`,
                projectId: project._id,
                taskId
            });

            await createNotification({
                recipient: approval.requestedBy,
                sender: req.user.id,
                type: "APPROVAL_REJECTED",
                message: `Approval REJECTED for task "${task.title}"`,
                project: project._id,
                task: taskId
            });
        }

        res.status(200).json({
            message: `Approval ${status.toLowerCase()} successfully`,
            data: approval
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
    requestApproval,
    getTaskApprovals,
    respondToApproval
};
