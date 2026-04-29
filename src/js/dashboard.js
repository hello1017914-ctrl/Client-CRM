let weeklyChart = null;
let statusChart = null;

export function updateDashboard(prospects) {
    const totalPitched = prospects.length;
    const replied = prospects.filter(p => ['Replied', 'Sample Sent', 'Call Booked', 'Paid'].includes(p.status)).length;
    
    const today = new Date();
    const awaitingFollowUp = prospects.filter(p => {
        if (p.followedUp) return false;
        const pitchDate = new Date(p.datePitched);
        const diffDays = (today - pitchDate) / (1000 * 60 * 60 * 24);
        return diffDays > 3;
    }).length;

    const converted = prospects.filter(p => p.status === 'Paid').length;

    // Update numbers
    document.getElementById('stat-total-pitched').textContent = totalPitched;
    document.getElementById('stat-replied').textContent = replied;
    document.getElementById('stat-awaiting').textContent = awaitingFollowUp;
    document.getElementById('stat-converted').textContent = converted;

    // Update Follow up badge in nav
    const badge = document.getElementById('followup-count-badge');
    if (awaitingFollowUp > 0) {
        badge.textContent = awaitingFollowUp;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }

    // Reply Rate
    const rate = totalPitched > 0 ? Math.round((replied / totalPitched) * 100) : 0;
    document.getElementById('reply-rate-percent').textContent = `${rate}%`;
    const circle = document.getElementById('reply-rate-circle');
    const offset = 364.4 - (364.4 * rate) / 100;
    circle.style.strokeDashoffset = offset;

    renderWeeklyChart(prospects);
    renderStatusChart(prospects);
    renderRecentActivity(prospects);
}

function renderWeeklyChart(prospects) {
    const ctx = document.getElementById('weeklyChart').getContext('2d');
    
    // Last 7 days counting
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        last7Days.push({
            label: days[d.getDay()],
            dateStr: d.toISOString().split('T')[0],
            count: 0
        });
    }

    last7Days.forEach(day => {
        day.count = prospects.filter(p => p.datePitched === day.dateStr).length;
    });

    if (weeklyChart) weeklyChart.destroy();
    
    weeklyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: last7Days.map(d => d.label),
            datasets: [{
                label: 'Pitched',
                data: last7Days.map(d => d.count),
                backgroundColor: '#1d9e75',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#1a4a38' }, ticks: { color: '#5dcaa5' } },
                x: { grid: { display: false }, ticks: { color: '#5dcaa5' } }
            }
        }
    });
}

function renderStatusChart(prospects) {
    const ctx = document.getElementById('statusChart').getContext('2d');
    const statuses = ['Cold', 'Replied', 'Sample Sent', 'Call Booked', 'Paid', 'Dead'];
    const colors = ['#1e3a8a', '#854d0e', '#9a3412', '#581c87', '#166534', '#991b1b'];
    
    const counts = statuses.map(s => prospects.filter(p => p.status === s).length);

    if (statusChart) statusChart.destroy();

    statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: statuses,
            datasets: [{
                data: counts,
                backgroundColor: colors,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#ffffff', padding: 20, usePointStyle: true }
                }
            },
            cutout: '70%'
        }
    });
}

function renderRecentActivity(prospects) {
    const list = document.getElementById('recent-activity-list');
    const recent = [...prospects]
        .sort((a, b) => {
            const dateA = new Date(a.updatedAt).getTime() || 0;
            const dateB = new Date(b.updatedAt).getTime() || 0;
            return dateB - dateA;
        })
        .slice(0, 5);

    if (recent.length === 0) {
        list.innerHTML = '<p class="text-center py-8 text-brand-muted">No activity yet.</p>';
        return;
    }

    list.innerHTML = recent.map(p => `
        <div class="flex items-center justify-between p-3 rounded-xl hover:bg-brand-bg transition-colors">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-brand-accent/20 text-brand-accent flex items-center justify-center font-bold text-xs">
                    ${p.name.charAt(0)}
                </div>
                <div>
                    <p class="text-sm font-medium">${p.name}</p>
                    <p class="text-xs text-brand-muted">${p.platform} • ${p.status}</p>
                </div>
            </div>
            <p class="text-[10px] text-brand-muted">${formatDate(p.datePitched)}</p>
        </div>
    `).join('');
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
}
