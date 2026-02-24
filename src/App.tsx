/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Commercial from './pages/Commercial';
import Technical from './pages/Technical';
import Installation from './pages/Installation';
import Messages from './pages/Messages';
import Agenda from './pages/Agenda';
import Settings from './pages/Settings';
import Documents from './pages/Documents';
import KitPurchase from './pages/KitPurchase';
import Homologation from './pages/Homologation';
import FinishedProjects from './pages/FinishedProjects';

function PrivateRoute({ children, roles }: { children: React.ReactNode, roles?: string[] }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  
  if (!user) return <Navigate to="/login" />;

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } />
            
            <Route path="/users" element={
              <PrivateRoute roles={['CEO', 'ADMIN']}>
                <Users />
              </PrivateRoute>
            } />
            
            <Route path="/commercial" element={
              <PrivateRoute roles={['CEO', 'ADMIN', 'COMMERCIAL']}>
                <Commercial />
              </PrivateRoute>
            } />
            
            <Route path="/technical" element={
              <PrivateRoute roles={['CEO', 'ADMIN', 'TECHNICAL']}>
                <Technical />
              </PrivateRoute>
            } />

            <Route path="/installation" element={
              <PrivateRoute roles={['CEO', 'ADMIN', 'TECHNICAL']}>
                <Installation />
              </PrivateRoute>
            } />

            <Route path="/documents" element={
              <PrivateRoute roles={['CEO', 'ADMIN']}>
                <Documents />
              </PrivateRoute>
            } />

            <Route path="/kit-purchase" element={
              <PrivateRoute roles={['CEO', 'ADMIN']}>
                <KitPurchase />
              </PrivateRoute>
            } />

            <Route path="/homologation" element={
              <PrivateRoute roles={['CEO', 'ADMIN']}>
                <Homologation />
              </PrivateRoute>
            } />

            <Route path="/finished" element={
              <PrivateRoute roles={['CEO', 'ADMIN']}>
                <FinishedProjects />
              </PrivateRoute>
            } />
            
            <Route path="/messages" element={
              <PrivateRoute>
                <Messages />
              </PrivateRoute>
            } />

            <Route path="/agenda" element={
              <PrivateRoute>
                <Agenda />
              </PrivateRoute>
            } />
            
            <Route path="/settings" element={
              <PrivateRoute>
                <Settings />
              </PrivateRoute>
            } />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

