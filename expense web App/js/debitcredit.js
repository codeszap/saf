const editModal = new bootstrap.Modal(document.getElementById('editPersonModal'));

async function loadKhata() {
    const list = document.getElementById('peopleList');
    if (!list) return;
    const snap = await db.collection("khata").get();
    list.innerHTML = "";

    snap.forEach(doc => {
        const data = doc.data();
        const container = document.createElement('div');
        container.className = 'swipe-container';
        container.innerHTML = `
            <div class="swipe-actions">
                <button class="btn-edit" onclick="editPerson('\${doc.id}', '\${data.name}', \${data.totalGet || 0}, \${data.totalGive || 0})">Edit</button>
                <button class="btn-delete" onclick="deletePerson('\${doc.id}', '\${data.name}')">Del</button>
            </div>
            <div class="swipe-content">
                <a href="person-details.html?id=\${doc.id}&name=\${data.name}" class="person-card-inner">
                    <div class="person-name">\${data.name}</div>
                    <div class="amount-group">
                        <div class="amt-box"><span class="label">GET</span><span class="val get-text">₹\${data.totalGet || 0}</span></div>
                        <div class="amt-box"><span class="label">GIVE</span><span class="val give-text">₹\${data.totalGive || 0}</span></div>
                    </div>
                </a>
            </div>
        `;
        list.appendChild(container);
        enableSwipe(container);
    });
}

function enableSwipe(row) {
    const content = row.querySelector(".swipe-content");
    const actions = row.querySelector(".swipe-actions");
    let startX = 0,
        moveX = 0;

    content.addEventListener("touchstart", e => {
        startX = e.touches[0].clientX;
        if (actions) actions.style.visibility = "visible";
    }, {
        passive: true
    });

    content.addEventListener("touchmove", e => {
        moveX = e.touches[0].clientX - startX;
        if (moveX < 0) content.style.transform = `translateX(\${Math.max(moveX, -140)}px)`;
    });

    content.addEventListener("touchend", () => {
        if (moveX < -60) content.style.transform = "translateX(-140px)";
        else {
            content.style.transform = "translateX(0)";
            setTimeout(() => {
                if (actions) actions.style.visibility = "hidden";
            }, 300);
        }
        moveX = 0;
    });
}

function openAddModal() {
    const name = prompt("Enter Person Name:");
    if (name) {
        addPerson(name);
    }
}

async function addPerson(name) {
    await db.collection("khata").add({
        name: name,
        totalGet: 0,
        totalGive: 0
    });
    loadKhata();
}

function editPerson(id, currentName, totalGet, totalGive) {
    const editPersonId = document.getElementById('editPersonId');
    const editPersonName = document.getElementById('editPersonName');
    const editTotalGet = document.getElementById('editTotalGet');
    const editTotalGive = document.getElementById('editTotalGive');

    if (editPersonId) editPersonId.value = id;
    if (editPersonName) editPersonName.value = currentName;
    if (editTotalGet) editTotalGet.value = totalGet || 0;
    if (editTotalGive) editTotalGive.value = totalGive || 0;
    editModal.show();
}

async function savePersonEdit() {
    const id = document.getElementById('editPersonId').value;
    const newName = document.getElementById('editPersonName').value.trim();
    const newTotalGet = Number(document.getElementById('editTotalGet').value) || 0;
    const newTotalGive = Number(document.getElementById('editTotalGive').value) || 0;

    if (!newName) return alert("Please enter a name");

    await db.collection("khata").doc(id).update({
        name: newName,
        totalGet: newTotalGet,
        totalGive: newTotalGive
    });
    editModal.hide();
    loadKhata();
}

async function deletePerson(id, name) {
    if (confirm(`Delete "\${name}" and all transactions?`)) {
        // Delete all transactions in subcollection
        const txSnap = await db.collection("khata").doc(id).collection("transactions").get();
        const batch = db.batch();
        txSnap.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        // Delete person document
        await db.collection("khata").doc(id).delete();
        loadKhata();
    }
}

window.onload = loadKhata;
