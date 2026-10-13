const express = require("express");
const {
    getProjectActivities,
    getTaskActivities
} = require("../controllers/activity.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/project/:projectId", authMiddleware, getProjectActivities);
router.get("/task/:taskId", authMiddleware, getTaskActivities);

module.exports = router;
