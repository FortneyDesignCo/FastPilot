// Interactive Calendar module
const Calendar = {
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth(),
  selectedDate: null,

  init() {
    this.bindEvents();
    this.render();
  },

  bindEvents() {
    document.getElementById('cal-prev').addEventListener('click', () => {
      this.currentMonth--;
      if (this.currentMonth < 0) {
        this.currentMonth = 11;
        this.currentYear--;
      }
      this.render();
    });

    document.getElementById('cal-next').addEventListener('click', () => {
      this.currentMonth++;
      if (this.currentMonth > 11) {
        this.currentMonth = 0;
        this.currentYear++;
      }
      this.render();
    });

    document.getElementById('close-day-detail').addEventListener('click', () => {
      this.closeDayDetail();
    });

    document.getElementById('btn-add-manual').addEventListener('click', () => {
      App.openManualEntry(this.selectedDate);
    });

    // Swipe support
    let touchStartX = 0;
    const grid = document.getElementById('calendar-grid');
    grid.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });
    grid.addEventListener('touchend', (e) => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 60) {
        if (diff > 0) document.getElementById('cal-next').click();
        else document.getElementById('cal-prev').click();
      }
    }, { passive: true });
  },

  render() {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    document.getElementById('cal-month-year').textContent =
      `${monthNames[this.currentMonth]} ${this.currentYear}`;

    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    const firstDay = new Date(this.currentYear, this.currentMonth, 1).getDay();
    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const settings = Storage.getSettings();
    const method = getMethodById(settings.methodId);

    // Get all fasts for this month
    const monthStart = new Date(this.currentYear, this.currentMonth, 1);
    const monthEnd = new Date(this.currentYear, this.currentMonth + 1, 0, 23, 59, 59);
    const monthFasts = Storage.getFastsInRange(monthStart.toISOString(), monthEnd.toISOString());

    // Build a map of dates to fasts
    const dateMap = {};
    monthFasts.forEach(f => {
      const d = new Date(f.startTime);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!dateMap[dateStr]) dateMap[dateStr] = [];
      dateMap[dateStr].push(f);
    });

    // Empty cells for days before first day of month
    for (let i = 0; i < firstDay; i++) {
      const cell = document.createElement('div');
      cell.className = 'calendar-day empty';
      grid.appendChild(cell);
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const cell = document.createElement('div');
      cell.className = 'calendar-day';

      const dayNum = document.createElement('span');
      dayNum.className = 'day-number';
      dayNum.textContent = day;
      cell.appendChild(dayNum);

      // Check fasting status for this day
      const dayFasts = dateMap[dateStr] || [];
      if (dayFasts.length > 0) {
        const hasCompleted = dayFasts.some(f => f.status === 'completed');
        const hasPartial = dayFasts.some(f => f.status === 'partial');
        const totalHours = dayFasts.reduce((s, f) => s + (f.actualHours || 0), 0);

        if (hasCompleted) {
          cell.classList.add('completed');
          const dot = document.createElement('span');
          dot.className = 'day-indicator completed';
          cell.appendChild(dot);
        } else if (hasPartial) {
          cell.classList.add('partial');
          const dot = document.createElement('span');
          dot.className = 'day-indicator partial';
          cell.appendChild(dot);
        }

        // Show hours
        if (totalHours > 0) {
          const hours = document.createElement('span');
          hours.className = 'day-hours';
          hours.textContent = totalHours.toFixed(1) + 'h';
          cell.appendChild(hours);
        }
      }

      if (dateStr === todayStr) {
        cell.classList.add('today');
      }

      if (this.selectedDate === dateStr) {
        cell.classList.add('selected');
      }

      // Future dates
      if (new Date(dateStr) > today) {
        cell.classList.add('future');
      }

      cell.addEventListener('click', () => this.selectDate(dateStr));
      grid.appendChild(cell);
    }

    this.renderMonthlySummary(monthFasts);
  },

  selectDate(dateStr) {
    this.selectedDate = dateStr;
    this.render();
    this.showDayDetail(dateStr);
  },

  showDayDetail(dateStr) {
    const panel = document.getElementById('day-detail-panel');
    const dateDisplay = document.getElementById('day-detail-date');
    const content = document.getElementById('day-detail-content');

    const date = new Date(dateStr + 'T12:00:00');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateDisplay.textContent = date.toLocaleDateString('en-US', options);

    const fasts = Storage.getFastsForDate(dateStr);

    if (fasts.length === 0) {
      content.innerHTML = '<div class="no-fasts">No fasts recorded this day</div>';
    } else {
      content.innerHTML = fasts.map(f => {
        const startTime = new Date(f.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const endTime = f.endTime ? new Date(f.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Ongoing';
        const method = getMethodById(f.methodId);
        const statusClass = f.status === 'completed' ? 'status-completed' :
                           f.status === 'partial' ? 'status-partial' : 'status-active';
        const statusLabel = f.status === 'completed' ? 'Completed' :
                           f.status === 'partial' ? 'Partial' : 'Active';

        return `
          <div class="day-fast-card">
            <div class="fast-card-header">
              <span class="fast-method">${method.icon} ${method.name}</span>
              <span class="fast-status ${statusClass}">${statusLabel}</span>
            </div>
            <div class="fast-card-times">
              <span>${startTime}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              <span>${endTime}</span>
            </div>
            ${f.actualHours ? `<div class="fast-card-duration">${f.actualHours.toFixed(1)} hours fasted</div>` : ''}
            ${f.notes ? `<div class="fast-card-notes">${f.notes}</div>` : ''}
            <div class="fast-card-actions">
              ${f.endTime ? `<button class="btn btn-ghost btn-tiny edit-end-time-btn" data-id="${f.id}">Adjust End Time</button>` : ''}
              <button class="btn btn-ghost btn-tiny delete-fast-btn" data-id="${f.id}">Delete</button>
            </div>
          </div>
        `;
      }).join('');

      // Bind edit end time buttons
      content.querySelectorAll('.edit-end-time-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          App.openEditFast(btn.dataset.id);
        });
      });

      // Bind delete buttons
      content.querySelectorAll('.delete-fast-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.target.dataset.id;
          if (confirm('Delete this fast entry?')) {
            Storage.deleteFast(id);
            this.showDayDetail(dateStr);
            this.render();
            Timer.updateQuickStats();
            if (typeof Analytics !== 'undefined') Analytics.refresh();
          }
        });
      });
    }

    panel.classList.remove('hidden');
  },

  closeDayDetail() {
    document.getElementById('day-detail-panel').classList.add('hidden');
    this.selectedDate = null;
    this.render();
  },

  renderMonthlySummary(monthFasts) {
    const container = document.getElementById('monthly-summary');
    const completed = monthFasts.filter(f => f.status === 'completed').length;
    const totalHours = monthFasts.reduce((s, f) => s + (f.actualHours || 0), 0);
    const daysWithFasts = new Set(monthFasts.map(f => {
      const d = new Date(f.startTime);
      return d.getDate();
    })).size;

    const settings = Storage.getSettings();
    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    const weeksInMonth = Math.ceil(daysInMonth / 7);
    const monthlyGoal = settings.weeklyGoal * weeksInMonth;

    container.innerHTML = `
      <h3>Monthly Summary</h3>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="summary-value">${monthFasts.length}</div>
          <div class="summary-label">Total Fasts</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${completed}</div>
          <div class="summary-label">Completed</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${totalHours.toFixed(1)}h</div>
          <div class="summary-label">Hours Fasted</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${daysWithFasts}/${monthlyGoal}</div>
          <div class="summary-label">Goal Progress</div>
        </div>
      </div>
      <div class="goal-progress-bar">
        <div class="goal-progress-fill" style="width: ${Math.min((daysWithFasts / monthlyGoal) * 100, 100)}%"></div>
      </div>
    `;
  }
};
