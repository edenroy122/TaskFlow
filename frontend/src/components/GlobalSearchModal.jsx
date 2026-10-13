import React, { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { api } from "../api";
import { IconSearch, IconFolder, IconCheck, IconUser, IconMail } from "./Icons";

export const GlobalSearchModal = ({ isOpen, onClose, workspaceId, onSelectProject, onSelectTask }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ projects: [], tasks: [], users: [], comments: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults({ projects: [], tasks: [], users: [], comments: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.globalSearch(workspaceId, query);
        setResults(res.data || { projects: [], tasks: [], users: [], comments: [] });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, workspaceId]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Global Search" maxWidth="max-w-2xl">
      <div className="search-modal-header">
        <div className="search-input-wrapper full-width">
          <IconSearch size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search projects, tasks, comments, users..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      <div className="search-modal-results">
        {loading ? (
          <div className="loading-spinner">Searching...</div>
        ) : query.trim().length >= 2 &&
          results.projects.length === 0 &&
          results.tasks.length === 0 &&
          results.users.length === 0 &&
          results.comments.length === 0 ? (
          <div className="empty-state">
            <IconSearch size={32} className="empty-icon" />
            <p>No matching results found for "{query}"</p>
          </div>
        ) : (
          <div className="search-categories">
            {/* Projects Results */}
            {results.projects.length > 0 && (
              <div className="search-category-section">
                <div className="category-title">Projects ({results.projects.length})</div>
                {results.projects.map((p) => (
                  <div
                    key={p._id}
                    className="search-result-item clickable"
                    onClick={() => {
                      onSelectProject(p);
                      onClose();
                    }}
                  >
                    <IconFolder size={18} className="text-primary" />
                    <div>
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-xs text-muted">{p.description || "No description"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tasks Results */}
            {results.tasks.length > 0 && (
              <div className="search-category-section">
                <div className="category-title">Tasks ({results.tasks.length})</div>
                {results.tasks.map((t) => (
                  <div
                    key={t._id}
                    className="search-result-item clickable"
                    onClick={() => {
                      onSelectTask(t);
                      onClose();
                    }}
                  >
                    <IconCheck size={18} className="text-info" />
                    <div>
                      <div className="font-semibold">{t.title}</div>
                      <div className="text-xs text-muted">
                        Project: {t.project?.name || "Project"} • Status: <strong>{t.status}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Users Results */}
            {results.users.length > 0 && (
              <div className="search-category-section">
                <div className="category-title">Users ({results.users.length})</div>
                {results.users.map((u) => (
                  <div key={u._id} className="search-result-item">
                    <IconUser size={18} className="text-muted" />
                    <div>
                      <div className="font-semibold">{u.name}</div>
                      <div className="text-xs text-muted">{u.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Comments Results */}
            {results.comments.length > 0 && (
              <div className="search-category-section">
                <div className="category-title">Comments ({results.comments.length})</div>
                {results.comments.map((c) => (
                  <div key={c._id} className="search-result-item">
                    <IconMail size={18} className="text-muted" />
                    <div>
                      <div className="text-sm font-medium">"{c.text}"</div>
                      <div className="text-xs text-muted">
                        By {c.user?.name || "User"} in {c.project?.name || "Project"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
