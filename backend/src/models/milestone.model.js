const mongoose = require("mongoose");

const milestoneSchema = new mongoose.Schema(
    {
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true
        },

        title: {
            type: String,
            required: true
        },

        description: {
            type: String,
            default: ""
        },

        dueDate: {
            type: Date
        },

        originalDueDate: {
            type: Date
        },

        status: {
            type: String,
            enum: [
                "Not Started",
                "In Progress",
                "Completed"
            ],
            default: "Not Started"
        },

        progress: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Milestone", milestoneSchema);
