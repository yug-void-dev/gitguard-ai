/**
 * @file components/settings/TeamManagement.tsx
 * @description Team member management with role assignment
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Trash2, Shield, Eye, MessageSquare } from 'lucide-react';
import { T } from '../../constants/theme';
import axios from 'axios';

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

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/team');
      setMembers(response.data.members);
      setError(null);
    } catch (err) {
      setError('Failed to load team members');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) return;

    try {
      await axios.post('/api/team/members', {
        email: newMemberEmail,
        role: newMemberRole,
      });
      setNewMemberEmail('');
      setShowAddMember(false);
      fetchTeamMembers();
    } catch (err) {
      setError('Failed to add team member');
      console.error(err);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Remove this team member?')) return;

    try {
      await axios.delete(`/api/team/members/${memberId}`);
      fetchTeamMembers();
    } catch (err) {
      setError('Failed to remove team member');
      console.error(err);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      await axios.patch(`/api/team/members/${memberId}`, { role: newRole });
      fetchTeamMembers();
    } catch (err) {
      setError('Failed to update role');
      console.error(err);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield size={16} />;
      case 'reviewer':
        return <MessageSquare size={16} />;
      case 'viewer':
        return <Eye size={16} />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: T.cardBg,
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
        <div style={{ color: T.textSecondary, textAlign: 'center', padding: '20px' }}>
          Loading team members...
        </div>
      ) : members.length === 0 ? (
        <div style={{ color: T.textSecondary, textAlign: 'center', padding: '20px' }}>
          No team members yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {members.map((member) => (
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
                <div style={{ fontSize: 12, color: T.textSecondary }}>
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
