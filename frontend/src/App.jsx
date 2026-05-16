import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useEffect, Component } from 'react';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';

import AdminDashboard from './pages/admin/AdminDashboard';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import StudentDashboard from './pages/student/StudentDashboard';
import ParentDashboard from './pages/parent/ParentDashboard';

// BUG-21 Fix: Proper styled Unauthorized page instead of blank div
const Unauthorized = () => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', height: '100vh', gap: '1rem',
    fontFamily: 'Outfit, sans-serif', background: 'var(--bg-primary)', color: 'var(--text-primary)'
  }}>
    <div style={{ fontSize: '4rem' }}>🚫</div>
    <h1 style={{ fontSize: '1.75rem', fontWeight: '700' }}>Access Denied</h1>
    <p style={{ color: 'var(--text-secondary)' }}>You don't have permission to view this page.</p>
    <a href="/" style={{
      marginTop: '1rem', padding: '0.75rem 1.5rem', borderRadius: '0.5rem',
      background: 'linear-gradient(135deg, #4338ca, #6366f1)', color: 'white',
      textDecoration: 'none', fontWeight: '600'
    }}>Go to Dashboard</a>
  </div>
);

// BUG-25 Fix: Error boundary to prevent full-page white crash
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh', gap: '1rem',
          fontFamily: 'Outfit, sans-serif', background: 'var(--bg-primary)', color: 'var(--text-primary)'
        }}>
          <div style={{ fontSize: '3rem' }}>⚠️</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Something went wrong</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', textAlign: 'center' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button onClick={() => window.location.reload()} style={{
            marginTop: '1rem', padding: '0.75rem 1.5rem', borderRadius: '0.5rem',
            background: 'linear-gradient(135deg, #4338ca, #6366f1)', color: 'white',
            border: 'none', fontWeight: '600', cursor: 'pointer', fontFamily: 'Outfit, sans-serif'
          }}>Reload Page</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// BUG-24 Fix: Respect user's saved theme preference even on login page
const ThemeEnforcer = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const savedTheme = localStorage.getItem('theme') || 'dark';
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      // BUG-24: Apply saved preference on login too, not always 'light'
      const savedTheme = localStorage.getItem('theme') || 'light';
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, [user]);

  return null;
};

// BUG-22 Fix: Styled loading spinner instead of raw unstyled text
const LoadingScreen = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100vh', background: 'var(--bg-primary)'
  }}>
    <div style={{
      width: '40px', height: '40px', borderRadius: '50%',
      border: '3px solid var(--border-color)',
      borderTop: '3px solid var(--brand-primary)',
      animation: 'spin 0.8s linear infinite'
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const RootRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" />;

  switch (user.role) {
    case 'admin': return <Navigate to="/admin" />;
    case 'teacher': return <Navigate to="/teacher" />;
    case 'student': return <Navigate to="/student" />;
    case 'parent': return <Navigate to="/parent" />;
    default: return <Navigate to="/login" />;
  }
};

// Read base path from env — '/' for local dev, '/sms/' for production
const basePath = import.meta.env.VITE_BASE_PATH || '/';

function App() {
  return (
    <AuthProvider>
      <Router basename={basePath}>
        <ThemeEnforcer />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          <Route path="/" element={<RootRedirect />} />

          {/* Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin/*" element={<ErrorBoundary><AdminDashboard /></ErrorBoundary>} />
          </Route>

          {/* Teacher Routes */}
          <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
            <Route path="/teacher/*" element={<ErrorBoundary><TeacherDashboard /></ErrorBoundary>} />
          </Route>

          {/* Student Routes */}
          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route path="/student/*" element={<ErrorBoundary><StudentDashboard /></ErrorBoundary>} />
          </Route>

          {/* Parent Routes */}
          <Route element={<ProtectedRoute allowedRoles={['parent']} />}>
            <Route path="/parent/*" element={<ErrorBoundary><ParentDashboard /></ErrorBoundary>} />
          </Route>

          {/* Catch-all route for any undefined paths */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
