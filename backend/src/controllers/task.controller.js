const Task = require("../models/task.model");
const Project = require("../models/project.model");
const SpaceMember = require("../models/spacemember.model");
const WorkspaceMember = SpaceMember;
const ProjectMember = require("../models/projectmembers.model");
const Milestone = require("../models/milestone.model");
const createActivity = require("../utils/createActivity");
const createNotification = require("../utils/createNotification");

// Helper to prevent circular dependencies (Module 26)
const hasCircularDependency = async (taskId, targetDepId) => {
    let visited = new Set();
    let queue = [targetDepId];
    while (queue.length > 0) {
        let curr = queue.shift();
        if (curr.toString() === taskId.toString()) return true;
        if (visited.has(curr.toString())) continue;
        visited.add(curr.toString());

        let t = await Task.findById(curr);
        if (t && t.dependencies && t.dependencies.length > 0) {
            for (let dep of t.dependencies) {
                queue.push(dep);
            }
        }
    }
    return false;
};

const createTask = async (req, res) => {
    try {
        const { projectId } = req.params;

        const {
            title,
            description,
            assignedTo,
            status,
            priority,
            dueDate,
            dependencies,
            milestones,
            subtasks
        } = req.body;

        if (!title) {
            return res.status(400).json({
                message: "Task title is required"
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
                message: "Cannot create task in an archived project"
            });
        }

        const spaceId = project.space || project.workspace;
        const spaceMember = await SpaceMember.findOne({
            space: spaceId,
            user: req.user.id
        });

        if (!spaceMember) {
            return res.status(403).json({
                message: "You are not a space member"
            });
        }

        if (["Watcher", "Stakeholder", "Stake holder"].includes(spaceMember.permissionRole)) {
            return res.status(403).json({
                message: "Stakeholders do not have permission to create tasks"
            });
        }

        const projectMember = await ProjectMember.findOne({
            project: projectId,
            user: req.user.id
        });

        const isManager =
            ["Product Owner", "Product Manager", "Scrum Master", "Project Manager", "Owner", "Admin", "Manager"].includes(spaceMember.permissionRole) ||
            (project.manager && (project.manager._id || project.manager).toString() === req.user.id.toString());

        const isMember = spaceMember.permissionRole === "Member" || !!projectMember;

        if (!isManager && !isMember) {
            return res.status(403).json({
                message: "You do not have permission to create tasks"
            });
        }

        let finalAssignedTo = [];
        if (Array.isArray(assignedTo)) {
            finalAssignedTo = assignedTo.filter((id) => id && id !== "" && id !== "undefined");
        } else if (assignedTo && typeof assignedTo === "string" && assignedTo !== "" && assignedTo !== "undefined") {
            finalAssignedTo = [assignedTo];
        }

        const projectMembers = await ProjectMember.find({ project: projectId });
        const validProjectUserIds = new Set(projectMembers.map((pm) => pm.user.toString()));
        if (project.manager) validProjectUserIds.add((project.manager._id || project.manager).toString());
        if (project.createdBy) validProjectUserIds.add((project.createdBy._id || project.createdBy).toString());

        finalAssignedTo = finalAssignedTo.filter((userId) => validProjectUserIds.has(userId.toString()));

        const validDependencies = [];
        if (dependencies && Array.isArray(dependencies) && dependencies.length > 0) {
            for (const dependencyId of dependencies) {
                if (!dependencyId || dependencyId === "") continue;
                const dependencyTask = await Task.findOne({
                    _id: dependencyId,
                    project: projectId
                });

                if (dependencyTask) {
                    validDependencies.push(dependencyId);
                }
            }
        }

        let finalMilestones = [];
        if (Array.isArray(milestones)) {
            finalMilestones = milestones.filter((id) => id && id !== "" && id !== "undefined");
        } else if (milestones && typeof milestones === "string" && milestones !== "" && milestones !== "undefined") {
            finalMilestones = [milestones];
        }

        const validMilestones = [];
        if (finalMilestones.length > 0) {
            const foundMilestones = await Milestone.find({
                _id: { $in: finalMilestones },
                project: projectId
            });
            validMilestones.push(...foundMilestones.map((m) => m._id));
        }

        if (dueDate && isNaN(new Date(dueDate).getTime())) {
            return res.status(400).json({ message: "Invalid due date format" });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dueDate && new Date(dueDate) < today) {
            return res.status(400).json({ message: "Task due date cannot be in the past" });
        }

        if (dueDate && project.startDate && new Date(dueDate) < new Date(project.startDate)) {
            return res.status(400).json({ message: "Task due date cannot be before project start date" });
        }

        let projectExtended = false;
        let extendedMilestones = [];

        if (dueDate) {
            const taskDue = new Date(dueDate);
            // If task due date extends beyond project due date, extend project due date!
            if (project.dueDate && taskDue > new Date(project.dueDate)) {
                if (!project.originalDueDate && project.dueDate) {
                    project.originalDueDate = project.dueDate;
                }
                project.dueDate = taskDue;
                await project.save();
                projectExtended = true;
            }

            // If task is linked to milestone(s), extend milestone due date(s) if task due date extends beyond them!
            if (validMilestones.length > 0) {
                const linkedMilestones = await Milestone.find({ _id: { $in: validMilestones } });
                for (const ms of linkedMilestones) {
                    if (ms.dueDate && taskDue > new Date(ms.dueDate)) {
                        if (!ms.originalDueDate && ms.dueDate) {
                            ms.originalDueDate = ms.dueDate;
                        }
                        ms.dueDate = taskDue;
                        await ms.save();
                        extendedMilestones.push(ms);
                    }
                }
            }
        }

        let normalizedTaskStatus = "New Task";
        if (status) {
            normalizedTaskStatus = (status === "Todo" || status === "To Do") ? "New Task" : status;
        }

        const processedSubtasks = (Array.isArray(subtasks) ? subtasks : []).map((st) => {
            let assigned = st.assignedTo?._id || st.assignedTo;
            if (assigned && !validProjectUserIds.has(assigned.toString())) {
                assigned = null;
            }
            const isCompleted = !!st.completed || st.status === "Completed";
            let normalizedStatus = "New Task";
            if (st.status) {
                normalizedStatus = (st.status === "Done" || st.status === "Completed")
                    ? "Completed"
                    : ((st.status === "Todo" || st.status === "To Do") ? "New Task" : st.status);
            } else if (isCompleted) {
                normalizedStatus = "Completed";
            }
            return {
                title: st.title,
                description: st.description || "",
                dueDate: st.dueDate || null,
                originalDueDate: st.originalDueDate || st.dueDate || null,
                completed: isCompleted,
                status: normalizedStatus,
                priority: ["Low", "Medium", "High", "Urgent"].includes(st.priority) ? st.priority : "Medium",
                assignedTo: assigned && assigned !== "" ? assigned : null,
                ...(st._id ? { _id: st._id } : {})
            };
        });

        const task = await Task.create({
            title,
            description: description || "",
            project: projectId,
            createdBy: req.user.id,
            assignedTo: finalAssignedTo,
            status: normalizedTaskStatus,
            priority: priority || "Medium",
            dueDate: dueDate || null,
            originalDueDate: dueDate || null,
            dependencies: validDependencies,
            milestones: validMilestones,
            subtasks: processedSubtasks
        });

        const result = await Task.findById(task._id)
            .populate("createdBy", "name email")
            .populate("assignedTo", "name email")
            .populate("subtasks.assignedTo", "name email")
            .populate("dependencies", "title status")
            .populate("milestones", "title status dueDate progress");

        // Log Activity safely
        try {
            await createActivity({
                userId: req.user.id,
                action: "TASK_CREATED",
                description: `created task "${task.title}"`,
                projectId,
                taskId: task._id
            });
        } catch (actErr) {
            console.error("Failed to log task creation activity:", actErr);
        }

        if (projectExtended) {
            try {
                await createActivity({
                    userId: req.user.id,
                    action: "PROJECT_DUE_DATE_EXTENDED",
                    description: `automatically extended project "${project.name}" due date to ${new Date(project.dueDate).toLocaleDateString()} due to new task "${task.title}" (Original: ${new Date(project.originalDueDate).toLocaleDateString()})`,
                    projectId,
                    taskId: task._id,
                    targetType: "Project",
                    targetId: project._id
                });
            } catch (err) {
                console.error("Failed to log project extension activity:", err);
            }
        }

        if (extendedMilestones.length > 0) {
            for (const ms of extendedMilestones) {
                try {
                    await createActivity({
                        userId: req.user.id,
                        action: "MILESTONE_DUE_DATE_EXTENDED",
                        description: `automatically extended milestone "${ms.title}" due date to ${new Date(ms.dueDate).toLocaleDateString()} due to new task "${task.title}" (Original: ${new Date(ms.originalDueDate).toLocaleDateString()})`,
                        projectId,
                        taskId: task._id,
                        targetType: "Milestone",
                        targetId: ms._id
                    });
                } catch (err) {
                    console.error("Failed to log milestone extension activity:", err);
                }
            }
        }

        // Notify Assigned Users safely
        if (finalAssignedTo.length > 0) {
            for (const recipientId of finalAssignedTo) {
                try {
                    await createNotification({
                        recipient: recipientId,
                        sender: req.user.id,
                        type: "TASK_ASSIGNED",
                        message: `You were assigned task "${task.title}"`,
                        project: projectId,
                        task: task._id
                    });
                } catch (notifErr) {
                    console.error("Failed to send task assigned notification:", notifErr);
                }
            }
        }

        res.status(201).json({
            message: "Task created successfully",
            task: result,
            data: result
        });

    } catch (error) {
        console.error("Error in createTask:", error);
        res.status(500).json({
            message: error.message || "Server error while creating task"
        });
    }
};

