const SpaceMember = require("../models/spacemember.model");
const ProjectMember = require("../models/projectmembers.model");
const createNotification = require("./createNotification");

/**
 * Get all user IDs who are Watchers for a project or space
 */
const getProjectWatcherUserIds = async (projectId, spaceId) => {
    try {
        const watcherUserIds = new Set();

        // 1. Check ProjectMembers with role "Watcher"
        if (projectId) {
            const pMembers = await ProjectMember.find({ project: projectId, role: "Watcher" });
            pMembers.forEach((pm) => {
                if (pm.user) watcherUserIds.add(pm.user.toString());
            });
        }

        // 2. Check SpaceMembers with permissionRole "Watcher"
        const targetSpaceId = spaceId;
        if (targetSpaceId) {
            const spaceMembers = await SpaceMember.find({ space: targetSpaceId, permissionRole: "Watcher" });
            spaceMembers.forEach((wm) => {
                if (wm.user) watcherUserIds.add(wm.user.toString());
            });
        }

        return Array.from(watcherUserIds);
    } catch (err) {
        console.error("Error getting project watcher user IDs:", err);
        return [];
    }
};

/**
 * Dispatch notifications and real-time socket events to project watchers
 */
const notifyProjectWatchers = async ({
    projectId,
    spaceId,
    workspaceId,
    senderId,
    type,
    title,
    message,
    taskId,
    commentId
}) => {
    try {
        const targetSpaceId = spaceId || workspaceId;
        const watcherIds = await getProjectWatcherUserIds(projectId, targetSpaceId);

        for (const watcherId of watcherIds) {
            if (senderId && watcherId.toString() === senderId.toString()) continue;

            await createNotification({
                recipient: watcherId,
                sender: senderId || watcherId,
                type,
                title,
                message,
                project: projectId,
                task: taskId,
                comment: commentId
            });
        }
    } catch (err) {
        console.error("Error notifying project watchers:", err);
    }
};

module.exports = {
    getProjectWatcherUserIds,
    notifyProjectWatchers
};
