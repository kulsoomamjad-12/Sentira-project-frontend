import React from 'react';
import { Navigate } from 'react-router-dom';

// Redirects to /login if there's no stored auth token
export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
}
