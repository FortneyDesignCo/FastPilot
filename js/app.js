// Main App controller
const App = {
  currentTab: 'timer',
  onboardingStep: 1,
  selectedMethodId: '16-8',

  init() {
    if (Storage.isOnboarded()) {
      this.showMainApp();
    } else {
      this.showOnboarding();
    }
  },

  // Onboarding
  showOnboarding() {
    document.getElementById('onboarding-screen').classList.add('active');
    document.getElementById('main-app').classList.remove('active');
    this.renderMethodSelector();
    this.bindOnboarding();
  },

  renderMethodSelector() {
    const container = document.getElementById('method-selector');
    const categories = getMethodCategories();

    let html = '';
    Object.entries(categories).forEach(([key, cat]) => {
      html += `<div class="method-category"><h3>${cat.label}</h3><div class="method-cards">`;
      cat.methods.forEach(method => {
        html += `
          <button class="method-card ${method.id === this.selectedMethodId ? 'selected' : ''}"
                  data-method="${method.id}">
            <span class="method-icon">${method.icon}</span>
            <span class="method-name">${method.name}</span>
            <span class="method-subtitle">${method.subtitle}</span>
            <span class="method-difficulty ${method.difficulty.toLowerCase()}">${method.difficulty}</span>
          </button>
        `;
      });
      html += '</div></div>';
    });

    container.innerHTML = html;

    container.querySelectorAll('.method-card').forEach(card => {
      card.addEventListener('click', () => {
        container.querySelectorAll('.method-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedMethodId = card.dataset.method;
      });
    });
  },

  bindOnboarding() {
    const nextBtn = document.getElementById('onboarding-next');
    const backBtn = document.getElementById('onboarding-back');
    const goalSlider = document.getElementById('weekly-goal');
    const goalDisplay = document.getElementById('goal-display');

    goalSlider.addEventListener('input', () => {
      goalDisplay.textContent = goalSlider.value + ' days';
    });

    nextBtn.addEventListener('click', () => {
      if (this.onboardingStep === 1) {
        this.onboardingStep = 2;
        document.querySelector('.step[data-step="1"]').classList.remove('active');
        document.querySelector('.step[data-step="2"]').classList.add('active');
        backBtn.style.display = '';
        nextBtn.textContent = 'Start Fasting';
      } else {
        // Save settings
        const settings = {
          methodId: this.selectedMethodId,
          startTime: document.getElementById('preferred-start-time').value,
          weeklyGoal: parseInt(document.getElementById('weekly-goal').value),
          notifications: false
        };
        Storage.saveSettings(settings);
        Storage.setOnboarded();
        this.showMainApp();
      }
    });

    backBtn.addEventListener('click', () => {
      this.onboardingStep = 1;
      document.querySelector('.step[data-step="2"]').classList.remove('active');
      document.querySelector('.step[data-step="1"]').classList.add('active');
      backBtn.style.display = 'none';
      nextBtn.textContent = 'Continue';
    });
  },

  // Main App
  showMainApp() {
    document.getElementById('onboarding-screen').classList.remove('active');
    document.getElementById('main-app').classList.add('active');

    this.bindNavigation();
    this.bindSettings();
    this.bindManualEntry();

    Timer.init();
    Calendar.init();
    Analytics.init();
    this.renderHistory();

    // Update method badge
    const settings = Storage.getSettings();
    const method = getMethodById(settings.methodId);
    document.getElementById('badge-method-name').textContent = method.name;
  },

  bindNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const tab = item.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Home button - navigates to Timer tab
    document.getElementById('home-btn').addEventListener('click', () => {
      this.switchTab('timer');
    });
  },

  switchTab(tab) {
    this.currentTab = tab;

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`.nav-item[data-tab="${tab}"]`).classList.add('active');

    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');

    if (tab === 'calendar') Calendar.render();
    if (tab === 'analytics') Analytics.refresh();
    if (tab === 'history') this.renderHistory();
  },

  // Settings
  bindSettings() {
    const modal = document.getElementById('settings-modal');
    const settingsBtn = document.getElementById('settings-btn');
    const closeBtn = document.getElementById('close-settings');
    const overlay = modal.querySelector('.modal-overlay');

    settingsBtn.addEventListener('click', () => this.openSettings());
    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    overlay.addEventListener('click', () => modal.classList.add('hidden'));

    // Populate method dropdown
    const select = document.getElementById('setting-method');
    FASTING_METHODS.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `${m.name} - ${m.subtitle}`;
      select.appendChild(opt);
    });

    select.addEventListener('change', () => {
      const method = getMethodById(select.value);
      document.getElementById('method-description').textContent = method.description;
    });

    // Goal slider in settings
    const goalSlider = document.getElementById('setting-weekly-goal');
    const goalDisplay = document.getElementById('setting-goal-display');
    goalSlider.addEventListener('input', () => {
      goalDisplay.textContent = goalSlider.value + ' days';
    });

    // Save on close
    closeBtn.addEventListener('click', () => this.saveSettingsFromModal());
    overlay.addEventListener('click', () => this.saveSettingsFromModal());

    // Export / Import / Clear
    document.getElementById('btn-export').addEventListener('click', () => Storage.exportData());
    document.getElementById('btn-import').addEventListener('click', () => {
      document.getElementById('import-file').click();
    });
    document.getElementById('import-file').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (Storage.importData(ev.target.result)) {
          Timer.showToast('Data imported successfully!', 'success');
          Timer.updateQuickStats();
          Calendar.render();
          Analytics.refresh();
          this.renderHistory();
        } else {
          Timer.showToast('Invalid import file', 'error');
        }
      };
      reader.readAsText(file);
    });
    document.getElementById('btn-clear-data').addEventListener('click', () => {
      if (confirm('This will delete ALL your fasting data. Are you sure?')) {
        if (confirm('This cannot be undone. Really delete everything?')) {
          Storage.clearAll();
          Timer.showToast('All data cleared', 'info');
          Timer.stopTicking();
          Timer.activeFast = null;
          Timer.resetUI();
          Timer.updateQuickStats();
          Calendar.render();
          Analytics.refresh();
          this.renderHistory();
        }
      }
    });
  },

  openSettings() {
    const settings = Storage.getSettings();
    document.getElementById('setting-method').value = settings.methodId;
    document.getElementById('setting-start-time').value = settings.startTime;
    document.getElementById('setting-weekly-goal').value = settings.weeklyGoal;
    document.getElementById('setting-goal-display').textContent = settings.weeklyGoal + ' days';
    document.getElementById('setting-notifications').checked = settings.notifications;

    const method = getMethodById(settings.methodId);
    document.getElementById('method-description').textContent = method.description;

    document.getElementById('settings-modal').classList.remove('hidden');
  },

  saveSettingsFromModal() {
    const settings = {
      methodId: document.getElementById('setting-method').value,
      startTime: document.getElementById('setting-start-time').value,
      weeklyGoal: parseInt(document.getElementById('setting-weekly-goal').value),
      notifications: document.getElementById('setting-notifications').checked
    };
    Storage.saveSettings(settings);

    const method = getMethodById(settings.methodId);
    if (!Timer.activeFast) {
      document.getElementById('badge-method-name').textContent = method.name;
      Timer.updateMethodInfo();
    }
  },

  // Manual Entry
  bindManualEntry() {
    const modal = document.getElementById('manual-entry-modal');
    const closeBtn = document.getElementById('close-manual-entry');
    const overlay = modal.querySelector('.modal-overlay');
    const saveBtn = document.getElementById('btn-save-manual');

    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    overlay.addEventListener('click', () => modal.classList.add('hidden'));

    // Populate method dropdown
    const select = document.getElementById('manual-method');
    FASTING_METHODS.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `${m.name} - ${m.subtitle}`;
      select.appendChild(opt);
    });

    saveBtn.addEventListener('click', () => {
      const methodId = document.getElementById('manual-method').value;
      const startStr = document.getElementById('manual-start').value;
      const endStr = document.getElementById('manual-end').value;
      const notes = document.getElementById('manual-notes').value;

      if (!startStr || !endStr) {
        Timer.showToast('Please fill in start and end times', 'error');
        return;
      }

      const start = new Date(startStr);
      const end = new Date(endStr);

      if (end <= start) {
        Timer.showToast('End time must be after start time', 'error');
        return;
      }

      const hours = (end - start) / (1000 * 60 * 60);
      const method = getMethodById(methodId);
      const targetMet = hours >= method.fastHours;

      const fast = {
        methodId,
        methodName: method.name,
        targetHours: method.fastHours,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        actualHours: parseFloat(hours.toFixed(2)),
        status: targetMet ? 'completed' : 'partial',
        notes: notes || undefined,
        manual: true
      };

      Storage.addFast(fast);
      modal.classList.add('hidden');
      Timer.showToast('Entry added!', 'success');
      Timer.updateQuickStats();
      Calendar.render();
      Analytics.refresh();
      this.renderHistory();
    });
  },

  openManualEntry(dateStr) {
    const settings = Storage.getSettings();
    document.getElementById('manual-method').value = settings.methodId;
    document.getElementById('manual-notes').value = '';

    if (dateStr) {
      document.getElementById('manual-start').value = dateStr + 'T20:00';
      document.getElementById('manual-end').value = dateStr + 'T12:00';
      // Adjust end to next day for typical fasting pattern
      const startDate = new Date(dateStr + 'T20:00');
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + getMethodById(settings.methodId).fastHours);
      const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}T${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
      document.getElementById('manual-end').value = endStr;
    } else {
      const now = new Date();
      document.getElementById('manual-start').value = '';
      document.getElementById('manual-end').value = '';
    }

    document.getElementById('manual-entry-modal').classList.remove('hidden');
  },

  // History
  renderHistory() {
    const list = document.getElementById('history-list');
    const empty = document.getElementById('history-empty');
    const filterMethod = document.getElementById('history-filter-method').value;
    const filterStatus = document.getElementById('history-filter-status').value;

    // Populate method filter
    const methodSelect = document.getElementById('history-filter-method');
    if (methodSelect.options.length <= 1) {
      FASTING_METHODS.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.name;
        methodSelect.appendChild(opt);
      });
    }

    // Bind filter changes
    methodSelect.onchange = () => this.renderHistory();
    document.getElementById('history-filter-status').onchange = () => this.renderHistory();

    let fasts = Storage.getFasts();

    if (filterMethod !== 'all') {
      fasts = fasts.filter(f => f.methodId === filterMethod);
    }
    if (filterStatus !== 'all') {
      fasts = fasts.filter(f => f.status === filterStatus);
    }

    fasts.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

    if (fasts.length === 0) {
      list.innerHTML = '';
      empty.style.display = '';
      return;
    }

    empty.style.display = 'none';

    list.innerHTML = fasts.map(f => {
      const method = getMethodById(f.methodId);
      const start = new Date(f.startTime);
      const end = f.endTime ? new Date(f.endTime) : null;
      const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const startTime = start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const endTime = end ? end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--';
      const statusClass = f.status === 'completed' ? 'status-completed' :
                         f.status === 'partial' ? 'status-partial' : 'status-cancelled';
      const statusLabel = f.status.charAt(0).toUpperCase() + f.status.slice(1);
      const pct = f.actualHours && f.targetHours ?
                  Math.min(Math.round((f.actualHours / f.targetHours) * 100), 150) : 0;

      return `
        <div class="history-item">
          <div class="history-item-top">
            <div class="history-method">
              <span class="method-icon-small">${method.icon}</span>
              <span>${method.name}</span>
            </div>
            <span class="history-status ${statusClass}">${statusLabel}</span>
          </div>
          <div class="history-item-date">${startStr}</div>
          <div class="history-item-times">
            <span>${startTime}</span>
            <span class="arrow">&#8594;</span>
            <span>${endTime}</span>
          </div>
          <div class="history-item-bar">
            <div class="history-bar-fill" style="width: ${Math.min(pct, 100)}%"></div>
          </div>
          <div class="history-item-bottom">
            <span>${f.actualHours ? f.actualHours.toFixed(1) + 'h' : '--'} / ${f.targetHours}h</span>
            <span>${pct}%</span>
          </div>
          ${f.notes ? `<div class="history-item-notes">${f.notes}</div>` : ''}
          ${f.manual ? '<span class="manual-badge">Manual</span>' : ''}
        </div>
      `;
    }).join('');
  }
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
