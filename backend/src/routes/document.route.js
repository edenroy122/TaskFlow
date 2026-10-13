const express = require("express");
const {
    uploadProjectDocument,
    uploadTaskDocument,
    getProjectDocuments,
    getTaskDocuments,
    downloadDocument,
    deleteDocument
} = require("../controllers/document.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { projectUpload, taskUpload } = require("../middleware/uploadMiddleware");

const router = express.Router();

router.post(
    "/project/:projectId",
    authMiddleware,
    projectUpload.single("document"),
    uploadProjectDocument
);

router.post(
    "/task/:taskId",
    authMiddleware,
    taskUpload.single("document"),
    uploadTaskDocument
);

router.get(
    "/project/:projectId",
    authMiddleware,
    getProjectDocuments
);

router.get(
    "/task/:taskId",
    authMiddleware,
    getTaskDocuments
);

router.get(
    "/:documentId/download",
    authMiddleware,
    downloadDocument
);

router.delete(
    "/:documentId",
    authMiddleware,
    deleteDocument
);

module.exports = router;
