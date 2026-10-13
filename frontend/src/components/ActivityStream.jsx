import React, { useState, useEffect, useMemo } from "react";
import { api } from "../api";

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
};

const formatTime = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
};

const getDayKey = (dateStr) => {
  if (!dateStr) return "unknown";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "unknown";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDayLabel = (dateStr) => {
  if (!dateStr) return "Unknown Date";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Unknown Date";

  const now = new Date();
  const todayKey = getDayKey(now);

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = getDayKey(yesterday);

  const currentKey = getDayKey(d);
  const formattedDate = d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  if (currentKey === todayKey) return `Today • ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  if (currentKey === yesterdayKey) return `Yesterday • ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  return formattedDate;
};

export const ActivityStream = ({ projectId, taskId, limit }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      if (taskId) {
        const res = await api.getTaskActivities(taskId, 1, 0);
        setActivities(res.data || res.activities || []);
      } else if (projectId) {
        const res = await api.getProjectActivities(projectId, 1, 0);
        setActivities(res.data || res.activities || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [projectId, taskId]);

  // Group all activities by day (ordered newest day to oldest day)
  const groupedActivities = useMemo(() => {
    const groups = {};
    const list = limit && limit < activities.length ? activities.slice(0, limit) : activities;

    list.forEach((act) => {
      const key = getDayKey(act.createdAt);
      if (!groups[key]) {
        groups[key] = {
          key,
          label: getDayLabel(act.createdAt),
          date: new Date(act.createdAt),
          items: []
        };
      }
      groups[key].items.push(act);
    });

    // Sort days descending (most recent day first)
    return Object.values(groups).sort((a, b) => b.date - a.date);
  }, [activities, limit]);

  return (
    <div className="activity-stream-container">
      <div className="activity-stream-header margin-bottom-3">
        <h4 className="section-title">Audit Activity Stream</h4>
      </div>

      {loading ? (
        <div className="text-xs text-muted">Loading activities...</div>
      ) : activities.length === 0 ? (
        <div className="empty-sub-state">No recent activity logged.</div>
      ) : (
        <div className="activity-timeline-scroll">
          {groupedActivities.map((group) => (
            <div key={group.key} className="activity-day-group">
              <div className="activity-day-header">
                <span>📅 {group.label}</span>
                <span className="activity-day-count">
                  {group.items.length} {group.items.length === 1 ? "event" : "events"}
                </span>
              </div>

              <div className="activity-timeline">
                {group.items.map((act) => {
                  const isExtended = act.action?.includes("EXTENDED") || act.description?.toLowerCase().includes("extended");
                  const isDateUpdate = act.action?.includes("DUE_DATE") || act.description?.toLowerCase().includes("due date");

                  return (
                    <div key={act._id || Math.random()} className="activity-node">
                      <div className={`activity-dot ${isExtended ? "is-extended" : isDateUpdate ? "is-due-date" : ""}`}></div>
                      <div className="activity-details">
                        <span className="font-semibold text-dark">{act.user?.name || "System"}</span>{" "}
                        <span className="text-secondary">{act.description || act.action}</span>
                        {isExtended && (
                          <span
                            className="badge badge-warning text-2xs margin-left-2 font-medium"
                            style={{ fontSize: "10px", padding: "1px 6px", verticalAlign: "middle" }}
                          >
                            Extended Due Date
                          </span>
                        )}
                        {!isExtended && isDateUpdate && (
                          <span
                            className="badge badge-info text-2xs margin-left-2 font-medium"
                            style={{ fontSize: "10px", padding: "1px 6px", verticalAlign: "middle" }}
                          >
                            Due Date Change
                          </span>
                        )}
                        <div className="activity-time">
                          📅 {formatDate(act.createdAt)} at {formatTime(act.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
