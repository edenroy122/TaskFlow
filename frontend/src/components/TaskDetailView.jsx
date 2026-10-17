import React, { useState, useEffect } from "react";
import { api } from "../api";
import {
  IconEye,
  IconPlus,
  IconTrash,
  IconSparkles,
  IconFlag,
  IconUser,
  IconCheck,
  IconSearch,
  IconEdit,
  IconCalendar
} from "./Icons";
import { Modal } from "./Modal";
import { DocumentList } from "./DocumentList";
import { CommentSection } from "./CommentSection";
import { ActivityStream } from "./ActivityStream";

export function TaskDetailView({
  task,
  projectId,
  projectMembers = [],
  projectMilestones = [],
  allTasks = [],
  currentUserId,
  isManagerOrAdmin,
  onTaskUpdated,
  onBack,
  canManageTask
}) {
  const [activeTab, setActiveTab] = useState("details"); // "details" | "activity"
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignedTo: [],
    priority: "Medium",
    dueDate: "",
    dependencies: [],
    milestones: [],
    subtasks: [],
  });

  const [status, setStatus] = useState("New Task");
  const [watchers, setWatchers] = useState([]);
  const [newWatcherUserId, setNewWatcherUserId] = useState("");
  const [newAssigneeId, setNewAssigneeId] = useState("");

  // Subtask Modal & Controls State
  const [isSubtaskModalOpen, setIsSubtaskModalOpen] = useState(false);
  const [editingSubtaskIndex, setEditingSubtaskIndex] = useState(null);
  const [subtaskFormData, setSubtaskFormData] = useState({
    title: "",
    description: "",
    assignedTo: "",
    priority: "Medium",
    status: "New Task",
    dueDate: ""
  });
  const [subtaskSearchQuery, setSubtaskSearchQuery] = useState("");
  const [subtaskStatusFilter, setSubtaskStatusFilter] = useState("All");
  const [subtaskPriorityFilter, setSubtaskPriorityFilter] = useState("All");

  // Modal State for editing task details
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editModalData, setEditModalData] = useState({
    title: "",
    description: "",
    status: "New Task",
    priority: "Medium",
    dueDate: ""
  });

  const [watcherError, setWatcherError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [availableMilestones, setAvailableMilestones] = useState(projectMilestones || []);
  const [internalMembers, setInternalMembers] = useState(projectMembers || []);

  useEffect(() => {
    if (projectMembers && projectMembers.length > 0) {
      setInternalMembers(projectMembers);
    }
  }, [projectMembers]);

  useEffect(() => {
    if (projectId) {
      api.getMilestones(projectId)
        .then((res) => {
          setAvailableMilestones(res.milestones || []);
        })
        .catch((err) => console.error("Failed to load milestones:", err));

      api.getProjectMembers(projectId)
        .then((pmRes) => {
          const pMembers = pmRes.members || [];
          const memberMap = new Map();
          pMembers.forEach((pm) => {
            if (pm.user) {
              const uId = (pm.user._id || pm.user).toString();
              memberMap.set(uId, {
                _id: (pm._id || uId).toString(),
                user: typeof pm.user === "object" ? pm.user : { _id: uId, name: "Member" },
                role: pm.role || "Member"
              });
            }
          });
          setInternalMembers(Array.from(memberMap.values()));
        })
        .catch(console.error);
    }
  }, [projectId]);

  useEffect(() => {
    if (task) {
      let initialAssigned = [];
      if (Array.isArray(task.assignedTo)) {
        initialAssigned = task.assignedTo.map((u) => u._id || u);
      } else if (task.assignedTo) {
        initialAssigned = [task.assignedTo._id || task.assignedTo];
      }

      let initialMilestones = [];
      if (Array.isArray(task.milestones)) {
        initialMilestones = task.milestones.map((m) => (m._id || m).toString());
      } else if (task.milestones) {
        initialMilestones = [(task.milestones._id || task.milestones).toString()];
      }

      const formattedDueDate = task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "";

      setFormData({
        title: task.title || "",
        description: task.description || "",
        assignedTo: initialAssigned,
        priority: task.priority || "Medium",
        dueDate: formattedDueDate,
        originalDueDate: task.originalDueDate || null,
        dependencies: task.dependencies ? task.dependencies.map((d) => d._id || d) : [],
        milestones: initialMilestones,
        subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
      });
      setStatus(task.status === "Todo" || task.status === "To Do" ? "New Task" : (task.status || "New Task"));

      setEditModalData({
        title: task.title || "",
        description: task.description || "",
        status: task.status === "Todo" || task.status === "To Do" ? "New Task" : (task.status || "New Task"),
        priority: task.priority || "Medium",
        dueDate: formattedDueDate
      });

      fetchWatchers(task._id);
    }
  }, [task]);

  const isStakeholder = (role) => {
    if (!role) return false;
    const clean = role.toString().toLowerCase().replace(/[\s_-]+/g, "");
    return clean.includes("stakeholder");
  };

  // Eligible Watchers: Members of the workspace/project who are NOT stakeholders.
  // Note: An assigned member CAN also be a watcher!
  const eligibleWatcherCandidates = internalMembers.filter((m) => {
    const uId = (m.user?._id || m.user || m._id || "").toString();
    const role = m.role || m.permissionRole || "";
    if (isStakeholder(role)) return false;
    if (watchers.some((w) => (w._id || w).toString() === uId)) return false;
    return true;
  });

  const eligibleAssignees = internalMembers.filter((m) => {
    const role = m.role || m.permissionRole || "";
    if (isStakeholder(role)) return false;
    return true;
  });

  const assignedList = (formData.assignedTo || []).map((assignedId) => {
    const idStr = (assignedId?._id || assignedId).toString();
    const found = internalMembers.find(
      (m) => (m.user?._id || m.user || m._id || "").toString() === idStr
    );
    if (found) return found;
    if (typeof assignedId === "object" && assignedId.name) {
      return { _id: idStr, user: assignedId, role: "Member" };
    }
    return { _id: idStr, user: { _id: idStr, name: "Member" }, role: "Member" };
  });

  const fetchWatchers = async (taskId) => {
    try {
      const res = await api.getTaskWatchers(taskId);
      setWatchers(res.watchers || []);
    } catch (err) {
      console.error("Failed to fetch watchers:", err);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = () => {
    setEditModalData({
      title: formData.title || task.title || "",
      description: formData.description || task.description || "",
      status: status === "Todo" || status === "To Do" ? "New Task" : (status || "New Task"),
      priority: formData.priority || "Medium",
      dueDate: formData.dueDate || ""
    });
    setIsEditModalOpen(true);
  };

  // Save changes from Edit Modal
  const handleSaveEditModal = async (e) => {
    e.preventDefault();
    if (!task?._id) return;
    setError("");

    if (editModalData.dueDate) {
      const d = new Date(editModalData.dueDate);
      if (isNaN(d.getTime())) {
        setError("Please select a valid target due date!");
        return;
      }
    }

    setSaving(true);

    try {
      await api.updateTask(task._id, {
        title: editModalData.title,
        description: editModalData.description,
        priority: editModalData.priority,
        dueDate: editModalData.dueDate || undefined
      });

      if (editModalData.status !== status) {
        await api.updateTaskStatus(task._id, editModalData.status);
        setStatus(editModalData.status);
      }

      setFormData((prev) => ({
        ...prev,
        title: editModalData.title,
        description: editModalData.description,
        priority: editModalData.priority,
        dueDate: editModalData.dueDate,
        originalDueDate: prev.originalDueDate || (prev.dueDate ? prev.dueDate : editModalData.dueDate)
      }));

      setIsEditModalOpen(false);
      setSuccessMsg("Task details updated successfully!");
      if (onTaskUpdated) onTaskUpdated();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to update task details");
    } finally {
      setSaving(false);
    }
  };

  // Assignee Handlers
  const handleAddAssignee = async () => {
    if (!newAssigneeId || !task?._id) return;
    const current = Array.isArray(formData.assignedTo) ? formData.assignedTo : [];
    if (!current.includes(newAssigneeId)) {
      const updated = [...current, newAssigneeId];
      setFormData((prev) => ({ ...prev, assignedTo: updated }));
      setNewAssigneeId("");
      try {
        await api.updateTask(task._id, { assignedTo: updated });
        if (onTaskUpdated) onTaskUpdated();
      } catch (err) {
        setError(err.message || "Failed to assign member");
      }
    }
  };

  const handleRemoveAssignee = async (userId) => {
    if (!task?._id) return;
    const current = Array.isArray(formData.assignedTo) ? formData.assignedTo : [];
    const updated = current.filter((id) => id.toString() !== userId.toString());
    setFormData((prev) => ({ ...prev, assignedTo: updated }));
    try {
      await api.updateTask(task._id, { assignedTo: updated });
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      setError(err.message || "Failed to unassign member");
    }
  };

  // Watcher Handlers
  const handleAddWatcher = async () => {
    if (!newWatcherUserId || !task?._id) return;
    setWatcherError("");
    try {
      const res = await api.addWatcher(task._id, newWatcherUserId);
      setWatchers(res.watchers || []);
      setNewWatcherUserId("");
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      setWatcherError(err.message || "Failed to add watcher");
    }
  };

  const handleRemoveWatcher = async (userId) => {
    if (!task?._id) return;
    setWatcherError("");
    try {
      const res = await api.removeWatcher(task._id, userId);
      if (res?.watchers) {
        setWatchers(res.watchers);
      } else {
        fetchWatchers(task._id);
      }
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      setWatcherError(err.message || "Failed to remove watcher");
    }
  };

  // Milestone Handlers
  const handleLinkMilestone = async (mId) => {
    if (!mId || !task?._id) return;
    const current = Array.isArray(formData.milestones) ? formData.milestones.map((id) => id.toString()) : [];
    if (!current.includes(mId)) {
      const updated = [...current, mId];
      setFormData((prev) => ({ ...prev, milestones: updated }));
      try {
        await api.updateTask(task._id, { milestones: updated });
        if (onTaskUpdated) onTaskUpdated();
      } catch (err) {
        console.error("Failed to link milestone:", err);
      }
    }
  };

  const handleUnlinkMilestone = async (milestoneId) => {
    if (!task?._id) return;
    const updated = (formData.milestones || []).filter((id) => id && id.toString() !== milestoneId.toString());
    setFormData((prev) => ({ ...prev, milestones: updated }));
    try {
      await api.updateTask(task._id, { milestones: updated });
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      console.error("Failed to unlink milestone:", err);
    }
  };

  // Dependencies Handler
  const handleDependencyToggle = async (depTaskId) => {
    const current = formData.dependencies || [];
    const updated = current.includes(depTaskId)
      ? current.filter((id) => id !== depTaskId)
      : [...current, depTaskId];
    setFormData((prev) => ({ ...prev, dependencies: updated }));
    if (task?._id) {
      try {
        await api.updateTask(task._id, { dependencies: updated });
        if (onTaskUpdated) onTaskUpdated();
      } catch (err) {
        console.error("Failed to auto-save dependencies:", err);
      }
    }
  };

  // Subtask Handlers
  const handleOpenCreateSubtaskModal = () => {
    setEditingSubtaskIndex(null);
    setSubtaskFormData({
      title: "",
      description: "",
      assignedTo: "",
      priority: "Medium",
      status: "New Task",
      dueDate: ""
    });
    setIsSubtaskModalOpen(true);
  };

  const handleOpenEditSubtaskModal = (index) => {
    const st = formData.subtasks[index];
    if (!st) return;
    const assignedId = (st.assignedTo?._id || st.assignedTo || "").toString();
    const formattedDueDate = st.dueDate ? new Date(st.dueDate).toISOString().split("T")[0] : "";
    setEditingSubtaskIndex(index);
    setSubtaskFormData({
      title: st.title || "",
      description: st.description || "",
      assignedTo: assignedId,
      priority: st.priority || "Medium",
      status: st.status || (st.completed ? "Completed" : "New Task"),
      dueDate: formattedDueDate
    });
    setIsSubtaskModalOpen(true);
  };

  const handleSaveSubtaskModal = async (e) => {
    e?.preventDefault();
    if (!subtaskFormData.title.trim()) return;

    const isCompleted = subtaskFormData.status === "Completed";
    const existingSubtask = editingSubtaskIndex !== null ? (formData.subtasks || [])[editingSubtaskIndex] : null;
    let origDue = existingSubtask?.originalDueDate;
    if (!origDue && existingSubtask?.dueDate) {
      origDue = existingSubtask.dueDate;
    } else if (!origDue && subtaskFormData.dueDate) {
      origDue = subtaskFormData.dueDate;
    }

    const subtaskPayload = {
      title: subtaskFormData.title.trim(),
      description: subtaskFormData.description ? subtaskFormData.description.trim() : "",
      completed: isCompleted,
      status: subtaskFormData.status || "New Task",
      priority: subtaskFormData.priority || "Medium",
      assignedTo: subtaskFormData.assignedTo || null,
      dueDate: subtaskFormData.dueDate || null,
      originalDueDate: origDue || null
    };

    let updated;
    if (editingSubtaskIndex !== null) {
      updated = (formData.subtasks || []).map((st, i) =>
        i === editingSubtaskIndex ? { ...st, ...subtaskPayload } : st
      );
    } else {
      updated = [...(formData.subtasks || []), subtaskPayload];
    }

    setFormData((prev) => ({ ...prev, subtasks: updated }));
    setIsSubtaskModalOpen(false);

    if (task?._id) {
      try {
        await api.updateTask(task._id, { subtasks: updated });
        if (onTaskUpdated) onTaskUpdated();
      } catch (err) {
        console.error("Failed to save subtask:", err);
      }
    }
  };

  const handleToggleSubtask = async (index) => {
    const updated = (formData.subtasks || []).map((st, i) => {
      if (i !== index) return st;
      const willBeCompleted = !(st.completed || st.status === "Completed");
      return {
        ...st,
        completed: willBeCompleted,
        status: willBeCompleted ? "Completed" : "New Task"
      };
    });
    setFormData((prev) => ({ ...prev, subtasks: updated }));
    if (task?._id) {
      try {
        await api.updateTask(task._id, { subtasks: updated });
        if (onTaskUpdated) onTaskUpdated();
      } catch (err) {
        console.error("Failed to auto-save subtask toggle:", err);
      }
    }
  };

  const handleDeleteSubtask = async (index) => {
    if (!window.confirm("Are you sure you want to delete this subtask?")) return;
    const updated = (formData.subtasks || []).filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, subtasks: updated }));
    if (task?._id) {
      try {
        await api.updateTask(task._id, { subtasks: updated });
        if (onTaskUpdated) onTaskUpdated();
      } catch (err) {
        console.error("Failed to auto-save subtask delete:", err);
      }
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete task "${task.title}"?`)) return;
    try {
      await api.deleteTask(task._id);
      if (onTaskUpdated) onTaskUpdated();
      if (onBack) onBack();
    } catch (err) {
      alert(err.message || "Failed to delete task");
    }
  };

  const getPriorityBadgeClass = (p) => {
    switch (p?.toLowerCase()) {
      case "urgent": return "badge-danger";
      case "high": return "badge-warning";
      case "medium": return "badge-primary";
      default: return "badge-secondary";
    }
  };

  const getStatusBadgeClass = (s) => {
    switch (s?.toLowerCase()) {
      case "completed": return "badge-success";
      case "in progress": return "badge-accent";
      case "in review": case "review": return "badge-warning";
      case "hold": case "blocked": return "badge-danger";
      case "new task": case "todo": default: return "badge-secondary";
    }
  };

  const completedSubtasksCount = (formData.subtasks || []).filter((s) => s.completed || s.status === "Completed").length;
  const inProgressSubtasksCount = (formData.subtasks || []).filter((s) => !s.completed && s.status === "In Progress").length;
  const todoSubtasksCount = (formData.subtasks || []).filter((s) => !s.completed && (!s.status || s.status === "New Task" || s.status === "Todo")).length;
  const totalSubtasksCount = (formData.subtasks || []).length;
  const subtaskProgressPercent = totalSubtasksCount > 0 ? Math.round((completedSubtasksCount / totalSubtasksCount) * 100) : 0;

  const filteredSubtasks = (formData.subtasks || []).map((st, originalIndex) => ({
    ...st,
    _originalIndex: originalIndex
  })).filter((st) => {
    const q = subtaskSearchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      st.title?.toLowerCase().includes(q) ||
      (st.description && st.description.toLowerCase().includes(q));

    const normStatus = st.status
      ? (st.status === "Todo" || st.status === "To Do" ? "New Task" : st.status)
      : (st.completed ? "Completed" : "New Task");
    const matchesStatus =
      subtaskStatusFilter === "All" ||
      normStatus.toLowerCase() === subtaskStatusFilter.toLowerCase();

    const matchesPriority =
      subtaskPriorityFilter === "All" ||
      (st.priority || "Medium").toLowerCase() === subtaskPriorityFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="task-detail-layout view-container">
      {/* Top Header Card (matching ProjectDetailView style) */}
      <div className="task-detail-header-card card margin-bottom-3">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              className="btn-link text-sm font-semibold text-secondary flex items-center gap-1 back-to-tasks-btn"
              onClick={() => {
                if (onBack) onBack();
              }}
              title="Back to Tasks Management"
            >
              ← Back to Tasks
            </button>
            <span className="text-muted">/</span>
            <div className="flex items-center gap-2 font-semibold text-dark text-lg">
              <IconSparkles size={20} className="text-primary" />
              <span>{task.title}</span>
            </div>
            <span className={`badge ${getStatusBadgeClass(status)}`}>{status}</span>
            <span className={`badge ${getPriorityBadgeClass(formData.priority)}`}>{formData.priority} Priority</span>
          </div>

          <div className="flex items-center gap-2">
            {canManageTask && (
              <button className="btn-secondary btn-sm" onClick={handleOpenEditModal}>
                ✎ Edit Task
              </button>
            )}
            {/* {canManageTask && (
              <button className="btn-secondary btn-sm text-danger" onClick={handleDelete}>
                <IconTrash size={14} /> Delete Task
              </button>
            )} */}
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="task-detail-tabs flex gap-4 margin-top-4 border-t padding-top-3">
          <button
            className={`btn-tab ${activeTab === "details" ? "active" : ""}`}
            onClick={() => setActiveTab("details")}
          >
            Task Details
          </button>
          <button
            className={`btn-tab ${activeTab === "activity" ? "active" : ""}`}
            onClick={() => setActiveTab("activity")}
          >
            Activity Audit
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="task-detail-content">
        {activeTab === "details" && (
          <div className="task-details-view-container grid-1 gap-4">
            {error && <div className="alert-error margin-bottom-3">{error}</div>}
            {successMsg && <div className="alert-success margin-bottom-3">{successMsg}</div>}

            {/* 1. Primary Task Information Banner (matching Project Detail banner style) */}
            <div className="card project-info-banner">
              <div className="flex justify-between items-start">
                <div>
                  <h2>{formData.title || task.title}</h2>
                  <p className="text-secondary text-base margin-top-2">
                    {formData.description || "No task description provided."}
                  </p>
                </div>

                {canManageTask && (
                  <button className="btn-secondary" onClick={handleOpenEditModal}>
                    ✎ Edit Task
                  </button>
                )}
              </div>

              <div className="grid-3 gap-4 margin-top-4 border-t padding-top-3">
                <div>
                  <div className="text-xs text-secondary font-medium">Status</div>
                  <div className="margin-top-1">
                    <span className={`badge ${getStatusBadgeClass(status)}`}>{status}</span>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-secondary font-medium">Priority</div>
                  <div className="margin-top-1">
                    <span className={`badge ${getPriorityBadgeClass(formData.priority)}`}>
                      {formData.priority} Priority
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-secondary font-medium">Target Due Date</div>
                  <div className="font-semibold text-dark margin-top-1">
                    {formData.dueDate ? (
                      <div>
                        <div className="flex items-center gap-1">
                          <span>{new Date(formData.dueDate).toLocaleDateString()}</span>
                          {(formData.originalDueDate || task.originalDueDate) &&
                            new Date(formData.dueDate).getTime() !== new Date(formData.originalDueDate || task.originalDueDate).getTime() && (
                            <span className="badge badge-warning text-2xs" title={`Original due date: ${new Date(formData.originalDueDate || task.originalDueDate).toLocaleDateString()}`}>
                              Extended
                            </span>
                          )}
                        </div>
                        {(formData.originalDueDate || task.originalDueDate) &&
                          new Date(formData.dueDate).getTime() !== new Date(formData.originalDueDate || task.originalDueDate).getTime() && (
                          <div className="text-2xs text-muted font-normal margin-top-1">
                            Original: {new Date(formData.originalDueDate || task.originalDueDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ) : (
                      "Not set"
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Assign To and Watchers Grid (2 Columns below the banner) */}
            <div className="grid-2 gap-4">
              {/* Card 1: Assign To */}
              <div className="card padding-4 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center margin-bottom-2">
                    <h4 className="font-semibold text-dark">Assign To</h4>
                    <span className="badge badge-primary">
                      {assignedList.length} Assigned
                    </span>
                  </div>
                  <p className="text-secondary text-sm">Team members assigned to work on this task.</p>

                  {/* Assigned Members List */}
                  <div className="assigned-members-list margin-top-3 flex flex-col gap-2">
                    {assignedList.length === 0 ? (
                      <div className="bg-light padding-3 rounded text-center text-xs text-muted">
                        No members assigned to this task yet.
                      </div>
                    ) : (
                      assignedList.map((m) => {
                        const uId = (m.user?._id || m.user || m._id || "").toString();
                        const uName = m.user?.name || m.name || "Member";
                        const uRole = m.role || "Member";
                        const initial = uName.charAt(0).toUpperCase();

                        return (
                          <div
                            key={uId}
                            className="member-row-item flex justify-between items-center"
                          >
                            <div className="flex items-center gap-2">
                              <div className="user-avatar-sm">{initial}</div>
                              <div>
                                <div className="text-sm font-semibold text-dark">{uName}</div>
                                <div className="text-xs text-muted">{uRole}</div>
                              </div>
                            </div>
                            {canManageTask && (
                              <button
                                type="button"
                                className="btn-icon-danger btn-sm"
                                title="Remove Assignee"
                                onClick={() => handleRemoveAssignee(uId)}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Assign Member Action */}
                {canManageTask && (
                  <div className="margin-top-4 border-t padding-top-3">
                    <div className="dropdown-action-bar">
                      <div className="select-with-icon-wrapper">
                        <span className="select-lead-icon">
                          <IconUser size={15} />
                        </span>
                        <select
                          className="custom-select select-has-icon"
                          value={newAssigneeId}
                          onChange={(e) => setNewAssigneeId(e.target.value)}
                        >
                          <option value="">Assign a member...</option>
                          {eligibleAssignees
                            .filter((m) => {
                              const uId = (m.user?._id || m.user || m._id || "").toString();
                              return !(formData.assignedTo || []).map((id) => (id?._id || id).toString()).includes(uId);
                            })
                            .map((m) => {
                              const uId = (m.user?._id || m.user || m._id || "").toString();
                              const uName = m.user?.name || m.name || "Member";
                              const uRole = m.role || "Member";
                              return (
                                <option key={uId} value={uId}>
                                  {uName} ({uRole})
                                </option>
                              );
                            })}
                        </select>
                      </div>
                      <button
                        type="button"
                        className="btn-primary btn-action"
                        disabled={!newAssigneeId}
                        onClick={handleAddAssignee}
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Card 2: Watchers */}
              <div className="card padding-4 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center margin-bottom-1">
                    <h4 className="font-semibold text-dark flex items-center gap-2">
                      <IconEye size={16} className="text-primary" />
                      <span>Watchers</span>
                    </h4>
                    <span className="badge badge-accent">{watchers.length} Watching</span>
                  </div>
                  <p className="text-secondary text-sm">
                    Watchers receive notifications on task updates and activity.
                  </p>

                  {/* Watchers List */}
                  <div className="watchers-members-list margin-top-3 flex flex-col gap-2">
                    {watchers.length === 0 ? (
                      <div className="bg-light padding-3 rounded text-center text-xs text-muted">
                        No watchers on this task yet.
                      </div>
                    ) : (
                      watchers.map((w) => {
                        const wId = (w._id || w).toString();
                        const wName = w.name || w.email || "Watcher";
                        const initial = wName.charAt(0).toUpperCase();

                        return (
                          <div
                            key={wId}
                            className="member-row-item flex justify-between items-center"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="user-avatar-sm"
                                style={{ background: "#e8f0fe", color: "#1967d2" }}
                              >
                                {initial}
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-dark">{wName}</div>
                                {w.email && <div className="text-xs text-muted">{w.email}</div>}
                              </div>
                            </div>
                            {(canManageTask || currentUserId === wId) && (
                              <button
                                type="button"
                                className="btn-icon-danger btn-sm"
                                title="Remove Watcher"
                                onClick={() => handleRemoveWatcher(wId)}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Add Watcher Action */}
                {canManageTask && (
                  <div className="margin-top-4 border-t padding-top-3">
                    {watcherError && (
                      <div className="alert-error margin-bottom-2 text-xs">{watcherError}</div>
                    )}
                    <div className="dropdown-action-bar">
                      <div className="select-with-icon-wrapper">
                        <span className="select-lead-icon">
                          <IconEye size={15} />
                        </span>
                        <select
                          className="custom-select select-has-icon"
                          value={newWatcherUserId}
                          onChange={(e) => {
                            setNewWatcherUserId(e.target.value);
                            setWatcherError("");
                          }}
                        >
                          <option value="">Add a watcher...</option>
                          {eligibleWatcherCandidates.map((m) => {
                            const uId = (m.user?._id || m.user || m._id || "").toString();
                            const uName = m.user?.name || m.name || "Member";
                            const uRole = m.role || "Member";
                            return (
                              <option key={uId} value={uId}>
                                {uName} ({uRole})
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      <button
                        type="button"
                        className="btn-primary btn-action"
                        disabled={!newWatcherUserId}
                        onClick={handleAddWatcher}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Milestones & Dependencies (2 Columns) */}
            <div className="grid-2 gap-4">
              {/* Linked Milestones */}
              <div className="card padding-4 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center margin-bottom-2">
                    <h4 className="font-semibold text-dark flex items-center gap-2">
                      <IconFlag size={16} className="text-primary" />
                      <span>Linked Milestones</span>
                    </h4>
                    <span className="badge badge-primary">
                      {Array.isArray(formData.milestones) ? formData.milestones.length : 0} Linked
                    </span>
                  </div>
                  <p className="text-secondary text-sm">Milestones associated with this task's deliverables.</p>

                  <div className="selected-milestones-list margin-top-3 flex flex-wrap gap-2">
                    {Array.isArray(formData.milestones) && formData.milestones.length > 0 ? (
                      formData.milestones.map((rawId) => {
                        const milestoneId = rawId ? rawId.toString() : "";
                        const mObj =
                          (availableMilestones || []).find((m) => (m._id || "").toString() === milestoneId) ||
                          (task && Array.isArray(task.milestones) && task.milestones.find((m) => (m._id || m).toString() === milestoneId));
                        const mTitle = (typeof mObj === "object" ? mObj?.title : null) || "Milestone";
                        const mStatus = (typeof mObj === "object" ? mObj?.status : null) || "";

                        return (
                          <div
                            key={milestoneId}
                            className="selected-milestone-chip flex items-center gap-2"
                          >
                            <IconFlag size={13} className="text-primary" />
                            <div className="flex items-center gap-1">
                              <span className="milestone-chip-title">{mTitle}</span>
                              {mStatus && <span className="milestone-chip-status">{mStatus}</span>}
                            </div>
                            {canManageTask && (
                              <button
                                type="button"
                                className="btn-remove-milestone"
                                title="Remove Milestone"
                                onClick={() => handleUnlinkMilestone(milestoneId)}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="bg-light padding-3 rounded text-center text-xs text-muted w-full">
                        No milestones linked to this task yet.
                      </div>
                    )}
                  </div>
                </div>

                {canManageTask && (
                  <div className="margin-top-4 border-t padding-top-3">
                    <div className="dropdown-action-bar">
                      <div className="select-with-icon-wrapper">
                        <span className="select-lead-icon">
                          <IconFlag size={15} />
                        </span>
                        <select
                          className="custom-select select-has-icon"
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleLinkMilestone(e.target.value);
                            }
                          }}
                        >
                          <option value="">Link a milestone...</option>
                          {(availableMilestones || [])
                            .filter((m) => {
                              const mId = (m._id || "").toString();
                              return !(formData.milestones || []).map((id) => id.toString()).includes(mId);
                            })
                            .map((m) => {
                              const mId = (m._id || "").toString();
                              return (
                                <option key={mId} value={mId}>
                                  {m.title} {m.status ? `(${m.status})` : ""}
                                </option>
                              );
                            })}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Dependencies */}
              <div className="card padding-4 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center margin-bottom-2">
                    <h4 className="font-semibold text-dark">Task Dependencies</h4>
                    <span className="badge badge-secondary">
                      {Array.isArray(formData.dependencies) ? formData.dependencies.length : 0} Required
                    </span>
                  </div>
                  <p className="text-secondary text-sm">Tasks that must be completed before this task can finish.</p>

                  <div className="dependency-select-box margin-top-3">
                    {allTasks.filter((t) => t._id !== task._id).length === 0 ? (
                      <div className="bg-light padding-3 rounded text-center text-xs text-muted">
                        No other tasks available in this project yet.
                      </div>
                    ) : (
                      allTasks
                        .filter((t) => t._id !== task._id)
                        .map((t) => (
                          <label key={t._id} className="dependency-item-row">
                            <div className="dependency-item-left">
                              <input
                                type="checkbox"
                                checked={formData.dependencies.includes(t._id)}
                                onChange={() => handleDependencyToggle(t._id)}
                                disabled={!canManageTask}
                              />
                              <span className="dependency-item-title">{t.title}</span>
                            </div>
                            <span className={`badge badge-sm ${getStatusBadgeClass(t.status)}`}>
                              {t.status === "Todo" || t.status === "New Task" ? "New Task" : t.status === "Review" ? "In Review" : t.status}
                            </span>
                          </label>
                        ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Subtasks Section (Redesigned like Task Page List View) */}
            <div className="card padding-4">
              {/* Header Bar */}
              <div className="flex justify-between items-center margin-bottom-3 flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-dark text-base m-0">
                      Subtasks ({formData.subtasks?.length || 0})
                    </h4>
                    <span className="text-xs text-muted font-medium">
                      {completedSubtasksCount} of {totalSubtasksCount} completed
                    </span>
                  </div>
                  <p className="subtitle text-xs text-muted margin-top-1 m-0">
                    Track work items, assignees, priorities, and completion progress
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="subtasks-count-pill pill-todo">
                    {todoSubtasksCount} New Task
                  </span>
                  <span className="subtasks-count-pill pill-inprogress">
                    {inProgressSubtasksCount} In Progress
                  </span>
                  <span className="subtasks-count-pill pill-completed">
                    {completedSubtasksCount} Completed
                  </span>

                  {canManageTask && (
                    <button
                      type="button"
                      className="btn-primary btn-sm flex items-center gap-1 margin-left-2"
                      onClick={handleOpenCreateSubtaskModal}
                    >
                      <IconPlus size={15} /> Create Subtask
                    </button>
                  )}
                </div>
              </div>

              {/* Controls Bar: Search & Filters (similar to Task Page) */}
              <div className="task-controls-bar margin-bottom-3 flex flex-wrap items-center justify-between gap-3">
                <div className="search-input-wrapper flex-1 min-w-xs">
                  <IconSearch size={15} className="search-icon" />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search subtasks by title, description..."
                    value={subtaskSearchQuery}
                    onChange={(e) => setSubtaskSearchQuery(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    className="form-control select-compact filter-select-status"
                    value={subtaskStatusFilter}
                    onChange={(e) => setSubtaskStatusFilter(e.target.value)}
                  >
                    <option value="All">All Statuses</option>
                    <option value="New Task">New Task</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>

                  <select
                    className="form-control select-compact filter-select-priority"
                    value={subtaskPriorityFilter}
                    onChange={(e) => setSubtaskPriorityFilter(e.target.value)}
                  >
                    <option value="All">All Priorities</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Subtasks List Table (matching Task Page list view) */}
              {filteredSubtasks.length === 0 ? (
                <div className="empty-state card text-center padding-5 margin-0">
                  <div className="text-3xl margin-bottom-2">📋</div>
                  <h4 className="font-semibold text-dark margin-bottom-1">
                    {formData.subtasks?.length === 0 ? "No subtasks created yet" : "No subtasks found"}
                  </h4>
                  <p className="text-sm text-secondary margin-bottom-3">
                    {formData.subtasks?.length === 0
                      ? "Break this task into smaller actionable steps, assign them to team members, and track status."
                      : "No subtasks match your current filter or search criteria."}
                  </p>
                  {canManageTask && formData.subtasks?.length === 0 && (
                    <button
                      type="button"
                      className="btn-primary margin-top-2"
                      onClick={handleOpenCreateSubtaskModal}
                    >
                      <IconPlus size={16} /> Create Subtask
                    </button>
                  )}
                  {formData.subtasks?.length > 0 && (
                    <button
                      type="button"
                      className="btn-secondary margin-top-2"
                      onClick={() => {
                        setSubtaskSearchQuery("");
                        setSubtaskStatusFilter("All");
                        setSubtaskPriorityFilter("All");
                      }}
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="table-responsive card padding-0 margin-0">
                  <table className="projects-table">
                    <thead>
                      <tr>
                        <th style={{ minWidth: "220px" }}>Subtask Title</th>
                        <th style={{ minWidth: "140px" }}>Assignee</th>
                        <th style={{ minWidth: "100px" }}>Priority</th>
                        <th style={{ minWidth: "110px" }}>Status</th>
                        <th style={{ minWidth: "110px" }}>Due Date</th>
                        <th style={{ minWidth: "100px", textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubtasks.map((st) => {
                        const originalIndex = st._originalIndex;
                        const isDone = st.completed || st.status === "Completed";
                        const currentStatus = st.status
                          ? (st.status === "Todo" || st.status === "To Do" ? "New Task" : st.status)
                          : (isDone ? "Completed" : "New Task");
                        const currentPriority = st.priority || "Medium";
                        const currentAssignedId = (st.assignedTo?._id || st.assignedTo || "").toString();
                        const assignedMember = eligibleAssignees.find(
                          (m) => (m.user?._id || m.user || m._id || "").toString() === currentAssignedId
                        );
                        const assignedName =
                          assignedMember?.user?.name ||
                          assignedMember?.name ||
                          (typeof st.assignedTo === "object" ? st.assignedTo?.name : "") ||
                          (currentAssignedId ? "Assigned" : "");
                        const initialLetter = assignedName ? assignedName.charAt(0).toUpperCase() : "";

                        return (
                          <tr
                            key={st._id || originalIndex}
                            className={`clickable-row ${isDone ? "row-completed" : ""}`}
                            onClick={() => canManageTask && handleOpenEditSubtaskModal(originalIndex)}
                          >
                            <td className="font-semibold text-dark">
                              <div>
                                <div className={`subtask-title ${isDone ? "completed-title" : ""}`}>
                                  {st.title}
                                </div>
                                {st.description && (
                                  <div className="text-xs text-secondary line-clamp-1 font-normal margin-top-1">
                                    {st.description}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td>
                              {assignedName ? (
                                <div className="flex items-center gap-2">
                                  <div className="user-avatar-sm" title={assignedName}>
                                    {initialLetter}
                                  </div>
                                  <span className="text-sm text-dark font-medium">{assignedName}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted">Unassigned</span>
                              )}
                            </td>
                            <td>
                              <span className={`badge ${getPriorityBadgeClass(currentPriority)}`}>
                                {currentPriority}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${getStatusBadgeClass(currentStatus)}`}>
                                {currentStatus}
                              </span>
                            </td>
                            <td className="text-sm text-secondary">
                              {st.dueDate ? (
                                <div>
                                  <div className="flex items-center gap-1">
                                    <span>{new Date(st.dueDate).toLocaleDateString()}</span>
                                    {st.originalDueDate && new Date(st.dueDate).getTime() !== new Date(st.originalDueDate).getTime() && (
                                      <span className="badge badge-warning text-2xs" title={`Original due date: ${new Date(st.originalDueDate).toLocaleDateString()}`}>
                                        Extended
                                      </span>
                                    )}
                                  </div>
                                  {st.originalDueDate && new Date(st.dueDate).getTime() !== new Date(st.originalDueDate).getTime() && (
                                    <div className="text-2xs text-muted font-normal margin-top-1">
                                      Original: {new Date(st.originalDueDate).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted">—</span>
                              )}
                            </td>
                            <td onClick={(e) => e.stopPropagation()} style={{ textAlign: "right" }}>
                              <div className="flex items-center justify-end gap-1">
                                {canManageTask && (
                                  <>
                                    <button
                                      type="button"
                                      className="btn-secondary btn-sm"
                                      onClick={() => handleOpenEditSubtaskModal(originalIndex)}
                                      title="Edit Subtask"
                                    >
                                      <IconEdit size={13} /> Edit
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-secondary btn-sm text-danger"
                                      onClick={() => handleDeleteSubtask(originalIndex)}
                                      title="Delete Subtask"
                                    >
                                      <IconTrash size={13} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 5. Attachments Section (Scrollable max-height 160px) */}
            <div className="card padding-4">
              <DocumentList taskId={task._id} canManage={isManagerOrAdmin} />
            </div>

            {/* 6. Comments Section (Scrollable max-height 160px) */}
            <div className="card padding-4">
              <CommentSection taskId={task._id} currentUserId={currentUserId} title="Comments" />
            </div>
          </div>
        )}

        {activeTab === "activity" && (
          <div className="card padding-4">
            <ActivityStream taskId={task._id} />
          </div>
        )}
      </div>

      {/* Task Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Task Details"
      >
        <form onSubmit={handleSaveEditModal} className="modal-form">
          <div className="form-group margin-bottom-3">
            <label className="font-semibold text-dark text-sm">Task Title *</label>
            <input
              type="text"
              className="form-control"
              value={editModalData.title}
              onChange={(e) => setEditModalData({ ...editModalData, title: e.target.value })}
              required
              placeholder="Task title..."
            />
          </div>

          <div className="form-group margin-bottom-3">
            <label className="font-semibold text-dark text-sm">Description</label>
            <textarea
              className="form-control"
              rows="3"
              value={editModalData.description}
              onChange={(e) => setEditModalData({ ...editModalData, description: e.target.value })}
              placeholder="Detailed task description..."
            />
          </div>

          <div className="grid-2 gap-3 margin-bottom-3">
            <div className="form-group">
              <label className="font-semibold text-dark text-sm">Status</label>
              <select
                className="custom-select"
                value={editModalData.status}
                onChange={(e) => setEditModalData({ ...editModalData, status: e.target.value })}
              >
                <option value="New Task">New Task</option>
                <option value="In Progress">In Progress</option>
                <option value="Review">Review</option>
                <option value="Completed">Completed</option>
                <option value="Hold">Hold</option>
              </select>
            </div>

            <div className="form-group">
              <label className="font-semibold text-dark text-sm">Priority</label>
              <select
                className="custom-select"
                value={editModalData.priority}
                onChange={(e) => setEditModalData({ ...editModalData, priority: e.target.value })}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="form-group margin-bottom-4">
            <label className="font-semibold text-dark text-sm">Target Due Date</label>
            <input
              type="date"
              className="form-control"
              min={new Date().toISOString().split("T")[0]}
              value={editModalData.dueDate}
              onChange={(e) => setEditModalData({ ...editModalData, dueDate: e.target.value })}
            />
            {task.originalDueDate && (
              <div className="text-2xs text-muted margin-top-1">
                Original target date: {new Date(task.originalDueDate).toLocaleDateString()}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t padding-top-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create / Edit Subtask Modal Dialog */}
      <Modal
        isOpen={isSubtaskModalOpen}
        onClose={() => setIsSubtaskModalOpen(false)}
        title={editingSubtaskIndex !== null ? "Edit Subtask" : "Create Subtask"}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveSubtaskModal} className="modal-form">
          <div className="form-group margin-bottom-3">
            <label className="font-semibold text-dark text-sm">
              Subtask Title <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="What needs to be done? e.g. Implement user login API endpoint"
              value={subtaskFormData.title}
              onChange={(e) => setSubtaskFormData({ ...subtaskFormData, title: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div className="form-group margin-bottom-3">
            <label className="font-semibold text-dark text-sm">Description</label>
            <textarea
              className="form-control"
              rows="3"
              placeholder="Provide additional context, specifications, or notes..."
              value={subtaskFormData.description}
              onChange={(e) => setSubtaskFormData({ ...subtaskFormData, description: e.target.value })}
            />
          </div>

          <div className="grid-2 gap-3 margin-bottom-3">
            <div className="form-group">
              <label className="font-semibold text-dark text-sm">Assignee</label>
              <div className="select-with-icon-wrapper">
                <span className="select-lead-icon">
                  <IconUser size={15} />
                </span>
                <select
                  className="custom-select select-has-icon"
                  value={subtaskFormData.assignedTo}
                  onChange={(e) => setSubtaskFormData({ ...subtaskFormData, assignedTo: e.target.value })}
                >
                  <option value="">Unassigned</option>
                  {eligibleAssignees.map((m) => {
                    const uId = (m.user?._id || m.user || m._id || "").toString();
                    const uName = m.user?.name || m.name || "Member";
                    const uRole = m.role || m.permissionRole || "Member";
                    return (
                      <option key={uId} value={uId}>
                        {uName} ({uRole})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="font-semibold text-dark text-sm">Due Date</label>
              <div className="select-with-icon-wrapper">
                <span className="select-lead-icon">
                  <IconCalendar size={15} />
                </span>
                <input
                  type="date"
                  className="form-control select-has-icon"
                  value={subtaskFormData.dueDate}
                  onChange={(e) => setSubtaskFormData({ ...subtaskFormData, dueDate: e.target.value })}
                />
              </div>
              {editingSubtaskIndex !== null && formData.subtasks?.[editingSubtaskIndex]?.originalDueDate && (
                <div className="text-2xs text-muted margin-top-1">
                  Original target date: {new Date(formData.subtasks[editingSubtaskIndex].originalDueDate).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          <div className="grid-2 gap-3 margin-bottom-4">
            <div className="form-group">
              <label className="font-semibold text-dark text-sm">Priority</label>
              <div className="select-with-icon-wrapper">
                <span className="select-lead-icon">
                  <IconFlag size={15} />
                </span>
                <select
                  className="custom-select select-has-icon"
                  value={subtaskFormData.priority}
                  onChange={(e) => setSubtaskFormData({ ...subtaskFormData, priority: e.target.value })}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="font-semibold text-dark text-sm">Status</label>
              <div className="select-with-icon-wrapper">
                <span className="select-lead-icon">
                  <IconCheck size={15} />
                </span>
                <select
                  className="custom-select select-has-icon"
                  value={subtaskFormData.status}
                  onChange={(e) => setSubtaskFormData({ ...subtaskFormData, status: e.target.value })}
                >
                  <option value="New Task">New Task</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t padding-top-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsSubtaskModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center gap-1"
              disabled={!subtaskFormData.title.trim()}
            >
              <IconCheck size={16} />
              <span>{editingSubtaskIndex !== null ? "Save Changes" : "Create Subtask"}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
