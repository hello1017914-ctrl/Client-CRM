import { initAuth } from './auth.js';
import { 
    subscribeToProspects, 
    addProspect, 
    updateProspect, 
    deleteProspect, 
    bulkUpdateFollowedUp, 
    bulkDeleteProspects,
    clearAllProspects
} from './prospects.js';
import { updateDashboard } from './dashboard.js';
import { db, collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from './firebase.js';

let allProspects = [];
let currentUser = null;
let currentPage = 1;
const rowsPerPage = 20;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initAuth((user) => {
        currentUser = user;
        subscribeToProspects(user.uid, (prospects) => {
            allProspects = prospects;
            renderAll();
        });
        loadWeeklyReviews();
    });

    setupNavigation();
    setupDrawer();
    setupFilters();
    setupBulkActions();
    setupWeeklyReview();
    setupSettings();
    setupKeyboardShortcuts();
});

function renderAll() {
    updateDashboard(allProspects);
    renderProspectsTable();
    renderFollowUpQueue();
    updateUIState();
}

function updateUIState() {
    lucide.createIcons();
}

// NAVIGATION
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.getAttribute('data-page');
            switchPage(page);
        });
    });
}

function switchPage(pageId) {
    // Update active nav
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.toggle('active', nav.getAttribute('data-page') === pageId);
    });

    // Update visibility
    const pages = ['dashboard', 'prospects', 'followups', 'review', 'settings'];
    pages.forEach(p => {
        const el = document.getElementById(`page-${p}`);
        if (el) el.classList.toggle('hidden', p !== pageId);
    });

    if (pageId === 'dashboard') updateDashboard(allProspects);
    if (pageId === 'prospects') renderProspectsTable();
    if (pageId === 'followups') renderFollowUpQueue();
    
    updateUIState();
}

// DRAWER
function setupDrawer() {
    const drawer = document.getElementById('drawer');
    const overlay = document.getElementById('overlay');
    const floatingBtn = document.getElementById('floating-add-btn');
    const closeBtn = document.getElementById('close-drawer');
    const form = document.getElementById('prospect-form');

    const openDrawer = (isEdit = false) => {
        drawer.classList.add('open');
        overlay.classList.add('show');
        document.getElementById('drawer-title').textContent = isEdit ? 'Edit Prospect' : 'Add Prospect';
        if (!isEdit) {
            form.reset();
            document.getElementById('form-id').value = '';
            document.getElementById('form-date').value = new Date().toISOString().split('T')[0];
        }
    };

    const closeDrawer = () => {
        drawer.classList.remove('open');
        overlay.classList.remove('show');
    };

    floatingBtn.addEventListener('click', () => openDrawer(false));
    document.getElementById('header-add-prospect').addEventListener('click', () => openDrawer(false));
    closeBtn.addEventListener('click', closeDrawer);
    overlay.addEventListener('click', closeDrawer);

    // Form logic
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const saveAddAnother = e.submitter.id === 'save-add-another-btn';
        
        const data = {
            userId: currentUser.uid,
            name: document.getElementById('form-name').value,
            instagramHandle: document.getElementById('form-handle').value.replace('@', ''),
            platform: document.getElementById('form-platform').value,
            followerCount: Number(document.getElementById('form-followers').value) || 0,
            niche: document.getElementById('form-niche').value,
            email: document.getElementById('form-email').value,
            websiteUrl: document.getElementById('form-website').value,
            templateUsed: document.getElementById('form-template').value,
            datePitched: document.getElementById('form-date').value,
            status: document.getElementById('form-status').value.split(' ')[1] || document.getElementById('form-status').value,
            followedUp: document.getElementById('form-followed-up').checked,
            notes: document.getElementById('form-notes').value
        };

        const id = document.getElementById('form-id').value;
        try {
            if (id) {
                await updateProspect(id, data);
                showToast('Prospect updated ✓');
            } else {
                await addProspect(data);
                showToast('Prospect added ✓');
            }
            
            if (!saveAddAnother) {
                closeDrawer();
            } else {
                form.reset();
                document.getElementById('form-date').value = new Date().toISOString().split('T')[0];
            }
        } catch (err) {
            console.error(err);
            showToast('Error saving prospect', 'error');
        }
    });

    document.getElementById('save-add-another-btn').addEventListener('click', () => {
        // Trigger generic submit logic
    });

    // Handle char count
    const notesArea = document.getElementById('form-notes');
    notesArea.addEventListener('input', () => {
        document.getElementById('note-char-count').textContent = notesArea.value.length;
    });

    // Expose edit function
    window.editProspect = (id) => {
        const p = allProspects.find(x => x.id === id);
        if (!p) return;

        document.getElementById('form-id').value = p.id;
        document.getElementById('form-name').value = p.name;
        document.getElementById('form-handle').value = p.instagramHandle;
        document.getElementById('form-platform').value = p.platform;
        document.getElementById('form-followers').value = p.followerCount;
        document.getElementById('form-niche').value = p.niche;
        document.getElementById('form-email').value = p.email;
        document.getElementById('form-website').value = p.websiteUrl;
        document.getElementById('form-template').value = p.templateUsed;
        document.getElementById('form-date').value = p.datePitched;
        
        // Find option with emoji or just raw
        const statusSelect = document.getElementById('form-status');
        const options = Array.from(statusSelect.options);
        const match = options.find(o => o.value.includes(p.status));
        if (match) statusSelect.value = match.value;

        document.getElementById('form-followed-up').checked = p.followedUp;
        document.getElementById('form-notes').value = p.notes;
        document.getElementById('note-char-count').textContent = p.notes.length;

        openDrawer(true);
    };

    window.confirmDelete = async (id) => {
        if (confirm('Are you sure you want to delete this prospect?')) {
            await deleteProspect(id);
            showToast('Prospect deleted ✓');
        }
    };
}

