const express = require("express");

const {
    addWatcher,
    getWatchers,
    removeWatcher
} = require("../controllers/taskwatcher.controller");

const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.post(
    "/task/:taskId",
    authMiddleware,
    addWatcher
);

router.get(
    "/task/:taskId",
    authMiddleware,
    getWatchers
);

router.delete(
    "/task/:taskId/user/:userId",
    authMiddleware,
    removeWatcher
);

module.exports = router;