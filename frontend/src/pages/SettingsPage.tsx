/**
 * @file pages/SettingsPage.tsx
 * @description Fully animated Workspace Preferences page for GitGuard AI.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, LogOut, ShieldCheck, Sparkles, User, Mail, GitBranch, Zap, Cpu, Settings } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { AppBackground } from '../components/layout/AppBackground';
import { T } from '../constants/theme';
import { DashboardSHead } from '../components/dashboard/DashboardQuickActions';

const EASE = [0.22, 1, 0.36, 1] as const;

// ─── Custom Animated Toggle Switch ──────────────────────────────────────────
const PreferenceToggle: React.FC<{
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  color?: string;
}> = ({ label, desc, checked, onChange, color = T.cyan }) => (
  <motion.label
    whileHover={{ x: 2 }}
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 16,
      background: 'rgba(0,0,0,0.22)',
      border: `1px solid ${T.border}`,
      borderRadius: 14,
      padding: '16px 20px',
      cursor: 'pointer',
      transition: 'border-color 0.25s, box-shadow 0.25s',
    }}
    onMouseOver={(e) => {
      e.currentTarget.style.borderColor = `${color}50`;
      e.currentTarget.style.boxShadow = `0 0 12px ${color}06`;
    }}
    onMouseOut={(e) => {
      e.currentTarget.style.borderColor = T.border;
      e.currentTarget.style.boxShadow = 'none';
    }}
  >
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: T.text,
          fontFamily: "'Inter',sans-serif",
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 11,
          color: T.muted,
          fontFamily: "'Inter',sans-serif",
          lineHeight: 1.5,
        }}
      >
        {desc}
      </div>
    </div>

    {/* Custom spring toggle switch */}
    <div
      onClick={(e) => {
        e.preventDefault();
        onChange(!checked);
      }}
      style={{
        width: 38,
        height: 22,
        borderRadius: 12,
        flexShrink: 0,
        marginTop: 2,
        background: checked ? color : 'rgba(255,255,255,0.08)',
        border: `1px solid ${checked ? color + '60' : T.border}`,
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.25s, border-color 0.25s',
        boxShadow: checked ? `0 0 8px ${color}45` : 'none',
      }}
    >
      <motion.div
        animate={{ x: checked ? 18 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{
          position: 'absolute',
          top: 2,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: checked ? '#fff' : T.muted,
        }}
      />
    </div>
  </motion.label>
);

