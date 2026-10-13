import React, { useState, useEffect } from "react";
import { api } from "../api";
import { IconFolder, IconPlus, IconTrash, IconCalendar } from "./Icons";

export const DocumentList = ({ projectId, taskId, canManage }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      if (taskId) {
        const res = await api.getTaskDocuments(taskId);
        setDocuments(res.data || []);
      } else if (projectId) {
        const res = await api.getProjectDocuments(projectId);
        setDocuments(res.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [projectId, taskId]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("document", file);

    setUploading(true);
    try {
      if (taskId) {
        await api.uploadTaskDocument(taskId, formData);
      } else if (projectId) {
        await api.uploadProjectDocument(projectId, formData);
      }
      fetchDocuments();
    } catch (err) {
      alert(err.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    try {
      await api.deleteDocument(docId);
      fetchDocuments();
    } catch (err) {
      alert(err.message || "Failed to delete document");
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="document-list-container">
      <div className="flex-between margin-bottom-3">
        <h4 className="section-title">Attachments ({documents.length})</h4>
        <label className={`btn-secondary btn-sm ${uploading ? "disabled" : ""}`}>
          <IconPlus size={14} /> {uploading ? "Uploading..." : "Upload File"}
          <input type="file" onChange={handleFileUpload} disabled={uploading} hidden />
        </label>
      </div>

      {loading ? (
        <div className="text-xs text-muted">Loading documents...</div>
      ) : documents.length === 0 ? (
        <div className="empty-sub-state">No attachments added yet.</div>
      ) : (
        <div className="document-grid">
          {documents.map((doc) => (
            <div key={doc._id} className="document-card">
              <div className="doc-icon font-bold">
                {doc.originalName.split(".").pop().toUpperCase()}
              </div>
              <div className="doc-info">
                <a
                  href={api.getDownloadUrl(doc._id)}
                  target="_blank"
                  rel="noreferrer"
                  className="doc-name font-medium truncate"
                  title={doc.originalName}
                >
                  {doc.originalName}
                </a>
                <div className="doc-meta text-xs text-muted">
                  <span>{formatFileSize(doc.fileSize)}</span> •{" "}
                  <span>By {doc.uploadedBy?.name || "User"}</span>
                </div>
              </div>
              {canManage && (
                <button
                  className="btn-icon-danger"
                  onClick={() => handleDelete(doc._id)}
                  title="Delete Document"
                >
                  <IconTrash size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
