import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { Sidebar } from './components/common/Sidebar';
import { Navbar } from './components/common/Navbar';

import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { KycList } from './pages/KycList';
import { NewKycCase } from './pages/NewKycCase';
import { CaseDetail } from './pages/CaseDetail';
import { ReviewQueue } from './pages/ReviewQueue';
import { Settings } from './pages/Settings';

// Authenticated layout shell with persistent Sidebar and Navbar
const AppShell: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Authentication Pages */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected Application Workspace */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/kyc" element={<KycList />} />
              <Route path="/kyc/new" element={<NewKycCase />} />
              <Route path="/kyc/:id" element={<CaseDetail />} />
              <Route path="/review" element={<ReviewQueue />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
