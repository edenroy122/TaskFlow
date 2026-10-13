import React, { useState, useEffect } from "react";
import { api } from "../api";
import { IconFolder, IconCalendar, IconUser, IconPlus, IconSparkles } from "./Icons";
import { ActivityStream } from "./ActivityStream";
import { CommentSection } from "./CommentSection";
import { DocumentList } from "./DocumentList";

export function ProjectOverviewTab({
  project,
  userRole,
  isProjectManager,
  currentUserId,
  onNavigateTab,
  onOpenEditProject
}) {
  const [stats, setStats] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const canManage = userRole === "Owner" || userRole === "Admin" || isProjectManager;

  useEffect(() => {
    if (!project?._id) return;
    setLoading(true);

    Promise.all([
      api.getProjectDashboard(project._id).catch(() => null),
      api.getMilestones(project._id).catch(() => ({ milestones: [] })),
      api.getProjectMembers(project._id).catch(() => ({ members: [] })),
      api.getTasks(project._id).catch(() => ({ tasks: [] }))
    ]).then(([dashData, msData, pmData, tasksData]) => {
      const fetchedTasks = tasksData?.tasks || [];
      const dash = dashData?.data || dashData || {};

      const countNew = fetchedTasks.filter((t) => {
        const s = (t.status || "").toLowerCase().trim();
        return s === "new task" || s === "todo" || s === "to do" || s === "pending" || s === "new";
      }).length;
      const countInProgress = fetchedTasks.filter((t) => {
        const s = (t.status || "").toLowerCase().trim();
        return s === "in progress" || s === "inprogress";
      }).length;
      const countReview = fetchedTasks.filter((t) => {
        const s = (t.status || "").toLowerCase().trim();
        return s === "review" || s === "in review" || s === "inreview";
      }).length;
      const countCompleted = fetchedTasks.filter((t) => {
        const s = (t.status || "").toLowerCase().trim();
        return s === "completed" || s === "done";
      }).length;
      const countHold = fetchedTasks.filter((t) => {
        const s = (t.status || "").toLowerCase().trim();
        return s === "hold" || s === "blocked" || s === "on hold";
      }).length;

      const totalTasks = dash.totalTasks !== undefined ? dash.totalTasks : fetchedTasks.length;
      const newTasks = dash.newTasks !== undefined ? dash.newTasks : (dash.todoTasks !== undefined && dash.todoTasks > 0 ? dash.todoTasks : countNew);
      const inProgressTasks = dash.inProgressTasks !== undefined ? dash.inProgressTasks : countInProgress;
      const reviewTasks = dash.reviewTasks !== undefined ? dash.reviewTasks : countReview;
      const completedTasks = dash.completedTasks !== undefined ? dash.completedTasks : countCompleted;
      const holdTasks = dash.holdTasks !== undefined ? dash.holdTasks : (dash.blockedTasks !== undefined ? dash.blockedTasks : countHold);

      setStats({
        ...dash,
        totalTasks: Math.max(totalTasks, fetchedTasks.length),
        newTasks: Math.max(newTasks, countNew),
        todoTasks: Math.max(newTasks, countNew),
        pendingTasks: Math.max(newTasks, countNew),
        newtaskTasks: Math.max(newTasks, countNew),
        inProgressTasks: Math.max(inProgressTasks, countInProgress),
        reviewTasks: Math.max(reviewTasks, countReview),
        completedTasks: Math.max(completedTasks, countCompleted),
        blockedTasks: Math.max(holdTasks, countHold),
        holdTasks: Math.max(holdTasks, countHold)
      });
      setMilestones(msData?.milestones || []);
      setMembers(pmData?.members || []);
      setLoading(false);
    });
  }, [project?._id]);

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
      case "new task": return "badge-accent";
      case "on hold": return "badge-warning";
      default: return "badge-secondary";
    }
  };

  const completedMilestones = milestones.filter((m) => m.status === "Completed").length;

  return (
    <div className="project-overview-container grid-1 gap-4">
      {/* Primary Project Information Banner */}
      <div className="card project-info-banner">
        <div className="flex justify-between items-start">
          <div>
            <h2>{project.name}</h2>
            <p className="text-secondary text-base margin-top-2">
              {project.description || "No project description provided."}
            </p>
          </div>

          {canManage && !project.isArchived && (
            <button className="btn-secondary" onClick={onOpenEditProject}>
              ✎ Edit Project
            </button>
          )}
        </div>

        <div className="grid-3 gap-4 margin-top-4 border-t padding-top-3">
          <div>
            <div className="text-xs text-secondary font-medium">Project Manager</div>
            <div className="flex items-center gap-2 margin-top-1 font-semibold text-dark">
              <div className="user-avatar-sm">
                {(project.manager?.name || "P")[0].toUpperCase()}
              </div>
              <span>{project.manager?.name || "Unassigned"}</span>
            </div>
          </div>

          <div>
            <div className="text-xs text-secondary font-medium">Start Date</div>
            <div className="font-semibold text-dark margin-top-1">
              {project.startDate ? new Date(project.startDate).toLocaleDateString() : "Not set"}
            </div>
          </div>

          <div>
            <div className="text-xs text-secondary font-medium">Target Due Date</div>
            <div className="font-semibold text-dark margin-top-1">
              {project.dueDate ? (
                <div>
                  <div className="flex items-center gap-1">
                    <span>{new Date(project.dueDate).toLocaleDateString()}</span>
                    {project.originalDueDate && new Date(project.dueDate).getTime() !== new Date(project.originalDueDate).getTime() && (
                      <span className="badge badge-warning text-2xs" title={`Original target date: ${new Date(project.originalDueDate).toLocaleDateString()}`}>
                        Extended
                      </span>
                    )}
                  </div>
                  {project.originalDueDate && new Date(project.dueDate).getTime() !== new Date(project.originalDueDate).getTime() && (
                    <div className="text-2xs text-muted font-normal margin-top-1">
                      Original: {new Date(project.originalDueDate).toLocaleDateString()}
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

      {/* Grid containing Quick Summary Cards */}
      <div className="grid-3 gap-4">

        {/* Dedicated Tasks Section Card (Prominent link to Tasks Page) */}
        <div className="card flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center margin-bottom-2">
              <h4 className="font-semibold text-dark">Project Tasks</h4>
              <span className="badge badge-primary">{stats?.totalTasks || 0} Total</span>
            </div>

            <div className="stats-mini-grid margin-top-3 grid-3 gap-2 text-xs">
              <div className="bg-light padding-2 rounded">
                <div className="text-muted">New Tasks</div>
                <div className="text-lg font-bold text-secondary">
                  {stats?.newTasks ?? stats?.newtaskTasks ?? stats?.todoTasks ?? stats?.pendingTasks ?? 0}
                </div>
              </div>
              <div className="bg-light padding-2 rounded">
                <div className="text-muted">In Progress</div>
                <div className="text-lg font-bold text-accent">{stats?.inProgressTasks ?? 0}</div>
              </div>
              <div className="bg-light padding-2 rounded">
                <div className="text-muted">In Review</div>
                <div className="text-lg font-bold text-warning">{stats?.reviewTasks ?? 0}</div>
              </div>
              <div className="bg-light padding-2 rounded">
                <div className="text-muted">Completed</div>
                <div className="text-lg font-bold text-success">{stats?.completedTasks ?? 0}</div>
              </div>
              <div className="bg-light padding-2 rounded">
                <div className="text-muted">Hold</div>
                <div className="text-lg font-bold text-danger">{stats?.holdTasks ?? stats?.blockedTasks ?? 0}</div>
              </div>
            </div>
          </div>

          <div className="margin-top-4 border-t padding-top-3">
            <button
              className="btn-primary w-full flex justify-center items-center gap-2"
              onClick={() => onNavigateTab("tasks")}
            >
              View Dedicated Task Page →
            </button>
          </div>
        </div>

        {/* Milestones Card */}
        <div className="card flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center margin-bottom-2">
              <h4 className="font-semibold text-dark">Milestones</h4>
              <span className="badge badge-accent">
                {completedMilestones} / {milestones.length} Completed
              </span>
            </div>
            <p className="text-secondary text-sm">
              Major deliverables and project timeline targets.
            </p>

            {milestones.length === 0 ? (
              <div className="text-xs text-muted margin-top-3">No milestones created yet.</div>
            ) : (
              <div className="margin-top-3 grid-1 gap-2">
                {milestones.slice(0, 3).map((m) => (
                  <div key={m._id} className="bg-light padding-2 rounded text-xs">
                    <div className="flex justify-between font-semibold text-dark">
                      <span>{m.title}</span>
                      <span>{m.progress}%</span>
                    </div>
                    <div className="text-muted text-2xs margin-top-1">
                      Due: {m.dueDate ? new Date(m.dueDate).toLocaleDateString() : "No Date"}
                      {m.originalDueDate && new Date(m.dueDate).getTime() !== new Date(m.originalDueDate).getTime() && (
                        <span className="text-warning font-semibold margin-left-1">(Ext)</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="margin-top-4 border-t padding-top-3">
            <button
              className="btn-secondary w-full text-center"
              onClick={() => onNavigateTab("milestones")}
            >
              Manage Milestones →
            </button>
          </div>
        </div>

        {/* Team Members Card */}
        <div className="card flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center margin-bottom-2">
              <h4 className="font-semibold text-dark">Project Team</h4>
              <span className="badge badge-secondary">{members.length} Members</span>
            </div>
            <p className="text-secondary text-sm">
              Active contributors and watchers on this project.
            </p>

            <div className="margin-top-3 flex flex-wrap gap-2">
              {members.slice(0, 6).map((m) => (
                <div
                  key={m._id}
                  className="user-avatar-md"
                  title={`${m.user?.name} (${m.role})`}
                >
                  {(m.user?.name || "U")[0].toUpperCase()}
                </div>
              ))}
              {members.length > 6 && (
                <div className="user-avatar-md bg-secondary text-white font-semibold">
                  +{members.length - 6}
                </div>
              )}
            </div>
          </div>

          <div className="margin-top-4 border-t padding-top-3">
            <button
              className="btn-secondary w-full text-center"
              onClick={() => onNavigateTab("team")}
            >
              View Team Members →
            </button>
          </div>
        </div>

      </div>
 
      {/* Project Comments */}
      <div className="card">
        <CommentSection
          projectId={project._id}
          currentUserId={currentUserId}
        />
      </div>

      {/* Project Attachments */}
      <div className="card">
        <DocumentList
          projectId={project._id}
          canManage={canManage}
        />
      </div>

      {/* Project Activity Log */}
      <div className="card">
        <div className="flex justify-between items-center margin-bottom-3">
          <h4 className="font-semibold text-dark">Project Audit Activity Log</h4>
          <button className="btn-link text-sm" onClick={() => onNavigateTab("activity")}>
            Full Activity Tab →
          </button>
        </div>
        <ActivityStream projectId={project._id} />
      </div>
    </div>
  );
}
