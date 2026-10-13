const SpaceMember = require("../models/spacemember.model");

const roleMiddleware = (roles) => {
    return async (req, res, next) => {
        try {
            const spaceId =
                req.params.spaceId ||
                req.params.workspaceId ||
                req.body.spaceId ||
                req.body.workspaceId;

            if (!spaceId) {
                return res.status(400).json({
                    message: "Space ID is required"
                });
            }

            const member = await SpaceMember.findOne({
                space: spaceId,
                user: req.user.id
            });

            if (!member) {
                return res.status(403).json({
                    message: "You are not a space member"
                });
            }

            if (!roles.includes(member.permissionRole)) {
                return res.status(403).json({
                    message: "You do not have permission"
                });
            }

            req.spaceMember = member;
            req.workspaceMember = member;

            next();

        } catch (error) {
            console.log(error);

            res.status(500).json({
                message: "Server error"
            });
        }
    };
};

module.exports = roleMiddleware;