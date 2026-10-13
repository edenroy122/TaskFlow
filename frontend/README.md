

# Project Management System

A full-stack project management application built with React and Vite on the frontend, and Node.js, Express, and MongoDB on the backend. It includes workspace management, invitations, projects, tasks, milestones, comments, watchers, notifications, activity tracking, approvals, dashboards, reports, and document-related APIs.

> **Repository layout:** this README is written for the folders and scripts found in this repository archive.

## Technology Stack

- **Frontend:** React 19, Vite, JavaScript, Socket.IO Client
- **Backend:** Node.js, Express 5, Socket.IO
- **Database:** MongoDB using Mongoose
- **Authentication/security:** JWT, bcryptjs, Helmet, express-rate-limit, CORS
- **Other backend libraries:** cookie-parser, Multer, Nodemailer

## Prerequisites

Install:

- Node.js (an LTS release compatible with the installed Vite version)
- npm
- MongoDB locally or a MongoDB Atlas database
- Git

## Backend dependencies

Defined in `backend/package.json`:

- `bcryptjs`
- `cookie-parser`
- `cors`
- `dotenv`
- `express`
- `express-rate-limit`
- `helmet`
- `jsonwebtoken`
- `mongoose`
- `multer`
- `socket.io`


Check the installations:

```bash
node --version
npm --version
git --version
```

## Project Structure

```text
Project_Management_system-main/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── db/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   └── utils/
│   ├── uploads/              # Created by the server for project/task uploads
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Run Locally

Open **two terminals** from the repository root.

### 1. Configure the backend

```bash
cd backend
npm install
```

<!-- Create `backend/.env` and set the variables used by this codebase:

```env
PORT=3000
CLIENT_URL=http://localhost:5173
MONGOOSE=mongodb://127.0.0.1:27017/project_management_system
JWT_SECRET=replace_with_a_long_random_secret
``` -->

space passkey functionality reads `SPACE_PASSKEY` and/or `PASSKEY` in the backend. Configure the variable expected by the relevant controller if you use that feature.

**Important:** The database connection variable in the current source is named `MONGOOSE` (not `MONGODB_URI`). Keep the name aligned with `backend/src/db/db.js`, or update the source and this README together. Use your own values; never commit real secrets.

Start the backend from the `backend` directory:

```bash
node server.js
```

The server uses port `3000` by default and creates `uploads/projects` and `uploads/tasks` directories when it starts. Keep this terminal open.

> The current `backend/package.json` does not define `start` or `dev` scripts, so `node server.js` is the verified start command. You can add scripts later if desired.

### 2. Install and start the frontend

In the second terminal, from the repository root:

```bash
cd frontend
npm install
npm run dev
```

Vite is configured to use port `5173`. Open:

**http://localhost:5173**

The Vite development server proxies `/api` requests to `http://localhost:3000`.

## Environment Variables

| Variable | Used by | Purpose |
|---|---|---|
| `PORT` | Backend | HTTP server port; defaults to `3000` |
| `CLIENT_URL` | Backend | Allowed frontend origin for CORS and Socket.IO |
| `MONGOOSE` | Backend | MongoDB connection string |
| `JWT_SECRET` | Backend | Signs/verifies authentication tokens |
| `SPACE_PASSKEY` / `PASSKEY` | Backend | space passkey logic |
Use a strong random JWT secret in every environment. Email/SMTP configuration is not required for this project as currently used.

## Build and Check the Frontend

From `frontend/`:

```bash
npm run build
```

Vite generates the production frontend in `frontend/dist/`.

Preview the generated build locally:

```bash
npm run preview
```

Optional lint check:

```bash
npm run lint
```

The `preview` command is intended for local verification, not as a production web server.

## Deploy to Production

The application can be deployed as a separate frontend and backend, with MongoDB hosted separately. The steps below are platform-neutral; adapt them to your chosen host.

### 1. Prepare the backend

1. Deploy the `backend` directory as a Node.js service.
2. Install dependencies with `npm install`.
3. Set the start command to `node server.js` (the repository currently has no backend start script).
4. Configure production environment variables, especially `PORT`, `CLIENT_URL`, `MONGOOSE`, and `JWT_SECRET`; configure SMTP/passkey variables if required.
5. Ensure the host supports WebSockets/Socket.IO if real-time updates are used.
6. Verify the service logs show that MongoDB connects successfully.

### 2. Prepare the frontend

The current frontend API helper in `frontend/src/api.js` hardcodes:

```js
const API_BASE = "http://localhost:3000/api";
```

That address works only when the browser can reach your local backend. **Before deployment, change this to your deployed backend URL**, preferably read from a Vite environment variable, for example:

```js
const API_BASE = `${import.meta.env.VITE_API_URL}/api`;
```

Then create `frontend/.env.production` (or configure the variable in your hosting dashboard):

```env
VITE_API_URL=https://your-backend-domain.example
```

Replace the example domain with your real backend URL. Do not include `/api` in `VITE_API_URL` when using the code example above. Rebuild after changing frontend environment variables.

Deploy the frontend using:

- **Root/build directory:** `frontend`
- **Build command:** `npm run build`
- **Output directory:** `dist`

### 3. Configure the database and cross-origin access

1. Create a MongoDB database, for example with MongoDB Atlas.
2. Set `MONGOOSE` to the database connection string in the backend environment.
3. Configure `CLIENT_URL` to the deployed frontend's exact origin (scheme and hostname, without an API path).
4. Make sure the database network rules allow the backend to connect securely.
5. Use HTTPS for both frontend and backend.
6. Test login, API requests, Socket.IO updates, and email functionality after deployment.

### 4. Persistent file uploads

The backend stores uploaded project/task files in local `backend/uploads/` directories. Some hosting platforms use temporary filesystems that can be cleared on restart or redeploy. For production, use persistent disk storage or object storage and configure backups/access controls. Do not assume uploaded files will persist on an ephemeral host.

## API Modules

The Express application mounts these API prefixes:

- `/api/auth`
- `/api/space` and `/api/workspace`
- `/api/space_invitation` and `/api/workspace_invitation`
- `/api/project`
- `/api/task`
- `/api/projectmember`
- `/api/task-watcher`
- `/api/comment`
- `/api/document`
- `/api/notification`
- `/api/activity`
- `/api/approval`
- `/api/dashboard`
- `/api/search`
- `/api/report`
- `/api/milestone`
- `/api/watcher`

See the route files in `backend/src/routes/` for endpoint details and required request data.

## Troubleshooting

### MongoDB connection does not work

- Confirm MongoDB is running or the Atlas cluster is reachable.
- Check the `MONGOOSE` connection string and credentials.
- Check Atlas network access and backend logs.

### Frontend API calls fail

- Confirm the backend is running on port `3000`.
- Confirm the frontend is at `http://localhost:5173`.
- Ensure Vite's proxy configuration still targets `http://localhost:3000`.
- In production, replace the hardcoded localhost API base in `frontend/src/api.js` and configure backend `CLIENT_URL`.

### Real-time updates do not work

- Confirm the deployed host supports WebSockets/Socket.IO.
- Check `CLIENT_URL` and browser console/network logs.

