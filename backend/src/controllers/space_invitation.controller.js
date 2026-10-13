const User = require("../models/user.model");
const Space = require("../models/space.model");
const SpaceMember = require("../models/spacemember.model");
const SpaceInvitation = require("../models/spaceinvitation.model");

const inviteUser = async (req, res) => {
    try {
        const spaceId = req.params.spaceId || req.params.workspaceId;
        const { email, permissionRole, jobRole } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Email is required"
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                message: "User not found. User must register first."
            });
        }

        const space = await Space.findById(spaceId);
        if (!space) {
            return res.status(404).json({
                message: "Space not found"
            });
        }

        const existingMember = await SpaceMember.findOne({
            space: spaceId,
            user: user._id
        });

        if (existingMember) {
            return res.status(400).json({
                message: "User is already a member"
            });
        }

        const existingInvitation = await SpaceInvitation.findOne({
            space: spaceId,
            invitedUser: user._id,
            status: "Pending"
        });

        if (existingInvitation) {
            return res.status(400).json({
                message: "Invitation already sent"
            });
        }

        const invitation = await SpaceInvitation.create({
            space: spaceId,
            invitedUser: user._id,
            invitedBy: req.user.id,
            permissionRole: permissionRole || "Member",
            jobRole: jobRole || "Others"
        });

        res.status(201).json({
            message: "Invitation sent successfully",
            invitation
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Server error"
        });
    }
};

const getMyInvitations = async (req, res) => {
    try {
        const invitations = await SpaceInvitation.find({
            invitedUser: req.user.id,
            status: "Pending"
        })
        .populate("space", "name description")
        .populate("invitedBy", "name email");

        // Format for backward compatibility if any component expects invitation.workspace
        const formattedInvitations = invitations.map((inv) => {
            const obj = inv.toObject ? inv.toObject() : inv;
            if (obj.space && !obj.workspace) {
                obj.workspace = obj.space;
            }
            return obj;
        });

        res.status(200).json({
            invitations: formattedInvitations
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Server error"
        });
    }
};

const acceptInvitation = async (req, res) => {
    try {
        const { invitationId } = req.params;

        const invitation = await SpaceInvitation.findOne({
            _id: invitationId,
            invitedUser: req.user.id,
            status: "Pending"
        });

        if (!invitation) {
            return res.status(404).json({
                message: "Invitation not found"
            });
        }

        const targetSpaceId = invitation.space || invitation.workspace;

        const existingMember = await SpaceMember.findOne({
            space: targetSpaceId,
            user: req.user.id
        });

        if (existingMember) {
            invitation.status = "Accepted";
            await invitation.save();
            return res.status(400).json({
                message: "You are already a member"
            });
        }

        await SpaceMember.create({
            space: targetSpaceId,
            user: req.user.id,
            permissionRole: invitation.permissionRole,
            jobRole: invitation.jobRole
        });

        invitation.status = "Accepted";
        await invitation.save();

        res.status(200).json({
            message: "Invitation accepted"
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Server error"
        });
    }
};

const rejectInvitation = async (req, res) => {
    try {
        const { invitationId } = req.params;

        const invitation = await SpaceInvitation.findOne({
            _id: invitationId,
            invitedUser: req.user.id,
            status: "Pending"
        });

        if (!invitation) {
            return res.status(404).json({
                message: "Invitation not found"
            });
        }

        invitation.status = "Rejected";
        await invitation.save();

        res.status(200).json({
            message: "Invitation rejected"
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Server error"
        });
    }
};

module.exports = {
    inviteUser,
    getMyInvitations,
    acceptInvitation,
    rejectInvitation
};
