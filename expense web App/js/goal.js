let goals = JSON.parse(localStorage.getItem('v3_goals') || '[]');
let currentEditIdx = -1;
let searchQuery = '';

function saveData() { localStorage.setItem('v3_goals', JSON.stringify(goals)); }

function openNewGoalModal() {
    currentEditIdx = -1;
    const modalTitle = document.querySelector('#newGoalModal h5');
    if (modalTitle) modalTitle.textContent = 'New Blueprint';
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) saveBtn.textContent = 'LAUNCH BLUEPRINT';
    resetModalFields();
    new bootstrap.Modal(document.getElementById('newGoalModal')).show();
}

function openEditModal(idx) {
    currentEditIdx = idx;
    const g = goals[idx];
    const modalTitle = document.querySelector('#newGoalModal h5');
    if (modalTitle) modalTitle.textContent = 'Edit Blueprint';
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) saveBtn.textContent = 'UPDATE BLUEPRINT';

    document.getElementById('inName').value = g.name;
    document.getElementById('inColor').value = g.color;
    document.getElementById('inWhy').value = g.why;
    document.getElementById('inPlan').value = g.plan;
    document.getElementById('inSchedule').value = g.schedule;
    document.getElementById('inObstacles').value = g.obstacles;

    new bootstrap.Modal(document.getElementById('newGoalModal')).show();
}

function resetModalFields() {
    ['inName', 'inWhy', 'inPlan', 'inSchedule', 'inObstacles'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const inColor = document.getElementById('inColor');
    if (inColor) inColor.value = '#4f46e5';
}

function saveGoal() {
    const name = document.getElementById('inName').value || 'Untitled';
    const color = document.getElementById('inColor').value;
    const why = document.getElementById('inWhy').value;
    const plan = document.getElementById('inPlan').value;
    const schedule = document.getElementById('inSchedule').value;
    const obstacles = document.getElementById('inObstacles').value;

    if (currentEditIdx === -1) {
        // New Goal
        goals.push({
            id: Date.now(),
            name, color, why, plan, schedule, obstacles,
            history: []
        });
    } else {
        // Update Existing
        goals[currentEditIdx] = {
            ...goals[currentEditIdx],
            name, color, why, plan, schedule, obstacles
        };
    }

    saveData();
    bootstrap.Modal.getInstance(document.getElementById('newGoalModal')).hide();
    renderList();
}

function handleSearch() {
    searchQuery = document.getElementById('goalSearch').value.toLowerCase();
    renderList();
}

function toggleExpand(idx) {
    const card = document.getElementById(`goal-\${idx}`);
    if (card) card.classList.toggle('open');
}

function calculateProgress(history) {
    if (history.length === 0) return 0;
    const successCount = history.filter(h => h.status === 'Done').length;
    return Math.round((successCount / history.length) * 100);
}

function calculateStreak(history) {
    if (!history || history.length === 0) return { current: 0, best: 0 };
    const sorted = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
    const today = new Date().toISOString().split('T')[0];

    let current = 0;
    let best = 0;
    let running = 0;

    // Best streak
    [...sorted].reverse().forEach(h => {
        if (h.status === 'Done') {
            running++;
            if (running > best) best = running;
        } else {
            running = 0;
        }
    });

    // Current streak
    const lastDate = sorted[0].date;
    const now = new Date(today);
    const last = new Date(lastDate);
    const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) {
        for (let h of sorted) {
            if (h.status === 'Done') current++;
            else break;
        }
    }
    return { current, best };
}

function renderHeatmap(history) {
    const today = new Date();
    let html = '<div class="d-flex flex-wrap gap-1 mt-2">';
    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const entry = history.find(h => h.date === dateStr);
        let color = 'var(--bg-input)';
        if (entry) color = entry.status === 'Done' ? '#10b981' : '#ef4444';
        html += `<div style="width: 10px; height: 10px; border-radius: 2px; background: \${color};" title="\${dateStr}"></div>`;
    }
    return html + '</div>';
}

