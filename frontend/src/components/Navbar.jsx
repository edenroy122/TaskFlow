import React, { useState } from "react";
import { IconSparkles, IconBell, IconPlus, IconLogOut, IconChevronDown, IconSearch } from "./Icons";

export const Navbar = ({
  user,
  workspaces: spaces,
  currentWorkspace: currentSpace,
  onSelectWorkspace: onSelectSpace,
  onOpenCreateWorkspace: onOpenCreateSpace,
  invitations,
  onOpenInvitations,
  onOpenSearch,
  onOpenNotifications,
  unreadNotifCount = 0,
  onLogout,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="navbar">
      <div className="navbar-left">
        <div className="brand">
          <div className="brand-logo">
            <IconSparkles size={20} />
          </div>
          <span className="brand-name">Task Flow</span>
        </div>

        {/* Space Dropdown */}
        <div className="workspace-dropdown-container">
          <button
            className="workspace-selector"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <span className="workspace-name font-semibold">
              {currentSpace ? currentSpace.name : "Select Space"}
            </span>
            <IconChevronDown size={14} />
          </button>

          {dropdownOpen && (
            <div className="dropdown-menu" onClick={() => setDropdownOpen(false)}>
              <div className="dropdown-header">Spaces</div>
              {(spaces || []).map((item) => {
                const sp = item.space || item.workspace;
                if (!sp) return null;
                return (
                  <button
                    key={sp._id}
                    className={`dropdown-item ${currentSpace?._id === sp._id ? "active" : ""}`}
                    onClick={() => onSelectSpace(sp)}
                  >
                    <span>{sp.name}</span>
                    <span className="role-pill">{item.permissionRole}</span>
                  </button>
                );
              })}
              <div className="dropdown-divider"></div>
              <button
                className="dropdown-item link-action"
                onClick={onOpenCreateSpace}
              >
                <IconPlus size={16} /> Create Space
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Center Search Bar */}
      <div className="navbar-center">
        <button className="nav-search-trigger" onClick={onOpenSearch}>
          <IconSearch size={16} />
          <span>Search projects, tasks, comments...</span>
          <kbd className="search-kbd">Ctrl K</kbd>
        </button>
      </div>

      <div className="navbar-right">
        {/* Invitations Bell */}
        {invitations.length > 0 && (
          <button
            className="nav-icon-btn badge-alert"
            onClick={onOpenInvitations}
            title="Pending Space Invitations"
          >
            <span>Invites</span>
            <span className="notification-badge">{invitations.length}</span>
          </button>
        )}

        {/* Real-time Notifications Bell */}
        <button
          className="nav-icon-btn"
          onClick={onOpenNotifications}
          title="Notifications"
        >
          <IconBell size={18} />
          {unreadNotifCount > 0 && (
            <span className="notification-badge">{unreadNotifCount}</span>
          )}
        </button>

        {/* User Info & Logout */}
        <div className="user-profile">
          <div className="avatar">
            {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="user-info hide-mobile">
            <span className="user-name">{user?.name}</span>
            <span className="user-email">{user?.email}</span>
          </div>
          <button className="btn-icon text-muted" onClick={onLogout} title="Sign Out">
            <IconLogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};
