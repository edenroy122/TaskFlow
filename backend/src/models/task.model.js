const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
    {
        title: {
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

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        assignedTo: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ],

        priority: {
            type: String,
            enum: [
                "Low",
                "Medium",
                "High",
                "Urgent"
            ],
            default: "Medium"
        },

        status: {
            type: String,
            enum: [
                "New Task",
                
                "In Progress",
                "Review",
                "Completed",
                "Blocked",
                "Hold"
            ],
            default: "New Task"
        },

        dueDate: {
            type: Date
        },

        originalDueDate: {
            type: Date
        },

        dependencies: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Task"
            }
        ],

        watchers: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ],

        milestones: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Milestone"
            }
        ],

        subtasks: [
            {
                title: {
                    type: String,
                    required: true,
                    trim: true
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
                completed: {
                    type: Boolean,
                    default: false
                },
                assignedTo: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                    default: null
                },
                priority: {
                    type: String,
                    enum: ["Low", "Medium", "High", "Urgent"],
                    default: "Medium"
                },
                status: {
                    type: String,
                    enum: ["New Task", "Todo", "In Progress", "Completed"],
                    default: "New Task"
                }
            }
        ],

        isArchived: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

taskSchema.index({ project: 1, isArchived: 1, status: 1 });
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ milestones: 1 });
taskSchema.index({ dueDate: 1 });

module.exports = mongoose.model("Task", taskSchema);