// PROSPECTS TABLE
function renderProspectsTable() {
    const tbody = document.getElementById('prospects-table-body');
    const search = document.getElementById('prospect-search').value.toLowerCase();
    const statusFilter = document.getElementById('filter-status').value.split(' ').pop();
    const platformFilter = document.getElementById('filter-platform').value;

    let filtered = allProspects.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search) || p.instagramHandle.toLowerCase().includes(search);
        const matchesStatus = statusFilter === '' || p.status === statusFilter;
        const matchesPlatform = platformFilter === '' || p.platform === platformFilter;
        return matchesSearch && matchesStatus && matchesPlatform;
    });

    const totalPages = Math.ceil(filtered.length / rowsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * rowsPerPage;
    const paginated = filtered.slice(start, start + rowsPerPage);

    document.getElementById('current-page').textContent = `${currentPage} / ${totalPages}`;
    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = currentPage === totalPages;

    if (paginated.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-12 text-center text-brand-muted"><div class="flex flex-col items-center gap-4"><i data-lucide="users" class="w-12 h-12 opacity-20"></i><p>No prospects found.</p></div></td></tr>`;
        updateUIState();
        return;
    }

    tbody.innerHTML = paginated.map(p => {
        const isOverdue = !p.followedUp && isFollowUpOverdue(p.datePitched);
        const isPaid = p.status === 'Paid';
        const rowClass = isOverdue ? 'follow-up-overdue' : (isPaid ? 'paid-row' : '');
        
        return `
            <tr class="${rowClass} hover:bg-brand-card/50 transition-colors group">
                <td class="p-4"><input type="checkbox" class="prospect-checkbox" data-id="${p.id}"></td>
                <td class="p-4">
                    <div class="font-medium">${p.name}</div>
                    <div class="text-xs text-brand-muted md:hidden">@${p.instagramHandle}</div>
                </td>
                <td class="p-4 hidden md:table-cell text-brand-muted">@${p.instagramHandle}</td>
                <td class="p-4 hidden lg:table-cell">${p.platform}</td>
                <td class="p-4 hidden lg:table-cell text-xs font-mono">${p.niche || '-'}</td>
                <td class="p-4">
                    <span class="status-badge status-${p.status.toLowerCase().split(' ')[0]}">
                        ${getStatusEmoji(p.status)} ${p.status}
                    </span>
                </td>
                <td class="p-4 text-center">
                    <input type="checkbox" ${p.followedUp ? 'checked' : ''} onchange="toggleFollowedUp('${p.id}', this.checked)" class="w-4 h-4 accent-green-500 cursor-pointer">
                </td>
                <td class="p-4 text-right">
                    <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="editProspect('${p.id}')" class="p-1.5 hover:text-brand-accent transition-colors"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                        <button onclick="confirmDelete('${p.id}')" class="p-1.5 hover:text-red-400 transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    updateUIState();
}

window.toggleFollowedUp = async (id, val) => {
    await updateProspect(id, { followedUp: val });
    showToast(val ? 'Marked as followed up ✓' : 'Marked as pending follow up');
};

function setupFilters() {
    ['prospect-search', 'filter-status', 'filter-platform'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            currentPage = 1;
            renderProspectsTable();
        });
    });

    document.getElementById('prev-page').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderProspectsTable();
        }
    });
    document.getElementById('next-page').addEventListener('click', () => {
        const total = Math.ceil(allProspects.length / rowsPerPage);
        if (currentPage < total) {
            currentPage++;
            renderProspectsTable();
        }
    });

    document.getElementById('select-all-prospects').addEventListener('change', (e) => {
        const checked = e.target.checked;
        document.querySelectorAll('.prospect-checkbox').forEach(cb => {
            cb.checked = checked;
        });
        updateBulkButtonVisibility();
    });
}

function setupBulkActions() {
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('prospect-checkbox')) {
            updateBulkButtonVisibility();
        }
    });

    document.getElementById('bulk-delete-btn').addEventListener('click', async () => {
        const selected = Array.from(document.querySelectorAll('.prospect-checkbox:checked')).map(cb => cb.getAttribute('data-id'));
        if (selected.length && confirm(`Delete ${selected.length} prospects?`)) {
            await bulkDeleteProspects(selected);
            showToast(`${selected.length} prospects deleted ✓`);
        }
    });

    document.getElementById('bulk-followup-btn').addEventListener('click', async () => {
        const selected = Array.from(document.querySelectorAll('.prospect-checkbox:checked')).map(cb => cb.getAttribute('data-id'));
        if (selected.length) {
            await bulkUpdateFollowedUp(selected, true);
            showToast(`${selected.length} marked as followed up ✓`);
        }
    });
}

function updateBulkButtonVisibility() {
    const selectedCount = document.querySelectorAll('.prospect-checkbox:checked').length;
    const container = document.querySelector('header div.flex.gap-2');
    document.getElementById('bulk-followup-btn').classList.toggle('hidden', selectedCount === 0);
    document.getElementById('bulk-delete-btn').classList.toggle('hidden', selectedCount === 0);
}

// FOLLOW UPS
function renderFollowUpQueue() {
    const list = document.getElementById('followup-list');
    const queue = allProspects.filter(p => {
        if (p.followedUp) return false;
        if (p.status === 'Paid' || p.status === 'Dead') return false;
        return true;
    }).sort((a, b) => new Date(a.datePitched) - new Date(b.datePitched));

    document.getElementById('followup-heading').textContent = queue.length === 0 
        ? 'You are all caught up! No follow ups due.' 
        : `${queue.length} people need a follow up today`;

    if (queue.length === 0) {
        list.innerHTML = `<div class="md:col-span-2 flex flex-col items-center justify-center p-20 text-brand-muted border-2 border-dashed border-brand-border rounded-3xl">
            <i data-lucide="check-circle" class="w-12 h-12 mb-4 text-brand-accent opacity-50"></i>
            <p>Inbox zero for outreach. Work on more pitches!</p>
        </div>`;
        updateUIState();
        return;
    }

    list.innerHTML = queue.map(p => {
        const days = Math.floor((new Date() - new Date(p.datePitched)) / (1000 * 60 * 60 * 24));
        const overdue = days > 3;
        
        return `
            <div class="bg-brand-sidebar p-6 rounded-2xl border border-brand-border space-y-4 relative ${overdue ? 'border-red-500/30' : ''}">
                ${overdue ? '<span class="absolute top-4 right-4 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Overdue</span>' : ''}
                <div>
                    <h4 class="text-lg font-bold">${p.name}</h4>
                    <p class="text-brand-muted text-xs">@${p.instagramHandle} • ${p.platform}</p>
                </div>
                
                <div class="flex items-center gap-4 text-sm">
                    <div>
                        <p class="text-[10px] text-brand-muted uppercase font-bold tracking-tight">Last Contact</p>
                        <p class="${overdue ? 'text-red-400 font-bold' : ''}">${days} days ago</p>
                    </div>
                    <div>
                        <p class-[10px] text-brand-muted uppercase font-bold tracking-tight">Status</p>
                        <p>${p.status}</p>
                    </div>
                </div>

                <div class="bg-brand-bg p-3 rounded-xl border border-brand-border h-24 overflow-y-auto text-xs text-brand-muted">
                    ${p.notes || 'No notes added.'}
                </div>

                <div class="space-y-4">
                    <textarea id="log-${p.id}" placeholder="Log what you said in this follow up..." class="w-full bg-brand-bg border border-brand-border rounded-lg p-3 text-xs focus:outline-none focus:border-brand-accent h-16"></textarea>
                    
                    <div class="flex gap-2">
                        <button onclick="handleFollowUpAction('${p.id}', true)" class="flex-1 py-2.5 bg-brand-accent text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                            <i data-lucide="check" class="w-4 h-4"></i> Mark Followed Up
                        </button>
                        <button onclick="handleFollowUpAction('${p.id}', false)" class="px-4 py-2.5 bg-red-900/20 text-red-400 border border-red-500/20 rounded-xl text-sm font-bold">
                            Mark Dead
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    updateUIState();
}

window.handleFollowUpAction = async (id, isFollowedUp) => {
    const log = document.getElementById(`log-${id}`).value;
    const p = allProspects.find(x => x.id === id);
    const newNotes = log ? `${p.notes}\n\n[Follow Up ${new Date().toLocaleDateString()}]: ${log}` : p.notes;

    if (isFollowedUp) {
        await updateProspect(id, { followedUp: true, notes: newNotes });
        showToast('Marked as followed up ✓');
    } else {
        await updateProspect(id, { status: 'Dead', notes: newNotes });
        showToast('Prospect marked as Dead');
    }
};

// WEEKLY REVIEW
async function loadWeeklyReviews() {
    const q = query(collection(db, 'weeklyReviews'), where('userId', '==', currentUser.uid), orderBy('weekStartDate', 'desc'));
    const snap = await getDocs(q);
    const reviews = [];
    snap.forEach(doc => reviews.push({ id: doc.id, ...doc.data() }));
    renderReviewHistory(reviews);
}

function setupWeeklyReview() {
    const btn = document.getElementById('save-review-btn');
    btn.addEventListener('click', async () => {
        const data = {
            userId: currentUser.uid,
            weekStartDate: getMonday(new Date()).toISOString().split('T')[0],
            dmsSent: Number(document.getElementById('rev-dms').value) || 0,
            repliesReceived: Number(document.getElementById('rev-replies').value) || 0,
            samplesSent: Number(document.getElementById('rev-samples').value) || 0,
            clientsConverted: Number(document.getElementById('rev-clients').value) || 0,
            revenue: Number(document.getElementById('rev-revenue').value) || 0,
            whatWorked: document.getElementById('rev-worked').value,
            whatDidnt: document.getElementById('rev-didnt').value,
            nextWeekTarget: Number(document.getElementById('rev-target').value) || 0,
            createdAt: serverTimestamp()
        };

        try {
            await addDoc(collection(db, 'weeklyReviews'), data);
            showToast('Review saved ✓');
            loadWeeklyReviews();
        } catch (err) {
            showToast('Error saving review', 'error');
        }
    });
}

function renderReviewHistory(reviews) {
    const container = document.getElementById('review-history');
    if (reviews.length === 0) {
        container.innerHTML = '<p class="text-brand-muted text-center py-8">No previous reviews logged.</p>';
        return;
    }

    container.innerHTML = reviews.map(r => `
        <div class="bg-brand-sidebar p-6 rounded-2xl border border-brand-border space-y-4">
            <div class="flex justify-between items-center">
                <h4 class="font-bold">Week of ${r.weekStartDate}</h4>
                <span class="text-brand-accent font-bold">$${r.revenue || 0} Revenue</span>
            </div>
            <div class="grid grid-cols-4 gap-2 text-center">
                <div class="bg-brand-bg p-2 rounded-lg"><p class="text-xs text-brand-muted">DMs</p><p class="font-bold">${r.dmsSent}</p></div>
                <div class="bg-brand-bg p-2 rounded-lg"><p class="text-xs text-brand-muted">Replies</p><p class="font-bold">${r.repliesReceived}</p></div>
                <div class="bg-brand-bg p-2 rounded-lg"><p class="text-xs text-brand-muted">Samples</p><p class="font-bold">${r.samplesSent}</p></div>
                <div class="bg-brand-bg p-2 rounded-lg"><p class="text-xs text-brand-muted">Clients</p><p class="font-bold">${r.clientsConverted}</p></div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><p class="text-xs font-bold text-brand-accent mb-1 uppercase">Worked</p><p class="text-brand-muted italic">"${r.whatWorked || '-'}"</p></div>
                <div><p class="text-xs font-bold text-red-400 mb-1 uppercase">Next Target</p><p>${r.nextWeekTarget} DMs</p></div>
            </div>
        </div>
    `).join('');
}

function getMonday(d) {
    d = new Date(d);
    var day = d.getDay(),
        diff = d.getDate() - day + (day == 0 ? -6 : 1); 
    return new Date(d.setDate(diff));
}

// SETTINGS
async function setupSettings() {
    const saveBtn = document.getElementById('save-settings-btn');
    const clearBtn = document.getElementById('clear-all-btn');
    const exportBtn = document.getElementById('export-csv-btn');
    const importTrigger = document.getElementById('import-csv-trigger');
    const importInput = document.getElementById('import-csv-input');

    saveBtn.addEventListener('click', async () => {
        const window = Number(document.getElementById('setting-followup-window').value);
        localStorage.setItem('followup_window', window);
        showToast('Preferences saved ✓');
    });

    clearBtn.addEventListener('click', async () => {
        if (confirm('DANGER: This will delete ALL your prospects. This cannot be undone. Proceed?')) {
            await clearAllProspects(currentUser.uid, allProspects);
            showToast('All data cleared');
        }
    });

    exportBtn.addEventListener('click', exportToCSV);
    
    importTrigger.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleCSVImport(file);
    });
}

