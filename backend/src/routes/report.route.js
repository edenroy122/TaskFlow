const express = require("express");
const {
    getProjectReport,
    getSpaceReport
} = require("../controllers/report.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/project/:projectId", authMiddleware, getProjectReport);
router.get("/space/:spaceId", authMiddleware, getSpaceReport);
router.get("/workspace/:workspaceId", authMiddleware, getSpaceReport);

module.exports = router;
