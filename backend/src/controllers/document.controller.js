const Document = require("../models/document.model");
const Project = require("../models/project.model");
const Task = require("../models/task.model");
const WorkspaceMember = require("../models/workspacemember.model");
const createActivity = require("../utils/createActivity");
const createNotification = require("../utils/createNotification");
const path = require("path");
const fs = require("fs");

const getSpaceMember = async (spaceId, userId) => {
    return await WorkspaceMember.findOne({
        $or: [{ space: spaceId }, { workspace: spaceId }],
        user: userId
    });
};

const uploadProjectDocument = async (req, res) => {
    try {
        const { projectId } = req.params;

        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        if (project.isArchived) {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: "Cannot upload documents to an archived project" });
        }

        const spaceId = project.space || project.workspace;
        const workspaceMember = await getSpaceMember(spaceId, req.user.id);

        if (!workspaceMember) {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return res.status(403).json({ message: "Not a space member" });
        }

        const doc = await Document.create({
            name: req.body.name || req.file.originalname,
            originalName: req.file.originalname,
            fileName: req.file.filename,
            filePath: req.file.path,
            fileType: req.file.mimetype,
            fileSize: req.file.size,
            uploadedBy: req.user.id,
            project: projectId
        });

        const populatedDoc = await Document.findById(doc._id)
            .populate("uploadedBy", "name email");

        // Log Activity
        await createActivity({
            userId: req.user.id,
            action: "DOCUMENT_UPLOADED",
            description: `uploaded document "${doc.originalName}" to project`,
            projectId,
            targetType: "Document",
            targetId: doc._id
        });

        // Notify Project Manager if not uploader
        if (project.manager && project.manager.toString() !== req.user.id) {
            await createNotification({
                recipient: project.manager,
                sender: req.user.id,
                type: "DOCUMENT_UPLOADED",
                message: `New document "${doc.originalName}" uploaded to project "${project.name}"`,
                project: projectId
            });
        }

        res.status(201).json({
            message: "Document uploaded successfully",
            data: populatedDoc
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const uploadTaskDocument = async (req, res) => {
    try {
        const { taskId } = req.params;

        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        const project = await Project.findById(task.project);
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        if (project.isArchived) {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: "Cannot upload documents to an archived project" });
        }

        const spaceId = project.space || project.workspace;
        const workspaceMember = await getSpaceMember(spaceId, req.user.id);

        if (!workspaceMember) {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return res.status(403).json({ message: "Not a space member" });
        }

        const doc = await Document.create({
            name: req.body.name || req.file.originalname,
            originalName: req.file.originalname,
            fileName: req.file.filename,
            filePath: req.file.path,
            fileType: req.file.mimetype,
            fileSize: req.file.size,
            uploadedBy: req.user.id,
            project: project._id,
            task: taskId
        });

        const populatedDoc = await Document.findById(doc._id)
            .populate("uploadedBy", "name email");

        // Log Activity
        await createActivity({
            userId: req.user.id,
            action: "DOCUMENT_UPLOADED",
            description: `uploaded document "${doc.originalName}" to task "${task.title}"`,
            projectId: project._id,
            taskId,
            targetType: "Document",
            targetId: doc._id
        });

        // Notify Assignee & Manager
        if (task.assignedTo) {
            await createNotification({
                recipient: task.assignedTo,
                sender: req.user.id,
                type: "DOCUMENT_UPLOADED",
                message: `New document "${doc.originalName}" uploaded to task "${task.title}"`,
                project: project._id,
                task: taskId
            });
        }

        res.status(201).json({
            message: "Document uploaded successfully",
            data: populatedDoc
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const getProjectDocuments = async (req, res) => {
    try {
        const { projectId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ message: "Project not found" });

        const spaceId = project.space || project.workspace;
        const workspaceMember = await getSpaceMember(spaceId, req.user.id);
        if (!workspaceMember) return res.status(403).json({ message: "Not a space member" });

        const total = await Document.countDocuments({ project: projectId });
        const documents = await Document.find({ project: projectId })
            .populate("uploadedBy", "name email")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.status(200).json({
            data: documents,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const getTaskDocuments = async (req, res) => {
    try {
        const { taskId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ message: "Task not found" });

        const project = await Project.findById(task.project);
        if (!project) return res.status(404).json({ message: "Project not found" });

        const spaceId = project.space || project.workspace;
        const workspaceMember = await getSpaceMember(spaceId, req.user.id);
        if (!workspaceMember) return res.status(403).json({ message: "Not a space member" });

        const total = await Document.countDocuments({ task: taskId });
        const documents = await Document.find({ task: taskId })
            .populate("uploadedBy", "name email")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.status(200).json({
            data: documents,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const downloadDocument = async (req, res) => {
    try {
        const { documentId } = req.params;

        const doc = await Document.findById(documentId);
        if (!doc) return res.status(404).json({ message: "Document not found" });

        const project = await Project.findById(doc.project);
        if (!project) return res.status(404).json({ message: "Project not found" });

        const spaceId = project.space || project.workspace;
        const workspaceMember = await getSpaceMember(spaceId, req.user.id);

        if (!workspaceMember) {
            return res.status(403).json({ message: "You are not authorized to access files in this space" });
        }

        const resolvedPath = path.resolve(doc.filePath);
        if (!fs.existsSync(resolvedPath)) {
            return res.status(404).json({ message: "File missing on server storage" });
        }

        res.download(resolvedPath, doc.originalName);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const deleteDocument = async (req, res) => {
    try {
        const { documentId } = req.params;

        const doc = await Document.findById(documentId);
        if (!doc) return res.status(404).json({ message: "Document not found" });

        const project = await Project.findById(doc.project);
        if (!project) return res.status(404).json({ message: "Project not found" });

        const spaceId = project.space || project.workspace;
        const workspaceMember = await getSpaceMember(spaceId, req.user.id);

        if (!workspaceMember) {
            return res.status(403).json({ message: "Not a space member" });
        }

        const isUploader = doc.uploadedBy.toString() === req.user.id;
        const isProjectManager = project.manager.toString() === req.user.id;
        const isOwnerOrAdmin = ["Product Owner", "Product Manager", "Owner", "Admin"].includes(workspaceMember.permissionRole);

        if (!isUploader && !isProjectManager && !isOwnerOrAdmin) {
            return res.status(403).json({ message: "Permission denied to delete this document" });
        }

        if (doc.filePath && fs.existsSync(doc.filePath)) {
            try {
                fs.unlinkSync(doc.filePath);
            } catch (fsErr) {
                console.error("Failed to delete physical file:", fsErr);
            }
        }

        await Document.deleteOne({ _id: documentId });

        await createActivity({
            userId: req.user.id,
            action: "DOCUMENT_DELETED",
            description: `deleted document "${doc.originalName}"`,
            projectId: project._id,
            taskId: doc.task
        });

        res.status(200).json({ message: "Document deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
    uploadProjectDocument,
    uploadTaskDocument,
    getProjectDocuments,
    getTaskDocuments,
    downloadDocument,
    deleteDocument
};
