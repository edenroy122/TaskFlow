const Project = require("../models/project.model");
const Task = require("../models/task.model");
const Milestone = require("../models/milestone.model");
const Document = require("../models/document.model");
const Activity = require("../models/activity.model");
const Notification = require("../models/notification.model");
const SpaceMember = require("../models/spacemember.model");
const ProjectMember = require("../models/projectmembers.model");
const User = require("../models/user.model");

// Helper: Ensure user has access to project
const verifyWatcherAccess = async (userId, projectId) => {
    const project = await Project.findById(projectId).populate("manager", "name email");
    if (!project) return { error: "Project not found", status: 404 };

    const spaceId = project.space || project.workspace;
    const spaceMember = await SpaceMember.findOne({
        space: spaceId,
        user: userId
    });

    if (!spaceMember) return { error: "Access denied. You are not a space member.", status: 403 };

    // Space Owners, Admins, Project Managers, or project manager have full access
    const isSpaceAdmin = ["Owner", "Admin", "Project Manager", "Manager"].includes(spaceMember.permissionRole);
    const isProjManager = project.manager && project.manager._id.toString() === userId.toString();
    const isCreator = project.createdBy && project.createdBy.toString() === userId.toString();

    if (!isSpaceAdmin && !isProjManager && !isCreator) {
        const pMember = await ProjectMember.findOne({
            project: projectId,
            user: userId
        });

        if (!pMember) {
            return { error: "Access denied. You are not a member of this project.", status: 403 };
        }
    }

    return { project, spaceMember };
};

