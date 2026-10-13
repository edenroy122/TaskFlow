const Project = require("../models/project.model");
const Task = require("../models/task.model");
const ProjectMember = require("../models/projectmembers.model");
const SpaceMember = require("../models/spacemember.model");
const Activity = require("../models/activity.model");

const getProjectReport = async (req, res) => {
    try {
        const { projectId } = req.params;

        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ message: "Project not found" });

        const spaceId = project.space || project.workspace;
        const member = await SpaceMember.findOne({
            space: spaceId,
            user: req.user.id
        });
        if (!member) return res.status(403).json({ message: "Not a space member" });

        const tasks = await Task.find({ project: projectId, isArchived: false })
            .populate("assignedTo", "name email");

        const now = new Date();
        let completed = 0;
        let overdue = 0;

        const priorityDistribution = { Low: 0, Medium: 0, High: 0, Urgent: 0 };
        const statusDistribution = { "New Task": 0, Todo: 0, "In Progress": 0, Review: 0, Completed: 0, Hold: 0, Blocked: 0 };
        const memberWorkload = {};

        tasks.forEach((t) => {
            const s = (t.status || "").toLowerCase().trim();
            if (s === "completed" || s === "done") completed++;
            if (t.dueDate && new Date(t.dueDate) < now && s !== "completed" && s !== "done") overdue++;

            if (t.priority && priorityDistribution[t.priority] !== undefined) {
                priorityDistribution[t.priority]++;
            }
            if (s === "new task" || s === "todo" || s === "to do" || s === "new") {
                statusDistribution["New Task"]++;
                statusDistribution["Todo"]++;
            } else if (s === "in progress" || s === "inprogress") {
                statusDistribution["In Progress"]++;
            } else if (s === "review" || s === "in review") {
                statusDistribution["Review"]++;
            } else if (s === "completed" || s === "done") {
                statusDistribution["Completed"]++;
            } else if (s === "blocked" || s === "hold") {
                statusDistribution["Hold"]++;
                statusDistribution["Blocked"]++;
            }

            if (t.assignedTo) {
                const assignees = Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo];
                assignees.forEach((u) => {
                    if (u) {
                        const name = u.name || u.email || "Unknown";
                        if (!memberWorkload[name]) {
                            memberWorkload[name] = { total: 0, completed: 0, overdue: 0 };
                        }
                        memberWorkload[name].total++;
                        if (t.status === "Completed") memberWorkload[name].completed++;
                        if (t.dueDate && new Date(t.dueDate) < now && t.status !== "Completed") memberWorkload[name].overdue++;
                    }
                });
            }
        });

        const totalTasks = tasks.length;
        const completionPercentage = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

        const recentActivity = await Activity.find({ project: projectId })
            .populate("user", "name email")
            .sort({ createdAt: -1 })
            .limit(10);

        res.status(200).json({
            data: {
                project: {
                    id: project._id,
                    name: project.name,
                    isArchived: project.isArchived,
                    startDate: project.startDate,
                    dueDate: project.dueDate
                },
                taskStatistics: {
                    totalTasks,
                    completedTasks: completed,
                    overdueTasks: overdue,
                    completionPercentage
                },
                priorityDistribution,
                statusDistribution,
                memberWorkload,
                milestones: project.milestones || [],
                recentActivity
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const getSpaceReport = async (req, res) => {
    try {
        const spaceId = req.params.spaceId || req.params.workspaceId;

        const member = await SpaceMember.findOne({
            space: spaceId,
            user: req.user.id
        });
        if (!member) return res.status(403).json({ message: "Not a space member" });

        const projects = await Project.find({ space: spaceId });
        const projectIds = projects.map((p) => p._id);
        const tasks = await Task.find({ project: { $in: projectIds } });
        const members = await SpaceMember.find({ space: spaceId }).populate("user", "name email");

        const now = new Date();
        let totalCompleted = 0;
        let totalOverdue = 0;

        tasks.forEach((t) => {
            if (t.status === "Completed") totalCompleted++;
            if (t.dueDate && new Date(t.dueDate) < now && t.status !== "Completed") totalOverdue++;
        });

        const totalTasks = tasks.length;
        const overallCompletionPercentage = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

        const memberProductivity = members.map((m) => {
            const userIdStr = m.user?._id?.toString();
            const mTasks = tasks.filter((t) => {
                if (!t.assignedTo || !userIdStr) return false;
                if (Array.isArray(t.assignedTo)) {
                    return t.assignedTo.some((id) => id?.toString() === userIdStr);
                }
                return t.assignedTo.toString() === userIdStr;
            });
            const mCompleted = mTasks.filter((t) => t.status === "Completed").length;
            return {
                user: m.user,
                assigned: mTasks.length,
                completed: mCompleted
            };
        });

        res.status(200).json({
            data: {
                projectCount: projects.length,
                taskCount: totalTasks,
                completionStatistics: {
                    completedTasks: totalCompleted,
                    overallCompletionPercentage
                },
                overdueStatistics: {
                    overdueTasks: totalOverdue
                },
                memberProductivity,
                projectPerformance: projects.map((p) => {
                    const pTasks = tasks.filter((t) => t.project.toString() === p._id.toString());
                    const pCompleted = pTasks.filter((t) => t.status === "Completed").length;
                    return {
                        id: p._id,
                        name: p.name,
                        totalTasks: pTasks.length,
                        completedTasks: pCompleted,
                        completionPercentage: pTasks.length > 0 ? Math.round((pCompleted / pTasks.length) * 100) : 0
                    };
                })
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
    getProjectReport,
    getSpaceReport,
    getWorkspaceReport: getSpaceReport
};
