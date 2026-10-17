const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace(/\/+$/, "");

const getHeaders = (isFormData = false) => {
  const token = localStorage.getItem("token");
  const headers = {};
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

// Helper logger and fetch wrapper
const customFetch = async (url, options = {}) => {
  console.log(`🚀 [API CALL]: ${options.method || "GET"} ${url}`);
  const res = await fetch(url, options);
  return handleResponse(res);
};

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) {
    console.error(`❌ [API ERROR ${res.status}]:`, data.message || "An error occurred");
    throw new Error(data.message || "An error occurred");
  }
  return data;
};

export const api = {
  // Auth
  login: async (email, password) => {
    return customFetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  },

  register: async (name, email, password) => {
    return customFetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
  },

  // Spaces
  getMySpaces: async () => {
    return customFetch(`${API_BASE}/space/myspaces`, {
      headers: getHeaders(),
    });
  },

  getMyWorkspaces: async () => {
    return customFetch(`${API_BASE}/space/myspaces`, {
      headers: getHeaders(),
    });
  },

  createSpace: async (name, description, passkey) => {
    return customFetch(`${API_BASE}/space/createspace`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ name, description, passkey }),
    });
  },

  createWorkspace: async (name, description, passkey) => {
    return customFetch(`${API_BASE}/space/createspace`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ name, description, passkey }),
    });
  },

  getSpaceMembers: async (spaceId) => {
    return customFetch(`${API_BASE}/space/${spaceId}/members`, {
      headers: getHeaders(),
    });
  },

  getWorkspaceMembers: async (spaceId) => {
    return customFetch(`${API_BASE}/space/${spaceId}/members`, {
      headers: getHeaders(),
    });
  },

  updateSpaceMember: async (spaceId, userId, permissionRole, jobRole) => {
    return customFetch(`${API_BASE}/space/${spaceId}/members/${userId}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ permissionRole, jobRole }),
    });
  },

  updateWorkspaceMember: async (spaceId, userId, permissionRole, jobRole) => {
    return customFetch(`${API_BASE}/space/${spaceId}/members/${userId}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ permissionRole, jobRole }),
    });
  },

  removeSpaceMember: async (spaceId, userId) => {
    return customFetch(`${API_BASE}/space/${spaceId}/members/${userId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
  },

  removeWorkspaceMember: async (spaceId, userId) => {
    return customFetch(`${API_BASE}/space/${spaceId}/members/${userId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
  },

  // Space Invitations
  inviteUser: async (spaceId, email, permissionRole, jobRole) => {
    return customFetch(`${API_BASE}/space_invitation/${spaceId}/invite`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ email, permissionRole, jobRole }),
    });
  },

  getMyInvitations: async () => {
    return customFetch(`${API_BASE}/space_invitation/myinvitations`, {
      headers: getHeaders(),
    });
  },

  acceptInvitation: async (invitationId) => {
    return customFetch(`${API_BASE}/space_invitation/${invitationId}/accept`, {
      method: "PUT",
      headers: getHeaders(),
    });
  },

  rejectInvitation: async (invitationId) => {
    return customFetch(`${API_BASE}/space_invitation/${invitationId}/reject`, {
      method: "PUT",
      headers: getHeaders(),
    });
  },

  // Projects
  getProjects: async (spaceId, page = 1) => {
    return customFetch(`${API_BASE}/project/space/${spaceId}?page=${page}`, {
      headers: getHeaders(),
    });
  },

  getArchivedProjects: async (spaceId, page = 1) => {
    return customFetch(`${API_BASE}/project/space/${spaceId}/archived?page=${page}`, {
      headers: getHeaders(),
    });
  },

  createProject: async (spaceId, projectData) => {
    return customFetch(`${API_BASE}/project/space/${spaceId}`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(projectData),
    });
  },

  getProjectDetails: async (projectId) => {
    return customFetch(`${API_BASE}/project/${projectId}`, {
      headers: getHeaders(),
    });
  },

  updateProject: async (projectId, projectData) => {
    return customFetch(`${API_BASE}/project/${projectId}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(projectData),
    });
  },

  archiveProject: async (projectId) => {
    return customFetch(`${API_BASE}/project/${projectId}/archive`, {
      method: "PUT",
      headers: getHeaders(),
    });
  },

  restoreProject: async (projectId) => {
    return customFetch(`${API_BASE}/project/${projectId}/restore`, {
      method: "PUT",
      headers: getHeaders(),
    });
  },

  // Milestones
  getMilestones: async (projectId) => {
    return customFetch(`${API_BASE}/milestone/project/${projectId}`, {
      headers: getHeaders(),
    });
  },

  createMilestone: async (projectId, milestoneData) => {
    return customFetch(`${API_BASE}/milestone/project/${projectId}`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(milestoneData),
    });
  },

  updateMilestone: async (milestoneId, milestoneData) => {
    return customFetch(`${API_BASE}/milestone/${milestoneId}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(milestoneData),
    });
  },

  deleteMilestone: async (milestoneId) => {
    return customFetch(`${API_BASE}/milestone/${milestoneId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
  },

  // Project Members
  getProjectMembers: async (projectId) => {
    return customFetch(`${API_BASE}/projectmember/project/${projectId}`, {
      headers: getHeaders(),
    });
  },

  addProjectMember: async (projectId, userId, role) => {
    return customFetch(`${API_BASE}/projectmember/project/${projectId}`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ userId, role }),
    });
  },

  updateProjectMember: async (projectId, userId, role) => {
    return customFetch(`${API_BASE}/projectmember/project/${projectId}/user/${userId}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ role }),
    });
  },

  removeProjectMember: async (projectId, userId) => {
    return customFetch(`${API_BASE}/projectmember/project/${projectId}/user/${userId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
  },

  // Tasks
  getTasks: async (projectId, page = 1) => {
    return customFetch(`${API_BASE}/task/project/${projectId}?page=${page}`, {
      headers: getHeaders(),
    });
  },

  getTaskDetails: async (taskId) => {
    return customFetch(`${API_BASE}/task/${taskId}`, {
      headers: getHeaders(),
    });
  },

  createTask: async (projectId, taskData) => {
    return customFetch(`${API_BASE}/task/project/${projectId}`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(taskData),
    });
  },

  updateTask: async (taskId, taskData) => {
    return customFetch(`${API_BASE}/task/${taskId}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(taskData),
    });
  },

  updateTaskStatus: async (taskId, status) => {
    return customFetch(`${API_BASE}/task/${taskId}/status`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    });
  },

  archiveTask: async (taskId) => {
    return customFetch(`${API_BASE}/task/${taskId}/archive`, {
      method: "PUT",
      headers: getHeaders(),
    });
  },

  restoreTask: async (taskId) => {
    return customFetch(`${API_BASE}/task/${taskId}/restore`, {
      method: "PUT",
      headers: getHeaders(),
    });
  },

  deleteTask: async (taskId) => {
    return customFetch(`${API_BASE}/task/${taskId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
  },

  // Task Watchers
  getTaskWatchers: async (taskId) => {
    return customFetch(`${API_BASE}/task-watcher/task/${taskId}`, {
      headers: getHeaders(),
    });
  },

  addWatcher: async (taskId, userId) => {
    return customFetch(`${API_BASE}/task-watcher/task/${taskId}`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ userId }),
    });
  },

  removeWatcher: async (taskId, userId) => {
    return customFetch(`${API_BASE}/task-watcher/task/${taskId}/user/${userId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
  },

  // Documents
  uploadProjectDocument: async (projectId, formData) => {
    return customFetch(`${API_BASE}/document/project/${projectId}`, {
      method: "POST",
      headers: getHeaders(true),
      body: formData,
    });
  },

  uploadTaskDocument: async (taskId, formData) => {
    return customFetch(`${API_BASE}/document/task/${taskId}`, {
      method: "POST",
      headers: getHeaders(true),
      body: formData,
    });
  },

  getProjectDocuments: async (projectId, page = 1) => {
    return customFetch(`${API_BASE}/document/project/${projectId}?page=${page}`, {
      headers: getHeaders(),
    });
  },

  getTaskDocuments: async (taskId, page = 1) => {
    return customFetch(`${API_BASE}/document/task/${taskId}?page=${page}`, {
      headers: getHeaders(),
    });
  },

  deleteDocument: async (documentId) => {
    return customFetch(`${API_BASE}/document/${documentId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
  },

  getDownloadUrl: (documentId) => {
    const token = localStorage.getItem("token");
    return `${API_BASE}/document/${documentId}/download?token=${token || ""}`;
  },

  // Comments
  addProjectComment: async (projectId, text) => {
    return customFetch(`${API_BASE}/comment/project/${projectId}`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ text }),
    });
  },

  addTaskComment: async (taskId, text) => {
    return customFetch(`${API_BASE}/comment/task/${taskId}`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ text }),
    });
  },

  getProjectComments: async (projectId, page = 1, limit = 0) => {
    return customFetch(`${API_BASE}/comment/project/${projectId}?page=${page}&limit=${limit}`, {
      headers: getHeaders(),
    });
  },

  getTaskComments: async (taskId, page = 1, limit = 0) => {
    return customFetch(`${API_BASE}/comment/task/${taskId}?page=${page}&limit=${limit}`, {
      headers: getHeaders(),
    });
  },

  deleteComment: async (commentId) => {
    return customFetch(`${API_BASE}/comment/${commentId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
  },

  // Notifications
  getNotifications: async (page = 1) => {
    return customFetch(`${API_BASE}/notification?page=${page}`, {
      headers: getHeaders(),
    });
  },

  getUnreadNotifications: async () => {
    return customFetch(`${API_BASE}/notification/unread`, {
      headers: getHeaders(),
    });
  },

  markNotificationAsRead: async (notificationId) => {
    return customFetch(`${API_BASE}/notification/${notificationId}/read`, {
      method: "PUT",
      headers: getHeaders(),
    });
  },

  markAllNotificationsAsRead: async () => {
    return customFetch(`${API_BASE}/notification/read-all`, {
      method: "PUT",
      headers: getHeaders(),
    });
  },

  deleteNotification: async (notificationId) => {
    return customFetch(`${API_BASE}/notification/${notificationId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
  },

  // Activity Log
  getProjectActivities: async (projectId, page = 1, limit = 0) => {
    return customFetch(`${API_BASE}/activity/project/${projectId}?page=${page}&limit=${limit}`, {
      headers: getHeaders(),
    });
  },

  getTaskActivities: async (taskId, page = 1, limit = 0) => {
    return customFetch(`${API_BASE}/activity/task/${taskId}?page=${page}&limit=${limit}`, {
      headers: getHeaders(),
    });
  },

  // Approvals
  requestTaskApproval: async (taskId, comment) => {
    return customFetch(`${API_BASE}/approval/task/${taskId}/approval`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ comment }),
    });
  },

  getTaskApprovals: async (taskId) => {
    return customFetch(`${API_BASE}/approval/task/${taskId}/approval`, {
      headers: getHeaders(),
    });
  },

  respondToTaskApproval: async (taskId, approvalId, status, comment) => {
    return customFetch(`${API_BASE}/approval/task/${taskId}/approval/${approvalId}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ status, comment }),
    });
  },

  // Dashboards
  getProjectDashboard: async (projectId) => {
    return customFetch(`${API_BASE}/dashboard/project/${projectId}`, {
      headers: getHeaders(),
    });
  },

  getUserWorkload: async (userId) => {
    return customFetch(`${API_BASE}/dashboard/user/${userId}/workload`, {
      headers: getHeaders(),
    });
  },

  getSpaceDashboard: async (spaceId) => {
    return customFetch(`${API_BASE}/dashboard/space/${spaceId}`, {
      headers: getHeaders(),
    });
  },

  getWorkspaceDashboard: async (spaceId) => {
    return customFetch(`${API_BASE}/dashboard/space/${spaceId}`, {
      headers: getHeaders(),
    });
  },

  // Search & Reports
  globalSearch: async (spaceId, q) => {
    const query = new URLSearchParams();
    if (spaceId) query.append("spaceId", spaceId);
    if (q) query.append("q", q);

    return customFetch(`${API_BASE}/search?${query.toString()}`, {
      headers: getHeaders(),
    });
  },

  getProjectReport: async (projectId) => {
    return customFetch(`${API_BASE}/report/project/${projectId}`, {
      headers: getHeaders(),
    });
  },

  getSpaceReport: async (spaceId) => {
    return customFetch(`${API_BASE}/report/space/${spaceId}`, {
      headers: getHeaders(),
    });
  },

  getWorkspaceReport: async (spaceId) => {
    return customFetch(`${API_BASE}/report/space/${spaceId}`, {
      headers: getHeaders(),
    });
  },

  // Watcher / Client Portal APIs
  getWatcherProjects: async (spaceId) => {
    const url = spaceId ? `${API_BASE}/watcher/projects?spaceId=${spaceId}` : `${API_BASE}/watcher/projects`;
    return customFetch(url, { headers: getHeaders() });
  },

  getWatcherProjectDashboard: async (projectId) => {
    return customFetch(`${API_BASE}/watcher/project/${projectId}/dashboard`, { headers: getHeaders() });
  },

  getWatcherUpdates: async (projectId, category = "all") => {
    return customFetch(`${API_BASE}/watcher/project/${projectId}/updates?category=${category}`, { headers: getHeaders() });
  },

  getWatcherReport: async (projectId) => {
    return customFetch(`${API_BASE}/watcher/project/${projectId}/report`, { headers: getHeaders() });
  },

  getWatcherTasks: async (projectId) => {
    return customFetch(`${API_BASE}/watcher/project/${projectId}/tasks`, { headers: getHeaders() });
  },

  getWatcherMilestones: async (projectId) => {
    return customFetch(`${API_BASE}/watcher/project/${projectId}/milestones`, { headers: getHeaders() });
  },

  getWatcherDocuments: async (projectId) => {
    return customFetch(`${API_BASE}/watcher/project/${projectId}/documents`, { headers: getHeaders() });
  },

  getWatcherNotifications: async () => {
    return customFetch(`${API_BASE}/watcher/notifications`, { headers: getHeaders() });
  },

  markWatcherNotificationRead: async (notificationId) => {
    return customFetch(`${API_BASE}/watcher/notifications/${notificationId}/read`, {
      method: "PUT",
      headers: getHeaders()
    });
  },

  markAllWatcherNotificationsRead: async () => {
    return customFetch(`${API_BASE}/watcher/notifications/read-all`, {
      method: "PUT",
      headers: getHeaders()
    });
  },
};
