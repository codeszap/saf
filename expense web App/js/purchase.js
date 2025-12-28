const myModal = new bootstrap.Modal(document.getElementById('itemModal'));
let purchaseData = [];
let currentTab = 'pending';
let searchTerm = '';
let currentFilter = 'all';
let currentAvailableBalance = 0;

async function loadPurchases() {
    try {
        // Initialize suggestions & Balance
        loadTransactionSuggestions();
        loadAvailableBalance();

        const snap = await db.collection("purchase").orderBy("date", "desc").get();
        purchaseData = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        renderItems();
    } catch (e) {
        console.error("Error loading purchases:", e);
        const purchaseList = document.getElementById('purchaseList');
        if (purchaseList) purchaseList.innerHTML = '<div class="text-center p-5 text-danger">Error loading data</div>';
    }
}

function setTabFilter(tab, el) {
    currentTab = tab;
    document.querySelectorAll('.tab-chip').forEach(c => c.classList.remove('active'));
    if (el) el.classList.add('active');
    renderItems();
}

function setFilter(filter, el) {
    currentFilter = filter;
    document.querySelectorAll('.filter-chip:not(.tab-chip)').forEach(c => c.classList.remove('active'));
    if (el) el.classList.add('active');
    renderItems();
}

function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchTerm = searchInput.value.toLowerCase();
        renderItems();
    }
}

function renderItems() {
    let html = "";

    let filtered = purchaseData.filter(t => {
        const matchesTab = currentTab === 'pending' ? !t.isBought : t.isBought;
        const matchesSearch = t.name.toLowerCase().includes(searchTerm) || (t.category && t.category.toLowerCase().includes(searchTerm));

        let matchesStatus = true;
        if (currentFilter === 'checked') matchesStatus = (t.isChecked !== false);
        else if (currentFilter === 'unchecked') matchesStatus = (t.isChecked === false);
        else if (currentFilter === 'priority') matchesStatus = t.isPriority;

        return matchesTab && matchesSearch && matchesStatus;
    });

    const sortedData = filtered.sort((a, b) => {
        if (a.isChecked !== b.isChecked) return a.isChecked ? -1 : 1;
        if (a.isPriority !== b.isPriority) return a.isPriority ? -1 : 1;
        return 0;
    });

    const totalBought = purchaseData.filter(i => i.isBought).length;
    const boughtCountEl = document.getElementById('boughtCount');
    if (boughtCountEl) boughtCountEl.innerText = totalBought;

    if (sortedData.length > 0) {
        html = '<div class="list-container">';
        sortedData.forEach(t => {
            const dateStr = new Date(t.date).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short'
            });

            html += `
            <div class="item-row \${t.isBought ? 'bought-row' : ''}">
                \${!t.isBought ? `
                < div class="form-check me-2" >
                    <input class="form-check-input item-selector" type="checkbox" data-price="\${t.price}" \${t.isChecked !== false ? 'checked' : ''} onchange="toggleCheck('\${t.id}', \${t.isChecked !== false})">
                </div>
                
                <button class="status-btn pending-btn" onclick="toggleStatus('\${t.id}', false)" title="Mark as Bought">
                    <i class="bi bi-cart"></i>
                </button>
            ` : ''}
                
                <div class="info" onclick="openModal('\${t.id}', '\${t.name}', \${t.price}, '\${t.date}', \${t.isPriority}, '\${t.category || ""}', '\${t.account || ""}')">
                    <div class="d-flex align-items-center gap-2">
                        <div class="name">\${t.name}</div>
                        \${t.isPriority ? '<i class="bi bi-star-fill text-warning" style="font-size:12px;"></i>' : ''}
                    </div>
                    <div class="price-line">
                        <span class="price">₹\${t.price}</span>
                        <span class="category-badge">\${t.category || "OTHER"}</span>
                        <span class="date-badge">\${dateStr}</span>
                    </div>
                </div>

                <div class="d-flex align-items-center gap-3">
                    \${t.isBought ? `< i class="bi bi-arrow-counterclockwise text-primary fs-5" style = "cursor:pointer;" onclick = "toggleStatus('\${t.id}', true)" title = "Restore to Pending" ></i > ` : ''}
                    <i class="bi bi-trash text-muted" style="cursor:pointer;" onclick="deleteItem('\${t.id}')" title="Delete"></i>
                </div>
            </div>
        `;
        });
        html += '</div>';
    } else {
        html = '<div class="text-center p-5 text-muted">No items found.</div>';
    }

    const purchaseListEl = document.getElementById('purchaseList');
    if (purchaseListEl) purchaseListEl.innerHTML = html;
    calculateSelectedTotal();
}

