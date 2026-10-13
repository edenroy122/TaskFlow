const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
    {
        text: {
            type: String,
            required: true
        },

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
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

        mentions: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ]
    },
    {
        timestamps: true
    }
);

commentSchema.index({ project: 1, task: 1, createdAt: -1 });

module.exports = mongoose.model("Comment", commentSchema);
