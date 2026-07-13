import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, roles, permissions, requireAllPermissions = false }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
      <div className="spinner" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  if (permissions?.length) {
    const userPermissions = user.permissions || [];
    const hasPermission = requireAllPermissions
      ? permissions.every((permission) => userPermissions.includes(permission))
      : permissions.some((permission) => userPermissions.includes(permission));
    if (!hasPermission) return <Navigate to="/" replace />;
  }
  return children;
}
