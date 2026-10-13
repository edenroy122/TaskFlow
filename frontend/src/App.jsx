import React, { useState, useEffect } from "react";
import { api } from "./api";
import { Auth } from "./components/Auth";
import { Navbar } from "./components/Navbar";
import { Sidebar } from "./components/Sidebar";
import { WorkspaceMembers as SpaceMembers } from "./components/WorkspaceMembers";
import { AllProjectsView } from "./components/AllProjectsView";
import { ProjectDetailView } from "./components/ProjectDetailView";
import { DashboardView } from "./components/DashboardView";
import { InvitationsModal } from "./components/InvitationsModal";
import { GlobalSearchModal } from "./components/GlobalSearchModal";
import { NotificationsDrawer } from "./components/NotificationsDrawer";
import { Modal } from "./components/Modal";
import { WatcherPortal } from "./components/WatcherPortal";
import { IconFolder, IconPlus, IconArchive, IconSparkles, IconUsers } from "./components/Icons";
import "./App.css";

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const [spaces, setSpaces] = useState([]);
  const [currentSpaceItem, setCurrentSpaceItem] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [projects, setProjects] = useState([]);
  const [archivedProjects, setArchivedProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [projectSubTab, setProjectSubTab] = useState("overview"); // "overview" | "milestones" | "tasks" | "team" | "documents" | "activity"
  const [activeTab, setActiveTab] = useState("projects"); // "projects" | "dashboard" | "archived" | "members"
  const [loading, setLoading] = useState(!!user);

  // Modals state
  const [isCreateSpaceOpen, setIsCreateSpaceOpen] = useState(false);
  const [isInviteSpaceOpen, setIsInviteSpaceOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [isInvitationsOpen, setIsInvitationsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Form states
  const [wsName, setWsName] = useState("");
  const [wsDesc, setWsDesc] = useState("");
  const [spacePasskey, setSpacePasskey] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Member");
  const [inviteJobRole, setInviteJobRole] = useState("Developer");

  // Project form state
  const [projName, setProjName] = useState("");
  const [projDesc, setProjDesc] = useState("");
  const [projManager, setProjManager] = useState("");
  const [projStartDate, setProjStartDate] = useState("");
  const [projDueDate, setProjDueDate] = useState("");

  const currentSpace = currentSpaceItem?.space || currentSpaceItem?.workspace;
  const effectiveSpaceId = typeof currentSpace === "string"
    ? currentSpace
    : (currentSpace?._id || currentSpaceItem?._id || currentSpaceItem?.space?._id || currentSpaceItem?.workspace?._id);
  const ownerId = currentSpace?.owner?._id || currentSpace?.owner;
  const userRole = (user && ownerId && ownerId.toString() === user.id.toString())
    ? (currentSpaceItem?.permissionRole || "Product Owner")
    : (currentSpaceItem?.permissionRole || "Member");

  // Global Keyboard Shortcut (Ctrl+K) for Search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelectSpace = (item) => {
    setCurrentSpaceItem(item);
    const targetId = item?.space?._id || item?.workspace?._id;
    if (targetId) {
      localStorage.setItem("currentSpaceId", targetId);
    }
  };

  // Load Spaces, Invitations & Unread Notifications
  const loadInitialData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [wsRes, invRes, unreadRes] = await Promise.all([
        api.getMySpaces(),
        api.getMyInvitations(),
        api.getUnreadNotifications().catch(() => ({ unreadCount: 0 })),
      ]);

      const spaceList = wsRes.spaces || wsRes.workspaces || [];
      setSpaces(spaceList);
      setInvitations(invRes.invitations || []);
      setUnreadNotifCount(unreadRes.unreadCount || 0);

      if (spaceList.length > 0) {
        const savedSpaceId = localStorage.getItem("currentSpaceId");
        let targetItem = null;
        if (savedSpaceId) {
          targetItem = spaceList.find(
            (w) => ((w.space?._id || w.workspace?._id || w.space || w.workspace) === savedSpaceId)
          );
        }
        if (!targetItem && currentSpaceItem) {
          targetItem = spaceList.find(
            (w) => (w.space?._id || w.workspace?._id) === (currentSpaceItem.space?._id || currentSpaceItem.workspace?._id)
          );
        }
        const finalItem = targetItem || spaceList[0];
        handleSelectSpace(finalItem);
      } else {
        setCurrentSpaceItem(null);
        localStorage.removeItem("currentSpaceId");
      }
    } catch (err) {
      console.error(err);
      if (err.message && (err.message.includes("token") || err.message.includes("login"))) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [user]);

  // Load Projects when space changes
  const loadProjects = async () => {
    if (!effectiveSpaceId) {
      setProjects([]);
      setArchivedProjects([]);
      return;
    }
    try {
      const [pRes, archRes] = await Promise.all([
        api.getProjects(effectiveSpaceId),
        api.getArchivedProjects(effectiveSpaceId),
      ]);
      setProjects(pRes.projects || []);
      setArchivedProjects(archRes.projects || []);

      if (activeProject) {
        const updated = (pRes.projects || []).find((p) => p._id === activeProject._id);
        if (updated) {
          setActiveProject(updated);
        } else {
          setActiveProject(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadProjects();
    setActiveProject(null);
    setProjectSubTab("overview");
  }, [effectiveSpaceId]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("currentSpaceId");
    setUser(null);
  };

  // Create Space with Passkey Verification
  const handleCreateSpace = async (e) => {
    e.preventDefault();
    try {
      await api.createSpace(wsName, wsDesc, spacePasskey);
      setWsName("");
      setWsDesc("");
      setSpacePasskey("");
      setIsCreateSpaceOpen(false);
      await loadInitialData();
    } catch (err) {
      alert(err.message || "Failed to create space");
    }
  };

  // Invite User to Space
  const handleInviteUser = async (e) => {
    e.preventDefault();
    if (!effectiveSpaceId) return;
    try {
      const finalJobRole = inviteRole === "Member" ? inviteJobRole : "Others";
      await api.inviteUser(effectiveSpaceId, inviteEmail, inviteRole, finalJobRole);
      setInviteEmail("");
      setIsInviteSpaceOpen(false);
      alert("Invitation sent successfully!");
    } catch (err) {
      alert(err.message || "Failed to send invitation");
    }
  };

  // Create Project
  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!effectiveSpaceId) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (projStartDate && isNaN(new Date(projStartDate).getTime())) {
      alert("Please select a valid start date!");
      return;
    }
    if (projStartDate && new Date(projStartDate) < today) {
      alert("Start date cannot be in the past!");
      return;
    }
    if (projDueDate && isNaN(new Date(projDueDate).getTime())) {
      alert("Please select a valid target due date!");
      return;
    }
    if (projDueDate && new Date(projDueDate) < today) {
      alert("Target due date cannot be in the past!");
      return;
    }
    if (projStartDate && projDueDate && new Date(projDueDate) < new Date(projStartDate)) {
      alert("Due date cannot be before start date!");
      return;
    }
    try {
      await api.createProject(effectiveSpaceId, {
        name: projName,
        description: projDesc,
        manager: projManager || undefined,
        startDate: projStartDate || undefined,
        dueDate: projDueDate || undefined
      });
      setProjName("");
      setProjDesc("");
      setProjManager("");
      setProjStartDate("");
      setProjDueDate("");
      setIsCreateProjectOpen(false);
      await loadProjects();
    } catch (err) {
      alert(err.message || "Failed to create project");
    }
  };

  // Archive Project
  const handleArchiveProject = async (projectId) => {
    if (!window.confirm("Archive this project?")) return;
    try {
      await api.archiveProject(projectId);
      await loadProjects();
    } catch (err) {
      alert(err.message || "Failed to archive project");
    }
  };

  // Restore Project
  const handleRestoreProject = async (projectId) => {
    try {
      await api.restoreProject(projectId);
      await loadProjects();
    } catch (err) {
      alert(err.message || "Failed to restore project");
    }
  };

  if (!user) {
    return <Auth onLoginSuccess={(u) => setUser(u)} />;
  }

  if (userRole === "Stakeholder" || userRole === "Stake holder" || userRole === "Watcher") {
    return (
      <div className="app-container">
        <Navbar
          user={user}
          workspaces={spaces}
          currentWorkspace={currentSpace}
          onSelectWorkspace={(sp) => {
            const item = spaces.find((w) => (w.space?._id || w.workspace?._id) === sp._id);
            if (item) handleSelectSpace(item);
          }}
          onOpenCreateWorkspace={() => setIsCreateSpaceOpen(true)}
          invitations={invitations}
          onOpenInvitations={() => setIsInvitationsOpen(true)}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          unreadNotifCount={unreadNotifCount}
          onLogout={handleLogout}
        />
        <WatcherPortal
          user={user}
          onLogout={handleLogout}
          workspaces={spaces}
          currentWorkspaceItem={currentSpaceItem}
          onSelectWorkspace={handleSelectSpace}
        />

        {/* Global Search Modal */}
        <GlobalSearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          workspaceId={currentSpace?._id}
          onSelectProject={() => {}}
          onSelectTask={() => {}}
        />

        {/* Notifications Drawer */}
        <NotificationsDrawer
          userId={user.id}
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
        />

        {/* Invitations Modal */}
        <InvitationsModal
          isOpen={isInvitationsOpen}
          onClose={() => setIsInvitationsOpen(false)}
          invitations={invitations}
          onRefreshWorkspaces={loadInitialData}
        />
      </div>
    );
  }

  return (
    <div className="app-container">
      <Navbar
        user={user}
        workspaces={spaces}
        currentWorkspace={currentSpace}
        onSelectWorkspace={(sp) => {
          const item = spaces.find((w) => (w.space?._id || w.workspace?._id) === sp._id);
          if (item) handleSelectSpace(item);
        }}
        onOpenCreateWorkspace={() => setIsCreateSpaceOpen(true)}
        invitations={invitations}
        onOpenInvitations={() => setIsInvitationsOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        unreadNotifCount={unreadNotifCount}
        onLogout={handleLogout}
      />

      <div className="app-body">
        {loading ? (
          <div className="loading-state flex-1 flex flex-col justify-center items-center">
            <IconSparkles size={40} className="text-primary margin-bottom-3 animate-pulse" />
            <h3 className="font-semibold text-dark text-lg">Loading your space...</h3>
            <p className="text-secondary text-sm margin-top-1">Preparing your projects and team dashboard</p>
          </div>
        ) : spaces.length === 0 ? (
          <div className="no-workspace-view flex-1 flex flex-col justify-center items-center">
            <div className="empty-state-card card max-w-lg margin-x-auto text-center padding-5">
              <div className="ws-welcome-icon margin-x-auto margin-bottom-3">
                <IconSparkles size={40} className="text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-dark">Welcome to Project Management System</h2>
              <p className="text-secondary text-sm margin-top-2">
                You don't belong to any active space yet. Create your first space using a passkey or check pending invitations to get started.
              </p>
              
              <div className="flex justify-center gap-3 margin-top-5">
                {invitations.length > 0 && (
                  <button className="btn-secondary btn-lg" onClick={() => setIsInvitationsOpen(true)}>
                    <IconUsers size={18} /> View Invitations ({invitations.length})
                  </button>
                )}
                <button className="btn-primary btn-lg" onClick={() => setIsCreateSpaceOpen(true)}>
                  <IconPlus size={18} /> Create First Space
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <Sidebar
              currentWorkspace={currentSpace}
              userRole={userRole}
              projects={projects}
              activeProject={activeProject}
              onSelectProject={(p) => {
                setActiveProject(p);
                setProjectSubTab("overview");
              }}
              activeTab={activeTab}
              setActiveTab={(tab) => {
                setActiveTab(tab);
                if (tab !== "projects") setActiveProject(null);
              }}
              onOpenCreateProject={() => setIsCreateProjectOpen(true)}
              onOpenInviteMember={() => setIsInviteSpaceOpen(true)}
            />

            <main className="main-content">
              {activeProject ? (
                /* Selected Project Detail View */
                <ProjectDetailView
                  project={activeProject}
                  workspaceId={effectiveSpaceId}
                  userRole={userRole}
                  currentUserId={user.id}
                  initialTab={projectSubTab}
                  onProjectUpdated={loadProjects}
                  onBackToProjects={() => {
                    setActiveProject(null);
                    setActiveTab("projects");
                  }}
                />
              ) : activeTab === "dashboard" ? (
                <div className="view-container">
                  <DashboardView
                    workspaceId={effectiveSpaceId}
                    userRole={userRole}
                    userName={user?.name}
                    projectsCount={projects.filter((p) => p.status !== "Completed").length}
                    completedCount={projects.filter((p) => p.status === "Completed").length}
                    archivedCount={archivedProjects.length}
                    onOpenCreateProject={() => setIsCreateProjectOpen(true)}
                    onOpenInviteMember={() => setIsInviteSpaceOpen(true)}
                  />
                </div>
              ) : activeTab === "members" ? (
                <SpaceMembers
                  workspaceId={effectiveSpaceId}
                  currentUserRole={userRole}
                  onOpenInvite={() => setIsInviteSpaceOpen(true)}
                />
              ) : activeTab === "archived" ? (
                /* Archived Projects List View */
                <AllProjectsView
                  projects={[]}
                  archivedProjects={archivedProjects}
                  userRole={userRole}
                  userName={user?.name}
                  onSelectProject={(p) => {
                    setActiveProject(p);
                    setProjectSubTab("overview");
                  }}
                  onOpenCreateProject={() => setIsCreateProjectOpen(true)}
                  onOpenInviteMember={() => setIsInviteSpaceOpen(true)}
                  onArchiveProject={handleArchiveProject}
                  onRestoreProject={handleRestoreProject}
                  onEditProject={(p) => {
                    setEditingProject(p);
                    setIsEditProjectOpen(true);
                  }}
                />
              ) : (
                /* All Projects List View (Default Landing Dashboard) */
                <AllProjectsView
                  projects={projects}
                  archivedProjects={archivedProjects}
                  userRole={userRole}
                  userName={user?.name}
                  onSelectProject={(p) => {
                    setActiveProject(p);
                    setProjectSubTab("overview");
                  }}
                  onOpenCreateProject={() => setIsCreateProjectOpen(true)}
                  onOpenInviteMember={() => setIsInviteSpaceOpen(true)}
                  onArchiveProject={handleArchiveProject}
                  onRestoreProject={handleRestoreProject}
                  onEditProject={(p) => {
                    setEditingProject(p);
                    setIsEditProjectOpen(true);
                  }}
                />
              )}
            </main>
          </>
        )}
      </div>

      {/* Create Space Modal */}
      <Modal
        isOpen={isCreateSpaceOpen}
        onClose={() => setIsCreateSpaceOpen(false)}
        title="Create New Space"
      >
        <form onSubmit={handleCreateSpace} className="modal-form">
          <div className="form-group">
            <label>Space Name *</label>
            <input
              type="text"
              placeholder="e.g. Acme Studio"
              value={wsName}
              onChange={(e) => setWsName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              rows="3"
              placeholder="Brief description of space..."
              value={wsDesc}
              onChange={(e) => setWsDesc(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Passkey *</label>
            <input
              type="password"
              placeholder="Enter passkey..."
              value={spacePasskey}
              onChange={(e) => setSpacePasskey(e.target.value)}
              required
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsCreateSpaceOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create Space
            </button>
          </div>
        </form>
      </Modal>

      {/* Invite Space Member Modal */}
      <Modal
        isOpen={isInviteSpaceOpen}
        onClose={() => setIsInviteSpaceOpen(false)}
        title="Invite Team Member"
      >
        <form onSubmit={handleInviteUser} className="modal-form">
          <div className="form-group">
            <label>User Email Address</label>
            <input
              type="email"
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label>Permission Role</label>
              <select
                value={inviteRole}
                onChange={(e) => {
                  const newRole = e.target.value;
                  setInviteRole(newRole);
                  if (newRole !== "Member") {
                    setInviteJobRole("Others");
                  }
                }}
              >
                <option value="Product Owner">Product Owner</option>
                <option value="Scrum Master">Scrum Master</option>
                <option value="Member">Member</option>
                <option value="Stakeholder">Stakeholder</option>
              </select>
            </div>
            <div className="form-group">
              <label>Job Role</label>
              <select
                value={inviteRole === "Member" ? (inviteJobRole === "Other" ? "Others" : inviteJobRole) : "Others"}
                onChange={(e) => setInviteJobRole(e.target.value)}
                disabled={inviteRole !== "Member"}
              >
                {inviteRole !== "Member" ? (
                  <option value="Others">N/A ({inviteRole})</option>
                ) : (
                  <>
                    <option value="Developer">Developer</option>
                    <option value="Tester">Tester</option>
                    <option value="Product Lead">Product Lead</option>
                    <option value="Others">Others</option>
                  </>
                )}
              </select>
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsInviteSpaceOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Send Invitation
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Project Modal */}
      <Modal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        title="Create New Project"
      >
        <form onSubmit={handleCreateProject} className="modal-form">
          <div className="form-group">
            <label>Project Name *</label>
            <input
              type="text"
              placeholder="e.g. E-Commerce Platform"
              value={projName}
              onChange={(e) => setProjName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              rows="3"
              placeholder="Key objectives and project overview..."
              value={projDesc}
              onChange={(e) => setProjDesc(e.target.value)}
            />
          </div>
          <div className="grid-2 gap-3 margin-top-3">
            <div className="form-group">
              <label>Start Date</label>
              <input
                type="date"
                value={projStartDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setProjStartDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Due Date</label>
              <input
                type="date"
                value={projDueDate}
                min={projStartDate || undefined}
                onChange={(e) => setProjDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="modal-actions margin-top-4 flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setIsCreateProjectOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create Project
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Project Modal */}
      {isEditProjectOpen && editingProject && (
        <ProjectEditModal
          isOpen={isEditProjectOpen}
          onClose={() => setIsEditProjectOpen(false)}
          project={editingProject}
          onProjectUpdated={loadProjects}
        />
      )}

      {/* Invitations Modal */}
      <InvitationsModal
        isOpen={isInvitationsOpen}
        onClose={() => setIsInvitationsOpen(false)}
        invitations={invitations}
        onRefreshWorkspaces={loadInitialData}
      />

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        workspaceId={currentSpace?._id}
        onSelectProject={(p) => {
          setActiveProject(p);
          setProjectSubTab("overview");
        }}
        onSelectTask={(t) => {
          const p = projects.find((proj) => proj._id === (t.project?._id || t.project));
          if (p) {
            setActiveProject(p);
            setProjectSubTab("tasks");
          }
        }}
      />

      {/* Notifications Drawer */}
      <NotificationsDrawer
        userId={user.id}
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
    </div>
  );
}
