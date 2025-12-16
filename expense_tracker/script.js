    let db;
    const request = indexedDB.open("ExpenseTrackerDB", 1);

    request.onupgradeneeded = function(event) {
      db = event.target.result;
      if (!db.objectStoreNames.contains("expenses")) {
        db.createObjectStore("expenses", { keyPath: "id", autoIncrement: true });
      }
    };

    request.onsuccess = function(event) {
      db = event.target.result;
      updateSuggestions();
    };

    request.onerror = function(event) {
      console.error("IndexedDB error:", event.target.errorCode);
    };

    function showCustomAlert(message, type = "success") {
      const alertDiv = document.getElementById('custom-alert');
      alertDiv.textContent = message;
      alertDiv.className = `custom-alert ${type}`;
      alertDiv.style.display = 'block';
      alertDiv.style.opacity = '1';
      setTimeout(() => {
        alertDiv.style.opacity = '0';
        setTimeout(() => {
          alertDiv.style.display = 'none';
        }, 300);
      }, 2000);
    }

    function addExpense() {
      let date = document.getElementById('date').value;
      const name = document.getElementById('name').value;
      const category = document.getElementById('category').value;
      const description = document.getElementById('description').value;
      const amount = document.getElementById('amount').value;

      if (!date || !name || !category || !amount) {
        showCustomAlert("All fields are required!", "error");
        return;
      }

      const [yyyy, mm, dd] = date.split("-");
      date = `${dd}-${mm}-${yyyy}`;

      const expense = { date, name, category, description, amount: parseFloat(amount) };

      const transaction = db.transaction(["expenses"], "readwrite");
      const store = transaction.objectStore("expenses");
      store.add(expense);

      transaction.oncomplete = function() {
        clearFields();
        showCustomAlert("Expense added!", "success");
        updateSuggestions();
      };

      transaction.onerror = function() {
        showCustomAlert("Failed to add expense.", "error");
      };
    }

    function clearFields() {
      document.getElementById('name').value = '';
      document.getElementById('category').value = '';
      document.getElementById('description').value = '';
      document.getElementById('amount').value = '';
    }

    function updateSuggestions() {
      const nameList = document.getElementById('name-list');
      const categoryList = document.getElementById('category-list');
      const descriptionList = document.getElementById('description-list');
      nameList.innerHTML = '';
      categoryList.innerHTML = '';
      descriptionList.innerHTML = '';
      if (!db) return;
      const transaction = db.transaction(['expenses'], 'readonly');
      const store = transaction.objectStore('expenses');
      const namesSet = new Set();
      const categoriesSet = new Set();
      const descriptionsSet = new Set();
      store.openCursor().onsuccess = function(event) {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.name) namesSet.add(cursor.value.name);
          if (cursor.value.category) categoriesSet.add(cursor.value.category);
          if (cursor.value.description) descriptionsSet.add(cursor.value.description);
          cursor.continue();
        } else {
          namesSet.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            nameList.appendChild(option);
          });
          categoriesSet.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            categoryList.appendChild(option);
          });
          descriptionsSet.forEach(description => {
            const option = document.createElement('option');
            option.value = description;
            descriptionList.appendChild(option);
          });
        }
      };
    }

    function showForm() {
      document.getElementById('records-container').style.display = 'none';
      document.getElementById('form-container').style.display = 'block';
    }

    function viewExpenses() {
      const recordsDiv = document.getElementById('records');
      const totalDiv = document.getElementById('total-expense');
      document.getElementById('form-container').style.display = 'none';
      document.getElementById('records-container').style.display = 'block';
      recordsDiv.innerHTML = '';

      // Get filter values
      const filterName = document.getElementById('filter-name')?.value.trim().toLowerCase();
      const filterDate = document.getElementById('filter-date')?.value;

      let total = 0;
      if (!db) return;
      const transaction = db.transaction(['expenses'], 'readonly');
      const store = transaction.objectStore('expenses');
      store.openCursor().onsuccess = function(event) {
        const cursor = event.target.result;
        if (cursor) {
          let { date, name, category, description, amount } = cursor.value;

          // Convert stored dd-mm-yyyy to yyyy-mm-dd for comparison
          let dbDate = date;
          if (dbDate && dbDate.includes('-') && dbDate.split('-')[0].length === 2) {
            const [dd, mm, yyyy] = dbDate.split('-');
            dbDate = `${yyyy}-${mm}-${dd}`;
          }

          // Filter logic
          if (
            (!filterName || name.toLowerCase().includes(filterName)) &&
            (!filterDate || dbDate === filterDate)
          ) {
            total += parseFloat(amount) || 0;
            const recordDiv = document.createElement('div');
            recordDiv.className = 'record';
            recordDiv.innerHTML = `
              <div class="record-header">${name} - ₹${amount}</div>
              <div class="record-detail">Date: ${date}</div>
              <div class="record-detail">Category: ${category}</div>
              <div class="record-detail">Description: ${description}</div>
            `;
            recordsDiv.appendChild(recordDiv);
          }
          cursor.continue();
        } else {
          totalDiv.textContent = "Total Expense: ₹" + total.toFixed(2);
          if (!recordsDiv.hasChildNodes()) {
            recordsDiv.innerHTML = '<div class="no-records"><span style="font-size:2em;">📄</span><span>No records found.</span></div>';
            totalDiv.textContent = "";
          }
        }
      };
    }

    function backupExpenses() {
      const transaction = db.transaction(['expenses'], 'readonly');
      const store = transaction.objectStore('expenses');
      const allData = [];
      store.openCursor().onsuccess = function(event) {
        const cursor = event.target.result;
        if (cursor) {
          allData.push(cursor.value);
          cursor.continue();
        } else {
          const blob = new Blob([JSON.stringify(allData, null, 2)], {type: "application/json"});
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = "expenses_backup.json";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showCustomAlert("Backup downloaded!", "success");
        }
      };
    }

    function restoreExpenses(event) {
      const file = event.target.files[0];
      if (!file) return;

      // Confirmation before restore
      if (!confirm("Are you sure you want to restore? This will add all expenses from the backup.")) {
        event.target.value = ""; // Reset file input
        showCustomAlert("Restore cancelled.", "error");
        return;
      }

      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const data = JSON.parse(e.target.result);
          if (!Array.isArray(data)) throw new Error("Invalid backup file");
          const transaction = db.transaction(['expenses'], 'readwrite');
          const store = transaction.objectStore('expenses');
          data.forEach(item => {
            const {id, ...rest} = item;
            store.add(rest);
          });
          transaction.oncomplete = function() {
            showCustomAlert("Restore completed!", "success");
            updateSuggestions();
            viewExpenses();
          };
          transaction.onerror = function() {
            showCustomAlert("Restore failed!", "error");
          };
        } catch (err) {
          showCustomAlert("Invalid backup file!", "error");
        }
      };
      reader.readAsText(file);
    }

    // Set today's date as default
    window.onload = function() {
      const today = new Date();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const yyyy = today.getFullYear();
      document.getElementById('date').value = `${yyyy}-${mm}-${dd}`;
    };

    // Menu open/close functions
    function openMenu() {
      document.getElementById('side-menu').style.left = '0';
      document.getElementById('menu-bar').style.display = 'none'; // Hide menu icon
    }
    function closeMenu() {
      document.getElementById('side-menu').style.left = '-220px';
      document.getElementById('menu-bar').style.display = 'block'; // Show menu icon
    }
