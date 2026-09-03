import { useState, useEffect, useRef, type ReactNode } from "react";
import { useLocation, Link } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Shield,
  LayoutDashboard,
  FileSearch,
  Upload,
  Users,
  Network,
  GitBranch,
  AlertTriangle,
  Brain,
  FileText,
  ScrollText,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  CheckCircle2,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Investigations", path: "/investigations", icon: FileSearch },
  { label: "Upload Intel", path: "/upload", icon: Upload },
  { label: "Entities", path: "/entities", icon: Users },
  { label: "Network", path: "/network", icon: Network },
  { label: "Relationships", path: "/relationships", icon: GitBranch },
  { label: "Patterns", path: "/patterns", icon: AlertTriangle },
  { label: "AI Insights", path: "/ai-insights", icon: Brain },
  { label: "Reports", path: "/reports", icon: FileText },
  { label: "Audit Log", path: "/audit", icon: ScrollText },
  { label: "Settings", path: "/settings", icon: Settings },
];

const NOTIFICATIONS = [
  {
    id: 1,
    title: "High-priority investigation",
    message: "Operation Black Net requires attention.",
    time: "Just now",
    type: "alert",
  },
  {
    id: 2,
    title: "Intelligence processed",
    message: "New entities and relationships were extracted successfully.",
    time: "5 min ago",
    type: "success",
  },
  {
    id: 3,
    title: "AI analysis completed",
    message: "Network analysis is ready to review.",
    time: "12 min ago",
    type: "info",
  },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    return localStorage.getItem("sidebarOpen") !== "false";
  });

  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsRead, setNotificationsRead] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const location = useLocation();
  const { user, signOut } = useAuth();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem("sidebarOpen", String(sidebarOpen));
  }, [sidebarOpen]);

  // Close notification panel when clicking outside it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        notificationRef.current &&
        !notificationRef.current.contains(target)
      ) {
        setNotificationsOpen(false);
      }

      if (
        profileRef.current &&
        !profileRef.current.contains(target)
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const handleNotificationClick = () => {
    setNotificationsOpen((previous) => !previous);

    if (!notificationsOpen) {
      setNotificationsRead(true);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#080c14]">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r border-white/[0.06] bg-[#0c1018] transition-all duration-200",
          sidebarOpen ? "w-56" : "w-14"
        )}
      >
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex items-center gap-3 w-full px-3 py-2 cursor-pointer"
          title={sidebarOpen ? "Collapse menu" : "Expand menu"}
        >
          <img
            src="/logo.svg"
            alt="CrimeNet"
            className="w-8 h-8 shrink-0"
          />

          {sidebarOpen && (
            <span className="text-sm font-semibold text-white tracking-wide">
              CrimeNet
            </span>
          )}
        </button>

        <nav className="flex-1 overflow-y-auto py-2.5 px-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors",
                  active
                    ? "bg-cyan-500/10 text-cyan-400"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 shrink-0",
                    active && "text-cyan-400"
                  )}
                />

                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* 
        <div className="p-2 border-t border-white/[0.06]">
          
        </div> */}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-[#0c1018] border-r border-white/[0.06] transform transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-3.5 h-14 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>

            <span className="text-sm font-semibold text-white">
              CrimeNet
            </span>
          </div>

          <button
            onClick={() => setMobileOpen(false)}
            className="text-gray-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="py-2.5 px-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors",
                  active
                    ? "bg-cyan-500/10 text-cyan-400"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between h-14 px-4 lg:px-5 border-b border-white/[0.06] bg-[#0a0e16]/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-gray-400 hover:text-white p-1"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="hidden lg:flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />

              <span className="text-[15px] font-medium tracking-wider text-gray-500 uppercase">
                Analysis System
              </span>

              <span className="text-[15px] text-gray-700">
                •
              </span>

              <span className="text-[15px] text-gray-600">
                Online
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Notifications */}
            <div
              ref={notificationRef}
              className="relative"
            >
              <button
                onClick={handleNotificationClick}
                className={cn(
                  "relative p-1.5 rounded-md transition-colors",
                  notificationsOpen
                    ? "text-gray-300 bg-white/[0.03]"
                    : "text-gray-600 hover:text-gray-300 hover:bg-white/[0.03]"
                )}
                title="Notifications"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
              >
                <Bell className="w-4 h-4" />

                {!notificationsRead && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-cyan-400" />
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-white/[0.08] bg-[#0c1018] shadow-2xl shadow-black/40 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                    <div>
                      <h3 className="text-xs font-semibold text-white">
                        Notifications
                      </h3>

                      <p className="text-[10px] text-gray-600 mt-0.5">
                        Recent system activity
                      </p>
                    </div>

                    {!notificationsRead && (
                      <span className="text-[9px] text-cyan-400">
                        3 new
                      </span>
                    )}
                  </div>

                  {/* Notifications */}
                  <div className="max-h-80 overflow-y-auto">
                    {NOTIFICATIONS.map((notification) => {
                      return (
                        <div
                          key={notification.id}
                          className="flex gap-3 px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                        >
                          <div className="mt-0.5 shrink-0">
                            {notification.type === "alert" ? (
                              <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
                                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                              </div>
                            ) : notification.type === "success" ? (
                              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              </div>
                            ) : (
                              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                                <Info className="w-3.5 h-3.5 text-cyan-400" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="text-[11px] font-medium text-gray-300">
                              {notification.title}
                            </p>

                            <p className="text-[10px] text-gray-600 mt-0.5 leading-relaxed">
                              {notification.message}
                            </p>

                            <p className="text-[9px] text-gray-700 mt-1">
                              {notification.time}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => setNotificationsRead(true)}
                      className="w-full text-[10px] text-gray-600 hover:text-cyan-400 transition-colors"
                    >
                      Mark all as read
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="w-px h-5 bg-white/[0.06] mx-1" />

            <div ref={profileRef} className="relative">
              {/* Profile button */}
              <button
                type="button"
                onClick={() => setProfileOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-md p-1 hover:bg-white/[0.03] transition-colors"
                title="Profile"
                aria-label="Profile"
                aria-expanded={profileOpen}
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-[10px] font-bold text-white">
                  {user?.name?.[0] || user?.email?.[0] || "U"}
                </div>
              </button>

              {/* Profile dropdown */}
              {profileOpen && (
                <div className="absolute right-0 top-10 z-50 w-64 rounded-xl border border-white/[0.08] bg-[#0c1018] shadow-2xl shadow-black/40 overflow-hidden">
                  
                  {/* Profile information */}
                  <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06]">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {user?.name?.[0] || user?.email?.[0] || "U"}
                    </div>

                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-gray-300 truncate">
                        {user?.name || "User"}
                      </p>

                      <p className="text-[10px] text-gray-600 mt-0.5 truncate">
                        {user?.email || ""}
                      </p>
                    </div>
                  </div>

                  {/* Sign out */}
                  <div className="p-1.5">
                    <button
                      type="button"
                      onClick={() => signOut()}
                      className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-[11px] text-gray-500 hover:text-red-400 hover:bg-white/[0.03] transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 lg:p-5">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
