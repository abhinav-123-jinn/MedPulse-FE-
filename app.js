/* ============================================================
   MedPulse — Application Logic
   Medicine Reminder System with Notifications & Stock Alerts
   ============================================================ */

// ─────────────────────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────────────────────
let meds     = JSON.parse(localStorage.getItem('mp_meds'))    || sampleMeds();
let logs     = JSON.parse(localStorage.getItem('mp_logs'))    || [];
let settings = JSON.parse(localStorage.getItem('mp_settings'))|| { push: true, sound: true };
let profile  = JSON.parse(localStorage.getItem('mp_profile')) || { name: 'Sarah Jenkins', since: 'June 2023', streak: 14 };
let activeNotifMedId = null;   // current in-app notif med

function sampleMeds() {
    return [
        {
            id: 'med-001', name: 'Vitamin D3', type: 'Pills',
            dosage: '1000', unit: 'IU', dosageStr: '1000 IU',
            freq: 'Daily', times: ['08:00'],
            stock: 60, maxStock: 60, lowStockAt: 10,
            refill: true, notes: 'Take with breakfast',
            icon: 'ph-sun', colorClass: 'mi-sun',
            addedAt: new Date().toISOString()
        },
        {
            id: 'med-002', name: 'Metformin', type: 'Pills',
            dosage: '500', unit: 'mg', dosageStr: '500mg',
            freq: 'Daily', times: ['13:00'],
            stock: 4, maxStock: 30, lowStockAt: 5,
            refill: true, notes: 'After lunch',
            icon: 'ph-pill', colorClass: 'mi-green',
            addedAt: new Date().toISOString()
        },
        {
            id: 'med-003', name: 'Amoxicillin', type: 'Pills',
            dosage: '250', unit: 'mg', dosageStr: '250mg',
            freq: 'Daily', times: ['09:00', '21:00'],
            stock: 20, maxStock: 20, lowStockAt: 5,
            refill: false, notes: '',
            icon: 'ph-pill', colorClass: 'mi-rose',
            addedAt: new Date().toISOString()
        }
    ];
}

function save() {
    localStorage.setItem('mp_meds',     JSON.stringify(meds));
    localStorage.setItem('mp_logs',     JSON.stringify(logs));
    localStorage.setItem('mp_settings', JSON.stringify(settings));
    localStorage.setItem('mp_profile',  JSON.stringify(profile));
}

// ─────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────
const todayStr = () => new Date().toDateString();

function fmtTime(t) {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hh = h % 12 || 12;
    return `${hh}:${String(m).padStart(2,'0')} ${ampm}`;
}

