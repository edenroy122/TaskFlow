const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");

const {
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
} = require("../controllers/watcher.controller");

// Require Auth on all watcher routes
router.use(authMiddleware);

// Watcher Client Portal API Endpoints
router.get("/projects", getWatcherProjects);
router.get("/project/:projectId/dashboard", getWatcherProjectDashboard);
router.get("/project/:projectId/updates", getWatcherUpdates);
router.get("/project/:projectId/report", getWatcherReport);
router.get("/project/:projectId/tasks", getWatcherTasks);
router.get("/project/:projectId/milestones", getWatcherMilestones);
router.get("/project/:projectId/documents", getWatcherDocuments);

router.get("/notifications", getWatcherNotifications);
router.put("/notifications/read-all", markAllWatcherNotificationsRead);
router.put("/notifications/:notificationId/read", markWatcherNotificationRead);

module.exports = router;
