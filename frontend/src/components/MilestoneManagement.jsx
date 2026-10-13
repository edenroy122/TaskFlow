import React, { useState, useEffect } from "react";
import { api } from "../api";
import { Modal } from "./Modal";
import {
  IconPlus,
  IconSparkles,
  IconCalendar,
  IconTrash,
  IconSearch
} from "./Icons";

export function MilestoneManagement({ projectId, project, userRole, isProjectManager, onProjectUpdated }) {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("Not Started");

  const canManage = (userRole === "Product Owner" || userRole === "Product Manager" || userRole === "Owner" || userRole === "Admin" || userRole === "Project Manager" || isProjectManager) && userRole !== "Scrum Master";

  const loadMilestones = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await api.getMilestones(projectId);
      setMilestones(res.milestones || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMilestones();
  }, [projectId]);

  const handleOpenCreate = () => {
    setEditingMilestone(null);
    setTitle("");
    setDescription("");
    setDueDate("");
    setStatus("Not Started");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m) => {
    setEditingMilestone(m);
    setTitle(m.title || "");
    setDescription(m.description || "");
    setDueDate(m.dueDate ? new Date(m.dueDate).toISOString().split("T")[0] : "");
    setStatus(m.status || "Not Started");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dueDate && isNaN(new Date(dueDate).getTime())) {
      alert("Please select a valid target due date!");
      return;
    }

    if (!editingMilestone && dueDate && new Date(dueDate) < today) {
      alert("Milestone due date cannot be in the past!");
      return;
    }

    if (dueDate && project?.startDate && new Date(dueDate) < new Date(project.startDate)) {
      alert(`Milestone due date cannot be before project start date (${new Date(project.startDate).toLocaleDateString()})!`);
      return;
    }

    try {
      const calculatedProgress = status === "Completed" ? 100 : status === "In Progress" ? 50 : 0;
      const payload = {
        title,
        description,
        dueDate: dueDate || undefined,
        status,
        progress: calculatedProgress
      };
      if (editingMilestone) {
        await api.updateMilestone(editingMilestone._id, payload);
      } else {
        await api.createMilestone(projectId, payload);
      }
      setIsModalOpen(false);
      loadMilestones();
      if (onProjectUpdated) onProjectUpdated();
    } catch (err) {
      alert(err.message || "Failed to save milestone");
    }
  };

  const handleDelete = async (milestoneId) => {
    if (!window.confirm("Are you sure you want to delete this milestone?")) return;
    try {
      await api.deleteMilestone(milestoneId);
      loadMilestones();
    } catch (err) {
      alert(err.message || "Failed to delete milestone");
    }
  };

  const getStatusBadgeClass = (st) => {
    switch (st) {
      case "Completed": return "badge-success";
      case "In Progress": return "badge-accent";
      default: return "badge-secondary";
    }
  };

  const completedCount = milestones.filter((m) => m.status === "Completed").length;
  const inProgressCount = milestones.filter((m) => m.status === "In Progress").length;
  const notStartedCount = milestones.filter((m) => m.status === "Not Started").length;

  const filteredMilestones = milestones.filter((m) => {
    const matchesSearch =
      m.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="milestones-container view-container">
      {/* Header Bar */}
      <div className="view-header flex justify-between items-center flex-wrap gap-3 margin-bottom-4">
        <div>
          <h2 className="text-xl font-bold text-dark flex items-center gap-2">
            <IconSparkles className="text-primary" size={22} />
            <span>Project Milestones & Key Deliverables</span>
          </h2>
          <p className="subtitle">Track major project phases, target dates, and deliverables</p>
        </div>
        {canManage && (
          <button className="btn-primary" onClick={handleOpenCreate}>
            <IconPlus size={16} /> Create Milestone
          </button>
        )}
      </div>

      {/* Analytics Summary Banner */}
      {milestones.length > 0 && (
        <div className="grid-4 gap-3 margin-bottom-4">
          <div className="milestone-stat-card">
            <div className="stat-label">Total Milestones</div>
            <div className="stat-value text-dark">{milestones.length}</div>
          </div>
          <div className="milestone-stat-card border-success-light">
            <div className="stat-label">Completed</div>
            <div className="stat-value text-success">{completedCount}</div>
          </div>
          <div className="milestone-stat-card border-primary-light">
            <div className="stat-label">In Progress</div>
            <div className="stat-value text-primary">{inProgressCount}</div>
          </div>
          <div className="milestone-stat-card border-secondary-light">
            <div className="stat-label">Not Started</div>
            <div className="stat-value text-secondary">{notStartedCount}</div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      {milestones.length > 0 && (
        <div className="controls-bar margin-bottom-4 flex gap-3">
          <div className="search-input-wrapper flex-1">
            <IconSearch size={16} className="search-icon" />
            <input
              type="text"
              className="form-control"
              placeholder="Search milestones by title or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-spinner">Loading project milestones...</div>
      ) : filteredMilestones.length === 0 ? (
        <div className="empty-state card padding-5 text-center">
          <IconSparkles size={44} className="empty-icon text-muted margin-x-auto margin-bottom-2" />
          <h3 className="font-bold text-dark text-lg">No milestones found</h3>
          <p className="text-secondary text-sm max-w-md margin-x-auto margin-top-1">
            {milestones.length === 0
              ? "Define project phases, target deliverables, and release dates to keep your team aligned."
              : "No milestones match your search term."}
          </p>
          {canManage && milestones.length === 0 && (
            <button className="btn-primary margin-top-4" onClick={handleOpenCreate}>
              <IconPlus size={16} /> Create First Milestone
            </button>
          )}
        </div>
      ) : (
        /* Project Page Style Table */
        <div className="table-responsive card padding-0">
          <table className="projects-table">
            <thead>
              <tr>
                <th>Milestone Name</th>
                <th>Status</th>
                <th>Target Due Date</th>
                {canManage && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredMilestones.map((m) => (
                <tr key={m._id}>
                  <td className="font-semibold text-dark">
                    <div className="flex items-center gap-3">
                      <div className="project-icon-avatar">
                        <IconSparkles size={18} className="text-primary" />
                      </div>
                      <div>
                        <div className="text-base font-semibold">{m.title}</div>
                        {m.description && (
                          <div className="text-xs text-secondary line-clamp-1 font-normal margin-top-1">
                            {m.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadgeClass(m.status)}`}>
                      {m.status || "Not Started"}
                    </span>
                  </td>
                  <td className="text-secondary text-sm font-medium">
                    {m.dueDate ? (
                      <div>
                        <div className="flex items-center gap-1">
                          <span>{new Date(m.dueDate).toLocaleDateString()}</span>
                          {m.originalDueDate && new Date(m.dueDate).getTime() !== new Date(m.originalDueDate).getTime() && (
                            <span className="badge badge-warning text-2xs" title={`Original target date: ${new Date(m.originalDueDate).toLocaleDateString()}`}>
                              Extended
                            </span>
                          )}
                        </div>
                        {m.originalDueDate && new Date(m.dueDate).getTime() !== new Date(m.originalDueDate).getTime() && (
                          <div className="text-2xs text-muted font-normal margin-top-1">
                            Original: {new Date(m.originalDueDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted">No Target Date</span>
                    )}
                  </td>
                  {canManage && (
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          className="btn-icon btn-sm"
                          title="Edit Milestone"
                          onClick={() => handleOpenEdit(m)}
                        >
                          ✎
                        </button>
                        <button
                          className="btn-icon btn-sm text-danger"
                          title="Delete Milestone"
                          onClick={() => handleDelete(m._id)}
                        >
                          <IconTrash size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Milestone Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMilestone ? "Edit Milestone" : "Create New Milestone"}
      >
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Milestone Title *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Phase 1 — Authentication & Security"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              className="form-control"
              rows="3"
              placeholder="Overview of deliverables included in this milestone..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid-2 gap-3">
            <div className="form-group">
              <label>Status</label>
              <select
                className="form-control"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div className="form-group">
              <label>Target Due Date</label>
              <input
                type="date"
                className="form-control"
                value={dueDate}
                min={project?.startDate ? new Date(project.startDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]}
                onChange={(e) => setDueDate(e.target.value)}
              />
              {editingMilestone?.originalDueDate && (
                <div className="text-2xs text-muted margin-top-1">
                  Original target date: {new Date(editingMilestone.originalDueDate).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          <div className="modal-actions margin-top-4 flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingMilestone ? "Save Changes" : "Create Milestone"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
