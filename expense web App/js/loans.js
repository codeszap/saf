const myModal = new bootstrap.Modal(document.getElementById('loanModal'));
let loansData = [];
let currentTab = 'pending';

async function loadLoans() {
    try {
        const snap = await db.collection("loans").orderBy("date", "desc").get();
        loansData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderLoans();
    } catch (e) {
        console.error("Error loading loans:", e);
        document.getElementById('loansList').innerHTML = '<div class="text-center p-5 text-danger">Error loading data</div>';
    }
}

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.loan-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    renderLoans();
}

function renderLoans() {
    let html = "";
    let totalB = 0;

    let filtered = loansData.filter(l => currentTab === 'pending' ? !l.settled : l.settled);

    // --- SMART SORTING ---
    if (currentTab === 'pending') {
        filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else {
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    loansData.forEach(l => {
        if (!l.settled) {
            totalB += Number(l.amount);
        }
    });

    document.getElementById('totalBalance').innerText = `₹${totalB}`;
    document.getElementById('totalEntries').innerText = filtered.length;

    filtered.forEach(l => {
        const dateObj = new Date(l.date);
        const dateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

        // --- DAYS CALCULATION ---
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const targetDate = new Date(l.date);
        targetDate.setHours(0, 0, 0, 0);

        const diffTime = targetDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let daysHtml = "";
        let reminderHtml = "";

        if (!l.settled) {
            if (diffDays === 0) {
                daysHtml = `<span class="days-badge days-future">Today</span>`;
                reminderHtml = `<span class="reminder-badge">🚨 DUE</span>`;
            } else if (diffDays === 1) {
                daysHtml = `<span class="days-badge days-future">Tomorrow</span>`;
                reminderHtml = `<span class="reminder-badge">🔔 REMINDER</span>`;
            } else if (diffDays > 0) {
                daysHtml = `<span class="days-badge days-future">${diffDays} Days Left</span>`;
            } else {
                daysHtml = `<span class="days-badge days-past">${Math.abs(diffDays)} Days Ago</span>`;
                reminderHtml = `<span class="reminder-badge">⚠️ OVERDUE</span>`;
            }
        }

        html += `
        <div class="swipe-container ${l.settled ? 'settled-row' : ''}">
            <div class="swipe-actions">
                <button class="btn-edit" onclick="openModal('${l.id}', '${l.name}', ${l.amount}, '${l.date}', 'Loan', ${l.settled})">Edit</button>
                <button class="btn-delete" onclick="deleteLoan('${l.id}')">Del</button>
            </div>
            <div class="swipe-content">
                <div class="loan-row-inner" style="display: flex; align-items: center; width: 100%; border: 1px solid var(--border-color); border-radius: 16px; padding: 14px; gap: 4px;">
                    <!-- Checkbox -->
                    <input class="loan-selector" type="checkbox" data-price="${l.amount}" ${l.isChecked === true ? 'checked' : ''} onclick="event.stopPropagation(); toggleCheck('${l.id}', ${l.isChecked === true})">

                    <!-- Status Icon -->
                    <div class="status-btn ${l.settled ? 'settled-btn' : 'pending-btn'}" onclick="toggleSettlement(event, '${l.id}', ${l.settled})">
                        <i class="bi ${l.settled ? 'bi-check-all' : 'bi-clock-history'}"></i>
                    </div>

                    <!-- Info -->
                    <div class="loan-info" onclick="openModal('${l.id}', '${l.name}', ${l.amount}, '${l.date}', 'Loan', ${l.settled}, ${l.totalDues || 0}, ${l.currentDue || 1})">
                        <div class="d-flex align-items-center flex-wrap">
                            <span class="loan-name">${l.name}</span>
                            <span class="ms-2 badge bg-info-subtle text-info border border-info-subtle" style="font-size: 9px;">${l.currentDue || 1} / ${l.totalDues || '-'}</span>
                            ${daysHtml}
                            ${reminderHtml}
                        </div>
                        <div class="loan-date">${dateStr}</div>
                    </div>

                    <!-- Right Side: Amount -->
                    <div class="text-end">
                        <div class="loan-amount">₹${l.amount}</div>
                    </div>
                </div>
            </div>
        </div>
        `;
    });

    document.getElementById('totalEntries').innerText = filtered.length;

    renderLoansList(filtered, html);
    calculateSelectedTotal(totalB);
}

function renderLoansList(filtered, html) {
    const listContainer = document.getElementById('loansList');
    listContainer.innerHTML = html || `<div class="text-center p-5 text-muted">No ${currentTab} entries found</div>`;

    // Re-apply swipe listeners
    listContainer.querySelectorAll('.swipe-container').forEach(row => enableSwipe(row));
}

function calculateSelectedTotal(totalB) {
    let selected = 0;
    let count = 0;
    document.querySelectorAll('.loan-selector:checked').forEach(cb => {
        selected += parseFloat(cb.getAttribute('data-price')) || 0;
        count++;
    });
    document.getElementById('selectedTotal').innerText = `₹${selected}`;
    document.getElementById('remainingTotal').innerText = `₹${totalB - selected}`;
}

async function toggleCheck(id, current) {
    if (currentTab === 'pending') {
        // If checking a pending item, move to settled + next month
        await settleLoan(id);
    } else {
        // If in settled tab, just toggle the mark
        await db.collection("loans").doc(id).update({ isChecked: !current });
        loadLoans();
    }
}

function enableSwipe(row) {
    const content = row.querySelector(".swipe-content");
    const actions = row.querySelector(".swipe-actions");
    let startX = 0, moveX = 0;

    content.addEventListener("touchstart", e => {
        startX = e.touches[0].clientX;
        actions.style.visibility = "visible";
    }, { passive: true });

    content.addEventListener("touchmove", e => {
        moveX = e.touches[0].clientX - startX;
        // Limit swipe to width of buttons (140px for 2 buttons)
        if (moveX < 0) content.style.transform = `translateX(${Math.max(moveX, -160)}px)`;
    });

    content.addEventListener("touchend", () => {
        if (moveX < -60) content.style.transform = "translateX(-140px)";
        else {
            content.style.transform = "translateX(0)";
            // Hide actions after animation to prevent accidental clicks
            setTimeout(() => actions.style.visibility = "hidden", 300);
        }
        moveX = 0;
    });
}

function openModal(id = '', name = '', amount = '', date = '', type = 'Loan', settled = false, totalDues = '', currentDue = 1) {
    document.getElementById('modalTitle').innerText = id ? 'Edit Loan' : 'Add Loan';
    document.getElementById('loanId').value = id;
    document.getElementById('personName').value = name;
    document.getElementById('loanAmount').value = amount;
    document.getElementById('loanDate').value = date ? date.split('T')[0] : new Date().toISOString().split('T')[0];
    document.getElementById('loanType').value = type;
    document.getElementById('totalDues').value = totalDues;
    document.getElementById('currentDue').value = currentDue;

    const summaryDiv = document.getElementById('loanSummary');
    if (id && totalDues > 0) {
        summaryDiv.style.display = 'block';
        const d = new Date(date);
        const tD = Number(totalDues);
        const cD = Number(currentDue);
        const amt = Number(amount);

        // Start Date (subtract months based on current due)
        const startD = new Date(d);
        startD.setMonth(startD.getMonth() - (cD - 1));

        // End Date (Start + totalDues - 1 months)
        const endD = new Date(startD);
        endD.setMonth(endD.getMonth() + (tD - 1));

        document.getElementById('summaryStart').innerText = startD.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
        document.getElementById('summaryEnd').innerText = endD.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
        document.getElementById('summaryPaid').innerText = `₹${amt * (cD - 1)}`;
        document.getElementById('summaryPending').innerText = `₹${amt * (tD - (cD - 1))}`;
        document.getElementById('summaryProgress').innerText = `${cD - 1}/${tD}`;
    } else {
        summaryDiv.style.display = 'none';
    }

    const editActions = document.getElementById('editActions');
    const settleBtn = document.getElementById('settleBtn');
    const unsettleBtn = document.getElementById('unsettleBtn');

    if (id) {
        editActions.style.setProperty('display', 'flex', 'important');
        if (settled) {
            settleBtn.style.display = 'none';
            unsettleBtn.style.display = 'block';
        } else {
            settleBtn.style.display = 'block';
            unsettleBtn.style.display = 'none';
        }
    } else {
        editActions.style.setProperty('display', 'none', 'important');
    }

    myModal.show();
}

async function settleLoanFromModal() {
    const id = document.getElementById('loanId').value;
    if (id) {
        await settleLoan(id);
        myModal.hide();
    }
}

async function unsettleLoanFromModal() {
    const id = document.getElementById('loanId').value;
    if (id) {
        if (confirm("Move this loan back to Pending? This will also remove the auto-generated reminder for next month if it exists.")) {
            await restoreLoan(id);
            myModal.hide();
        }
    }
}

async function deleteLoanFromModal() {
    const id = document.getElementById('loanId').value;
    if (id) {
        await deleteLoan(id);
        myModal.hide();
    }
}

async function saveLoan() {
    const id = document.getElementById('loanId').value;
    const name = document.getElementById('personName').value.trim();
    const amount = document.getElementById('loanAmount').value;
    const date = document.getElementById('loanDate').value;
    const type = document.getElementById('loanType').value;
    const totalDues = document.getElementById('totalDues').value;
    const currentDue = document.getElementById('currentDue').value;

    if (!name || !amount) return alert("Fill all fields");

    const data = {
        name,
        amount: Number(amount),
        date: new Date(date).toISOString(),
        type,
        settled: false,
        totalDues: totalDues ? Number(totalDues) : 0,
        currentDue: currentDue ? Number(currentDue) : 1
    };

    if (id) {
        const existing = loansData.find(l => l.id === id);
        data.settled = existing ? existing.settled : false;
        await db.collection("loans").doc(id).update(data);
    } else {
        await db.collection("loans").add(data);
    }

    myModal.hide(); loadLoans();
}

window.toggleSettlement = async function (event, id, isSettled) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    if (isSettled) {
        if (confirm("Move this loan back to Pending? This will also remove the auto-generated reminder for next month if it exists.")) {
            await restoreLoan(id);
        }
    } else {
        await settleLoan(id);
    }
}

async function restoreLoan(id) {
    const loan = loansData.find(l => l.id === id);
    if (!loan) return;

    try {
        // 1. Mark current as NOT settled
        await db.collection("loans").doc(id).update({ settled: false });

        // 2. Find and Delete Next Month Entry
        const oldDate = new Date(loan.date);
        const nextDate = new Date(oldDate);
        nextDate.setMonth(oldDate.getMonth() + 1);
        const nextDateISO = nextDate.toISOString();

        // Look for matching loan: same name, same amount, same next-month date, and still pending
        const nextLoan = loansData.find(l =>
            l.name === loan.name &&
            Number(l.amount) === Number(loan.amount) &&
            l.date === nextDateISO &&
            l.settled === false
        );

        if (nextLoan) {
            await db.collection("loans").doc(nextLoan.id).delete();
            console.log("Deleted auto-generated next month loan:", nextLoan.id);
        }

        loadLoans();
    } catch (e) {
        console.error("Restore failed:", e);
    }
}

window.settleLoan = async function (id) {
    const loan = loansData.find(l => l.id === id);
    if (!loan) return;

    const oldDate = new Date(loan.date);
    const nextDate = new Date(oldDate);
    nextDate.setMonth(oldDate.getMonth() + 1);
    const nextDateStr = nextDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

    if (confirm(`Mark "${loan.name}" as settled? \n\nA new entry for "${nextDateStr}" will be added to your Pending list automatically.`)) {
        try {
            const totalDues = loan.totalDues || 0;
            const currentDue = loan.currentDue || 1;

            // 1. Mark current as settled
            await db.collection("loans").doc(id).update({ settled: true });

            // 2. Generate Next Month Entry (only if more dues left)
            if (totalDues === 0 || currentDue < totalDues) {
                const nextLoan = {
                    name: loan.name,
                    amount: loan.amount,
                    date: nextDate.toISOString(),
                    type: loan.type || 'Loan',
                    settled: false,
                    totalDues: totalDues,
                    currentDue: currentDue + 1,
                    isChecked: false
                };
                await db.collection("loans").add(nextLoan);
            } else {
                alert("Congratulations! All dues for this loan are completed.");
            }

            loadLoans();
        } catch (e) {
            console.error("Settlement failed:", e);
            alert("Error updating loan status.");
        }
    }
}

async function deleteLoan(id) {
    if (confirm("Delete this entry?")) {
        await db.collection("loans").doc(id).delete();
        loadLoans();
    }
}

// --- Advanced Voice Input Logic ---
const voiceFab = document.getElementById("voiceFab");
const voiceStatusOverlay = document.getElementById("voiceStatusOverlay");
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
    voiceFab.style.display = "none";
} else {
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    let isListening = false;

    voiceFab.addEventListener("click", () => {
        if (isListening) recognition.stop();
        else {
            try { recognition.start(); } catch (e) { recognition.stop(); }
        }
    });

    recognition.onstart = () => {
        isListening = true;
        voiceFab.classList.add("listening");
        voiceStatusOverlay.style.display = "block";
        voiceStatusOverlay.innerText = "Listening...";
    };

    recognition.onresult = (event) => {
        isListening = false;
        const text = event.results[0][0].transcript.toLowerCase();
        voiceStatusOverlay.innerText = `Heard: "${text}"`;

        // --- SMART LOAN PARSING ---
        // 1. DATE Detection (Specific Date like 01/02/2026)
        let dateISO = new Date().toISOString().split('T')[0];
        const dateMatch = text.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);

        if (dateMatch) {
            let d = parseInt(dateMatch[1]);
            let m = parseInt(dateMatch[2]) - 1;
            let y = parseInt(dateMatch[3]);
            if (y < 100) y += 2000;
            const parsedDate = new Date(y, m, d);
            if (!isNaN(parsedDate.getTime())) {
                dateISO = parsedDate.toISOString().split('T')[0];
            }
        } else {
            let detectedDate = new Date();
            if (text.includes("yesterday") || text.includes("nethu")) {
                detectedDate.setDate(detectedDate.getDate() - 1);
            } else if (text.includes("day before yesterday") || text.includes("munnathu")) {
                detectedDate.setDate(detectedDate.getDate() - 2);
            }
            dateISO = detectedDate.toISOString().split('T')[0];
        }

        // 2. AMOUNT 
        let textForAmount = text;
        if (dateMatch) textForAmount = text.replace(dateMatch[0], "");
        const amountMatch = textForAmount.match(/\d+/);
        const amount = amountMatch ? amountMatch[0] : "";

        // 3. NAME Cleanup
        let name = text;
        if (dateMatch) name = name.replace(dateMatch[0], "");
        const keywords = ["given", "taken", "lent", "borrowed", "took", "from", "to", "for", "i", "me", "a", "an", "the", "amount", "rupees", "rs", "kuduthen", "vaangunen", "loan", "yesterday", "nethu", "today", "day", "before", "munnathu"];
        keywords.forEach(kw => {
            name = name.replace(new RegExp(`\\b${kw}\\b`, 'g'), "");
        });
        name = name.replace(/\d+/g, "").trim();

        if (name || amount) {
            openModal('', name.toUpperCase(), amount || '', dateISO, 'Loan');
        }

        setTimeout(() => { if (!isListening) voiceStatusOverlay.style.display = "none"; }, 3000);
    };

    recognition.onend = () => {
        isListening = false;
        voiceFab.classList.remove("listening");
    };
}

