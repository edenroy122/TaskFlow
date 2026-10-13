const Project = require("../models/project.model");
const Space = require("../models/space.model");
const SpaceMember = require("../models/spacemember.model");
const ProjectMember = require("../models/projectmembers.model");
const createActivity = require("../utils/createActivity");
const createNotification = require("../utils/createNotification");

// Helper: Only Product Owner (or Space Owner/Admin) can manage (edit/archive/restore) projects
const canManageProject = async (project, userId) => {
    const spaceId = project.space || project.workspace;
    const spaceMember = await SpaceMember.findOne({
        space: spaceId,
        user: userId
    });

    if (!spaceMember) return false;

    if (["Product Owner", "Product Manager", "Owner", "Admin"].includes(spaceMember.permissionRole)) {
        return true;
    }

    return false;
};

const createProject = async (req, res) => {
    try {
        const spaceId = req.params.spaceId || req.params.workspaceId;

        const {
            name,
            description,
            manager,
            startDate,
            dueDate,
            milestones
        } = req.body;

        if (!name) {
            return res.status(400).json({
                message: "Project name is required"
            });
        }

        const space = await Space.findById(spaceId);

        if (!space) {
            return res.status(404).json({
                message: "Space not found"
            });
        }

        const spaceMember = await SpaceMember.findOne({
            space: spaceId,
            user: req.user.id
        });

        if (!spaceMember) {
            return res.status(403).json({
                message: "You are not a space member"
            });
        }

        // Only Product Owner can create projects
        if (
            !["Product Owner", "Product Manager", "Owner", "Admin"].includes(spaceMember.permissionRole)
        ) {
            return res.status(403).json({
                message: "Only Product Owners can create projects"
            });
        }

        let projectManager = req.user.id;
        if (manager && typeof manager === "object" && manager._id) {
            projectManager = manager._id;
        } else if (manager && typeof manager === "string" && manager !== "" && manager !== "undefined") {
            projectManager = manager;
        }

        const managerMember = await SpaceMember.findOne({
            space: spaceId,
            user: projectManager
        });

        if (!managerMember) {
            return res.status(400).json({
                message: "Project manager must be a space member"
            });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (startDate && isNaN(new Date(startDate).getTime())) {
            return res.status(400).json({ message: "Invalid start date format" });
        }

        if (startDate && new Date(startDate) < today) {
            return res.status(400).json({ message: "Start date cannot be in the past" });
        }

        if (dueDate && isNaN(new Date(dueDate).getTime())) {
            return res.status(400).json({ message: "Invalid due date format" });
        }

        if (startDate && dueDate && new Date(dueDate) < new Date(startDate)) {
            return res.status(400).json({ message: "Due date cannot be before start date" });
        }

        const project = await Project.create({
            name,
            description,
            space: spaceId,
            createdBy: req.user.id,
            manager: projectManager,
            startDate: startDate || undefined,
            dueDate: dueDate || undefined,
            originalDueDate: dueDate || undefined,
            milestones: milestones || []
        });

        const creatorRole = managerMember?.permissionRole || "Product Owner";
        await ProjectMember.create({
            project: project._id,
            user: projectManager,
            role: creatorRole
        });

        const result = await Project.findById(project._id)
            .populate("createdBy", "name email")
            .populate("manager", "name email")
            .populate("space", "name");

        try {
            await createActivity({
                userId: req.user.id,
                action: "PROJECT_CREATED",
                description: `created project "${project.name}"`,
                projectId: project._id
            });
        } catch (actErr) {
            console.error("Failed to log activity:", actErr);
        }

        res.status(201).json({
            message: "Project created successfully",
            project: result,
            data: result
        });

    } catch (error) {
        console.error("Error in createProject:", error);
        res.status(500).json({ message: error.message || "Server error" });
    }
};

const getProjects = async (req, res) => {
    try {
        const spaceId = req.params.spaceId || req.params.workspaceId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;

        const spaceMember = await SpaceMember.findOne({
            space: spaceId,
            user: req.user.id
        });

        if (!spaceMember) {
            return res.status(403).json({
                message: "You are not a space member"
            });
        }

        let filterQuery = { space: spaceId, isArchived: false };

        if (["Stakeholder", "Stake holder", "Watcher"].includes(spaceMember.permissionRole)) {
            // Read only for stakeholders
        } else if (!["Product Owner", "Product Manager", "Owner", "Admin"].includes(spaceMember.permissionRole)) {
            const userProjectMemberships = await ProjectMember.find({ user: req.user.id });
            const memberProjectIds = userProjectMemberships.map((pm) => pm.project);
            filterQuery.$or = [
                { _id: { $in: memberProjectIds } },
                { manager: req.user.id },
                { createdBy: req.user.id }
            ];
        }

        const total = await Project.countDocuments(filterQuery);
        const projects = await Project.find(filterQuery)
            .populate("createdBy", "name email")
            .populate("manager", "name email")
            .populate("space", "name")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.status(200).json({
            projects,
            data: projects,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server error" });
    }
};

const getArchivedProjects = async (req, res) => {
    try {
        const spaceId = req.params.spaceId || req.params.workspaceId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;

        const spaceMember = await SpaceMember.findOne({
            space: spaceId,
            user: req.user.id
        });

        if (!spaceMember) {
            return res.status(403).json({
                message: "You are not a space member"
            });
        }

        let filterQuery = { space: spaceId, isArchived: true };

        if (!["Product Owner", "Product Manager", "Owner", "Admin"].includes(spaceMember.permissionRole)) {
            const userProjectMemberships = await ProjectMember.find({ user: req.user.id });
            const memberProjectIds = userProjectMemberships.map((pm) => pm.project);
            filterQuery.$or = [
                { _id: { $in: memberProjectIds } },
                { manager: req.user.id },
                { createdBy: req.user.id }
            ];
        }

        const total = await Project.countDocuments(filterQuery);
        const projects = await Project.find(filterQuery)
            .populate("createdBy", "name email")
            .populate("manager", "name email")
            .populate("space", "name")
            .sort({ updatedAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.status(200).json({
            projects,
            data: projects,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server error" });
    }
};

const getProject = async (req, res) => {
    try {
        const { projectId } = req.params;

        const project = await Project.findById(projectId)
            .populate("createdBy", "name email")
            .populate("manager", "name email")
            .populate("space", "name");

        if (!project) {
            return res.status(404).json({
                message: "Project not found"
            });
        }

        const spaceId = project.space?._id || project.space || project.workspace;
        const spaceMember = await SpaceMember.findOne({
            space: spaceId,
            user: req.user.id
        });

        if (!spaceMember) {
            return res.status(403).json({
                message: "You are not a space member"
            });
        }

        res.status(200).json({
            project,
            data: project
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server error" });
    }
};

const updateProject = async (req, res) => {
    try {
        const { projectId } = req.params;

        const {
            name,
            description,
            manager,
            startDate,
            dueDate,
            milestones,
            status
        } = req.body;

        const project = await Project.findById(projectId);

        if (!project) {
            return res.status(404).json({
                message: "Project not found"
            });
        }

        if (project.isArchived) {
            return res.status(400).json({
                message: "Cannot modify an archived project"
            });
        }

        const hasPermission = await canManageProject(project, req.user.id);
        if (!hasPermission) {
            return res.status(403).json({
                message: "Only Product Owners can edit this project"
            });
        }

        const oldStatus = project.status;

        if (name !== undefined) project.name = name;
        if (description !== undefined) project.description = description;

        if (manager !== undefined) {
            let newManagerId = typeof manager === "object" && manager._id ? manager._id.toString() : manager.toString();
            let currentManagerId = project.manager ? (project.manager._id || project.manager).toString() : "";
            if (newManagerId && newManagerId !== currentManagerId) {
                return res.status(400).json({
                    message: "Product Owner cannot be changed"
                });
            }
        }

        const oldDueDate = project.dueDate;
        const effectiveStartDate = startDate !== undefined ? startDate : project.startDate;
        const effectiveDueDate = dueDate !== undefined ? dueDate : project.dueDate;

        if (effectiveStartDate && isNaN(new Date(effectiveStartDate).getTime())) {
            return res.status(400).json({ message: "Invalid start date format" });
        }

        if (effectiveDueDate && isNaN(new Date(effectiveDueDate).getTime())) {
            return res.status(400).json({ message: "Invalid due date format" });
        }

        if (effectiveStartDate && effectiveDueDate && new Date(effectiveDueDate) < new Date(effectiveStartDate)) {
            return res.status(400).json({ message: "Due date cannot be before start date" });
        }

        if (startDate !== undefined) project.startDate = startDate || null;
        if (dueDate !== undefined) {
            if (dueDate) {
                if (!project.originalDueDate && project.dueDate) {
                    project.originalDueDate = project.dueDate;
                } else if (!project.originalDueDate) {
                    project.originalDueDate = new Date(dueDate);
                }
            }
            project.dueDate = dueDate || null;
        }
        if (milestones !== undefined) project.milestones = milestones;
        if (status !== undefined) project.status = status;

        await project.save();

        const updatedProject = await Project.findById(projectId)
            .populate("createdBy", "name email")
            .populate("manager", "name email")
            .populate("space", "name");

        const dueDateChanged = dueDate !== undefined && (
            (oldDueDate && !project.dueDate) ||
            (!oldDueDate && project.dueDate) ||
            (oldDueDate && project.dueDate && new Date(oldDueDate).getTime() !== new Date(project.dueDate).getTime())
        );

        if (dueDateChanged) {
            const isExtended = project.originalDueDate && project.dueDate && new Date(project.dueDate) > new Date(project.originalDueDate);
            try {
                await createActivity({
                    userId: req.user.id,
                    action: isExtended ? "PROJECT_DUE_DATE_EXTENDED" : "PROJECT_DUE_DATE_UPDATED",
                    description: isExtended
                        ? `extended project "${project.name}" due date to ${new Date(project.dueDate).toLocaleDateString()} (Original: ${new Date(project.originalDueDate).toLocaleDateString()})`
                        : `updated project "${project.name}" due date to ${project.dueDate ? new Date(project.dueDate).toLocaleDateString() : "none"}`,
                    projectId: project._id,
                    targetType: "Project",
                    targetId: project._id
                });
            } catch (actErr) {
                console.error("Failed to log project due date activity:", actErr);
            }
        }

        try {
            await createActivity({
                userId: req.user.id,
                action: "PROJECT_UPDATED",
                description: `updated project "${project.name}"`,
                projectId: project._id,
                targetType: "Project",
                targetId: project._id
            });
        } catch (actErr) {
            console.error("Failed to log project update activity:", actErr);
        }

        try {
            if (status === "Completed" && oldStatus !== "Completed") {
                const pMembers = await ProjectMember.find({ project: project._id });
                for (const pm of pMembers) {
                    if (pm.user) {
                        await createNotification({
                            recipient: pm.user,
                            sender: req.user.id,
                            type: "PROJECT_COMPLETED",
                            message: `Project "${project.name}" has been marked as Completed!`,
                            project: project._id
                        });
                    }
                }
            }
        } catch (notifErr) {
            console.error("Failed to send project completion notification:", notifErr);
        }

        res.status(200).json({
            message: "Project updated successfully",
            project: updatedProject,
            data: updatedProject
        });

    } catch (error) {
        console.error("Error in updateProject:", error);
        res.status(500).json({ message: error.message || "Server error" });
    }
};

const archiveProject = async (req, res) => {
    try {
        const { projectId } = req.params;

        const project = await Project.findById(projectId);

        if (!project) {
            return res.status(404).json({
                message: "Project not found"
            });
        }

        const hasPermission = await canManageProject(project, req.user.id);
        if (!hasPermission) {
            return res.status(403).json({
                message: "Only Product Owners can archive this project"
            });
        }

        if (project.isArchived) {
            return res.status(400).json({
                message: "Project is already archived"
            });
        }

        project.isArchived = true;
        project.status = "Archived";
        await project.save();

        await createActivity({
            userId: req.user.id,
            action: "PROJECT_ARCHIVED",
            description: `archived project "${project.name}"`,
            projectId: project._id
        });

        const pMembers = await ProjectMember.find({ project: project._id });
        for (const pm of pMembers) {
            await createNotification({
                recipient: pm.user,
                sender: req.user.id,
                type: "PROJECT_ARCHIVED",
                message: `Project "${project.name}" has been archived`,
                project: project._id
            });
        }

        res.status(200).json({
            message: "Project archived successfully"
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server error" });
    }
};

const restoreProject = async (req, res) => {
    try {
        const { projectId } = req.params;

        const project = await Project.findById(projectId);

        if (!project) {
            return res.status(404).json({
                message: "Project not found"
            });
        }

        const hasPermission = await canManageProject(project, req.user.id);
        if (!hasPermission) {
            return res.status(403).json({
                message: "Only Product Owners can restore this project"
            });
        }

        if (!project.isArchived) {
            return res.status(400).json({
                message: "Project is already active"
            });
        }

        project.isArchived = false;
        project.status = "In Progress";
        await project.save();

        await createActivity({
            userId: req.user.id,
            action: "PROJECT_RESTORED",
            description: `restored project "${project.name}"`,
            projectId: project._id
        });

        const pMembers = await ProjectMember.find({ project: project._id });
        for (const pm of pMembers) {
            await createNotification({
                recipient: pm.user,
                sender: req.user.id,
                type: "PROJECT_RESTORED",
                message: `Project "${project.name}" has been restored`,
                project: project._id
            });
        }

        res.status(200).json({
            message: "Project restored successfully"
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
    createProject,
    getProjects,
    getArchivedProjects,
    getProject,
    updateProject,
    archiveProject,
    restoreProject
};