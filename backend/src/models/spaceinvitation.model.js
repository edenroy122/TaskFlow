const mongoose = require("mongoose");

const spaceInvitationSchema = new mongoose.Schema(
    {
        space: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Space",
            required: true
        },

        invitedUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        invitedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        permissionRole: {
            type: String,
            enum: [
                "Product Owner",
                "Product Manager",
                "Scrum Master",
                "Member",
                "Stakeholder",
                "Stake holder",
                "Watcher",
                "Owner",
                "Admin",
                "Manager"
            ],
            default: "Member"
        },

        jobRole: {
            type: String,
            enum: {
                values: [
                    "Developer",
                    "Tester",
                    "Product Lead",
                    "Others",
                    "Other",
                    "developer",
                    "tester",
                    "product lead",
                    "others",
                    "other"
                ],
                message: "{VALUE} is not a valid job role. Allowed roles: Developer, Tester, Product Lead, Others"
            },
            default: "Others",
            set: function (v) {
                if (!v) return "Others";
                const normalized = v.trim().toLowerCase();
                if (normalized === "developer") return "Developer";
                if (normalized === "tester") return "Tester";
                if (normalized === "product lead" || normalized === "productlead") return "Product Lead";
                if (normalized === "others" || normalized === "other") return "Others";
                return v;
            }
        },

        status: {
            type: String,
            enum: [
                "Pending",
                "Accepted",
                "Rejected"
            ],
            default: "Pending"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "SpaceInvitation",
    spaceInvitationSchema
);
