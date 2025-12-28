let whyCount = 0;
const maxWhys = 5;
let allProblems = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadHistory();
    const rootProblemEl = document.getElementById('rootProblem');
    if (rootProblemEl) rootProblemEl.addEventListener('input', checkInputs);
});

function addWhyStep(value = "") {
    whyCount++;

    const container = document.getElementById('whysList');
    if (!container) return;
    const step = document.createElement('div');
    step.className = 'why-container';
    step.innerHTML = `
        <div class="why-line"></div>
        <div class="why-step">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <div class="why-badge mb-0">Why? #\${whyCount}</div>
                <i class="bi bi-x-circle-fill text-danger" onclick="removeWhyStep(this)" style="cursor: pointer; font-size: 14px;"></i>
            </div>
            <input type="text" class="input-premium why-input" placeholder="Because..." oninput="checkInputs()" value="\${value}">
        </div>
    `;
    container.appendChild(step);

    if (!value) {
        setTimeout(() => {
            const input = step.querySelector('input');
            if (input) input.focus();
        }, 100);
    }

    checkInputs();
    if (!value) window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
    });
}

function removeWhyStep(element) {
    const container = element.closest('.why-container');
    if (container) container.remove();

    whyCount = 0;
    const steps = document.querySelectorAll('.why-container .why-badge');
    steps.forEach((badge) => {
        whyCount++;
        badge.innerText = `Why? #\${whyCount}`;
    });

    checkInputs();
}

function checkInputs() {
    const rootProblemEl = document.getElementById('rootProblem');
    if (!rootProblemEl) return;
    const problem = rootProblemEl.value.trim();

    const askBtn = document.getElementById('askWhyBtn');
    const solveBtn = document.getElementById('solveBtn');

    if (!askBtn || !solveBtn) return;

    if (!problem) {
        askBtn.disabled = true;
        solveBtn.style.display = 'none';
        return;
    }
    askBtn.disabled = false;

    if (whyCount > 0) {
        solveBtn.style.display = 'block';
    } else {
        solveBtn.style.display = 'none';
    }

    askBtn.style.display = 'block';
    solveBtn.className = "btn btn-solution flex-grow-1 btn-action";
}

function showSolutionInput() {
    const actionButtons = document.getElementById('actionButtons');
    const solutionSection = document.getElementById('solutionSection');
    const solutionInput = document.getElementById('solutionInput');

    if (actionButtons) actionButtons.style.display = 'none';
    if (solutionSection) solutionSection.style.display = 'block';
    if (solutionInput) {
        setTimeout(() => solutionInput.focus(), 100);
    }
    window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
    });
}

