const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        action: {
            type: String,
            required: true
        },

        description: {
            type: String,
            default: ""
        },

        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true
        },

        task: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task"
        },

        targetType: {
            type: String,
            default: ""
        },

        targetId: {
            type: mongoose.Schema.Types.ObjectId
        }
    },
    {
        timestamps: true
    }
);

activitySchema.index({ project: 1, task: 1, createdAt: -1 });

module.exports = mongoose.model("Activity", activitySchema);
