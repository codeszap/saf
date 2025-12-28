let allTransactions = [];
let currentFiltered = []; // Store current filtered list for drill-down
let currentMode = 'day';
let currentDate = new Date();
let incomeChart = null;
let expenseChart = null;
let trendChart = null;

async function initPage() {
    try {
        // Fetch ALL data once
        const snap = await db.collection("transactions").get();
        allTransactions = snap.docs.map(doc => doc.data());

        // Calculate Global Stats
        calculateAccountSums();

        // Initial Render
        updateDateLabel();
        applyFilters(); // Calls filterAndRender internally

    } catch (e) {
        console.error("Error loading data:", e);
    }
}

// Triggered by Account Filter Dropdown or Mode Switch
function applyFilters() {
    filterAndRender();
}

function calculateAccountSums() {
    let accs = {
        CASH: 0,
        BANK: 0,
        OTHER: 0
    };
    allTransactions.forEach(t => {
        const amt = Number(t.amount);
        const type = t.type;
        const accName = t.account ? t.account.toUpperCase() : "OTHER";

        if (accs.hasOwnProperty(accName)) {
            if (type === "Income") accs[accName] += amt;
            else if (type === "Expense") accs[accName] -= amt;
            if (type === "Transfer") {
                accs[accName] -= amt;
                const toAcc = t.toAccount ? t.toAccount.toUpperCase() : "OTHER";
                if (accs.hasOwnProperty(toAcc)) accs[toAcc] += amt;
            }
        } else {
            accs.OTHER += (type === "Income" ? amt : -amt);
        }
    });

    document.getElementById('accCash').innerText = `₹\${accs.CASH.toFixed(2)}`;
    document.getElementById('accBank').innerText = `₹\${accs.BANK.toFixed(2)}`;
    document.getElementById('accOther').innerText = `₹\${accs.OTHER.toFixed(2)}`;

    const totalBal = accs.CASH + accs.BANK + accs.OTHER;
    const existingTotal = document.getElementById("accTotalRow");
    if (existingTotal) existingTotal.remove();

    const accOtherEl = document.getElementById("accOther");
    if (accOtherEl) {
        const accContainer = accOtherEl.parentNode.parentNode;
        const totalRow = document.createElement("div");
        totalRow.id = "accTotalRow";
        totalRow.className = "d-flex justify-content-between mt-3 pt-2 border-top";
        totalRow.innerHTML = `<span class="small fw-bold text-primary">TOTAL BALANCE</span><span class="fw-bold text-primary">₹\${totalBal.toFixed(2)}</span>`;
        accContainer.appendChild(totalRow);
    }
}

// --- Navigation Logic ---

function switchMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-' + mode).classList.add('active');

    const nav = document.getElementById('dateNavigator');
    const cus = document.getElementById('customDateInputs');
    const comp = document.getElementById('comparisonCard');

    if (mode === 'custom') {
        if (nav) nav.classList.add('d-none');
        if (cus) {
            cus.classList.remove('d-none');
            cus.classList.add('d-flex');
        }
        if (comp) comp.style.display = 'none'; // No comparison for custom yet
    } else {
        if (nav) nav.classList.remove('d-none');
        if (cus) {
            cus.classList.add('d-none');
            cus.classList.remove('d-flex');
        }
        if (comp) comp.style.display = 'block';
        updateDateLabel();
        applyFilters();
    }
}

function applyCustomDate() {
    const s = document.getElementById('startDate').value;
    const e = document.getElementById('endDate').value;
    if (!s || !e) return alert("Select both dates");
    applyFilters();
}

function changeDate(delta) {
    if (currentMode === 'day') {
        currentDate.setDate(currentDate.getDate() + delta);
    } else if (currentMode === 'week') {
        currentDate.setDate(currentDate.getDate() + (delta * 7));
    } else if (currentMode === 'month') {
        currentDate.setMonth(currentDate.getMonth() + delta);
    }
    updateDateLabel();
    applyFilters();
}

