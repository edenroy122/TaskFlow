const express = require("express");
const {
    getProjectDashboard,
    getUserWorkload,
    getSpaceDashboard
} = require("../controllers/dashboard.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/project/:projectId", authMiddleware, getProjectDashboard);
router.get("/user/:userId/workload", authMiddleware, getUserWorkload);
router.get("/space/:spaceId", authMiddleware, getSpaceDashboard);
router.get("/workspace/:workspaceId", authMiddleware, getSpaceDashboard);

module.exports = router;
