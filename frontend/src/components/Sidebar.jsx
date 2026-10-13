import React from "react";
import {
  IconFolder,
  IconArchive,
  IconUsers,
  IconPlus,
  IconLayers,
  IconSparkles
} from "./Icons";

export const Sidebar = ({
  currentWorkspace: currentSpace,
  userRole,
  projects,
  activeProject,
  onSelectProject,
  activeTab,
  setActiveTab,
  onOpenCreateProject,
  onOpenInviteMember,
}) => {
  const canManage = userRole === "Product Owner" || userRole === "Product Manager" || userRole === "Owner" || userRole === "Admin";

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <div className="workspace-card-info">
          <div className="ws-icon">
            <IconLayers size={20} />
          </div>
          <div className="truncate">
            <h3 className="ws-title truncate">{currentSpace?.name || "No Space"}</h3>
            <span className="badge badge-accent">{userRole || "Member"}</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-label">Navigation</div>

        <button
          className={`nav-link ${activeTab === "dashboard" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("dashboard");
            onSelectProject(null);
          }}
        >
          <IconSparkles size={18} />
          <span>Dashboard</span>
        </button>

        <button
          className={`nav-link ${activeTab === "projects" && !activeProject ? "active" : ""}`}
          onClick={() => {
            setActiveTab("projects");
            onSelectProject(null);
          }}
        >
          <IconFolder size={18} />
          <span>All Projects (List)</span>
          <span className="count-pill">{projects.length}</span>
        </button>

        <button
          className={`nav-link ${activeTab === "members" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("members");
            onSelectProject(null);
          }}
        >
          <IconUsers size={18} />
          <span>Space Members</span>
        </button>
      </nav>

      {/* Projects List Shortcut */}
      <div className="sidebar-section margin-top-auto">
        <div className="sidebar-header-action">
          <span className="nav-label">Projects</span>
          {canManage && (
            <button className="btn-icon-sm" onClick={onOpenCreateProject} title="Create Project">
              <IconPlus size={16} />
            </button>
          )}
        </div>

        <div className="sidebar-projects-list">
          {projects.length === 0 ? (
            <p className="text-muted text-xs">No active projects</p>
          ) : (
            projects.map((proj) => (
              <button
                key={proj._id}
                className={`sidebar-project-item ${activeProject?._id === proj._id ? "active" : ""}`}
                onClick={() => {
                  onSelectProject(proj);
                  setActiveTab("projects");
                }}
              >
                <div className="project-color-dot"></div>
                <span className="truncate">{proj.name}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {canManage && (
        <div className="sidebar-footer-actions">
          <button className="btn-secondary btn-full btn-sm" onClick={onOpenInviteMember}>
            <IconUsers size={16} /> Invite Member
          </button>
        </div>
      )}
    </aside>
  );
};
