// Timer module - handles fasting timer logic
const Timer = {
  interval: null,
  activeFast: null,

  init() {
    this.activeFast = Storage.getActiveFast();
    this.bindEvents();
    if (this.activeFast) {
      this.resumeFast();
    }
    this.updateQuickStats();
    this.updateMethodInfo();
  },

  bindEvents() {
    document.getElementById('btn-start-fast').addEventListener('click', () => this.startFast());
    document.getElementById('btn-end-fast').addEventListener('click', () => this.endFast());
    document.getElementById('btn-cancel-fast').addEventListener('click', () => this.cancelFast());

    // Quick method picker
    document.getElementById('current-method-badge').addEventListener('click', () => this.toggleQuickPicker());
    document.getElementById('close-quick-picker').addEventListener('click', () => this.closeQuickPicker());
    document.getElementById('quick-picker-overlay').addEventListener('click', () => this.closeQuickPicker());
  },

  toggleQuickPicker() {
    if (this.activeFast) return; // Don't allow switching mid-fast
    const picker = document.getElementById('method-quick-picker');
    const overlay = document.getElementById('quick-picker-overlay');
    const isHidden = picker.classList.contains('hidden');

    if (isHidden) {
      this.renderQuickPicker();
      picker.classList.remove('hidden');
      overlay.classList.remove('hidden');
    } else {
      this.closeQuickPicker();
    }
  },

  closeQuickPicker() {
    document.getElementById('method-quick-picker').classList.add('hidden');
    document.getElementById('quick-picker-overlay').classList.add('hidden');
  },

  renderQuickPicker() {
    const list = document.getElementById('quick-picker-list');
    const settings = Storage.getSettings();
    const categories = getMethodCategories();

    let html = '';
    Object.entries(categories).forEach(([key, cat]) => {
      html += `<div class="qp-category"><span class="qp-category-label">${cat.label}</span>`;
      cat.methods.forEach(method => {
        const isActive = method.id === settings.methodId;
        html += `
          <button class="qp-method ${isActive ? 'active' : ''}" data-method="${method.id}">
            <span class="qp-icon">${method.icon}</span>
            <div class="qp-info">
              <span class="qp-name">${method.name} <span class="qp-sub">${method.subtitle}</span></span>
              <span class="qp-detail">${method.fastHours}h fast &middot; ${method.difficulty}</span>
            </div>
            ${isActive ? '<span class="qp-check">&#10003;</span>' : ''}
          </button>
        `;
      });
      html += '</div>';
    });

    list.innerHTML = html;

    list.querySelectorAll('.qp-method').forEach(btn => {
      btn.addEventListener('click', () => {
        const methodId = btn.dataset.method;
        const settings = Storage.getSettings();
        settings.methodId = methodId;
        Storage.saveSettings(settings);

        const method = getMethodById(methodId);
        document.getElementById('badge-method-name').textContent = method.name;
        this.closeQuickPicker();
        this.updateMethodInfo();
        this.showToast(`Switched to ${method.name} (${method.subtitle})`, 'info');
      });
    });
  },

  updateMethodInfo() {
    const settings = Storage.getSettings();
    const method = getMethodById(settings.methodId);

    document.getElementById('method-info-icon').textContent = method.icon;
    document.getElementById('method-info-name').textContent = `${method.name} - ${method.subtitle}`;
    document.getElementById('method-info-schedule').textContent =
      method.eatHours > 0
        ? `${method.fastHours}h fasting \u00B7 ${method.eatHours}h eating window`
        : `${method.fastHours}h fast`;
    document.getElementById('method-info-desc').textContent = method.description;

    const diffEl = document.getElementById('method-info-difficulty');
    diffEl.textContent = method.difficulty;
    diffEl.className = 'method-info-difficulty ' + method.difficulty.toLowerCase();
  },

  startFast() {
    const settings = Storage.getSettings();
    const method = getMethodById(settings.methodId);

    this.activeFast = {
      methodId: method.id,
      methodName: method.name,
      targetHours: method.fastHours,
      startTime: new Date().toISOString(),
      endTime: null,
      status: 'active'
    };

    Storage.setActiveFast(this.activeFast);
    this.updateUI();
    this.startTicking();
    this.showToast('Fast started! Stay strong!');
  },

  resumeFast() {
    this.updateUI();
    this.startTicking();
  },

  endFast() {
    if (!this.activeFast) return;

    const now = new Date();
    const start = new Date(this.activeFast.startTime);
    const elapsed = (now - start) / (1000 * 60 * 60);
    const targetMet = elapsed >= this.activeFast.targetHours;

    this.activeFast.endTime = now.toISOString();
    this.activeFast.actualHours = parseFloat(elapsed.toFixed(2));
    this.activeFast.status = targetMet ? 'completed' : 'partial';

    Storage.addFast(this.activeFast);
    Storage.setActiveFast(null);

    this.stopTicking();

    if (targetMet) {
      this.showToast('Fast completed! Great job!', 'success');
      this.celebrateCompletion();
    } else {
      this.showToast(`Fast ended at ${elapsed.toFixed(1)}h of ${this.activeFast.targetHours}h goal`, 'info');
    }

    this.activeFast = null;
    this.resetUI();
    this.updateQuickStats();

    // Refresh other tabs if visible
    if (typeof Calendar !== 'undefined') Calendar.render();
    if (typeof Analytics !== 'undefined') Analytics.refresh();
    if (typeof App !== 'undefined') App.renderHistory();
  },

  cancelFast() {
    if (!this.activeFast) return;
    if (!confirm('Cancel this fast? It won\'t be saved.')) return;

    Storage.setActiveFast(null);
    this.activeFast = null;
    this.stopTicking();
    this.resetUI();
    this.showToast('Fast cancelled', 'info');
  },

  startTicking() {
    this.stopTicking();
    this.tick();
    this.interval = setInterval(() => this.tick(), 1000);
  },

  stopTicking() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  },

  tick() {
    if (!this.activeFast) return;

    const now = new Date();
    const start = new Date(this.activeFast.startTime);
    const elapsedMs = now - start;
    const elapsedHours = elapsedMs / (1000 * 60 * 60);
    const targetMs = this.activeFast.targetHours * 60 * 60 * 1000;
    const progress = Math.min(elapsedMs / targetMs, 1);
    const remainingMs = Math.max(targetMs - elapsedMs, 0);

    // Update timer display
    const display = document.getElementById('timer-display');
    const subtitle = document.getElementById('timer-subtitle');
    const state = document.getElementById('timer-state');

    if (elapsedMs >= targetMs) {
      display.textContent = this.formatDuration(elapsedMs);
      state.textContent = 'Goal reached!';
      state.classList.add('goal-reached');
      subtitle.textContent = `+${this.formatDuration(elapsedMs - targetMs)} beyond goal`;
    } else {
      display.textContent = this.formatDuration(elapsedMs);
      state.textContent = 'Fasting';
      state.classList.remove('goal-reached');
      subtitle.textContent = `${this.formatDuration(remainingMs)} remaining`;
    }

    // Update progress ring
    const ring = document.getElementById('timer-progress');
    const circumference = 2 * Math.PI * 120;
    const offset = circumference - (progress * circumference);
    ring.style.strokeDashoffset = offset;

    // Update fasting phases
    this.updatePhases(elapsedHours);
  },

  updatePhases(elapsedHours) {
    const phases = document.querySelectorAll('#timer-phases .phase');
    phases.forEach(phase => {
      const phaseStart = parseInt(phase.dataset.hours);
      if (elapsedHours >= phaseStart) {
        phase.classList.add('active');
      } else {
        phase.classList.remove('active');
      }
    });
  },

  updateUI() {
    document.getElementById('btn-start-fast').style.display = 'none';
    document.getElementById('btn-end-fast').style.display = '';
    document.getElementById('btn-cancel-fast').style.display = '';

    const method = getMethodById(this.activeFast.methodId);
    document.getElementById('badge-method-name').textContent = method.name;
    document.getElementById('current-method-badge').classList.add('locked');
  },

  resetUI() {
    document.getElementById('btn-start-fast').style.display = '';
    document.getElementById('btn-end-fast').style.display = 'none';
    document.getElementById('btn-cancel-fast').style.display = 'none';
    document.getElementById('timer-display').textContent = '00:00:00';
    document.getElementById('timer-state').textContent = 'Ready to fast';
    document.getElementById('timer-state').classList.remove('goal-reached');
    document.getElementById('timer-subtitle').textContent = 'Tap Start to begin';
    document.getElementById('timer-progress').style.strokeDashoffset = 2 * Math.PI * 120;

    const settings = Storage.getSettings();
    const method = getMethodById(settings.methodId);
    document.getElementById('badge-method-name').textContent = method.name;
    document.getElementById('current-method-badge').classList.remove('locked');

    document.querySelectorAll('#timer-phases .phase').forEach(p => p.classList.remove('active'));
  },

  updateQuickStats() {
    const fasts = Storage.getCompletedFasts();
    const streak = Storage.getStreak();

    document.getElementById('stat-streak').textContent = streak;
    document.getElementById('stat-total-fasts').textContent = fasts.length;

    if (fasts.length > 0) {
      const totalHours = fasts.reduce((sum, f) => sum + (f.actualHours || 0), 0);
      const avg = totalHours / fasts.length;
      document.getElementById('stat-avg-duration').textContent = avg.toFixed(1) + 'h';
    } else {
      document.getElementById('stat-avg-duration').textContent = '0h';
    }
  },

  formatDuration(ms) {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  celebrateCompletion() {
    const container = document.querySelector('.timer-container');
    container.classList.add('celebrate');
    setTimeout(() => container.classList.remove('celebrate'), 2000);
  }
};
