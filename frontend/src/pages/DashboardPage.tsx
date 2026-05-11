import React from 'react';
import { useAuth } from '../hooks/useAuth';

const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="gg-root" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
      <div className="gg-panel in" style={{ textAlign: 'center', maxWidth: '600px' }}>
        <div className="gg-head">
          <h1>Welcome, {user?.login}!</h1>
          <p> sentinel dashboard is ready</p>
        </div>

        <div style={{ margin: '30px 0', padding: '20px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <img src={user?.avatarUrl} alt="Avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', marginBottom: '15px', border: '2px solid #818cf8' }} />
          <div style={{ fontFamily: "'JetBrains Mono', monospace", color: '#e2e8f0' }}>
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>ID:</strong> {user?.id}</p>
          </div>
        </div>

        <button onClick={logout} className="gg-btn" style={{ maxWidth: '200px', margin: '0 auto' }}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default DashboardPage;
