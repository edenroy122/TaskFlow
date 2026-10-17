require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const connectdb = require('./src/db/db');
const { initSocket } = require('./src/utils/socket');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// Ensure upload directories exist
const projectsUploadDir = path.join(process.cwd(), 'uploads', 'projects');
const tasksUploadDir = path.join(process.cwd(), 'uploads', 'tasks');
const profileUploadDir = path.join(process.cwd(), 'uploads', 'profile-images');
if (!fs.existsSync(projectsUploadDir)) fs.mkdirSync(projectsUploadDir, { recursive: true });
if (!fs.existsSync(tasksUploadDir)) fs.mkdirSync(tasksUploadDir, { recursive: true });
if (!fs.existsSync(profileUploadDir)) fs.mkdirSync(profileUploadDir, { recursive: true });

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const rawClientUrl = process.env.CLIENT_URL || "http://localhost:5173";
const allowedOrigins = rawClientUrl.split(',').map(url => url.trim().replace(/\/$/, ''));

const io = new Server(server, {
    cors: {
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
    }
});

initSocket(io);

// Connect DB and start server
connectdb().then(() => {
    server.listen(PORT, () => {
        console.log(`Server & Socket.IO running on port ${PORT}`);
    });
}).catch((err) => {
    console.error("DB Connection Failed:", err);
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT} (DB Connection Pending)`);
    });
});