const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [autoReview, setAutoReview] = useState(false);
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: EASE } }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100%',
        padding: '24px 28px',
      }}
    >
      <AppBackground />
      
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 1000,
          margin: '0 auto',
        }}
      >
        
        {/* Breadcrumb & Header */}
        <motion.div
          variants={itemVariants}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 28,
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 6,
              }}
            >
              <span style={{ fontFamily: "'Fira Code',monospace", fontSize: 10, color: T.muted }}>gitguard</span>
              <span style={{ color: `${T.cyan}50` }}>/</span>
              <span style={{ fontFamily: "'Fira Code',monospace", fontSize: 10, color: T.sub }}>settings</span>
            </div>
            <h1
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 26,
                fontWeight: 800,
                color: T.text,
                letterSpacing: '-0.6px',
                marginBottom: 5,
              }}
            >
              Workspace Preferences
            </h1>
            <p style={{ fontSize: 13, color: T.sub }}>
              Manage accounts, security sentinel settings, and workspace automation
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.1)' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(-1)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.05)',
              color: T.text,
              border: `1px solid ${T.border}`,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
              fontFamily: "'Inter', sans-serif",
              transition: 'background 0.2s',
            }}
          >
            <ArrowLeft size={15} />
            Back
          </motion.button>
        </motion.div>

        {/* Dual Grid Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20, alignItems: 'start' }}>
          
          {/* Profile Section Panel */}
          <motion.section
            variants={itemVariants}
            style={{
              background: T.panel,
              border: `1px solid ${T.border}`,
              borderRadius: 18,
              padding: '28px 32px',
              boxShadow: `0 24px 60px rgba(0,0,0,0.4)`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    background: `linear-gradient(135deg,${T.cyan},${T.violet})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 0 12px ${T.cyan}40`,
                  }}
                >
                  <User size={15} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: T.text, fontFamily: "'Inter',sans-serif" }}>
                    Your Profile
                  </div>
                  <div style={{ fontSize: 10, color: T.muted, fontFamily: "'Fira Code',monospace" }}>
                    User Session Context
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={logout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  borderRadius: 10,
                  background: `${T.red}15`,
                  color: T.red,
                  border: `1px solid ${T.red}25`,
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 12,
                  fontFamily: "'Inter', sans-serif",
                  transition: 'background 0.2s',
                }}
              >
                <LogOut size={13} />
                Logout
              </motion.button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              {/* Username Info Box */}
              <div
                style={{
                  background: 'rgba(0,0,0,0.22)',
                  border: `1px solid ${T.border}`,
                  borderRadius: 14,
                  padding: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.muted, marginBottom: 10 }}>
                  <User size={14} />
                  <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, fontFamily: "'Inter',sans-serif" }}>
                    Username
                  </span>
                </div>
                <div style={{ fontFamily: "'Fira Code', monospace", fontSize: 16, fontWeight: 800, color: T.cyan }}>
                  {user?.login || 'anonymous'}
                </div>
              </div>

              {/* Email Info Box */}
              <div
                style={{
                  background: 'rgba(0,0,0,0.22)',
                  border: `1px solid ${T.border}`,
                  borderRadius: 14,
                  padding: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.muted, marginBottom: 10 }}>
                  <Mail size={14} />
                  <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, fontFamily: "'Inter',sans-serif" }}>
                    Email
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text, wordBreak: 'break-all', fontFamily: "'Inter',sans-serif" }}>
                  {user?.email || 'N/A'}
                </div>
              </div>
            </div>

            {/* GitHub OAuth Connection indicator */}
            <div
              style={{
                background: 'rgba(0,0,0,0.22)',
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                padding: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.muted, marginBottom: 14 }}>
                <GitBranch size={16} />
                <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'Inter',sans-serif", textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  GitHub Integration
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>Access Authentication</p>
                  <p style={{ fontSize: 12, color: T.sub }}>Connected user profile and active API access token validation</p>
                </div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 12px',
                    borderRadius: 20,
                    background: `${T.green}18`,
                    color: T.green,
                    border: `1px solid ${T.green}30`,
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: "'Fira Code', monospace",
                  }}
                >
                  <ShieldCheck size={13} />
                  ACTIVE
                </div>
              </div>
            </div>
          </motion.section>

          {/* Preferences Section Panel */}
          <motion.div
            variants={itemVariants}
            style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
          >
            <section
              style={{
                background: T.panel,
                border: `1px solid ${T.border}`,
                borderRadius: 18,
                padding: '28px 32px',
                boxShadow: `0 24px 60px rgba(0,0,0,0.4)`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: T.muted, marginBottom: 20 }}>
                <Sparkles size={16} style={{ color: T.cyan }} />
                <span style={{ fontWeight: 700, color: T.text, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  Preferences
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <PreferenceToggle
                  label="Dark Mode"
                  desc="Enable premium dark-mode glowing aesthetics across panels."
                  checked={darkMode}
                  onChange={setDarkMode}
                  color={T.cyan}
                />
                <PreferenceToggle
                  label="Email Alerts"
                  desc="Receive automated email reports for webhook scan results."
                  checked={emailAlerts}
                  onChange={setEmailAlerts}
                  color={T.violet}
                />
                <PreferenceToggle
                  label="Auto Review"
                  desc="Automatically start reviewing when repositories are added."
                  checked={autoReview}
                  onChange={setAutoReview}
                  color={T.green}
                />
              </div>
            </section>

            {/* Application system info panel */}
            <section
              style={{
                background: T.panel,
                border: `1px solid ${T.border}`,
                borderRadius: 18,
                padding: '20px 24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: T.muted, marginBottom: 10 }}>
                <Cpu size={15} style={{ color: T.cyan }} />
                <span style={{ fontWeight: 700, color: T.text, fontSize: 13 }}>System Integration</span>
              </div>
              <p style={{ fontSize: 12, color: T.sub, lineHeight: 1.6 }}>
                These preferences are currently handled in the frontend session state. Persistent database synchronization will automatically store choices under user configuration.
              </p>
            </section>
          </motion.div>

        </div>
      </motion.div>
    </div>
  );
};

export default SettingsPage;
