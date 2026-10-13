const express = require("express");
const {
    addProjectComment,
    addTaskComment,
    getProjectComments,
    getTaskComments,
    deleteComment
} = require("../controllers/comment.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/project/:projectId", authMiddleware, addProjectComment);
router.post("/task/:taskId", authMiddleware, addTaskComment);
router.get("/project/:projectId", authMiddleware, getProjectComments);
router.get("/task/:taskId", authMiddleware, getTaskComments);
router.delete("/:commentId", authMiddleware, deleteComment);

module.exports = router;
