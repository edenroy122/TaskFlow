import React, { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { api } from "../api";
import { IconUser, IconCalendar, IconEye, IconPlus, IconTrash, IconFlag, IconCheck } from "./Icons";
import { DocumentList } from "./DocumentList";
import { CommentSection } from "./CommentSection";
import { ActivityStream } from "./ActivityStream";
import { ApprovalSection } from "./ApprovalSection";

export const TaskModal = ({
  isOpen,
  onClose,
  task,
  projectId,
  projectMembers,
  allTasks,
  currentUserId,
  isManagerOrAdmin,
  onTaskUpdated,
  projectMilestones,
}) => {
  const [activeTab, setActiveTab] = useState("details"); // "details" | "documents" | "comments" | "activity" | "approval"
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [availableMilestones, setAvailableMilestones] = useState(projectMilestones || []);

  useEffect(() => {
    if (isOpen && projectId) {
      api.getMilestones(projectId)
        .then((res) => {
          setAvailableMilestones(res.milestones || []);
        })
        .catch((err) => {
          console.error("Failed to fetch project milestones:", err);
        });
    }
  }, [isOpen, projectId]);

  useEffect(() => {
    if (task) {
      let initialAssigned = [];
      if (Array.isArray(task.assignedTo)) {
        initialAssigned = task.assignedTo.map((u) => (u._id || u).toString());
      } else if (task.assignedTo) {
        initialAssigned = [(task.assignedTo._id || task.assignedTo).toString()];
      }

      let initialMilestones = [];
      if (Array.isArray(task.milestones)) {
        initialMilestones = task.milestones.map((m) => (m._id || m).toString());
      } else if (task.milestones) {
        initialMilestones = [(task.milestones._id || task.milestones).toString()];
      }

      setFormData({
        title: task.title || "",
        description: task.description || "",
        assignedTo: initialAssigned,
        priority: task.priority || "Medium",
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "",
        dependencies: task.dependencies ? task.dependencies.map((d) => d._id || d) : [],
        milestones: initialMilestones,
        subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
      });
      setStatus(task.status === "Todo" || task.status === "To Do" ? "New Task" : (task.status || "New Task"));
      fetchWatchers(task._id);
    } else {
      setFormData({
        title: "",
        description: "",
        assignedTo: [],
        priority: "Medium",
        dueDate: "",
        dependencies: [],
        milestones: [],
        subtasks: [],
      });
      setStatus("New Task");
      setWatchers([]);
    }
    setError("");
  }, [task, isOpen]);

  const fetchWatchers = async (taskId) => {
    try {
      const res = await api.getTaskWatchers(taskId);
      setWatchers(res.watchers || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    if (formData.dueDate) {
      const d = new Date(formData.dueDate);
      if (isNaN(d.getTime())) {
        setError("Please select a valid due date!");
        return;
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (!task && d < today) {
        setError("Task due date cannot be in the past!");
        return;
      }
    }
    setLoading(true);

    try {
      if (task) {
        await api.updateTask(task._id, formData);
        if (status !== task.status) {
          await api.updateTaskStatus(task._id, status);
        }
      } else {
        await api.createTask(projectId, formData);
      }
      onTaskUpdated();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save task");
    } finally {
      setLoading(false);
    }
  };

  const handleAddWatcher = async () => {
    if (!newWatcherUserId || !task) return;
    try {
      const res = await api.addWatcher(task._id, newWatcherUserId);
      setWatchers(res.watchers || []);
      setNewWatcherUserId("");
    } catch (err) {
      alert(err.message || "Failed to add watcher");
    }
  };

  const handleRemoveWatcher = async (userId) => {
    if (!task) return;
    try {
      await api.removeWatcher(task._id, userId);
      fetchWatchers(task._id);
    } catch (err) {
      alert(err.message || "Failed to remove watcher");
    }
  };

  const handleDependencyToggle = (depTaskId) => {
    setFormData((prev) => {
      const current = prev.dependencies;
      if (current.includes(depTaskId)) {
        return { ...prev, dependencies: current.filter((id) => id !== depTaskId) };
      } else {
        return { ...prev, dependencies: [...current, depTaskId] };
      }
    });
  };

  const getStatusBadgeClass = (s) => {
    switch (s?.toLowerCase()) {
      case "completed": return "badge-success";
      case "in progress": return "badge-accent";
      case "in review": case "review": return "badge-warning";
      case "hold": case "blocked": return "badge-danger";
      default: return "badge-secondary";
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task ? `Task: ${task.title}` : "Create New Task"}
      maxWidth="max-w-2xl"
    >
      {error && <div className="alert-error margin-bottom-3">{error}</div>}

      {task && (
        <div className="tab-buttons-bar margin-bottom-3">
          <button
            className={`tab-btn ${activeTab === "details" ? "active" : ""}`}
            onClick={() => setActiveTab("details")}
          >
            Task Details
          </button>
          <button
            className={`tab-btn ${activeTab === "documents" ? "active" : ""}`}
            onClick={() => setActiveTab("documents")}
          >
            Attachments
          </button>
          <button
            className={`tab-btn ${activeTab === "comments" ? "active" : ""}`}
            onClick={() => setActiveTab("comments")}
          >
            Comments
          </button>

          {/* <button
            className={`tab-btn ${activeTab === "approval" ? "active" : ""}`}
            onClick={() => setActiveTab("approval")}
          >
            Approval
          </button> */}
          
          <button
            className={`tab-btn ${activeTab === "activity" ? "active" : ""}`}
            onClick={() => setActiveTab("activity")}
          >
            Activity Audit
          </button>
        </div>
      )}

      {activeTab === "details" ? (
        <form onSubmit={handleSave} className="modal-form">
          <div className="form-group">
            <label>Task Title</label>
            <input
              type="text"
              placeholder="e.g. Implement OAuth logic"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              rows="3"
              placeholder="Detailed description of task..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="New Task">New Task</option>
                <option value="In Progress">In Progress</option>
                <option value="Review">Review</option>
                <option value="Completed">Completed</option>
                <option value="Hold">Hold</option>
              </select>
            </div>

            <div className="form-group">
              <label>Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid-2 gap-3 margin-top-3">
            <div className="form-group">
              <div className="flex items-center justify-between margin-bottom-1">
                <label className="font-semibold text-dark text-sm">Assign To</label>
                <span className="count-pill">
                  {Array.isArray(formData.assignedTo) ? formData.assignedTo.length : 0} selected
                </span>
              </div>

              <div className="form-group">
                <select
                  className="form-control"
                  value=""
                  onChange={(e) => {
                    const uId = e.target.value ? e.target.value.toString() : "";
                    if (!uId) return;
                    const current = Array.isArray(formData.assignedTo) ? formData.assignedTo.map((id) => id.toString()) : [];
                    if (!current.includes(uId)) {
                      setFormData({ ...formData, assignedTo: [...current, uId] });
                    }
                  }}
                >
                  <option value="">-- Select Member to Assign --</option>
                  {(projectMembers || [])
                    .filter((m) => {
                      const role = m.role || "";
                      const clean = role.toString().toLowerCase().replace(/[\s_-]+/g, "");
                      return !clean.includes("stakeholder");
                    })
                    .map((m) => {
                      const uId = (m.user?._id || m.user || m._id || "").toString();
                      const uName = m.user?.name || m.name || "Member";
                      const uEmail = m.user?.email ? ` (${m.user.email})` : (m.email ? ` (${m.email})` : "");
                      const uRole = m.role ? ` — ${m.role}` : "";
                      const isSelected = Array.isArray(formData.assignedTo) && formData.assignedTo.some((id) => id.toString() === uId);

                      return (
                        <option key={uId} value={uId} disabled={isSelected}>
                          {uName}{uEmail}{uRole} {isSelected ? "✓ (Selected)" : ""}
                        </option>
                      );
                    })}
                </select>
                {(projectMembers || []).filter((m) => {
                  const role = m.role || "";
                  const clean = role.toString().toLowerCase().replace(/[\s_-]+/g, "");
                  return !clean.includes("stakeholder");
                }).length === 0 && (
                  <p className="text-2xs text-muted margin-top-1">
                    No assignable members in project. Add team members from the Project Team tab.
                  </p>
                )}
              </div>

              {/* Display Selected Assignees Below */}
              <div className="selected-assignees-list flex flex-wrap gap-2 margin-top-2">
                {Array.isArray(formData.assignedTo) && formData.assignedTo.length > 0 ? (
                  formData.assignedTo.map((rawId) => {
                    const userId = rawId ? rawId.toString() : "";
                    const memberObj = (projectMembers || []).find((m) => {
                      const mId = (m.user?._id || m.user || m._id || "").toString();
                      return mId === userId;
                    });
                    let fallbackObj = null;
                    if (task && Array.isArray(task.assignedTo)) {
                      fallbackObj = task.assignedTo.find((u) => (u._id || u).toString() === userId);
                    } else if (task && task.assignedTo && (task.assignedTo._id || task.assignedTo).toString() === userId) {
                      fallbackObj = task.assignedTo;
                    }

                    const uName = memberObj?.user?.name || (typeof fallbackObj === "object" ? fallbackObj?.name : null) || "Selected Member";
                    const uRole = memberObj?.role || "Member";

                    return (
                      <div
                        key={userId}
                        className="selected-assignee-chip flex items-center gap-2 bg-light border padding-x-2 padding-y-1 rounded text-xs"
                      >
                        <div className="user-avatar-sm">
                          {uName[0].toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-dark text-xs">{uName}</span>
                          <span className="text-secondary text-2xs">{uRole}</span>
                        </div>
                        <button
                          type="button"
                          className="btn-icon-danger btn-sm text-xs border-0 bg-transparent text-danger margin-left-1 cursor-pointer"
                          title="Remove Assignee"
                          onClick={() => {
                            const updated = formData.assignedTo.filter((id) => id && id.toString() !== userId);
                            setFormData({ ...formData, assignedTo: updated });
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <span className="text-xs text-muted">No assignees selected yet. Select a member above.</span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="font-semibold text-dark text-sm display-block margin-bottom-1">Due Date</label>
              <input
                type="date"
                className="form-control"
                min={new Date().toISOString().split("T")[0]}
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
              {task?.originalDueDate && (
                <div className="text-2xs text-muted margin-top-1">
                  Original target date: {new Date(task.originalDueDate).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          {/* Milestone Selection (Link one or more milestones) */}
          <div className="form-group margin-top-3">
            <div className="flex items-center justify-between margin-bottom-1">
              <label className="font-semibold text-dark text-sm flex items-center gap-1">
                <IconFlag size={15} className="text-primary" />
                <span>Link Milestone(s)</span>
              </label>
              <span className="count-pill">
                {Array.isArray(formData.milestones) ? formData.milestones.length : 0} selected
              </span>
            </div>

            <select
              className="form-control"
              value=""
              onChange={(e) => {
                const mId = e.target.value ? e.target.value.toString() : "";
                if (!mId) return;
                const current = Array.isArray(formData.milestones) ? formData.milestones.map((id) => id.toString()) : [];
                if (!current.includes(mId)) {
                  setFormData({ ...formData, milestones: [...current, mId] });
                }
              }}
            >
              <option value="">-- Select Milestone from list --</option>
              {(availableMilestones || []).map((m) => {
                const mId = (m._id || "").toString();
                const isSelected = Array.isArray(formData.milestones) && formData.milestones.some((id) => id.toString() === mId);
                return (
                  <option key={mId} value={mId} disabled={isSelected}>
                    {m.title} {m.status ? `(${m.status})` : ""} {isSelected ? "✓ (Selected)" : ""}
                  </option>
                );
              })}
            </select>

            {/* Display Selected Milestones Down of Dropdown */}
            <div className="selected-milestones-list flex flex-wrap gap-2 margin-top-2">
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
                      <button
                        type="button"
                        className="btn-remove-milestone"
                        title="Remove Milestone"
                        onClick={() => {
                          const updated = formData.milestones.filter((id) => id && id.toString() !== milestoneId);
                          setFormData({ ...formData, milestones: updated });
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })
              ) : (
                <span className="text-xs text-muted">No milestones selected yet. Select a milestone above to link.</span>
              )}
            </div>

            {availableMilestones.length === 0 && (
              <p className="text-2xs text-muted margin-top-1">
                No milestones found in this project. You can create milestones in the Milestones tab.
              </p>
            )}
          </div>

          {/* Dependencies */}
          {allTasks && (
            <div className="form-group margin-top-3">
              <label className="font-semibold text-dark text-sm">Dependencies (Must complete first)</label>
              <div className="dependency-select-box">
                {allTasks.filter((t) => !task || t._id !== task._id).length === 0 ? (
                  <p className="text-secondary text-xs padding-y-2">No other tasks available in this project yet.</p>
                ) : (
                  allTasks
                    .filter((t) => !task || t._id !== task._id)
                    .map((t) => (
                      <label key={t._id} className="dependency-item-row">
                        <div className="dependency-item-left">
                          <input
                            type="checkbox"
                            checked={formData.dependencies.includes(t._id)}
                            onChange={() => handleDependencyToggle(t._id)}
                          />
                          <span className="dependency-item-title">{t.title}</span>
                        </div>
                        <span className={`badge badge-sm ${getStatusBadgeClass(t.status)}`}>
                          {t.status === "Todo" ? "To Do" : t.status === "Review" ? "In Review" : t.status}
                        </span>
                      </label>
                    ))
                )}
              </div>
            </div>
          )}

          <div className="modal-actions margin-top-4">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Saving..." : task ? "Save Changes" : "Create Task"}
            </button>
          </div>
        </form>
      ) : activeTab === "documents" ? (
        <DocumentList taskId={task._id} canManage={isManagerOrAdmin} />
      ) : activeTab === "comments" ? (
        <CommentSection taskId={task._id} currentUserId={currentUserId} />
      ) : activeTab === "approval" ? (
        <ApprovalSection taskId={task._id} isManagerOrAdmin={isManagerOrAdmin} onStatusUpdated={onTaskUpdated} />
      ) : (
        <ActivityStream taskId={task._id} />
      )}
    </Modal>
  );
};
