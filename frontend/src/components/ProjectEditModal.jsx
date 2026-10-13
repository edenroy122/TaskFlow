import React, { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { api } from "../api";

export function ProjectEditModal({ isOpen, onClose, project, workspaceMembers, onProjectUpdated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [manager, setManager] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name || "");
      setDescription(project.description || "");
      setStartDate(project.startDate ? new Date(project.startDate).toISOString().split("T")[0] : "");
      setDueDate(project.dueDate ? new Date(project.dueDate).toISOString().split("T")[0] : "");
      setManager(project.manager?._id || project.manager || "");
    }
  }, [project]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!project?._id) return;
    if (startDate && isNaN(new Date(startDate).getTime())) {
      alert("Please select a valid start date!");
      return;
    }
    if (dueDate && isNaN(new Date(dueDate).getTime())) {
      alert("Please select a valid target due date!");
      return;
    }
    if (startDate && dueDate && new Date(dueDate) < new Date(startDate)) {
      alert("Due date cannot be before start date!");
      return;
    }
    setLoading(true);
    try {
      await api.updateProject(project._id, {
        name,
        description,
        startDate: startDate || undefined,
        dueDate: dueDate || undefined,
      });
      onClose();
      if (onProjectUpdated) onProjectUpdated();
    } catch (err) {
      alert(err.message || "Failed to update project");
    } finally {
      setLoading(false);
    }
  };

  const productOwnerName = project?.manager?.name || project?.createdBy?.name || "Product Owner";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Project Details">
      <form onSubmit={handleSubmit} className="modal-form">
        <div className="form-group">
          <label>Project Name *</label>
          <input
            type="text"
            className="form-control"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            className="form-control"
            rows="3"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Project summary and scope..."
          />
        </div>

        <div className="form-group margin-top-3">
          <label>Product Owner (Cannot be changed)</label>
          <input
            type="text"
            className="form-control bg-light"
            value={productOwnerName}
            disabled
            readOnly
          />
        </div>

        <div className="grid-2 gap-3 margin-top-3">
          <div className="form-group">
            <label>Start Date</label>
            <input
              type="date"
              className="form-control"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Due Date</label>
            <input
              type="date"
              className="form-control"
              value={dueDate}
              min={startDate || undefined}
              onChange={(e) => setDueDate(e.target.value)}
            />
            {project?.originalDueDate && (
              <div className="text-2xs text-muted margin-top-1">
                Original target date: {new Date(project.originalDueDate).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        <div className="modal-actions margin-top-4 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
