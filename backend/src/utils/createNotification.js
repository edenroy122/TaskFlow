const Notification = require("../models/notification.model");
const { getIO } = require("./socket");
const { sendWatcherEmail } = require("./emailService");

const IMPORTANT_EMAIL_EVENTS = [
    "TASK_COMPLETED",
    "PROJECT_COMPLETED",
    "TASK_BLOCKED",
    "MILESTONE_COMPLETED",
    "APPROVAL_REQUEST",
    "APPROVAL_APPROVED",
    "APPROVAL_REJECTED",
    "PROJECT_ARCHIVED",
    "DUE_DATE_CHANGED"
];

const createNotification = async ({
    recipient,
    sender,
    type,
    title,
    message,
    project,
    task,
    comment
}) => {
    try {
        if (!recipient || !sender || !type || !message) {
            return null;
        }

        // Do not notify the person who performed the action
        if (recipient.toString() === sender.toString()) {
            return null;
        }

        const notificationTitle = title || type.replace(/_/g, " ");

        const notification = await Notification.create({
            recipient,
            sender,
            type,
            title: notificationTitle,
            message,
            project,
            task,
            comment
        });

        // Emit real-time notification via Socket.IO
        const io = getIO();
        if (io) {
            io.to(`user:${recipient.toString()}`).emit("notification:new", notification);
        }

        // Send email notification for important events (Watchers & Members)
        if (IMPORTANT_EMAIL_EVENTS.includes(type)) {
            sendWatcherEmail(recipient, type, notificationTitle, message).catch((err) => {
                console.error("Async email dispatch error:", err);
            });
        }

        return notification;
    } catch (error) {
        console.error("Error creating notification:", error);
        return null;
    }
};

module.exports = createNotification;
