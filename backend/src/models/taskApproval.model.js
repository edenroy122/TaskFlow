const mongoose = require("mongoose");

const taskApprovalSchema = new mongoose.Schema(
    {
        task: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task",
            required: true
        },

        requestedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        approver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },

        status: {
            type: String,
            enum: [
                "Pending",
                "Approved",
                "Rejected"
            ],
            default: "Pending"
        },

        comment: {
            type: String,
            default: ""
        },

        requestedAt: {
            type: Date,
            default: Date.now
        },

        respondedAt: {
            type: Date
        }
    },
    {
        timestamps: true
    }
);

taskApprovalSchema.index({ task: 1, createdAt: -1 });

module.exports = mongoose.model("TaskApproval", taskApprovalSchema);