function calculateSelectedTotal() {
    let total = 0;
    document.querySelectorAll('.item-selector:checked').forEach(cb => {
        total += parseFloat(cb.getAttribute('data-price')) || 0;
    });

    const totalPriceEl = document.getElementById('totalPrice');
    if (totalPriceEl) totalPriceEl.innerText = `₹\${total}`;

    const remainingBalanceEl = document.getElementById('remainingBalance');
    if (remainingBalanceEl) {
        const remaining = currentAvailableBalance - total;
        remainingBalanceEl.innerText = `₹\${remaining.toLocaleString('en-IN')}`;
    }
}

function openModal(id = '', name = '', price = '', date = '', isPriority = false, category = 'OTHER', account = 'BANK') {
    const modalTitleEl = document.getElementById('modalTitle');
    const editIdEl = document.getElementById('editId');
    const itemNameEl = document.getElementById('itemName');
    const itemPriceEl = document.getElementById('itemPrice');
    const itemDateEl = document.getElementById('itemDate');
    const itemCategoryInputEl = document.getElementById('itemCategoryInput');
    const itemAccountInputEl = document.getElementById('itemAccountInput');
    const itemPriorityEl = document.getElementById('itemPriority');

    if (modalTitleEl) modalTitleEl.innerText = id ? 'Edit Item' : 'New Purchase';
    if (editIdEl) editIdEl.value = id;
    if (itemNameEl) itemNameEl.value = name;
    if (itemPriceEl) itemPriceEl.value = price;
    if (itemDateEl) itemDateEl.value = date ? date.split('T')[0] : new Date().toISOString().split('T')[0];

    if (itemCategoryInputEl) itemCategoryInputEl.value = category || 'OTHER';
    if (itemAccountInputEl) itemAccountInputEl.value = account || 'BANK';

    if (itemPriorityEl) {
        if (isPriority) itemPriorityEl.classList.add('active');
        else itemPriorityEl.classList.remove('active');
    }

    myModal.show();
}

async function saveItem() {
    const id = document.getElementById('editId').value;
    const name = document.getElementById('itemName').value;
    const price = document.getElementById('itemPrice').value;
    const date = document.getElementById('itemDate').value;
    const category = document.getElementById('itemCategoryInput').value;
    const account = document.getElementById('itemAccountInput').value;
    const isPriority = document.getElementById('itemPriority').classList.contains('active');

    if (!name || !price) return;

    const data = {
        name,
        price: Number(price),
        date: new Date(date).toISOString(),
        category,
        account,
        isPriority
    };

    if (id) await db.collection("purchase").doc(id).update(data);
    else await db.collection("purchase").add({
        ...data,
        isBought: false,
        isChecked: false
    });

    myModal.hide();
    loadPurchases();
}

async function toggleStatus(id, current) {
    const item = purchaseData.find(i => i.id === id);
    if (!item) return;

    const newStatus = !current;
    const updateData = {
        isBought: newStatus,
        isChecked: !newStatus
    };

    if (newStatus === true) {
        const transactionData = {
            amount: Number(item.price),
            category: item.category || "OTHER",
            description: `PURCHASE: \${item.name}`,
            account: item.account || "BANK",
            date: new Date().toISOString().split('T')[0],
            type: "Expense",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            const txRef = await db.collection("transactions").add(transactionData);
            updateData.lastTransactionId = txRef.id;
        } catch (e) {
            console.error("Auto-add failed:", e);
        }
    } else {
        if (item.lastTransactionId) {
            updateData.lastTransactionId = firebase.firestore.FieldValue.delete();
        }
    }

    await db.collection("purchase").doc(id).update(updateData);
    if (!newStatus) {
        location.reload();
    } else {
        loadPurchases();
    }
}

async function toggleCheck(id, current) {
    await db.collection("purchase").doc(id).update({
        isChecked: !current
    });
    loadPurchases();
}

async function deleteItem(id) {
    if (confirm("Remove?")) {
        await db.collection("purchase").doc(id).delete();
        loadPurchases();
    }
}

