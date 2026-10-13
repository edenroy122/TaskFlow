import React, { useState, useEffect } from "react";
import { api } from "../api";
import { IconCheck, IconX } from "./Icons";

export const ApprovalSection = ({ taskId, isManagerOrAdmin, onStatusUpdated }) => {
  const [approvals, setApprovals] = useState([]);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const res = await api.getTaskApprovals(taskId);
      setApprovals(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [taskId]);

  const handleRequestApproval = async () => {
    try {
      await api.requestTaskApproval(taskId, comment);
      setComment("");
      fetchApprovals();
      if (onStatusUpdated) onStatusUpdated();
    } catch (err) {
      alert(err.message || "Failed to request approval");
    }
  };

  const handleRespond = async (approvalId, status) => {
    const responseComment = prompt(`Add a comment for ${status.toLowerCase()} (optional):`) || "";
    try {
      await api.respondToTaskApproval(taskId, approvalId, status, responseComment);
      fetchApprovals();
      if (onStatusUpdated) onStatusUpdated();
    } catch (err) {
      alert(err.message || "Failed to respond to approval");
    }
  };

  const latestApproval = approvals.length > 0 ? approvals[0] : null;

  return (
    <div className="approval-section-container">
      <div className="flex-between margin-bottom-2">
        <h4 className="section-title">Task Approval Status</h4>
        {(!latestApproval || latestApproval.status !== "Pending") && (
          <button className="btn-secondary btn-sm" onClick={handleRequestApproval}>
            Submit for Review & Approval
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-xs text-muted">Loading approvals...</div>
      ) : approvals.length === 0 ? (
        <div className="empty-sub-state">No approval requests submitted yet.</div>
      ) : (
        <div className="approval-list">
          {approvals.map((app) => (
            <div key={app._id} className="approval-card">
              <div className="flex-between">
                <div>
                  <span className="font-semibold">{app.requestedBy?.name || "User"}</span>{" "}
                  <span className="text-xs text-muted">requested approval</span>
                </div>
                <span
                  className={`badge ${
                    app.status === "Approved"
                      ? "badge-success"
                      : app.status === "Rejected"
                      ? "badge-danger"
                      : "badge-warning"
                  }`}
                >
                  {app.status}
                </span>
              </div>

              {app.comment && <div className="text-xs text-secondary margin-top-1">"{app.comment}"</div>}

              {app.status === "Pending" && isManagerOrAdmin && (
                <div className="approval-actions margin-top-2 flex-end gap-2">
                  <button
                    className="btn-success btn-sm"
                    onClick={() => handleRespond(app._id, "Approved")}
                  >
                    <IconCheck size={14} /> Approve
                  </button>
                  <button
                    className="btn-danger btn-sm"
                    onClick={() => handleRespond(app._id, "Rejected")}
                  >
                    <IconX size={14} /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
