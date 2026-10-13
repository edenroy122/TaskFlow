import React, { useState, useEffect } from "react";
import { api } from "../api";
import {
  IconFolder,
  IconCheck,
  IconCalendar,
  IconUsers,
  IconArchive,
  IconPlus,
  IconSparkles
} from "./Icons";

export const DashboardView = ({
  workspaceId,
  projectId,
  userRole,
  userName,
  projectsCount = 0,
  completedCount = 0,
  archivedCount = 0,
  totalMembersCount = 0,
  onOpenCreateProject,
  onOpenInviteMember
}) => {
  const [data, setData] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      if (projectId) {
        const [dashRes, repRes] = await Promise.all([
          api.getProjectDashboard(projectId).catch((err) => {
            console.error("getProjectDashboard error:", err);
            return null;
          }),
          api.getProjectReport(projectId).catch((err) => {
            console.error("getProjectReport error:", err);
            return null;
          }),
        ]);
        setData(dashRes?.data || dashRes || null);
        setReport(repRes?.data || repRes || null);
      } else if (workspaceId) {
        const [dashRes, repRes] = await Promise.all([
          api.getWorkspaceDashboard(workspaceId).catch((err) => {
            console.error("getWorkspaceDashboard error:", err);
            return null;
          }),
          api.getWorkspaceReport(workspaceId).catch((err) => {
            console.error("getWorkspaceReport error:", err);
            return null;
          }),
        ]);
        setData(dashRes?.data || dashRes || null);
        setReport(repRes?.data || repRes || null);
      }
    } catch (err) {
      console.error("fetchDashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [workspaceId, projectId]);

  const canManage = userRole === "Owner" || userRole === "Admin" || userRole === "Project Manager" || userRole === "Manager";

  return (
    <div className="dashboard-container">
      {/* Workspace Dashboard Welcome Hero Banner */}
      {!projectId && (
        <div className="card dashboard-hero-banner margin-bottom-4">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="badge badge-primary">Workspace Dashboard</span>
                {userRole && <span className="badge badge-accent">Role: {userRole}</span>}
              </div>
              <h1 className="hero-title margin-top-2">Welcome back{userName ? `, ${userName}` : ""}! 👋</h1>
              <p className="hero-subtitle">
                Manage your workspace projects, track phase milestones, and collaborate with your team.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {canManage && (
                <button className="btn-secondary" onClick={onOpenInviteMember}>
                  <IconUsers size={16} /> Invite Teammate
                </button>
              )}

              {canManage && (
                <button className="btn-primary" onClick={onOpenCreateProject}>
                  <IconPlus size={16} /> Create Project
                </button>
              )}
            </div>
          </div>

          {/* Quick Stat Summary Cards */}
          <div className="grid-3 gap-3 margin-top-4 border-t padding-top-3">
            <div className="bg-light padding-3 rounded flex items-center gap-3">
              <div className="stat-icon-wrapper bg-blue-light text-primary">
                <IconFolder size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-dark">{projectsCount}</div>
                <div className="text-xs text-secondary font-medium">Active Projects</div>
              </div>
            </div>

            <div className="bg-light padding-3 rounded flex items-center gap-3">
              <div className="stat-icon-wrapper bg-green-light text-success">
                <IconUsers size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-dark">
                  {data?.totalMembers ?? totalMembersCount}
                </div>
                <div className="text-xs text-secondary font-medium">Total Team Members</div>
              </div>
            </div>

            <div className="bg-light padding-3 rounded flex items-center gap-3">
              <div className="stat-icon-wrapper bg-amber-light text-warning">
                <IconArchive size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-dark">{archivedCount}</div>
                <div className="text-xs text-secondary font-medium">Archived Projects</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-spinner">Loading analytics & metrics...</div>
      ) : !data ? (
        <div className="empty-state card">No dashboard data available.</div>
      ) : (
        <>


          {/* Status Breakdown Grid */}
          {data.byStatus && (
            <div className="grid-2 margin-top-4">
              <div className="card-container">
                <h4 className="card-title">Tasks by Status</h4>
                <div className="status-bars-list">
                  {Object.entries(data.byStatus).map(([status, count]) => (
                    <div key={status} className="status-row">
                      <span className="status-label">{status}</span>
                      <div className="status-bar-bg">
                        <div
                          className={`status-bar-val bar-${status.toLowerCase().replace(" ", "")}`}
                          style={{ width: `${data.totalTasks > 0 ? (count / data.totalTasks) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="status-count">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {data.byPriority && (
                <div className="card-container">
                  <h4 className="card-title">Tasks by Priority</h4>
                  <div className="status-bars-list">
                    {Object.entries(data.byPriority).map(([prio, count]) => (
                      <div key={prio} className="status-row">
                        <span className="status-label">{prio}</span>
                        <div className="status-bar-bg">
                          <div
                            className={`status-bar-val bar-priority-${prio.toLowerCase()}`}
                            style={{ width: `${data.totalTasks > 0 ? (count / data.totalTasks) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="status-count">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Workspace Project Summary Table */}
          {data.projectSummary && (
            <div className="card-container margin-top-4">
              <h4 className="card-title">Projects Performance Breakdown</h4>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Project Name</th>
                    <th>Total Tasks</th>
                    <th>Completed</th>
                    <th>Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.projectSummary.map((ps) => (
                    <tr key={ps.id}>
                      <td className="font-semibold">{ps.name}</td>
                      <td>{ps.totalTasks}</td>
                      <td className="text-success">{ps.completedTasks}</td>
                      <td className="text-danger">{ps.overdueTasks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};
