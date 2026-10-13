const Project = require("../models/project.model");
const Task = require("../models/task.model");
const User = require("../models/user.model");
const Comment = require("../models/comment.model");
const SpaceMember = require("../models/spacemember.model");

const globalSearch = async (req, res) => {
    try {
        const spaceId = req.query.spaceId || req.query.workspaceId;
        const q = req.query.q;

        if (!q || q.trim() === "") {
            return res.status(200).json({
                data: { projects: [], tasks: [], users: [], comments: [] }
            });
        }

        const queryRegex = new RegExp(q, "i");

        // Determine accessible space IDs
        let spaceIds = [];
        if (spaceId) {
            const member = await SpaceMember.findOne({
                space: spaceId,
                user: req.user.id
            });
            if (!member) {
                return res.status(403).json({ message: "Not a member of this space" });
            }
            spaceIds = [spaceId];
        } else {
            const memberships = await SpaceMember.find({ user: req.user.id });
            spaceIds = memberships.map((m) => m.space);
        }

        if (spaceIds.length === 0) {
            return res.status(200).json({
                data: { projects: [], tasks: [], users: [], comments: [] }
            });
        }

        // Find projects in accessible spaces
        const projects = await Project.find({
            space: { $in: spaceIds },
            $or: [{ name: queryRegex }, { description: queryRegex }]
        }).limit(10);

        // Find tasks in accessible projects
        const allProjectsInSpace = await Project.find({ space: { $in: spaceIds } }).select("_id");
        const allProjectIds = allProjectsInSpace.map((p) => p._id);

        const tasks = await Task.find({
            project: { $in: allProjectIds },
            $or: [{ title: queryRegex }, { description: queryRegex }]
        })
            .populate("project", "name")
            .limit(15);

        // Find users in accessible spaces
        const spaceMembers = await SpaceMember.find({ space: { $in: spaceIds } });
        const userIds = [...new Set(spaceMembers.map((m) => m.user))];

        const users = await User.find({
            _id: { $in: userIds },
            $or: [{ name: queryRegex }, { email: queryRegex }]
        })
            .select("name email profileImage")
            .limit(10);

        // Find comments in accessible projects
        const comments = await Comment.find({
            project: { $in: allProjectIds },
            text: queryRegex
        })
            .populate("user", "name email")
            .populate("project", "name")
            .limit(15);

        res.status(200).json({
            data: {
                projects,
                tasks,
                users,
                comments
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
    globalSearch
};
