const multer = require("multer");
const path = require("path");

const ALLOWED_EXTENSIONS = [
    ".pdf", ".doc", ".docx", ".xls", ".xlsx",
    ".csv", ".txt", ".png", ".jpg", ".jpeg", ".zip"
];

const ALLOWED_MIME_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
    "text/plain",
    "image/png",
    "image/jpeg",
    "application/zip",
    "application/x-zip-compressed"
];

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (ALLOWED_EXTENSIONS.includes(ext) || ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("File type not allowed. Allowed: PDF, DOC, DOCX, XLS, XLSX, CSV, TXT, PNG, JPG, JPEG, ZIP"), false);
    }
};

// Memory storage for cloud uploads (Supabase)
const memoryStorage = multer.memoryStorage();

const projectUpload = multer({
    storage: memoryStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter
});

const taskUpload = multer({
    storage: memoryStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter
});

module.exports = {
    projectUpload,
    taskUpload
};
