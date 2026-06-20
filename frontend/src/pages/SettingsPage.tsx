/**
 * @file pages/SettingsPage.tsx
 * @description Fully animated Workspace Preferences page for GitGuard AI.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  LogOut,
  ShieldCheck,
  User,
  Mail,
  GitBranch,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

import { GlobalErrorBoundary } from '../components/common/GlobalErrorBoundary';
import { AppBackground } from '../components/layout/AppBackground';
import { T } from '../constants/theme';
import { PreferencesToggle } from '../components/settings/PreferencesToggle';
import { TeamManagement } from '../components/settings/TeamManagement';
import { NotificationPreferences } from '../components/settings/NotificationPreferences';
import { ApiKeyManager } from '../components/settings/ApiKeyManager';
import { SecuritySettings } from '../components/settings/SecuritySettings';
import { AiProviderSettings } from '../components/settings/AiProviderSettings';
import { STORAGE_KEYS } from '../constants/config';

const EASE = [0.22, 1, 0.36, 1] as const;
const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [emailAlerts, setEmailAlerts] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.EMAIL_ALERTS);
      return stored !== 'false'; // default to true
    } catch {
      return true;
    }
  });

  const [autoReview, setAutoReview] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.AUTO_REVIEW);
      return stored === 'true'; // default to false
    } catch {
      return false;
    }
  });

  const handleEmailAlertsChange = (val: boolean) => {
    setEmailAlerts(val);
    try {
      localStorage.setItem(STORAGE_KEYS.EMAIL_ALERTS, String(val));
    } catch {
      // ignore
    }
  };

  const handleAutoReviewChange = (val: boolean) => {
    setAutoReview(val);
    try {
      localStorage.setItem(STORAGE_KEYS.AUTO_REVIEW, String(val));
    } catch {
      // ignore
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.45, ease: EASE },
    },
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
              <span
                style={{
                  fontFamily: "'Fira Code',monospace",
                  fontSize: 10,
                  color: T.muted,
                }}
              >
                gitguard
              </span>
              <span style={{ color: `${T.cyan}50` }}>/</span>
              <span
                style={{
                  fontFamily: "'Fira Code',monospace",
                  fontSize: 10,
                  color: T.sub,
                }}
              >
                settings
              </span>
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
              Manage accounts, security sentinel settings, and workspace
              automation
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
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
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 24,
              }}
            >
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
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: T.text,
                      fontFamily: "'Inter',sans-serif",
                    }}
                  >
                    Your Profile
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: T.muted,
                      fontFamily: "'Fira Code',monospace",
                    }}
                  >
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

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16,
                marginBottom: 20,
              }}
            >
              {/* Username Info Box */}
              <div
                style={{
                  background: 'rgba(0,0,0,0.22)',
                  border: `1px solid ${T.border}`,
                  borderRadius: 14,
                  padding: '20px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    color: T.muted,
                    marginBottom: 10,
                  }}
                >
                  <User size={14} />
                  <span
                    style={{
                      fontSize: 9,
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      fontWeight: 700,
                      fontFamily: "'Inter',sans-serif",
                    }}
                  >
                    Username
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: "'Fira Code', monospace",
                    fontSize: 16,
                    fontWeight: 800,
                    color: T.cyan,
                  }}
                >
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
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    color: T.muted,
                    marginBottom: 10,
                  }}
                >
                  <Mail size={14} />
                  <span
                    style={{
                      fontSize: 9,
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      fontWeight: 700,
                      fontFamily: "'Inter',sans-serif",
                    }}
                  >
                    Email
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: T.text,
                    wordBreak: 'break-all',
                    fontFamily: "'Inter',sans-serif",
                  }}
                >
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
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: T.muted,
                  marginBottom: 14,
                }}
              >
                <GitBranch size={16} />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: "'Inter',sans-serif",
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                  }}
                >
                  GitHub Integration
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 16,
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: T.text,
                      marginBottom: 4,
                    }}
                  >
                    Access Authentication
                  </p>
                  <p style={{ fontSize: 12, color: T.sub }}>
                    Connected user profile and active API access token
                    validation
                  </p>
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

          {/* Team Management */}
          <motion.div variants={itemVariants}>
            <TeamManagement />
          </motion.div>

          {/* Notification Preferences */}
          <motion.div variants={itemVariants}>
            <NotificationPreferences />
          </motion.div>

          {/* AI Provider Settings */}
          <motion.div variants={itemVariants}>
            <AiProviderSettings />
          </motion.div>

          {/* API Key Manager */}
          <motion.div variants={itemVariants}>
            <ApiKeyManager />
          </motion.div>

          {/* Security Settings */}
          <motion.div variants={itemVariants}>
            <SecuritySettings />
          </motion.div>

          {/* Basic Preferences */}
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
            <h3
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: T.text,
                marginBottom: 20,
              }}
            >
              Basic Preferences
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <PreferencesToggle
                label="Email Alerts"
                desc="Receive automated email reports for webhook scan results."
                checked={emailAlerts}
                onChange={handleEmailAlertsChange}
                color={T.violet}
              />
              <PreferencesToggle
                label="Auto Review"
                desc="Automatically start reviewing when repositories are added."
                checked={autoReview}
                onChange={handleAutoReviewChange}
                color={T.green}
              />
            </div>
          </motion.section>
        </div>
      </motion.div>
    </div>
  );
};

export default SettingsPage;
