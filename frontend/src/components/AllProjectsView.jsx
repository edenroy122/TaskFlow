import React, { useState } from "react";
import {
  IconFolder,
  IconPlus,
  IconSearch,
  IconArchive,
  IconRefresh,
  IconEdit
} from "./Icons";

export function AllProjectsView({
  projects,
  archivedProjects,
  userRole,
  onSelectProject,
  onOpenCreateProject,
  onArchiveProject,
  onRestoreProject,
  onEditProject
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "active" | "archived"
  const [sortBy, setSortBy] = useState("createdAt");

  const rawList = statusFilter === "archived" ? archivedProjects : projects;

  const filteredProjects = rawList.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.manager?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesStatus = true;
    if (statusFilter === "active") matchesStatus = !p.isArchived;
    else if (statusFilter === "archived") matchesStatus = p.isArchived;

    return matchesSearch && matchesStatus;
  });

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "dueDate") return new Date(a.dueDate || 0) - new Date(b.dueDate || 0);
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  const activeCount = projects.length;
  const archivedCount = archivedProjects.length;

  const canManage = userRole === "Product Owner" || userRole === "Product Manager" || userRole === "Owner" || userRole === "Admin";

  return (
    <div className="view-container">
      {/* Standard Header for Projects List */}
      <div className="view-header margin-bottom-2">
        <div>
          <h2>Projects Overview</h2>
        </div>
        {canManage && (
          <button className="btn-primary" onClick={onOpenCreateProject}>
            <IconPlus size={18} /> New Project
          </button>
        )}
      </div>

      {/* Filters & Control Bar */}
      <div className="projects-controls-bar margin-bottom-4 flex flex-wrap items-center justify-between gap-3">
        <div className="search-input-wrapper flex-1 min-w-xs">
          <IconSearch size={16} className="search-icon" />
          <input
            type="text"
            className="form-control"
            placeholder="Search projects by name, description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter Tabs */}
          <div className="btn-group">
            <button
              className={`btn-tab ${statusFilter === "active" ? "active" : ""}`}
              onClick={() => setStatusFilter("active")}
            >
              Active ({activeCount})
            </button>
            <button
              className={`btn-tab ${statusFilter === "archived" ? "active" : ""}`}
              onClick={() => setStatusFilter("archived")}
            >
              Archived ({archivedCount})
            </button>
            <button
              className={`btn-tab ${statusFilter === "all" ? "active" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              All Projects
            </button>
          </div>
        </div>
      </div>

      {/* Projects List View / Table */}
      {sortedProjects.length === 0 ? (
        <div className="empty-state card">
          <IconFolder size={44} className="empty-icon text-muted" />
          <h3>No projects found</h3>
          <p>No workspace projects match your search or filter selection.</p>
          {canManage && (
            <button className="btn-primary margin-top-4" onClick={onOpenCreateProject}>
              <IconPlus size={18} /> Create Project
            </button>
          )}
        </div>
      ) : (
        <div className="table-responsive card padding-0">
          <table className="projects-table">
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Project Manager</th>
                <th>Due Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedProjects.map((p) => {
                const isArchived = p.isArchived;

                return (
                  <tr
                    key={p._id}
                    className="clickable-row"
                    onClick={() => onSelectProject(p)}
                  >
                    <td className="font-semibold text-dark">
                      <div className="flex items-center gap-3">
                        <div className="project-icon-avatar">
                          <IconFolder size={18} className="text-primary" />
                        </div>
                        <div>
                          <div className="text-base">{p.name}</div>
                          {p.description && (
                            <div className="text-xs text-secondary line-clamp-1 font-normal">
                              {p.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="user-avatar-sm">
                          {(p.manager?.name || "P")[0].toUpperCase()}
                        </div>
                        <span className="text-sm font-medium">{p.manager?.name || "Unassigned"}</span>
                      </div>
                    </td>
                    <td className="text-secondary text-sm">
                      {p.dueDate ? (
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-dark">{new Date(p.dueDate).toLocaleDateString()}</span>
                            {p.originalDueDate && new Date(p.dueDate) > new Date(p.originalDueDate) && (
                              <span className="badge badge-warning badge-sm" style={{ fontSize: "10px", padding: "1px 5px" }}>
                                Extended
                              </span>
                            )}
                          </div>
                          {p.originalDueDate && new Date(p.dueDate) > new Date(p.originalDueDate) && (
                            <span className="text-2xs text-muted">
                              Original: {new Date(p.originalDueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ) : (
                        "No Target Date"
                      )}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-3">
                        <button
                          className="btn-primary btn-sm flex items-center gap-1"
                          onClick={() => onSelectProject(p)}
                        >
                          View Details
                        </button>
                        {/* {canManage && !isArchived && (
                          <button
                            className="btn-secondary btn-sm flex items-center gap-1"
                            title="Edit Project"
                            onClick={() => onEditProject && onEditProject(p)}
                          >
                            <IconEdit size={13} />
                            <span>Edit</span>
                          </button>
                        )} */}
                        {canManage && !isArchived && (
                          <button
                            className="btn-secondary btn-sm flex items-center gap-1 text-danger"
                            title="Archive Project"
                            onClick={() => onArchiveProject && onArchiveProject(p._id)}
                          >
                            <IconArchive size={13} />
                            <span>Archive</span>
                          </button>
                        )}
                        {canManage && isArchived && (
                          <button
                            className="btn-secondary btn-sm flex items-center gap-1 text-success"
                            title="Restore Project"
                            onClick={() => onRestoreProject && onRestoreProject(p._id)}
                          >
                            <IconRefresh size={13} />
                            <span>Restore</span>
                          </button>
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
  );
}
