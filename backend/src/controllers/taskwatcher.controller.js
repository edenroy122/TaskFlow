const Task = require("../models/task.model");
const Project = require("../models/project.model");
const ProjectMember = require("../models/projectmembers.model");
const WorkspaceMember = require("../models/workspacemember.model");
const createActivity = require("../utils/createActivity");
const createNotification = require("../utils/createNotification");

const addWatcher = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                message: "User ID is required"
            });
        }

        const task = await Task.findById(taskId);

        if (!task) {
            return res.status(404).json({
                message: "Task not found"
            });
        }

        const project = await Project.findById(task.project);

        if (!project) {
            return res.status(404).json({
                message: "Project not found"
            });
        }

        if (project.isArchived) {
            return res.status(400).json({
                message: "Cannot add watcher to an archived project"
            });
        }

        const spaceId = project.space || project.workspace;

        const currentWorkspaceMember = await WorkspaceMember.findOne({
            $or: [{ space: spaceId }, { workspace: spaceId }],
            user: req.user.id
        });

        const currentProjectMember = await ProjectMember.findOne({
            project: project._id,
            user: req.user.id
        });

        if (!currentWorkspaceMember && !currentProjectMember) {
            return res.status(403).json({
                message: "You are not a member of this workspace or project"
            });
        }

        // Check target user workspace / project membership
        const targetWorkspaceMember = await WorkspaceMember.findOne({
            $or: [{ space: spaceId }, { workspace: spaceId }],
            user: userId
        });

        const targetProjectMember = await ProjectMember.findOne({
            project: project._id,
            user: userId
        });

        if (!targetWorkspaceMember && !targetProjectMember) {
            return res.status(400).json({
                message: "User is not a member of this project or workspace"
            });
        }

        // Disallow Stakeholders from being watchers
        const targetRole = targetWorkspaceMember?.permissionRole || targetProjectMember?.role || "";
        if (
            ["Stakeholder", "Stake holder"].includes(targetRole) ||
            targetRole.toLowerCase().includes("stakeholder") ||
            targetRole.toLowerCase().includes("stake holder")
        ) {
            return res.status(400).json({
                message: "Stakeholders cannot be added as watchers. Watchers can be Member, Product Owner, Scrum Master, etc."
            });
        }

        if (task.watchers.some(
            watcher => watcher.toString() === userId
        )) {
            return res.status(400).json({
                message: "User is already watching this task"
            });
        }

        task.watchers.push(userId);
        await task.save();

        const updatedTask = await Task.findById(taskId)
            .populate("watchers", "name email profileImage");

        await createActivity({
            userId: req.user.id,
            action: "WATCHER_ADDED",
            description: `added a watcher to task "${task.title}"`,
            projectId: project._id,
            taskId
        });

        await createNotification({
            recipient: userId,
            sender: req.user.id,
            type: "TASK_WATCHED",
            message: `You were added as a watcher on task "${task.title}"`,
            project: project._id,
            task: taskId
        });

        res.status(200).json({
            message: "Watcher added successfully",
            watchers: updatedTask.watchers,
            data: updatedTask.watchers
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server error" });
    }
};

const getWatchers = async (req, res) => {
    try {
        const { taskId } = req.params;

        const task = await Task.findById(taskId);

        if (!task) {
            return res.status(404).json({
                message: "Task not found"
            });
        }

        const project = await Project.findById(task.project);

        if (!project) {
            return res.status(404).json({
                message: "Project not found"
            });
        }

        const spaceId = project.space || project.workspace;

        const workspaceMember = await WorkspaceMember.findOne({
            $or: [{ space: spaceId }, { workspace: spaceId }],
            user: req.user.id
        });

        const projectMember = await ProjectMember.findOne({
            project: project._id,
            user: req.user.id
        });

        if (!workspaceMember && !projectMember) {
            return res.status(403).json({
                message: "You are not a member of this workspace or project"
            });
        }

        const result = await Task.findById(taskId)
            .populate("watchers", "name email profileImage");

        res.status(200).json({
            watchers: result.watchers,
            data: result.watchers
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server error" });
    }
};

const removeWatcher = async (req, res) => {
    try {
        const { taskId, userId } = req.params;

        const task = await Task.findById(taskId);

        if (!task) {
            return res.status(404).json({
                message: "Task not found"
            });
        }

        const project = await Project.findById(task.project);

        if (!project) {
            return res.status(404).json({
                message: "Project not found"
            });
        }

        const spaceId = project.space || project.workspace;

        const currentWorkspaceMember = await WorkspaceMember.findOne({
            $or: [{ space: spaceId }, { workspace: spaceId }],
            user: req.user.id
        });

        const currentProjectMember = await ProjectMember.findOne({
            project: project._id,
            user: req.user.id
        });

        const isManager =
            ["Product Owner", "Product Manager", "Scrum Master", "Project Manager", "Owner", "Admin", "Manager"].includes(currentWorkspaceMember?.permissionRole) ||
            currentProjectMember?.role === "Project Manager" ||
            (project.manager && (project.manager._id || project.manager).toString() === req.user.id.toString()) ||
            req.user.id === userId;

        if (!isManager && !currentWorkspaceMember && !currentProjectMember) {
            return res.status(403).json({
                message: "You do not have permission to remove watcher"
            });
        }

        const watcherExists = task.watchers.some(
            watcher => watcher.toString() === userId
        );

        if (!watcherExists) {
            return res.status(404).json({
                message: "Watcher not found"
            });
        }

        task.watchers = task.watchers.filter(
            watcher => watcher.toString() !== userId
        );

        await task.save();

        const updatedTask = await Task.findById(taskId)
            .populate("watchers", "name email profileImage");

        await createActivity({
            userId: req.user.id,
            action: "WATCHER_REMOVED",
            description: `removed watcher from task "${task.title}"`,
            projectId: project._id,
            taskId
        });

        await createNotification({
            recipient: userId,
            sender: req.user.id,
            type: "TASK_UNWATCHED",
            message: `You were removed as a watcher from task "${task.title}"`,
            project: project._id,
            task: taskId
        });

        res.status(200).json({
            message: "Watcher removed successfully",
            watchers: updatedTask.watchers,
            data: updatedTask.watchers
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
    addWatcher,
    getWatchers,
    removeWatcher
};