const express = require("express");
const {
    requestApproval,
    getTaskApprovals,
    respondToApproval
} = require("../controllers/approval.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/task/:taskId/approval", authMiddleware, requestApproval);
router.get("/task/:taskId/approval", authMiddleware, getTaskApprovals);
router.put("/task/:taskId/approval/:approvalId", authMiddleware, respondToApproval);

module.exports = router;
