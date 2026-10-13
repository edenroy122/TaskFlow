const express = require("express");
const {
    createMilestone,
    getMilestones,
    updateMilestone,
    deleteMilestone
} = require("../controllers/milestone.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/project/:projectId", authMiddleware, createMilestone);
router.get("/project/:projectId", authMiddleware, getMilestones);
router.put("/:milestoneId", authMiddleware, updateMilestone);
router.delete("/:milestoneId", authMiddleware, deleteMilestone);

module.exports = router;
