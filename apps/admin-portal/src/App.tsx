import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { DashboardPage } from '@/pages/Dashboard/DashboardPage';
import { WorksPage } from '@/pages/Works/WorksPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="works" element={<WorksPage />} />
        <Route path="deals" element={<div className="p-6">Deals - Coming Soon</div>} />
        <Route path="royalties" element={<div className="p-6">Royalties - Coming Soon</div>} />
        <Route path="songwriters" element={<div className="p-6">Songwriters - Coming Soon</div>} />
        <Route path="settings" element={<div className="p-6">Settings - Coming Soon</div>} />
      </Route>
    </Routes>
  );
}

export default App;
