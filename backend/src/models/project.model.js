const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },

        description: {
            type: String,
            default: ""
        },

        space: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Space",
            required: true
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        manager: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        startDate: {
            type: Date
        },

        dueDate: {
            type: Date
        },

        originalDueDate: {
            type: Date
        },

        milestones: [
            {
                name: {
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
                        "Pending",
                        "In Progress",
                        "Completed"
                    ],
                    default: "Pending"
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

// Virtual for backward compatibility with workspace field
projectSchema.virtual("workspace").get(function() {
    return this.space;
});

module.exports = mongoose.model("Project", projectSchema);