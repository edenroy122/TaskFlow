const Activity = require("../models/activity.model");
const Project = require("../models/project.model");
const Task = require("../models/task.model");
const SpaceMember = require("../models/spacemember.model");

const getProjectActivities = async (req, res) => {
    try {
        const { projectId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limitParam = req.query.limit;
        // Default to returning all activities so full audit log across all days is available
        const isFetchAll = limitParam === "all" || limitParam === "0" || !limitParam;
        const limit = isFetchAll ? 0 : parseInt(limitParam);

        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ message: "Project not found" });

        const spaceId = project.space || project.workspace;
        const member = await SpaceMember.findOne({
            $or: [{ space: spaceId }, { workspace: spaceId }],
            user: req.user.id
        });
        if (!member) return res.status(403).json({ message: "Not a space member" });

        const total = await Activity.countDocuments({ project: projectId });
        let query = Activity.find({ project: projectId })
            .populate("user", "name email profileImage")
            .populate("task", "title")
            .sort({ createdAt: -1 });

        if (limit > 0) {
            query = query.skip((page - 1) * limit).limit(limit);
        }

        const activities = await query;

        res.status(200).json({
            data: activities,
            activities,
            page,
            limit: limit > 0 ? limit : total,
            total,
            totalPages: limit > 0 ? Math.ceil(total / limit) : 1
        });
    } catch (error) {
        console.error("Error in getProjectActivities:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const getTaskActivities = async (req, res) => {
    try {
        const { taskId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limitParam = req.query.limit;
        // Default to returning all activities so full audit log across all days is available
        const isFetchAll = limitParam === "all" || limitParam === "0" || !limitParam;
        const limit = isFetchAll ? 0 : parseInt(limitParam);

        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ message: "Task not found" });

        const project = await Project.findById(task.project);
        if (!project) return res.status(404).json({ message: "Project not found" });

        const spaceId = project.space || project.workspace;
        const member = await SpaceMember.findOne({
            $or: [{ space: spaceId }, { workspace: spaceId }],
            user: req.user.id
        });
        if (!member) return res.status(403).json({ message: "Not a space member" });

        const total = await Activity.countDocuments({ task: taskId });
        let query = Activity.find({ task: taskId })
            .populate("user", "name email profileImage")
            .sort({ createdAt: -1 });

        if (limit > 0) {
            query = query.skip((page - 1) * limit).limit(limit);
        }

        const activities = await query;

        res.status(200).json({
            data: activities,
            activities,
            page,
            limit: limit > 0 ? limit : total,
            total,
            totalPages: limit > 0 ? Math.ceil(total / limit) : 1
        });
    } catch (error) {
        console.error("Error in getTaskActivities:", error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
    getProjectActivities,
    getTaskActivities
};
