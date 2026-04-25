import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';

import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Services from './pages/Services.jsx';
import Importer from './pages/Importer.jsx';
import Employes from './pages/Employes.jsx';
import EmployeDetail from './pages/EmployeDetail.jsx';
import Planning from './pages/Planning.jsx';
import CRM from './pages/CRM.jsx';
import Rapports from './pages/Rapports.jsx';
import Parametres from './pages/Parametres.jsx';

function ProtectedRoute({ children }) {
  const { status, profile } = useAuth();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-muted">Chargement…</div>
      </div>
    );
  }

  if (status === 'guest') return <Navigate to="/login" replace />;

  if (profile && profile.role !== 'chef') {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="card p-8 max-w-md text-center">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Accès refusé</h2>
          <p className="mt-2 text-sm text-muted">
            Le panel d'administration est réservé aux chefs d'équipe.
          </p>
        </div>
      </div>
    );
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/"                 element={<Dashboard />} />
          <Route path="/services"         element={<Services />} />
          <Route path="/importer"         element={<Importer />} />
          <Route path="/employes"         element={<Employes />} />
          <Route path="/employes/:id"     element={<EmployeDetail />} />
          <Route path="/planning"         element={<Planning />} />
          <Route path="/crm"              element={<CRM />} />
          <Route path="/rapports"         element={<Rapports />} />
          <Route path="/parametres"       element={<Parametres />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
