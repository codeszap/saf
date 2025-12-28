const params = new URLSearchParams(window.location.search);
const personId = params.get('id');
const personName = params.get('name');
const myModal = new bootstrap.Modal(document.getElementById('txModal'));

if (personName) {
    const pNameEl = document.getElementById('pName');
    if (pNameEl) pNameEl.innerText = personName;
}

async function loadHistory() {
    if (!personId) return;
    const snap = await db.collection("khata").doc(personId).collection("transactions").orderBy("date", "desc").get();
    let tGet = 0,
        tGive = 0;
    const historyList = document.getElementById('historyList');
    if (historyList) historyList.innerHTML = "";

    snap.forEach(doc => {
        const t = doc.data();
        const id = doc.id;
        const isGet = t.type === 'GET';
        isGet ? tGet += t.amount : tGive += t.amount;

        const wrapper = document.createElement('div');
        wrapper.className = 'swipe-wrapper';
        wrapper.innerHTML = `
        <div class="action-bg"><div class="bg-edit-icon"><i class="bi bi-pencil"></i></div><div class="bg-delete-icon"><i class="bi bi-trash"></i></div></div>
        <div class="history-item" id="item-\${id}">
            <div class="desc-part">
                <div class="h-date">\${new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                <div class="h-desc">\${t.description}</div>
            </div>
            <div class="amt-part"><div class="h-amt \${isGet ? 'text-get' : 'text-give'}">\${isGet ? '+' : '-'} ₹\${t.amount}</div></div>
        </div>`;
        if (historyList) historyList.appendChild(wrapper);
        initSwipe(id, t);
    });

    const totalGetEl = document.getElementById('totalGet');
    const totalGiveEl = document.getElementById('totalGive');
    if (totalGetEl) totalGetEl.innerText = `₹\${tGet}`;
    if (totalGiveEl) totalGiveEl.innerText = `₹\${tGive}`;

    // Net Balance Calculation
    const netBalDiv = document.getElementById('netBalanceDisplay');
    if (netBalDiv) {
        const diff = tGet - tGive;
        if (diff > 0) {
            netBalDiv.innerText = `YOU WILL RECEIVE: ₹\${Math.abs(diff)}`;
            netBalDiv.className = "net-balance bg-receive";
        } else if (diff < 0) {
            netBalDiv.innerText = `YOU NEED TO PAY: ₹\${Math.abs(diff)}`;
            netBalDiv.className = "net-balance bg-pay";
        } else {
            netBalDiv.innerText = `SETTLED UP`;
            netBalDiv.className = "net-balance text-muted border border-secondary";
        }
    }

    await db.collection("khata").doc(personId).update({
        totalGet: tGet,
        totalGive: tGive
    });
}

function initSwipe(id, data) {
    const el = document.getElementById(`item-\${id}`);
    if (!el) return;
    const wrapper = el.closest('.swipe-wrapper');
    const actionBg = wrapper.querySelector('.action-bg');
    const mc = new Hammer(el);

    mc.on("panstart", () => {
        if (actionBg) actionBg.style.visibility = "visible";
    });

    mc.on("panmove", (e) => {
        if (Math.abs(e.deltaX) < 100) el.style.transform = `translateX(\${e.deltaX}px)`;
    });

    mc.on("panend", (e) => {
        el.style.transition = "transform 0.3s ease";
        el.style.transform = "translateX(0px)";
        setTimeout(() => {
            if (actionBg) actionBg.style.visibility = "hidden";
        }, 300);

        if (e.deltaX > 50) openModal(data.type, id, data.amount, data.description, data.date);
        else if (e.deltaX < -50) deleteTx(id);
    });
}

function openModal(type, id = '', amt = '', desc = '', date = '') {
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) modalTitle.innerText = id ? 'Edit Entry' : (type === 'GET' ? 'I Got Cash' : 'I Gave Cash');

    const editIdEl = document.getElementById('editId');
    const txTypeEl = document.getElementById('txType');
    const txAmountEl = document.getElementById('txAmount');
    const txDescEl = document.getElementById('txDesc');
    const txDateEl = document.getElementById('txDate');

    if (editIdEl) editIdEl.value = id;
    if (txTypeEl) txTypeEl.value = type;
    if (txAmountEl) txAmountEl.value = amt;
    if (txDescEl) txDescEl.value = desc;

    // Show/hide delete button
    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) {
        if (id) {
            deleteBtn.style.display = 'block';
        } else {
            deleteBtn.style.display = 'none';
        }
    }

    // Date Setup
    if (txDateEl) {
        if (date) {
            txDateEl.value = date.split('T')[0];
        } else {
            txDateEl.value = new Date().toISOString().split('T')[0];
        }
    }

    myModal.show();
}

function deleteFromModal() {
    const editIdEl = document.getElementById('editId');
    if (editIdEl) {
        const id = editIdEl.value;
        if (id) {
            deleteTx(id);
            myModal.hide();
        }
    }
}

async function saveTransaction() {
    const id = document.getElementById('editId').value;
    const type = document.getElementById('txType').value;
    const amt = Number(document.getElementById('txAmount').value);
    const desc = document.getElementById('txDesc').value;
    const dateStr = document.getElementById('txDate').value;

    if (!amt || !desc || !dateStr) return alert("Please fill all fields");

    const txData = {
        amount: amt,
        description: desc,
        type: type,
        date: new Date(dateStr).toISOString()
    };

    if (id) await db.collection("khata").doc(personId).collection("transactions").doc(id).update(txData);
    else await db.collection("khata").doc(personId).collection("transactions").add(txData);

    myModal.hide();
    loadHistory();
}

async function deleteTx(id) {
    if (confirm("Delete this entry?")) {
        await db.collection("khata").doc(personId).collection("transactions").doc(id).delete();
        loadHistory();
    }
}

window.onload = loadHistory;
