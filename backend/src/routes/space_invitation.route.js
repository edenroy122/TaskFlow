const express = require("express");

const {
    inviteUser,
    getMyInvitations,
    acceptInvitation,
    rejectInvitation
} = require("../controllers/space_invitation.controller");

const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");

const router = express.Router();

router.post(
    "/:spaceId/invite",
    authMiddleware,
    roleMiddleware(["Product Owner", "Product Manager", "Scrum Master", "Owner", "Project Manager", "Manager", "Admin"]),
    inviteUser
);

router.post(
    "/:workspaceId/invite",
    authMiddleware,
    roleMiddleware(["Product Owner", "Product Manager", "Scrum Master", "Owner", "Project Manager", "Manager", "Admin"]),
    inviteUser
);

router.get(
    "/myinvitations",
    authMiddleware,
    getMyInvitations
);

router.put(
    "/:invitationId/accept",
    authMiddleware,
    acceptInvitation
);

router.put(
    "/:invitationId/reject",
    authMiddleware,
    rejectInvitation
);

module.exports = router;
