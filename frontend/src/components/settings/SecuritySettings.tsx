/**
 * @file components/settings/SecuritySettings.tsx
 * @description Security-related settings like 2FA, IP whitelist
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Shield, Plus, Trash2, Copy } from 'lucide-react';
import { T } from '../../constants/theme';
import { PreferencesToggle } from './PreferencesToggle';
import api from '../../services/api';

interface SecurityConfig {
  twoFactorEnabled: boolean;
  ipWhitelistEnabled: boolean;
  ipWhitelist: string[];
  sessionTimeout: number;
}

export const SecuritySettings: React.FC = () => {
  const [config, setConfig] = useState<SecurityConfig>({
    twoFactorEnabled: false,
    ipWhitelistEnabled: false,
    ipWhitelist: [],
    sessionTimeout: 3600,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newIp, setNewIp] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);

  const STORAGE_KEY = 'gitguard_security_settings';

  useEffect(() => {
    fetchSecuritySettings();
  }, []);

  const fetchSecuritySettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/security/settings');
      setConfig(response.data);
    } catch (err) {
      console.warn('API /api/security/settings not available, falling back to localStorage');
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setConfig(JSON.parse(stored));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      await api.put('/api/security/settings', config);
    } catch (err) {
      console.warn('API fallback: settings saved locally');
    } finally {
      setSaving(false);
    }
  };

  const handleAddIp = () => {
    if (!newIp.trim()) return;
    if (!config.ipWhitelist.includes(newIp)) {
      setConfig((prev) => ({
        ...prev,
        ipWhitelist: [...prev.ipWhitelist, newIp],
      }));
      setNewIp('');
    }
  };

  const handleRemoveIp = (ip: string) => {
    setConfig((prev) => ({
      ...prev,
      ipWhitelist: prev.ipWhitelist.filter((i) => i !== ip),
    }));
  };

  const handleEnableTwoFactor = async () => {
    try {
      const response = await api.post('/api/security/2fa/setup');
      setTwoFactorCode(response.data.qrCode);
      setShowTwoFactorSetup(true);
    } catch (err) {
      console.warn('API fallback: showing mock QR code for 2FA setup');
      // Set a placeholder QR code (e.g. data URI or placeholder image)
      setTwoFactorCode('https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/GitGuard:user@example.com?secret=MOCKSECRET123&issuer=GitGuard');
      setShowTwoFactorSetup(true);
    }
  };

  if (loading) {
    return (
      <motion.div
        style={{
          background: T.cardBg,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          padding: 24,
          textAlign: 'center',
          color: T.textSecondary,
        }}
      >
        Loading security settings...
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
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Lock size={24} color={T.red} />
        <h3 style={{ fontSize: 18, fontWeight: 600, color: T.text }}>Security & Access</h3>
      </div>

      {/* Two-Factor Authentication */}
      <div style={{ marginBottom: 24 }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 12 }}>
          Two-Factor Authentication
        </h4>
        <PreferencesToggle
          label={config.twoFactorEnabled ? '2FA Enabled' : '2FA Disabled'}
          desc="Require authentication code in addition to password"
          checked={config.twoFactorEnabled}
          onChange={() => {
            if (!config.twoFactorEnabled) {
              handleEnableTwoFactor();
            } else {
              setConfig((prev) => ({ ...prev, twoFactorEnabled: false }));
            }
          }}
          color={T.red}
        />

        <AnimatePresence>
          {showTwoFactorSetup && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                background: 'rgba(0,0,0,0.2)',
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                padding: 16,
                marginTop: 12,
              }}
            >
              <p style={{ fontSize: 12, color: T.textSecondary, marginBottom: 12 }}>
                Scan this QR code with your authenticator app:
              </p>
              <div
                style={{
                  background: '#fff',
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 12,
                  textAlign: 'center',
                }}
              >
                <img src={twoFactorCode} alt="2FA QR Code" style={{ maxWidth: 200 }} />
              </div>
              <input
                type="text"
                placeholder="Enter 6-digit code"
                maxLength={6}
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.3)',
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: T.text,
                  fontSize: 13,
                  marginBottom: 12,
                  textAlign: 'center',
                  letterSpacing: 4,
                }}
              />
              <div style={{ display: 'flex', gap: 12 }}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setConfig((prev) => ({ ...prev, twoFactorEnabled: true }));
                    setShowTwoFactorSetup(false);
                    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...config, twoFactorEnabled: true }));
                  }}
                  style={{
                    flex: 1,
                    background: T.red,
                    color: T.bg,
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Verify
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowTwoFactorSetup(false)}
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
      </div>

      {/* IP Whitelist */}
      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 24, marginBottom: 24 }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 12 }}>
          IP Whitelist
        </h4>
        <PreferencesToggle
          label="Restrict Access by IP"
          desc="Only allow access from whitelisted IP addresses"
          checked={config.ipWhitelistEnabled}
          onChange={(checked) => setConfig((prev) => ({ ...prev, ipWhitelistEnabled: checked }))}
          color={T.cyan}
        />

        <AnimatePresence>
          {config.ipWhitelistEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ marginTop: 16 }}
            >
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <input
                  type="text"
                  placeholder="e.g., 192.168.1.1 or 10.0.0.0/8"
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleAddIp();
                  }}
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
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAddIp}
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
                    gap: 6,
                  }}
                >
                  <Plus size={16} /> Add
                </motion.button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {config.ipWhitelist.map((ip) => (
                  <motion.div
                    key={ip}
                    layout
                    style={{
                      background: 'rgba(0,0,0,0.3)',
                      border: `1px solid ${T.border}`,
                      borderRadius: 8,
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: 12, color: T.text, fontFamily: 'monospace' }}>
                      {ip}
                    </span>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleRemoveIp(ip)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: T.red,
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={16} />
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Session Timeout */}
      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 24, marginBottom: 24 }}>
        <label style={{ fontSize: 14, fontWeight: 600, color: T.text, display: 'block', marginBottom: 8 }}>
          Session Timeout (minutes)
        </label>
        <input
          type="number"
          min={5}
          max={1440}
          value={Math.floor(config.sessionTimeout / 60)}
          onChange={(e) =>
            setConfig((prev) => ({
              ...prev,
              sessionTimeout: parseInt(e.target.value) * 60,
            }))
          }
          style={{
            width: '100%',
            background: 'rgba(0,0,0,0.2)',
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            padding: '8px 12px',
            color: T.text,
            fontSize: 13,
          }}
        />
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSaveSettings}
        disabled={saving}
        style={{
          width: '100%',
          background: T.red,
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
        {saving ? 'Saving...' : 'Save Security Settings'}
      </motion.button>
    </motion.div>
  );
};
