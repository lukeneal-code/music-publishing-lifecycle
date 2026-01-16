import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { Layout } from '@/components/Layout';
import { LoginPage } from '@/pages/Login/LoginPage';
import { DashboardPage } from '@/pages/Dashboard/DashboardPage';
import { RoyaltiesPage } from '@/pages/Royalties/RoyaltiesPage';
import { StatementDetailPage } from '@/pages/Royalties/StatementDetailPage';
import { WorksPage } from '@/pages/Works/WorksPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="royalties" element={<RoyaltiesPage />} />
        <Route path="royalties/:statementId" element={<StatementDetailPage />} />
        <Route path="works" element={<WorksPage />} />
      </Route>
    </Routes>
  );
}

export default App;
