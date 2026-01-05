const transactionsCol = db.collection('transactions');
const form = document.getElementById("transactionForm");
const typeSelect = document.getElementById("typeSelect");
const accountSelect = document.getElementById("accountSelect");
const toAccountDiv = document.getElementById("toAccountDiv");
const itemsContainer = document.getElementById("itemsContainer");
const addItemBtn = document.getElementById("addItemBtn");
const saveButton = document.getElementById("saveButton");
const statusMsg = document.getElementById("statusMsg");
const totalAmountDisplay = document.getElementById("totalAmountDisplay");

// --- Global Date/Time/Type Setup ---
const now = new Date();
const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');
const today = `${year}-${month}-${day}`;

document.getElementById("dateInput").value = today;
document.getElementById("timeInput").value = currentTime;

// Logic to show/hide To Account for Transfers
typeSelect.addEventListener("change", (e) => {
    if (e.target.value === "Transfer") {
        toAccountDiv.classList.remove("d-none");
        form.toAccount.required = true;
    } else {
        toAccountDiv.classList.add("d-none");
        form.toAccount.required = false;
    }
});

// --- Dynamic Items Logic ---
function createItemRow(data = {}) {
    const amount = data.amount || "";
    const category = data.category || "";
    const description = data.description || "";

    const rowId = 'row-' + Date.now() + Math.random().toString(36).substr(2, 5);
    const div = document.createElement("div");
    div.className = "item-row card card-body p-3 mb-3 bg-light border position-relative";
    div.id = rowId;

    div.innerHTML = `
        <button type="button" class="btn-close position-absolute top-0 end-0 m-2 small" aria-label="Remove" onclick="removeItem('${rowId}')"></button>
        <div class="row g-2">
            <div class="col-4">
               <label class="form-label small fw-bold">AMOUNT</label>
               <input type="text" class="form-control fw-bold amount-input" placeholder="0" value="${amount}" inputmode="decimal" oninput="calculateTotal()" onblur="evalInput(this)">
            </div>
            <div class="col-8">
               <label class="form-label small fw-bold">CATEGORY</label>
               <input type="text" class="form-control category-input text-uppercase" placeholder="CAT" value="${category}" onfocus="loadSuggestionsFor(this)">
            </div>
            <div class="col-12">
               <input type="text" class="form-control form-control-sm desc-input" placeholder="Description (Optional)" value="${description}">
            </div>
        </div>
    `;
    itemsContainer.appendChild(div);
    calculateTotal();
}

// Make removeItem global so onclick works
window.removeItem = function (id) {
    if (itemsContainer.children.length > 1) {
        document.getElementById(id).remove();
        calculateTotal();
    } else {
        const row = document.getElementById(id);
        row.querySelector('.amount-input').value = "";
        row.querySelector('.category-input').value = "";
        row.querySelector('.desc-input').value = "";
        calculateTotal(); // Update total to 0 if cleared
    }
};

addItemBtn.addEventListener("click", () => {
    const rows = document.querySelectorAll(".item-row");
    if (rows.length > 0) {
        const lastRow = rows[rows.length - 1];
        const amt = lastRow.querySelector(".amount-input").value.trim();
        const cat = lastRow.querySelector(".category-input").value.trim();

        if (!amt || !cat) {
            // Highlight them or just alert
            if (!amt) lastRow.querySelector(".amount-input").focus();
            else if (!cat) lastRow.querySelector(".category-input").focus();

            // Optional: Shake effect or red border could be added here
            return; // Stop here
        }
    }
    createItemRow();
});

window.calculateTotal = function () {
    let total = 0;
    const inputs = document.querySelectorAll(".amount-input");
    inputs.forEach(inp => {
        let val = parseFloat(inp.value) || 0;
        total += val;
    });
    totalAmountDisplay.innerText = `₹${total.toLocaleString('en-IN')}`;
};

window.evalInput = function (input) {
    let result = evaluateExpression(input.value);
    if (result !== null && input.value.split('').some(c => ['+', '-', '*', '/'].includes(c))) {
        input.value = result;
    }
    calculateTotal();
};

function evaluateExpression(str) {
    try {
        let cleaned = str.replace(/[^0-9+\-*/.()]/g, '');
        if (!cleaned) return null;
        let result = new Function(`return ${cleaned}`)();
        return isFinite(result) ? parseFloat(result.toFixed(2)) : null;
    } catch (e) { return null; }
}


