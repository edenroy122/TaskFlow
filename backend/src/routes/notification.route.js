const express = require("express");
const {
    getNotifications,
    getUnreadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
} = require("../controllers/notification.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", authMiddleware, getNotifications);
router.get("/unread", authMiddleware, getUnreadNotifications);
router.put("/read-all", authMiddleware, markAllAsRead);
router.put("/:notificationId/read", authMiddleware, markAsRead);
router.delete("/:notificationId", authMiddleware, deleteNotification);

module.exports = router;