function updateDateLabel() {
    const labelEl = document.getElementById('dateLabel');
    if (!labelEl) return;
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    };

    if (currentMode === 'day') {
        labelEl.innerText = currentDate.toLocaleDateString('en-GB', options);
    } else if (currentMode === 'week') {
        const d = new Date(currentDate);
        const day = d.getDay() || 7;
        if (day !== 1) d.setHours(-24 * (day - 1)); // Go to Monday

        const start = new Date(d);
        const end = new Date(d);
        end.setDate(end.getDate() + 6);

        const sStr = start.toLocaleDateString('en-GB', {
            month: 'short',
            day: 'numeric'
        });
        const eStr = end.toLocaleDateString('en-GB', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        labelEl.innerText = `\${sStr} - \${eStr}`;
    } else if (currentMode === 'month') {
        labelEl.innerText = currentDate.toLocaleDateString('en-GB', {
            month: 'long',
            year: 'numeric'
        });
    }
}

function filterAndRender() {
    const accountFilterEl = document.getElementById('accountFilter');
    if (!accountFilterEl) return;
    const accountFilter = accountFilterEl.value;
    let filtered = [];
    let start, end;

    // For comparison
    let prevStart, prevEnd;

    if (currentMode === 'custom') {
        start = new Date(document.getElementById('startDate').value);
        end = new Date(document.getElementById('endDate').value);
        // Safety
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        filtered = allTransactions.filter(t => {
            const tDate = new Date(t.date);
            tDate.setHours(12, 0, 0, 0);
            return tDate >= start && tDate <= end;
        });

    } else {
        const d = new Date(currentDate);
        d.setHours(0, 0, 0, 0);

        if (currentMode === 'day') {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const targetIso = `\${year}-\${month}-\${day}`;

            start = new Date(d);
            end = new Date(d);
            end.setHours(23, 59, 59, 999);

            // Prev
            prevStart = new Date(start);
            prevStart.setDate(prevStart.getDate() - 1);
            prevEnd = new Date(end);
            prevEnd.setDate(prevEnd.getDate() - 1);

            filtered = allTransactions.filter(t => t.date === targetIso);

        } else if (currentMode === 'week') {
            const day = d.getDay() || 7;
            d.setDate(d.getDate() - (day - 1));
            start = new Date(d);
            end = new Date(d);
            end.setDate(end.getDate() + 6);
            end.setHours(23, 59, 59, 999);

            // Prev
            prevStart = new Date(start);
            prevStart.setDate(prevStart.getDate() - 7);
            prevEnd = new Date(end);
            prevEnd.setDate(prevEnd.getDate() - 7);

            filtered = allTransactions.filter(t => {
                const tDate = new Date(t.date);
                tDate.setHours(12, 0, 0, 0);
                return tDate >= start && tDate <= end;
            });

        } else if (currentMode === 'month') {
            start = new Date(d.getFullYear(), d.getMonth(), 1);
            end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
            end.setHours(23, 59, 59, 999);

            // Prev
            prevStart = new Date(start);
            prevStart.setMonth(prevStart.getMonth() - 1);
            prevEnd = new Date(prevStart.getFullYear(), prevStart.getMonth() + 1, 0);
            prevEnd.setHours(23, 59, 59, 999);

            filtered = allTransactions.filter(t => {
                const tDate = new Date(t.date);
                tDate.setHours(12, 0, 0, 0);
                return tDate >= start && tDate <= end;
            });
        }
    }

    // 2. Logic to filter by ACCOUNT
    const filterTx = (list) => {
        if (accountFilter !== 'ALL') {
            return list.filter(t => {
                const acc = t.account ? t.account.toUpperCase() : "OTHER";
                if (t.type === "Transfer") {
                    const toAcc = t.toAccount ? t.toAccount.toUpperCase() : "OTHER";
                    return acc === accountFilter || toAcc === accountFilter;
                }
                return acc === accountFilter;
            });
        }
        return list;
    }

    filtered = filterTx(filtered);

    // 3. Comparison Logic (Only if not custom)
    if (currentMode !== 'custom') {
        // Get prev data
        let prevFiltered = allTransactions.filter(t => {
            const tDate = new Date(t.date);
            tDate.setHours(12, 0, 0, 0);
            return tDate >= prevStart && tDate <= prevEnd;
        });
        prevFiltered = filterTx(prevFiltered);

        // Calc Totals
        const curExp = filtered.filter(t => t.type === 'Expense').reduce((s, t) => s + Number(t.amount), 0);
        const prevExp = prevFiltered.filter(t => t.type === 'Expense').reduce((s, t) => s + Number(t.amount), 0);

        const compLabel = document.getElementById('compLabel');
        const compCard = document.getElementById('comparisonCard');

        if (compLabel) {
            if (prevExp === 0) {
                compLabel.innerText = "No prev data";
                compLabel.className = "badge bg-secondary";
            } else {
                const diff = curExp - prevExp;
                const pct = ((diff / prevExp) * 100).toFixed(0);
                if (diff > 0) {
                    compLabel.innerHTML = `<i class="bi bi-arrow-up"></i> \${pct}% more than prev`;
                    compLabel.className = "badge bg-danger text-wrap";
                } else if (diff < 0) {
                    compLabel.innerHTML = `<i class="bi bi-arrow-down"></i> \${Math.abs(pct)}% less than prev`;
                    compLabel.className = "badge bg-success text-wrap";
                } else {
                    compLabel.innerText = "Same as prev";
                    compLabel.className = "badge bg-warning text-dark";
                }
            }
        }
        if (compCard) compCard.style.display = 'block';
    }

    // Save for drill-down
    currentFiltered = filtered;

    // 3. Render Views
    renderOverview(filtered);
    renderTrends(filtered, start, end);
}

