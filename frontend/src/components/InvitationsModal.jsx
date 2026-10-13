import React, { useState } from "react";
import { Modal } from "./Modal";
import { api } from "../api";
import { IconCheck, IconX, IconMail, IconLayers, IconSparkles } from "./Icons";

export const InvitationsModal = ({ isOpen, onClose, invitations, onRefreshWorkspaces }) => {
  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState("");

  const handleAccept = async (invitationId) => {
    setLoadingId(invitationId);
    setError("");
    try {
      await api.acceptInvitation(invitationId);
      await onRefreshWorkspaces();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to accept invitation");
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (invitationId) => {
    setLoadingId(invitationId);
    setError("");
    try {
      await api.rejectInvitation(invitationId);
      await onRefreshWorkspaces();
    } catch (err) {
      setError(err.message || "Failed to reject invitation");
    } finally {
      setLoadingId(null);
    }
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case "Product Owner":
      case "Product Manager": return "badge-warning";
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
    <Modal isOpen={isOpen} onClose={onClose} title="Pending Space Invitations" maxWidth="max-w-lg">
      {error && <div className="alert-error margin-bottom-3">{error}</div>}

      {invitations.length === 0 ? (
        <div className="empty-state padding-y-4">
          <IconSparkles size={40} className="empty-icon text-muted margin-bottom-2" />
          <h4 className="font-semibold text-dark text-base">No Pending Invitations</h4>
          <p className="text-secondary text-sm margin-top-1">
            When team members invite you to collaborate on spaces, they will appear here.
          </p>
        </div>
      ) : (
        <div className="invitation-list grid-1 gap-3">
          {invitations.map((inv) => {
            const sp = inv.space || inv.workspace;
            const wsName = sp?.name || "Space";
            const wsDesc = sp?.description || "No description provided.";
            const inviterName = inv.invitedBy?.name || inv.invitedBy?.email || "Space Admin";
            const role = inv.permissionRole || "Member";
            const jobRole = inv.jobRole ? (inv.jobRole === "Other" ? "Others" : inv.jobRole) : null;

            return (
              <div key={inv._id} className="card invitation-card padding-3 border rounded shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="ws-icon-avatar flex-shrink-0">
                    <IconLayers size={22} className="text-primary" />
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-dark text-base">{wsName}</h4>
                        <p className="text-secondary text-xs margin-top-1">{wsDesc}</p>
                      </div>
                      <span className={`badge ${getRoleBadgeClass(role)}`}>{role}</span>
                    </div>

                    <div className="flex items-center gap-2 margin-top-3 text-xs text-muted">
                      <span>Invited by: <strong className="text-dark">{inviterName}</strong></span>
                      {role === "Member" && jobRole && (
                        <>
                          <span>•</span>
                          <span className="badge badge-outline">{jobRole}</span>
                        </>
                      )}
                    </div>

                    <div className="flex justify-end items-center gap-2 margin-top-4 border-t padding-top-2">
                      <button
                        className="btn-secondary btn-sm"
                        onClick={() => handleReject(inv._id)}
                        disabled={loadingId === inv._id}
                      >
                        <IconX size={14} /> Decline
                      </button>

                      <button
                        className="btn-primary btn-sm"
                        onClick={() => handleAccept(inv._id)}
                        disabled={loadingId === inv._id}
                      >
                        <IconCheck size={14} /> {loadingId === inv._id ? "Joining..." : "Accept & Join"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
};
