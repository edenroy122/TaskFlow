import React, { useState, useEffect } from "react";
import { api } from "../api";
import { TaskModal } from "./TaskModal";
import { TaskDetailView } from "./TaskDetailView";
import { DocumentList } from "./DocumentList";
import { CommentSection } from "./CommentSection";
import { ActivityStream } from "./ActivityStream";
import { DashboardView } from "./DashboardView";
import {
  IconPlus,
  IconSearch,
  IconCalendar,
  IconArchive,
  IconRefresh,
  IconUsers,
  IconTrash,
  IconFolder,
  IconSparkles,
  IconFlag,
} from "./Icons";

const STATUSES = ["New Task", "In Progress", "Review", "Completed", "Hold"];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

const PRIORITY_COLORS = {
  Low: "badge-subtle",
  Medium: "badge-info",
  High: "badge-warning",
  Urgent: "badge-danger",
};

export const ProjectBoard = ({
  project,
  workspaceId,
  userRole,
  currentUserId,
  onProjectUpdated,
}) => {
  const [activeTab, setActiveTab] = useState("board"); // "board" | "dashboard" | "documents" | "comments" | "activity"
  const [tasks, setTasks] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState("All");

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);

  // Add project member form
  const [newMemberUserId, setNewMemberUserId] = useState("");
  const [workspaceMembersList, setWorkspaceMembersList] = useState([]);

  const isManagerOrAdmin =
    userRole === "Owner" ||
    userRole === "Admin" ||
    (project?.manager?._id || project?.manager) === currentUserId;

  const fetchProjectData = async (showLoading = false) => {
    if (!project?._id) return;
    if (showLoading) setLoading(true);
    try {
      const [tasksRes, membersRes, wsMembersRes, msRes] = await Promise.all([
        api.getTasks(project._id),
        api.getProjectMembers(project._id),
        api.getWorkspaceMembers(workspaceId),
        api.getMilestones(project._id).catch(() => ({ milestones: [] })),
      ]);
      setTasks(tasksRes.tasks || []);
      setProjectMembers(membersRes.members || []);
      setWorkspaceMembersList(wsMembersRes.members || []);
      setMilestones(msRes.milestones || []);
    } catch (err) {
      console.error(err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData(true);
    setActiveTab("board");
  }, [project?._id]);

  const handleStatusChange = async (taskId, newStatus) => {
    const prevTask = tasks.find((t) => t._id === taskId);
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
    );
    try {
      const res = await api.updateTaskStatus(taskId, newStatus);
      const updated = res?.task || res?.data;
      if (updated) {
        setTasks((prev) =>
          prev.map((t) => (t._id === taskId ? { ...t, ...updated } : t))
        );
      }
    } catch (err) {
      if (prevTask) {
        setTasks((prev) =>
          prev.map((t) => (t._id === taskId ? prevTask : t))
        );
      }
      alert(err.message || "Failed to update status");
    }
  };

  const handlePriorityChange = async (taskId, newPriority) => {
    const prevTask = tasks.find((t) => t._id === taskId);
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, priority: newPriority } : t))
    );
    try {
      const res = await api.updateTask(taskId, { priority: newPriority });
      const updated = res?.task || res?.data;
      if (updated) {
        setTasks((prev) =>
          prev.map((t) => (t._id === taskId ? { ...t, ...updated } : t))
        );
      }
    } catch (err) {
      if (prevTask) {
        setTasks((prev) =>
          prev.map((t) => (t._id === taskId ? prevTask : t))
        );
      }
      alert(err.message || "Failed to update priority");
    }
  };

  const handleArchiveRestore = async () => {
    try {
      if (project.isArchived) {
        await api.restoreProject(project._id);
      } else {
        if (!window.confirm("Archive this project?")) return;
        await api.archiveProject(project._id);
      }
      onProjectUpdated();
    } catch (err) {
      alert(err.message || "Action failed");
    }
  };

  const handleAddProjectMember = async (e) => {
    e.preventDefault();
    if (!newMemberUserId) return;
    try {
      const selectedWm = workspaceMembersList.find(
        (wm) => (wm.user._id || wm.user) === newMemberUserId
      );
      const roleToAssign = selectedWm?.permissionRole || "Member";
      await api.addProjectMember(project._id, newMemberUserId, roleToAssign);
      setNewMemberUserId("");
      fetchProjectData();
    } catch (err) {
      alert(err.message || "Failed to add project member");
    }
  };

  const handleRemoveProjectMember = async (userId) => {
    if (!window.confirm("Remove member from project?")) return;
    try {
      await api.removeProjectMember(project._id, userId);
      fetchProjectData();
    } catch (err) {
      alert(err.message || "Failed to remove member");
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPriority = filterPriority === "All" || t.priority === filterPriority;
    return matchesSearch && matchesPriority;
  });

  if (selectedTask) {
    return (
      <TaskDetailView
        task={selectedTask}
        projectId={project._id}
        projectMembers={projectMembers}
        allTasks={tasks}
        currentUserId={currentUserId}
        isManagerOrAdmin={isManagerOrAdmin}
        canManageTask={isManagerOrAdmin}
        onTaskUpdated={fetchProjectData}
        onBack={() => {
          setSelectedTask(null);
          setIsTaskModalOpen(false);
          fetchProjectData();
        }}
      />
    );
  }

  return (
    <div className="project-board-view">
      {/* Project Header Banner */}
      <div className="project-header-card">
        <div className="project-header-left">
          <div className="flex-align gap-2">
            <h2>{project.name}</h2>
            {project.isArchived && <span className="badge badge-warning">Archived</span>}
          </div>
          <p className="project-desc">{project.description || "No project description provided."}</p>
          <div className="project-meta-row">
            <span>
              Manager: <strong>{project.manager?.name || "Unassigned"}</strong>
            </span>
            {project.startDate && (
              <span>
                Start: <strong>{new Date(project.startDate).toLocaleDateString()}</strong>
              </span>
            )}
            {project.dueDate && (
              <span>
                Due: <strong>{new Date(project.dueDate).toLocaleDateString()}</strong>
                {project.originalDueDate && new Date(project.dueDate) > new Date(project.originalDueDate) && (
                  <span className="badge badge-warning badge-sm margin-left-1" style={{ fontSize: "10px", padding: "1px 5px" }}>
                    Extended (Original: {new Date(project.originalDueDate).toLocaleDateString()})
                  </span>
                )}
              </span>
            )}
          </div>
        </div>

        <div className="project-header-actions">
          <button className="btn-secondary btn-sm" onClick={() => setIsMembersModalOpen(true)}>
            <IconUsers size={16} /> Team ({projectMembers.length})
          </button>

          {isManagerOrAdmin && !project.isArchived && (
            <button
              className="btn-primary btn-sm"
              onClick={() => {
                setSelectedTask(null);
                setIsTaskModalOpen(true);
              }}
            >
              <IconPlus size={16} /> New Task
            </button>
          )}

          {isManagerOrAdmin && (
            <button
              className={`btn-sm ${project.isArchived ? "btn-success" : "btn-secondary"}`}
              onClick={handleArchiveRestore}
            >
              {project.isArchived ? <IconRefresh size={16} /> : <IconArchive size={16} />}
              {project.isArchived ? "Restore" : "Archive"}
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="project-subnav-bar">
        <button
          className={`subnav-btn ${activeTab === "board" ? "active" : ""}`}
          onClick={() => setActiveTab("board")}
        >
          <IconFolder size={16} /> Kanban Board
        </button>
        <button
          className={`subnav-btn ${activeTab === "dashboard" ? "active" : ""}`}
          onClick={() => setActiveTab("dashboard")}
        >
          <IconSparkles size={16} /> Analytics & Reports
        </button>
        <button
          className={`subnav-btn ${activeTab === "documents" ? "active" : ""}`}
          onClick={() => setActiveTab("documents")}
        >
          Files & Attachments
        </button>
        <button
          className={`subnav-btn ${activeTab === "comments" ? "active" : ""}`}
          onClick={() => setActiveTab("comments")}
        >
          Project Comments
        </button>
        <button
          className={`subnav-btn ${activeTab === "activity" ? "active" : ""}`}
          onClick={() => setActiveTab("activity")}
        >
          Audit Activity
        </button>
      </div>

      {activeTab === "board" ? (
        <>
          {/* Filter & Control Bar */}
          <div className="board-controls">
            <div className="search-input-wrapper">
              <IconSearch size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Filter tasks by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="filter-group">
              <span className="text-xs text-muted font-medium">Priority:</span>
              <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
                <option value="All">All Priorities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Kanban Board Columns */}
          {loading ? (
            <div className="loading-spinner">Loading board...</div>
          ) : (
            <div className="kanban-grid">
              {STATUSES.map((colStatus) => {
                const statusTasks = filteredTasks.filter((t) => {
                  if (colStatus === "New Task") return t.status === "New Task" || t.status === "Todo" || t.status === "To Do";
                  return t.status === colStatus;
                });
                return (
                  <div key={colStatus} className="kanban-column">
                    <div className="column-header">
                      <div className="column-title-group">
                        <span className={`status-indicator status-${colStatus.toLowerCase().replace(" ", "")}`}></span>
                        <h3>{colStatus}</h3>
                      </div>
                      <span className="task-count-badge">{statusTasks.length}</span>
                    </div>

                    <div className="column-cards-container">
                      {statusTasks.length === 0 ? (
                        <div className="empty-column-placeholder">No tasks</div>
                      ) : (
                        statusTasks.map((t) => (
                          <div
                            key={t._id}
                            className="task-card"
                            onClick={() => {
                              setSelectedTask(t);
                              setIsTaskModalOpen(false);
                            }}
                          >
                            <div className="task-card-header">
                              <select
                                className={`badge badge-xs ${PRIORITY_COLORS[t.priority] || "badge-subtle"} priority-quick-select`}
                                value={t.priority}
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handlePriorityChange(t._id, e.target.value);
                                }}
                                title="Change priority"
                              >
                                {PRIORITIES.map((p) => (
                                  <option key={p} value={p}>
                                    {p}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <h4 className="task-title">{t.title}</h4>

                            {t.description && (
                              <p className="task-desc-preview">{t.description}</p>
                            )}

                            {t.milestones && t.milestones.length > 0 && (
                              <div className="task-card-milestones">
                                {t.milestones.map((m) => {
                                  const mTitle = typeof m === "object" ? m.title : (milestones.find((ms) => ms._id === m)?.title || "Milestone");
                                  return (
                                    <span
                                      key={typeof m === "object" ? m._id : m}
                                      className="milestone-badge-tag"
                                      title={`Milestone: ${mTitle}`}
                                    >
                                      <IconFlag size={11} className="text-primary" />
                                      <span>{mTitle}</span>
                                    </span>
                                  );
                                })}
                              </div>
                            )}

                            <div className="task-card-footer">
                              <div className="task-user-avatars flex items-center gap-1">
                                {Array.isArray(t.assignedTo) && t.assignedTo.length > 0 ? (
                                  t.assignedTo.map((u, uIdx) => (
                                    <div key={u._id || uIdx} className="task-user-avatar" title={u.name || u.email}>
                                      {u.name ? u.name.charAt(0).toUpperCase() : "?"}
                                    </div>
                                  ))
                                ) : t.assignedTo?.name ? (
                                  <div className="task-user-avatar" title={t.assignedTo.name}>
                                    {t.assignedTo.name.charAt(0).toUpperCase()}
                                  </div>
                                ) : (
                                  <div className="task-user-avatar" title="Unassigned">?</div>
                                )}
                              </div>

                              <div className="task-meta-icons">
                                {t.dependencies?.length > 0 && (
                                  <span className="meta-tag" title="Dependencies">
                                    🔗 {t.dependencies.length}
                                  </span>
                                )}
                                {t.dueDate && (
                                  <span
                                    className="meta-tag"
                                    title={
                                      t.originalDueDate && new Date(t.dueDate) > new Date(t.originalDueDate)
                                        ? `Extended (Original: ${new Date(t.originalDueDate).toLocaleDateString()})`
                                        : "Due Date"
                                    }
                                  >
                                    <IconCalendar size={12} /> {new Date(t.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    {t.originalDueDate && new Date(t.dueDate) > new Date(t.originalDueDate) && (
                                      <span className="text-2xs text-warning font-semibold margin-left-1">(Ext)</span>
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : activeTab === "dashboard" ? (
        <DashboardView projectId={project._id} />
      ) : activeTab === "documents" ? (
        <div className="card-container">
          <DocumentList projectId={project._id} canManage={isManagerOrAdmin} />
        </div>
      ) : activeTab === "comments" ? (
        <div className="card-container">
          <CommentSection projectId={project._id} currentUserId={currentUserId} />
        </div>
      ) : (
        <div className="card-container">
          <ActivityStream projectId={project._id} />
        </div>
      )}

      {/* Task Edit/Create Modal */}
      {isTaskModalOpen && (
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          task={selectedTask}
          projectId={project._id}
          projectMembers={projectMembers}
          projectMilestones={milestones}
          allTasks={tasks}
          currentUserId={currentUserId}
          isManagerOrAdmin={isManagerOrAdmin}
          onTaskUpdated={fetchProjectData}
        />
      )}

      {/* Project Members Modal */}
      {isMembersModalOpen && (
        <div className="modal-overlay" onClick={() => setIsMembersModalOpen(false)}>
          <div className="modal-container max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Project Team Members</h3>
              <button onClick={() => setIsMembersModalOpen(false)} className="btn-icon">
                ×
              </button>
            </div>
            <div className="modal-body">
              {isManagerOrAdmin && (
                <form onSubmit={handleAddProjectMember} className="add-member-form">
                  <select
                    value={newMemberUserId}
                    onChange={(e) => setNewMemberUserId(e.target.value)}
                    required
                  >
                    <option value="">Select space member...</option>
                    {workspaceMembersList
                      .filter((wm) => !projectMembers.some((pm) => (pm.user?._id || pm.user) === wm.user._id))
                      .map((wm) => (
                        <option key={wm.user._id} value={wm.user._id}>
                          {wm.user.name} ({wm.user.email})
                        </option>
                      ))}
                  </select>
                  <button type="submit" className="btn-primary btn-sm">
                    Add
                  </button>
                </form>
              )}

              <div className="project-members-list">
                {projectMembers.map((pm) => (
                  <div key={pm._id} className="member-row">
                    <div className="user-cell">
                      <div className="avatar-sm">
                        {pm.user?.name ? pm.user.name.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div>
                        <div className="font-medium">{pm.user?.name}</div>
                        <div className="text-xs text-muted">{pm.user?.email}</div>
                      </div>
                    </div>
                    <div className="flex-align gap-2">
                      <span className="badge badge-subtle">{pm.role}</span>
                      {isManagerOrAdmin && pm.user?._id !== (project.manager?._id || project.manager) && (
                        <button
                          className="btn-icon-danger"
                          onClick={() => handleRemoveProjectMember(pm.user._id)}
                        >
                          <IconTrash size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
