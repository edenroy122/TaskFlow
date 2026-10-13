const mongoose = require("mongoose");

const projectMemberSchema = new mongoose.Schema(
    {
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true
        },

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        role: {
            type: String,
            enum: [
                "Product Owner",
                "Product Manager",
                "Scrum Master",
                "Member",
                "Stakeholder",
                "Stake holder",
                "Watcher",
                "Project Manager"
            ],
            default: "Member"
        }
    },
    {
        timestamps: true
    }
);

projectMemberSchema.index(
    {
        project: 1,
        user: 1
    },
    {
        unique: true
    }
);

module.exports = mongoose.model(
    "ProjectMember",
    projectMemberSchema
);