function nowHHMM() {
    const n = new Date();
    return `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
}

function getLogFor(medId, time) {
    return logs.find(l => l.medId === medId && l.time === time && l.date === todayStr());
}

function iconColors(type) {
    switch (type) {
        case 'Pills':      return { icon: 'ph-pill',      cls: 'mi-green' };
        case 'Syrup':      return { icon: 'ph-drop',      cls: 'mi-blue' };
        case 'Injections': return { icon: 'ph-syringe',   cls: 'mi-rose' };
        default:           return { icon: 'ph-first-aid', cls: 'mi-purple' };
    }
}

// ─────────────────────────────────────────────────────────────
//  SPLASH
// ─────────────────────────────────────────────────────────────
window.addEventListener('load', () => {
    setTimeout(() => {
        document.getElementById('splash-screen').classList.add('hiding');
        setTimeout(() => {
            document.getElementById('splash-screen').style.display = 'none';
            document.getElementById('app').classList.remove('hidden');
            initApp();
        }, 500);
    }, 1800);
});

// ─────────────────────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────────────────────
function initApp() {
    setupNav();
    setupModal();
    setupProfile();
    requestNotifPermission();
    renderDashboard();
    startReminderLoop();
    updateNotifBadge();
}

// ─────────────────────────────────────────────────────────────
//  NAVIGATION
// ─────────────────────────────────────────────────────────────
function setupNav() {
    document.querySelectorAll('.bn-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.view;
            document.querySelectorAll('.bn-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.getElementById(target).classList.add('active');

            if (target === 'view-dashboard') renderDashboard();
            if (target === 'view-library')   renderLibrary();
            if (target === 'view-history')   renderHistory();
            if (target === 'view-profile')   renderProfile();
        });
    });

    // Go to profile from avatar
    document.getElementById('btn-go-profile').addEventListener('click', () => {
        navTo('view-profile');
    });

    document.getElementById('btn-profile-back').addEventListener('click', () => {
        navTo('view-dashboard');
    });

    document.getElementById('btn-see-all').addEventListener('click', () => {
        navTo('view-history');
    });
}

function navTo(viewId) {
    document.querySelectorAll('.bn-item').forEach(b => {
        b.classList.toggle('active', b.dataset.view === viewId);
    });
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');

    if (viewId === 'view-dashboard') renderDashboard();
    if (viewId === 'view-library')   renderLibrary();
    if (viewId === 'view-history')   renderHistory();
    if (viewId === 'view-profile')   renderProfile();
}

// ─────────────────────────────────────────────────────────────
//  RENDER: DASHBOARD
// ─────────────────────────────────────────────────────────────
function renderDashboard() {
    // Greeting
    document.getElementById('dash-hello').textContent = `Hello, ${profile.name.split(' ')[0]} 👋`;

    // Calendar
    const cal = document.getElementById('h-calendar');
    cal.innerHTML = '';
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    for (let i = -2; i <= 5; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const card = document.createElement('div');
        card.className = `day-card${i === 0 ? ' active' : ''}`;
        card.innerHTML = `<span class="day-name">${days[d.getDay()]}</span><span class="day-num">${d.getDate()}</span>`;
        cal.appendChild(card);
    }

    // Schedule
    const list = document.getElementById('dash-schedule-list');
    list.innerHTML = '';

    let taken = 0, left = 0, missed = 0;
    const allDoses = [];

    meds.forEach(med => {
        med.times.forEach(t => {
            const log = getLogFor(med.id, t);
            allDoses.push({ med, time: t, log });
        });
    });

    // Sort by time
    allDoses.sort((a,b) => a.time.localeCompare(b.time));

    allDoses.forEach(({ med, time, log }) => {
        let status = 'upcoming', badge = 'UPCOMING';
        const now = nowHHMM();

        if (log && log.status === 'taken')   { status = 'taken';   badge = 'TAKEN';   taken++;  }
        else if (log && log.status === 'snoozed') { status = 'snoozed'; badge = 'SNOOZED'; left++;  }
        else if (time < now)                 { status = 'missed';  badge = 'MISSED';  missed++; }
        else                                 { status = 'upcoming'; badge = 'UPCOMING'; left++; }

        const badgeCls = status === 'taken' ? 'sb-taken' : status === 'missed' ? 'sb-missed' : status === 'snoozed' ? 'sb-snoozed' : 'sb-upcoming';
        const checkDone = status === 'taken' ? 'done' : '';

        const el = document.createElement('div');
        el.className = 'med-card';
        el.innerHTML = `
            <div class="med-icon ${med.colorClass}">
                <i class="ph-fill ${med.icon}"></i>
            </div>
            <div class="med-info">
                <h4>${med.name}</h4>
                <p>${med.dosageStr}</p>
                <div class="time-row"><i class="ph ph-clock"></i> ${fmtTime(time)}</div>
            </div>
            <div class="med-status">
                <span class="status-badge ${badgeCls}">${badge}</span>
                <button class="check-btn ${checkDone}" data-med="${med.id}" data-time="${time}" title="Mark as taken">
                    <i class="ph-bold ph-check"></i>
                </button>
            </div>`;
        el.querySelector('h4').addEventListener('click', () => openDetail(med.id));
        el.querySelector('.check-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            markTaken(med.id, time);
        });
        list.appendChild(el);
    });

    if (allDoses.length === 0) {
        list.innerHTML = `<div class="empty-state">
            <i class="ph ph-pill"></i>
            <h3>No medications scheduled</h3>
            <p>Tap + to add your first medication</p>
        </div>`;
    }

    // Stats
    document.getElementById('dash-meds-left').textContent = left;
    document.getElementById('stat-taken').textContent  = taken;
    document.getElementById('stat-missed').textContent = missed;
    document.getElementById('stat-left').textContent   = left;

    const total = allDoses.length;
    const pct = total > 0 ? Math.round((taken / total) * 100) : 0;
    document.getElementById('adh-pct').textContent = `${pct}%`;
    document.getElementById('adh-bar').style.width = `${pct}%`;
    document.getElementById('adherence-msg').textContent =
        pct >= 80 ? "You're doing great! 🎉" : pct >= 50 ? "Keep it up!" : "Don't give up!";
}

// ─────────────────────────────────────────────────────────────
//  RENDER: LIBRARY
// ─────────────────────────────────────────────────────────────
function renderLibrary(filter = 'All', searchStr = '') {
    const list = document.getElementById('lib-med-list');
    list.innerHTML = '';

    // Low stock banner
    const lowStockMeds = meds.filter(m => m.stock <= m.lowStockAt && m.refill);
    const banner = document.getElementById('refill-banner');
    if (lowStockMeds.length > 0) {
        banner.style.display = 'flex';
        document.getElementById('refill-banner-msg').textContent =
            `${lowStockMeds.length} medication${lowStockMeds.length > 1 ? 's' : ''} running low. Consider visiting the pharmacy soon.`;
    } else {
        banner.style.display = 'none';
    }

    let filtered = meds.filter(m => {
        if (filter !== 'All' && m.type !== filter) return false;
        if (searchStr && !m.name.toLowerCase().includes(searchStr.toLowerCase())) return false;
        return true;
    });

    if (filtered.length === 0) {
        list.innerHTML = `<div class="empty-state">
            <i class="ph ph-magnifying-glass"></i>
            <h3>No medications found</h3>
            <p>Try a different category or add a new medication.</p>
        </div>`;
        return;
    }

    filtered.forEach(med => {
        const isLow = med.stock <= med.lowStockAt;
        const stockCls = isLow ? 'stock-low' : '';
        const el = document.createElement('div');
        el.className = 'med-card';
        el.innerHTML = `
            <div class="med-icon ${med.colorClass}">
                <i class="ph-fill ${med.icon}"></i>
            </div>
            <div class="med-info">
                <h4>${med.name}</h4>
                <p>${med.dosageStr} · ${med.type}</p>
                <div class="time-row"><i class="ph ph-clock"></i> Once ${med.freq.toLowerCase()}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
                <span class="stock-badge ${stockCls}">${med.stock} left</span>
                <i class="ph ph-caret-right" style="color:var(--text-lt);font-size:1rem"></i>
            </div>`;
        el.addEventListener('click', () => openDetail(med.id));
        list.appendChild(el);
    });
}

// ─────────────────────────────────────────────────────────────
//  RENDER: HISTORY
// ─────────────────────────────────────────────────────────────
function renderHistory(filter = 'all') {
    const list = document.getElementById('history-log-list');
    list.innerHTML = '';

    // Weekly bars
    const chart = document.getElementById('weekly-bar-chart');
    const daysRow = document.getElementById('chart-days');
    chart.innerHTML = ''; daysRow.innerHTML = '';
    const dayNames = ['M','T','W','T','F','S','S'];
    let weeklyTaken = 0, weeklyTotal = 0;

    for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const ds = d.toDateString();
        const dayLogs = logs.filter(l => l.date === ds);
        const takenCount = dayLogs.filter(l => l.status === 'taken').length;
        const totalCount = meds.reduce((s, m) => s + m.times.length, 0);
        const h = totalCount > 0 ? Math.max(6, Math.round((takenCount / totalCount) * 70)) : 6;
        weeklyTaken += takenCount;
        weeklyTotal += totalCount;

        const col = document.createElement('div');
        col.className = `bar-col${i === 0 ? ' today' : ''}`;
        col.style.height = `${h}px`;
        chart.appendChild(col);

        const label = document.createElement('span');
        label.textContent = dayNames[6 - i];
        daysRow.appendChild(label);
    }
    const wPct = weeklyTotal > 0 ? Math.round((weeklyTaken / weeklyTotal) * 100) : 0;
    document.getElementById('weekly-pct-tag').textContent = `${wPct}% Completed`;

    // Logs
    let filtered = filter === 'all' ? logs : logs.filter(l => l.status === filter);
    filtered = [...filtered].sort((a,b) => new Date(b.date) - new Date(a.date));

    if (filtered.length === 0) {
        list.innerHTML = `<div class="empty-state">
            <i class="ph ph-clock-counter-clockwise"></i>
            <h3>No history yet</h3>
            <p>Start taking your medications to see logs here.</p>
        </div>`;
        return;
    }

    const grouped = {};
    filtered.forEach(l => {
        if (!grouped[l.date]) grouped[l.date] = [];
        grouped[l.date].push(l);
    });

    Object.keys(grouped).forEach(date => {
        const d = new Date(date);
        const isToday = d.toDateString() === new Date().toDateString();
        const label = isToday ? `Today · ${d.toLocaleDateString('en-US', {month:'short', day:'numeric'})}` : d.toLocaleDateString('en-US', {weekday:'short', month:'short', day:'numeric'});

        const header = document.createElement('div');
        header.className = 'history-date-header';
        header.textContent = label;
        list.appendChild(header);

        grouped[date].forEach(log => {
            const med = meds.find(m => m.id === log.medId) || { name: 'Unknown', dosageStr: '', colorClass: 'mi-green', icon: 'ph-pill' };
            const badgeCls = log.status === 'taken' ? 'sb-taken' : log.status === 'missed' ? 'sb-missed' : 'sb-snoozed';
            const el = document.createElement('div');
            el.className = 'med-card';
            el.innerHTML = `
                <div class="med-icon ${med.colorClass}"><i class="ph-fill ${med.icon}"></i></div>
                <div class="med-info">
                    <h4>${med.name}</h4>
                    <p>${fmtTime(log.time)} · ${med.dosageStr}</p>
                </div>
                <div class="med-status">
                    <span class="status-badge ${badgeCls}">${log.status.toUpperCase()}</span>
                </div>`;
            list.appendChild(el);
        });
    });
}

// ─────────────────────────────────────────────────────────────
//  RENDER: PROFILE
// ─────────────────────────────────────────────────────────────
function renderProfile() {
    document.getElementById('profile-name').textContent = profile.name;
    document.getElementById('profile-since').textContent = `Member since ${profile.since}`;
    document.getElementById('ps-active-meds').textContent = meds.length;
    document.getElementById('ps-streak').textContent = profile.streak;

    // Adherence overall
    const takenAll = logs.filter(l => l.status === 'taken').length;
    const totalAll = logs.length;
    const adhPct = totalAll > 0 ? Math.round((takenAll / totalAll) * 100) : 98;
    document.getElementById('ps-adherence').textContent = `${adhPct}%`;

    // Toggle states
    document.getElementById('toggle-push').checked  = settings.push;
    document.getElementById('toggle-sound').checked = settings.sound;
}

// ─────────────────────────────────────────────────────────────
//  MARK TAKEN
// ─────────────────────────────────────────────────────────────
function markTaken(medId, time) {
    const med = meds.find(m => m.id === medId);
    if (!med) return;

    // Decrement stock
    if (med.stock > 0) med.stock--;

    // Log it
    const existing = logs.findIndex(l => l.medId === medId && l.time === time && l.date === todayStr());
    const entry = { medId, time, date: todayStr(), status: 'taken', ts: Date.now() };
    if (existing >= 0) logs[existing] = entry;
    else logs.push(entry);

    save();

    // Update streak
    profile.streak = (profile.streak || 0) + 1;
    save();

    // Check stock after taking
    if (med.refill && med.stock <= med.lowStockAt) {
        showStockAlert(med);
    }

    renderDashboard();
    showToast(`✓ ${med.name} marked as taken`);

    // Hide in-app notif if this was the one being shown
    if (activeNotifMedId === medId) hideInAppNotif();
}

// ─────────────────────────────────────────────────────────────
//  MODAL — ADD MEDICATION
// ─────────────────────────────────────────────────────────────
let extraTimes = [];
let editMode   = null;   // null = add, medId = edit

function setupModal() {
    const modal   = document.getElementById('modal-add-med');
    const overlay = modal;

    document.getElementById('btn-fab').addEventListener('click', () => openModal());
    document.getElementById('btn-close-modal').addEventListener('click', () => closeModal());

    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    // Pill type selectors
    document.querySelectorAll('#f-type-pills .pill-sel').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#f-type-pills .pill-sel').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    document.querySelectorAll('#f-freq-pills .pill-sel').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#f-freq-pills .pill-sel').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Add extra time
    document.getElementById('btn-add-time').addEventListener('click', addExtraTimeField);
    document.getElementById('btn-add-time-icon').addEventListener('click', addExtraTimeField);

    // Refill threshold label
    document.getElementById('f-low-stock').addEventListener('input', updateRefillLabel);
    document.getElementById('f-refill').addEventListener('change', updateRefillLabel);

    // Save
    document.getElementById('btn-save-med').addEventListener('click', saveMed);

    // Library search
    document.getElementById('btn-search-lib').addEventListener('click', () => {
        const wrap = document.getElementById('search-bar-wrap');
        wrap.style.display = wrap.style.display === 'none' ? 'flex' : 'none';
        if (wrap.style.display === 'flex') document.getElementById('lib-search').focus();
    });

    document.getElementById('lib-search').addEventListener('input', (e) => {
        const activeCat = document.querySelector('#lib-tabs .tab-btn.active')?.dataset.cat || 'All';
        renderLibrary(activeCat, e.target.value);
    });

    // Lib tabs
    document.querySelectorAll('#lib-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#lib-tabs .tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderLibrary(btn.dataset.cat, document.getElementById('lib-search').value);
        });
    });

    // Sort
    let sortAsc = true;
    document.getElementById('btn-sort-lib').addEventListener('click', () => {
        sortAsc = !sortAsc;
        meds.sort((a,b) => sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
        document.getElementById('btn-sort-lib').textContent = sortAsc ? 'Sort by Name ↑' : 'Sort by Name ↓';
        renderLibrary(document.querySelector('#lib-tabs .tab-btn.active')?.dataset.cat || 'All');
    });

    // Low stock banner btn
    document.getElementById('btn-view-low-stock').addEventListener('click', () => {
        navTo('view-library');
        const lowBtn = document.querySelector('#lib-tabs .tab-btn[data-cat="All"]');
        renderLibrary('All', '');
        // Scroll to first low stock med
        setTimeout(() => {
            const lowCard = document.querySelector('.stock-low');
            if (lowCard) lowCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    });

    // History tabs
    document.querySelectorAll('#hist-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#hist-tabs .tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderHistory(btn.dataset.filter);
        });
    });

    // Profile settings
    document.getElementById('toggle-push').addEventListener('change', (e) => {
        settings.push = e.target.checked;
        save();
        if (settings.push) requestNotifPermission();
        showToast(settings.push ? '🔔 Push notifications enabled' : '🔕 Push notifications disabled');
    });
    document.getElementById('toggle-sound').addEventListener('change', (e) => {
        settings.sound = e.target.checked;
        save();
        showToast(settings.sound ? '🔊 Sound alerts enabled' : '🔇 Sound alerts disabled');
    });

    document.getElementById('btn-test-notif').addEventListener('click', () => {
        const med = meds[0] || { id:'test',name:'Vitamin D3',dosageStr:'1000 IU',freq:'Daily',icon:'ph-sun',colorClass:'mi-sun' };
        showInAppNotif(med, med.times?.[0] || '08:00');
        tryBrowserNotif(med.name, `${med.dosageStr} — Time to take your medicine!`);
    });

    document.getElementById('btn-request-perm').addEventListener('click', () => {
        requestNotifPermission(true);
    });

    document.getElementById('btn-clear-data').addEventListener('click', () => {
        if (confirm('Clear ALL MedPulse data? This cannot be undone.')) {
            localStorage.clear();
            location.reload();
        }
    });

    // Detail modal
    document.getElementById('btn-close-detail').addEventListener('click', () => {
        document.getElementById('modal-med-detail').classList.remove('open');
    });

    document.getElementById('btn-delete-med').addEventListener('click', () => {
        const medId = document.getElementById('btn-delete-med').dataset.medId;
        if (confirm('Delete this medication?')) {
            meds = meds.filter(m => m.id !== medId);
            save();
            document.getElementById('modal-med-detail').classList.remove('open');
            renderDashboard();
            renderLibrary();
            showToast('Medication deleted');
        }
    });
}

function openModal(medId = null) {
    editMode = medId;
    extraTimes = [];

    const modal = document.getElementById('modal-add-med');
    document.getElementById('modal-title').textContent = medId ? 'Edit Medication' : 'Add Medication';

    // Reset form
    document.getElementById('f-name').value    = '';
    document.getElementById('f-dosage').value  = '';
    document.getElementById('f-unit').value    = 'mg';
    document.getElementById('f-time').value    = '08:30';
    document.getElementById('f-stock').value   = '30';
    document.getElementById('f-low-stock').value = '5';
    document.getElementById('f-refill').checked = true;
    document.getElementById('f-notes').value   = '';
    document.getElementById('extra-times-list').innerHTML = '';
    document.querySelectorAll('#f-type-pills .pill-sel').forEach((b,i) => b.classList.toggle('active', i===0));
    document.querySelectorAll('#f-freq-pills .pill-sel').forEach((b,i) => b.classList.toggle('active', i===0));
    updateRefillLabel();

    if (medId) {
        const med = meds.find(m => m.id === medId);
        if (med) {
            document.getElementById('f-name').value      = med.name;
            document.getElementById('f-dosage').value    = med.dosage;
            document.getElementById('f-unit').value      = med.unit;
            document.getElementById('f-time').value      = med.times[0] || '08:30';
            document.getElementById('f-stock').value     = med.stock;
            document.getElementById('f-low-stock').value = med.lowStockAt;
            document.getElementById('f-refill').checked  = med.refill;
            document.getElementById('f-notes').value     = med.notes || '';

            document.querySelectorAll('#f-type-pills .pill-sel').forEach(b => b.classList.toggle('active', b.dataset.val === med.type));
            document.querySelectorAll('#f-freq-pills .pill-sel').forEach(b => b.classList.toggle('active', b.dataset.val === med.freq));

            // Extra times
            med.times.slice(1).forEach(t => addExtraTimeField(null, t));
            updateRefillLabel();
        }
    }

    modal.classList.add('open');
    modal.removeAttribute('aria-hidden');
}

function closeModal() {
    document.getElementById('modal-add-med').classList.remove('open');
}

function addExtraTimeField(e, presetVal = '') {
    if (e) e.preventDefault && e.preventDefault();
    const container = document.getElementById('extra-times-list');
    const row = document.createElement('div');
    row.className = 'extra-time-row';
    row.innerHTML = `
        <i class="ph ph-clock" style="color:var(--text-lt)"></i>
        <input type="time" value="${presetVal || '20:00'}">
        <button title="Remove"><i class="ph ph-x"></i></button>`;
    row.querySelector('button').addEventListener('click', () => row.remove());
    container.appendChild(row);
}

function updateRefillLabel() {
    const n = parseInt(document.getElementById('f-low-stock').value) || 5;
    const on = document.getElementById('f-refill').checked;
    document.getElementById('refill-reminder-label').textContent =
        on ? `Notify me when ${n} ${n === 1 ? 'pill remains' : 'pills remain'}` : 'Refill reminder disabled';
}

function saveMed() {
    const name    = document.getElementById('f-name').value.trim();
    const dosage  = document.getElementById('f-dosage').value.trim();
    const unit    = document.getElementById('f-unit').value;
    const freq    = document.querySelector('#f-freq-pills .pill-sel.active')?.dataset.val || 'Daily';
    const type    = document.querySelector('#f-type-pills .pill-sel.active')?.dataset.val || 'Pills';
    const time0   = document.getElementById('f-time').value;
    const stock   = parseInt(document.getElementById('f-stock').value) || 30;
    const lowAt   = parseInt(document.getElementById('f-low-stock').value) || 5;
    const refill  = document.getElementById('f-refill').checked;
    const notes   = document.getElementById('f-notes').value.trim();

    if (!name) { shakeInput('f-name'); return; }
    if (!dosage) { shakeInput('f-dosage'); return; }

    const extraTimeInputs = [...document.querySelectorAll('#extra-times-list input[type="time"]')].map(i => i.value);
    const allTimes = [time0, ...extraTimeInputs].filter(Boolean);

    const ic = iconColors(type);

    if (editMode) {
        const idx = meds.findIndex(m => m.id === editMode);
        if (idx >= 0) {
            meds[idx] = { ...meds[idx], name, dosage, unit, dosageStr: `${dosage}${unit}`, freq, type, times: allTimes, stock, maxStock: meds[idx].maxStock || stock, lowStockAt: lowAt, refill, notes, icon: ic.icon, colorClass: ic.cls };
        }
        showToast(`✓ ${name} updated`);
    } else {
        meds.push({
            id: `med-${Date.now()}`, name, dosage, unit,
            dosageStr: `${dosage}${unit}`, freq, type,
            times: allTimes, stock, maxStock: stock, lowStockAt: lowAt,
            refill, notes, icon: ic.icon, colorClass: ic.cls,
            addedAt: new Date().toISOString()
        });
        showToast(`✓ ${name} added`);
    }

    save();
    closeModal();
    navTo('view-library');
    renderLibrary();
}

function shakeInput(id) {
    const el = document.getElementById(id);
    el.style.borderColor = 'var(--accent-rose)';
    el.style.animation = 'shake 0.4s ease';
    setTimeout(() => { el.style.borderColor = ''; el.style.animation = ''; }, 600);
}

// ─────────────────────────────────────────────────────────────
//  MED DETAIL MODAL
// ─────────────────────────────────────────────────────────────
function openDetail(medId) {
    const med = meds.find(m => m.id === medId);
    if (!med) return;

    document.getElementById('detail-title').textContent = med.name;
    document.getElementById('btn-delete-med').dataset.medId = medId;

    const stockPct = Math.min(100, Math.round((med.stock / (med.maxStock || 30)) * 100));
    const isLow = med.stock <= med.lowStockAt;

    document.getElementById('detail-body').innerHTML = `
        <div class="detail-hero">
            <div class="med-icon ${med.colorClass}" style="width:56px;height:56px;font-size:1.6rem;border-radius:16px">
                <i class="ph-fill ${med.icon}"></i>
            </div>
            <div>
                <h2>${med.name}</h2>
                <p>${med.dosageStr} · ${med.type}</p>
                <p style="color:var(--text-lt);font-size:0.77rem;margin-top:4px">${med.notes || 'No notes'}</p>
            </div>
        </div>

        <div class="detail-info-grid">
            <div class="info-tile">
                <small>Frequency</small>
                <p>${med.freq}</p>
            </div>
            <div class="info-tile">
                <small>Reminder Times</small>
                <p>${med.times.map(fmtTime).join(', ')}</p>
            </div>
            <div class="info-tile">
                <small>Stock Left</small>
                <p style="color:${isLow ? 'var(--accent-rose)' : 'var(--primary-dk)'}">${med.stock} units</p>
            </div>
            <div class="info-tile">
                <small>Refill Alert</small>
                <p>${med.refill ? `At ${med.lowStockAt} left` : 'Disabled'}</p>
            </div>
        </div>

        <div class="info-tile stock-meter-wrap">
            <small>Stock Level</small>
            <div class="stock-meter-bg">
                <div class="stock-meter-fill${isLow ? ' low' : ''}" style="width:${stockPct}%"></div>
            </div>
            <p style="font-size:0.78rem;color:var(--text-m);margin-top:6px">${med.stock} / ${med.maxStock || 30} units</p>
        </div>

        <div style="display:flex;gap:10px">
            <button class="primary-btn" style="flex:1" onclick="openModal('${medId}'); document.getElementById('modal-med-detail').classList.remove('open');">
                <i class="ph-fill ph-pencil-simple"></i> Edit
            </button>
            <button class="primary-btn" style="flex:1;background:var(--primary-lt);color:var(--primary-dk);box-shadow:none"
                onclick="markTaken('${medId}','${med.times[0]}')">
                <i class="ph-fill ph-check-circle"></i> Take Now
            </button>
        </div>`;

    document.getElementById('modal-med-detail').classList.add('open');
}

// ─────────────────────────────────────────────────────────────
//  NOTIFICATIONS
// ─────────────────────────────────────────────────────────────
function requestNotifPermission(force = false) {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default' || force) {
        Notification.requestPermission().then(p => {
            if (p === 'granted') showToast('🔔 Browser notifications enabled!');
        });
    }
}

function tryBrowserNotif(title, body) {
    if (!settings.push) return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
        new Notification(`🩺 MedPulse: ${title}`, { body, icon: 'medpulse-icon.svg', badge: 'medpulse-icon.svg', silent: !settings.sound });
    }
}

// In-app popup
function showInAppNotif(med, time) {
    activeNotifMedId = med.id;
    document.getElementById('ian-icon').innerHTML = `<i class="ph-fill ${med.icon}"></i>`;
    document.getElementById('ian-icon').className = `ian-icon`;
    document.getElementById('ian-title').textContent = `Time for ${med.name}`;
    document.getElementById('ian-desc').textContent  = `${med.dosageStr} · ${fmtTime(time)}`;

    const popup = document.getElementById('in-app-notif');
    popup.classList.add('visible');

    // Wire buttons
    document.getElementById('btn-notif-take').onclick = () => {
        markTaken(med.id, time);
        popup.classList.remove('visible');
        activeNotifMedId = null;
    };
    document.getElementById('btn-notif-snooze').onclick = () => {
        popup.classList.remove('visible');
        activeNotifMedId = null;
        // Snooze = log as snoozed
        const existing = logs.findIndex(l => l.medId === med.id && l.time === time && l.date === todayStr());
        const entry = { medId: med.id, time, date: todayStr(), status: 'snoozed', ts: Date.now() };
        if (existing >= 0) logs[existing] = entry;
        else logs.push(entry);
        save();
        renderDashboard();
        showToast(`⏰ ${med.name} snoozed`);
    };

    // Auto‑hide after 12 seconds
    setTimeout(() => { popup.classList.remove('visible'); }, 12000);

    // Sound
    if (settings.sound) playChime();
}

function hideInAppNotif() {
    document.getElementById('in-app-notif').classList.remove('visible');
    activeNotifMedId = null;
}

// Stock alert popup
function showStockAlert(med) {
    document.getElementById('stock-alert-title').textContent = `Low Stock: ${med.name}`;
    document.getElementById('stock-alert-desc').textContent  = `Only ${med.stock} left — consider a refill soon.`;
    const popup = document.getElementById('stock-alert-notif');
    popup.classList.add('visible');

    document.getElementById('btn-stock-dismiss').onclick = () => popup.classList.remove('visible');

    tryBrowserNotif(`Low Stock: ${med.name}`, `Only ${med.stock} left — consider a refill soon.`);

    setTimeout(() => popup.classList.remove('visible'), 8000);
}

// Update notification dot badge
function updateNotifBadge() {
    const lowCount = meds.filter(m => m.stock <= m.lowStockAt && m.refill).length;
    const badge = document.getElementById('notif-badge');
    if (lowCount > 0) {
        badge.textContent = lowCount;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// Bell button
document.addEventListener('DOMContentLoaded', () => {});
function setupNotifBell() {
    document.getElementById('btn-bell').addEventListener('click', () => {
        const lowMeds = meds.filter(m => m.stock <= m.lowStockAt && m.refill);
        if (lowMeds.length > 0) {
            showStockAlert(lowMeds[0]);
        } else {
            showToast('✅ All medications are well-stocked!');
        }
    });
}

// ─────────────────────────────────────────────────────────────
//  REMINDER LOOP — checks every 30 seconds
// ─────────────────────────────────────────────────────────────
function startReminderLoop() {
    checkReminders();
    setInterval(checkReminders, 30000);
    setInterval(updateNotifBadge, 60000);
}

function checkReminders() {
    if (!settings.push) return;
    const now = nowHHMM();
    const today = todayStr();

    meds.forEach(med => {
        med.times.forEach(t => {
            if (t === now) {
                const log = getLogFor(med.id, t);
                if (!log) {
                    // Only show one popup at a time
                    if (!document.getElementById('in-app-notif').classList.contains('visible')) {
                        showInAppNotif(med, t);
                    }
                    tryBrowserNotif(med.name, `${med.dosageStr} · Scheduled for ${fmtTime(t)}`);
                }
            }
        });
        // Check stock
        if (med.refill && med.stock <= med.lowStockAt) {
            const alertShownKey = `mp_stockalert_${med.id}_${today}`;
            if (!localStorage.getItem(alertShownKey)) {
                showStockAlert(med);
                localStorage.setItem(alertShownKey, '1');
            }
        }
    });
}

// ─────────────────────────────────────────────────────────────
//  SOUND
// ─────────────────────────────────────────────────────────────
function playChime() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const freqs = [523, 659, 784, 1047];
        freqs.forEach((f, i) => {
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = f;
            osc.type = 'sine';
            const t = ctx.currentTime + i * 0.16;
            gain.gain.setValueAtTime(0.18, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
            osc.start(t);
            osc.stop(t + 0.5);
        });
    } catch (e) { /* AudioContext not available */ }
}

// ─────────────────────────────────────────────────────────────
//  TOAST
// ─────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ─────────────────────────────────────────────────────────────
//  PROFILE SETUP (runs once)
// ─────────────────────────────────────────────────────────────
function setupProfile() {
    document.getElementById('btn-edit-profile').addEventListener('click', () => {
        const newName = prompt('Enter your name:', profile.name);
        if (newName && newName.trim()) {
            profile.name = newName.trim();
            save();
            renderProfile();
            renderDashboard();
            showToast('Profile updated!');
        }
    });
    setupNotifBell();
}

// ─────────────────────────────────────────────────────────────
//  SERVICE WORKER
// ─────────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(r => console.log('[MedPulse] SW registered:', r.scope))
            .catch(e => console.warn('[MedPulse] SW failed:', e));
    });
}

// Add shake animation via stylesheet
const style = document.createElement('style');
style.textContent = `@keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }`;
document.head.appendChild(style);
