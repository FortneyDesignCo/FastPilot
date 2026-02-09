// LocalStorage-based persistence layer
const STORAGE_KEYS = {
  SETTINGS: 'fp_settings',
  FASTS: 'fp_fasts',
  ACTIVE_FAST: 'fp_active_fast',
  ONBOARDED: 'fp_onboarded'
};

const Storage = {
  // Settings
  getSettings() {
    const defaults = {
      methodId: '16-8',
      startTime: '20:00',
      weeklyGoal: 5,
      notifications: false,
      customFastHours: 16,
      customEatHours: 8
    };
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS));
      return { ...defaults, ...saved };
    } catch {
      return defaults;
    }
  },

  saveSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },

  // Fasting records
  getFasts() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.FASTS)) || [];
    } catch {
      return [];
    }
  },

  saveFasts(fasts) {
    localStorage.setItem(STORAGE_KEYS.FASTS, JSON.stringify(fasts));
  },

  addFast(fast) {
    const fasts = this.getFasts();
    fast.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    fasts.push(fast);
    this.saveFasts(fasts);
    return fast;
  },

  updateFast(id, updates) {
    const fasts = this.getFasts();
    const idx = fasts.findIndex(f => f.id === id);
    if (idx !== -1) {
      fasts[idx] = { ...fasts[idx], ...updates };
      this.saveFasts(fasts);
      return fasts[idx];
    }
    return null;
  },

  deleteFast(id) {
    const fasts = this.getFasts().filter(f => f.id !== id);
    this.saveFasts(fasts);
  },

  // Active fast
  getActiveFast() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVE_FAST));
    } catch {
      return null;
    }
  },

  setActiveFast(fast) {
    if (fast) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_FAST, JSON.stringify(fast));
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_FAST);
    }
  },

  // Export / Import
  exportData() {
    const data = {
      version: 1,
      exportDate: new Date().toISOString(),
      settings: this.getSettings(),
      fasts: this.getFasts()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fastpilot-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.version && data.fasts) {
        if (data.settings) this.saveSettings(data.settings);
        if (data.fasts) this.saveFasts(data.fasts);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  clearAll() {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  },

  // Analytics helpers
  getFastsInRange(startDate, endDate) {
    const fasts = this.getFasts();
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    return fasts.filter(f => {
      const fStart = new Date(f.startTime).getTime();
      return fStart >= start && fStart <= end;
    });
  },

  getFastsForDate(dateStr) {
    const fasts = this.getFasts();
    return fasts.filter(f => {
      const d = new Date(f.startTime);
      const fDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const endD = f.endTime ? new Date(f.endTime) : null;
      const fEndDate = endD ? `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, '0')}-${String(endD.getDate()).padStart(2, '0')}` : null;
      return fDate === dateStr || fEndDate === dateStr;
    });
  },

  getCompletedFasts() {
    return this.getFasts().filter(f => f.status === 'completed');
  },

  getStreak() {
    const fasts = this.getCompletedFasts();
    if (fasts.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const fastDates = new Set();
    fasts.forEach(f => {
      const d = new Date(f.startTime);
      fastDates.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    });

    let streak = 0;
    let checkDate = new Date(today);

    // Check if there's a fast today or yesterday to start counting
    const todayStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
    if (!fastDates.has(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
      const yesterdayStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      if (!fastDates.has(yesterdayStr)) return 0;
    }

    while (true) {
      const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      if (fastDates.has(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  },

  getBestStreak() {
    const fasts = this.getCompletedFasts();
    if (fasts.length === 0) return 0;

    const fastDates = [...new Set(fasts.map(f => {
      const d = new Date(f.startTime);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }))].sort();

    let best = 1;
    let current = 1;

    for (let i = 1; i < fastDates.length; i++) {
      const prev = new Date(fastDates[i - 1]);
      const curr = new Date(fastDates[i]);
      const diff = (curr - prev) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        current++;
        best = Math.max(best, current);
      } else {
        current = 1;
      }
    }

    return best;
  }
};
