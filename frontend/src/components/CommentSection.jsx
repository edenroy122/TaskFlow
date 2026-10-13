import React, { useState, useEffect, useMemo } from "react";
import { api } from "../api";
import { IconTrash } from "./Icons";

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
    minute: "2-digit"
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

export const CommentSection = ({ projectId, taskId, currentUserId, title }) => {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDay, setSelectedDay] = useState("all");

  const fetchComments = async () => {
    setLoading(true);
    try {
      if (taskId) {
        const res = await api.getTaskComments(taskId, 1, 0);
        setComments(res.data || []);
      } else if (projectId) {
        const res = await api.getProjectComments(projectId, 1, 0);
        setComments(res.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [projectId, taskId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    setSubmitting(true);
    try {
      if (taskId) {
        await api.addTaskComment(taskId, text);
      } else if (projectId) {
        await api.addProjectComment(projectId, text);
      }
      setText("");
      fetchComments();
    } catch (err) {
      alert(err.message || "Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await api.deleteComment(commentId);
      fetchComments();
    } catch (err) {
      alert(err.message || "Failed to delete comment");
    }
  };

  // Group all comments by day
  const groupedComments = useMemo(() => {
    const groups = {};
    comments.forEach((c) => {
      const key = getDayKey(c.createdAt);
      if (!groups[key]) {
        groups[key] = {
          key,
          label: getDayLabel(c.createdAt),
          date: new Date(c.createdAt),
          items: []
        };
      }
      groups[key].items.push(c);
    });

    // Sort days descending (most recent day first)
    return Object.values(groups).sort((a, b) => b.date - a.date);
  }, [comments]);

  // Filter groups if a specific day is selected
  const displayedGroups = useMemo(() => {
    if (selectedDay === "all") return groupedComments;
    return groupedComments.filter((g) => g.key === selectedDay);
  }, [groupedComments, selectedDay]);

  return (
    <div className="comment-section-container">
      <h4 className="comment-section-title">
        {title || (taskId ? "Comments" : "Comments")}
      </h4>

      <form onSubmit={handleSubmit} className="comment-form margin-bottom-2">
        <textarea
          rows="1"
          placeholder="Write a comment..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
        />
        <div className="flex-end margin-top-1">
          <button type="submit" className="btn-primary btn-xs" disabled={submitting}>
            {submitting ? "Posting..." : "Comment"}
          </button>
        </div>
      </form>

      {loading ? (
        <div className="text-xs text-muted">Loading comments...</div>
      ) : comments.length === 0 ? (
        <div className="empty-sub-state">No comments yet.</div>
      ) : (
        <>
          <div className="comment-header-controls">
            <div className="text-xs text-muted font-medium">
              {comments.length} {comments.length === 1 ? "comment" : "comments"} across {groupedComments.length} {groupedComments.length === 1 ? "day" : "days"}
            </div>
            {groupedComments.length > 1 && (
              <select
                className="comment-day-filter"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                title="Filter comments by day"
              >
                <option value="all">All Days ({comments.length})</option>
                {groupedComments.map((g) => (
                  <option key={g.key} value={g.key}>
                    {g.label} ({g.items.length})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="comment-thread">
            {displayedGroups.map((group) => (
              <div key={group.key} className="comment-day-group">
                <div className="comment-day-divider">
                  <span className="comment-day-badge">
                    📅 {group.label} • {group.items.length} {group.items.length === 1 ? "comment" : "comments"}
                  </span>
                </div>

                {group.items.map((c) => (
                  <div key={c._id} className="comment-item">
                    <div className="comment-avatar-compact">
                      {c.user?.name ? c.user.name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div className="comment-content">
                      <div className="comment-header">
                        <span className="comment-author">{c.user?.name || "User"}</span>
                        <span className="comment-time" title={new Date(c.createdAt).toLocaleString()}>
                          <span className="comment-date-tag">📅 {formatDate(c.createdAt)}</span> • {formatTime(c.createdAt)}
                        </span>
                        {c.user?._id === currentUserId && (
                          <button
                            className="btn-icon-danger margin-left-auto"
                            onClick={() => handleDelete(c._id)}
                            title="Delete Comment"
                          >
                            <IconTrash size={11} />
                          </button>
                        )}
                      </div>
                      <div className="comment-text">{c.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
