import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const ProtectedRoute: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="gg-root" style={{ display: 'flex', alignItems: 'center', justifyItems: 'center' }}>
        <div className="gg-spin" style={{ width: 40, height: 40, border: '4px solid rgba(255,255,255,0.1)', borderTopColor: '#818cf8' }} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
