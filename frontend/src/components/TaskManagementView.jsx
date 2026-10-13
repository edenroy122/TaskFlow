import React, { useState, useEffect, useRef } from "react";
import { api } from "../api";
import { TaskModal } from "./TaskModal";
import { TaskDetailView } from "./TaskDetailView";
import {
  IconPlus,
  IconSearch,
  IconCalendar,
  IconFolder,
  IconSparkles,
  IconFlag
} from "./Icons";

const STATUSES = ["New Task", "In Progress", "In Review", "Completed", "Hold"];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

export function TaskManagementView({
  projectId,
  workspaceId,
  userRole,
  currentUserId,
  isProjectManager,
  initialTaskId,
  onProjectUpdated
}) {
  const [tasks, setTasks] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]);
  const [projectMilestones, setProjectMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("board"); // "board" | "list"
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [filterMilestone, setFilterMilestone] = useState("All");
  const [sortBy, setSortBy] = useState("dueDate");

  // Selected Task Modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const initialTaskHandledRef = useRef(false);

  // Drag & Drop State
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  const canManageTask =
    userRole === "Project Manager" ||
    userRole === "Member" ||
    userRole === "Owner" ||
    userRole === "Admin" ||
    userRole === "Manager" ||
    isProjectManager;

  const fetchTasksData = async (showLoading = false) => {
    if (!projectId) return;
    if (showLoading) setLoading(true);
    try {
      const [tasksRes, pmRes, msRes] = await Promise.all([
        api.getTasks(projectId),
        api.getProjectMembers(projectId).catch(() => ({ members: [] })),
        api.getMilestones(projectId).catch(() => ({ milestones: [] }))
      ]);
      const loadedTasks = tasksRes.tasks || [];
      setTasks(loadedTasks);
      setProjectMilestones(msRes.milestones || []);

      const pMembers = pmRes.members || [];
      const memberMap = new Map();

      pMembers.forEach((pm) => {
        if (pm.user) {
          const uId = (pm.user._id || pm.user).toString();
          const uName = typeof pm.user === "object" ? (pm.user.name || "Member") : "Member";
          const uEmail = typeof pm.user === "object" ? (pm.user.email || "") : "";
          memberMap.set(uId, {
            _id: (pm._id || uId).toString(),
            user: { _id: uId, name: uName, email: uEmail },
            role: pm.role || "Member"
          });
        }
      });

      setProjectMembers(Array.from(memberMap.values()));

      // Keep selectedTask in sync if currently viewing a task
      setSelectedTask((prev) => {
        if (!prev) return null;
        return loadedTasks.find((t) => t._id === prev._id) || prev;
      });

      // If initialTaskId was passed via route/props, auto open it only once on mount
      if (initialTaskId && !initialTaskHandledRef.current) {
        initialTaskHandledRef.current = true;
        const found = loadedTasks.find((t) => t._id === initialTaskId);
        if (found) {
          setSelectedTask(found);
          setIsTaskModalOpen(false);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasksData(true);
  }, [projectId]);

  const handleStatusChange = async (taskId, newStatus) => {
    let normalizedStatus = newStatus;
    if (newStatus === "To Do" || newStatus === "New Task") normalizedStatus = "New Task";
    if (newStatus === "In Review") normalizedStatus = "Review";

    const prevTask = tasks.find((t) => t._id === taskId);
    if (!prevTask) return;

    // Optimistically update only this task in place
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, status: normalizedStatus } : t))
    );

    try {
      const res = await api.updateTaskStatus(taskId, normalizedStatus);
      const updated = res?.task || res?.data;
      if (updated) {
        setTasks((prev) =>
          prev.map((t) => (t._id === taskId ? { ...t, ...updated } : t))
        );
      }
    } catch (err) {
      // Revert only this task on failure
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? prevTask : t))
      );
      alert(err.message || "Failed to update task status");
    }
  };

  const handlePriorityChange = async (taskId, newPriority) => {
    const prevTask = tasks.find((t) => t._id === taskId);
    if (!prevTask) return;

    // Optimistically update only this task in place
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
      // Revert only this task on failure
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? prevTask : t))
      );
      alert(err.message || "Failed to update task priority");
    }
  };

  // Drag & Drop Handlers for Kanban Board
  const handleDragStart = (e, taskId) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e, colStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== colStatus) {
      setDragOverColumn(colStatus);
    }
  };

  const handleDragLeave = (e, colStatus) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    if (dragOverColumn === colStatus) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e, colStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    if (!taskId) return;

    const task = tasks.find((t) => t._id === taskId);
    if (!task) return;

    const currentStatus =
      task.status === "Todo" || task.status === "To Do" || task.status === "New Task"
        ? "New Task"
        : task.status === "Review"
        ? "In Review"
        : task.status;

    if (currentStatus === colStatus) return;

    handleStatusChange(taskId, colStatus);
    setDraggedTaskId(null);
  };

  // Filter Tasks
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      filterStatus === "All" ||
      t.status?.toLowerCase() === filterStatus.toLowerCase() ||
      (filterStatus === "In Review" && t.status === "Review") ||
      (filterStatus === "New Task" && (t.status === "Todo" || t.status === "To Do" || t.status === "New Task"));

    const matchesPriority = filterPriority === "All" || t.priority?.toLowerCase() === filterPriority.toLowerCase();

    const matchesMilestone =
      filterMilestone === "All" ||
      (t.milestones && t.milestones.some((m) => (m._id || m).toString() === filterMilestone));

    return matchesSearch && matchesStatus && matchesPriority && matchesMilestone;
  });

  // Sort Tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === "dueDate") return new Date(a.dueDate || 0) - new Date(b.dueDate || 0);
    if (sortBy === "priority") return a.priority?.localeCompare(b.priority);
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  const getPriorityBadge = (p) => {
    switch (p) {
      case "Urgent": return "badge-danger";
      case "High": return "badge-warning";
      case "Medium": return "badge-primary";
      default: return "badge-secondary";
    }
  };

  const getStatusBadge = (s) => {
    switch (s) {
      case "Completed": return "badge-success";
      case "In Progress": return "badge-accent";
      case "In Review": case "Review": return "badge-warning";
      case "Hold": case "Blocked": return "badge-danger";
      default: return "badge-secondary";
    }
  };

  if (selectedTask) {
    return (
      <TaskDetailView
        task={selectedTask}
        projectId={projectId}
        projectMembers={projectMembers}
        projectMilestones={projectMilestones}
        allTasks={tasks}
        currentUserId={currentUserId}
        isManagerOrAdmin={userRole === "Owner" || userRole === "Admin" || isProjectManager}
        canManageTask={canManageTask}
        onTaskUpdated={() => {
          fetchTasksData();
          if (onProjectUpdated) onProjectUpdated();
        }}
        onBack={() => {
          setSelectedTask(null);
          setIsTaskModalOpen(false);
          fetchTasksData();
          if (onProjectUpdated) onProjectUpdated();
        }}
      />
    );
  }

  return (
    <div className="task-management-page">
      {/* Header Bar */}
      <div className="flex justify-between items-center margin-bottom-4">
        <div>
          <h3>Tasks Management ({filteredTasks.length})</h3>
          <p className="subtitle">Track work items, assignees, priorities, and dependency workflows</p>
        </div>

        {canManageTask && (
          <button
            className="btn-primary"
            onClick={() => {
              setSelectedTask(null);
              setIsTaskModalOpen(true);
            }}
          >
            <IconPlus size={16} />Create Task
          </button>
        )}
      </div>

      {/* Control Bar: Search, Filters, View Mode Toggle */}
      <div className="task-controls-bar margin-bottom-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3 min-w-xs">
          <div className="search-input-wrapper flex-1">
            <IconSearch size={16} className="search-icon" />
            <input
              type="text"
              className="form-control"
              placeholder="Search tasks by title, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* View Mode Toggle */}
          <div className="btn-group">
            <button
              className={`btn-tab ${viewMode === "board" ? "active" : ""}`}
              onClick={() => setViewMode("board")}
            >
              Kanban Board
            </button>
            <button
              className={`btn-tab ${viewMode === "list" ? "active" : ""}`}
              onClick={() => setViewMode("list")}
            >
              List Table
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <select
            className="form-control select-compact filter-select-status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="New Task">New Task</option>
            <option value="In Progress">In Progress</option>
            <option value="In Review">In Review</option>
            <option value="Completed">Completed</option>
            <option value="Hold">Hold</option>
          </select>

          {/* Priority Filter */}
          <select
            className="form-control select-compact filter-select-priority"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="All">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>

          {/* Milestone Filter */}
          <select
            className="form-control select-compact filter-select-milestone"
            value={filterMilestone}
            onChange={(e) => setFilterMilestone(e.target.value)}
          >
            <option value="All">All Milestones</option>
            {projectMilestones.map((m) => (
              <option key={m._id} value={m._id}>
                🎯 {m.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main View: Board vs List */}
      {loading ? (
        <div className="loading-state">Loading tasks...</div>
      ) : filteredTasks.length === 0 ? (
        <div className="empty-state card">
          <IconFolder size={36} className="empty-icon text-muted" />
          <h4>No tasks found</h4>
          <p>No tasks match your current filter or search criteria.</p>
          {canManageTask && (
            <button
              className="btn-primary margin-top-3"
              onClick={() => {
                setSelectedTask(null);
                setIsTaskModalOpen(true);
              }}
            >
              <IconPlus size={16} /> Create Task
            </button>
          )}
        </div>
      ) : viewMode === "list" ? (
        /* List / Table View */
        <div className="table-responsive card padding-0">
          <table className="projects-table">
            <thead>
              <tr>
                <th>Task Title</th>
                <th>Milestones</th>
                <th>Assignee</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Dependencies</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedTasks.map((t) => (
                <tr
                  key={t._id}
                  className="clickable-row"
                  onClick={() => {
                    setSelectedTask(t);
                    setIsTaskModalOpen(false);
                  }}
                >
                  <td className="font-semibold text-dark">
                    <div>{t.title}</div>
                    {t.description && (
                      <div className="text-xs text-secondary line-clamp-1 font-normal">
                        {t.description}
                      </div>
                    )}
                  </td>
                  <td>
                    {t.milestones && t.milestones.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {t.milestones.map((m) => {
                          const mTitle = typeof m === "object" ? m.title : (projectMilestones.find((ms) => ms._id === m)?.title || "Milestone");
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
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-1 flex-wrap">
                      {Array.isArray(t.assignedTo) && t.assignedTo.length > 0 ? (
                        <>
                          <div className="flex items-center gap-1">
                            {t.assignedTo.map((u, uIdx) => (
                              <div key={u._id || uIdx} className="user-avatar-sm" title={u.name || u.email}>
                                {(u.name || "U")[0].toUpperCase()}
                              </div>
                            ))}
                          </div>
                          <span className="text-xs text-secondary margin-left-1">
                            {t.assignedTo.map((u) => u.name || u.email).join(", ")}
                          </span>
                        </>
                      ) : t.assignedTo?.name ? (
                        <>
                          <div className="user-avatar-sm" title={t.assignedTo.name}>
                            {t.assignedTo.name[0].toUpperCase()}
                          </div>
                          <span className="text-sm">{t.assignedTo.name}</span>
                        </>
                      ) : (
                        <span className="text-xs text-muted">Unassigned</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${getPriorityBadge(t.priority)}`}>
                      {t.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadge(t.status)}`}>
                      {t.status === "Todo" || t.status === "To Do" || t.status === "New Task" ? "New Task" : t.status === "Review" ? "In Review" : t.status}
                    </span>
                  </td>
                  <td className="text-sm text-secondary">
                    {t.dueDate ? (
                      <div>
                        <div className="flex items-center gap-1">
                          <span>{new Date(t.dueDate).toLocaleDateString()}</span>
                          {t.originalDueDate && new Date(t.dueDate).getTime() !== new Date(t.originalDueDate).getTime() && (
                            <span className="badge badge-warning text-2xs" title={`Original due date: ${new Date(t.originalDueDate).toLocaleDateString()}`}>
                              Extended
                            </span>
                          )}
                        </div>
                        {t.originalDueDate && new Date(t.dueDate).getTime() !== new Date(t.originalDueDate).getTime() && (
                          <div className="text-2xs text-muted font-normal margin-top-1">
                            Original: {new Date(t.originalDueDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted">No Date</span>
                    )}
                  </td>
                  
                  <td>
                    {t.dependencies?.length > 0 ? (
                      <span className="badge badge-outline">🔗 {t.dependencies.length}</span>
                    ) : (
                      <span className="text-xs text-muted">None</span>
                    )}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => {
                        setSelectedTask(t);
                        setIsTaskModalOpen(false);
                      }}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Kanban Board View */
        <div className="kanban-grid">
          {STATUSES.map((colStatus) => {
            const colTasks = filteredTasks.filter((t) => {
              if (colStatus === "New Task") return t.status === "New Task" || t.status === "Todo" || t.status === "To Do";
              if (colStatus === "In Review") return t.status === "Review" || t.status === "In Review";
              return t.status === colStatus;
            });

            return (
              <div
                key={colStatus}
                className={`kanban-column ${dragOverColumn === colStatus ? "drag-over" : ""}`}
                onDragOver={(e) => handleDragOver(e, colStatus)}
                onDragLeave={(e) => handleDragLeave(e, colStatus)}
                onDrop={(e) => handleDrop(e, colStatus)}
              >
                <div className="column-header flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className={`status-indicator status-${colStatus.toLowerCase().replace(/\s+/g, "")}`} />
                    <h4>{colStatus}</h4>
                  </div>
                  <span className="task-count-badge">{colTasks.length}</span>
                </div>

                <div className="column-cards-container">
                  {colTasks.length === 0 ? (
                    <div className="empty-column-placeholder">No tasks</div>
                  ) : (
                    colTasks.map((t) => (
                      <div
                        key={t._id}
                        className={`task-card ${draggedTaskId === t._id ? "dragging" : ""}`}
                        draggable={canManageTask}
                        onDragStart={(e) => handleDragStart(e, t._id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => {
                          setSelectedTask(t);
                          setIsTaskModalOpen(false);
                        }}
                      >
                        <div className="task-card-header flex justify-between items-center">
                          {canManageTask ? (
                            <select
                              className={`badge ${getPriorityBadge(t.priority)} priority-quick-select`}
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
                          ) : (
                            <span className={`badge ${getPriorityBadge(t.priority)}`}>
                              {t.priority}
                            </span>
                          )}
                        </div>

                        <h4 className="task-title font-semibold text-dark margin-top-2">{t.title}</h4>

                        {t.description && (
                          <p className="task-desc-preview text-xs text-secondary margin-top-1 line-clamp-2">
                            {t.description}
                          </p>
                        )}

                        {t.milestones && t.milestones.length > 0 && (
                          <div className="task-card-milestones">
                            {t.milestones.map((m) => {
                              const mTitle = typeof m === "object" ? m.title : (projectMilestones.find((ms) => ms._id === m)?.title || "Milestone");
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

                        <div className="task-card-footer flex justify-between items-center margin-top-3 border-t padding-top-2">
                          <div className="flex items-center gap-1 flex-wrap">
                            {Array.isArray(t.assignedTo) && t.assignedTo.length > 0 ? (
                              t.assignedTo.map((u, uIdx) => (
                                <div key={u._id || uIdx} className="user-avatar-sm" title={u.name || u.email}>
                                  {(u.name || "U")[0].toUpperCase()}
                                </div>
                              ))
                            ) : t.assignedTo?.name ? (
                              <div className="user-avatar-sm" title={t.assignedTo.name}>
                                {t.assignedTo.name[0].toUpperCase()}
                              </div>
                            ) : (
                              <span className="text-xs text-muted">Unassigned</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-muted">
                            {t.subtasks?.length > 0 && (
                              <span title="Subtasks">
                                ☑ {t.subtasks.filter((s) => s.completed || s.status === "Completed").length}/{t.subtasks.length}
                              </span>
                            )}
                            {t.dependencies?.length > 0 && <span>🔗 {t.dependencies.length}</span>}
                            {t.dueDate && (
                              <span title={t.originalDueDate && new Date(t.dueDate).getTime() !== new Date(t.originalDueDate).getTime() ? `Extended (Original: ${new Date(t.originalDueDate).toLocaleDateString()})` : undefined}>
                                <IconCalendar size={12} /> {new Date(t.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                {t.originalDueDate && new Date(t.dueDate).getTime() !== new Date(t.originalDueDate).getTime() && (
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

      {/* Task Modal for Details, Editing, Dependencies, Comments, Approvals, Watchers */}
      {isTaskModalOpen && (
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          task={selectedTask}
          projectId={projectId}
          projectMembers={projectMembers}
          projectMilestones={projectMilestones}
          allTasks={tasks}
          currentUserId={currentUserId}
          isManagerOrAdmin={userRole === "Owner" || userRole === "Admin" || isProjectManager}
          onTaskUpdated={() => {
            fetchTasksData();
            if (onProjectUpdated) onProjectUpdated();
          }}
        />
      )}
    </div>
  );
}
