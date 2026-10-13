const Comment = require("../models/comment.model");
const Task = require("../models/task.model");
const Project = require("../models/project.model");
const WorkspaceMember = require("../models/workspacemember.model");
const createActivity = require("../utils/createActivity");
const createNotification = require("../utils/createNotification");
const extractMentions = require("../utils/extractMentions");

const getSpaceMember = async (spaceId, userId) => {
    return await WorkspaceMember.findOne({
        $or: [{ space: spaceId }, { workspace: spaceId }],
        user: userId
    });
};

const addProjectComment = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ message: "Comment text is required" });
        }

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        if (project.isArchived) {
            return res.status(400).json({ message: "Cannot add comment to an archived project" });
        }

        const spaceId = project.space || project.workspace;
        const member = await getSpaceMember(spaceId, req.user.id);

        if (!member) {
            return res.status(403).json({ message: "Not a space member" });
        }

        if (["Stakeholder", "Stake holder", "Watcher"].includes(member.permissionRole)) {
            return res.status(403).json({ message: "Stakeholders are read-only and cannot comment" });
        }

        const mentions = await extractMentions(text);

        const comment = await Comment.create({
            text,
            user: req.user.id,
            project: projectId,
            mentions
        });

        const populatedComment = await Comment.findById(comment._id)
            .populate("user", "name email profileImage")
            .populate("mentions", "name email");

        // Log Activity
        await createActivity({
            userId: req.user.id,
            action: "COMMENT_ADDED",
            description: `added a comment on project "${project.name}"`,
            projectId,
            targetType: "Comment",
            targetId: comment._id
        });

        // Notify Project Manager if not commenter
        if (project.manager && project.manager.toString() !== req.user.id) {
            await createNotification({
                recipient: project.manager,
                sender: req.user.id,
                type: "COMMENT_ADDED",
                message: `New comment on project "${project.name}"`,
                project: projectId,
                comment: comment._id
            });
        }

        // Notify Mentions
        for (const mentionedId of mentions) {
            await createNotification({
                recipient: mentionedId,
                sender: req.user.id,
                type: "MENTION",
                message: `You were mentioned in a comment on project "${project.name}"`,
                project: projectId,
                comment: comment._id
            });
        }

        res.status(201).json({
            message: "Comment added successfully",
            data: populatedComment
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const addTaskComment = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ message: "Comment text is required" });
        }

        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        const project = await Project.findById(task.project);
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        if (project.isArchived) {
            return res.status(400).json({ message: "Cannot add comment to an archived project" });
        }

        const spaceId = project.space || project.workspace;
        const member = await getSpaceMember(spaceId, req.user.id);

        if (!member) {
            return res.status(403).json({ message: "Not a space member" });
        }

        if (["Stakeholder", "Stake holder", "Watcher"].includes(member.permissionRole)) {
            return res.status(403).json({ message: "Stakeholders are read-only and cannot comment" });
        }

        const mentions = await extractMentions(text);

        const comment = await Comment.create({
            text,
            user: req.user.id,
            project: project._id,
            task: taskId,
            mentions
        });

        const populatedComment = await Comment.findById(comment._id)
            .populate("user", "name email profileImage")
            .populate("mentions", "name email");

        // Log Activity
        await createActivity({
            userId: req.user.id,
            action: "COMMENT_ADDED",
            description: `added a comment on task "${task.title}"`,
            projectId: project._id,
            taskId,
            targetType: "Comment",
            targetId: comment._id
        });

        // Recipient list: watchers + assignee + project manager
        const recipientSet = new Set();
        if (task.assignedTo) recipientSet.add(task.assignedTo.toString());
        if (project.manager) recipientSet.add(project.manager.toString());
        if (task.watchers) {
            task.watchers.forEach((w) => recipientSet.add(w.toString()));
        }

        for (const recipientId of recipientSet) {
            await createNotification({
                recipient: recipientId,
                sender: req.user.id,
                type: "COMMENT_ADDED",
                message: `New comment on task "${task.title}"`,
                project: project._id,
                task: taskId,
                comment: comment._id
            });
        }

        // Notify Mentions
        for (const mentionedId of mentions) {
            await createNotification({
                recipient: mentionedId,
                sender: req.user.id,
                type: "MENTION",
                message: `You were mentioned in a comment on task "${task.title}"`,
                project: project._id,
                task: taskId,
                comment: comment._id
            });
        }

        res.status(201).json({
            message: "Comment added successfully",
            data: populatedComment
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const getProjectComments = async (req, res) => {
    try {
        const { projectId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limitParam = req.query.limit;
        // Default to returning all comments (or up to 1000) so all days' comments are displayed
        const isFetchAll = limitParam === "all" || limitParam === "0" || !limitParam;
        const limit = isFetchAll ? 0 : parseInt(limitParam);

        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ message: "Project not found" });

        const spaceId = project.space || project.workspace;
        const member = await getSpaceMember(spaceId, req.user.id);
        if (!member) return res.status(403).json({ message: "Not a space member" });

        const total = await Comment.countDocuments({ project: projectId, task: null });
        let query = Comment.find({ project: projectId, task: null })
            .populate("user", "name email profileImage")
            .populate("mentions", "name email")
            .sort({ createdAt: -1 });

        if (limit > 0) {
            query = query.skip((page - 1) * limit).limit(limit);
        }

        const comments = await query;

        res.status(200).json({
            data: comments,
            page,
            limit: limit > 0 ? limit : total,
            total,
            totalPages: limit > 0 ? Math.ceil(total / limit) : 1
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const getTaskComments = async (req, res) => {
    try {
        const { taskId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limitParam = req.query.limit;
        // Default to returning all comments (or up to 1000) so all days' comments are displayed
        const isFetchAll = limitParam === "all" || limitParam === "0" || !limitParam;
        const limit = isFetchAll ? 0 : parseInt(limitParam);

        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ message: "Task not found" });

        const project = await Project.findById(task.project);
        if (!project) return res.status(404).json({ message: "Project not found" });

        const spaceId = project.space || project.workspace;
        const member = await getSpaceMember(spaceId, req.user.id);
        if (!member) return res.status(403).json({ message: "Not a space member" });

        const total = await Comment.countDocuments({ task: taskId });
        let query = Comment.find({ task: taskId })
            .populate("user", "name email profileImage")
            .populate("mentions", "name email")
            .sort({ createdAt: -1 });

        if (limit > 0) {
            query = query.skip((page - 1) * limit).limit(limit);
        }

        const comments = await query;

        res.status(200).json({
            data: comments,
            page,
            limit: limit > 0 ? limit : total,
            total,
            totalPages: limit > 0 ? Math.ceil(total / limit) : 1
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const comment = await Comment.findById(commentId);
        if (!comment) return res.status(404).json({ message: "Comment not found" });

        if (comment.user.toString() !== req.user.id) {
            return res.status(403).json({ message: "Only the author can delete this comment" });
        }

        await Comment.deleteOne({ _id: commentId });

        await createActivity({
            userId: req.user.id,
            action: "COMMENT_DELETED",
            description: "deleted a comment",
            projectId: comment.project,
            taskId: comment.task
        });

        res.status(200).json({ message: "Comment deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
    addProjectComment,
    addTaskComment,
    getProjectComments,
    getTaskComments,
    deleteComment
};
