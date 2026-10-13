const express = require("express");

const {
    createTask,
    getTasks,
    getTask,
    updateTask,
    updateTaskStatus,
    archiveTask,
    restoreTask,
    deleteTask
} = require("../controllers/task.controller");

const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.post(
    "/project/:projectId",
    authMiddleware,
    createTask
);

router.get(
    "/project/:projectId",
    authMiddleware,
    getTasks
);

router.get(
    "/:taskId",
    authMiddleware,
    getTask
);

router.put(
    "/:taskId",
    authMiddleware,
    updateTask
);

router.delete(
    "/:taskId",
    authMiddleware,
    deleteTask
);

router.put(
    "/:taskId/status",
    authMiddleware,
    updateTaskStatus
);

router.put(
    "/:taskId/archive",
    authMiddleware,
    archiveTask
);

router.put(
    "/:taskId/restore",
    authMiddleware,
    restoreTask
);

module.exports = router;