import React, { useState, useEffect } from "react";
import { api } from "../api";
import { ProjectOverviewTab } from "./ProjectOverviewTab";
import { MilestoneManagement } from "./MilestoneManagement";
import { TaskManagementView } from "./TaskManagementView";
import { ProjectTeamView } from "./ProjectTeamView";
import { ActivityStream } from "./ActivityStream";
import { ProjectEditModal } from "./ProjectEditModal";
import { IconFolder, IconArchive, IconRefresh } from "./Icons";

export function ProjectDetailView({
  project,
  workspaceId,
  userRole,
  currentUserId,
  onProjectUpdated,
  onBackToProjects,
  initialTab = "overview",
  initialTaskId = null
}) {
  const [activeTab, setActiveTab] = useState(
    initialTab === "comments" || initialTab === "documents" ? "overview" : initialTab
  ); // "overview" | "milestones" | "tasks" | "team" | "activity"
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const effectiveWorkspaceId =
    workspaceId ||
    project?.space?._id ||
    (typeof project?.space === "string" ? project.space : null) ||
    project?.workspace?._id ||
    (typeof project?.workspace === "string" ? project.workspace : null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(
        initialTab === "comments" || initialTab === "documents" ? "overview" : initialTab
      );
    }
  }, [initialTab]);

  useEffect(() => {
    if (effectiveWorkspaceId) {
      api.getWorkspaceMembers(effectiveWorkspaceId)
        .then((res) => setWorkspaceMembers(res.members || []))
        .catch(console.error);
    }
  }, [effectiveWorkspaceId]);

  const canManageProject =
    userRole === "Product Owner" ||
    userRole === "Product Manager" ||
    userRole === "Owner" ||
    userRole === "Admin";

  const isProjectManager =
    canManageProject ||
    (project?.manager?._id || project?.manager) === currentUserId;

  const handleArchiveRestore = async () => {
    try {
      if (project.isArchived) {
        await api.restoreProject(project._id);
      } else {
        if (!window.confirm("Archive this project?")) return;
        await api.archiveProject(project._id);
      }
      if (onProjectUpdated) onProjectUpdated();
    } catch (err) {
      alert(err.message || "Action failed");
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
      case "on hold": return "badge-warning";
      default: return "badge-secondary";
    }
  };

  return (
    <div className="project-detail-layout view-container">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="project-detail-header-card card margin-bottom-3">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button className="btn-link text-sm text-secondary" onClick={onBackToProjects}>
              ← Projects
            </button>
            <span className="text-muted">/</span>
            <div className="flex items-center gap-2 font-semibold text-dark text-lg">
              <IconFolder size={20} className="text-primary" />
              <span>{project.name}</span>
            </div>
            {project.isArchived && <span className="badge badge-warning">Archived</span>}
          </div>

          <div className="flex items-center gap-2">
            {canManageProject && !project.isArchived && (
              <button className="btn-secondary btn-sm" onClick={() => setIsEditModalOpen(true)}>
                ✎ Edit Project
              </button>
            )}

            {canManageProject && (
              <button
                className={`btn-sm ${project.isArchived ? "btn-success" : "btn-secondary"}`}
                onClick={handleArchiveRestore}
              >
                {project.isArchived ? <IconRefresh size={14} /> : <IconArchive size={14} />}
                {project.isArchived ? "Restore" : "Archive"}
              </button>
            )}
          </div>
        </div>

        {/* Project Sub-navigation Tabs */}
        <div className="project-detail-tabs flex gap-4 margin-top-4 border-t padding-top-3">
          <button
            className={`btn-tab ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>
          <button
            className={`btn-tab ${activeTab === "milestones" ? "active" : ""}`}
            onClick={() => setActiveTab("milestones")}
          >
            Milestones
          </button>
          <button
            className={`btn-tab ${activeTab === "tasks" ? "active" : ""}`}
            onClick={() => setActiveTab("tasks")}
          >
            Tasks
          </button>
          <button
            className={`btn-tab ${activeTab === "team" ? "active" : ""}`}
            onClick={() => setActiveTab("team")}
          >
            Team Members
          </button>
          <button
            className={`btn-tab ${activeTab === "activity" ? "active" : ""}`}
            onClick={() => setActiveTab("activity")}
          >
            Activity Audit
          </button>
        </div>
      </div>

      {/* Main Tab Content Display */}
      <div className="tab-content-container">
        {activeTab === "overview" && (
          <ProjectOverviewTab
            project={project}
            userRole={userRole}
            currentUserId={currentUserId}
            isProjectManager={isProjectManager}
            onNavigateTab={(t) => setActiveTab(t)}
            onOpenEditProject={() => setIsEditModalOpen(true)}
          />
        )}

        {activeTab === "milestones" && (
          <MilestoneManagement
            projectId={project._id}
            project={project}
            userRole={userRole}
            isProjectManager={isProjectManager}
            onProjectUpdated={onProjectUpdated}
          />
        )}

        {activeTab === "tasks" && (
          <TaskManagementView
            projectId={project._id}
            workspaceId={effectiveWorkspaceId}
            userRole={userRole}
            currentUserId={currentUserId}
            isProjectManager={isProjectManager}
            initialTaskId={initialTaskId}
            onProjectUpdated={onProjectUpdated}
          />
        )}

        {activeTab === "team" && (
          <ProjectTeamView
            projectId={project._id}
            workspaceId={effectiveWorkspaceId}
            userRole={userRole}
            isProjectManager={isProjectManager}
          />
        )}

        {activeTab === "activity" && (
          <div className="card">
            <ActivityStream projectId={project._id} />
          </div>
        )}
      </div>

      {/* Edit Project Modal */}
      {isEditModalOpen && (
        <ProjectEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          project={project}
          workspaceMembers={workspaceMembers}
          onProjectUpdated={() => {
            if (onProjectUpdated) onProjectUpdated();
          }}
        />
      )}
    </div>
  );
}