function quickLog(idx, status, event) {
    if (event) event.stopPropagation();
    const date = new Date().toISOString().split('T')[0];

    if (status === 'Missed') {
        const modal = new bootstrap.Modal(document.getElementById('missedReasonModal'));
        document.getElementById('missedReason').value = '';
        document.getElementById('saveMissedBtn').onclick = () => {
            const reason = document.getElementById('missedReason').value || 'No reason provided';
            const existingIdx = goals[idx].history.findIndex(h => h.date === date);
            if (existingIdx !== -1) {
                goals[idx].history[existingIdx].status = status;
                goals[idx].history[existingIdx].reason = reason;
            } else {
                goals[idx].history.unshift({ date, status, reason });
            }
            saveData();
            modal.hide();
            renderList();
            openAndKeepCard(idx);
        };
        modal.show();
    } else {
        const existingIdx = goals[idx].history.findIndex(h => h.date === date);
        if (existingIdx !== -1) goals[idx].history[existingIdx].status = status;
        else goals[idx].history.unshift({ date, status });

        saveData();
        renderList();
        openAndKeepCard(idx);
    }
}

function openAndKeepCard(idx) {
    setTimeout(() => {
        const card = document.getElementById(`goal-\${idx}`);
        if (card) card.classList.add('open');
    }, 50);
}

function deleteGoal(idx, event) {
    if (event) event.stopPropagation();
    if (!confirm("Delete this blueprint?")) return;
    goals.splice(idx, 1);
    saveData();
    renderList();
}

