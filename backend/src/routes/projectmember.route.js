const express = require("express");

const {
    addProjectMember,
    getProjectMembers,
    updateProjectMember,
    removeProjectMember
} = require("../controllers/projectmember.controller");

const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.post(
    "/project/:projectId",
    authMiddleware,
    addProjectMember
);

router.get(
    "/project/:projectId",
    authMiddleware,
    getProjectMembers
);

router.put(
    "/project/:projectId/user/:userId",
    authMiddleware,
    updateProjectMember
);

router.delete(
    "/project/:projectId/user/:userId",
    authMiddleware,
    removeProjectMember
);

module.exports = router;