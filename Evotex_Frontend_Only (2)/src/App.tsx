import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/voter/DashboardPage';
import ElectionsPage from './pages/voter/ElectionsPage';
import VotingPage from './pages/voter/VotingPage';
import EnrollBiometricsPage from './pages/voter/EnrollBiometricsPage';
import BiometricVerifyPage from './pages/BiometricVerifyPage';
import ResultsPage from './pages/voter/ResultsPage';
import NotificationsPage from './pages/voter/NotificationsPage';
import ProfilePage from './pages/voter/ProfilePage';
import HelpPage from './pages/HelpPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminElections from './pages/admin/AdminElections';
import AdminCreateElection from './pages/admin/AdminCreateElection';
import AdminEditElection from './pages/admin/AdminEditElection';
import AdminVoters from './pages/admin/AdminVoters';
import AdminResults from './pages/admin/AdminResults';
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminSettings from './pages/admin/AdminSettings';
import ChatbotWidget from './components/ChatbotWidget';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('evotex_token');
  const role = localStorage.getItem('evotex_role');
  if (!token || role !== 'voter') return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('evotex_token');
  const role = localStorage.getItem('evotex_role');
  if (!token || role !== 'admin') return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

function AppContent() {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/verify/biometric" element={<ProtectedRoute><BiometricVerifyPage /></ProtectedRoute>} />
        <Route path="/candidate-page" element={<ProtectedRoute><ElectionsPage /></ProtectedRoute>} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/results/:id" element={<ResultsPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/elections" element={<ProtectedRoute><ElectionsPage /></ProtectedRoute>} />
        <Route path="/elections/:id/vote" element={<ProtectedRoute><VotingPage /></ProtectedRoute>} />
        <Route path="/voter/enroll-biometrics" element={<ProtectedRoute><EnrollBiometricsPage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/elections" element={<AdminRoute><AdminElections /></AdminRoute>} />
        <Route path="/admin/elections/create" element={<AdminRoute><AdminCreateElection /></AdminRoute>} />
        <Route path="/admin/elections/edit/:id" element={<AdminRoute><AdminEditElection /></AdminRoute>} />
        <Route path="/admin/voters" element={<AdminRoute><AdminVoters /></AdminRoute>} />
        <Route path="/admin/results/:id" element={<AdminRoute><AdminResults /></AdminRoute>} />
        <Route path="/admin/notifications" element={<AdminRoute><AdminNotifications /></AdminRoute>} />
        <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!isAdminPage && <ChatbotWidget />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
