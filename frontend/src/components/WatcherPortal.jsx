import React, { useState, useEffect } from "react";
import { api } from "../api";
import {
  IconFolder,
  IconSparkles,
  IconCheck,
  IconEye,
  IconSearch,
  IconFile,
  IconBell,
  IconLayers
} from "./Icons";

export function WatcherPortal({ user, onLogout, workspaces = [], currentWorkspaceItem, onSelectWorkspace }) {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [updatesData, setUpdatesData] = useState([]);
  const [tasksData, setTasksData] = useState([]);
  const [milestonesData, setMilestonesData] = useState([]);
  const [documentsData, setDocumentsData] = useState([]);

  const [activeTab, setActiveTab] = useState("dashboard"); // "dashboard" | "updates" | "milestones" | "tasks" | "documents"
  const [updateCategory, setUpdateCategory] = useState("all");

  // Task Filters
  const [taskSearch, setTaskSearch] = useState("");
  const [taskStatusFilter, setTaskStatusFilter] = useState("All");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState("All");

  const [loading, setLoading] = useState(true);

  // Load Watcher Projects
  const loadProjects = async () => {
    setLoading(true);
    try {
      const wsId = currentWorkspaceItem?.workspace?._id;
      const res = await api.getWatcherProjects(wsId);
      const projList = res.projects || [];
      setProjects(projList);

      if (projList.length > 0) {
        if (!selectedProjectId || !projList.some((p) => p._id === selectedProjectId)) {
          setSelectedProjectId(projList[0]._id);
        }
      } else {
        setSelectedProjectId(null);
      }
    } catch (err) {
      console.error("Watcher loadProjects error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [currentWorkspaceItem?.workspace?._id]);

  // Load Project-specific data when selected project or active tab changes
  const loadProjectData = async () => {
    if (!selectedProjectId) return;
    try {
      if (activeTab === "overview" || activeTab === "dashboard") {
        const res = await api.getWatcherProjectDashboard(selectedProjectId);
        setDashboardData(res);
      } else if (activeTab === "updates") {
        const res = await api.getWatcherUpdates(selectedProjectId, updateCategory);
        setUpdatesData(res.updates || []);
      } else if (activeTab === "tasks") {
        const res = await api.getWatcherTasks(selectedProjectId);
        setTasksData(res.tasks || []);
      } else if (activeTab === "milestones") {
        const res = await api.getWatcherMilestones(selectedProjectId);
        setMilestonesData(res.milestones || []);
      } else if (activeTab === "documents") {
        const res = await api.getWatcherDocuments(selectedProjectId);
        setDocumentsData(res.documents || []);
      }
    } catch (err) {
      console.error("Watcher loadProjectData error:", err);
    }
  };

  useEffect(() => {
    loadProjectData();
  }, [selectedProjectId, activeTab, updateCategory]);

  const currentProjectSummary = projects.find((p) => p._id === selectedProjectId);

  // Filter Tasks
  const filteredTasks = tasksData.filter((t) => {
    const matchesSearch =
      t.title?.toLowerCase().includes(taskSearch.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(taskSearch.toLowerCase()));
    const matchesStatus =
      taskStatusFilter === "All" ||
      t.status?.toLowerCase() === taskStatusFilter.toLowerCase() ||
      (taskStatusFilter === "In Review" && t.status === "Review") ||
      (taskStatusFilter === "New Task" && (t.status === "Todo" || t.status === "To Do" || t.status === "New Task"));
    const matchesPriority =
      taskPriorityFilter === "All" || t.priority?.toLowerCase() === taskPriorityFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="watcher-portal-layout flex background-canvas min-h-screen">
      <div className="flex flex-1 w-full min-h-full">
        {/* Client Portal Sidebar matching standard project sidebar styling */}
        <aside className="sidebar">
          <div className="sidebar-section">
            <div className="workspace-card-info">
              <div className="ws-icon">
                <IconLayers size={20} />
              </div>
              <div className="truncate">
                <h3 className="ws-title truncate">{currentWorkspaceItem?.space?.name || currentWorkspaceItem?.workspace?.name || "Space"}</h3>
                <span className="badge badge-accent">Watcher</span>
              </div>
            </div>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-label">Navigation</div>

            <button
              className={`nav-link ${activeTab === "overview" || activeTab === "dashboard" ? "active" : ""}`}
              onClick={() => setActiveTab("dashboard")}
            >
              <IconFolder size={18} />
              <span>Project Dashboard</span>
            </button>

            <button
              className={`nav-link ${activeTab === "updates" ? "active" : ""}`}
              onClick={() => setActiveTab("updates")}
            >
              <IconBell size={18} />
              <span>Updates</span>
            </button>

            <button
              className={`nav-link ${activeTab === "milestones" ? "active" : ""}`}
              onClick={() => setActiveTab("milestones")}
            >
              <IconSparkles size={18} />
              <span>Milestones</span>
            </button>

            <button
              className={`nav-link ${activeTab === "tasks" ? "active" : ""}`}
              onClick={() => setActiveTab("tasks")}
            >
              <IconCheck size={18} />
              <span>Tasks</span>
            </button>

            <button
              className={`nav-link ${activeTab === "documents" ? "active" : ""}`}
              onClick={() => setActiveTab("documents")}
            >
              <IconFile size={18} />
              <span>Documents</span>
            </button>
          </nav>
        </aside>

        {/* Main Content View */}
        <main className="watcher-main-content flex-1 padding-5">
          {/* Project Selection Dropdown Header */}
          {projects.length > 0 && (
            <div className="card padding-3 margin-bottom-4 flex justify-between items-center flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-dark text-sm">Select Project:</span>
                <select
                  className="form-control max-w-sm font-semibold"
                  value={selectedProjectId || ""}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                >
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {loading ? (
            <div className="loading-state text-center padding-5">Loading client portal...</div>
          ) : projects.length === 0 ? (
            <div className="empty-state card padding-5 text-center margin-x-auto max-w-md">
              <IconEye size={48} className="text-muted margin-bottom-3 margin-x-auto" />
              <h3>No Client Projects Found</h3>
              <p className="text-secondary text-sm margin-top-2">
                You are not currently assigned as a Watcher or Client to any active project.
              </p>
            </div>
          ) : (
            <>
              {/* TAB 1 & 2: DASHBOARD / OVERVIEW */}
              {(activeTab === "dashboard" || activeTab === "overview") && dashboardData && (
                <div className="dashboard-container flex flex-col gap-4">
                  {/* Project Completion Experience Celebration Banner */}
                  {dashboardData.project?.isCompleted && (
                    <div className="completion-celebration-card card padding-5 bg-gradient-success text-center border-success">
                      <div className="text-4xl margin-bottom-2">🎉</div>
                      <h2 className="text-2xl font-bold text-dark">PROJECT COMPLETED</h2>
                      <p className="text-dark font-semibold text-base margin-top-1">
                        {dashboardData.project?.name}
                      </p>
                      <div className="flex justify-center items-center gap-4 margin-top-3">
                        <span className="text-sm font-medium text-dark">
                          {dashboardData.metrics?.completedTasks} Tasks Completed
                        </span>
                        <span className="text-sm font-medium text-dark">
                          {dashboardData.metrics?.completedMilestones} Milestones Completed
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Top Project Summary Banner */}
                  <div className="card padding-4">
                    <div className="flex justify-between items-start flex-wrap gap-3">
                      <div>
                        <h2 className="text-2xl font-bold text-dark">{dashboardData.project?.name}</h2>
                        <p className="text-secondary text-sm margin-top-1">
                          Project Manager: <strong>{dashboardData.project?.manager?.name || "Unassigned"}</strong>
                        </p>
                        <p className="text-secondary text-xs margin-top-1">
                          Expected Completion:{" "}
                          <strong>
                            {dashboardData.project?.dueDate
                              ? new Date(dashboardData.project.dueDate).toLocaleDateString()
                              : "No Target Date"}
                          </strong>
                        </p>
                      </div>
                    </div>

                    {/* 3 Metric Cards */}
                    <div className="grid-3 gap-3 margin-top-4">
                      <div className="milestone-stat-card border-success-light">
                        <div className="stat-label">Completed Tasks</div>
                        <div className="stat-value text-success">{dashboardData.metrics?.completedTasks}</div>
                      </div>

                      <div className="milestone-stat-card border-secondary-light">
                        <div className="stat-label">Remaining Tasks</div>
                        <div className="stat-value text-dark">{dashboardData.metrics?.remainingTasks}</div>
                      </div>

                      <div className="milestone-stat-card border-secondary-light">
                        <div className="stat-label">Overdue / Blocked</div>
                        <div className="stat-value text-danger">
                          {dashboardData.metrics?.overdueTasks + dashboardData.metrics?.blockedTasks}
                        </div>
                      </div>
                    </div>
                  </div>



                  {/* Milestones Summary & Recent Updates Section */}
                  <div className="grid-2 gap-4">
                    {/* Milestones Summary Card */}
                    <div className="card padding-4 flex flex-col">
                      <h4 className="font-semibold text-dark text-base margin-bottom-3">Milestones Summary</h4>
                      <div className="milestones-summary-list flex flex-col gap-3 padding-right-1" style={{ maxHeight: "340px", overflowY: "auto" }}>
                        {dashboardData.milestonesSummary?.length === 0 ? (
                          <p className="text-secondary text-xs">No milestones defined yet.</p>
                        ) : (
                          dashboardData.milestonesSummary?.map((m) => (
                            <div key={m._id} className="border rounded padding-3 bg-light-subtle flex flex-col gap-1">
                              <div className="flex justify-between items-center flex-wrap gap-2">
                                <span className="font-semibold text-dark text-sm">{m.title}</span>
                                <span className={`badge ${m.status === "Completed" ? "badge-success" : m.status === "In Progress" ? "badge-accent" : "badge-secondary"}`}>
                                  {m.status}
                                </span>
                              </div>
                              {m.description && (
                                <p className="text-secondary text-xs margin-y-1">{m.description}</p>
                              )}
                              <div className="text-xs text-muted">
                                Target Due Date: <strong>{m.dueDate ? new Date(m.dueDate).toLocaleDateString() : "No Due Date"}</strong>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Recent Updates Feed */}
                    <div className="card padding-4 flex flex-col">
                      <h4 className="font-semibold text-dark text-base margin-bottom-3">Recent Updates</h4>
                      <div className="recent-updates-feed flex flex-col gap-2 padding-right-1" style={{ maxHeight: "340px", overflowY: "auto" }}>
                        {dashboardData.recentUpdates?.length === 0 ? (
                          <p className="text-secondary text-xs">No recent activity recorded.</p>
                        ) : (
                          dashboardData.recentUpdates?.map((act) => (
                            <div key={act._id} className="update-feed-item flex justify-between items-center border-b padding-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-dark">{act.user}:</span>
                                <span className="text-secondary">{act.description}</span>
                              </div>
                              <span className="text-xs text-muted">
                                {new Date(act.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: UPDATES PAGE */}
              {activeTab === "updates" && (
                <div className="updates-container card padding-4">
                  <div className="margin-bottom-3">
                    <h3>Project Updates Feed</h3>
                    <p className="subtitle">Everything important that happened in your project</p>
                  </div>

                  <div className="btn-group margin-bottom-4">
                    {["all", "tasks", "milestones", "project", "documents"].map((cat) => (
                      <button
                        key={cat}
                        className={`btn-tab ${updateCategory === cat ? "active" : ""}`}
                        onClick={() => setUpdateCategory(cat)}
                      >
                        {cat.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  <div className="updates-timeline flex flex-col gap-3 padding-right-1" style={{ maxHeight: "480px", overflowY: "auto" }}>
                    {updatesData.length === 0 ? (
                      <p className="text-secondary text-sm">No updates recorded for this category.</p>
                    ) : (
                      updatesData.map((up) => (
                        <div key={up._id} className="timeline-card border-l-4 border-primary padding-3 bg-light rounded shadow-xs">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-dark text-sm">{up.action.replace(/_/g, " ")}</span>
                            <span className="text-xs text-muted">{new Date(up.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-secondary text-sm margin-top-1">{up.description}</p>
                          <div className="text-xs text-muted margin-top-1">By: {up.user?.name || "System"}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: MILESTONES PAGE */}
              {activeTab === "milestones" && (
                <div className="milestones-container card padding-4">
                  <h3 className="margin-bottom-3">Project Milestones</h3>
                  <div className="table-responsive">
                    <table className="projects-table">
                      <thead>
                        <tr>
                          <th>Milestone Name</th>
                          <th>Status</th>
                          <th>Target Due Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {milestonesData.length === 0 ? (
                          <tr>
                            <td colSpan="3" className="text-center text-secondary padding-4">No milestones defined.</td>
                          </tr>
                        ) : (
                          milestonesData.map((m) => (
                            <tr key={m._id}>
                              <td className="font-semibold text-dark">{m.title}</td>
                              <td>
                                <span className={`badge ${m.status === "Completed" ? "badge-success" : m.status === "In Progress" ? "badge-accent" : "badge-secondary"}`}>
                                  {m.status}
                                </span>
                              </td>
                              <td className="text-secondary text-sm">
                                {m.dueDate ? new Date(m.dueDate).toLocaleDateString() : "No Due Date"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 5: TASKS PAGE */}
              {activeTab === "tasks" && (
                <div className="tasks-container card padding-4">
                  <div className="margin-bottom-3">
                    <h3>Project Tasks</h3>
                    <p className="subtitle">View project tasks, assignees, priorities, and dependencies</p>
                  </div>

                  {/* Task Filters Bar */}
                  <div className="flex flex-wrap gap-3 margin-bottom-4">
                    <input
                      type="text"
                      className="form-control flex-1"
                      placeholder="Search tasks..."
                      value={taskSearch}
                      onChange={(e) => setTaskSearch(e.target.value)}
                    />
                    <select
                      className="form-control select-compact filter-select-status"
                      value={taskStatusFilter}
                      onChange={(e) => setTaskStatusFilter(e.target.value)}
                    >
                      <option value="All">All Statuses</option>
                      <option value="New Task">New Task</option>
                      <option value="In Progress">In Progress</option>
                      <option value="In Review">In Review</option>
                      <option value="Completed">Completed</option>
                      <option value="Hold">Hold</option>
                    </select>
                    <select
                      className="form-control select-compact filter-select-priority"
                      value={taskPriorityFilter}
                      onChange={(e) => setTaskPriorityFilter(e.target.value)}
                    >
                      <option value="All">All Priorities</option>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>

                  <div className="table-responsive">
                    <table className="projects-table">
                      <thead>
                        <tr>
                          <th>Task Title</th>
                          <th>Assignee</th>
                          <th>Priority</th>
                          <th>Status</th>
                          <th>Due Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTasks.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="text-center text-secondary padding-4">No tasks found.</td>
                          </tr>
                        ) : (
                          filteredTasks.map((t) => (
                            <tr key={t._id}>
                              <td className="font-semibold text-dark">{t.title}</td>
                              <td>
                                {Array.isArray(t.assignedTo) && t.assignedTo.length > 0
                                  ? t.assignedTo.map((u) => u.name || u.email).join(", ")
                                  : (t.assignedTo?.name || "Unassigned")}
                              </td>
                              <td>
                                <span className={`badge ${t.priority === "Urgent" ? "badge-danger" : t.priority === "High" ? "badge-warning" : "badge-primary"}`}>
                                  {t.priority}
                                </span>
                              </td>
                              <td>
                                <span className={`badge ${t.status === "Completed" ? "badge-success" : (t.status === "Hold" || t.status === "Blocked") ? "badge-danger" : "badge-secondary"}`}>
                                  {t.status}
                                </span>
                              </td>
                              <td className="text-secondary text-sm">
                                {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "No Date"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 6: DOCUMENTS PAGE */}
              {activeTab === "documents" && (
                <div className="documents-container card padding-4">
                  <h3 className="margin-bottom-3">Project Documents</h3>
                  <div className="documents-list flex flex-col gap-2">
                    {documentsData.length === 0 ? (
                      <p className="text-secondary text-sm">No project documents uploaded yet.</p>
                    ) : (
                      documentsData.map((doc) => (
                        <div key={doc._id} className="document-item border rounded padding-3 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <IconFile size={24} className="text-primary" />
                            <div>
                              <div className="font-semibold text-dark text-sm">{doc.originalName || doc.name}</div>
                              <div className="text-xs text-secondary">
                                Uploaded by {doc.uploadedBy?.name || "User"} on {new Date(doc.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <a
                            href={api.getDownloadUrl(doc._id)}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-secondary btn-sm"
                          >
                            View / Download 📄
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}


            </>
          )}
        </main>
      </div>
    </div>
  );
}