function renderOverview(data) {
    let catsInc = {},
        catsExp = {};
    data.forEach(t => {
        const amt = Number(t.amount);
        const type = t.type;
        const cat = t.category || "General";
        if (type === "Income") catsInc[cat] = (catsInc[cat] || 0) + amt;
        else if (type === "Expense") catsExp[cat] = (catsExp[cat] || 0) + amt;
    });
    renderSection('incomeCategoryList', catsInc, 'text-success', '+', 'incomeChartCanvas', 'Income');
    renderSection('expenseCategoryList', catsExp, 'text-danger', '-', 'expenseChartCanvas', 'Expense');
}

function renderTrends(data, startDate, endDate) {
    const dailyData = {};
    const loopDate = new Date(startDate);
    while (loopDate <= endDate) {
        const iso = loopDate.toISOString().split('T')[0];
        dailyData[iso] = {
            income: 0,
            expense: 0
        };
        loopDate.setDate(loopDate.getDate() + 1);
    }

    data.forEach(t => {
        const dateKey = t.date; // YYYY-MM-DD
        if (dailyData[dateKey]) { // Only if in range (should be guaranteed by filter)
            if (t.type === "Income") dailyData[dateKey].income += Number(t.amount);
            else if (t.type === "Expense") dailyData[dateKey].expense += Number(t.amount);
        }
    });

    const labels = Object.keys(dailyData).sort(); // Sort chronological
    const incData = labels.map(d => dailyData[d].income);
    const expData = labels.map(d => dailyData[d].expense);

    // Format labels for chart (e.g., "22 Dec")
    const displayLabels = labels.map(iso => {
        const d = new Date(iso);
        return d.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short'
        });
    });

    const trendCanvas = document.getElementById('trendChartCanvas');
    if (!trendCanvas) return;
    const ctx = trendCanvas.getContext('2d');
    if (trendChart) trendChart.destroy();

    trendChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: displayLabels,
            datasets: [{
                label: 'Income',
                data: incData,
                backgroundColor: '#198754', // Success Green
                borderRadius: 4
            },
            {
                label: 'Expense',
                data: expData,
                backgroundColor: '#dc3545', // Danger Red
                borderRadius: 4
            }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 10
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0,0,0,0.05)'
                    },
                    ticks: {
                        font: {
                            size: 10
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top'
                }
            }
        }
    });
}

// --- Drill Down Logic ---