function renderList() {
    let html = '';
    const filtered = goals.map((g, originalIdx) => ({ ...g, originalIdx }))
        .filter(g => g.name.toLowerCase().includes(searchQuery));

    filtered.forEach((g) => {
        const idx = g.originalIdx;
        const prog = calculateProgress(g.history);
        const last3 = g.history.slice(0, 3);
        const streaks = calculateStreak(g.history);

        html += `
        <div class="goal-card" id="goal-\${idx}">
            <div class="goal-main-row" onclick="toggleExpand(\${idx})">
                <div class="d-flex align-items-start justify-content-between mb-2">
                    <div class="flex-grow-1">
                        <span class="goal-title" style="color: \${g.color}">\${g.name}</span>
                        <div class="goal-meta">
                            <i class="bi bi-clock-history"></i> \${g.history.length} logs
                            \${streaks.current > 0 ? \`<span class="streak-badge"><i class="bi bi-fire"></i> \${streaks.current} day streak</span>\` : ''}
                        </div>
                    </div>
                    <div class="quick-log">
                        <button class="log-btn done" onclick="quickLog(\${idx}, 'Done', event)"><i class="bi bi-check-lg"></i></button>
                        <button class="log-btn miss" onclick="quickLog(\${idx}, 'Missed', event)"><i class="bi bi-x-lg"></i></button>
                    </div>
                </div>
                
                <div class="progress-container">
                    <div class="progress"><div class="progress-bar" style="width: \${prog}%; background-color: \${g.color}"></div></div>
                    <div class="progress-label">
                        <span style="color: var(--text-muted)">Completion</span>
                        <span style="color: \${g.color}">\${prog}% Success</span>
                    </div>
                </div>
            </div>
            
            <div class="goal-expanded">
                <div class="row mb-4 g-3 text-center">
                    <div class="col-4">
                        <div class="p-3 rounded-4" style="background: rgba(16, 185, 129, 0.08); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.1)">
                            <div class="section-label mb-1" style="color: #10b981">Current</div>
                            <div class="h4 mb-0 fw-800">\${streaks.current}</div>
                        </div>
                    </div>
                    <div class="col-4">
                        <div class="p-3 rounded-4" style="background: rgba(99, 102, 241, 0.08); color: #6366f1; border: 1px solid rgba(99, 102, 241, 0.1)">
                            <div class="section-label mb-1" style="color: #6366f1">Best</div>
                            <div class="h4 mb-0 fw-800">\${streaks.best}</div>
                        </div>
                    </div>
                    <div class="col-4">
                        <div class="p-3 rounded-4" style="background: rgba(245, 158, 11, 0.08); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.1)">
                            <div class="section-label mb-1" style="color: #f59e0b">Total</div>
                            <div class="h4 mb-0 fw-800">\${g.history.length}</div>
                        </div>
                    </div>
                </div>

                <div class="mb-4">
                    <span class="section-label">Consistency Heatmap</span>
                    \${renderHeatmap(g.history)}
                </div>

                <div class="mb-4">
                    <span class="section-label">Root Purpose (The "Why")</span>
                    <div style="font-weight: 500; opacity: 0.9; line-height: 1.5;">\${g.why || 'No purpose defined yet.'}</div>
                </div>

                <div class="strategy-box shadow-sm">
                    <span class="section-label"><i class="bi bi-journal-text me-1"></i> Strategy & Routine</span>
                    <div class="mb-3" style="font-size: 14px; line-height: 1.6;">\${g.plan || 'No plan specified.'}</div>
                    
                    <div class="row g-3">
                        <div class="col-6">
                            <span class="section-label">Schedule</span>
                            <div class="small fw-600 opacity-75">\${g.schedule || 'Flexi'}</div>
                        </div>
                        <div class="col-6">
                            <span class="section-label text-danger">Obstacles</span>
                            <div class="small fw-600 text-danger opacity-75">\${g.obstacles || 'None'}</div>
                        </div>
                    </div>
                </div>

                <div class="d-flex justify-content-between align-items-center mb-2">
                     <span class="section-label m-0">Recent Activity</span>
                     <button class="btn btn-link p-0 text-primary fw-700" style="font-size: 11px; text-decoration: none;" onclick="showFullHistory(\${idx})">View History</button>
                </div>
                <ul class="history-mini mb-4">
                    \${last3.length > 0 ? last3.map(h => \`<li>
                        <div class="w-100">
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="fw-500">\${h.date}</span> 
                                <span class="badge rounded-pill \${h.status === 'Done' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}" style="font-size: 10px">\${h.status}</span>
                            </div>
                            \${h.reason ? \`<div class="text-danger small mt-1 opacity-75" style="font-size: 11px; font-style: italic;">"\${h.reason}"</div>\` : ''}
                        </div>
                    </li>\`).join('') : '<li class="text-muted small">No entries recorded yet</li>'}
                </ul>

                <div class="d-flex gap-2">
                    <button class="btn btn-light flex-grow-1 rounded-3 py-2 fw-700 border" onclick="openEditModal(\${idx})">
                        <i class="bi bi-pencil-square me-1"></i> Edit
                    </button>
                    <button class="btn btn-outline-danger flex-grow-1 rounded-3 py-2 fw-700" onclick="deleteGoal(\${idx}, event)">
                        <i class="bi bi-trash3 me-1"></i> Delete
                    </button>
                </div>
            </div>
        </div>\`;
    });
    const listContainer = document.getElementById('goalListContainer');
    if (listContainer) {
        listContainer.innerHTML = html || \`<div class="text-center mt-5 py-5">
            <div class="opacity-20 mb-3"><i class="bi bi-bullseye" style="font-size: 80px;"></i></div>
            <h5 class="fw-700 opacity-50">No blueprints found</h5>
            <p class="text-muted small">Start by creating your first goal blueprint.</p>
        </div>\`;
    }
}

function showFullHistory(idx) {
    const history = goals[idx].history;
    let html = history.map(h => \`<li class="list-group-item py-3 px-4">
        <div class="d-flex justify-content-between align-items-center mb-1">
            <span class="fw-600">\${h.date}</span>
            <span class="badge rounded-pill \${h.status === 'Done' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}" style="font-size: 11px; padding: 6px 12px;">\${h.status}</span>
        </div>
        \${h.reason ? \`<div class="text-danger small opacity-75" style="font-style: italic;">"\${h.reason}"</div>\` : ''}
    </li>\`).join('');

    const fullHistoryList = document.getElementById('fullHistoryList');
    if (fullHistoryList) {
        fullHistoryList.innerHTML = html || '<div class="p-5 text-center opacity-50">No history recorded yet.</div>';
    }
    new bootstrap.Modal(document.getElementById('historyModal')).show();
}

window.onload = renderList;
