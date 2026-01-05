const overlay = document.getElementById("overlayLoader");
const list = document.getElementById("transactionList");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const clearBtn = document.getElementById("clearSearchBtn");
let lastVisible = null;

let allData = [];

// Live Clock
function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const clockEl = document.getElementById("clockDisplay");
    if (clockEl) clockEl.innerText = timeString;
}
setInterval(updateClock, 1000);
updateClock();

async function fetchAllData() {
    const snap = await db.collection("transactions").orderBy("date", "desc").get();
    allData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Search handle with Clear Button Toggle
function handleSearch() {
    const term = document.getElementById("searchInput").value.toUpperCase();

    // Clear button toggle logic
    clearBtn.style.display = term.length > 0 ? "block" : "none";

    if (term.length === 0) {
        loadTransactions();
        return;
    }
    const filtered = allData.filter(t => {
        const cat = (t.category || "").toUpperCase();
        const desc = (t.description || "").toUpperCase();
        const amt = (t.amount || "").toString();
        return cat.includes(term) || desc.includes(term) || amt.includes(term);
    });
    renderListFromData(filtered);
    loadMoreBtn.style.display = "none";
}

// Clear Function
function clearSearch() {
    document.getElementById("searchInput").value = "";
    clearBtn.style.display = "none";
    loadTransactions();
}

// Selection State
let isSelectionMode = false;
let selectedIds = new Set();

function toggleSelectionMode() {
    isSelectionMode = !isSelectionMode;
    selectedIds.clear();
    updateSelectionUI();
    renderMonthView(); // Re-render to show/hide checkboxes
}

function updateSelectionUI() {
    const btn = document.getElementById('selectModeBtn');
    const delBtn = document.getElementById('deleteSelectedBtn');

    if (isSelectionMode) {
        btn.classList.add('text-primary');
        delBtn.style.display = 'block';
    } else {
        btn.classList.remove('text-primary');
        delBtn.style.display = 'none';
    }
    updateDeleteBtnCount();
}

function updateDeleteBtnCount() {
    document.getElementById('selectedCount').innerText = selectedIds.size;
}

function toggleSelection(id) {
    if (selectedIds.has(id)) selectedIds.delete(id);
    else selectedIds.add(id);

    updateDeleteBtnCount();

    // Update visual state of that specific row immediately
    const row = document.getElementById(`tx-row-${id}`);
    const checkbox = document.getElementById(`tx-check-${id}`);
    if (row && checkbox) {
        checkbox.checked = selectedIds.has(id);
        if (selectedIds.has(id)) row.classList.add("bg-light-primary");
        else row.classList.remove("bg-light-primary");
    }
}

async function deleteSelectedItems() {
    if (selectedIds.size === 0) return alert("Select items to delete");

    if (confirm(`Delete ${selectedIds.size} transaction(s)? This cannot be undone.`)) {
        const batch = db.batch();
        selectedIds.forEach(id => {
            const ref = db.collection("transactions").doc(id);
            batch.delete(ref);
        });

        try {
            await batch.commit();
            location.reload();
        } catch (e) {
            alert("Error deleting: " + e.message);
        }
    }
}

function renderListFromData(dataArray) {
    list.innerHTML = "";
    if (dataArray.length === 0) {
        list.innerHTML = "<div class='text-center p-5 text-muted'>No results found.</div>";
        return;
    }

    const grouped = {};
    dataArray.forEach(t => {
        const key = new Date(t.date).toDateString();
        if (!grouped[key]) {
            grouped[key] = { items: [], income: 0, expense: 0 };
        }
        grouped[key].items.push(t);
        const amt = parseFloat(t.amount) || 0;
        if (t.type === "Income") grouped[key].income += amt;
        else if (t.type === "Expense") grouped[key].expense += amt;
    });

    Object.keys(grouped).forEach(dateStr => {
        const group = grouped[dateStr];

        // Sort items by time descending (latest time first)
        group.items.sort((a, b) => {
            const timeA = a.time || "00:00";
            const timeB = b.time || "00:00";
            return timeB.localeCompare(timeA);
        });

        const dayWrap = document.createElement("div");
        dayWrap.innerHTML = `
        <div class="date-header d-flex justify-content-between align-items-center">
            <span>${new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            <div style="font-size: 9px; font-weight: 800;">
                <span class="day-total-in">IN: ₹${group.income.toFixed(0)}</span>
                <span class="day-total-out">OUT: ₹${group.expense.toFixed(0)}</span>
            </div>
        </div>`;
        list.appendChild(dayWrap);

        group.items.forEach(t => {
            const row = document.createElement("div");
            // Use custom class for theming support instead of bg-white
            const isSelected = selectedIds.has(t.id);
            row.className = `transaction-card ${isSelected ? 'bg-light-primary' : ''}`;
            row.id = `tx-row-${t.id}`;

            const isInc = t.type === "Income";
            const isTrf = t.type === "Transfer";

            // Checkbox logic
            const checkHtml = isSelectionMode
                ? `<div class="me-3"><input type="checkbox" class="form-check-input fs-5" id="tx-check-${t.id}" ${isSelected ? 'checked' : ''} disabled></div>`
                : '';

            row.innerHTML = `
            <div class="d-flex align-items-center px-3 py-2 clickable-row" onclick="handleRowClick('${t.id}')">
                ${checkHtml}
                <div class="flex-grow-1 d-flex justify-content-between align-items-center">
                    <div style="max-width: 70%;">
                        <div class="fw-bold" style="font-size: 13px;">${t.category}</div>
                        <div class="text-muted" style="font-size: 10px;">${t.account}${isTrf ? ' → ' + t.toAccount : ''} • ${t.description || ''}</div>
                    </div>
                    <div class="text-end">
                        <div class="${isInc ? 'text-success' : (isTrf ? 'text-primary' : 'text-danger')} fw-bold" style="font-size: 14px;">
                            ${isInc ? '+' : (isTrf ? '⇆' : '-')}₹${parseFloat(t.amount).toFixed(2)}
                        </div>
                        <div class="text-muted" style="font-size: 10px;">
                             ${t.time || ''}
                        </div>
                    </div>
                </div>
            </div>`;
            dayWrap.appendChild(row);
        });
    });
}

function handleRowClick(id) {
    if (isSelectionMode) {
        toggleSelection(id);
    } else {
        openTxModal(id);
    }
}

function renderShimmer() {
    let shimmerHtml = "";
    for (let i = 0; i < 6; i++) {
        shimmerHtml += `
        <div class="shimmer-card d-flex align-items-center">
            <div class="shimmer-item shimmer-circle me-3"></div>
            <div class="flex-grow-1">
                <div class="shimmer-item shimmer-title"></div>
                <div class="shimmer-item shimmer-desc"></div>
            </div>
            <div class="shimmer-item shimmer-amt"></div>
        </div>`;
    }
    list.innerHTML = shimmerHtml;
}

let currentViewDate = new Date();

function changeMonth(step) {
    currentViewDate.setMonth(currentViewDate.getMonth() + step);
    renderMonthView();
}

function renderMonthView() {
    // Update Label
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const lbl = document.getElementById("currentMonthLabel");
    if (lbl) {
        lbl.innerText = `${monthNames[currentViewDate.getMonth()]} ${currentViewDate.getFullYear()}`;
    }

    // Filter Data
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();

    const filtered = allData.filter(t => {
        const d = new Date(t.date);
        return d.getFullYear() === year && d.getMonth() === month;
    });

    renderListFromData(filtered);
    updateGlobalSummary(filtered);

    // Hide load more button as we use month view
    if (loadMoreBtn) loadMoreBtn.style.display = "none";
}

async function loadTransactions(isMore = false) {
    try {
        if (!isMore) {
            renderShimmer();
            await fetchAllData();
            // Initial render will trigger summary update
            renderMonthView();
        }
        overlay.style.display = "none";

    } catch (e) {
        console.error(e);
        list.innerHTML = "<div class='text-center p-5 text-danger font-bold'>Error loading data.</div>";
        overlay.style.display = "none";
    }
}

async function updateGlobalSummary(dataToSummarize) {
    // If no filtered data provided (e.g. initial load before month filter), use allData
    // BUT we want month view by default, so renderMonthView will call this with filtered data.
    // If called without args, we might want to default to empty or specific month? 
    // Safest is to rely on renderMonthView calling this. 

    const sourceData = dataToSummarize || allData; // Fallback to allData if not provided (though we prefer month)

    let bank = 0, cash = 0, others = 0, inc = 0, exp = 0;

    // NOTE: If we want "Available Balance" to be TOTAL (all time) but Income/Expense to be MONTHLY:
    // The user asked "topla ula avialble balance income expense this month mattumthan show aaganum"
    // This implies ALL stats should be for this month. 
    // However, "Available Balance" usually means "Total Money I Have Now". 
    // If I filter Balance by month, it just shows "Net Flow of this Month".
    // I will assume the user wants EVERYTHING specific to this month, including the "Balance" displayed there (which effectively becomes "Savings for this month").
    // IF valid wallet balance is needed, we'd need to calculate that separately from allData.
    // Let's stick to the user's request: "this month mattumthan show aaganum" (Show only this month).

    sourceData.forEach(t => {
        const amt = parseFloat(t.amount) || 0;
        const acc = (t.account || "OTHERS").toUpperCase();
        if (t.type === "Income") { inc += amt; if (acc === "BANK") bank += amt; else if (acc === "CASH") cash += amt; else others += amt; }
        else if (t.type === "Expense") { exp += amt; if (acc === "BANK") bank -= amt; else if (acc === "CASH") cash -= amt; else others -= amt; }
        else if (t.type === "Transfer") {
            const toAcc = (t.toAccount || "").toUpperCase();
            if (acc === "BANK") bank -= amt; else if (acc === "CASH") cash -= amt; else others -= amt;
            if (toAcc === "BANK") bank += amt; else if (toAcc === "CASH") cash += amt; else others += amt;
        }
    });
    document.getElementById("sumIncome").innerText = `₹${inc.toFixed(0)}`;
    document.getElementById("sumExpense").innerText = `₹${exp.toFixed(0)}`;
    document.getElementById("sumNetBalance").innerText = `₹${(bank + cash + others).toLocaleString('en-IN')}`;
    document.getElementById("accountBreakdown").innerHTML = `<div class="col-4 border-end">BANK: <b>₹${bank.toFixed(0)}</b></div><div class="col-4 border-end">CASH: <b>₹${cash.toFixed(0)}</b></div><div class="col-4">OTHERS: <b>₹${others.toFixed(0)}</b></div>`;
}

// Modal Logic
let currentTxId = null;
const txModal = new bootstrap.Modal(document.getElementById('txOptionsModal'));

function openTxModal(id) {
    currentTxId = id;
    const t = allData.find(item => item.id === id);
    if (t) {
        document.getElementById('txModalTitle').innerText = t.category;
        document.getElementById('txModalDesc').innerText = `${t.amount} - ${t.description || 'No Description'}`;

        document.getElementById('btnCopyTx').onclick = () => window.location.href = `add.html?duplicate=${id}`;
        document.getElementById('btnEditTx').onclick = () => window.location.href = `add.html?id=${id}`;
        document.getElementById('btnDeleteTx').onclick = () => deleteTx(id);

        txModal.show();
    }
}

async function deleteTx(id) {
    if (confirm("Delete?")) { await db.collection("transactions").doc(id).delete(); location.reload(); }
}

loadTransactions();
