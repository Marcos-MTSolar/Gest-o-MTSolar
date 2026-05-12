/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { requestNotificationPermission } from './lib/notifications';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Layout from './components/Layout';
import { Loader2 } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

// Lazy load pages
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Users = lazy(() => import('./pages/Users'));
const Commercial = lazy(() => import('./pages/Commercial'));
const Technical = lazy(() => import('./pages/Technical'));
const Obra = lazy(() => import('./pages/Obra'));
const Messages = lazy(() => import('./pages/Messages'));
const Agenda = lazy(() => import('./pages/Agenda'));
const Settings = lazy(() => import('./pages/Settings'));
const Documents = lazy(() => import('./pages/Documents'));
const KitPurchase = lazy(() => import('./pages/KitPurchase'));
const Homologation = lazy(() => import('./pages/Homologation'));
const FinishedProjects = lazy(() => import('./pages/FinishedProjects'));
const Stock = lazy(() => import('./pages/Stock'));
const ProposalGenerator = lazy(() => import('./pages/ProposalGenerator'));
const Contracts = lazy(() => import('./pages/Contracts'));
const WhatsApp = lazy(() => import('./pages/WhatsApp'));
const NeoenergiaProtocols = lazy(() => import('./pages/NeoenergiaProtocols'));
const EnergyCalculator = lazy(() => import('./pages/EnergyCalculator'));
const ObraSchedule = lazy(() => import('./pages/ObraSchedule'));




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
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <AuthProvider>
        <SocketProvider>
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
              <Loader2 className="w-12 h-12 text-blue-900 animate-spin mb-4" />
              <p className="text-gray-600 font-medium animate-pulse">Carregando MT Solar...</p>
            </div>
          }>
            <Routes>
              <Route path="/login" element={<Login />} />
              
              <Route path="/" element={
                <PrivateRoute roles={['CEO', 'ADMIN', 'COMMERCIAL', 'TECHNICAL']}>
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

              <Route path="/contracts" element={
                <PrivateRoute roles={['CEO', 'ADMIN']}>
                  <Contracts />
                </PrivateRoute>
              } />
              
              <Route path="/proposal-generator" element={
                <PrivateRoute roles={['CEO', 'ADMIN', 'COMMERCIAL']}>
                  <ProposalGenerator />
                </PrivateRoute>
              } />

              
              <Route path="/technical" element={
                <PrivateRoute roles={['CEO', 'ADMIN', 'TECHNICAL']}>
                  <Technical />
                </PrivateRoute>
              } />

              <Route path="/obra" element={
                <PrivateRoute roles={['CEO', 'ADMIN', 'TECHNICAL']}>
                  <Obra />
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

              <Route path="/estoque" element={
                <PrivateRoute roles={['CEO', 'ADMIN']}>
                  <Stock />
                </PrivateRoute>
              } />

              <Route path="/homologation" element={
                <PrivateRoute roles={['CEO', 'ADMIN', 'COMMERCIAL']}>
                  <Homologation />
                </PrivateRoute>
              } />

              <Route path="/finished" element={
                <PrivateRoute roles={['CEO', 'ADMIN']}>
                  <FinishedProjects />
                </PrivateRoute>
              } />
              
              <Route path="/messages" element={
                <PrivateRoute roles={['CEO', 'ADMIN', 'TECHNICAL']}>
                  <Messages />
                </PrivateRoute>
              } />

              <Route path="/whatsapp" element={
                <PrivateRoute roles={['CEO', 'ADMIN', 'COMMERCIAL']}>
                  <WhatsApp />
                </PrivateRoute>
              } />

              <Route path="/agenda" element={
                <PrivateRoute roles={['CEO', 'ADMIN', 'COMMERCIAL']}>
                  <Agenda />
                </PrivateRoute>
              } />

              <Route path="/neoenergia" element={
                <PrivateRoute roles={['CEO', 'ADMIN']}>
                  <NeoenergiaProtocols />
                </PrivateRoute>
              } />

              <Route path="/calculadora" element={
                <PrivateRoute roles={['CEO', 'ADMIN', 'COMMERCIAL']}>
                  <EnergyCalculator />
                </PrivateRoute>
              } />

              <Route path="/cronograma" element={
                <PrivateRoute roles={['CEO', 'ADMIN', 'COMMERCIAL', 'TECHNICAL']}>
                  <ObraSchedule />
                </PrivateRoute>
              } />
              
              <Route path="/settings" element={
                <PrivateRoute roles={['CEO', 'ADMIN']}>
                  <Settings />
                </PrivateRoute>
              } />

              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Suspense>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

