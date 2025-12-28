let recipes = [];
let currentRecipeId = null;
let currentEditIngredientId = null;
let currentSwipeRecipeId = null;
let searchTerm = "";

const ingModal = new bootstrap.Modal(document.getElementById('ingredientModal'));
const renameModal = new bootstrap.Modal(document.getElementById('renameDishModal'));
const detailModal = new bootstrap.Modal(document.getElementById('ingDetailModal'));

let sortableInstance = null;

// Load & Migrate Data
async function initApp() {
    try {
        const snap = await db.collection("recipes").orderBy("date", "desc").get();
        recipes = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // localStorage migration removed as per user request to use Firebase only.

        renderDashboard();
    } catch (e) {
        console.error("Firebase init error:", e);
        const dashboard = document.getElementById('dashboardView');
        if (dashboard) dashboard.innerHTML += `<div class="alert alert-danger m-3">Cloud Storage Error. Check Connection.</div>`;
    }
}

initApp();

window.handleSearch = function () {
    searchTerm = document.getElementById('searchInput').value.toLowerCase();
    renderDashboard();
};

window.openStatsModal = function () {
    document.getElementById('dashboardView').classList.add('hidden');
    document.getElementById('editorView').classList.add('hidden');
    document.getElementById('reportView').classList.remove('hidden');

    const summaryTab = document.getElementById('summary-tab');
    bootstrap.Tab.getInstance(summaryTab)?.show() || new bootstrap.Tab(summaryTab).show();

    const statsList = document.getElementById('reportStatsList');
    if (!statsList) return;
    statsList.innerHTML = "";

    const dishStats = {};
    recipes.forEach(r => {
        const name = r.name.trim();
        const date = r.date ? r.date.split('T')[0] : null;
        if (!dishStats[name]) {
            dishStats[name] = {
                count: 0,
                dates: [],
                weeks: new Set()
            };
        }
        dishStats[name].count++;
        if (date) {
            dishStats[name].dates.push(date);
            const d = new Date(date);
            const week = `\${d.getFullYear()}-W\${getWeekNumber(d)}`;
            dishStats[name].weeks.add(week);
        }
    });

    const sortedStats = Object.entries(dishStats).sort((a, b) => b[1].count - a[1].count);

    if (sortedStats.length === 0) {
        statsList.innerHTML = "<p class='text-center text-muted py-4'>No data yet.</p>";
    } else {
        sortedStats.forEach(([name, data]) => {
            const div = document.createElement('div');
            div.className = "p-3 mb-2 rounded-3 border bg-light-subtle";
            div.style.cursor = "pointer";
            div.onclick = (e) => {
                const detail = div.querySelector('.stats-detail');
                if (detail) detail.classList.toggle('hidden');
            };

            const sortedDates = data.dates.sort((a, b) => b.localeCompare(a));
            const dateTags = sortedDates.map(d => `<span class="badge bg-secondary-subtle text-secondary border me-1 mb-1" style="font-size: 0.7rem;">${new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>`).join('');

            div.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <div class="fw-bold text-primary">${name}</div>
                        <div class="small text-muted">${data.weeks.size} Unique Weeks</div>
                    </div>
                    <div class="badge bg-primary rounded-pill px-3 py-2">${data.count} Times</div>
                </div>
                <div class="stats-detail hidden mt-3 pt-2 border-top">
                    <div class="small fw-bold text-muted mb-2">Previous Dates:</div>
                    <div class="d-flex flex-wrap">${dateTags}</div>
                </div>
            `;
            statsList.appendChild(div);
        });
    }
};

window.renderTimeline = function () {
    const list = document.getElementById('reportTimelineList');
    if (!list) return;
    list.innerHTML = "";

    if (recipes.length === 0) {
        list.innerHTML = "<p class='text-center text-muted py-4'>No history yet.</p>";
        return;
    }

    const months = {};
    const sortedRecipes = [...recipes].sort((a, b) => {
        const dA = a.date ? new Date(a.date) : new Date(0);
        const dB = b.date ? new Date(b.date) : new Date(0);
        return dB - dA;
    });

    sortedRecipes.forEach(r => {
        const d = r.date ? new Date(r.date) : null;
        const monthKey = d ? d.toLocaleDateString('en-IN', {
            month: 'long',
            year: 'numeric'
        }).toUpperCase() : 'UNKNOWN';
        if (!months[monthKey]) months[monthKey] = [];
        months[monthKey].push(r);
    });

    Object.entries(months).forEach(([month, items]) => {
        const header = document.createElement('div');
        header.className = "small fw-bold text-muted mb-2 mt-3 px-2";
        header.innerText = month;
        list.appendChild(header);

        const box = document.createElement('div');
        box.className = "list-group-box mb-3";
        box.style.borderWidth = "1px";

        items.forEach(r => {
            const d = r.date ? new Date(r.date) : null;
            const dateDisplay = d ? d.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short'
            }) : '??';
            const total = (r.ingredients || []).reduce((acc, curr) => acc + (curr.checked ? (parseFloat(curr.price) || 0) : 0), 0);

            const row = document.createElement('div');
            row.className = "d-flex justify-content-between align-items-center p-3 border-bottom border-light";
            row.innerHTML = `
                <div class="d-flex align-items-center gap-2">
                    <span class="badge bg-light text-dark border p-2" style="font-size: 0.65rem; min-width: 45px;">\${dateDisplay}</span>
                    <span class="fw-bold small text-truncate" style="max-width: 140px;">\${r.name}</span>
                </div>
                <span class="text-primary fw-bold small text-nowrap">₹\${total.toLocaleString('en-IN')}</span>
            `;
            box.appendChild(row);
        });
        list.appendChild(box);
    });
};

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
}

function renderDashboard() {
    const container = document.getElementById('recipeHistoryContainer');
    const empty = document.getElementById('listEmptyState');
    if (!container || !empty) return;
    container.innerHTML = "";

    const filtered = recipes.filter(r => r.name.toLowerCase().includes(searchTerm));
    if (filtered.length === 0) {
        empty.classList.remove('hidden');
        return;
    }
    empty.classList.add('hidden');

    const groups = {};
    filtered.forEach(r => {
        const dateKey = r.date ? r.date.split('T')[0] : 'Unknown';
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(r);
    });

    const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    sortedDates.forEach(dateStr => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const d = dateStr !== 'Unknown' ? new Date(dateStr) : null;
        if (d) d.setHours(0, 0, 0, 0);

        let diffDays = 0;
        let displayDate = dateStr;
        let showHeader = false;

        if (dateStr === 'Unknown') {
            displayDate = "Unknown Date";
        } else if (d) {
            const diffTime = d.getTime() - today.getTime();
            diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays > 0) {
                showHeader = true;
                if (diffDays === 1) displayDate = "Tomorrow";
                else {
                    displayDate = d.toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                    });
                }
            }
        }

        if (showHeader) {
            const header = document.createElement('div');
            header.className = "section-header mt-3";
            header.innerHTML = `<span class="section-header-title">${displayDate}</span>`;
            container.appendChild(header);
        }

        const box = document.createElement('div');
        box.className = "list-group-box";

        groups[dateStr].forEach(r => {
            const total = (r.ingredients || []).reduce((acc, curr) => acc + (curr.checked ? (parseFloat(curr.price) || 0) : 0), 0);
            const wrapper = document.createElement('div');
            wrapper.className = "list-item-wrapper";
            wrapper.innerHTML = `
                <div class="swipe-actions">
                    <button class="swipe-btn btn-today" onclick="assignToday(event, '${r.id}')">T</button>
                    <button class="swipe-btn btn-tomorrow" onclick="assignTomorrow(event, '${r.id}')">W</button>
                    <button class="swipe-btn btn-pick" onclick="triggerDatePicker(event, '${r.id}')"><i class="bi bi-calendar-event"></i></button>
                </div>
                <div class="list-item" id="recipe-${r.id}" 
                     onclick="openRecipeDetail('${r.id}')"
                     ontouchstart="handleTouchStart(event, 'recipe-', '${r.id}')"
                     ontouchmove="handleTouchMove(event)"
                     ontouchend="handleTouchEnd(event)">
                    <div class="recipe-item-content">
                        <div class="item-title">${r.name}</div>
                        <div class="item-stats"><span>${(r.ingredients || []).length} items</span></div>
                    </div>
                    <div class="item-total">₹${total.toLocaleString('en-IN')}</div>
                    <i class="bi bi-trash3 action-icon text-danger" onclick="deleteRecipeDirect(event, '${r.id}')"></i>
                </div>
            `;
            box.appendChild(wrapper);
        });
        container.appendChild(box);
    });
}

// SWIPE LOGIC
let touchStartX = 0;
let touchMoveX = 0;
let activeSwipeElement = null;

window.handleTouchStart = function (e, prefix, id) {
    touchStartX = e.touches[0].clientX;
    activeSwipeElement = document.getElementById(prefix + id);
    document.querySelectorAll('.list-item.swiped').forEach(el => {
        if (el !== activeSwipeElement) el.classList.remove('swiped');
    });
};

window.handleTouchMove = function (e) {
    if (!activeSwipeElement) return;
    touchMoveX = e.touches[0].clientX;
};

window.handleTouchEnd = function (e) {
    if (!activeSwipeElement) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (diff > 100) activeSwipeElement.classList.add('swiped');
    else if (diff < -50) activeSwipeElement.classList.remove('swiped');
};

window.assignToday = async function (e, id) {
    e.stopPropagation();
    const r = recipes.find(rec => rec.id === id);
    r.date = new Date().toISOString();
    await db.collection("recipes").doc(id).update({
        date: r.date
    });
    renderDashboard();
};

window.assignTomorrow = async function (e, id) {
    e.stopPropagation();
    const r = recipes.find(rec => rec.id === id);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    r.date = tomorrow.toISOString();
    await db.collection("recipes").doc(id).update({
        date: r.date
    });
    renderDashboard();
};

window.triggerDatePicker = function (e, id) {
    e.stopPropagation();
    currentSwipeRecipeId = id;
    document.getElementById('hiddenDatePicker').showPicker();
};

window.assignCustomDate = async function (val) {
    if (!val) return;
    const r = recipes.find(rec => rec.id === currentSwipeRecipeId);
    r.date = new Date(val).toISOString();
    await db.collection("recipes").doc(currentSwipeRecipeId).update({
        date: r.date
    });
    renderDashboard();
};

window.deleteRecipeDirect = async function (e, id) {
    e.stopPropagation();
    if (!confirm("Delete?")) return;
    await db.collection("recipes").doc(id).delete();
    recipes = recipes.filter(r => r.id !== id);
    renderDashboard();
};

window.createNewRecipe = async function () {
    const data = {
        name: "New Dish",
        ingredients: [],
        date: new Date().toISOString()
    };
    const doc = await db.collection("recipes").add(data);
    recipes.unshift({
        id: doc.id,
        ...data
    });
    openRecipeDetail(doc.id);
    openRenameModal();
};

window.openRecipeDetail = function (id) {
    currentRecipeId = id;
    const r = recipes.find(rec => rec.id === id);
    document.getElementById('activeDishTitle').innerText = r.name;
    renderIngredients();
    document.getElementById('dashboardView').classList.add('hidden');
    document.getElementById('editorView').classList.remove('hidden');
};

window.showDashboard = async function () {
    const toDelete = recipes.filter(r => !r.ingredients || r.ingredients.length === 0);
    for (const r of toDelete) {
        await db.collection("recipes").doc(r.id).delete();
    }
    recipes = recipes.filter(r => r.ingredients && r.ingredients.length > 0);

    renderDashboard();
    document.getElementById('dashboardView').classList.remove('hidden');
    document.getElementById('editorView').classList.add('hidden');
    document.getElementById('reportView').classList.add('hidden');
};

window.openRenameModal = function () {
    const r = recipes.find(rec => rec.id === currentRecipeId);
    const input = document.getElementById('dishNameInput');
    input.value = r.name;
    renameModal.show();
    setTimeout(() => {
        input.focus();
        input.select();
    }, 500);
};

window.saveNewName = async function () {
    const n = document.getElementById('dishNameInput').value.trim();
    if (!n) return;
    const r = recipes.find(rec => rec.id === currentRecipeId);
    r.name = n;
    await db.collection("recipes").doc(currentRecipeId).update({
        name: n
    });
    document.getElementById('activeDishTitle').innerText = n;
    renameModal.hide();
};

window.openAddIngredientModal = function () {
    currentEditIngredientId = null;
    document.getElementById('ingModalTitle').innerText = "Add Ingredients";
    document.getElementById('ingName').value = "";
    document.getElementById('ingPrice').value = "";
    document.getElementById('ingDesc').value = "";
    document.getElementById('addFeedback').classList.add('hidden');
    document.getElementById('modalPreviewSection').classList.add('hidden');
    document.getElementById('modalPreviewList').innerHTML = "";

    document.getElementById('ingModalFooter').innerHTML = `
        <div class="row g-2">
            <div class="col-6">
                <button class="btn btn-primary w-100 rounded-pill fw-bold" onclick="addIngredient()">ADD ITEM</button>
            </div>
            <div class="col-6">
                <button class="btn btn-light w-100 rounded-pill text-muted fw-bold" data-bs-dismiss="modal">DONE</button>
            </div>
        </div>`;
    ingModal.show();
    setTimeout(() => document.getElementById('ingName').focus(), 500);
};

function renderModalPreview() {
    const recipe = recipes.find(rec => rec.id === currentRecipeId);
    const list = document.getElementById('modalPreviewList');
    const section = document.getElementById('modalPreviewSection');

    if (!recipe || recipe.ingredients.length === 0) {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');
    const lastItems = recipe.ingredients.slice(-5).reverse();
    list.innerHTML = lastItems.map(i => `
        <div class="d-flex justify-content-between align-items-center py-1 border-bottom border-light">
            <span class="text-truncate" style="max-width: 150px;">${i.name}</span>
            <span class="text-muted">₹${(i.price || 0).toFixed(0)}</span>
        </div>
    `).join('');
}

window.openEditIngredientModal = function (e, id) {
    e.stopPropagation();
    currentEditIngredientId = id;
    const r = recipes.find(rec => rec.id === currentRecipeId);
    const i = r.ingredients.find(item => item.id === id);
    document.getElementById('ingModalTitle').innerText = "Edit Ingredient";
    document.getElementById('ingName').value = i.name;
    document.getElementById('ingPrice').value = i.price || "";
    document.getElementById('ingDesc').value = i.desc || "";
    document.getElementById('ingModalFooter').innerHTML = `
        <div class="row g-2">
            <div class="col-6">
                <button class="btn btn-primary w-100 rounded-pill fw-bold" onclick="updateIngredient()">SAVE</button>
            </div>
            <div class="col-6">
                <button class="btn btn-light w-100 rounded-pill text-muted fw-bold" data-bs-dismiss="modal">DONE</button>
            </div>
        </div>`;
    ingModal.show();
};

window.viewIngredientDetail = function (e, id) {
    e.stopPropagation();
    const r = recipes.find(rec => rec.id === currentRecipeId);
    const i = r.ingredients.find(item => item.id === id);
    document.getElementById('detailModalTitle').innerText = i.name;
    document.getElementById('detailModalPrice').innerText = i.price > 0 ? `₹\${i.price.toLocaleString('en-IN')}` : '';
    document.getElementById('detailModalDesc').innerText = i.desc || "No additional description added.";
    detailModal.show();
};

window.addIngredient = async function () {
    const n = document.getElementById('ingName').value.trim();
    const p = parseFloat(document.getElementById('ingPrice').value) || 0;
    const d = document.getElementById('ingDesc').value.trim();
    if (!n) return;
    const r = recipes.find(r => r.id === currentRecipeId);
    r.ingredients.push({
        id: Date.now(),
        name: n,
        price: p,
        desc: d,
        checked: false
    });
    await db.collection("recipes").doc(currentRecipeId).update({
        ingredients: r.ingredients
    });
    renderIngredients();
    renderModalPreview();

    const f = document.getElementById('addFeedback');
    f.classList.remove('hidden');
    document.getElementById('ingName').value = "";
    document.getElementById('ingPrice').value = "";
    document.getElementById('ingDesc').value = "";
    document.getElementById('ingName').focus();
    setTimeout(() => f.classList.add('hidden'), 1500);
};

window.updateIngredient = async function () {
    const n = document.getElementById('ingName').value.trim();
    const p = parseFloat(document.getElementById('ingPrice').value) || 0;
    const d = document.getElementById('ingDesc').value.trim();
    const r = recipes.find(rec => rec.id === currentRecipeId);
    const i = r.ingredients.find(item => item.id === currentEditIngredientId);
    i.name = n;
    i.price = p;
    i.desc = d;
    await db.collection("recipes").doc(currentRecipeId).update({
        ingredients: r.ingredients
    });
    renderIngredients();
    ingModal.hide();
};

window.toggleIngredient = async function (id) {
    const r = recipes.find(rec => rec.id === currentRecipeId);
    const i = r.ingredients.find(item => item.id === id);
    i.checked = !i.checked;
    await db.collection("recipes").doc(currentRecipeId).update({
        ingredients: r.ingredients
    });
    renderIngredients();
};

window.deleteRecipeItem = async function (e, id) {
    e.stopPropagation();
    if (!confirm("Delete item?")) return;
    const r = recipes.find(rec => rec.id === currentRecipeId);
    r.ingredients = r.ingredients.filter(i => i.id !== id);
    await db.collection("recipes").doc(currentRecipeId).update({
        ingredients: r.ingredients
    });
    renderIngredients();
};

window.deleteCurrentRecipe = async function () {
    if (!confirm("Delete dish?")) return;
    await db.collection("recipes").doc(currentRecipeId).delete();
    recipes = recipes.filter(r => r.id !== currentRecipeId);
    showDashboard();
};

function renderIngredients() {
    const r = recipes.find(rec => rec.id === currentRecipeId);
    const box = document.getElementById('ingredientListBox');
    const empty = document.getElementById('editorEmptyState');
    if (!box || !empty) return;
    let total = 0;
    box.innerHTML = "";
    if (!r || r.ingredients.length === 0) {
        empty.classList.remove('hidden');
    } else {
        empty.classList.add('hidden');
        r.ingredients.forEach(i => {
            const pr = parseFloat(i.price) || 0;
            if (i.checked) total += pr;
            const wrapper = document.createElement('div');
            wrapper.className = "list-item-wrapper";
            wrapper.innerHTML = `
                <div class="swipe-actions">
                    <button class="swipe-btn btn-edit" onclick="openEditIngredientModal(event, ${i.id})"><i class="bi bi-pencil"></i></button>
                    <button class="swipe-btn btn-delete" onclick="deleteRecipeItem(event, ${i.id})"><i class="bi bi-trash"></i></button>
                </div>
                <div class="list-item ${i.checked ? 'checked' : ''}" 
                     id="ing-${i.id}"
                     data-id="${i.id}"
                     ontouchstart="handleTouchStart(event, 'ing-', '${i.id}')"
                     ontouchmove="handleTouchMove(event)"
                     ontouchend="handleTouchEnd(event)">
                    <div class="drag-handle" onpointerdown="event.stopPropagation()" ontouchstart="event.stopPropagation()"><i class="bi bi-grip-vertical"></i></div>
                    <div class="custom-checkbox" onclick="event.stopPropagation(); toggleIngredient(${i.id})"></div>
                    <div class="recipe-item-content" onclick="viewIngredientDetail(event, ${i.id})">
                        <div class="item-title">${i.name}</div>
                        ${pr > 0 ? `<div class="small text-muted">₹${pr.toFixed(0)}</div>` : ''}
                    </div>
                </div>`;
            box.appendChild(wrapper);
        });
    }
    document.getElementById('currentTotalCost').innerText = total.toLocaleString('en-IN');
    initSortable();
}

function initSortable() {
    const box = document.getElementById('ingredientListBox');
    if (!box) return;
    if (sortableInstance) sortableInstance.destroy();
    sortableInstance = new Sortable(box, {
        handle: '.drag-handle',
        animation: 150,
        onEnd: async function () {
            const r = recipes.find(rec => rec.id === currentRecipeId);
            if (!r) return;

            const newOrderIds = Array.from(box.children).map(child => {
                const item = child.querySelector('.list-item');
                return item ? parseInt(item.getAttribute('data-id')) : null;
            }).filter(id => id !== null);

            // Reconstruct array in new order
            const reordered = [];
            newOrderIds.forEach(id => {
                const item = r.ingredients.find(i => i.id === id);
                if (item) reordered.push(item);
            });

            // Update local model
            r.ingredients = reordered;

            // Feedback
            const costEl = document.getElementById('currentTotalCost');
            const oldText = costEl.innerText;
            costEl.innerText = "...";

            try {
                await db.collection("recipes").doc(currentRecipeId).update({
                    ingredients: r.ingredients
                });
                costEl.innerText = oldText;
            } catch (e) {
                console.error("Sort save failed", e);
                costEl.innerText = "Err";
            }
        }
    });
}
