let currentMode = localStorage.getItem('activeView') || 'timeline';
let activeTab = 'Today';
let collapsedGroups = new Set(JSON.parse(localStorage.getItem('collapsedGroups') || '["Yesterday", "Tomorrow"]'));
let openSubtasks = new Set();

window.toggleModal = (s) => {
    const taskModal = document.getElementById('taskModal');
    if (taskModal) taskModal.classList.toggle('open', s);
    if (s) {
        const dateInput = document.getElementById('taskDateInput');
        if (dateInput) dateInput.valueAsDate = new Date();
    }
};

window.appendSubField = () => {
    const input = document.createElement('input');
    input.className = 'sub-entry';
    input.placeholder = "Next...";
    const subTaskFields = document.getElementById('subTaskFields');
    if (subTaskFields) subTaskFields.appendChild(input);
};

window.switchMainView = function (mode) {
    currentMode = mode;
    localStorage.setItem('activeView', mode);
    const btnTimeline = document.getElementById('btnTimeline');
    const btnTabs = document.getElementById('btnTabs');
    const tabBar = document.getElementById('tabBar');
    const viewTitle = document.getElementById('viewTitle');

    if (btnTimeline) btnTimeline.classList.toggle('active', mode === 'timeline');
    if (btnTabs) btnTabs.classList.toggle('active', mode === 'tabs');
    if (tabBar) tabBar.style.display = (mode === 'tabs') ? 'flex' : 'none';
    if (viewTitle) viewTitle.innerText = (mode === 'timeline') ? 'Timeline' : 'Calendar';
    loadTodos();
};

window.setTabFilter = function (tab) {
    activeTab = tab;
    document.querySelectorAll('.tab-item').forEach(el => el.classList.remove('active'));
    const tabEl = document.getElementById('tab-' + tab.toLowerCase());
    if (tabEl) tabEl.classList.add('active');
    loadTodos();
};

window.loadTodos = async function () {
    try {
        const snap = await db.collection("todos").orderBy("createdAt", "asc").get();
        const list = document.getElementById('todoList');
        if (!list) return;
        list.innerHTML = "";
        let groups = {};
        let tabStats = {
            Yesterday: {
                d: 0,
                t: 0
            },
            Today: {
                d: 0,
                t: 0
            },
            Tomorrow: {
                d: 0,
                t: 0
            }
        };

        snap.forEach(doc => {
            const data = doc.data();
            const label = getDayLabel(data.createdAt);
            const subs = data.subTasks || [];
            const doneSubs = subs.filter(s => s.done).length;
            const totalSubs = subs.length;
            const isDone = data.completed || (totalSubs > 0 && totalSubs === doneSubs);

            if (tabStats[label]) {
                tabStats[label].t++;
                if (isDone) tabStats[label].d++;
            }
            if (currentMode === 'tabs' && label !== activeTab) return;

            if (!groups[label]) groups[label] = [];
            groups[label].push({
                id: doc.id,
                ...data,
                isDone,
                doneSubs,
                totalSubs
            });
        });

        for (let key in tabStats) {
            const el = document.getElementById(`count-\${key}`);
            if (el) el.innerText = `\${tabStats[key].d}/\${tabStats[key].t}`;
        }

        for (let label in groups) {
            const isCollapsed = collapsedGroups.has(label) && currentMode === 'timeline';
            const groupDiv = document.createElement('div');
            groupDiv.className = 'date-group';
            groupDiv.innerHTML = (currentMode === 'timeline' ? `
            <div class="group-header" onclick="toggleDateGroup('\${label}')">
                <span>\${label}</span>
                <div class="d-flex align-items-center">
                    <span class="header-stats me-2">\${groups[label].filter(t => t.isDone).length}/\${groups[label].length}</span>
                    <i class="bi bi-chevron-\${isCollapsed ? 'expand' : 'collapse'}"></i>
                </div>
            </div>` : '') +
                `<div class="group-content \${!isCollapsed ? 'show' : ''}">` +
                groups[label].map(todo => `
                <div class="todo-item-row">
                    <div class="delete-reveal" onclick="deleteTodo('\${todo.id}')"><i class="bi bi-trash3"></i></div>
                    <div class="todo-card-content" id="card-\${todo.id}" onclick="toggleSubView('\${todo.id}')">
                        <div class="check-box \${todo.isDone ? 'done' : ''}" onclick="event.stopPropagation(); toggleMainTodo('\${todo.id}', \${todo.isDone})">
                            \${todo.isDone ? '<i class="bi bi-check text-white" style="font-size:14px"></i>' : ''}
                        </div>
                        <div class="todo-text \${todo.isDone ? 'done' : ''}">\${todo.title}</div>
                        \${todo.totalSubs > 0 ? `< div class= "sub-badge" >\${ todo.doneSubs } /\${ todo.totalSubs }</div > ` : ''}
                    </div>
                    <div class="sub-task-container" id="list-\${todo.id}" style="display: \${openSubtasks.has(todo.id) ? 'block' : 'none'}">
                        \${(todo.subTasks || []).map((st, idx) => `< div class= "sub-item" onclick = "toggleSubItem('\${todo.id}', \${idx})" ><div class="sub-dot \${st.done ? 'done' : ''}"></div><div>\${st.text}</div></div > `).join('')}
                    </div>
                </div>`).join('') + `</div>`;
            list.appendChild(groupDiv);
            groups[label].forEach(t => setupSwipe(t.id));
        }
    } catch (e) {
        console.error(e);
    }
};

