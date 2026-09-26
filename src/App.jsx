import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import FormBuilder from './pages/FormBuilder';
import ActionCenter from './pages/ActionCenter';
import LogExternalFeedback from './pages/LogExternalFeedback';
import AccountSettings from './pages/AccountSettings';
import Team from './pages/Team';
import PublicFeedbackForm from './pages/PublicFeedbackForm';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-base-bg">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/feedback/:slug" element={<PublicFeedbackForm />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/forms"
            element={
              <ProtectedRoute>
                <FormBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/action-center"
            element={
              <ProtectedRoute>
                <ActionCenter />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/log-feedback"
            element={
              <ProtectedRoute>
                <LogExternalFeedback />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/account"
            element={
              <ProtectedRoute>
                <AccountSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/team"
            element={
              <ProtectedRoute>
                <Team />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
