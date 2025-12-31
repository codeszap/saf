const transactionsCol = db.collection('transactions');
const form = document.getElementById("transactionForm");
const typeSelect = document.getElementById("typeSelect");
const toAccountDiv = document.getElementById("toAccountDiv");
const fromAccLabel = document.getElementById("fromAccLabel");
const saveAddMoreBtn = document.getElementById("saveAddMoreBtn");
const statusMsg = document.getElementById("statusMsg");

// Logic to show/hide To Account for Transfers
typeSelect.addEventListener("change", (e) => {
    if (e.target.value === "Transfer") {
        toAccountDiv.classList.remove("d-none");
        fromAccLabel.innerText = "FROM";
        form.toAccount.required = true;
    } else {
        toAccountDiv.classList.add("d-none");
        fromAccLabel.innerText = "ACCOUNT";
        form.toAccount.required = false;
    }
});

const now = new Date();
const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');
const today = `${year}-${month}-${day}`;

document.getElementById("dateInput").value = today;
document.getElementById("timeInput").value = currentTime;

const params = new URLSearchParams(window.location.search);
let isEditMode = false;
let docId = params.get('id');

const saveButton = document.getElementById("saveButton");

if (docId) {
    isEditMode = true;
    document.getElementById("formTitle").textContent = "Edit Transaction";
    saveButton.textContent = "Update Transaction";

    transactionsCol.doc(docId).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            form.date.value = data.date;
            form.time.value = data.time || "12:00"; // Default if missing
            form.type.value = data.type;
            form.amount.value = data.amount;
            form.account.value = data.account;
            form.category.value = data.category || "";
            form.description.value = data.description || "";

            if (data.type === "Transfer") {
                typeSelect.dispatchEvent(new Event('change'));
                form.toAccount.value = data.toAccount;
            }
        }
    });
} else {
    const duplicateId = params.get('duplicate');
    if (duplicateId) {
        document.getElementById("formTitle").textContent = "Duplicate Transaction";
        transactionsCol.doc(duplicateId).get().then(doc => {
            if (doc.exists) {
                const data = doc.data();
                // Reset Date and Time to NOW for duplicates (Do not copy from old data)
                const nowFresh = new Date();
                const timeString = nowFresh.getHours().toString().padStart(2, '0') + ':' + nowFresh.getMinutes().toString().padStart(2, '0');

                // Use local date to avoid UTC mismatch
                const year = nowFresh.getFullYear();
                const month = String(nowFresh.getMonth() + 1).padStart(2, '0');
                const day = String(nowFresh.getDate()).padStart(2, '0');
                const dateString = `${year}-${month}-${day}`;

                form.date.value = dateString;
                form.time.value = timeString;

                form.type.value = data.type;
                form.amount.value = data.amount;
                form.account.value = data.account;
                form.category.value = data.category || "";
                form.description.value = data.description || "";

                if (data.type === "Transfer") {
                    typeSelect.dispatchEvent(new Event('change'));
                    form.toAccount.value = data.toAccount;
                }
            }
        });
    }
}

const amountInput = document.getElementById("amountInput");
const voiceFab = document.getElementById("voiceFab");
const voiceStatusOverlay = document.getElementById("voiceStatusOverlay");

// --- Mini Calculator Logic ---
function evaluateExpression(str) {
    try {
        // Basic cleanup: remove everything except numbers and + - * / . ( )
        let cleaned = str.replace(/[^0-9+\-*/.()]/g, '');
        if (!cleaned) return null;
        // Use Function constructor instead of eval for a bit more safety in a controlled env
        let result = new Function(`return ${cleaned}`)();
        return isFinite(result) ? parseFloat(result.toFixed(2)) : null;
    } catch (e) {
        return null;
    }
}

amountInput.addEventListener("blur", function () {
    let result = evaluateExpression(this.value);
    if (result !== null && this.value.includesAny(['+', '-', '*', '/'])) {
        this.value = result;
    }
});

// Helper for includesAny
String.prototype.includesAny = function (arr) {
    return arr.some(v => this.includes(v));
};

