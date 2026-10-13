const express = require("express");

const {
    createSpace,
    getMySpaces,
    getSpace,
    getMembers,
    updateMember,
    removeMember
} = require("../controllers/space.controller");

const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");

const router = express.Router();

router.post("/createspace", authMiddleware, createSpace);
router.post("/createworkspace", authMiddleware, createSpace);

router.get("/myspaces", authMiddleware, getMySpaces);
router.get("/myworkspaces", authMiddleware, getMySpaces);

router.get("/:id/getspace", authMiddleware, getSpace);
router.get("/:id/getworkspace", authMiddleware, getSpace);

router.get(
    "/:spaceId/members",
    authMiddleware,
    roleMiddleware([
        "Product Owner",
        "Product Manager",
        "Scrum Master",
        "Owner",
        "Project Manager",
        "Manager",
        "Admin",
        "Member",
        "Stakeholder",
        "Stake holder",
        "Watcher"
    ]),
    getMembers
);

router.put(
    "/:spaceId/members/:userId",
    authMiddleware,
    roleMiddleware([
        "Product Owner",
        "Product Manager",
        "Scrum Master",
        "Owner",
        "Project Manager",
        "Manager",
        "Admin"
    ]),
    updateMember
);

router.delete(
    "/:spaceId/members/:userId",
    authMiddleware,
    roleMiddleware([
        "Product Owner",
        "Product Manager",
        "Scrum Master",
        "Owner",
        "Project Manager",
        "Manager",
        "Admin"
    ]),
    removeMember
);

module.exports = router;
