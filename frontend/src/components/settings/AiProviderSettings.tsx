/**
 * @file components/settings/AiProviderSettings.tsx
 * @description AI Provider settings (Cloud API vs Self-Hosted Ollama/vLLM endpoints)
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, HelpCircle } from 'lucide-react';
import { T } from '../../constants/theme';
import { PreferencesToggle } from './PreferencesToggle';
import api from '../../services/api';

interface AiSettings {
  useSelfHosted: boolean;
  localLlmUrl: string;
  modelName: string;
}

const STORAGE_KEYS = {
  USE_SELF_HOSTED: 'gitguard_use_self_hosted',
  LOCAL_LLM_URL: 'gitguard_local_llm_url',
  MODEL_NAME: 'gitguard_model_name',
};

export const AiProviderSettings: React.FC = () => {
  const [config, setConfig] = useState<AiSettings>({
    useSelfHosted: false,
    localLlmUrl: 'http://localhost:11434',
    modelName: 'llama3:8b',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAiSettings();
  }, []);

  const fetchAiSettings = async () => {
    try {
      setLoading(true);
      // Attempt server sync first
      const response = await api.get('/api/settings/ai');
      if (response.data && typeof response.data.useSelfHosted === 'boolean') {
        setConfig(response.data);
        return;
      }
    } catch (err) {
      console.warn('AI settings API endpoint not available. Falling back to local preferences.', err);
    }

    // LocalStorage fallback
    try {
      const storedUseSelfHosted = localStorage.getItem(STORAGE_KEYS.USE_SELF_HOSTED) === 'true';
      const storedLlmUrl = localStorage.getItem(STORAGE_KEYS.LOCAL_LLM_URL) || 'http://localhost:11434';
      const storedModelName = localStorage.getItem(STORAGE_KEYS.MODEL_NAME) || 'llama3:8b';

      setConfig({
        useSelfHosted: storedUseSelfHosted,
        localLlmUrl: storedLlmUrl,
        modelName: storedModelName,
      });
    } catch (e) {
      console.error('Failed to read localStorage AI settings', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);

      // Persist in localStorage first (fail-safe)
      localStorage.setItem(STORAGE_KEYS.USE_SELF_HOSTED, String(config.useSelfHosted));
      localStorage.setItem(STORAGE_KEYS.LOCAL_LLM_URL, config.localLlmUrl);
      localStorage.setItem(STORAGE_KEYS.MODEL_NAME, config.modelName);

      // Persist on server if endpoint is implemented
      await api.put('/api/settings/ai', config);
    } catch (err) {
      console.warn('AI settings server sync not supported yet. Changes saved locally in your browser.', err);
    } finally {
      setSaving(false);
      alert('AI Provider settings saved successfully.');
    }
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
        Loading AI Provider settings...
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
        <Cpu size={24} color={T.violet} />
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: T.text }}>AI Provider Settings</h3>
          <p style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>
            Manage your AI model configurations and API endpoints
          </p>
        </div>
      </div>

      {/* Provider Toggle */}
      <div style={{ marginBottom: 20 }}>
        <PreferencesToggle
          label="Use Self-Hosted LLM"
          desc="Route AI analysis requests to a local or private Ollama/vLLM instance instead of cloud APIs"
          checked={config.useSelfHosted}
          onChange={(checked) => setConfig((prev) => ({ ...prev, useSelfHosted: checked }))}
          color={T.violet}
        />
      </div>

      {/* Conditionally reveal inputs */}
      <AnimatePresence>
        {config.useSelfHosted && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              background: 'rgba(0,0,0,0.15)',
              border: `1px solid ${T.border}`,
              borderRadius: 14,
              padding: 16,
              marginBottom: 20,
            }}
          >
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: T.text, display: 'block', marginBottom: 6 }}>
                Local Endpoint URL
              </label>
              <input
                type="text"
                placeholder="e.g., http://localhost:11434"
                value={config.localLlmUrl}
                onChange={(e) => setConfig((prev) => ({ ...prev, localLlmUrl: e.target.value }))}
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.3)',
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: T.text,
                  fontSize: 13,
                }}
              />
              <span style={{ fontSize: 10, color: T.sub, marginTop: 4, display: 'block' }}>
                Default Ollama URL is <code>http://localhost:11434</code>. vLLM uses standard OpenAI paths.
              </span>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: T.text, display: 'block', marginBottom: 6 }}>
                Model Identifier
              </label>
              <input
                type="text"
                placeholder="e.g., llama3:8b, mistral, codegemma"
                value={config.modelName}
                onChange={(e) => setConfig((prev) => ({ ...prev, modelName: e.target.value }))}
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.3)',
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: T.text,
                  fontSize: 13,
                }}
              />
              <span style={{ fontSize: 10, color: T.sub, marginTop: 4, display: 'block' }}>
                Make sure the model is pulled locally (e.g. <code>ollama pull {config.modelName || 'llama3'}</code>).
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', gap: 12, background: 'rgba(255, 255, 255, 0.02)', padding: 12, borderRadius: 10, border: `1px solid ${T.border}`, marginBottom: 20 }}>
        <HelpCircle size={16} color={T.violet} style={{ flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: 11, color: T.sub, lineHeight: 1.4 }}>
          <strong>Note:</strong> Standard cloud mode routes calls directly to high-throughput Google Gemini & Groq APIs. If Self-Hosted is enabled, the router redirects analyses to the URL provided. Make sure your local service is running and accessible from the GitGuard server.
        </span>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSaveSettings}
        disabled={saving}
        style={{
          width: '100%',
          background: T.violet,
          color: '#ffffff',
          border: 'none',
          padding: 12,
          borderRadius: 8,
          cursor: saving ? 'not-allowed' : 'pointer',
          fontSize: 13,
          fontWeight: 600,
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? 'Saving...' : 'Save AI Settings'}
      </motion.button>
    </motion.div>
  );
};