// --- Advanced Voice Input Logic ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
    voiceFab.style.display = "none";
} else {
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    let isListening = false;

    voiceFab.addEventListener("click", () => {
        if (isListening) {
            recognition.stop();
        } else {
            try {
                recognition.start();
            } catch (e) {
                recognition.stop();
            }
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

        // --- SMART PARSING ---
        // 1. TYPE
        const types = ["expense", "income", "transfer"];
        const foundType = types.find(t => text.includes(t));
        if (foundType) {
            form.type.value = foundType.charAt(0).toUpperCase() + foundType.slice(1);
            typeSelect.dispatchEvent(new Event('change'));
        }

        // 2. AMOUNT
        const amountMatch = text.match(/\d+/);
        if (amountMatch) {
            amountInput.value = amountMatch[0];
        }

        // 3. ACCOUNT (Detect Bank/Cash)
        const accounts = ["bank", "cash", "other"];
        const words = text.split(" ");
        let accountFoundCount = 0;

        words.forEach((word, idx) => {
            const found = accounts.find(a => word.includes(a));
            if (found) {
                accountFoundCount++;
                if (accountFoundCount === 1) {
                    form.account.value = found.toUpperCase();
                } else if (accountFoundCount === 2 && form.type.value === "Transfer") {
                    form.toAccount.value = found.toUpperCase();
                }
            }
        });

        // 4. CATEGORY (Everything else that isn't a keyword)
        let categoryText = text;
        [...types, ...accounts, ...(amountMatch ? [amountMatch[0]] : []), "from", "to", "for", "account"].forEach(kw => {
            categoryText = categoryText.replace(new RegExp(`\\b${kw}\\b`, 'g'), "");
        });

        const finalCategory = categoryText.trim().replace(/\s+/g, " ");
        if (finalCategory) {
            document.getElementById("categoryInput").value = finalCategory.toUpperCase();
        }

        setTimeout(() => {
            if (!isListening) voiceStatusOverlay.style.display = "none";
        }, 3000);
    };

    recognition.onerror = () => {
        isListening = false;
        voiceStatusOverlay.innerText = "Error! Try again.";
        setTimeout(() => {
            if (!isListening) voiceStatusOverlay.style.display = "none";
        }, 2000);
    };

    recognition.onend = () => {
        isListening = false;
        voiceFab.classList.remove("listening");
    };
}

// Helper to show success message briefly
function showStatus() {
    statusMsg.classList.remove("d-none");
    setTimeout(() => statusMsg.classList.add("d-none"), 2000);
}

// Helper to reset form but keep Date and Account (for speed)
function resetForm() {
    amountInput.value = "";
    form.category.value = "";
    form.description.value = "";
    amountInput.focus();
    saveButton.disabled = false;
    saveAddMoreBtn.disabled = false;
    saveButton.textContent = isEditMode ? "Update Transaction" : "SAVE & CLOSE";
    saveAddMoreBtn.textContent = "+ SAVE MORE";
}

async function handleSave(stayOnPage = false) {
    // First check if amount needs evaluation
    let finalAmt = evaluateExpression(amountInput.value);
    if (finalAmt === null) finalAmt = parseFloat(amountInput.value);

    if (!finalAmt || finalAmt <= 0) return alert("Enter valid amount");
    if (!form.category.value.trim()) return alert("Category is required");

    const transactionData = {
        date: form.date.value,
        time: form.time.value,
        type: form.type.value,
        amount: finalAmt,
        account: form.account.value,
        category: form.category.value.trim().toUpperCase(),
        description: form.description.value.trim().toUpperCase(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (form.type.value === "Transfer") {
        transactionData.toAccount = form.toAccount.value;
    }

    saveButton.disabled = true;
    saveAddMoreBtn.disabled = true;
    const originalBtnText = stayOnPage ? saveAddMoreBtn.textContent : saveButton.textContent;

    if (stayOnPage) saveAddMoreBtn.textContent = "Saving...";
    else saveButton.textContent = "Saving...";

    try {
        if (isEditMode) {
            await transactionsCol.doc(docId).update(transactionData);
        } else {
            await transactionsCol.add(transactionData);
        }

        if (stayOnPage) {
            showStatus();
            resetForm();
            loadSuggestions(); // Reload suggestions for autocomplete
        } else {
            window.location.replace("index.html");
        }
    } catch (err) {
        alert("Error: " + err);
        saveButton.disabled = false;
        saveAddMoreBtn.disabled = false;
        if (stayOnPage) saveAddMoreBtn.textContent = originalBtnText;
        else saveButton.textContent = originalBtnText;
    }
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await handleSave(false);
});

saveAddMoreBtn.addEventListener("click", async () => {
    await handleSave(true);
});

// --- Custom Autocomplete Logic ---

function autocomplete(inp, arr) {
    let currentFocus;

    inp.addEventListener("input", function (e) {
        let a, b, i, val = this.value;
        closeAllLists();
        if (!val) { return false; }
        currentFocus = -1;

        a = document.createElement("DIV");
        a.setAttribute("id", this.id + "autocomplete-list");
        a.setAttribute("class", "autocomplete-items");
        this.parentNode.appendChild(a);

        for (i = 0; i < arr.length; i++) {
            // Match logic: Check if parts of string match? Or just includes?
            // User wants suggestion when typing. Let's do case-insensitive includes
            if (arr[i].toUpperCase().includes(val.toUpperCase())) {
                b = document.createElement("DIV");
                b.className = "autocomplete-item";
                // Highlight matching part?? Too complex for now, just show text
                b.innerHTML = arr[i];
                b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";
                b.addEventListener("click", function (e) {
                    inp.value = this.getElementsByTagName("input")[0].value;
                    closeAllLists();
                });
                a.appendChild(b);
            }
        }
    });

    function closeAllLists(elmnt) {
        var x = document.getElementsByClassName("autocomplete-items");
        for (var i = 0; i < x.length; i++) {
            if (elmnt != x[i] && elmnt != inp) {
                x[i].parentNode.removeChild(x[i]);
            }
        }
    }

    document.addEventListener("click", function (e) {
        closeAllLists(e.target);
    });
}

async function loadSuggestions() {
    try {
        // Limit to recent 200 to keep it fast
        const snapshot = await transactionsCol.orderBy('date', 'desc').limit(200).get();
        const categories = new Set();
        const descriptions = new Set();

        snapshot.forEach(doc => {
            const d = doc.data();
            if (d.category) categories.add(d.category);
            if (d.description) descriptions.add(d.description);
        });

        // Init Autocomplete
        autocomplete(document.getElementById("categoryInput"), [...categories].sort());
        autocomplete(document.getElementById("descriptionInput"), [...descriptions].sort());

    } catch (e) { console.error("Error loading suggestions", e); }
}

loadSuggestions();
