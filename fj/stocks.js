document.addEventListener('DOMContentLoaded', async () => {
  const stockTableBody = document.getElementById('stockTableBody');
  const searchStockInput = document.getElementById('searchStock');
  const filterCategoryInput = document.getElementById('filterCategory');
  const filterCategoryList = document.getElementById('filterCategoryList');
  const addStockForm = document.getElementById('addStockForm');
  const submitStockBtn = document.getElementById('submitStockBtn');
  const stockModal = document.getElementById('stockModal');

  const newStockName = document.getElementById('newStockName');
  const newStockCat = document.getElementById('newStockCat');
  const newStockCatList = document.getElementById('newStockCatList');
  const newStockQty = document.getElementById('newStockQty');
  const newStockAmount = document.getElementById('newStockAmount');

  // Firestore references
  const stocksRef = db.collection('stocks');
  const categoriesRef = db.collection('categories');

  let stockItems = [];
  let categories = [];
  let editingDocId = null;

  // ── Load categories from Firestore ──
  async function loadCategories() {
    const snap = await categoriesRef.get();
    categories = snap.empty
      ? [{ name: 'Solitaire Rings' }, { name: 'Gold Necklaces' }, { name: 'Diamond Tennis Bracelets' }]
      : snap.docs.map(d => ({ id: d.id, ...d.data() }));
    populateCategories();
  }

  function populateCategories() {
    filterCategoryList.innerHTML = '<option value="">All Categories</option>';
    newStockCatList.innerHTML = '';
    categories.forEach(cat => {
      const o1 = document.createElement('option');
      o1.value = cat.name;
      filterCategoryList.appendChild(o1);

      const o2 = document.createElement('option');
      o2.value = cat.name;
      newStockCatList.appendChild(o2);
    });
  }

  // ── Load stocks from Firestore ──
  async function loadStocks() {
    const snap = await stocksRef.orderBy('createdAt', 'desc').get();
    stockItems = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
    renderStockTable();
  }

  // ── Render Table ──
  function renderStockTable() {
    const query = searchStockInput.value.toLowerCase();
    const filterCat = filterCategoryInput.value;

    stockTableBody.innerHTML = '';

    const filtered = stockItems.filter(item => {
      const nameVal = item.name || '';
      const matchSearch = nameVal.toLowerCase().includes(query) || item.code.toLowerCase().includes(query);
      const matchCat = !filterCat || filterCat === '' || item.category.toLowerCase().includes(filterCat.toLowerCase());
      return matchSearch && matchCat;
    });

    if (filtered.length === 0) {
      stockTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-muted);">No stock items found.</td></tr>`;
      return;
    }

    filtered.forEach(item => {
      const tr = document.createElement('tr');
      tr.style.cssText = 'border-bottom:1px solid rgba(255,255,255,0.04); transition: background 0.2s;';
      tr.innerHTML = `
        <td style="padding:14px;font-family:monospace;color:var(--color-gold);">${item.code}</td>
        <td style="padding:14px;font-weight:500;">${item.name}</td>
        <td style="padding:14px;">${item.category}</td>
        <td style="padding:14px;text-align:right;font-weight:600;">${item.qty} Pcs</td>
        <td style="padding:14px;text-align:right;color:var(--color-gold);">&#8377;${parseFloat(item.amount).toFixed(2)}</td>
        <td style="padding:14px;text-align:center;">
          <div style="display:flex;gap:6px;justify-content:center;flex-wrap:nowrap;">
            <button onclick="editStock('${item.docId}')" style="padding:4px 8px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.3);border-radius:4px;color:#fff;cursor:pointer;font-size:0.9rem;" title="Edit">&#9998;</button>
            <button onclick="deleteStock('${item.docId}')" style="padding:4px 8px;background:rgba(255,82,82,0.1);border:1px solid rgba(255,82,82,0.3);border-radius:4px;color:#ff5252;cursor:pointer;font-size:0.9rem;" title="Delete">&#128465;</button>
          </div>
        </td>
      `;
      stockTableBody.appendChild(tr);
    });

    // persist to localStorage as cache for other pages (sales, reports)
    localStorage.setItem('jewelette_stocks', JSON.stringify(stockItems));
  }

  // ── Modal Toggle ──
  window.toggleStockModal = (show) => {
    stockModal.style.display = show ? 'flex' : 'none';
    if (!show) {
      editingDocId = null;
      addStockForm.reset();
      submitStockBtn.textContent = 'Add Stock';
    }
  };

  // ── Edit Stock ──
  window.editStock = (docId) => {
    const item = stockItems.find(i => i.docId === docId);
    if (item) {
      editingDocId = docId;
      newStockName.value = item.name;
      newStockCat.value = item.category;
      newStockQty.value = item.qty;
      newStockAmount.value = item.amount;
      submitStockBtn.textContent = 'Update Stock';
      toggleStockModal(true);
    }
  };

  // ── Delete Stock ──
  window.deleteStock = async (docId) => {
    if (confirm('Are you sure you want to delete this item?')) {
      await stocksRef.doc(docId).delete();
      await loadStocks();
    }
  };

  // ── Add / Update Stock ──
  addStockForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = newStockName.value.trim();
    const category = newStockCat.value.trim();
    const qty = parseInt(newStockQty.value);
    const amount = parseFloat(newStockAmount.value);

    if (!name || !category || isNaN(qty) || isNaN(amount)) return;

    submitStockBtn.textContent = 'Saving...';
    submitStockBtn.disabled = true;

    if (editingDocId) {
      await stocksRef.doc(editingDocId).update({ name, category, qty, amount });
    } else {
      const code = `FY-${Math.floor(100 + Math.random() * 900)}`;
      await stocksRef.add({ code, name, category, qty, amount, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    }

    submitStockBtn.disabled = false;
    toggleStockModal(false);
    await loadStocks();
  });

  // ── Search & Filter ──
  searchStockInput.addEventListener('input', renderStockTable);
  filterCategoryInput.addEventListener('input', renderStockTable);
  filterCategoryInput.addEventListener('change', renderStockTable);

  // ── Init ──
  await loadCategories();
  await loadStocks();
});
