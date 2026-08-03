document.addEventListener('DOMContentLoaded', () => {
  const stockTableBody = document.getElementById('stockTableBody');
  const searchStockInput = document.getElementById('searchStock');
  const filterCategorySelect = document.getElementById('filterCategory');
  const addStockForm = document.getElementById('addStockForm');
  const submitStockBtn = document.getElementById('submitStockBtn');
  
  const newStockName = document.getElementById('newStockName');
  const newStockCat = document.getElementById('newStockCat');
  const newStockQty = document.getElementById('newStockQty');
  const newStockAmount = document.getElementById('newStockAmount');

  // Load Categories (linked to master data)
  const categories = JSON.parse(localStorage.getItem('jewelette_categories')) || [
    { name: 'Solitaire Rings', markup: 18 },
    { name: 'Gold Necklaces', markup: 12 },
    { name: 'Diamond Tennis Bracelets', markup: 22 }
  ];

  let editingCode = null;

  // Set default stock list
  let stockItems = JSON.parse(localStorage.getItem('jewelette_stocks')) || [
    { code: 'FY-SR-101', name: 'Aurora Solitaire Ring', category: 'Solitaire Rings', qty: 15, amount: 25000 },
    { code: 'FY-GN-205', name: 'Imperial Gold Rope Chain', category: 'Gold Necklaces', qty: 8, amount: 45000 },
    { code: 'FY-TB-309', name: 'Eternity Diamond Tennis Bracelet', category: 'Diamond Tennis Bracelets', qty: 4, amount: 65000 }
  ];

  // Populate Categories Filters & Modal Select Options
  function populateCategories() {
    // Populate filter category select list
    filterCategorySelect.innerHTML = '<option value="All">All Categories</option>';
    newStockCat.innerHTML = '';
    
    categories.forEach(cat => {
      // Filter list options
      const optFilter = document.createElement('option');
      optFilter.value = cat.name;
      optFilter.textContent = cat.name;
      filterCategorySelect.appendChild(optFilter);

      // Add Modal form options
      const optModal = document.createElement('option');
      optModal.value = cat.name;
      optModal.textContent = cat.name;
      newStockCat.appendChild(optModal);
    });
  }

  // Render Table content with filters
  function renderStockTable() {
    const query = searchStockInput.value.toLowerCase();
    const filterCat = filterCategorySelect.value;

    stockTableBody.innerHTML = '';

    const filteredItems = stockItems.filter(item => {
      const nameVal = item.name || item.desc || '';
      const matchSearch = nameVal.toLowerCase().includes(query) || 
                          item.code.toLowerCase().includes(query);
      const matchCat = filterCat === 'All' || item.category === filterCat;
      return matchSearch && matchCat;
    });

    if (filteredItems.length === 0) {
      stockTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">No stock items found matching your filters.</td></tr>`;
      return;
    }

    filteredItems.forEach((item) => {
      const tr = document.createElement('tr');
      tr.style.cssText = 'border-bottom: 1px solid rgba(255,255,255,0.03); color: var(--text-secondary);';
      const nameVal = item.name || item.desc || '';
      const amountVal = item.amount || 0;
      tr.innerHTML = `
        <td style="padding: 14px; font-family: monospace; color: var(--color-gold);">${item.code}</td>
        <td style="padding: 14px; font-weight: 500;">${nameVal}</td>
        <td style="padding: 14px;">${item.category}</td>
        <td style="padding: 14px; text-align: right; font-weight: 600;">${item.qty} Pcs</td>
        <td style="padding: 14px; text-align: right; color: var(--color-gold);">₹${parseFloat(amountVal).toFixed(2)}</td>
        <td style="padding: 14px; text-align: center;">
          <div style="display: flex; gap: 6px; justify-content: center; flex-wrap: nowrap;">
            <button onclick="editStock('${item.code}')" style="padding: 4px 8px; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 4px; color: #fff; cursor: pointer; font-size: 0.9rem;" title="Edit">&#9998;</button>
            <button onclick="deleteStock('${item.code}')" style="padding: 4px 8px; background: rgba(255, 82, 82, 0.1); border: 1px solid rgba(255, 82, 82, 0.3); border-radius: 4px; color: #ff5252; cursor: pointer; font-size: 0.9rem;" title="Delete">&#128465;</button>
          </div>
        </td>
      `;
      stockTableBody.appendChild(tr);
    });

    localStorage.setItem('jewelette_stocks', JSON.stringify(stockItems));
  }



  window.editStock = (code) => {
    const item = stockItems.find(i => i.code === code);
    if (item) {
      editingCode = code;
      newStockName.value = item.name || item.desc || '';
      newStockCat.value = item.category;
      newStockQty.value = item.qty;
      newStockAmount.value = item.amount || 0;
      submitStockBtn.textContent = 'Update Stock';
      newStockName.focus();
    }
  };

  window.deleteStock = (code) => {
    if (confirm('Are you sure you want to delete this item?')) {
      stockItems = stockItems.filter(i => i.code !== code);
      renderStockTable();
    }
  };

  addStockForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = newStockName.value.trim();
    const category = newStockCat.value;
    const qty = parseInt(newStockQty.value);
    const amount = parseFloat(newStockAmount.value);

    if (name && category && !isNaN(qty) && !isNaN(amount)) {
      if (editingCode) {
        const item = stockItems.find(i => i.code === editingCode);
        if (item) {
          item.name = name;
          item.category = category;
          item.qty = qty;
          item.amount = amount;
        }
        editingCode = null;
        submitStockBtn.textContent = 'Add Stock';
      } else {
        const code = `FY-LP-${Math.floor(100 + Math.random() * 900)}`;
        stockItems.push({ code, name, category, qty, amount });
      }
      
      // reset form
      addStockForm.reset();
      renderStockTable();
    }
  });

  searchStockInput.addEventListener('input', renderStockTable);
  filterCategorySelect.addEventListener('change', renderStockTable);

  populateCategories();
  renderStockTable();
});
