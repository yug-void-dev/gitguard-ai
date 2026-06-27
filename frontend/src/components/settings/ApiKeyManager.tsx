/**
 * @file components/settings/ApiKeyManager.tsx
 * @description API key generation and management
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Plus, Copy, Trash2, Eye, EyeOff } from 'lucide-react';
import { T } from '../../constants/theme';
import api from '../../services/api';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsed?: string;
}

export const ApiKeyManager: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [visibleKeyId, setVisibleKeyId] = useState<string | null>(null);

  const STORAGE_KEY = 'gitguard_api_keys';

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/api-keys');
      setApiKeys(response.data?.keys || []);
    } catch (err) {
      console.warn('API /api/api-keys not available, falling back to localStorage');
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setApiKeys(JSON.parse(stored));
      } else {
        setApiKeys([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;

    const generateRandomString = (length: number) => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
      return result;
    };

    try {
      const response = await api.post('/api/api-keys', { name: newKeyName });
      setCreatedKey(response.data.key);
      setNewKeyName('');
      fetchApiKeys();
    } catch (err) {
      console.warn('API fallback: storing generated key in localStorage');
      const rawKey = `gg_${generateRandomString(32)}`;
      const newKey: ApiKey = {
        id: Date.now().toString(),
        name: newKeyName,
        prefix: rawKey.substring(0, 8),
        createdAt: new Date().toISOString()
      };
      const updated = [...apiKeys, newKey];
      setApiKeys(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setCreatedKey(rawKey);
      setNewKeyName('');
      setShowCreateForm(false);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Delete this API key? This action cannot be undone.')) return;

    try {
      await api.delete(`/api/api-keys/${keyId}`);
      fetchApiKeys();
    } catch (err) {
      console.warn('API fallback: deleting key from localStorage');
      const updated = apiKeys.filter((k) => k.id !== keyId);
      setApiKeys(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    alert('API key copied to clipboard');
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
          <Key size={24} color={T.magenta} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: T.text }}>API Keys</h3>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{
            background: T.magenta,
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
          <Plus size={16} /> Generate Key
        </motion.button>
      </div>

      {/* Create Key Form */}
      <AnimatePresence>
        {showCreateForm && (
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
            <label style={{ fontSize: 12, fontWeight: 600, color: T.text, display: 'block', marginBottom: 8 }}>
              Key Name
            </label>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <input
                type="text"
                placeholder="e.g., Production API, CI/CD Pipeline"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
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
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCreateKey}
                style={{
                  flex: 1,
                  background: T.magenta,
                  color: T.bg,
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Generate
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCreateForm(false)}
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

      {/* Created Key Display */}
      <AnimatePresence>
        {createdKey && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              background: 'rgba(0, 180, 100, 0.1)',
              border: `1px solid rgba(0, 180, 100, 0.3)`,
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: '#00b464', marginBottom: 8 }}>
              ✓ API Key Created
            </div>
            <p style={{ fontSize: 12, color: T.textSecondary, marginBottom: 12 }}>
              Copy your API key now. You won't see it again!
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={createdKey}
                readOnly
                style={{
                  flex: 1,
                  background: 'rgba(0,0,0,0.3)',
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: T.text,
                  fontSize: 12,
                  fontFamily: 'monospace',
                }}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleCopyKey(createdKey)}
                style={{
                  background: T.magenta,
                  color: T.bg,
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Copy size={14} /> Copy
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* API Keys List */}
      {loading ? (
        <div style={{ color: T.textSecondary, textAlign: 'center', padding: '20px' }}>
          Loading API keys...
        </div>
      ) : apiKeys.length === 0 ? (
        <div style={{ color: T.textSecondary, textAlign: 'center', padding: '20px' }}>
          No API keys yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {apiKeys.map((key) => (
            <motion.div
              key={key.id}
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
                  {key.name}
                </div>
                <div style={{ fontSize: 12, color: T.textSecondary }}>
                  {key.prefix}... • Created {new Date(key.createdAt).toLocaleDateString()}
                </div>
                {key.lastUsed && (
                  <div style={{ fontSize: 11, color: T.textSecondary, marginTop: 4 }}>
                    Last used: {new Date(key.lastUsed).toLocaleDateString()}
                  </div>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleDeleteKey(key.id)}
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
            </motion.div>
          ))}
        </div>
      )}

      <div
        style={{
          marginTop: 24,
          padding: 12,
          background: 'rgba(255, 193, 7, 0.1)',
          border: `1px solid rgba(255, 193, 7, 0.3)`,
          borderRadius: 8,
          fontSize: 12,
          color: '#ffc107',
        }}
      >
        <strong>Security Tip:</strong> Keep your API keys secret. Use different keys for different applications.
      </div>
    </motion.div>
  );
};