const getTasks = async (req, res) => {
    try {
        const { projectId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;

        const project = await Project.findById(projectId);

        if (!project) {
            return res.status(404).json({
                message: "Project not found"
            });
        }

        const targetSpaceId = project.space || project.workspace;
        const workspaceMember = await SpaceMember.findOne({
            $or: [{ space: targetSpaceId }, { workspace: targetSpaceId }],
            user: req.user.id
        });

        if (!workspaceMember) {
            return res.status(403).json({
                message: "You are not a space member"
            });
        }

        if (
            !["Product Owner", "Product Manager", "Owner", "Admin", "Project Manager", "Manager", "Scrum Master", "Member"].includes(workspaceMember.permissionRole) &&
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

        const total = await Task.countDocuments({ project: projectId, isArchived: false });
        const tasks = await Task.find({
            project: projectId,
            isArchived: false
        })
            .populate("createdBy", "name email")
            .populate("assignedTo", "name email")
            .populate("subtasks.assignedTo", "name email")
            .populate("dependencies", "title status")
            .populate("milestones", "title status dueDate progress")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.status(200).json({
            tasks,
            data: tasks,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Server error"
        });
    }
};

const getTask = async (req, res) => {
    try {
        const { taskId } = req.params;

        const task = await Task.findById(taskId)
            .populate("createdBy", "name email")
            .populate("assignedTo", "name email")
            .populate("subtasks.assignedTo", "name email")
            .populate("dependencies", "title status")
            .populate("milestones", "title status dueDate progress");

        if (!task) {
            return res.status(404).json({
                message: "Task not found"
            });
        }

        const project = await Project.findById(task.project);

        if (!project) {
            return res.status(404).json({
                message: "Project not found"
            });
        }

        const targetSpaceId = project.space || project.workspace;
        const workspaceMember = await SpaceMember.findOne({
            $or: [{ space: targetSpaceId }, { workspace: targetSpaceId }],
            user: req.user.id
        });

        if (!workspaceMember) {
            return res.status(403).json({
                message: "You are not a workspace member"
            });
        }

        res.status(200).json({
            task,
            data: task
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Server error"
        });
    }
};

const updateTask = async (req, res) => {
    try {
        const { taskId } = req.params;

        const {
            title,
            description,
            assignedTo,
            priority,
            dueDate,
            dependencies,
            milestones,
            subtasks
        } = req.body;

        const task = await Task.findById(taskId);

        if (!task) {
            return res.status(404).json({
                message: "Task not found"
            });
        }

        const project = await Project.findById(task.project);

        if (!project) {
            return res.status(404).json({
                message: "Project not found"
            });
        }

        if (project.isArchived) {
            return res.status(400).json({
                message: "Cannot update task in an archived project"
            });
        }

        const spaceId = project.space || project.workspace;
        const spaceMember = await SpaceMember.findOne({
            space: spaceId,
            user: req.user.id
        });

        if (!spaceMember) {
            return res.status(403).json({
                message: "You are not a space member"
            });
        }

        if (["Watcher", "Stakeholder", "Stake holder"].includes(spaceMember.permissionRole)) {
            return res.status(403).json({
                message: "Stakeholders do not have permission to update tasks"
            });
        }

        const projectMember = await ProjectMember.findOne({
            project: project._id,
            user: req.user.id
        });

        const isManager =
            ["Product Owner", "Product Manager", "Scrum Master", "Project Manager", "Owner", "Admin", "Manager"].includes(spaceMember.permissionRole) ||
            (project.manager && (project.manager._id || project.manager).toString() === req.user.id.toString());

        const isMember = spaceMember.permissionRole === "Member" || !!projectMember;

        if (!isManager && !isMember) {
            return res.status(403).json({
                message: "You do not have permission to update this task"
            });
        }

        const prevAssignedTo = Array.isArray(task.assignedTo)
            ? task.assignedTo.map((id) => (id ? id.toString() : "")).filter(Boolean).sort().join(",")
            : (task.assignedTo ? task.assignedTo.toString() : "");

        const projectMembers = await ProjectMember.find({ project: project._id });
        const validProjectUserIds = new Set(projectMembers.map((pm) => pm.user.toString()));
        if (project.manager) validProjectUserIds.add((project.manager._id || project.manager).toString());
        if (project.createdBy) validProjectUserIds.add((project.createdBy._id || project.createdBy).toString());

        if (assignedTo !== undefined) {
            let finalAssignedTo = [];
            if (Array.isArray(assignedTo)) {
                finalAssignedTo = assignedTo.filter((id) => id && id !== "" && id !== "undefined");
            } else if (assignedTo && typeof assignedTo === "string" && assignedTo !== "" && assignedTo !== "undefined") {
                finalAssignedTo = [assignedTo];
            }
            finalAssignedTo = finalAssignedTo.filter((userId) => validProjectUserIds.has(userId.toString()));
            task.assignedTo = finalAssignedTo;
        }

        if (dependencies !== undefined && Array.isArray(dependencies)) {
            for (const dependencyId of dependencies) {
                if (dependencyId.toString() === taskId) {
                    return res.status(400).json({
                        message: "A task cannot depend on itself"
                    });
                }

                const isCircular = await hasCircularDependency(taskId, dependencyId);
                if (isCircular) {
                    return res.status(400).json({
                        message: "Circular dependency detected"
                    });
                }

                const dependencyTask = await Task.findOne({
                    _id: dependencyId,
                    project: project._id
                });

                if (!dependencyTask) {
                    return res.status(400).json({
                        message: "Invalid dependency task"
                    });
                }
            }

            task.dependencies = dependencies;
        }

        const oldTaskDueDate = task.dueDate;
        let projectExtended = false;
        let extendedMilestones = [];

        const effectiveDueDate = dueDate !== undefined ? dueDate : task.dueDate;
        if (effectiveDueDate && isNaN(new Date(effectiveDueDate).getTime())) {
            return res.status(400).json({ message: "Invalid due date format" });
        }
        if (effectiveDueDate && project.startDate && new Date(effectiveDueDate) < new Date(project.startDate)) {
            return res.status(400).json({ message: "Task due date cannot be before project start date" });
        }

        // If task due date extends beyond project target due date, extend project due date!
        if (effectiveDueDate && project.dueDate && new Date(effectiveDueDate) > new Date(project.dueDate)) {
            if (!project.originalDueDate && project.dueDate) {
                project.originalDueDate = project.dueDate;
            }
            project.dueDate = new Date(effectiveDueDate);
            await project.save();
            projectExtended = true;
        }

        if (milestones !== undefined) {
            let finalMilestones = [];
            if (Array.isArray(milestones)) {
                finalMilestones = milestones.filter((id) => id && id !== "" && id !== "undefined");
            } else if (milestones && typeof milestones === "string" && milestones !== "" && milestones !== "undefined") {
                finalMilestones = [milestones];
            }

            const foundMilestones = await Milestone.find({
                _id: { $in: finalMilestones },
                project: project._id
            });
            task.milestones = foundMilestones.map((m) => m._id);

            // Extend newly linked milestones if task due date extends beyond them
            if (effectiveDueDate) {
                const effDue = new Date(effectiveDueDate);
                for (const ms of foundMilestones) {
                    if (ms.dueDate && effDue > new Date(ms.dueDate)) {
                        if (!ms.originalDueDate && ms.dueDate) {
                            ms.originalDueDate = ms.dueDate;
                        }
                        ms.dueDate = effDue;
                        await ms.save();
                        extendedMilestones.push(ms);
                    }
                }
            }
        }

        if (title !== undefined) task.title = title;
        if (description !== undefined) task.description = description;
        if (priority !== undefined) task.priority = priority;
        if (dueDate !== undefined) {
            if (dueDate) {
                const newDue = new Date(dueDate);
                if (!task.originalDueDate && task.dueDate) {
                    task.originalDueDate = task.dueDate;
                } else if (!task.originalDueDate) {
                    task.originalDueDate = newDue;
                }

                // Extend all linked milestones if task due date extends beyond them
                const allMilestoneIds = task.milestones || [];
                if (allMilestoneIds.length > 0) {
                    const linkedMilestones = await Milestone.find({ _id: { $in: allMilestoneIds } });
                    for (const ms of linkedMilestones) {
                        if (ms.dueDate && newDue > new Date(ms.dueDate)) {
                            if (!ms.originalDueDate && ms.dueDate) {
                                ms.originalDueDate = ms.dueDate;
                            }
                            ms.dueDate = newDue;
                            await ms.save();
                            extendedMilestones.push(ms);
                        }
                    }
                }
            }
            task.dueDate = dueDate || null;
        }

        const subtaskActivities = [];
        if (subtasks !== undefined) {
            const oldSubtasks = (task.subtasks || []).map((s) => ({
                _id: s._id ? s._id.toString() : "",
                title: s.title || "",
                dueDate: s.dueDate || null,
                originalDueDate: s.originalDueDate || null,
                completed: !!s.completed || s.status === "Completed",
                status: s.status || "New Task",
                priority: s.priority || "Medium",
                assignedTo: s.assignedTo ? (s.assignedTo._id || s.assignedTo).toString() : ""
            }));

            const newSubtasksList = Array.isArray(subtasks) ? subtasks : [];

            if (newSubtasksList.length > oldSubtasks.length) {
                const oldIds = new Set(oldSubtasks.map((st) => st._id).filter(Boolean));
                const added = newSubtasksList.filter((st) => !st._id || !oldIds.has(st._id.toString()));
                for (const st of added) {
                    subtaskActivities.push({
                        action: "SUBTASK_ADDED",
                        description: `added subtask "${st.title || 'Untitled'}" in task "${task.title}"`
                    });
                }
            } else if (newSubtasksList.length < oldSubtasks.length) {
                const newIds = new Set(newSubtasksList.map((st) => st._id ? st._id.toString() : "").filter(Boolean));
                const removed = oldSubtasks.filter((st) => st._id && !newIds.has(st._id));
                if (removed.length > 0) {
                    for (const st of removed) {
                        subtaskActivities.push({
                            action: "SUBTASK_DELETED",
                            description: `removed subtask "${st.title}" from task "${task.title}"`
                        });
                    }
                } else {
                    subtaskActivities.push({
                        action: "SUBTASK_DELETED",
                        description: `deleted a subtask from task "${task.title}"`
                    });
                }
            } else {
                for (let i = 0; i < newSubtasksList.length; i++) {
                    const nSt = newSubtasksList[i];
                    const nId = nSt._id ? nSt._id.toString() : "";
                    const oSt = oldSubtasks.find((o) => o._id && nId && o._id === nId) || oldSubtasks[i];
                    if (oSt) {
                        const oDone = oSt.completed;
                        const nDone = !!nSt.completed || nSt.status === "Completed";
                        const nAssigned = nSt.assignedTo ? (nSt.assignedTo._id || nSt.assignedTo).toString() : "";
                        const nNormStatus = (nSt.status === "Todo" || nSt.status === "To Do") ? "New Task" : nSt.status;
                        const oNormStatus = (oSt.status === "Todo" || oSt.status === "To Do") ? "New Task" : oSt.status;

                        if (oDone !== nDone) {
                            if (nDone) {
                                subtaskActivities.push({
                                    action: "SUBTASK_COMPLETED",
                                    description: `completed subtask "${nSt.title}" in task "${task.title}"`
                                });
                            } else {
                                subtaskActivities.push({
                                    action: "SUBTASK_REOPENED",
                                    description: `marked subtask "${nSt.title}" as incomplete in task "${task.title}"`
                                });
                            }
                        } else if (nNormStatus && oNormStatus && nNormStatus !== oNormStatus) {
                            subtaskActivities.push({
                                action: "SUBTASK_STATUS_CHANGED",
                                description: `changed status of subtask "${nSt.title}" to ${nNormStatus}`
                            });
                        } else if (nSt.priority && oSt.priority && nSt.priority !== oSt.priority) {
                            subtaskActivities.push({
                                action: "SUBTASK_UPDATED",
                                description: `changed priority of subtask "${nSt.title}" to ${nSt.priority}`
                            });
                        } else if (nAssigned !== oSt.assignedTo) {
                            subtaskActivities.push({
                                action: "SUBTASK_ASSIGNED",
                                description: `updated assignee of subtask "${nSt.title}"`
                            });
                        } else if (nSt.title && oSt.title && nSt.title !== oSt.title) {
                            subtaskActivities.push({
                                action: "SUBTASK_UPDATED",
                                description: `renamed subtask "${oSt.title}" to "${nSt.title}"`
                            });
                        } else if (nSt.dueDate !== undefined && (
                            (oSt.dueDate && !nSt.dueDate) ||
                            (!oSt.dueDate && nSt.dueDate) ||
                            (oSt.dueDate && nSt.dueDate && new Date(oSt.dueDate).getTime() !== new Date(nSt.dueDate).getTime())
                        )) {
                            const origDate = nSt.originalDueDate || oSt.originalDueDate || oSt.dueDate;
                            const isExtended = origDate && nSt.dueDate && new Date(nSt.dueDate) > new Date(origDate);
                            subtaskActivities.push({
                                action: isExtended ? "SUBTASK_DUE_DATE_EXTENDED" : "SUBTASK_DUE_DATE_UPDATED",
                                description: isExtended
                                    ? `extended subtask "${nSt.title}" due date to ${new Date(nSt.dueDate).toLocaleDateString()} in task "${task.title}" (Original: ${new Date(origDate).toLocaleDateString()})`
                                    : `updated subtask "${nSt.title}" due date to ${nSt.dueDate ? new Date(nSt.dueDate).toLocaleDateString() : "none"} in task "${task.title}"`
                            });
                        }
                    }
                }
            }

            task.subtasks = newSubtasksList.map((st) => {
                let assigned = st.assignedTo?._id || st.assignedTo;
                if (assigned && !validProjectUserIds.has(assigned.toString())) {
                    assigned = null;
                }
                const isCompleted = !!st.completed || st.status === "Completed";
                const normalizedStatus = st.status
                    ? (st.status === "Done" || st.status === "Completed" ? "Completed" : (st.status === "Todo" || st.status === "To Do" ? "New Task" : st.status))
                    : (isCompleted ? "Completed" : "New Task");

                const existingSubtask = (task.subtasks || []).find((s) => s._id && st._id && s._id.toString() === st._id.toString());
                let origDue = st.originalDueDate || (existingSubtask ? existingSubtask.originalDueDate : null);
                if (!origDue && st.dueDate) {
                    origDue = existingSubtask && existingSubtask.dueDate ? existingSubtask.dueDate : st.dueDate;
                }

                return {
                    title: st.title,
                    description: st.description || "",
                    dueDate: st.dueDate || null,
                    originalDueDate: origDue || null,
                    completed: isCompleted,
                    status: normalizedStatus,
                    priority: ["Low", "Medium", "High", "Urgent"].includes(st.priority) ? st.priority : "Medium",
                    assignedTo: assigned && assigned !== "" ? assigned : null,
                    ...(st._id ? { _id: st._id } : {})
                };
            });
        }

        await task.save();

        const updatedTask = await Task.findById(taskId)
            .populate("createdBy", "name email")
            .populate("assignedTo", "name email")
            .populate("subtasks.assignedTo", "name email")
            .populate("dependencies", "title status")
            .populate("milestones", "title status dueDate progress");

        if (projectExtended) {
            try {
                await createActivity({
                    userId: req.user.id,
                    action: "PROJECT_DUE_DATE_EXTENDED",
                    description: `automatically extended project "${project.name}" due date to ${new Date(project.dueDate).toLocaleDateString()} due to task "${task.title}" extension (Original: ${new Date(project.originalDueDate).toLocaleDateString()})`,
                    projectId: project._id,
                    taskId: task._id,
                    targetType: "Project",
                    targetId: project._id
                });
            } catch (err) {
                console.error("Failed to log project extension activity:", err);
            }
        }

        if (extendedMilestones.length > 0) {
            const uniqueMilestones = [];
            const seenIds = new Set();
            for (const ms of extendedMilestones) {
                const idStr = (ms._id || ms).toString();
                if (!seenIds.has(idStr)) {
                    seenIds.add(idStr);
                    uniqueMilestones.push(ms);
                }
            }
            for (const ms of uniqueMilestones) {
                try {
                    await createActivity({
                        userId: req.user.id,
                        action: "MILESTONE_DUE_DATE_EXTENDED",
                        description: `automatically extended milestone "${ms.title}" due date to ${new Date(ms.dueDate).toLocaleDateString()} due to task "${task.title}" extension (Original: ${new Date(ms.originalDueDate).toLocaleDateString()})`,
                        projectId: project._id,
                        taskId: task._id,
                        targetType: "Milestone",
                        targetId: ms._id
                    });
                } catch (err) {
                    console.error("Failed to log milestone extension activity:", err);
                }
            }
        }

        const taskDueDateChanged = dueDate !== undefined && (
            (oldTaskDueDate && !task.dueDate) ||
            (!oldTaskDueDate && task.dueDate) ||
            (oldTaskDueDate && task.dueDate && new Date(oldTaskDueDate).getTime() !== new Date(task.dueDate).getTime())
        );

        if (taskDueDateChanged) {
            const isExtended = task.originalDueDate && task.dueDate && new Date(task.dueDate) > new Date(task.originalDueDate);
            try {
                await createActivity({
                    userId: req.user.id,
                    action: isExtended ? "TASK_DUE_DATE_EXTENDED" : "TASK_DUE_DATE_UPDATED",
                    description: isExtended
                        ? `extended task "${task.title}" due date to ${new Date(task.dueDate).toLocaleDateString()} (Original: ${new Date(task.originalDueDate).toLocaleDateString()})`
                        : `updated task "${task.title}" due date to ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "none"}`,
                    projectId: project._id,
                    taskId: task._id,
                    targetType: "Task",
                    targetId: task._id
                });
            } catch (actErr) {
                console.error("Failed to log task due date activity:", actErr);
            }
        }

        if (subtaskActivities.length > 0) {
            for (const subAct of subtaskActivities) {
                try {
                    await createActivity({
                        userId: req.user.id,
                        action: subAct.action,
                        description: subAct.description,
                        projectId: project._id,
                        taskId
                    });
                } catch (actErr) {
                    console.error("Failed to log subtask activity:", actErr);
                }
            }
        } else if (!taskDueDateChanged && !projectExtended && extendedMilestones.length === 0) {
            try {
                await createActivity({
                    userId: req.user.id,
                    action: "TASK_UPDATED",
                    description: `updated task "${task.title}"`,
                    projectId: project._id,
                    taskId
                });
            } catch (actErr) {
                console.error("Failed to log task activity:", actErr);
            }
        }

        try {
            if (task.assignedTo && task.assignedTo.length > 0) {
                const newAssignedTo = task.assignedTo.map((id) => (id?._id || id).toString()).sort().join(",");
                if (newAssignedTo !== prevAssignedTo) {
                    for (const recipientId of task.assignedTo) {
                        const rId = recipientId?._id || recipientId;
                        if (rId && rId.toString() !== req.user.id.toString()) {
                            await createNotification({
                                recipient: rId,
                                sender: req.user.id,
                                type: "TASK_ASSIGNED",
                                message: `You were assigned task "${task.title}"`,
                                project: project._id,
                                task: taskId
                            });
                        }
                    }
                }
            }
        } catch (notifErr) {
            console.error("Failed to send task assigned notification:", notifErr);
        }

        res.status(200).json({
            message: "Task updated successfully",
            task: updatedTask,
            data: updatedTask
        });

    } catch (error) {
        console.error("Error in updateTask:", error);
        res.status(500).json({
            message: error.message || "Server error"
        });
    }
};

const updateTaskStatus = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { status } = req.body;

        const allowedStatus = [
            "New Task",
            "Todo",
            "To Do",
            "In Progress",
            "Review",
            "In Review",
            "Completed",
            "Blocked",
            "Hold"
        ];

        if (!allowedStatus.includes(status)) {
            return res.status(400).json({
                message: "Invalid task status"
            });
        }

        let normalizedStatus = status;
        if (status === "To Do" || status === "Todo") normalizedStatus = "New Task";
        if (status === "In Review") normalizedStatus = "Review";

        const task = await Task.findById(taskId);

        if (!task) {
            return res.status(404).json({
                message: "Task not found"
            });
        }

        const project = await Project.findById(task.project);

        if (!project) {
            return res.status(404).json({
                message: "Project not found"
            });
        }

        if (project.isArchived) {
            return res.status(400).json({
                message: "Cannot update task in an archived project"
            });
        }

        const spaceId = project.space || project.workspace;
        const spaceMember = await SpaceMember.findOne({
            space: spaceId,
            user: req.user.id
        });

        if (!spaceMember) {
            return res.status(403).json({
                message: "You are not a space member"
            });
        }

        if (["Watcher", "Stakeholder", "Stake holder"].includes(spaceMember.permissionRole)) {
            return res.status(403).json({
                message: "Stakeholders do not have permission to update task status"
            });
        }

        const projectMember = await ProjectMember.findOne({
            project: project._id,
            user: req.user.id
        });

        const isManager =
            ["Product Owner", "Product Manager", "Scrum Master", "Project Manager", "Owner", "Admin", "Manager"].includes(spaceMember.permissionRole) ||
            (project.manager && (project.manager._id || project.manager).toString() === req.user.id.toString());

        const isMember = spaceMember.permissionRole === "Member" || !!projectMember;

        if (!isManager && !isMember) {
            return res.status(403).json({
                message: "You do not have permission to update this task status"
            });
        }

        if (normalizedStatus === "Completed") {
            if (task.dependencies && task.dependencies.length > 0) {
                const dependencies = await Task.find({
                    _id: { $in: task.dependencies }
                });

                const incompleteTask = dependencies.find(
                    dependency => dependency.status !== "Completed"
                );

                if (incompleteTask) {
                    return res.status(400).json({
                        message: `Task cannot be completed. Dependency "${incompleteTask.title}" is not completed`
                    });
                }
            }
        }

        task.status = normalizedStatus;
        await task.save();

        const updatedTask = await Task.findById(taskId)
            .populate("createdBy", "name email")
            .populate("assignedTo", "name email")
            .populate("subtasks.assignedTo", "name email")
            .populate("dependencies", "title status")
            .populate("milestones", "title status dueDate progress");

        try {
            const actionType = normalizedStatus === "Completed" ? "TASK_COMPLETED" : "TASK_STATUS_CHANGED";
            await createActivity({
                userId: req.user.id,
                action: actionType,
                description: `changed status of task "${task.title}" to ${normalizedStatus}`,
                projectId: project._id,
                taskId
            });
        } catch (actErr) {
            console.error("Failed to log activity:", actErr);
        }

        try {
            if (normalizedStatus === "Completed") {
                if (project.manager && project.manager.toString() !== req.user.id.toString()) {
                    await createNotification({
                        recipient: project.manager,
                        sender: req.user.id,
                        type: "TASK_COMPLETED",
                        message: `Task "${task.title}" was completed`,
                        project: project._id,
                        task: taskId
                    });
                }
            } else if (task.assignedTo && Array.isArray(task.assignedTo)) {
                for (const recipientId of task.assignedTo) {
                    const rId = recipientId?._id || recipientId;
                    if (rId && rId.toString() !== req.user.id.toString()) {
                        await createNotification({
                            recipient: rId,
                            sender: req.user.id,
                            type: "TASK_STATUS_CHANGED",
                            message: `Status of task "${task.title}" changed to ${normalizedStatus}`,
                            project: project._id,
                            task: taskId
                        });
                    }
                }
            }
        } catch (notifErr) {
            console.error("Failed to send status change notification:", notifErr);
        }

        res.status(200).json({
            message: "Task status updated successfully",
            task: updatedTask,
            data: updatedTask
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Server error"
        });
    }
};

const archiveTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ message: "Task not found" });

        const project = await Project.findById(task.project);
        if (!project) return res.status(404).json({ message: "Project not found" });

        const targetSpaceId = project.space || project.workspace;
        const workspaceMember = await SpaceMember.findOne({
            $or: [{ space: targetSpaceId }, { workspace: targetSpaceId }],
            user: req.user.id
        });
        if (!workspaceMember) return res.status(403).json({ message: "Not a space member" });

        if (task.isArchived) {
            return res.status(400).json({ message: "Task is already archived" });
        }

        task.isArchived = true;
        await task.save();

        await createActivity({
            userId: req.user.id,
            action: "TASK_UPDATED",
            description: `archived task "${task.title}"`,
            projectId: project._id,
            taskId
        });

        res.status(200).json({ message: "Task archived successfully" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server error" });
    }
};

const restoreTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ message: "Task not found" });

        const project = await Project.findById(task.project);
        if (!project) return res.status(404).json({ message: "Project not found" });

        const targetSpaceIdRestore = project.space || project.workspace;
        const workspaceMemberRestore = await SpaceMember.findOne({
            $or: [{ space: targetSpaceIdRestore }, { workspace: targetSpaceIdRestore }],
            user: req.user.id
        });
        if (!workspaceMemberRestore) return res.status(403).json({ message: "Not a space member" });

        if (!task.isArchived) {
            return res.status(400).json({ message: "Task is already active" });
        }

        task.isArchived = false;
        await task.save();

        await createActivity({
            userId: req.user.id,
            action: "TASK_UPDATED",
            description: `restored task "${task.title}"`,
            projectId: project._id,
            taskId
        });

        res.status(200).json({ message: "Task restored successfully" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server error" });
    }
};

const deleteTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ message: "Task not found" });

        const project = await Project.findById(task.project);
        if (!project) return res.status(404).json({ message: "Project not found" });

        const targetSpaceIdDel = project.space || project.workspace;
        const workspaceMemberDel = await SpaceMember.findOne({
            $or: [{ space: targetSpaceIdDel }, { workspace: targetSpaceIdDel }],
            user: req.user.id
        });
        if (!workspaceMemberDel) return res.status(403).json({ message: "Not a space member" });

        if (workspaceMember.permissionRole === "Watcher") {
            return res.status(403).json({ message: "Watchers do not have permission to delete tasks" });
        }

        await Task.findByIdAndDelete(taskId);

        try {
            await createActivity({
                userId: req.user.id,
                action: "TASK_DELETED",
                description: `deleted task "${task.title}"`,
                projectId: project._id,
                taskId
            });
        } catch (e) {
            console.error(e);
        }

        res.status(200).json({ message: "Task deleted successfully" });
    } catch (error) {
        console.error("Error deleting task:", error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
    createTask,
    getTasks,
    getTask,
    updateTask,
    updateTaskStatus,
    archiveTask,
    restoreTask,
    deleteTask
};