// Timer module - handles fasting timer logic
const PHASE_DESCRIPTIONS = {
  '0': {
    title: 'Anabolic Phase',
    time: '0-4 hours',
    description: 'Your body is still digesting and absorbing nutrients from your last meal. Blood sugar and insulin levels are elevated as your body processes food into energy. Glycogen stores in the liver and muscles are being replenished. This is the building phase where your body uses available nutrients for growth and repair.'
  },
  '4': {
    title: 'Catabolic Phase',
    time: '4-8 hours',
    description: 'Your body transitions from the fed state to the fasting state. Insulin levels begin to drop and your body starts breaking down glycogen (stored glucose) for energy. Blood sugar stabilizes and growth hormone levels start to rise. Your digestive system gets a chance to rest and reset.'
  },
  '8': {
    title: 'Fat Burning Phase',
    time: '8-12 hours',
    description: 'Glycogen stores are becoming depleted and your body increasingly shifts to burning fat for fuel. Insulin levels are now low, which unlocks fat cells to release stored fatty acids. Your metabolic rate may slightly increase as your body becomes more efficient at using fat as its primary energy source.'
  },
  '12': {
    title: 'Ketosis',
    time: '12-18 hours',
    description: 'Your body enters a state of ketosis where the liver converts fatty acids into ketone bodies, an alternative fuel source for the brain and body. Mental clarity often improves as the brain efficiently uses ketones. Inflammation markers begin to decrease and cellular repair processes accelerate.'
  },
  '18': {
    title: 'Autophagy',
    time: '18-24 hours',
    description: 'Autophagy ("self-eating") kicks into high gear. Your cells begin breaking down and recycling damaged components, misfolded proteins, and dysfunctional organelles. This powerful cellular cleanup process is linked to longevity, reduced inflammation, and protection against diseases. Growth hormone levels surge significantly.'
  },
  '24': {
    title: 'Deep Repair',
    time: '24+ hours',
    description: 'Your body enters a deep state of cellular repair and regeneration. Autophagy reaches its peak, clearing out old and damaged cells to make way for new, healthy ones. Stem cell production may increase, supporting immune system renewal. Insulin sensitivity improves dramatically. This phase offers the most profound benefits for cellular health and longevity.'
  }
};

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

    // Retroactive start
    document.getElementById('btn-retroactive-start').addEventListener('click', () => this.openRetroactiveStart());
    document.getElementById('close-retroactive-start').addEventListener('click', () => this.closeRetroactiveStart());
    document.getElementById('retroactive-start-modal').querySelector('.modal-overlay').addEventListener('click', () => this.closeRetroactiveStart());
    document.getElementById('btn-confirm-retroactive').addEventListener('click', () => this.confirmRetroactiveStart());

    // Quick method picker
    document.getElementById('current-method-badge').addEventListener('click', () => this.toggleQuickPicker());
    document.getElementById('close-quick-picker').addEventListener('click', () => this.closeQuickPicker());
    document.getElementById('quick-picker-overlay').addEventListener('click', () => this.closeQuickPicker());

    // Phase info popups
    document.querySelectorAll('#timer-phases .phase').forEach(phase => {
      phase.addEventListener('click', () => this.showPhaseInfo(phase));
    });
    document.getElementById('close-phase-info').addEventListener('click', () => this.closePhaseInfo());
    document.querySelector('.phase-info-overlay').addEventListener('click', () => this.closePhaseInfo());
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

  openRetroactiveStart() {
    if (this.activeFast) return;
    const now = new Date();
    const localISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    document.getElementById('retroactive-start-time').value = localISO;
    document.getElementById('retroactive-start-time').max = localISO;
    document.getElementById('retroactive-start-modal').classList.remove('hidden');
  },

  closeRetroactiveStart() {
    document.getElementById('retroactive-start-modal').classList.add('hidden');
  },

  confirmRetroactiveStart() {
    const startStr = document.getElementById('retroactive-start-time').value;
    if (!startStr) {
      this.showToast('Please select a start time', 'error');
      return;
    }

    const startDate = new Date(startStr);
    if (startDate > new Date()) {
      this.showToast('Start time cannot be in the future', 'error');
      return;
    }

    const settings = Storage.getSettings();
    const method = getMethodById(settings.methodId);

    this.activeFast = {
      methodId: method.id,
      methodName: method.name,
      targetHours: method.fastHours,
      startTime: startDate.toISOString(),
      endTime: null,
      status: 'active'
    };

    Storage.setActiveFast(this.activeFast);
    this.closeRetroactiveStart();
    this.updateUI();
    this.startTicking();

    const elapsed = (new Date() - startDate) / (1000 * 60 * 60);
    this.showToast(`Fast started ${elapsed.toFixed(1)}h ago!`);
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
    document.getElementById('btn-retroactive-start').style.display = 'none';

    const method = getMethodById(this.activeFast.methodId);
    document.getElementById('badge-method-name').textContent = method.name;
    document.getElementById('current-method-badge').classList.add('locked');
  },

  resetUI() {
    document.getElementById('btn-start-fast').style.display = '';
    document.getElementById('btn-end-fast').style.display = 'none';
    document.getElementById('btn-cancel-fast').style.display = 'none';
    document.getElementById('btn-retroactive-start').style.display = '';
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
  },

  showPhaseInfo(phaseEl) {
    const hours = phaseEl.dataset.hours;
    const info = PHASE_DESCRIPTIONS[hours];
    if (!info) return;

    const icon = phaseEl.querySelector('.phase-icon').textContent;
    document.getElementById('phase-info-icon').textContent = icon;
    document.getElementById('phase-info-title').textContent = info.title;
    document.getElementById('phase-info-time').textContent = info.time;
    document.getElementById('phase-info-desc').textContent = info.description;
    document.getElementById('phase-info-popup').classList.remove('hidden');
  },

  closePhaseInfo() {
    document.getElementById('phase-info-popup').classList.add('hidden');
  }
};
