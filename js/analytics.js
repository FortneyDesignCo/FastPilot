// Analytics module - charts, stats, and insights
const Analytics = {
  charts: {},
  currentPeriod: 'week',

  init() {
    this.bindEvents();
    this.refresh();
  },

  bindEvents() {
    document.querySelectorAll('.period-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.currentPeriod = e.target.dataset.period;
        this.refresh();
      });
    });

    // Tooltip handling
    document.querySelectorAll('.info-tooltip').forEach(tip => {
      tip.addEventListener('click', (e) => {
        e.target.classList.toggle('active');
      });
    });
  },

  getDateRange() {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    let start = new Date(now);
    start.setHours(0, 0, 0, 0);

    switch (this.currentPeriod) {
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
      case 'all':
        start = new Date(2020, 0, 1);
        break;
    }
    return { start, end };
  },

  refresh() {
    const { start, end } = this.getDateRange();
    const fasts = Storage.getFastsInRange(start.toISOString(), end.toISOString());
    const allFasts = Storage.getFasts();

    this.updateScoreCard(fasts);
    this.updateStatCards(fasts);
    this.renderDurationChart(fasts);
    this.renderConsistencyChart(fasts);
    this.renderDayOfWeekChart(fasts);
    this.renderMethodChart(fasts);
    this.renderStartTimeChart(fasts);
    this.renderMilestones(allFasts);
  },

  updateScoreCard(fasts) {
    const completed = fasts.filter(f => f.status === 'completed').length;
    const total = fasts.length;
    const streak = Storage.getStreak();
    const settings = Storage.getSettings();
    const method = getMethodById(settings.methodId);

    // Score: 40% completion rate + 30% streak (max 30 days) + 30% accuracy
    let completionScore = total > 0 ? (completed / total) * 40 : 0;
    let streakScore = Math.min(streak / 30, 1) * 30;

    let accuracyScore = 0;
    if (completed > 0) {
      const completedFasts = fasts.filter(f => f.status === 'completed');
      const avgAccuracy = completedFasts.reduce((sum, f) => {
        const target = getMethodById(f.methodId).fastHours;
        const ratio = Math.min(f.actualHours / target, 1.5);
        return sum + (ratio > 1 ? 2 - ratio : ratio);
      }, 0) / completedFasts.length;
      accuracyScore = avgAccuracy * 30;
    }

    const score = Math.round(completionScore + streakScore + accuracyScore);

    document.getElementById('fasting-score').textContent = score;
    const ring = document.getElementById('score-progress');
    const circumference = 2 * Math.PI * 52;
    ring.style.strokeDashoffset = circumference - (score / 100) * circumference;
  },

  updateStatCards(fasts) {
    const completed = fasts.filter(f => f.status === 'completed');
    const totalHours = fasts.reduce((s, f) => s + (f.actualHours || 0), 0);
    const completionRate = fasts.length > 0 ? Math.round((completed.length / fasts.length) * 100) : 0;
    const longestFast = fasts.reduce((max, f) => Math.max(max, f.actualHours || 0), 0);
    const streak = Storage.getStreak();
    const bestStreak = Storage.getBestStreak();

    document.getElementById('total-hours').textContent = totalHours.toFixed(1);
    document.getElementById('completion-rate').textContent = completionRate + '%';
    document.getElementById('longest-fast').textContent = longestFast.toFixed(1) + 'h';
    document.getElementById('current-streak').textContent = streak + ' days';
    document.getElementById('best-streak').textContent = bestStreak + ' days';
  },

  renderDurationChart(fasts) {
    const ctx = document.getElementById('duration-chart');
    if (!ctx) return;

    if (this.charts.duration) this.charts.duration.destroy();

    const sortedFasts = [...fasts].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    const labels = sortedFasts.map(f => {
      const d = new Date(f.startTime);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const durations = sortedFasts.map(f => f.actualHours || 0);
    const targets = sortedFasts.map(f => getMethodById(f.methodId).fastHours);

    this.charts.duration = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Actual Duration',
            data: durations,
            backgroundColor: durations.map((d, i) =>
              d >= targets[i] ? 'rgba(99, 102, 241, 0.8)' : 'rgba(251, 146, 60, 0.8)'
            ),
            borderRadius: 6,
            borderSkipped: false
          },
          {
            label: 'Target',
            data: targets,
            type: 'line',
            borderColor: 'rgba(34, 211, 238, 0.8)',
            borderDash: [5, 5],
            borderWidth: 2,
            pointRadius: 0,
            fill: false
          }
        ]
      },
      options: this.getChartOptions('Hours')
    });
  },

  renderConsistencyChart(fasts) {
    const ctx = document.getElementById('consistency-chart');
    if (!ctx) return;

    if (this.charts.consistency) this.charts.consistency.destroy();

    const { start, end } = this.getDateRange();
    const weeks = [];
    let weekStart = new Date(start);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    while (weekStart <= end) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59);

      const weekFasts = fasts.filter(f => {
        const d = new Date(f.startTime);
        return d >= weekStart && d <= weekEnd;
      });

      const daysWithFasts = new Set(weekFasts.map(f => new Date(f.startTime).getDay())).size;
      const settings = Storage.getSettings();

      weeks.push({
        label: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        actual: daysWithFasts,
        goal: settings.weeklyGoal
      });

      weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() + 1);
    }

    this.charts.consistency = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: weeks.map(w => w.label),
        datasets: [
          {
            label: 'Days Fasted',
            data: weeks.map(w => w.actual),
            backgroundColor: weeks.map(w =>
              w.actual >= w.goal ? 'rgba(34, 197, 94, 0.8)' : 'rgba(251, 146, 60, 0.8)'
            ),
            borderRadius: 6,
            borderSkipped: false
          },
          {
            label: 'Weekly Goal',
            data: weeks.map(w => w.goal),
            type: 'line',
            borderColor: 'rgba(34, 211, 238, 0.6)',
            borderDash: [5, 5],
            borderWidth: 2,
            pointRadius: 0,
            fill: false
          }
        ]
      },
      options: this.getChartOptions('Days')
    });
  },

  renderDayOfWeekChart(fasts) {
    const ctx = document.getElementById('day-of-week-chart');
    if (!ctx) return;

    if (this.charts.dayOfWeek) this.charts.dayOfWeek.destroy();

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayData = new Array(7).fill(0);
    const dayCount = new Array(7).fill(0);

    fasts.forEach(f => {
      const day = new Date(f.startTime).getDay();
      dayData[day] += f.actualHours || 0;
      dayCount[day]++;
    });

    const avgData = dayData.map((total, i) => dayCount[i] > 0 ? total / dayCount[i] : 0);

    this.charts.dayOfWeek = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: days,
        datasets: [{
          label: 'Avg Hours',
          data: avgData,
          backgroundColor: 'rgba(139, 92, 246, 0.8)',
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: this.getChartOptions('Hours')
    });
  },

  renderMethodChart(fasts) {
    const ctx = document.getElementById('method-chart');
    if (!ctx) return;

    if (this.charts.method) this.charts.method.destroy();

    const methodCounts = {};
    fasts.forEach(f => {
      const method = getMethodById(f.methodId);
      if (!methodCounts[method.name]) methodCounts[method.name] = 0;
      methodCounts[method.name]++;
    });

    const colors = [
      'rgba(99, 102, 241, 0.8)',
      'rgba(34, 211, 238, 0.8)',
      'rgba(139, 92, 246, 0.8)',
      'rgba(34, 197, 94, 0.8)',
      'rgba(251, 146, 60, 0.8)',
      'rgba(244, 63, 94, 0.8)',
      'rgba(168, 85, 247, 0.8)',
      'rgba(14, 165, 233, 0.8)'
    ];

    this.charts.method = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(methodCounts),
        datasets: [{
          data: Object.values(methodCounts),
          backgroundColor: colors.slice(0, Object.keys(methodCounts).length),
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#94a3b8',
              padding: 16,
              font: { family: 'Inter', size: 12 }
            }
          }
        }
      }
    });
  },

  renderStartTimeChart(fasts) {
    const ctx = document.getElementById('start-time-chart');
    if (!ctx) return;

    if (this.charts.startTime) this.charts.startTime.destroy();

    const hourBuckets = new Array(24).fill(0);
    fasts.forEach(f => {
      const hour = new Date(f.startTime).getHours();
      hourBuckets[hour]++;
    });

    const labels = Array.from({ length: 24 }, (_, i) => {
      const h = i % 12 || 12;
      return `${h}${i < 12 ? 'a' : 'p'}`;
    });

    this.charts.startTime = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Fasts Started',
          data: hourBuckets,
          backgroundColor: 'rgba(34, 211, 238, 0.6)',
          borderRadius: 4,
          borderSkipped: false
        }]
      },
      options: this.getChartOptions('Count')
    });
  },

  renderMilestones(allFasts) {
    const container = document.getElementById('milestones-list');
    const completed = allFasts.filter(f => f.status === 'completed');
    const totalHours = allFasts.reduce((s, f) => s + (f.actualHours || 0), 0);
    const bestStreak = Storage.getBestStreak();

    const milestones = [
      { icon: '\uD83C\uDF1F', label: 'First Fast', achieved: allFasts.length >= 1 },
      { icon: '\uD83D\uDD25', label: '5 Fasts Completed', achieved: completed.length >= 5 },
      { icon: '\uD83D\uDCAA', label: '10 Fasts Completed', achieved: completed.length >= 10 },
      { icon: '\uD83C\uDFC6', label: '25 Fasts Completed', achieved: completed.length >= 25 },
      { icon: '\uD83D\uDC8E', label: '50 Fasts Completed', achieved: completed.length >= 50 },
      { icon: '\uD83D\uDE80', label: '100 Fasts Completed', achieved: completed.length >= 100 },
      { icon: '\u23F0', label: '100 Hours Fasted', achieved: totalHours >= 100 },
      { icon: '\u2B50', label: '500 Hours Fasted', achieved: totalHours >= 500 },
      { icon: '\uD83C\uDF1E', label: '1000 Hours Fasted', achieved: totalHours >= 1000 },
      { icon: '\uD83D\uDD25', label: '7-Day Streak', achieved: bestStreak >= 7 },
      { icon: '\u26A1', label: '14-Day Streak', achieved: bestStreak >= 14 },
      { icon: '\uD83C\uDFC5', label: '30-Day Streak', achieved: bestStreak >= 30 },
      { icon: '\uD83E\uDDEC', label: 'First 24h+ Fast', achieved: allFasts.some(f => (f.actualHours || 0) >= 24) },
      { icon: '\uD83E\uDDCA', label: 'First 48h+ Fast', achieved: allFasts.some(f => (f.actualHours || 0) >= 48) }
    ];

    container.innerHTML = milestones.map(m => `
      <div class="milestone ${m.achieved ? 'achieved' : 'locked'}">
        <span class="milestone-icon">${m.icon}</span>
        <span class="milestone-label">${m.label}</span>
        ${m.achieved ? '<span class="milestone-check">\u2713</span>' : '<span class="milestone-lock">\uD83D\uDD12</span>'}
      </div>
    `).join('');
  },

  getChartOptions(yLabel) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          labels: {
            color: '#94a3b8',
            font: { family: 'Inter', size: 12 }
          }
        },
        tooltip: {
          backgroundColor: '#1e293b',
          titleColor: '#f1f5f9',
          bodyColor: '#cbd5e1',
          borderColor: '#334155',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          titleFont: { family: 'Inter', size: 13 },
          bodyFont: { family: 'Inter', size: 12 }
        }
      },
      scales: {
        x: {
          ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } },
          grid: { color: 'rgba(51, 65, 85, 0.3)' }
        },
        y: {
          ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } },
          grid: { color: 'rgba(51, 65, 85, 0.3)' },
          title: {
            display: true,
            text: yLabel,
            color: '#64748b',
            font: { family: 'Inter', size: 12 }
          }
        }
      }
    };
  }
};
