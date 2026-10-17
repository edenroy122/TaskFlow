const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieparser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authroute = require('./routes/auth.route');
const spaceroute = require('./routes/space.route');
const space_invitation = require('./routes/space_invitation.route');
const projectRoutes = require("./routes/project.route");
const taskRoutes = require("./routes/task.route");
const projectMemberRoutes = require("./routes/projectmember.route");
const taskWatcherRoutes = require("./routes/taskwatcher.route");

const commentRoutes = require("./routes/comment.route");
const documentRoutes = require("./routes/document.route");
const notificationRoutes = require("./routes/notification.route");
const activityRoutes = require("./routes/activity.route");
const approvalRoutes = require("./routes/approval.route");
const dashboardRoutes = require("./routes/dashboard.route");
const searchRoutes = require("./routes/search.route");
const reportRoutes = require("./routes/report.route");
const milestoneRoutes = require("./routes/milestone.route");
const watcherRoutes = require("./routes/watcher.route");

const errorMiddleware = require('./middleware/errorMiddleware');

const app = express();

// Security Middlewares
app.use(helmet({ crossOriginResourcePolicy: false }));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 mins
    max: 500, // Limit each IP to 500 requests per windowMs
    message: { message: "Too many requests, please try again later." }
});
app.use(limiter);

// Express Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieparser());

const rawClientUrl = process.env.CLIENT_URL || "http://localhost:5173";
const allowedOrigins = rawClientUrl.split(',').map(url => url.trim().replace(/\/$/, ''));

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const normalized = origin.replace(/\/$/, '');
        if (
            allowedOrigins.includes('*') ||
            allowedOrigins.includes(normalized) ||
            (normalized.endsWith('.vercel.app') && allowedOrigins.some(o => o.includes('vercel.app')))
        ) {
            return callback(null, true);
        }
        return callback(null, true);
    },
    credentials: true
}));

// Static files for uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check endpoint for Render / monitoring
app.get('/health', (req, res) => {
    res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// HTTP API Route Request Logger
app.use((req, res, next) => {
    console.log(`[API REQUEST LOG] ${req.method} ${req.url}`);
    next();
});

// Route Middlewares
app.use('/api/auth', authroute);
app.use('/api/space', spaceroute);
app.use('/api/workspace', spaceroute);
app.use('/api/space_invitation', space_invitation);
app.use('/api/workspace_invitation', space_invitation);
app.use("/api/project", projectRoutes);
app.use("/api/task", taskRoutes);
app.use("/api/projectmember", projectMemberRoutes);
app.use("/api/task-watcher", taskWatcherRoutes);

app.use("/api/comment", commentRoutes);
app.use("/api/document", documentRoutes);
app.use("/api/notification", notificationRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/approval", approvalRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/report", reportRoutes);
app.use("/api/milestone", milestoneRoutes);
app.use("/api/watcher", watcherRoutes);

// Error Handling Middleware
app.use(errorMiddleware);

module.exports = app;