// 1. GET /api/watcher/projects
const getWatcherProjects = async (req, res) => {
    try {
        const userId = req.user.id;
        const spaceId = req.query.spaceId || req.query.workspaceId;

        let query = {};
        if (spaceId) {
            query.space = spaceId;
        } else {
            const spaceMemberships = await SpaceMember.find({ user: userId });
            const spaceIds = spaceMemberships.map((m) => m.space);
            query.space = { $in: spaceIds };
        }

        const spaceMemberships = await SpaceMember.find({ user: userId });
        const spaceRoleMap = {};
        spaceMemberships.forEach((m) => {
            if (m.space) {
                spaceRoleMap[m.space.toString()] = m.permissionRole;
            }
        });

        const allProjects = await Project.find(query)
            .populate("manager", "name email")
            .sort({ createdAt: -1 });

        const userProjectMemberships = await ProjectMember.find({ user: userId });
        const memberProjectIds = new Set(userProjectMemberships.map((pm) => pm.project.toString()));

        // Filter out projects that the user does not have permission to view
        const projects = allProjects.filter((p) => {
            const pSpaceId = (p.space || p.workspace)?.toString();
            const role = pSpaceId ? spaceRoleMap[pSpaceId] : null;
            if (role && ["Owner", "Admin", "Project Manager", "Manager"].includes(role)) return true;
            if (p.manager && (p.manager._id || p.manager).toString() === userId.toString()) return true;
            if (p.createdBy && p.createdBy.toString() === userId.toString()) return true;
            return memberProjectIds.has(p._id.toString());
        });

        const projectSummaries = await Promise.all(
            projects.map(async (p) => {
                const tasks = await Task.find({ project: p._id });
                const milestones = await Milestone.find({ project: p._id });

                const totalTasks = tasks.length;
                const completedTasks = tasks.filter((t) => t.status === "Completed").length;
                const remainingTasks = totalTasks - completedTasks;
                const overdueTasks = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "Completed").length;
                const blockedTasks = tasks.filter((t) => t.status === "Blocked" || t.status === "Hold").length;

                const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                let health = "GREEN"; // On Track
                if (overdueTasks > 2 || blockedTasks > 2) {
                    health = "RED"; // Delayed
                } else if (overdueTasks > 0 || blockedTasks > 0) {
                    health = "YELLOW"; // At Risk
                }

                return {
                    _id: p._id,
                    name: p.name,
                    description: p.description,
                    manager: p.manager,
                    startDate: p.startDate,
                    dueDate: p.dueDate,
                    isArchived: p.isArchived,
                    isCompleted: p.status === "Completed",
                    status: p.status || "In Progress",
                    progress,
                    health,
                    totalTasks,
                    completedTasks,
                    remainingTasks,
                    overdueTasks,
                    blockedTasks,
                    totalMilestones: milestones.length,
                    completedMilestones: milestones.filter((m) => m.status === "Completed").length
                };
            })
        );

        res.json({ projects: projectSummaries });
    } catch (error) {
        console.error("getWatcherProjects error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// 2. GET /api/watcher/project/:projectId/dashboard
const getWatcherProjectDashboard = async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.user.id;

        const { project, error, status } = await verifyWatcherAccess(userId, projectId);
        if (error) return res.status(status).json({ message: error });

        const tasks = await Task.find({ project: projectId }).populate("assignedTo", "name email");
        const milestones = await Milestone.find({ project: projectId }).sort({ dueDate: 1 });
        const documents = await Document.find({ project: projectId });

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter((t) => t.status === "Completed").length;
        const remainingTasks = totalTasks - completedTasks;
        const overdueTasks = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "Completed").length;
        const blockedTasks = tasks.filter((t) => t.status === "Blocked" || t.status === "Hold").length;

        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        const isProjectCompleted = project.status === "Completed";

        let health = "GREEN";
        if (overdueTasks > 2 || blockedTasks > 2) {
            health = "RED";
        } else if (overdueTasks > 0 || blockedTasks > 0) {
            health = "YELLOW";
        }

        const recentActivities = await Activity.find({ project: projectId })
            .populate("user", "name email")
            .sort({ createdAt: -1 })
            .limit(10);

        const sinceTime = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const recentTasksCompleted = tasks.filter((t) => t.status === "Completed" && t.updatedAt && new Date(t.updatedAt) > sinceTime).length;
        const recentMilestonesCompleted = milestones.filter((m) => m.status === "Completed" && m.updatedAt && new Date(m.updatedAt) > sinceTime).length;
        const recentTasksAdded = tasks.filter((t) => t.createdAt && new Date(t.createdAt) > sinceTime).length;
        const recentDocumentsUploaded = documents.filter((d) => d.createdAt && new Date(d.createdAt) > sinceTime).length;
        const recentOverdueTasks = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "Completed" && t.updatedAt && new Date(t.updatedAt) > sinceTime).length;

        res.json({
            project: {
                _id: project._id,
                name: project.name,
                description: project.description,
                manager: project.manager,
                startDate: project.startDate,
                dueDate: project.dueDate,
                isArchived: project.isArchived,
                isCompleted: isProjectCompleted,
                status: project.status || "In Progress"
            },
            metrics: {
                progress,
                health,
                totalTasks,
                completedTasks,
                remainingTasks,
                overdueTasks,
                blockedTasks,
                totalMilestones: milestones.length,
                completedMilestones: milestones.filter((m) => m.status === "Completed").length
            },
            milestonesSummary: milestones.map((m) => ({
                _id: m._id,
                title: m.title,
                description: m.description,
                status: m.status,
                progress: m.progress || (m.status === "Completed" ? 100 : 0),
                dueDate: m.dueDate
            })),
            recentUpdates: recentActivities.map((act) => ({
                _id: act._id,
                action: act.action,
                description: act.description,
                user: act.user?.name || "System",
                createdAt: act.createdAt
            })),
            sinceLastVisit: {
                sinceTime,
                completedTasks: recentTasksCompleted,
                completedMilestones: recentMilestonesCompleted,
                newTasks: recentTasksAdded,
                documentsUploaded: recentDocumentsUploaded,
                becameOverdue: recentOverdueTasks
            }
        });
    } catch (error) {
        console.error("getWatcherProjectDashboard error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// 3. GET /api/watcher/project/:projectId/updates
const getWatcherUpdates = async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.user.id;
        const category = req.query.category || "all";

        const { error, status } = await verifyWatcherAccess(userId, projectId);
        if (error) return res.status(status).json({ message: error });

        let query = { project: projectId };

        if (category === "tasks") {
            query.action = { $regex: /^TASK_/i };
        } else if (category === "milestones") {
            query.action = { $regex: /^MILESTONE_/i };
        } else if (category === "project") {
            query.action = { $regex: /^PROJECT_/i };
        } else if (category === "documents") {
            query.action = { $regex: /^DOCUMENT_/i };
        }

        const activities = await Activity.find(query)
            .populate("user", "name email")
            .sort({ createdAt: -1 })
            .limit(100);

        res.json({ updates: activities });
    } catch (error) {
        console.error("getWatcherUpdates error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// 4. GET /api/watcher/project/:projectId/report
const getWatcherReport = async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.user.id;

        const { project, error, status } = await verifyWatcherAccess(userId, projectId);
        if (error) return res.status(status).json({ message: error });

        const tasks = await Task.find({ project: projectId }).populate("assignedTo", "name email");
        const milestones = await Milestone.find({ project: projectId }).sort({ dueDate: 1 });
        const activities = await Activity.find({ project: projectId }).sort({ createdAt: 1 });

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter((t) => t.status === "Completed").length;
        const overdueTasks = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "Completed").length;
        const blockedTasks = tasks.filter((t) => t.status === "Blocked" || t.status === "Hold").length;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        const timeline = activities.map((act) => ({
            _id: act._id,
            action: act.action,
            description: act.description,
            user: act.user?.name || "System",
            date: act.createdAt
        }));

        res.json({
            projectSummary: {
                name: project.name,
                description: project.description,
                manager: project.manager,
                status: project.status || "In Progress",
                progress,
                startDate: project.startDate,
                completionDate: project.status === "Completed" ? project.updatedAt : project.dueDate
            },
            taskSummary: {
                total: totalTasks,
                completed: completedTasks,
                remaining: totalTasks - completedTasks,
                overdue: overdueTasks,
                blocked: blockedTasks
            },
            milestoneSummary: {
                total: milestones.length,
                completed: milestones.filter((m) => m.status === "Completed").length,
                milestones: milestones.map((m) => ({
                    title: m.title,
                    status: m.status,
                    dueDate: m.dueDate,
                    completedAt: m.status === "Completed" ? m.updatedAt : null
                }))
            },
            timeline
        });
    } catch (error) {
        console.error("getWatcherReport error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// 5. GET /api/watcher/project/:projectId/tasks
const getWatcherTasks = async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.user.id;

        const { error, status } = await verifyWatcherAccess(userId, projectId);
        if (error) return res.status(status).json({ message: error });

        const tasks = await Task.find({ project: projectId })
            .populate("assignedTo", "name email")
            .populate("dependencies", "title status")
            .sort({ createdAt: -1 });

        res.json({ tasks });
    } catch (error) {
        console.error("getWatcherTasks error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// 6. GET /api/watcher/project/:projectId/milestones
const getWatcherMilestones = async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.user.id;

        const { error, status } = await verifyWatcherAccess(userId, projectId);
        if (error) return res.status(status).json({ message: error });

        const milestones = await Milestone.find({ project: projectId }).sort({ dueDate: 1 });
        res.json({ milestones });
    } catch (error) {
        console.error("getWatcherMilestones error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// 7. GET /api/watcher/project/:projectId/documents
const getWatcherDocuments = async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.user.id;

        const { error, status } = await verifyWatcherAccess(userId, projectId);
        if (error) return res.status(status).json({ message: error });

        const documents = await Document.find({ project: projectId })
            .populate("uploadedBy", "name email")
            .sort({ createdAt: -1 });

        res.json({ documents });
    } catch (error) {
        console.error("getWatcherDocuments error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// 8. GET /api/watcher/notifications
const getWatcherNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const notifications = await Notification.find({ recipient: userId })
            .populate("sender", "name email")
            .populate("project", "name")
            .sort({ createdAt: -1 })
            .limit(50);

        const unreadCount = notifications.filter((n) => !n.isRead).length;

        res.json({ notifications, unreadCount });
    } catch (error) {
        console.error("getWatcherNotifications error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// 9. PUT /api/watcher/notifications/:notificationId/read
const markWatcherNotificationRead = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, recipient: req.user.id },
            { isRead: true },
            { new: true }
        );
        res.json({ message: "Notification marked read", notification });
    } catch (error) {
        console.error("markWatcherNotificationRead error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// 10. PUT /api/watcher/notifications/read-all
const markAllWatcherNotificationsRead = async (req, res) => {
    try {
        await Notification.updateMany({ recipient: req.user.id, isRead: false }, { isRead: true });
        res.json({ message: "All notifications marked read" });
    } catch (error) {
        console.error("markAllWatcherNotificationsRead error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
    getWatcherProjects,
    getWatcherProjectDashboard,
    getWatcherUpdates,
    getWatcherReport,
    getWatcherTasks,
    getWatcherMilestones,
    getWatcherDocuments,
    getWatcherNotifications,
    markWatcherNotificationRead,
    markAllWatcherNotificationsRead
};
