/**
 * @file components/settings/NotificationPreferences.tsx
 * @description Notification settings for email, Slack, Discord, Jira, Linear
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Hash, MessageCircle, FolderKanban, Layers } from 'lucide-react';
import { T } from '../../constants/theme';
import { PreferencesToggle } from './PreferencesToggle';
import api from '../../services/api';

interface NotificationSettings {
  emailEnabled: boolean;
  slackEnabled: boolean;
  slackWebhook?: string;
  discordEnabled: boolean;
  discordWebhook?: string;
  jiraEnabled: boolean;
  jiraApiToken?: string;
  jiraProjectKey?: string;
  jiraInstanceUrl?: string;
  linearEnabled: boolean;
  linearApiToken?: string;
  linearProjectId?: string;
  notifyOn: {
    reviewCompleted: boolean;
    reviewFailed: boolean;
    newComment: boolean;
  };
}

export const NotificationPreferences: React.FC = () => {
  const [settings, setSettings] = useState<NotificationSettings>({
    emailEnabled: true,
    slackEnabled: false,
    discordEnabled: false,
    jiraEnabled: false,
    linearEnabled: false,
    notifyOn: {
      reviewCompleted: true,
      reviewFailed: true,
      newComment: true,
    },
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slackWebhookInput, setSlackWebhookInput] = useState('');
  const [discordWebhookInput, setDiscordWebhookInput] = useState('');
  const [jiraApiTokenInput, setJiraApiTokenInput] = useState('');
  const [jiraProjectKeyInput, setJiraProjectKeyInput] = useState('');
  const [jiraInstanceUrlInput, setJiraInstanceUrlInput] = useState('');
  const [linearApiTokenInput, setLinearApiTokenInput] = useState('');
  const [linearProjectIdInput, setLinearProjectIdInput] = useState('');

  useEffect(() => {
    fetchNotificationSettings();
  }, []);

  const fetchNotificationSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/notifications/settings');
      // Set settings while ensuring default boolean flags exist to prevent undefined UI state
      setSettings({
        ...response.data,
        jiraEnabled: response.data.jiraEnabled || false,
        linearEnabled: response.data.linearEnabled || false,
      });
      setSlackWebhookInput(response.data.slackWebhook || '');
      setDiscordWebhookInput(response.data.discordWebhook || '');
      setJiraApiTokenInput(response.data.jiraApiToken || '');
      setJiraProjectKeyInput(response.data.jiraProjectKey || '');
      setJiraInstanceUrlInput(response.data.jiraInstanceUrl || '');
      setLinearApiTokenInput(response.data.linearApiToken || '');
      setLinearProjectIdInput(response.data.linearProjectId || '');
    } catch (err) {
      console.error('Failed to load notification settings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await api.put('/api/notifications/settings', {
        ...settings,
        slackWebhook: slackWebhookInput,
        discordWebhook: discordWebhookInput,
        jiraApiToken: jiraApiTokenInput,
        jiraProjectKey: jiraProjectKeyInput,
        jiraInstanceUrl: jiraInstanceUrlInput,
        linearApiToken: linearApiTokenInput,
        linearProjectId: linearProjectIdInput,
      });
    } catch (err) {
      console.error('Failed to save settings', err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleNotification = (key: keyof typeof settings.notifyOn) => {
    setSettings((prev) => ({
      ...prev,
      notifyOn: {
        ...prev.notifyOn,
        [key]: !prev.notifyOn[key],
      },
    }));
  };

  if (loading) {
    return (
      <motion.div
        style={{
          background: T.panel,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          padding: 24,
          marginBottom: 20,
          textAlign: 'center',
          color: T.sub,
        }}
      >
        Loading notification settings...
      </motion.div>
    );
  }

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Bell size={24} color={T.amber} />
        <h3 style={{ fontSize: 18, fontWeight: 600, color: T.text }}>Notifications</h3>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 12 }}>
          Notify Me When
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <PreferencesToggle
            label="Review Completed"
            desc="Get notified when a code review is finished"
            checked={settings.notifyOn.reviewCompleted}
            onChange={() => handleToggleNotification('reviewCompleted')}
            color={T.cyan}
          />
          <PreferencesToggle
            label="Review Failed"
            desc="Get notified when a review encounters an error"
            checked={settings.notifyOn.reviewFailed}
            onChange={() => handleToggleNotification('reviewFailed')}
            color={T.red}
          />
          <PreferencesToggle
            label="New Comments"
            desc="Get notified when someone comments on your reviews"
            checked={settings.notifyOn.newComment}
            onChange={() => handleToggleNotification('newComment')}
            color={T.cyan}
          />
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 24, marginBottom: 24 }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 12 }}>
          Notification Channels
        </h4>

        {/* Email Notifications */}
        <div style={{ marginBottom: 16 }}>
          <PreferencesToggle
            label="Email Notifications"
            desc="Receive notifications via email"
            checked={settings.emailEnabled}
            onChange={(checked) => setSettings((prev) => ({ ...prev, emailEnabled: checked }))}
            color={T.cyan}
          />
        </div>

        {/* Slack Integration */}
        <motion.div
          layout
          style={{
            background: 'rgba(0,0,0,0.2)',
            border: `1px solid ${T.border}`,
            borderRadius: 14,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Hash size={18} color={T.cyan} />
              <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Slack</span>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSettings((prev) => ({ ...prev, slackEnabled: !prev.slackEnabled }))}
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                background: settings.slackEnabled ? T.cyan : 'rgba(255,255,255,0.1)',
                border: 'none',
                cursor: 'pointer',
              }}
            />
          </div>

          <AnimatePresence>
            {settings.slackEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <input
                  type="text"
                  placeholder="https://hooks.slack.com/services/..."
                  value={slackWebhookInput}
                  onChange={(e) => setSlackWebhookInput(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.3)',
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    padding: '8px 12px',
                    color: T.text,
                    fontSize: 12,
                    marginTop: 8,
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Discord Integration */}
        <motion.div
          layout
          style={{
            background: 'rgba(0,0,0,0.2)',
            border: `1px solid ${T.border}`,
            borderRadius: 14,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageCircle size={18} color={T.cyan} />
              <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Discord</span>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSettings((prev) => ({ ...prev, discordEnabled: !prev.discordEnabled }))}
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                background: settings.discordEnabled ? T.cyan : 'rgba(255,255,255,0.1)',
                border: 'none',
                cursor: 'pointer',
              }}
            />
          </div>

          <AnimatePresence>
            {settings.discordEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <input
                  type="text"
                  placeholder="https://discord.com/api/webhooks/..."
                  value={discordWebhookInput}
                  onChange={(e) => setDiscordWebhookInput(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.3)',
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    padding: '8px 12px',
                    color: T.text,
                    fontSize: 12,
                    marginTop: 8,
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Jira Integration */}
        <motion.div
          layout
          style={{
            background: 'rgba(0,0,0,0.2)',
            border: `1px solid ${T.border}`,
            borderRadius: 14,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FolderKanban size={18} color={T.cyan} />
              <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Jira Software</span>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSettings((prev) => ({ ...prev, jiraEnabled: !prev.jiraEnabled }))}
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                background: settings.jiraEnabled ? T.cyan : 'rgba(255,255,255,0.1)',
                border: 'none',
                cursor: 'pointer',
              }}
            />
          </div>

          <AnimatePresence>
            {settings.jiraEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}
              >
                <div>
                  <label style={{ fontSize: 10, color: T.sub, fontWeight: 700 }}>Instance URL</label>
                  <input
                    type="text"
                    placeholder="https://your-company.atlassian.net"
                    value={jiraInstanceUrlInput}
                    onChange={(e) => setJiraInstanceUrlInput(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.3)',
                      border: `1px solid ${T.border}`,
                      borderRadius: 8,
                      padding: '8px 12px',
                      color: T.text,
                      fontSize: 12,
                      marginTop: 4,
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: T.sub, fontWeight: 700 }}>Project Key</label>
                  <input
                    type="text"
                    placeholder="e.g. SEC, BUG, PROJ"
                    value={jiraProjectKeyInput}
                    onChange={(e) => setJiraProjectKeyInput(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.3)',
                      border: `1px solid ${T.border}`,
                      borderRadius: 8,
                      padding: '8px 12px',
                      color: T.text,
                      fontSize: 12,
                      marginTop: 4,
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: T.sub, fontWeight: 700 }}>API Token</label>
                  <input
                    type="password"
                    placeholder="Enter Jira API token..."
                    value={jiraApiTokenInput}
                    onChange={(e) => setJiraApiTokenInput(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.3)',
                      border: `1px solid ${T.border}`,
                      borderRadius: 8,
                      padding: '8px 12px',
                      color: T.text,
                      fontSize: 12,
                      marginTop: 4,
                    }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Linear Integration */}
        <motion.div
          layout
          style={{
            background: 'rgba(0,0,0,0.2)',
            border: `1px solid ${T.border}`,
            borderRadius: 14,
            padding: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={18} color={T.cyan} />
              <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Linear App</span>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSettings((prev) => ({ ...prev, linearEnabled: !prev.linearEnabled }))}
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                background: settings.linearEnabled ? T.cyan : 'rgba(255,255,255,0.1)',
                border: 'none',
                cursor: 'pointer',
              }}
            />
          </div>

          <AnimatePresence>
            {settings.linearEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}
              >
                <div>
                  <label style={{ fontSize: 10, color: T.sub, fontWeight: 700 }}>Project ID</label>
                  <input
                    type="text"
                    placeholder="Enter Linear Project ID (UUID or identifier)"
                    value={linearProjectIdInput}
                    onChange={(e) => setLinearProjectIdInput(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.3)',
                      border: `1px solid ${T.border}`,
                      borderRadius: 8,
                      padding: '8px 12px',
                      color: T.text,
                      fontSize: 12,
                      marginTop: 4,
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: T.sub, fontWeight: 700 }}>Personal API Token</label>
                  <input
                    type="password"
                    placeholder="lin_api_..."
                    value={linearApiTokenInput}
                    onChange={(e) => setLinearApiTokenInput(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.3)',
                      border: `1px solid ${T.border}`,
                      borderRadius: 8,
                      padding: '8px 12px',
                      color: T.text,
                      fontSize: 12,
                      marginTop: 4,
                    }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSaveSettings}
        disabled={saving}
        style={{
          width: '100%',
          background: T.cyan,
          color: T.bg,
          border: 'none',
          padding: 12,
          borderRadius: 8,
          cursor: saving ? 'not-allowed' : 'pointer',
          fontSize: 13,
          fontWeight: 600,
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? 'Saving...' : 'Save Preferences'}
      </motion.button>
    </motion.div>
  );
};