function exportToCSV() {
    if (allProspects.length === 0) return showToast('No data to export', 'error');
    
    const headers = ['Name', 'Instagram Handle', 'Platform', 'Niche', 'Status', 'Date Pitched', 'Followed Up', 'Notes'];
    const rows = allProspects.map(p => [
        p.name, p.instagramHandle, p.platform, p.niche, p.status, p.datePitched, p.followedUp, p.notes
    ]);

    let csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `copyquill_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Export successful ✓');
}

async function handleCSVImport(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
        const text = e.target.result;
        const lines = text.split('\n');
        const headers = lines[0].split(',');
        
        let count = 0;
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const values = lines[i].split(',');
            const data = {
                userId: currentUser.uid,
                name: values[0],
                instagramHandle: values[1],
                platform: values[2],
                niche: values[3],
                status: values[4],
                datePitched: values[5],
                followedUp: values[6] === 'true',
                notes: values[7] || ''
            };
            await addProspect(data);
            count++;
        }
        showToast(`Imported ${count} prospects ✓`);
    };
    reader.readAsText(file);
}

// HELPERS
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `p-4 px-6 rounded-2xl custom-shadow text-white text-sm font-medium transition-all transform translate-y-10 opacity-0 ${type === 'success' ? 'bg-brand-accent' : 'bg-red-500'}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
    }, 10);

    setTimeout(() => {
        toast.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function getStatusEmoji(status) {
    switch(status) {
        case 'Cold': return '🔵';
        case 'Replied': return '🟡';
        case 'Sample Sent': return '🟠';
        case 'Call Booked': return '🟣';
        case 'Paid': return '🟢';
        case 'Dead': return '🔴';
        default: return '⚪';
    }
}

function isFollowUpOverdue(dateStr) {
    const pitchDate = new Date(dateStr);
    const diffDays = Math.floor((new Date() - pitchDate) / (1000 * 60 * 60 * 24));
    const window = Number(localStorage.getItem('followup_window')) || 3;
    return diffDays > window;
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (e.key.toLowerCase() === 'n') {
            e.preventDefault();
            document.getElementById('floating-add-btn').click();
        }
        if (e.key.toLowerCase() === 'f') {
            e.preventDefault();
            switchPage('followups');
        }
        if (e.key === '/') {
            e.preventDefault();
            switchPage('prospects');
            setTimeout(() => document.getElementById('prospect-search').focus(), 100);
        }
    });
}
