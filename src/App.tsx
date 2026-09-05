import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, PublicOnlyRoute } from './components/auth/AuthGuard';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { CardsPage } from './pages/CardsPage';
import { PropertiesPage } from './pages/PropertiesPage';
import { SettingsPage } from './pages/SettingsPage';

import { NewTransactionPage } from './pages/NewTransactionPage';
import { PropertyDetailsPage } from './pages/PropertyDetailsPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Exclusive Routes */}
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/cadastro" element={<RegisterPage />} />
          </Route>

          {/* Protected Application Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/transacoes" element={<TransactionsPage />} />
              <Route path="/transacoes/novo" element={<NewTransactionPage />} />
              <Route path="/cartoes" element={<CardsPage />} />
              <Route path="/imoveis" element={<PropertiesPage />} />
              <Route path="/imoveis/:id" element={<PropertyDetailsPage />} />
              <Route path="/configuracoes" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Fallback Redirections */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
