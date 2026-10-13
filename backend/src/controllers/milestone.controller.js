const Milestone = require("../models/milestone.model");
const Project = require("../models/project.model");
const SpaceMember = require("../models/spacemember.model");
const ProjectMember = require("../models/projectmembers.model");
const createActivity = require("../utils/createActivity");
const createNotification = require("../utils/createNotification");

// Helper check permission for milestone operations: Only Product Owner (or Space Owner/Admin)
const checkPMPermission = async (project, userId) => {
    const spaceId = project.space || project.workspace;
    const spaceMember = await SpaceMember.findOne({
        space: spaceId,
        user: userId
    });

    if (!spaceMember) return false;

    if (["Product Owner", "Product Manager", "Owner", "Admin"].includes(spaceMember.permissionRole)) {
        return true;
    }

    return false;
};

const createMilestone = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { title, description, dueDate, status, progress } = req.body;

        if (!title) {
            return res.status(400).json({ message: "Milestone title is required" });
        }

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        const hasPermission = await checkPMPermission(project, req.user.id);
        if (!hasPermission) {
            return res.status(403).json({ message: "Only Product Owners can create milestones" });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dueDate && isNaN(new Date(dueDate).getTime())) {
            return res.status(400).json({ message: "Invalid due date format" });
        }

        if (dueDate && new Date(dueDate) < today) {
            return res.status(400).json({ message: "Milestone due date cannot be in the past" });
        }

        if (dueDate && project.startDate && new Date(dueDate) < new Date(project.startDate)) {
            return res.status(400).json({ message: "Milestone due date cannot be before project start date" });
        }

        let projectExtended = false;
        // If milestone due date extends beyond project due date, automatically extend project's due date!
        if (dueDate && project.dueDate && new Date(dueDate) > new Date(project.dueDate)) {
            if (!project.originalDueDate && project.dueDate) {
                project.originalDueDate = project.dueDate;
            }
            project.dueDate = new Date(dueDate);
            await project.save();
            projectExtended = true;
        }

        const milestone = await Milestone.create({
            project: projectId,
            title,
            description: description || "",
            dueDate: dueDate || undefined,
            originalDueDate: dueDate || undefined,
            status: status || "Not Started",
            progress: progress !== undefined ? progress : 0,
            createdBy: req.user.id
        });

        if (projectExtended) {
            await createActivity({
                userId: req.user.id,
                action: "PROJECT_DUE_DATE_EXTENDED",
                description: `automatically extended project "${project.name}" due date to ${new Date(project.dueDate).toLocaleDateString()} due to new milestone "${milestone.title}" (Original: ${new Date(project.originalDueDate).toLocaleDateString()})`,
                projectId: project._id,
                targetType: "Project",
                targetId: project._id
            });
        }

        await createActivity({
            userId: req.user.id,
            action: "MILESTONE_CREATED",
            description: `created milestone "${milestone.title}" in project "${project.name}"`,
            projectId: project._id
        });

        res.status(201).json({
            message: "Milestone created successfully",
            milestone,
            data: milestone
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const getMilestones = async (req, res) => {
    try {
        const { projectId } = req.params;

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        const spaceId = project.space || project.workspace;
        const spaceMember = await SpaceMember.findOne({
            space: spaceId,
            user: req.user.id
        });

        if (!spaceMember) {
            return res.status(403).json({ message: "You are not a member of this space" });
        }

        const milestones = await Milestone.find({ project: projectId }).sort({ dueDate: 1, createdAt: 1 });

        res.status(200).json({
            milestones,
            data: milestones
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const updateMilestone = async (req, res) => {
    try {
        const { milestoneId } = req.params;
        const { title, description, dueDate, status, progress } = req.body;

        const milestone = await Milestone.findById(milestoneId);
        if (!milestone) {
            return res.status(404).json({ message: "Milestone not found" });
        }

        const project = await Project.findById(milestone.project);
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        const hasPermission = await checkPMPermission(project, req.user.id);
        if (!hasPermission) {
            return res.status(403).json({ message: "Only Product Owners can update milestones" });
        }

        const oldStatus = milestone.status;
        const oldMilestoneDueDate = milestone.dueDate;

        const effectiveDueDate = dueDate !== undefined ? dueDate : milestone.dueDate;
        if (effectiveDueDate && isNaN(new Date(effectiveDueDate).getTime())) {
            return res.status(400).json({ message: "Invalid due date format" });
        }
        if (effectiveDueDate && project.startDate && new Date(effectiveDueDate) < new Date(project.startDate)) {
            return res.status(400).json({ message: "Milestone due date cannot be before project start date" });
        }
        let projectExtended = false;
        // If milestone due date extends beyond project target due date, automatically extend project's due date!
        if (effectiveDueDate && project.dueDate && new Date(effectiveDueDate) > new Date(project.dueDate)) {
            if (!project.originalDueDate && project.dueDate) {
                project.originalDueDate = project.dueDate;
            }
            project.dueDate = new Date(effectiveDueDate);
            await project.save();
            projectExtended = true;
        }

        if (title !== undefined) milestone.title = title;
        if (description !== undefined) milestone.description = description;
        if (dueDate !== undefined) {
            if (dueDate) {
                if (!milestone.originalDueDate && milestone.dueDate) {
                    milestone.originalDueDate = milestone.dueDate;
                } else if (!milestone.originalDueDate) {
                    milestone.originalDueDate = new Date(dueDate);
                }
            }
            milestone.dueDate = dueDate || null;
        }
        if (status !== undefined) milestone.status = status;
        if (progress !== undefined) milestone.progress = progress;

        if (status === "Completed" && progress === undefined) {
            milestone.progress = 100;
        }

        await milestone.save();

        if (projectExtended) {
            await createActivity({
                userId: req.user.id,
                action: "PROJECT_DUE_DATE_EXTENDED",
                description: `automatically extended project "${project.name}" due date to ${new Date(project.dueDate).toLocaleDateString()} due to milestone "${milestone.title}" extension (Original: ${new Date(project.originalDueDate).toLocaleDateString()})`,
                projectId: project._id,
                targetType: "Project",
                targetId: project._id
            });
        }

        const dueDateChanged = dueDate !== undefined && (
            (oldMilestoneDueDate && !milestone.dueDate) ||
            (!oldMilestoneDueDate && milestone.dueDate) ||
            (oldMilestoneDueDate && milestone.dueDate && new Date(oldMilestoneDueDate).getTime() !== new Date(milestone.dueDate).getTime())
        );

        if (dueDateChanged) {
            const isExtended = milestone.originalDueDate && milestone.dueDate && new Date(milestone.dueDate) > new Date(milestone.originalDueDate);
            await createActivity({
                userId: req.user.id,
                action: isExtended ? "MILESTONE_DUE_DATE_EXTENDED" : "MILESTONE_DUE_DATE_UPDATED",
                description: isExtended
                    ? `extended milestone "${milestone.title}" due date to ${new Date(milestone.dueDate).toLocaleDateString()} in project "${project.name}" (Original: ${new Date(milestone.originalDueDate).toLocaleDateString()})`
                    : `updated milestone "${milestone.title}" due date to ${milestone.dueDate ? new Date(milestone.dueDate).toLocaleDateString() : "none"} in project "${project.name}"`,
                projectId: project._id,
                targetType: "Milestone",
                targetId: milestone._id
            });
        } else {
            await createActivity({
                userId: req.user.id,
                action: "MILESTONE_UPDATED",
                description: `updated milestone "${milestone.title}" in project "${project.name}"`,
                projectId: project._id,
                targetType: "Milestone",
                targetId: milestone._id
            });
        }

        if (status === "Completed" && oldStatus !== "Completed") {
            const projectMembers = await ProjectMember.find({ project: project._id });
            for (const pm of projectMembers) {
                await createNotification({
                    recipient: pm.user,
                    sender: req.user.id,
                    type: "MILESTONE_COMPLETED",
                    message: `Milestone "${milestone.title}" in project "${project.name}" has been completed!`,
                    project: project._id
                });
            }
        }

        res.status(200).json({
            message: "Milestone updated successfully",
            milestone,
            data: milestone
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const deleteMilestone = async (req, res) => {
    try {
        const { milestoneId } = req.params;

        const milestone = await Milestone.findById(milestoneId);
        if (!milestone) {
            return res.status(404).json({ message: "Milestone not found" });
        }

        const project = await Project.findById(milestone.project);
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        const hasPermission = await checkPMPermission(project, req.user.id);
        if (!hasPermission) {
            return res.status(403).json({ message: "Only Product Owners can delete milestones" });
        }

        await Milestone.deleteOne({ _id: milestoneId });

        await createActivity({
            userId: req.user.id,
            action: "MILESTONE_DELETED",
            description: `deleted milestone "${milestone.title}" from project "${project.name}"`,
            projectId: project._id
        });

        res.status(200).json({
            message: "Milestone deleted successfully"
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
    createMilestone,
    getMilestones,
    updateMilestone,
    deleteMilestone
};