async function confirmClear() {
    if (confirm("Clear all items?")) {
        const snap = await db.collection("purchase").get();
        const batch = db.batch();
        snap.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        loadPurchases();
    }
}

async function loadTransactionSuggestions() {
    try {
        const snap = await db.collection("transactions").get();
        const descriptions = new Set();
        const categories = new Set();
        const accounts = new Set();

        snap.forEach(doc => {
            const data = doc.data();
            if (data.description) {
                let desc = data.description.replace(/^PURCHASE: /i, '');
                descriptions.add(desc);
            }
            if (data.category) categories.add(data.category);
            if (data.account) accounts.add(data.account);
        });

        const datalist = document.getElementById('itemSuggestions');
        if (datalist) datalist.innerHTML = Array.from(descriptions).map(d => `<option value="\${d}">`).join('');

        const categoryOptions = document.getElementById('categoryOptions');
        if (categoryOptions) {
            const existingCats = Array.from(categoryOptions.querySelectorAll('.option-item')).map(o => o.getAttribute('data-value'));
            categories.forEach(cat => {
                if (cat && !existingCats.includes(cat)) {
                    const div = document.createElement('div');
                    div.className = 'option-item';
                    div.setAttribute('data-value', cat);
                    div.innerText = cat;
                    categoryOptions.appendChild(div);
                }
            });
        }

        const accountOptions = document.getElementById('accountOptions');
        if (accountOptions) {
            const existingAccs = Array.from(accountOptions.querySelectorAll('.option-item')).map(o => o.getAttribute('data-value'));
            accounts.forEach(acc => {
                if (acc && !existingAccs.includes(acc)) {
                    const div = document.createElement('div');
                    div.className = 'option-item';
                    div.setAttribute('data-value', acc);
                    div.innerText = acc;
                    accountOptions.appendChild(div);
                }
            });
        }

        initSearchableDropdowns();

    } catch (e) {
        console.error("Error loading transaction suggestions:", e);
    }
}

function initSearchableDropdowns() {
    const dropdowns = document.querySelectorAll('.searchable-dropdown');

    dropdowns.forEach(dropdown => {
        const input = dropdown.querySelector('input');
        const list = dropdown.querySelector('.options-list');
        const items = list.querySelectorAll('.option-item');

        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);

        newInput.addEventListener('focus', () => {
            list.classList.add('show');
        });

        newInput.addEventListener('input', () => {
            const filter = newInput.value.toLowerCase();
            items.forEach(item => {
                const text = item.innerText.toLowerCase();
                item.style.display = text.includes(filter) ? 'block' : 'none';
            });
            list.classList.add('show');
        });

        items.forEach(item => {
            item.addEventListener('click', () => {
                newInput.value = item.getAttribute('data-value');
                list.classList.remove('show');
            });
        });
    });
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('.searchable-dropdown')) {
        document.querySelectorAll('.options-list').forEach(l => l.classList.remove('show'));
    }
});

async function loadAvailableBalance() {
    try {
        const snap = await db.collection("transactions").get();
        let bank = 0,
            cash = 0,
            others = 0;
        snap.forEach(doc => {
            const t = doc.data();
            const amt = parseFloat(t.amount) || 0;
            const acc = (t.account || "OTHERS").toUpperCase();
            if (t.type === "Income") {
                if (acc === "BANK") bank += amt;
                else if (acc === "CASH") cash += amt;
                else others += amt;
            } else if (t.type === "Expense") {
                if (acc === "BANK") bank -= amt;
                else if (acc === "CASH") cash -= amt;
                else others -= amt;
            } else if (t.type === "Transfer") {
                const toAcc = (t.toAccount || "").toUpperCase();
                if (acc === "BANK") bank -= amt;
                else if (acc === "CASH") cash -= amt;
                else others -= amt;
                if (toAcc === "BANK") bank += amt;
                else if (toAcc === "CASH") cash += amt;
                else others += amt;
            }
        });
        currentAvailableBalance = bank + cash + others;
        const availBalanceEl = document.getElementById('availBalance');
        if (availBalanceEl) availBalanceEl.innerText = `₹\${currentAvailableBalance.toLocaleString('en-IN')}`;
        calculateSelectedTotal();
    } catch (e) {
        console.error("Error loading balance:", e);
    }
}

window.onload = loadPurchases;
