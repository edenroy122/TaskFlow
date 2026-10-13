const Space = require("../models/space.model");
const SpaceMember = require("../models/spacemember.model");

const createSpace = async (req, res) => {
    try {
        const { name, description, passkey } = req.body;

        if (!name) {
            return res.status(400).json({
                message: "Space name is required"
            });
        }

        const validPasskey = process.env.SPACE_PASSKEY || process.env.PASSKEY || "1234";

        if (!passkey || passkey.trim() !== validPasskey) {
            return res.status(400).json({
                message: "Invalid passkey. Space cannot be created."
            });
        }

        const space = await Space.create({
            name,
            description,
            passkey,
            owner: req.user.id
        });

        // Space creator is assigned "Product Owner" role with full access
        await SpaceMember.create({
            space: space._id,
            user: req.user.id,
            permissionRole: "Product Owner",
            jobRole: "Product Lead"
        });

        res.status(201).json({
            message: "Space created successfully",
            space,
            workspace: space
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Server error"
        });
    }
};

const getMySpaces = async (req, res) => {
    try {
        const memberships = await SpaceMember
            .find({ user: req.user.id })
            .populate("space");

        const updatedMemberships = await Promise.all(
            memberships.map(async (m) => {
                if (m.space) {
                    const ownerId = m.space.owner?._id || m.space.owner;
                    if (ownerId && ownerId.toString() === req.user.id.toString()) {
                        if (m.permissionRole !== "Product Owner" && m.permissionRole !== "Product Manager" && m.permissionRole !== "Project Manager" && m.permissionRole !== "Owner") {
                            m.permissionRole = "Product Owner";
                            await m.save();
                        }
                    }
                }
                return m;
            })
        );

        const formattedMemberships = updatedMemberships.map((m) => {
            const obj = m.toObject ? m.toObject() : m;
            if (obj.space && !obj.workspace) {
                obj.workspace = obj.space;
            }
            return obj;
        });

        res.status(200).json({
            spaces: formattedMemberships,
            workspaces: formattedMemberships
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Server error"
        });
    }
};

const getSpace = async (req, res) => {
    try {
        const { id } = req.params;

        const space = await Space.findById(id)
            .populate("owner", "name email");

        if (!space) {
            return res.status(404).json({
                message: "Space not found"
            });
        }

        const member = await SpaceMember.findOne({
            space: id,
            user: req.user.id
        });

        if (!member) {
            return res.status(403).json({
                message: "You are not a member of this space"
            });
        }

        const ownerId = space.owner?._id || space.owner;
        const effectiveRole = (ownerId && ownerId.toString() === req.user.id.toString())
            ? "Product Owner"
            : member.permissionRole;

        res.status(200).json({
            space,
            workspace: space,
            role: effectiveRole,
            jobRole: member.jobRole
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Server error"
        });
    }
};

const getMembers = async (req, res) => {
    try {
        const spaceId = req.params.spaceId || req.params.workspaceId;

        const members = await SpaceMember.find({
            space: spaceId
        })
        .populate("user", "name email")
        .populate("space", "name");

        res.status(200).json({
            members
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Server error"
        });
    }
};

const updateMember = async (req, res) => {
    try {
        const spaceId = req.params.spaceId || req.params.workspaceId;
        const { userId } = req.params;
        const { permissionRole, jobRole } = req.body;

        const member = await SpaceMember.findOne({
            space: spaceId,
            user: userId
        });

        if (!member) {
            return res.status(404).json({
                message: "Member not found"
            });
        }

        if (member.permissionRole === "Owner" || member.permissionRole === "Product Owner") {
            return res.status(400).json({
                message: "Owner role cannot be changed"
            });
        }

        if (permissionRole) {
            member.permissionRole = permissionRole;
        }

        if (jobRole) {
            member.jobRole = jobRole;
        }

        await member.save();

        res.status(200).json({
            message: "Member updated successfully",
            member
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Server error"
        });
    }
};

const removeMember = async (req, res) => {
    try {
        const spaceId = req.params.spaceId || req.params.workspaceId;
        const { userId } = req.params;

        const member = await SpaceMember.findOne({
            space: spaceId,
            user: userId
        });

        if (!member) {
            return res.status(404).json({
                message: "Member not found"
            });
        }

        if (member.permissionRole === "Owner" || member.permissionRole === "Product Owner") {
            return res.status(400).json({
                message: "Space owner cannot be removed"
            });
        }

        await SpaceMember.deleteOne({
            _id: member._id
        });

        res.status(200).json({
            message: "Member removed successfully"
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Server error"
        });
    }
};

module.exports = {
    createSpace,
    createWorkspace: createSpace,
    getMySpaces,
    getMyWorkspaces: getMySpaces,
    getSpace,
    getWorkspace: getSpace,
    getMembers,
    updateMember,
    removeMember
};
