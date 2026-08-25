/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./components/layout/MainLayout";
import { RefreshCw } from "lucide-react";

// Lazy loading or direct imports for pages
const CommandCenter = React.lazy(() => import("./pages/CommandCenter").then(module => ({ default: module.CommandCenter })));
const Projects = React.lazy(() => import("./pages/Projects").then(module => ({ default: module.Projects })));
const ProjectDetail = React.lazy(() => import("./pages/ProjectDetail").then(module => ({ default: module.ProjectDetail })));
const Login = React.lazy(() => import("./pages/Login").then(module => ({ default: module.Login })));
const Register = React.lazy(() => import("./pages/Register").then(module => ({ default: module.Register })));
const UserManagement = React.lazy(() => import("./pages/UserManagement").then(module => ({ default: module.UserManagement })));
const AddUser = React.lazy(() => import("./pages/AddUser").then(module => ({ default: module.AddUser })));
const NotFound = React.lazy(() => import("./pages/NotFound").then(module => ({ default: module.NotFound })));
const Meetings = React.lazy(() => import("./pages/Meetings").then(module => ({ default: module.Meetings })));
const Settings = React.lazy(() => import("./pages/Settings").then(module => ({ default: module.Settings })));
const Plagiarism = React.lazy(() => import("./pages/Plagiarism").then(module => ({ default: module.Plagiarism })));
const Attendance = React.lazy(() => import("./pages/Attendance").then(module => ({ default: module.Attendance })));
const Reports = React.lazy(() => import("./pages/Reports").then(module => ({ default: module.Reports })));
const Teams = React.lazy(() => import("./pages/Teams").then(module => ({ default: module.Teams })));
const SessionManagement = React.lazy(() => import("./pages/SessionManagement").then(module => ({ default: module.SessionManagement })));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('auth_token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function LoadingSpinner() {
  return <div className="flex h-screen items-center justify-center text-white">Loading...</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="flex items-center justify-center h-screen"><RefreshCw className="w-8 h-8 animate-spin text-accent" /></div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route path="/" element={<CommandCenter />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/users/add" element={<AddUser />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/sessions" element={<SessionManagement />} />
            <Route path="/meetings" element={<Meetings />} />
            <Route path="/plagiarism" element={<Plagiarism />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