// --- Params & Edit/Duplicate Logic ---
const params = new URLSearchParams(window.location.search);
let isEditMode = false;
let docId = params.get('id');

// Clear container initially
itemsContainer.innerHTML = "";

if (docId) {
    isEditMode = true;
    document.getElementById("formTitle").textContent = "Edit Transaction";
    saveButton.textContent = "Update Transaction";
    addItemBtn.style.display = "none"; // Simplified edit

    transactionsCol.doc(docId).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            form.date.value = data.date;
            form.time.value = data.time || "12:00";
            typeSelect.value = data.type;
            if (data.type === "Transfer") {
                typeSelect.dispatchEvent(new Event('change'));
                form.toAccount.value = data.toAccount;
            }
            accountSelect.value = data.account;

            createItemRow({
                amount: data.amount,
                category: data.category,
                description: data.description
            });
        }
    });

} else {
    // Default Empty Row
    const duplicateId = params.get('duplicate');
    if (duplicateId) {
        document.getElementById("formTitle").textContent = "Duplicate Transaction";
        transactionsCol.doc(duplicateId).get().then(doc => {
            if (doc.exists) {
                const data = doc.data();
                accountSelect.value = data.account;
                typeSelect.value = data.type;
                if (data.type === "Transfer") {
                    typeSelect.dispatchEvent(new Event('change'));
                    form.toAccount.value = data.toAccount;
                }
                createItemRow({
                    amount: data.amount,
                    category: data.category,
                    description: data.description
                });
            }
        });
    } else {
        createItemRow();
    }
}

// --- Save Logic ---
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const date = form.date.value;
    const time = form.time.value;
    const type = typeSelect.value;
    const account = accountSelect.value;
    let toAccount = null;
    if (type === "Transfer") {
        toAccount = form.toAccount.value;
    }

    const rows = document.querySelectorAll(".item-row");
    const batchData = [];

    for (let row of rows) {
        const amtInput = row.querySelector(".amount-input");
        const catInput = row.querySelector(".category-input");
        const descInput = row.querySelector(".desc-input");

        let amt = parseFloat(amtInput.value);
        if (!amt || amt <= 0) continue;

        if (!catInput.value.trim()) {
            alert("Category is required for all items");
            return;
        }

        batchData.push({
            date, time, type, account, toAccount,
            amount: amt,
            category: catInput.value.trim().toUpperCase(),
            description: descInput.value.trim().toUpperCase(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    if (batchData.length === 0) {
        alert("Please add at least one valid item.");
        return;
    }

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    try {
        if (isEditMode) {
            const d = batchData[0];
            delete d.createdAt;
            await transactionsCol.doc(docId).update(d);
        } else {
            const batch = db.batch();
            batchData.forEach(data => {
                const docRef = transactionsCol.doc();
                batch.set(docRef, data);
            });
            await batch.commit();
        }
        window.location.replace("index.html");
    } catch (err) {
        console.error(err);
        alert("Error saving: " + err.message);
        saveButton.disabled = false;
        saveButton.textContent = isEditMode ? "Update Transaction" : "SAVE ALL TRANSACTIONS";
    }
});


// --- Autocomplete Hook ---
window.loadSuggestionsFor = function (inputElement) {
    if (inputElement.getAttribute("data-loaded") === "true") return;
    initAutocomplete(inputElement);
    inputElement.setAttribute("data-loaded", "true");
};

let cachedCategories = [];
async function fetchSuggestions() {
    try {
        const snap = await transactionsCol.orderBy('date', 'desc').limit(100).get();
        const cats = new Set();
        snap.forEach(doc => { if (doc.data().category) cats.add(doc.data().category); });
        cachedCategories = [...cats].sort();
    } catch (e) { }
}
fetchSuggestions();

function initAutocomplete(inp) {
    let listId = "cat-list-" + Math.random().toString(36).substr(2, 9);
    let datalist = document.createElement("datalist");
    datalist.id = listId;
    cachedCategories.forEach(c => {
        let opt = document.createElement("option");
        opt.value = c;
        datalist.appendChild(opt);
    });
    document.body.appendChild(datalist);
    inp.setAttribute("list", listId);
}