window.toggleDateGroup = (l) => {
    if (collapsedGroups.has(l)) collapsedGroups.delete(l);
    else collapsedGroups.add(l);
    localStorage.setItem('collapsedGroups', JSON.stringify(Array.from(collapsedGroups)));
    loadTodos();
};
window.toggleSubView = (id) => {
    const c = document.getElementById(`list-\${id}`);
    if (!c) return;
    if (c.style.display === 'none') {
        c.style.display = 'block';
        openSubtasks.add(id);
    } else {
        c.style.display = 'none';
        openSubtasks.delete(id);
    }
};
window.toggleMainTodo = async (id, s) => {
    await db.collection("todos").doc(id).update({
        completed: !s
    });
    loadTodos();
};
window.toggleSubItem = async (tId, sIdx) => {
    const d = await db.collection("todos").doc(tId).get();
    const data = d.data();
    data.subTasks[sIdx].done = !data.subTasks[sIdx].done;
    await db.collection("todos").doc(tId).update({
        subTasks: data.subTasks
    });
    loadTodos();
};
window.deleteTodo = async (id) => {
    if (confirm("Delete?")) {
        await db.collection("todos").doc(id).delete();
        loadTodos();
    }
};

window.saveTask = async () => {
    const title = document.getElementById('mainTaskInput').value;
    const dateStr = document.getElementById('taskDateInput').value;
    const subInputs = document.querySelectorAll('.sub-entry');

    if (!title) {
        alert("Task name kudu bro!");
        return;
    }

    const subTasks = [];
    subInputs.forEach(i => {
        if (i.value.trim()) subTasks.push({
            text: i.value,
            done: false
        });
    });

    try {
        const selectedDate = new Date(dateStr);
        selectedDate.setHours(0, 0, 0, 0);
        await db.collection("todos").add({
            title: title,
            completed: false,
            subTasks: subTasks,
            createdAt: firebase.firestore.Timestamp.fromDate(selectedDate)
        });
        document.getElementById('mainTaskInput').value = "";
        const subTaskFields = document.getElementById('subTaskFields');
        if (subTaskFields) subTaskFields.innerHTML = '<input type="text" class="sub-entry" placeholder="Add step">';
        toggleModal(false);
        loadTodos();
    } catch (e) {
        console.error(e);
    }
};

function getDayLabel(ts) {
    if (!ts) return "Today";
    const d = ts.toDate();
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    const y = new Date(t);
    y.setDate(t.getDate() - 1);
    const tm = new Date(t);
    tm.setDate(t.getDate() + 1);
    const dStr = d.toDateString();
    if (dStr === t.toDateString()) return "Today";
    if (dStr === y.toDateString()) return "Yesterday";
    if (dStr === tm.toDateString()) return "Tomorrow";
    return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short'
    });
}

function setupSwipe(id) {
    const card = document.getElementById(`card-\${id}`);
    if (!card) return;
    let startX = 0;
    card.addEventListener('touchstart', e => {
        startX = e.touches[0].clientX;
    }, {
        passive: true
    });
    card.addEventListener('touchmove', e => {
        let moveX = e.touches[0].clientX - startX;
        if (moveX < -40) card.classList.add('swiped');
        if (moveX > 40) card.classList.remove('swiped');
    }, {
        passive: true
    });
}

document.addEventListener('DOMContentLoaded', () => {
    switchMainView(currentMode);
});