function showCategoryDetails(category, type) {
    const modalBody = document.getElementById('catModalBody');
    const catModalTitle = document.getElementById('catModalTitle');
    if (catModalTitle) catModalTitle.innerText = `\${category} (\${type})`;
    if (!modalBody) return;
    modalBody.innerHTML = '';

    // Filter from currently displayed transactions
    const txs = currentFiltered.filter(t =>
        t.type === type && (t.category || "General") === category
    );

    txs.sort((a, b) => b.amount - a.amount);

    if (txs.length === 0) {
        modalBody.innerHTML = '<div class="p-4 text-center text-muted">No transactions found.</div>';
    } else {
        let html = '<ul class="list-group list-group-flush">';
        txs.forEach(t => {
            const d = new Date(t.date);
            const dateStr = d.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short'
            });
            const acc = t.account ? ` <span class="badge bg-secondary kv-badge" style="font-size:9px;">\${t.account}</span>` : '';

            html += `
                <li class="list-group-item d-flex justify-content-between align-items-center" style="background:var(--bg-card); color:var(--text-main); border-color:var(--border-color);">
                    <div>
                        <div class="fw-bold small">\${t.description || "No Description"}</div>
                        <div class="text-muted" style="font-size:11px;">\${dateStr}\${acc}</div>
                    </div>
                    <span class="fw-bold \${type === 'Income' ? 'text-success' : 'text-danger'}">
                        \${type === 'Income' ? '+' : '-'}₹\${Number(t.amount).toFixed(2)}
                    </span>
                </li>`;
        });
        html += '</ul>';
        modalBody.innerHTML = html;
    }

    const myModal = new bootstrap.Modal(document.getElementById('categoryModal'));
    myModal.show();
}


function renderSection(listId, data, cls, sign, canvasId, typeLabel) {
    const listDiv = document.getElementById(listId);
    if (!listDiv) return;
    listDiv.innerHTML = "";
    const keys = Object.keys(data);

    if (keys.length === 0) {
        listDiv.innerHTML = `<div class="text-center text-muted small py-3">No \${typeLabel.toLowerCase()} recorded</div>`;
        return;
    }

    const chartContainer = document.createElement('div');
    chartContainer.style.position = 'relative';
    chartContainer.style.height = '200px';
    chartContainer.style.width = '100%';
    chartContainer.style.marginBottom = '20px';
    const canvas = document.createElement('canvas');
    canvas.id = canvasId;
    chartContainer.appendChild(canvas);
    listDiv.appendChild(chartContainer);

    let total = 0;
    keys.forEach(k => total += data[k]);

    keys.forEach(k => {
        const val = data[k];
        const percent = ((val / total) * 100).toFixed(1);

        const row = document.createElement('div');
        row.className = 'cat-row cursor-pointer';
        row.style.cursor = 'pointer';
        row.onclick = () => showCategoryDetails(k, typeLabel);

        row.innerHTML = `
                <div>
                    <span class="fw-semibold small">\${k}</span>
                    <span class="text-muted ms-2" style="font-size:10px;">(\${percent}%)</span>
                </div>
                <span class="\${cls} fw-bold small">\${sign}₹\${val.toFixed(2)} <i class="bi bi-chevron-right text-muted ms-1" style="font-size:10px;"></i></span>
        `;
        listDiv.appendChild(row);
    });

    const totalRow = document.createElement('div');
    totalRow.className = "d-flex justify-content-between px-3 py-2 mt-2 bg-light rounded";
    totalRow.style.background = "var(--bg-input)";
    totalRow.style.border = "1px solid var(--border-color)";

    totalRow.innerHTML = `
            <span class="small fw-bold">TOTAL</span>
            <span class="\${cls} fw-bold small">\${sign}₹\${total.toFixed(2)}</span>
    `;
    listDiv.appendChild(totalRow);

    renderChart(canvasId, keys, data, typeLabel);
}

function renderChart(canvasId, labels, dataObj, label) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dataValues = labels.map(k => dataObj[k]);

    const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
        '#E7E9ED', '#76A346', '#CD5C5C', '#F08080'
    ];

    if (canvasId === 'incomeChartCanvas') {
        if (incomeChart) incomeChart.destroy();
        incomeChart = new Chart(ctx, configChart(labels, dataValues, colors, label));
    } else {
        if (expenseChart) expenseChart.destroy();
        expenseChart = new Chart(ctx, configChart(labels, dataValues, colors, label));
    }
}

function configChart(labels, data, colors, label) {
    return {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 10,
                        font: {
                            size: 10
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let val = context.parsed;
                            let total = context.dataset.data.reduce((a, b) => a + b, 0);
                            let pct = ((val / total) * 100).toFixed(1) + '%';
                            return ` ₹\${val} (\${pct})`;
                        }
                    }
                }
            },
            layout: {
                padding: 10
            },
            onClick: (e, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const category = labels[index];
                    showCategoryDetails(category, label);
                }
            }
        }
    };
}

window.onload = initPage;
