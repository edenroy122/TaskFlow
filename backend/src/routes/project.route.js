const express = require("express");

const {
    createProject,
    getProjects,
    getArchivedProjects,
    getProject,
    updateProject,
    archiveProject,
    restoreProject
} = require("../controllers/project.controller");

const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.post(
    "/space/:spaceId",
    authMiddleware,
    createProject
);

router.post(
    "/workspace/:workspaceId",
    authMiddleware,
    createProject
);

router.get(
    "/space/:spaceId",
    authMiddleware,
    getProjects
);

router.get(
    "/workspace/:workspaceId",
    authMiddleware,
    getProjects
);

router.get(
    "/space/:spaceId/archived",
    authMiddleware,
    getArchivedProjects
);

router.get(
    "/workspace/:workspaceId/archived",
    authMiddleware,
    getArchivedProjects
);

router.get(
    "/:projectId",
    authMiddleware,
    getProject
);

router.put(
    "/:projectId",
    authMiddleware,
    updateProject
);

router.put(
    "/:projectId/archive",
    authMiddleware,
    archiveProject
);

router.put(
    "/:projectId/restore",
    authMiddleware,
    restoreProject
);

module.exports = router;