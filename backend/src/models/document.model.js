const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            default: ""
        },

        originalName: {
            type: String,
            required: true
        },

        fileName: {
            type: String,
            required: true
        },

        filePath: {
            type: String,
            required: true
        },

        fileType: {
            type: String,
            default: ""
        },

        fileSize: {
            type: Number,
            default: 0
        },

        uploadedBy: {
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
        }
    },
    {
        timestamps: true
    }
);

documentSchema.index({ project: 1, task: 1, createdAt: -1 });

module.exports = mongoose.model("Document", documentSchema);
