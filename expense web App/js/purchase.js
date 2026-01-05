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
        renderCategoryFilters();
    } catch (e) {
        console.error("Error loading purchases:", e);
        const purchaseList = document.getElementById('purchaseList');
        if (purchaseList) purchaseList.innerHTML = '<div class="text-center p-5 text-danger">Error loading data</div>';
    }
}

function renderCategoryFilters() {
    const container = document.getElementById('categoryFilters');
    if (!container) return;

    // Get unique tags (not categories)
    const tags = new Set(purchaseData.map(i => i.tag).filter(t => t));

    let html = '';

    // Default "ALL" Chip
    const isAllActive = !currentFilter.startsWith('tag:');
    html += `<div class="filter-chip ${isAllActive ? 'active' : ''}" onclick="setFilter('all', this)">ALL</div>`;

    if (tags.size > 0) {
        // Separator
        html += `<div style="width: 1px; background: var(--border-color); margin: 5px 5px 15px 5px; flex-shrink: 0;"></div>`;

        Array.from(tags).sort().forEach(tag => {
            const safeTag = tag.replace(/'/g, "\\'");
            const isActive = currentFilter === `tag:${tag}`;
            html += `<div class="filter-chip ${isActive ? 'active' : ''}" onclick="toggleTagFilter('${safeTag}', this)">#${tag}</div>`;
        });
    } else {
        // If no tags, and "ALL" is the only chip, no need for "No tags yet" message.
        // html = '<span class="text-muted small ms-2">No tags yet</span>';
    }
    container.innerHTML = html;
}

function toggleTagFilter(tag, el) {
    const filterVal = `tag:${tag}`;
    if (currentFilter === filterVal) {
        // Toggle OFF -> Go back to ALL (or previously selected status? Let's default to ALL)
        setFilter('all');
    } else {
        setFilter(filterVal);
    }
}

function setTabFilter(tab) {
    currentTab = tab;

    // Toggle UI
    const pendingBtn = document.getElementById('tab-pending');
    const historyBtn = document.getElementById('tab-history');

    if (tab === 'pending') {
        pendingBtn.classList.replace('text-muted', 'btn-primary');
        pendingBtn.classList.remove('bg-transparent');

        historyBtn.classList.replace('btn-primary', 'text-muted');
        historyBtn.classList.add('bg-transparent');
    } else {
        historyBtn.classList.replace('text-muted', 'btn-primary');
        historyBtn.classList.remove('bg-transparent');

        pendingBtn.classList.replace('btn-primary', 'text-muted');
        pendingBtn.classList.add('bg-transparent');
    }
    renderItems();
}

function setFilter(filter, el) {
    currentFilter = filter;

    // Update Filter Sheet UI (Standard filters)
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.dataset.filter === filter) {
            btn.classList.add('active', 'btn-dark', 'text-white');
            btn.classList.remove('btn-outline-dark');
        } else {
            btn.classList.remove('active', 'btn-dark', 'text-white');
            btn.classList.add('btn-outline-dark');
        }
    });

    // Update Funnel Icon Indicator
    // Active if filter is NOT 'all' and NOT a tag (since tags are visible top bar)
    // OR should tags count? Tags are "visible" filters. The funnel is for "hidden" filters in the sheet.
    // If I select "Starred" inside sheet, funnel should light up.
    // If I select #DMART, that's visible on screen, so maybe funnel doesn't need to light up?
    // User said "FILTER ICON MELA... INDICATE". Usually implies hidden filters.
    // Let's assume Status Filters (checked, priority etc) trigger the dot.

    const funnelIcon = document.querySelector('.bi-funnel');
    const indicatorDot = document.getElementById('filterIndicatorDot');

    if (indicatorDot) {
        const isStatusFilterActive = ['checked', 'unchecked', 'priority'].includes(filter);
        indicatorDot.style.display = isStatusFilterActive ? 'block' : 'none';
    }

    // Handle Tag visibility
    renderCategoryFilters(); // Re-render tags to update active state
    renderItems();

    // If it was a standard filter click, close the offcanvas? maybe optional.
    // if(el && !filter.startsWith('tag:')) { ... }
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
        const matchesSearch = t.name.toLowerCase().includes(searchTerm) || (t.tag && t.tag.toLowerCase().includes(searchTerm)) || (t.category && t.category.toLowerCase().includes(searchTerm));

        let matchesStatus = true;
        if (currentFilter === 'checked') matchesStatus = (t.isChecked !== false);
        else if (currentFilter === 'unchecked') matchesStatus = (t.isChecked === false);
        else if (currentFilter === 'priority') matchesStatus = t.isPriority;
        else if (currentFilter.startsWith('tag:')) {
            const targetTag = currentFilter.split(':')[1];
            matchesStatus = (t.tag === targetTag);
        }

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

            // Prepare dynamic parts
            const boughtClass = t.isBought ? 'bought-row' : '';
            const checkboxHtml = !t.isBought ? `
                <div class="form-check me-2">
                    <input class="form-check-input item-selector" type="checkbox" data-price="${t.price}" ${t.isChecked !== false ? 'checked' : ''} onchange="toggleCheck('${t.id}', ${t.isChecked !== false})">
                </div>
                <button class="status-btn pending-btn" onclick="toggleStatus('${t.id}', false)" title="Mark as Bought">
                    <i class="bi bi-cart"></i>
                </button>
            ` : '';

            const priorityIcon = t.isPriority ? '<i class="bi bi-star-fill text-warning" style="font-size:12px;"></i>' : '';
            const restoreIcon = t.isBought ? `<i class="bi bi-arrow-counterclockwise text-primary fs-5" style="cursor:pointer;" onclick="toggleStatus('${t.id}', true)" title="Restore to Pending"></i>` : '';

            // Safe quoted strings for function calls
            const safeName = t.name.replace(/'/g, "\\'");
            const safeCat = (t.category || "").replace(/'/g, "\\'"); // Still keep category for transaction logic
            const safeTag = (t.tag || "").replace(/'/g, "\\'");
            const safeAcc = (t.account || "").replace(/'/g, "\\'");

            // Display Tag if available, or Category fallback? User asked for separate field.
            // Let's show Tag badge if present.
            const tagBadge = t.tag ? `<span class="category-badge bg-info text-dark">${t.tag}</span>` : '';
            const catBadge = `<span class="category-badge">${t.category || "OTHER"}</span>`;

            html += `
            <div class="item-row ${boughtClass}">
                ${checkboxHtml}
                
                <div class="info" onclick="openModal('${t.id}', '${safeName}', ${t.price}, '${t.date}', ${t.isPriority}, '${safeCat}', '${safeAcc}', '${safeTag}')">
                    <div class="d-flex align-items-center gap-2">
                        <div class="name text-truncate">${t.name}</div>
                        ${t.isPriority ? '<i class="bi bi-star-fill text-warning flex-shrink-0" style="font-size: 1.1rem; filter: drop-shadow(0px 1px 1px rgba(0,0,0,0.1));"></i>' : ''}
                    </div>
                    <div class="price-line">
                        <span class="price">₹${t.price}</span>
                        ${tagBadge}
                        ${catBadge}
                        <span class="date-badge">${dateStr}</span>
                    </div>
                </div>

                <div class="d-flex align-items-center gap-3">
                    ${restoreIcon}
                    <i class="bi bi-trash text-muted" style="cursor:pointer;" onclick="deleteItem('${t.id}')" title="Delete"></i>
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
    if (totalPriceEl) totalPriceEl.innerText = `₹${total.toLocaleString('en-IN')}`;

    const remainingBalanceEl = document.getElementById('remainingBalance');
    if (remainingBalanceEl) {
        const remaining = currentAvailableBalance - total;
        remainingBalanceEl.innerText = `₹${remaining.toLocaleString('en-IN')}`;
    }
}

function openModal(id = '', name = '', price = '', date = '', isPriority = false, category = 'OTHER', account = 'BANK', tag = '') {
    const modalTitleEl = document.getElementById('modalTitle');
    const editIdEl = document.getElementById('editId');
    const itemNameEl = document.getElementById('itemName');
    const itemPriceEl = document.getElementById('itemPrice');
    const itemDateEl = document.getElementById('itemDate');
    const itemCategoryInputEl = document.getElementById('itemCategoryInput');
    const itemTagInputEl = document.getElementById('itemTagInput');
    const itemAccountInputEl = document.getElementById('itemAccountInput');
    const itemPriorityEl = document.getElementById('itemPriority');

    if (modalTitleEl) modalTitleEl.innerText = id ? 'Edit Item' : 'New Purchase';
    if (editIdEl) editIdEl.value = id;
    if (itemNameEl) itemNameEl.value = name;
    if (itemPriceEl) itemPriceEl.value = price;
    if (itemDateEl) itemDateEl.value = date ? date.split('T')[0] : new Date().toISOString().split('T')[0];

    if (itemCategoryInputEl) itemCategoryInputEl.value = category || 'OTHER';
    if (itemTagInputEl) itemTagInputEl.value = tag || ''; // New Tag Field
    if (itemAccountInputEl) itemAccountInputEl.value = account || 'BANK';

    if (itemPriorityEl) {
        if (isPriority) itemPriorityEl.classList.add('active');
        else itemPriorityEl.classList.remove('active');
    }

    myModal.show();
}

async function saveItem() {
    const id = document.getElementById('editId').value;
    // Force Uppercase
    const name = document.getElementById('itemName').value.trim().toUpperCase();
    const price = document.getElementById('itemPrice').value;
    const date = document.getElementById('itemDate').value;
    const category = document.getElementById('itemCategoryInput').value.trim().toUpperCase();
    const tag = document.getElementById('itemTagInput') ? document.getElementById('itemTagInput').value.trim().toUpperCase() : '';
    const account = document.getElementById('itemAccountInput').value.trim().toUpperCase();
    const isPriority = document.getElementById('itemPriority').classList.contains('active');

    if (!name || !price) return;

    const data = {
        name,
        price: Number(price),
        date: new Date(date).toISOString(),
        category,
        tag, // Save Tag
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
            description: `PURCHASE: ${item.name}`,
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
                descriptions.add(desc.toUpperCase());
            }
            if (data.category) categories.add(data.category);
            if (data.account) accounts.add(data.account);
        });

        const datalist = document.getElementById('itemSuggestions');
        if (datalist) datalist.innerHTML = Array.from(descriptions).map(d => `<option value="${d}">`).join('');

        // --- Tag Suggestions from Purchase Collection ---
        const purchaseSnap = await db.collection("purchase").get();
        const purchaseTags = new Set();
        purchaseSnap.forEach(doc => {
            const d = doc.data();
            if (d.tag) purchaseTags.add(d.tag.toUpperCase());
        });

        const tagDatalist = document.getElementById('tagSuggestions');
        if (tagDatalist) tagDatalist.innerHTML = Array.from(purchaseTags).map(t => `<option value="${t}">`).join('');

        // --- End Tag Suggestions ---

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
        if (availBalanceEl) availBalanceEl.innerText = `₹${currentAvailableBalance.toLocaleString('en-IN')}`;
        calculateSelectedTotal();
    } catch (e) {
        console.error("Error loading balance:", e);
    }
}

window.onload = loadPurchases;
