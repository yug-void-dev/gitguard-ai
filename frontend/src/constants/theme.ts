const isLight = (): boolean => {
  try {
    return typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light';
  } catch {
    return false;
  }
};

export const T = {
  get bg(): string {
    return isLight() ? '#f8fafc' : '#060a14';
  },
  get panel(): string {
    return isLight() ? 'rgba(0, 0, 0, 0.022)' : 'rgba(255, 255, 255, 0.032)';
  },
  get panelHov(): string {
    return isLight() ? 'rgba(0, 0, 0, 0.045)' : 'rgba(255, 255, 255, 0.055)';
  },
  get border(): string {
    return isLight() ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.07)';
  },
  get text(): string {
    return isLight() ? '#0f172a' : '#e2e8f0';
  },
  get sub(): string {
    return isLight() ? '#475569' : '#94a3b8';
  },
  get cyan(): string {
    return isLight() ? '#0891b2' : '#06b6d4';
  },
  get violet(): string {
    return isLight() ? '#4f46e5' : '#818cf8';
  },
  get green(): string {
    return isLight() ? '#16a34a' : '#10b981';
  },
  get amber(): string {
    return isLight() ? '#d97706' : '#f59e0b';
  },
  get red(): string {
    return isLight() ? '#dc2626' : '#ef4444';
  },
  get rose(): string {
    return isLight() ? '#e11d48' : '#f43f5e';
  },
  get orange(): string {
    return isLight() ? '#ea580c' : '#f97316';
  },
  get muted(): string {
    return isLight() ? '#64748b' : '#475569';
  },
  get dim(): string {
    return isLight() ? '#e2e8f0' : '#1e293b';
  },
};
