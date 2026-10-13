const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        type: {
            type: String,
            enum: [
                "PROJECT_MEMBER_ADDED",
                "PROJECT_MEMBER_REMOVED",
                "TASK_ASSIGNED",
                "TASK_STATUS_CHANGED",
                "TASK_COMPLETED",
                "TASK_WATCHED",
                "TASK_UNWATCHED",
                "COMMENT_ADDED",
                "DOCUMENT_UPLOADED",
                "PROJECT_ARCHIVED",
                "PROJECT_RESTORED",
                "MENTION",
                "APPROVAL_REQUEST",
                "APPROVAL_APPROVED",
                "APPROVAL_REJECTED"
            ],
            required: true
        },

        title: {
            type: String,
            default: ""
        },

        message: {
            type: String,
            required: true
        },

        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project"
        },

        task: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task"
        },

        comment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Comment"
        },

        isRead: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
