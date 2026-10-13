import React, { useState, useEffect } from "react";
import { api } from "../api";
import { IconUsers, IconPlus, IconTrash, IconSearch, IconSparkles } from "./Icons";

export const WorkspaceMembers = ({ workspaceId: spaceId, currentUserRole, onOpenInvite }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const canManage = [
    "Product Owner",
    "Product Manager",
    "Scrum Master",
    "Owner",
    "Admin",
    "Project Manager",
    "Manager"
  ].includes(currentUserRole);

  const fetchMembers = async () => {
    if (!spaceId) return;
    setLoading(true);
    setError("");
    try {
      const data = await api.getSpaceMembers(spaceId);
      setMembers(data.members || []);
    } catch (err) {
      setError(err.message || "Failed to load space members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [spaceId]);

  const handleRoleChange = async (userId, newPermissionRole, jobRole) => {
    try {
      const currentRole = jobRole === "Other" ? "Others" : (jobRole || "Others");
      const updatedJobRole = newPermissionRole === "Member" ? currentRole : "Others";
      await api.updateSpaceMember(spaceId, userId, newPermissionRole, updatedJobRole);
      fetchMembers();
    } catch (err) {
      alert(err.message || "Failed to update member role");
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm("Are you sure you want to remove this member from the space?")) return;
    try {
      await api.removeSpaceMember(spaceId, userId);
      fetchMembers();
    } catch (err) {
      alert(err.message || "Failed to remove member");
    }
  };

  const filteredMembers = members.filter((m) => {
    const uName = m.user?.name || "";
    const uEmail = m.user?.email || "";
    const matchesSearch = uName.toLowerCase().includes(searchTerm.toLowerCase()) || uEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || m.permissionRole?.toLowerCase() === roleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeClass = (pRole) => {
    switch (pRole) {
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
    <div className="view-container">
      {/* View Header */}
      <div className="view-header">
        <div>
          <h2>Space Team Directory ({members.length})</h2>
          <p className="subtitle">Manage user access, permission roles, and technical job roles for this space</p>
        </div>
        {canManage && (
          <button className="btn-primary" onClick={onOpenInvite}>
            <IconPlus size={18} /> Invite Member
          </button>
        )}
      </div>

      {error && <div className="alert-error">{error}</div>}

      {/* Controls Bar */}
      <div className="controls-bar margin-bottom-4 flex gap-3">
        <div className="search-input-wrapper flex-1">
          <IconSearch size={16} className="search-icon" />
          <input
            type="text"
            className="form-control"
            placeholder="Search space members by name or email..."
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

      {loading ? (
        <div className="loading-spinner">Loading team members...</div>
      ) : filteredMembers.length === 0 ? (
        <div className="empty-state card">
          <IconUsers size={36} className="empty-icon text-muted" />
          <h4>No members match your criteria</h4>
        </div>
      ) : (
        <div className="table-responsive card padding-0">
          <table className="projects-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Permission Role</th>
                <th>Job Role</th>
                {canManage && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((m) => {
                const isOwner = m.permissionRole === "Owner" || m.permissionRole === "Product Owner";
                const isMemberRole = m.permissionRole === "Member";

                return (
                  <tr key={m._id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="user-avatar-md">
                          {(m.user?.name || "U")[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-dark">{m.user?.name || "User"}</div>
                          <div className="text-secondary text-xs">{m.user?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {canManage && !isOwner ? (
                        <select
                          className="form-control select-compact"
                          value={m.permissionRole}
                          onChange={(e) => handleRoleChange(m.user._id, e.target.value, m.jobRole)}
                        >
                          <option value="Product Owner">Product Owner</option>
                          <option value="Scrum Master">Scrum Master</option>
                          <option value="Member">Member</option>
                          <option value="Stakeholder">Stakeholder</option>
                        </select>
                      ) : (
                        <span className={`badge ${getRoleBadgeClass(m.permissionRole)}`}>
                          {m.permissionRole}
                        </span>
                      )}
                    </td>
                    <td>
                      {canManage && !isOwner && isMemberRole ? (
                        <select
                          className="form-control select-compact"
                          value={(m.jobRole === "Other" ? "Others" : m.jobRole) || "Others"}
                          onChange={(e) => handleRoleChange(m.user._id, m.permissionRole, e.target.value)}
                        >
                          <option value="Developer">Developer</option>
                          <option value="Tester">Tester</option>
                          <option value="Product Lead">Product Lead</option>
                          <option value="Others">Others</option>
                        </select>
                      ) : (
                        <span className="text-secondary text-sm font-medium">
                          {isMemberRole ? ((m.jobRole === "Other" ? "Others" : m.jobRole) || "Others") : `N/A (${m.permissionRole})`}
                        </span>
                      )}
                    </td>
                    {canManage && (
                      <td>
                        {!isOwner && (
                          <button
                            className="btn-icon-danger"
                            onClick={() => handleRemoveMember(m.user._id)}
                            title="Remove Member from Space"
                          >
                            <IconTrash size={16} />
                          </button>
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
    </div>
  );
};