async function saveProblem() {
    const problem = document.getElementById('rootProblem').value.trim();
    const solution = document.getElementById('solutionInput').value.trim();
    const editId = document.getElementById('editProblemId').value;

    if (!problem || !solution) {
        alert("Please fill in the problem and solution.");
        return;
    }

    const btn = document.getElementById('saveBtn');
    if (!btn) return;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';
    btn.disabled = true;

    const whys = Array.from(document.querySelectorAll('.why-input')).map(i => i.value.trim()).filter(v => v);

    const entry = {
        date: new Date().toISOString(),
        problem,
        whys,
        solution
    };

    try {
        if (editId) {
            await db.collection('problems').doc(editId).update(entry);
        } else {
            await db.collection('problems').add(entry);
        }

        resetForm();
        await loadHistory();
        toggleHistory();
    } catch (error) {
        console.error("Error saving problem: ", error);
        alert("Failed to save to Firebase.");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function toggleHistory() {
    const viewer = document.getElementById('solverView');
    const history = document.getElementById('historyView');

    if (viewer && history) {
        if (viewer.style.display !== 'none') {
            viewer.style.display = 'none';
            history.style.display = 'block';
        } else {
            viewer.style.display = 'block';
            history.style.display = 'none';
        }
    }
}

async function loadHistory() {
    const list = document.getElementById('historyList');
    if (!list) return;
    list.innerHTML = '<div class="text-center p-4"><div class="spinner-border text-primary"></div></div>';

    try {
        const snap = await db.collection('problems').orderBy('date', 'desc').get();
        allProblems = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        if (allProblems.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-journal-album fs-1 text-muted"></i>
                    <p class="mt-3 text-muted">No problems solved yet.</p>
                </div>`;
            return;
        }

        list.innerHTML = allProblems.map(item => `
            <div class="history-item">
                <div class="d-flex justify-content-between mb-1" onclick="viewDetail('\${item.id}')">
                    <small class="text-muted fw-bold" style="font-size: 10px;">\${new Date(item.date).toLocaleDateString()}</small>
                    <div class="d-flex gap-2">
                        <i class="bi bi-pencil-fill text-primary" style="font-size: 14px; cursor: pointer;" onclick="event.stopPropagation(); editProblem('\${item.id}')"></i>
                        <i class="bi bi-trash-fill text-danger" style="font-size: 14px; cursor: pointer;" onclick="event.stopPropagation(); deleteProblem('\${item.id}')"></i>
                    </div>
                </div>
                <div class="fw-bold mb-1" onclick="viewDetail('\${item.id}')">\${item.problem}</div>
                <div class="text-success small" onclick="viewDetail('\${item.id}')"><i class="bi bi-check-circle-fill me-1"></i> \${item.solution}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error("Error loading history: ", error);
        list.innerHTML = '<div class="text-center p-4 text-danger">Error loading history from Firebase.</div>';
    }
}

function viewDetail(id) {
    const item = allProblems.find(i => i.id === id);
    if (!item) return;

    // Build timeline HTML
    let timelineHtml = '<div class="timeline">';

    // Problem node
    timelineHtml += `
        <div class="timeline-item item-problem">
            <div class="timeline-label text-danger">Problem</div>
            <div class="timeline-content fw-bold">\${item.problem}</div>
        </div>
    `;

    // Why nodes
    item.whys.forEach((why, i) => {
        timelineHtml += `
            <div class="timeline-item">
                <div class="timeline-label text-primary">Why #\${i + 1}</div>
                <div class="timeline-content">\${why}</div>
            </div>
        `;
    });

    // Solution node
    timelineHtml += `
        <div class="timeline-item item-solution">
            <div class="timeline-label text-success">Root Cause & Solution</div>
            <div class="timeline-content fw-bold">\${item.solution}</div>
        </div>
    `;

    timelineHtml += '</div>';

    const detailModalBody = document.getElementById('detailModalBody');
    if (detailModalBody) {
        detailModalBody.innerHTML = timelineHtml;
    }
    const modal = new bootstrap.Modal(document.getElementById('detailModal'));
    modal.show();
}

function editProblem(id) {
    const item = allProblems.find(i => i.id === id);
    if (!item) return;

    // Switch to solver view
    const viewer = document.getElementById('solverView');
    const history = document.getElementById('historyView');
    if (viewer) viewer.style.display = 'block';
    if (history) history.style.display = 'none';

    // Populate fields
    const editProblemIdEl = document.getElementById('editProblemId');
    const rootProblemEl = document.getElementById('rootProblem');
    const solutionInputEl = document.getElementById('solutionInput');

    if (editProblemIdEl) editProblemIdEl.value = id;
    if (rootProblemEl) rootProblemEl.value = item.problem;

    // Populate Whys
    whyCount = 0;
    const whysListEl = document.getElementById('whysList');
    if (whysListEl) whysListEl.innerHTML = '';
    item.whys.forEach(why => addWhyStep(why));

    // Populate Solution
    if (solutionInputEl) solutionInputEl.value = item.solution;
    showSolutionInput();

    // Update Buttons
    const saveBtn = document.getElementById('saveBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    if (saveBtn) saveBtn.innerHTML = 'Update Problem';
    if (cancelEditBtn) cancelEditBtn.style.display = 'block';
}

async function deleteProblem(id) {
    if (!confirm("Are you sure you want to delete this problem?")) return;

    try {
        await db.collection('problems').doc(id).delete();
        loadHistory();
    } catch (e) {
        console.error(e);
        alert("Delete failed");
    }
}

function resetForm() {
    const editProblemIdEl = document.getElementById('editProblemId');
    const rootProblemEl = document.getElementById('rootProblem');
    const whysListEl = document.getElementById('whysList');
    const solutionInputEl = document.getElementById('solutionInput');
    const actionButtons = document.getElementById('actionButtons');
    const solutionSection = document.getElementById('solutionSection');
    const askWhyBtn = document.getElementById('askWhyBtn');
    const solveBtn = document.getElementById('solveBtn');
    const saveBtn = document.getElementById('saveBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');

    if (editProblemIdEl) editProblemIdEl.value = '';
    if (rootProblemEl) rootProblemEl.value = '';
    if (whysListEl) whysListEl.innerHTML = '';
    if (solutionInputEl) solutionInputEl.value = '';
    if (actionButtons) actionButtons.style.display = 'flex';
    if (solutionSection) solutionSection.style.display = 'none';
    if (askWhyBtn) askWhyBtn.style.display = 'block';
    if (solveBtn) {
        solveBtn.style.display = 'none';
        solveBtn.className = "btn btn-solution flex-grow-1 btn-action";
    }

    if (saveBtn) saveBtn.innerHTML = 'Save to History';
    if (cancelEditBtn) cancelEditBtn.style.display = 'none';

    whyCount = 0;
    checkInputs();
}
