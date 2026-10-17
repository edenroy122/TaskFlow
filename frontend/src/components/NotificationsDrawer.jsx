import React, { useState, useEffect } from "react";
import { api } from "../api";
import { io } from "socket.io-client";
import { IconBell, IconCheck, IconTrash } from "./Icons";

export const NotificationsDrawer = ({ userId, isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.getNotifications(1);
      setNotifications(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen]);

  // Real-time Socket.IO Connection (Module 13)
  useEffect(() => {
    if (!userId) return;

    const socketUrl =
      import.meta.env.VITE_SOCKET_URL ||
      (import.meta.env.VITE_API_URL
        ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "")
        : "http://localhost:3000");

    const socket = io(socketUrl, {
      query: { userId },
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      setSocketConnected(true);
      socket.emit("join", { userId });
    });

    socket.on("notification:new", (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev]);
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [userId]);

  const handleMarkAsRead = async (notifId) => {
    try {
      await api.markNotificationAsRead(notifId);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notifId ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (notifId) => {
    try {
      await api.deleteNotification(notifId);
      setNotifications((prev) => prev.filter((n) => n._id !== notifId));
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="notifications-drawer-overlay" onClick={onClose}>
      <div className="notifications-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header flex-between">
          <div className="flex-align gap-2">
            <h3 className="drawer-title">Notifications</h3>
            <span className={`socket-status-dot ${socketConnected ? "connected" : ""}`} title={socketConnected ? "Real-time Socket Connected" : "Connecting..."}></span>
          </div>
          <div className="flex-align gap-2">
            <button className="btn-link text-xs" onClick={handleMarkAllRead}>
              Mark all as read
            </button>
            <button className="btn-icon" onClick={onClose}>
              ×
            </button>
          </div>
        </div>

        <div className="drawer-body">
          {loading ? (
            <div className="loading-spinner">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="empty-state">
              <IconBell size={32} className="empty-icon" />
              <p>No notifications yet.</p>
            </div>
          ) : (
            <div className="notifications-list">
              {notifications.map((n) => (
                <div key={n._id} className={`notification-card ${!n.isRead ? "unread" : ""}`}>
                  <div className="notif-header flex-between">
                    <span className="notif-title font-semibold">{n.title || n.type}</span>
                    <span className="notif-time text-xs text-muted">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="notif-message text-sm">{n.message}</p>
                  <div className="notif-footer flex-between margin-top-2">
                    <span className="text-xs text-muted">From: {n.sender?.name || "System"}</span>
                    <div className="flex-align gap-1">
                      {!n.isRead && (
                        <button
                          className="btn-icon text-primary"
                          onClick={() => handleMarkAsRead(n._id)}
                          title="Mark as Read"
                        >
                          <IconCheck size={14} />
                        </button>
                      )}
                      <button
                        className="btn-icon-danger"
                        onClick={() => handleDelete(n._id)}
                        title="Delete"
                      >
                        <IconTrash size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
