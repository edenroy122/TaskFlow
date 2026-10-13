const Project = require("../models/project.model");
const Task = require("../models/task.model");
const ProjectMember = require("../models/projectmembers.model");
const SpaceMember = require("../models/spacemember.model");
const Comment = require("../models/comment.model");
const Document = require("../models/document.model");

const getProjectDashboard = async (req, res) => {
    try {
        const { projectId } = req.params;

        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ message: "Project not found" });

        const spaceId = project.space || project.workspace;
        const spaceMember = await SpaceMember.findOne({
            space: spaceId,
            user: req.user.id
        });
        if (!spaceMember) return res.status(403).json({ message: "Not a space member" });

        const tasks = await Task.find({ project: projectId, isArchived: false });
        const totalMembers = await ProjectMember.countDocuments({ project: projectId });
        const totalComments = await Comment.countDocuments({ project: projectId });
        const totalDocuments = await Document.countDocuments({ project: projectId });

        const now = new Date();

        let completedTasks = 0;
        let pendingTasks = 0;
        let newTasks = 0;
        let inProgressTasks = 0;
        let reviewTasks = 0;
        let blockedTasks = 0;
        let holdTasks = 0;
        let overdueTasks = 0;

        const watchersSet = new Set();
        const byPriority = { Low: 0, Medium: 0, High: 0, Urgent: 0 };
        const byStatus = { "New Task": 0, Todo: 0, "In Progress": 0, Review: 0, Completed: 0, Hold: 0, Blocked: 0 };
        const byAssignee = {};

        tasks.forEach((t) => {
            const s = (t.status || "").toLowerCase().trim();
            if (s === "completed" || s === "done") {
                completedTasks++;
                byStatus["Completed"] = (byStatus["Completed"] || 0) + 1;
            } else if (s === "in progress" || s === "inprogress") {
                inProgressTasks++;
                byStatus["In Progress"] = (byStatus["In Progress"] || 0) + 1;
            } else if (s === "review" || s === "in review" || s === "inreview") {
                reviewTasks++;
                byStatus["Review"] = (byStatus["Review"] || 0) + 1;
            } else if (s === "blocked" || s === "hold" || s === "on hold") {
                blockedTasks++;
                holdTasks++;
                byStatus["Hold"] = (byStatus["Hold"] || 0) + 1;
                byStatus["Blocked"] = (byStatus["Blocked"] || 0) + 1;
            } else {
                // "New Task", "Todo", "To Do", "Pending", etc.
                newTasks++;
                pendingTasks++;
                byStatus["New Task"] = (byStatus["New Task"] || 0) + 1;
                byStatus["Todo"] = (byStatus["Todo"] || 0) + 1;
            }

            if (t.dueDate && new Date(t.dueDate) < now && s !== "completed" && s !== "done") {
                overdueTasks++;
            }

            if (t.priority && byPriority[t.priority] !== undefined) {
                byPriority[t.priority]++;
            }

            if (t.watchers) {
                t.watchers.forEach((w) => watchersSet.add(w.toString()));
            }

            const assigneeId = t.assignedTo ? t.assignedTo.toString() : "unassigned";
            byAssignee[assigneeId] = (byAssignee[assigneeId] || 0) + 1;
        });

        const totalTasks = tasks.length;
        const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        let completedMilestones = 0;
        let pendingMilestones = 0;

        if (project.milestones) {
            project.milestones.forEach((m) => {
                if (m.status === "Completed") completedMilestones++;
                else pendingMilestones++;
            });
        }

        res.status(200).json({
            data: {
                totalTasks,
                completedTasks,
                pendingTasks,
                todoTasks: pendingTasks,
                newTasks,
                newtaskTasks: newTasks,
                inProgressTasks,
                reviewTasks,
                blockedTasks,
                holdTasks: blockedTasks,
                overdueTasks,
                totalMembers,
                totalWatchers: watchersSet.size,
                totalComments,
                totalDocuments,
                completedMilestones,
                pendingMilestones,
                projectStartDate: project.startDate,
                projectDueDate: project.dueDate,
                completionPercentage,
                byPriority,
                byStatus,
                byAssignee
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const getUserWorkload = async (req, res) => {
    try {
        const { userId } = req.params;

        if (req.user.id !== userId) {
            const isMember = await SpaceMember.findOne({ user: req.user.id });
            if (!isMember) {
                return res.status(403).json({ message: "Unauthorized to view this workload" });
            }
        }

        const tasks = await Task.find({ assignedTo: userId, isArchived: false })
            .populate("project", "name");

        const now = new Date();

        let assignedTasks = tasks.length;
        let completedTasks = 0;
        let pendingTasks = 0;
        let overdueTasks = 0;
        let highPriorityTasks = 0;
        let urgentTasks = 0;

        const byStatus = { "New Task": 0, Todo: 0, "In Progress": 0, Review: 0, Completed: 0, Hold: 0, Blocked: 0 };

        tasks.forEach((t) => {
            const s = (t.status || "").toLowerCase().trim();
            if (s === "completed" || s === "done") completedTasks++;
            else pendingTasks++;

            if (t.dueDate && new Date(t.dueDate) < now && s !== "completed" && s !== "done") {
                overdueTasks++;
            }

            if (t.priority === "High") highPriorityTasks++;
            if (t.priority === "Urgent") urgentTasks++;

            if (s === "new task" || s === "todo" || s === "to do" || s === "new") {
                byStatus["New Task"] = (byStatus["New Task"] || 0) + 1;
                byStatus["Todo"] = (byStatus["Todo"] || 0) + 1;
            } else if (s === "in progress" || s === "inprogress") {
                byStatus["In Progress"] = (byStatus["In Progress"] || 0) + 1;
            } else if (s === "review" || s === "in review") {
                byStatus["Review"] = (byStatus["Review"] || 0) + 1;
            } else if (s === "completed" || s === "done") {
                byStatus["Completed"] = (byStatus["Completed"] || 0) + 1;
            } else if (s === "blocked" || s === "hold") {
                byStatus["Hold"] = (byStatus["Hold"] || 0) + 1;
                byStatus["Blocked"] = (byStatus["Blocked"] || 0) + 1;
            }
        });

        res.status(200).json({
            data: {
                userId,
                assignedTasks,
                completedTasks,
                pendingTasks,
                overdueTasks,
                highPriorityTasks,
                urgentTasks,
                byStatus,
                tasks
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const getSpaceDashboard = async (req, res) => {
    try {
        const spaceId = req.params.spaceId || req.params.workspaceId;

        const spaceMember = await SpaceMember.findOne({
            space: spaceId,
            user: req.user.id
        });

        if (!spaceMember) {
            return res.status(403).json({ message: "Not a space member" });
        }

        const projects = await Project.find({ space: spaceId });
        const projectIds = projects.map((p) => p._id);

        const totalProjects = projects.length;
        const activeProjects = projects.filter((p) => !p.isArchived).length;
        const archivedProjects = projects.filter((p) => p.isArchived).length;

        const allTasks = await Task.find({ project: { $in: projectIds } });
        const totalMembers = await SpaceMember.countDocuments({ space: spaceId });
        const totalDocuments = await Document.countDocuments({ project: { $in: projectIds } });
        const totalComments = await Comment.countDocuments({ project: { $in: projectIds } });

        const now = new Date();
        let totalTasks = allTasks.length;
        let completedTasks = 0;
        let overdueTasks = 0;

        const userCompletedCount = {};

        allTasks.forEach((t) => {
            if (t.status === "Completed") {
                completedTasks++;
                if (Array.isArray(t.assignedTo)) {
                    t.assignedTo.forEach((uId) => {
                        if (uId) {
                            const strId = uId.toString();
                            userCompletedCount[strId] = (userCompletedCount[strId] || 0) + 1;
                        }
                    });
                } else if (t.assignedTo) {
                    const strId = t.assignedTo.toString();
                    userCompletedCount[strId] = (userCompletedCount[strId] || 0) + 1;
                }
            }
            if (t.dueDate && new Date(t.dueDate) < now && t.status !== "Completed") {
                overdueTasks++;
            }
        });

        const topMemberIds = Object.keys(userCompletedCount)
            .filter((id) => id && id.length === 24)
            .sort((a, b) => userCompletedCount[b] - userCompletedCount[a])
            .slice(0, 5);

        const topMembersList = topMemberIds.length > 0
            ? await SpaceMember.find({
                space: spaceId,
                user: { $in: topMemberIds }
              }).populate("user", "name email")
            : [];

        const topMembers = topMembersList
            .filter((m) => m.user)
            .map((m) => ({
                user: m.user,
                completedTasks: userCompletedCount[m.user._id.toString()] || 0
            }));

        const projectSummary = await Promise.all(
            projects.map(async (p) => {
                const pTasks = allTasks.filter((t) => t.project.toString() === p._id.toString());
                const pCompleted = pTasks.filter((t) => t.status === "Completed").length;
                const pOverdue = pTasks.filter(
                    (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "Completed"
                ).length;
                const pct = pTasks.length > 0 ? Math.round((pCompleted / pTasks.length) * 100) : 0;

                return {
                    id: p._id,
                    name: p.name,
                    isArchived: p.isArchived,
                    totalTasks: pTasks.length,
                    completedTasks: pCompleted,
                    overdueTasks: pOverdue,
                    completionPercentage: pct
                };
            })
        );

        res.status(200).json({
            data: {
                totalProjects,
                activeProjects,
                archivedProjects,
                totalTasks,
                completedTasks,
                overdueTasks,
                totalMembers,
                totalDocuments,
                totalComments,
                topMembers,
                projectSummary
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
    getProjectDashboard,
    getUserWorkload,
    getSpaceDashboard,
    getWorkspaceDashboard: getSpaceDashboard
};
