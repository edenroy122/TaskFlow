const Project = require("../models/project.model");
const ProjectMember = require("../models/projectmembers.model");
const WorkspaceMember = require("../models/workspacemember.model");
const Task = require("../models/task.model");
const User = require("../models/user.model");
const createActivity = require("../utils/createActivity");
const createNotification = require("../utils/createNotification");

const VALID_ROLES = [
    "Product Owner",
    "Product Manager",
    "Scrum Master",
    "Member",
    "Stakeholder",
    "Stake holder",
    "Watcher",
    "Project Manager"
];

const getSpaceMember = async (spaceId, userId) => {
    return await WorkspaceMember.findOne({
        $or: [{ space: spaceId }, { workspace: spaceId }],
        user: userId
    });
};

const addProjectMember = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { userId, role } = req.body;

        if (!userId) {
            return res.status(400).json({
                message: "User ID is required"
            });
        }

        const project = await Project.findById(projectId);

        if (!project) {
            return res.status(404).json({
                message: "Project not found"
            });
        }

        if (project.isArchived) {
            return res.status(400).json({
                message: "Cannot add member to an archived project"
            });
        }

        const spaceId = project.space || project.workspace;
        const currentWorkspaceMember = await getSpaceMember(spaceId, req.user.id);

        if (!currentWorkspaceMember) {
            return res.status(403).json({
                message: "You are not a space member"
            });
        }

        const isAuthorized =
            ["Product Owner", "Product Manager", "Owner", "Admin"].includes(currentWorkspaceMember.permissionRole) ||
            (project.manager && project.manager.toString() === req.user.id) ||
            (project.createdBy && project.createdBy.toString() === req.user.id);

        if (!isAuthorized) {
            return res.status(403).json({
                message: "You do not have permission to add members"
            });
        }

        const workspaceMember = await getSpaceMember(spaceId, userId);

        if (!workspaceMember) {
            return res.status(400).json({
                message: "User is not a member of this space"
            });
        }

        const existingMember = await ProjectMember.findOne({
            project: projectId,
            user: userId
        });

        if (existingMember) {
            return res.status(400).json({
                message: "User is already a project member"
            });
        }

        let assignedRole = role || workspaceMember.permissionRole || "Member";
        if (assignedRole === "Project Manager") assignedRole = "Product Owner";
        if (!VALID_ROLES.includes(assignedRole)) {
            assignedRole = "Member";
        }

        const member = await ProjectMember.create({
            project: projectId,
            user: userId,
            role: assignedRole
        });

        const result = await ProjectMember.findById(member._id)
            .populate("user", "name email")
            .populate("project", "name");

        // Log Activity
        await createActivity({
            userId: req.user.id,
            action: "MEMBER_ADDED",
            description: `added user to project "${project.name}" as ${assignedRole}`,
            projectId: project._id,
            targetType: "ProjectMember",
            targetId: member._id
        });

        // Send Notification
        await createNotification({
            recipient: userId,
            sender: req.user.id,
            type: "PROJECT_MEMBER_ADDED",
            message: `You were added to project "${project.name}" as ${assignedRole}`,
            project: project._id
        });

        res.status(201).json({
            message: "Project member added successfully",
            member: result,
            data: result
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server error" });
    }
};

