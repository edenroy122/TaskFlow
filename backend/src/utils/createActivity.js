const Activity = require("../models/activity.model");

const createActivity = async ({
    userId,
    action,
    description,
    projectId,
    taskId,
    targetType,
    targetId
}) => {
    try {
        if (!userId || !action || !projectId) {
            return null;
        }

        const activity = await Activity.create({
            user: userId,
            action,
            description: description || action,
            project: projectId,
            task: taskId || undefined,
            targetType: targetType || undefined,
            targetId: targetId || undefined
        });

        return activity;
    } catch (error) {
        console.error("Error creating activity log:", error);
        return null;
    }
};

module.exports = createActivity;
