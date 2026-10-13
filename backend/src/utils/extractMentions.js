const User = require("../models/user.model");

const extractMentions = async (text) => {
    if (!text || typeof text !== "string") return [];

    // Match words starting with @
    const matches = text.match(/@([a-zA-Z0-9._-]+)/g);
    if (!matches || matches.length === 0) return [];

    const usernames = matches.map((m) => m.substring(1).toLowerCase());

    // Search users matching name or email prefix
    const users = await User.find({
        $or: [
            { name: { $in: usernames.map((u) => new RegExp(`^${u}`, "i")) } },
            { email: { $in: usernames.map((u) => new RegExp(`^${u}`, "i")) } }
        ]
    });

    return users.map((u) => u._id);
};

module.exports = extractMentions;
