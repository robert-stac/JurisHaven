import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Library from './pages/Library';
import Search from './pages/Search';
import DocumentView from './pages/DocumentView';
import Users from './pages/Users';
import Login from './pages/Login';
import Notifications from './pages/Notifications';
import AdminRequests from './pages/AdminRequests';

function AdminRoute({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'admin') return <Navigate to="/library" />;
  return children;
}

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-full bg-surface flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route 
        path="/library" 
        element={user ? <Library /> : <Navigate to="/login" />} 
      />

      <Route 
        path="/notifications" 
        element={user ? <Notifications /> : <Navigate to="/login" />} 
      />

      <Route 
        path="/search" 
        element={user ? <Search /> : <Navigate to="/login" />} 
      />

      <Route 
        path="/document/:id" 
        element={user ? <DocumentView /> : <Navigate to="/login" />} 
      />

      <Route 
        path="/admin/users" 
        element={<AdminRoute><Users /></AdminRoute>} 
      />

      <Route 
        path="/admin/requests" 
        element={<AdminRoute><AdminRequests /></AdminRoute>} 
      />
      
      <Route path="*" element={<Navigate to={user ? "/library" : "/login"} />} />
    </Routes>
  );
}

export default App;
