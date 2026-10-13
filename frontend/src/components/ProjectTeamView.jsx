import React, { useState, useEffect } from "react";
import { api } from "../api";
import { Modal } from "./Modal";
import { IconPlus, IconSearch, IconUser, IconTrash } from "./Icons";

export function ProjectTeamView({ projectId, workspaceId, userRole, isProjectManager }) {
  const [members, setMembers] = useState([]);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);

  // Add Member Form
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("Member");

  const canManage =
    userRole === "Product Owner" ||
    userRole === "Product Manager" ||
    userRole === "Owner" ||
    userRole === "Admin" ||
    isProjectManager;

  const loadData = async () => {
    if (!projectId || !workspaceId) return;
    setLoading(true);
    try {
      const [pmRes, wsRes] = await Promise.all([
        api.getProjectMembers(projectId),
        api.getWorkspaceMembers(workspaceId)
      ]);
      setMembers(pmRes.members || []);
      setWorkspaceMembers(wsRes.members || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId, workspaceId]);

  const handleUserSelection = (userId) => {
    setSelectedUserId(userId);
    const selectedWm = workspaceMembers.find(
      (wm) => (wm.user._id || wm.user) === userId
    );
    if (selectedWm) {
      setSelectedRole(selectedWm.permissionRole || "Member");
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!selectedUserId) return;
    try {
      await api.addProjectMember(projectId, selectedUserId, selectedRole);
      setIsAddModalOpen(false);
      setSelectedUserId("");
      setSelectedRole("Member");
      loadData();
    } catch (err) {
      alert(err.message || "Failed to add project member");
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.updateProjectMember(projectId, userId, newRole);
      loadData();
    } catch (err) {
      alert(err.message || "Failed to update project role");
    }
  };

  const handleConfirmRemove = async () => {
    if (!memberToRemove) return;
    try {
      await api.removeProjectMember(projectId, memberToRemove.user._id || memberToRemove.user);
      setMemberToRemove(null);
      loadData();
    } catch (err) {
      alert(err.message || "Failed to remove member");
    }
  };

  // Find workspace jobRole for a user
  const getUserJobRole = (userId) => {
    const wsM = workspaceMembers.find((wm) => (wm.user._id || wm.user) === userId);
    if (!wsM || !wsM.jobRole) return "N/A";
    return wsM.jobRole === "Other" ? "Others" : wsM.jobRole;
  };

  const filteredMembers = members.filter((m) => {
    const uName = m.user?.name || "";
    const uEmail = m.user?.email || "";
    const roleName = m.role === "Project Manager" ? "Product Owner" : m.role;
    const matchesSearch = uName.toLowerCase().includes(searchTerm.toLowerCase()) || uEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || roleName?.toLowerCase() === roleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });

  // Filter available workspace members to add
  const availableWorkspaceUsers = workspaceMembers.filter((wm) => {
    const wmUserId = wm.user._id || wm.user;
    return !members.some((pm) => (pm.user._id || pm.user) === wmUserId);
  });

  const getRoleBadgeClass = (r) => {
    switch (r) {
      case "Product Owner":
      case "Product Manager":
      case "Owner": return "badge-warning";
      case "Scrum Master":
      case "Project Manager": return "badge-primary";
      case "Member": return "badge-accent";
      case "Stakeholder":
      case "Stake holder":
      case "Watcher": return "badge-secondary";
      default: return "badge-secondary";
    }
  };

  return (
    <div className="project-team-container">
      {/* Header */}
      <div className="flex justify-between items-center margin-bottom-4">
        <div>
          <h3>Project Team Members ({members.length})</h3>
          <p className="subtitle">Collaborators, assigned developers, and project watchers</p>
        </div>
        {canManage && (
          <button className="btn-primary" onClick={() => setIsAddModalOpen(true)}>
            <IconPlus size={16} /> Add Team Member
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="controls-bar margin-bottom-4 flex gap-3">
        <div className="search-input-wrapper flex-1">
          <IconSearch size={16} className="search-icon" />
          <input
            type="text"
            className="form-control"
            placeholder="Search members by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="form-control select-compact"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="all">All Roles</option>
          <option value="product owner">Product Owner</option>
          <option value="scrum master">Scrum Master</option>
          <option value="member">Member</option>
          <option value="stakeholder">Stakeholder</option>
        </select>
      </div>

      {/* Members List Table */}
      {loading ? (
        <div className="loading-state">Loading project members...</div>
      ) : filteredMembers.length === 0 ? (
        <div className="empty-state card">
          <IconUser size={36} className="empty-icon text-muted" />
          <h4>No team members match your criteria</h4>
        </div>
      ) : (
        <div className="table-responsive card padding-0">
          <table className="projects-table">
            <thead>
              <tr>
                <th>Member Name</th>
                <th>Project Role</th>
                <th>Job Role</th>
                {canManage && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((m) => {
                const uId = m.user?._id || m.user;
                const uName = m.user?.name || "Unknown User";
                const uEmail = m.user?.email || "";
                const displayRole = m.role === "Project Manager" ? "Product Owner" : (m.role || "Member");
                const jobRole = displayRole === "Member" ? getUserJobRole(uId) : "N/A";
                const isPO = displayRole === "Product Owner" || m.role === "Owner";

                return (
                  <tr key={m._id || uId}>
                    <td className="font-semibold text-dark">
                      <div className="flex items-center gap-3">
                        <div className="user-avatar-md">
                          {uName[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-base font-semibold">{uName}</div>
                          <div className="text-xs text-secondary font-normal">{uEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {canManage && !isPO ? (
                        <select
                          className="form-control select-compact"
                          value={displayRole}
                          onChange={(e) => handleRoleChange(uId, e.target.value)}
                        >
                          <option value="Product Owner">Product Owner</option>
                          <option value="Scrum Master">Scrum Master</option>
                          <option value="Member">Member</option>
                          <option value="Stakeholder">Stakeholder</option>
                        </select>
                      ) : (
                        <span className={`badge ${getRoleBadgeClass(displayRole)}`}>
                          {displayRole}
                        </span>
                      )}
                    </td>
                    <td>
                      {jobRole !== "N/A" ? (
                        <span className="badge badge-outline">{jobRole}</span>
                      ) : (
                        <span className="text-secondary text-sm">—</span>
                      )}
                    </td>
                    {canManage && (
                      <td>
                        {!isPO ? (
                          <button
                            className="btn-secondary btn-sm text-danger"
                            onClick={() => setMemberToRemove(m)}
                          >
                            Remove
                          </button>
                        ) : (
                          <span className="text-muted text-xs">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Member Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Member to Project"
      >
        <form onSubmit={handleAddMember} className="modal-form">
          <div className="form-group">
            <label>Select Space Member *</label>
            {availableWorkspaceUsers.length === 0 ? (
              <p className="text-secondary text-sm">All space members are already added to this project.</p>
            ) : (
              <select
                className="form-control"
                value={selectedUserId}
                onChange={(e) => handleUserSelection(e.target.value)}
                required
              >
                <option value="">-- Choose Member --</option>
                {availableWorkspaceUsers.map((wm) => (
                  <option key={wm.user._id || wm.user} value={wm.user._id || wm.user}>
                    {wm.user.name} ({wm.user.email}) — {wm.permissionRole}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group margin-top-3">
            <label>Project Permission Role *</label>
            <select
              className="form-control"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              required
            >
              <option value="Product Owner">Product Owner</option>
              <option value="Scrum Master">Scrum Master</option>
              <option value="Member">Member</option>
              <option value="Stakeholder">Stakeholder</option>
            </select>
          </div>

          <div className="modal-actions margin-top-4 flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!selectedUserId || availableWorkspaceUsers.length === 0}
            >
              Add to Project
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Modal for Member Removal */}
      <Modal
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        title="Remove Member from Project?"
      >
        <div className="padding-y-2">
          <p className="text-dark">
            Are you sure you want to remove <strong>{memberToRemove?.user?.name}</strong> from this project?
          </p>
          <p className="text-secondary text-sm margin-top-2">
            This action only removes their access to this project. The user will remain in the space.
          </p>

          <div className="modal-actions margin-top-4 flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setMemberToRemove(null)}>
              Cancel
            </button>
            <button className="btn-primary btn-danger" onClick={handleConfirmRemove}>
              Remove Member
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