let reportSortOrder = 'desc'; // 'desc' (high to low) or 'asc' (low to high)
let reportViewMode = 'cards'; // 'cards' or 'table'

function setReportView(view) {
    reportViewMode = view;
    document.getElementById('btnViewCards').classList.toggle('active', view === 'cards');
    document.getElementById('btnViewTable').classList.toggle('active', view === 'table');
    showReport();
}

function toggleReportSort() {
    reportSortOrder = reportSortOrder === 'desc' ? 'asc' : 'desc';
    const sortBtn = document.getElementById('reportSortBtn');
    sortBtn.className = reportSortOrder === 'desc' ? 'bi bi-sort-numeric-down fs-4' : 'bi bi-sort-numeric-up fs-4';
    showReport();
}

function showReport() {
    const overlay = document.getElementById('loanReportOverlay');
    const reportContent = document.getElementById('reportContent');
    reportContent.innerHTML = '<div class="text-center p-4">Generating Report...</div>';

    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    const summary = {};
    let grandTotal = 0;
    let grandPaid = 0;
    let grandPending = 0;
    let grandMonthly = 0;

    loansData.forEach(loan => {
        const name = loan.name.trim().toUpperCase();
        if (!summary[name]) {
            summary[name] = {
                name: loan.name,
                amount: loan.amount,
                totalDues: loan.totalDues || 0,
                latestDue: loan.currentDue || 1,
                isSettled: loan.settled
            };
        }

        if (loan.currentDue > summary[name].latestDue) {
            summary[name].latestDue = loan.currentDue;
            summary[name].isSettled = loan.settled;
        } else if (loan.currentDue === summary[name].latestDue && loan.settled) {
            summary[name].isSettled = true;
        }
    });

    // Convert to array and calculate values for sorting
    const reportData = Object.keys(summary).map(key => {
        const s = summary[key];
        let totalVal = 0;
        let paidVal = 0;
        let pendingVal = 0;

        if (s.totalDues > 0) {
            totalVal = s.amount * s.totalDues;
            const paidCount = s.isSettled ? s.latestDue : s.latestDue - 1;
            paidVal = s.amount * paidCount;
            pendingVal = totalVal - paidVal;
        } else {
            totalVal = s.amount;
            paidVal = s.isSettled ? s.amount : 0;
            pendingVal = s.isSettled ? 0 : s.amount;
        }

        return { ...s, totalVal, paidVal, pendingVal };
    });

    // Apply Sorting
    reportData.sort((a, b) => {
        return reportSortOrder === 'desc' ? b.totalVal - a.totalVal : a.totalVal - b.totalVal;
    });

    let itemsHtml = '';

    if (reportData.length === 0) {
        itemsHtml = '<div class="text-center p-5 text-muted">No loans found to generate report.</div>';
    } else {
        if (reportViewMode === 'cards') {
            reportData.forEach(s => {
                grandTotal += s.totalVal;
                grandPaid += s.paidVal;
                grandPending += s.pendingVal;
                if (s.pendingVal > 0) grandMonthly += s.amount;

                const progress = s.totalDues > 0 ? (s.isSettled ? s.latestDue : s.latestDue - 1) : (s.isSettled ? 1 : 0);
                const totalSteps = s.totalDues > 0 ? s.totalDues : 1;
                const percent = Math.min(100, (progress / totalSteps) * 100);

                itemsHtml += `
                <div class="report-card">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div>
                            <div class="fw-bold text-primary fs-5">${s.name}</div>
                            <div class="small text-muted">${s.totalDues > 0 ?\`Monthly Loan (\${s.totalDues} Dues)\` : 'One-time Loan'}</div>
                        </div>
                        <div class="badge \${s.pendingVal === 0 ? 'bg-success' : 'bg-warning'} rounded-pill">
                            \${s.pendingVal === 0 ? 'COMPLETED' : 'ACTIVE'}
                        </div>
                    </div>
                    
                    <div class="progress mb-3" style="height: 6px; background: var(--bg-card);">
                        <div class="progress-bar bg-primary" role="progressbar" style="width: \${percent}%; border-radius: 6px;"></div>
                    </div>

                    <div class="report-grid">
                        <div class="report-item">
                            <div class="report-label">Monthly EMI</div>
                            <div class="report-value text-primary">₹\${s.amount.toLocaleString()}</div>
                        </div>
                        <div class="report-item">
                            <div class="report-label">Total Loan</div>
                            <div class="report-value">₹\${s.totalVal.toLocaleString()}</div>
                        </div>
                        <div class="report-item">
                            <div class="report-label">Remaining</div>
                            <div class="report-value text-danger">₹\${s.pendingVal.toLocaleString()}</div>
                        </div>
                        <div class="report-item">
                            <div class="report-label">Dues Progress</div>
                            <div class="report-value">\${progress}/\${totalSteps}</div>
                        </div>
                    </div>
                </div>
                `;
            });
        } else {
            // Render Table Mode
            itemsHtml = \`
            <div class="table-responsive">
                <table class="report-table">
                    <thead>
                        <tr>
                            <th style="width: 25%;">Name</th>
                            <th class="text-center">Monthly</th>
                            <th class="text-center">Dues</th>
                            <th class="text-end">Remain</th>
                            <th class="text-end">Total</th>
                        </tr>
                    </thead>
                    <tbody>
            \`;

            reportData.forEach(s => {
                grandTotal += s.totalVal;
                grandPaid += s.paidVal;
                grandPending += s.pendingVal;
                if (s.pendingVal > 0) grandMonthly += s.amount;

                const progress = s.totalDues > 0 ? (s.isSettled ? s.latestDue : s.latestDue - 1) : (s.isSettled ? 1 : 0);
                const totalSteps = s.totalDues > 0 ? s.totalDues : 1;

                itemsHtml += \`
                <tr>
                    <td>
                        <div class="text-primary text-truncate" style="max-width: 70px;">\${s.name}</div>
                    </td>
                    <td class="text-center" style="font-size: 10px;">₹\${s.amount.toLocaleString()}</td>
                    <td class="text-center">
                        <span class="badge bg-light text-dark border" style="font-size: 9px; font-weight: 800; padding: 3px 6px;">
                            \${progress}/\${totalSteps}
                        </span>
                    </td>
                    <td class="text-end text-danger" style="font-size: 10px;">₹\${s.pendingVal.toLocaleString()}</td>
                    <td class="text-end" style="font-size: 10px; opacity: 0.7;">₹\${s.totalVal.toLocaleString()}</td>
                </tr>
                \`;
            });

            itemsHtml += \`
                    </tbody>
                </table>
            </div>
            \`;
        }
    }

    const headerHtml = \`
        <div class="report-card mb-4" style="background: linear-gradient(135deg, var(--primary-color), #a855f7); border: none;">
            <div class="row text-center g-0">
                <div class="col-12 mb-3">
                    <div class="text-white opacity-75 text-uppercase" style="font-size: 10px; font-weight: 800; letter-spacing: 1px;">Overall Progress</div>
                </div>
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center px-3 mb-1">
                        <div class="text-white opacity-75" style="font-size: 10px; font-weight: 700;">TOTAL PAID: ₹\${grandPaid.toLocaleString()}</div>
                        <div class="text-white fw-bold" style="font-size: 10px;">\${Math.round((grandPaid / grandTotal * 100) || 0)}% Done</div>
                    </div>
                    <div class="progress mx-3" style="height: 6px; background: rgba(255,255,255,0.2); border-radius: 10px;">
                        <div class="progress-bar bg-white" style="width: \${(grandPaid / grandTotal * 100) || 0}%; border-radius: 10px;"></div>
                    </div>
                </div>
            </div>
        </div>
        <h6 class="fw-bold mb-3 px-1">Detailed Breakdown</h6>
    \`;

    const footerHtml = \`
        <div class="row text-center g-0">
            <div class="col-4 border-end border-color">
                <div class="report-label" style="font-size: 8px;">Monthly EMI</div>
                <div class="fw-bold text-primary" style="font-size: 13px;">₹\${grandMonthly.toLocaleString()}</div>
            </div>
            <div class="col-4 border-end border-color">
                <div class="report-label" style="font-size: 8px;">Remaining</div>
                <div class="fw-bold text-danger" style="font-size: 13px;">₹\${grandPending.toLocaleString()}</div>
            </div>
            <div class="col-4">
                <div class="report-label" style="font-size: 8px;">Total Loan</div>
                <div class="fw-bold text-main" style="font-size: 13px;">₹\${grandTotal.toLocaleString()}</div>
            </div>
        </div>
    \`;

    reportContent.innerHTML = headerHtml + itemsHtml;
    document.getElementById('reportFooter').innerHTML = footerHtml;
}

function hideReport() {
    document.getElementById('loanReportOverlay').style.display = 'none';
    document.body.style.overflow = 'auto'; // Restore scroll
}

window.onload = loadLoans;
