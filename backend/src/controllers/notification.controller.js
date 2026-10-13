const Notification = require("../models/notification.model");

const getNotifications = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const total = await Notification.countDocuments({ recipient: req.user.id });
        const notifications = await Notification.find({ recipient: req.user.id })
            .populate("sender", "name email profileImage")
            .populate("project", "name")
            .populate("task", "title")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.status(200).json({
            data: notifications,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const getUnreadNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({
            recipient: req.user.id,
            isRead: false
        })
            .populate("sender", "name email profileImage")
            .populate("project", "name")
            .populate("task", "title")
            .sort({ createdAt: -1 });

        res.status(200).json({
            data: notifications,
            unreadCount: notifications.length
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const markAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;

        const notification = await Notification.findOne({
            _id: notificationId,
            recipient: req.user.id
        });

        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        notification.isRead = true;
        await notification.save();

        res.status(200).json({
            message: "Notification marked as read",
            data: notification
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user.id, isRead: false },
            { $set: { isRead: true } }
        );

        res.status(200).json({ message: "All notifications marked as read" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const deleteNotification = async (req, res) => {
    try {
        const { notificationId } = req.params;

        const result = await Notification.deleteOne({
            _id: notificationId,
            recipient: req.user.id
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "Notification not found" });
        }

        res.status(200).json({ message: "Notification deleted" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
    getNotifications,
    getUnreadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
};
