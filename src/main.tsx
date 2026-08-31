import "@vly-ai/integrations";
import { Toaster } from "@/components/ui/sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import React, { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";

// Lazy load route components
const Landing = lazy(() => import("./pages/Landing.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const Investigations = lazy(() => import("./pages/Investigations.tsx"));
const InvestigationDetail = lazy(() => import("./pages/InvestigationDetail.tsx"));
const IntelligenceUpload = lazy(() => import("./pages/IntelligenceUpload.tsx"));
const Entities = lazy(() => import("./pages/Entities.tsx"));
const CriminalNetwork = lazy(() => import("./pages/CriminalNetwork.tsx"));
const RelationshipExplorer = lazy(() => import("./pages/RelationshipExplorer.tsx"));
const PatternDetection = lazy(() => import("./pages/PatternDetection.tsx"));
const AIInsights = lazy(() => import("./pages/AIInsights.tsx"));
const Reports = lazy(() => import("./pages/Reports.tsx"));
const AuditLogs = lazy(() => import("./pages/AuditLogs.tsx"));
const Settings = lazy(() => import("./pages/Settings.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080c14]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
        <span className="text-xs text-gray-500">Loading...</span>
      </div>
    </div>
  );
}

class ToolbarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: Error) {
    console.warn("[VlyToolbar] Caught error, toolbar disabled:", err.message);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  state = { hasError: false, message: "" };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message || "Unknown error" };
  }
  componentDidCatch(err: Error) {
    console.error("[Root] Crash:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#060a12] p-6">
          <div className="max-w-md text-center">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-red-400 text-xl">⚠</span>
            </div>
            <p className="text-sm font-semibold text-white">Runtime Error</p>
            <p className="mt-2 text-xs text-gray-500">{this.state.message}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const convex = new ConvexReactClient(
  import.meta.env.VITE_CONVEX_URL as string
);

function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*"
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <ToolbarErrorBoundary>
        <VlyToolbar />
      </ToolbarErrorBoundary>
      <ConvexAuthProvider client={convex}>
        <BrowserRouter>
          <RouteSyncer />
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route
                path="/auth"
                element={<AuthPage redirectAfterAuth="/dashboard" />}
              />
              <Route
                path="/dashboard"
                element={
                  <RequireAuth>
                    <Dashboard />
                  </RequireAuth>
                }
              />
              <Route
                path="/investigations"
                element={
                  <RequireAuth>
                    <Investigations />
                  </RequireAuth>
                }
              />
              <Route
                path="/investigations/:id"
                element={
                  <RequireAuth>
                    <InvestigationDetail />
                  </RequireAuth>
                }
              />
              <Route
                path="/upload"
                element={
                  <RequireAuth>
                    <IntelligenceUpload />
                  </RequireAuth>
                }
              />
              <Route
                path="/entities"
                element={
                  <RequireAuth>
                    <Entities />
                  </RequireAuth>
                }
              />
              <Route
                path="/network"
                element={
                  <RequireAuth>
                    <CriminalNetwork />
                  </RequireAuth>
                }
              />
              <Route
                path="/relationships"
                element={
                  <RequireAuth>
                    <RelationshipExplorer />
                  </RequireAuth>
                }
              />
              <Route
                path="/patterns"
                element={
                  <RequireAuth>
                    <PatternDetection />
                  </RequireAuth>
                }
              />
              <Route
                path="/ai-insights"
                element={
                  <RequireAuth>
                    <AIInsights />
                  </RequireAuth>
                }
              />
              <Route
                path="/reports"
                element={
                  <RequireAuth>
                    <Reports />
                  </RequireAuth>
                }
              />
              <Route
                path="/audit"
                element={
                  <RequireAuth>
                    <AuditLogs />
                  </RequireAuth>
                }
              />
              <Route
                path="/settings"
                element={
                  <RequireAuth>
                    <Settings />
                  </RequireAuth>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster />
      </ConvexAuthProvider>
    </RootErrorBoundary>
  </StrictMode>
);
