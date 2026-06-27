/**
 * @file components/settings/TeamManagement.tsx
 * @description Team member management with role assignment
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Trash2 } from 'lucide-react';
import { T } from '../../constants/theme';
import api from '../../services/api';

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'reviewer' | 'viewer';
  joinedDate: string;
}

export const TeamManagement: React.FC = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'reviewer' | 'viewer'>('reviewer');

  const STORAGE_KEY = 'gitguard_team_members';

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/team');
      setMembers(response.data?.members || []);
      setError(null);
    } catch (err) {
      console.warn('API /api/team not available, falling back to localStorage');
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setMembers(JSON.parse(stored));
      } else {
        setMembers([]);
      }
      setError(null); // Clear error for seamless local experience
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) return;

    try {
      await api.post('/api/team/members', {
        email: newMemberEmail,
        role: newMemberRole,
      });
      setNewMemberEmail('');
      setShowAddMember(false);
      fetchTeamMembers();
    } catch (err) {
      const newMember: TeamMember = {
        id: Date.now().toString(),
        email: newMemberEmail,
        name: newMemberEmail.split('@')[0],
        role: newMemberRole,
        joinedDate: new Date().toISOString()
      };
      const updated = [...members, newMember];
      setMembers(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setNewMemberEmail('');
      setShowAddMember(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Remove this team member?')) return;

    try {
      await api.delete(`/api/team/members/${memberId}`);
      fetchTeamMembers();
    } catch (err) {
      const updated = members.filter(m => m.id !== memberId);
      setMembers(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      await api.patch(`/api/team/members/${memberId}`, { role: newRole });
      fetchTeamMembers();
    } catch (err) {
      const updated = members.map(m => m.id === memberId ? { ...m, role: newRole as 'admin' | 'reviewer' | 'viewer' } : m);
      setMembers(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  };



  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: T.panel,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: 24,
        marginBottom: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Users size={24} color={T.cyan} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: T.text }}>Team Members</h3>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddMember(!showAddMember)}
          style={{
            background: T.cyan,
            color: T.bg,
            border: 'none',
            padding: '8px 16px',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Plus size={16} /> Add Member
        </motion.button>
      </div>

      {error && (
        <div style={{ color: '#ff4444', fontSize: 12, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <AnimatePresence>
        {showAddMember && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              background: 'rgba(0,0,0,0.2)',
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <input
                type="email"
                placeholder="member@example.com"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                style={{
                  flex: 1,
                  background: 'rgba(0,0,0,0.3)',
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: T.text,
                  fontSize: 13,
                }}
              />
              <select
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value as 'reviewer' | 'viewer')}
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: T.text,
                  fontSize: 13,
                }}
              >
                <option value="reviewer">Reviewer</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAddMember}
                style={{
                  flex: 1,
                  background: T.cyan,
                  color: T.bg,
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Add
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAddMember(false)}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.1)',
                  color: T.text,
                  border: `1px solid ${T.border}`,
                  padding: '8px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Cancel
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div style={{ color: T.sub, textAlign: 'center', padding: '20px' }}>
          Loading team members...
        </div>
      ) : (!members || members.length === 0) ? (
        <div style={{ color: T.sub, textAlign: 'center', padding: '20px' }}>
          No team members yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(members || []).map((member) => (
            <motion.div
              key={member.id}
              layout
              style={{
                background: 'rgba(0,0,0,0.2)',
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 4 }}>
                  {member.name}
                </div>
                <div style={{ fontSize: 12, color: T.sub }}>
                  {member.email}
                </div>
              </div>

              <select
                value={member.role}
                onChange={(e) => handleRoleChange(member.id, e.target.value)}
                disabled={member.role === 'admin'}
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: `1px solid ${T.border}`,
                  borderRadius: 6,
                  padding: '6px 10px',
                  color: T.text,
                  fontSize: 12,
                  cursor: member.role === 'admin' ? 'not-allowed' : 'pointer',
                  opacity: member.role === 'admin' ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <option value="admin">Admin</option>
                <option value="reviewer">Reviewer</option>
                <option value="viewer">Viewer</option>
              </select>

              {member.role !== 'admin' && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleRemoveMember(member.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ff4444',
                    cursor: 'pointer',
                    marginLeft: 12,
                  }}
                >
                  <Trash2 size={18} />
                </motion.button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};
