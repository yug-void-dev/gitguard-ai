/**
 * @file components/settings/NotificationPreferences.tsx
 * @description Notification settings for email, Slack, Discord
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Hash, MessageCircle } from 'lucide-react';
import { T } from '../../constants/theme';
import { PreferencesToggle } from './PreferencesToggle';
import axios from 'axios';

interface NotificationSettings {
  emailEnabled: boolean;
  slackEnabled: boolean;
  slackWebhook?: string;
  discordEnabled: boolean;
  discordWebhook?: string;
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

  useEffect(() => {
    fetchNotificationSettings();
  }, []);

  const fetchNotificationSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/notifications/settings');
      setSettings(response.data);
      setSlackWebhookInput(response.data.slackWebhook || '');
      setDiscordWebhookInput(response.data.discordWebhook || '');
    } catch (err) {
      console.error('Failed to load notification settings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await axios.put('/api/notifications/settings', {
        ...settings,
        slackWebhook: slackWebhookInput,
        discordWebhook: discordWebhookInput,
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
          background: T.cardBg,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          padding: 24,
          marginBottom: 20,
          textAlign: 'center',
          color: T.textSecondary,
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
        background: T.cardBg,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: 24,
        marginBottom: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Bell size={24} color={T.yellow} />
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