const getProjectMembers = async (req, res) => {
    try {
        const { projectId } = req.params;

        const project = await Project.findById(projectId);

        if (!project) {
            return res.status(404).json({
                message: "Project not found"
            });
        }

        const spaceId = project.space || project.workspace;
        const workspaceMember = await getSpaceMember(spaceId, req.user.id);

        if (!workspaceMember) {
            return res.status(403).json({
                message: "You are not a space member"
            });
        }

        if (
            !["Product Owner", "Product Manager", "Owner", "Admin", "Scrum Master", "Project Manager", "Manager"].includes(workspaceMember.permissionRole) &&
            (project.manager && project.manager.toString() !== req.user.id) &&
            (project.createdBy && project.createdBy.toString() !== req.user.id)
        ) {
            const pMember = await ProjectMember.findOne({ project: projectId, user: req.user.id });
            if (!pMember) {
                return res.status(403).json({
                    message: "Access denied. You are not a member of this project."
                });
            }
        }

        const rawMembers = await ProjectMember.find({
            project: projectId
        })
            .populate("user", "name email profileImage")
            .sort({ createdAt: 1 });

        // Normalize roles: Project Manager -> Product Owner
        const members = rawMembers.map((m) => {
            const obj = m.toObject ? m.toObject() : m;
            if (obj.role === "Project Manager") {
                obj.role = "Product Owner";
            }
            return obj;
        });

        if (project.manager) {
            const mgrId = (project.manager._id || project.manager).toString();
            const hasMgr = members.some((m) => (m.user?._id || m.user)?.toString() === mgrId);
            if (!hasMgr) {
                const mgrUser = await User.findById(mgrId).select("name email profileImage");
                if (mgrUser) {
                    members.unshift({
                        _id: `mgr-${mgrId}`,
                        project: project._id,
                        user: mgrUser,
                        role: "Product Owner"
                    });
                }
            }
        }

        res.status(200).json({
            members,
            data: members
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server error" });
    }
};

const updateProjectMember = async (req, res) => {
    try {
        const { projectId, userId } = req.params;
        let { role } = req.body;

        if (role === "Project Manager") role = "Product Owner";

        if (!VALID_ROLES.includes(role)) {
            return res.status(400).json({
                message: "Invalid project role"
            });
        }

        const project = await Project.findById(projectId);

        if (!project) {
            return res.status(404).json({
                message: "Project not found"
            });
        }

        if (project.isArchived) {
            return res.status(400).json({
                message: "Cannot modify members in an archived project"
            });
        }

        const spaceId = project.space || project.workspace;
        const currentWorkspaceMember = await getSpaceMember(spaceId, req.user.id);

        if (!currentWorkspaceMember) {
            return res.status(403).json({
                message: "You are not a space member"
            });
        }

        const isAuthorized =
            ["Product Owner", "Product Manager", "Owner", "Admin"].includes(currentWorkspaceMember.permissionRole) ||
            (project.manager && project.manager.toString() === req.user.id) ||
            (project.createdBy && project.createdBy.toString() === req.user.id);

        if (!isAuthorized) {
            return res.status(403).json({
                message: "You do not have permission to update members"
            });
        }

        const member = await ProjectMember.findOne({
            project: projectId,
            user: userId
        });

        if (!member) {
            return res.status(404).json({
                message: "Project member not found"
            });
        }

        member.role = role;
        await member.save();

        const result = await ProjectMember.findById(member._id)
            .populate("user", "name email");

        await createActivity({
            userId: req.user.id,
            action: "MEMBER_ROLE_CHANGED",
            description: `changed user role to ${role} in project "${project.name}"`,
            projectId: project._id,
            targetType: "ProjectMember",
            targetId: member._id
        });

        res.status(200).json({
            message: "Project member updated successfully",
            member: result,
            data: result
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server error" });
    }
};

const removeProjectMember = async (req, res) => {
    try {
        const { projectId, userId } = req.params;

        const project = await Project.findById(projectId);

        if (!project) {
            return res.status(404).json({
                message: "Project not found"
            });
        }

        if (project.isArchived) {
            return res.status(400).json({
                message: "Cannot remove members from an archived project"
            });
        }

        const spaceId = project.space || project.workspace;
        const currentWorkspaceMember = await getSpaceMember(spaceId, req.user.id);

        if (!currentWorkspaceMember) {
            return res.status(403).json({
                message: "You are not a space member"
            });
        }

        const isAuthorized =
            ["Product Owner", "Product Manager", "Owner", "Admin"].includes(currentWorkspaceMember.permissionRole) ||
            (project.manager && project.manager.toString() === req.user.id) ||
            (project.createdBy && project.createdBy.toString() === req.user.id);

        if (!isAuthorized) {
            return res.status(403).json({
                message: "You do not have permission to remove members"
            });
        }

        if (userId === project.manager.toString() && userId === project.createdBy?.toString()) {
            return res.status(400).json({
                message: "Space owner/project manager cannot be removed from project"
            });
        }

        const member = await ProjectMember.findOne({
            project: projectId,
            user: userId
        });

        if (!member) {
            return res.status(404).json({
                message: "Project member not found"
            });
        }

        await ProjectMember.deleteOne({
            _id: member._id
        });

        // Unassign removed member from any project tasks and subtasks
        try {
            await Task.updateMany(
                { project: projectId, assignedTo: userId },
                { $pull: { assignedTo: userId } }
            );
            await Task.updateMany(
                { project: projectId, "subtasks.assignedTo": userId },
                { $set: { "subtasks.$[elem].assignedTo": null } },
                { arrayFilters: [{ "elem.assignedTo": userId }] }
            );
        } catch (taskCleanErr) {
            console.error("Failed to unassign removed member from tasks:", taskCleanErr);
        }

        await createActivity({
            userId: req.user.id,
            action: "MEMBER_REMOVED",
            description: `removed user from project "${project.name}"`,
            projectId: project._id
        });

        await createNotification({
            recipient: userId,
            sender: req.user.id,
            type: "PROJECT_MEMBER_REMOVED",
            message: `You were removed from project "${project.name}"`,
            project: project._id
        });

        res.status(200).json({
            message: "Project member removed successfully"
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
    addProjectMember,
    getProjectMembers,
    updateProjectMember,
    removeProjectMember
};