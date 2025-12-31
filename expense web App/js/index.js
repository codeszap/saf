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
            row.className = "swipe-container";
            const isInc = t.type === "Income";
            const isTrf = t.type === "Transfer";
            row.innerHTML = `
            <div class="swipe-actions">
                <button class="btn-edit" style="background: #0dcaf0;" onclick="window.location.href='add.html?duplicate=${t.id}'">Copy</button>
                <button class="btn-edit" onclick="window.location.href='add.html?id=${t.id}'">Edit</button>
                <button class="btn-delete" onclick="deleteTx('${t.id}')">Del</button>
            </div>
            <div class="swipe-content d-flex justify-content-between align-items-center px-3 py-2">
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
            </div>`;
            dayWrap.appendChild(row);
            enableSwipe(row);
        });
    });
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

async function loadTransactions(isMore = false) {
    try {
        if (!isMore) {
            renderShimmer();
            await fetchAllData();
            await updateGlobalSummary();
            list.innerHTML = "";
        }
        let query = db.collection("transactions").orderBy("date", "desc").limit(50);
        if (isMore && lastVisible) {
            overlay.style.display = "flex"; // Fallback for loading more
            query = query.startAfter(lastVisible);
        }

        const snap = await query.get();
        if (snap.empty) {
            loadMoreBtn.style.display = "none";
            overlay.style.display = "none";
            if (!isMore) list.innerHTML = "<div class='text-center p-5 text-muted'>No transactions found.</div>";
            return;
        }

        lastVisible = snap.docs[snap.docs.length - 1];
        const currentData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (!isMore) list.innerHTML = ""; // Clear shimmer
        renderListFromData(currentData);
        loadMoreBtn.style.display = snap.docs.length === 50 ? "block" : "none";
    } catch (e) {
        console.error(e);
        list.innerHTML = "<div class='text-center p-5 text-danger font-bold'>Error loading data.</div>";
    }
    overlay.style.display = "none";
}

async function updateGlobalSummary() {
    let bank = 0, cash = 0, others = 0, inc = 0, exp = 0;
    allData.forEach(t => {
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

function enableSwipe(row) {
    const content = row.querySelector(".swipe-content");
    const actions = row.querySelector(".swipe-actions");
    let startX = 0, moveX = 0;

    // Swipe Logic
    content.addEventListener("touchstart", e => { startX = e.touches[0].clientX; actions.style.visibility = "visible"; }, { passive: true });
    content.addEventListener("touchmove", e => {
        moveX = e.touches[0].clientX - startX;
        if (moveX < 0) content.style.transform = `translateX(${Math.max(moveX, -195)}px)`;
    });
    content.addEventListener("touchend", () => {
        if (moveX < -60) {
            content.style.transform = "translateX(-195px)";
        } else {
            // If it was just a tap (not a swipe), let the click listener handle it.
            // But if it was a small swipe that didn't cross threshold, revert.
            if (moveX === 0) return; // Let click bubble
            content.style.transform = "translateX(0)";
            setTimeout(() => actions.style.visibility = "hidden", 300);
        }
        moveX = 0;
    });

    // Tap/Click to Toggle Logic
    content.addEventListener("click", () => {
        // Check current state
        const currentTransform = content.style.transform;
        if (currentTransform === "translateX(-195px)") {
            // Close
            content.style.transform = "translateX(0)";
            setTimeout(() => actions.style.visibility = "hidden", 300);
        } else {
            // Open (and close others if needed, but for now simple toggle)
            actions.style.visibility = "visible";
            content.style.transform = "translateX(-195px)";
        }
    });
}

async function deleteTx(id) {
    if (confirm("Delete?")) { await db.collection("transactions").doc(id).delete(); location.reload(); }
}

loadTransactions();
