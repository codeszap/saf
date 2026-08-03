document.addEventListener('DOMContentLoaded', async () => {
  const billingForm = document.getElementById('billingForm');
  const itemNameInput = document.getElementById('itemName');
  const availableQtyInput = document.getElementById('availableQty');
  const sellQtyInput = document.getElementById('sellQty');
  const sellPriceInput = document.getElementById('sellPrice');
  const invoiceTableBody = document.getElementById('invoiceTableBody');
  const stockNameList = document.getElementById('stockNameList');

  // Edit Modal elements
  const editSaleModal = document.getElementById('editSaleModal');
  const editSaleForm = document.getElementById('editSaleForm');
  const editSaleNameInput = document.getElementById('editSaleName');
  const editSaleQtyInput = document.getElementById('editSaleQty');
  const editSalePriceInput = document.getElementById('editSalePrice');
  let editingDocId = null;

  // Firestore references
  const salesRef = db.collection('sales');
  const stocksRef = db.collection('stocks');

  let stockItems = [];
  let salesHistory = [];

  // ── Load Stocks for datalist ──
  async function loadStocks() {
    const snap = await stocksRef.get();
    stockItems = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
    populateStockNames();
  }

  function populateStockNames() {
    stockNameList.innerHTML = '';
    stockItems.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.name || item.code;
      stockNameList.appendChild(opt);
    });
  }

  // Auto-fill qty when stock selected
  itemNameInput.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    const item = stockItems.find(i => (i.name || i.code).toLowerCase() === val);
    if (item) {
      availableQtyInput.value = item.qty;
      sellQtyInput.value = 1;
      sellPriceInput.value = '';
    } else {
      availableQtyInput.value = '';
      sellQtyInput.value = '';
      sellPriceInput.value = '';
    }
  });

  // ── Load Sales from Firestore ──
  async function loadSales() {
    const snap = await salesRef.orderBy('date', 'desc').get();
    salesHistory = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
    updateSalesTable();
  }

  // ── Render sales table ──
  function updateSalesTable() {
    invoiceTableBody.innerHTML = '';

    salesHistory.forEach((sale, index) => {
      const tr = document.createElement('tr');
      tr.style.cssText = 'border-bottom:1px solid rgba(255,255,255,0.04); color:var(--text-secondary);';
      const dateStr = sale.date?.toDate ? sale.date.toDate().toLocaleDateString('en-IN') : new Date(sale.date).toLocaleDateString('en-IN');
      tr.innerHTML = `
        <td style="padding:12px 8px;font-weight:500;color:var(--text-primary);">${sale.name}</td>
        <td style="padding:12px 8px;text-align:center;">${sale.qty || 1}</td>
        <td style="padding:12px 8px;text-align:right;color:var(--color-gold);font-weight:600;">&#8377;${parseFloat(sale.price).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
        <td style="padding:12px 8px;text-align:center;font-size:0.8rem;color:var(--text-muted);">${dateStr}</td>
        <td style="padding:12px 8px;text-align:right;">
          <div style="display:flex;gap:5px;justify-content:flex-end;flex-wrap:nowrap;">
            <button class="sale-edit-btn" onclick="openEditSale('${sale.docId}')" title="Edit">&#9998;</button>
            <button class="sale-del-btn" onclick="removeSale('${sale.docId}')" title="Delete">&#128465;</button>
          </div>
        </td>
      `;
      invoiceTableBody.appendChild(tr);
    });

    if (salesHistory.length === 0) {
      invoiceTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:25px;color:var(--text-muted);">No sales recorded yet.</td></tr>`;
    }
  }

  // ── Save new sale ──
  billingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = itemNameInput.value.trim();
    const qty = parseInt(sellQtyInput.value) || 1;
    const price = parseFloat(sellPriceInput.value);

    if (!name || isNaN(price) || qty < 1) return;

    // Check & deduct stock
    const stockItem = stockItems.find(i => (i.name || i.code) === name);
    if (stockItem) {
      if (stockItem.qty < qty) {
        alert(`Only ${stockItem.qty} units available in stock!`);
        return;
      }
      await stocksRef.doc(stockItem.docId).update({ qty: stockItem.qty - qty });
      stockItem.qty -= qty;
      availableQtyInput.value = stockItem.qty;
    }

    await salesRef.add({
      name, qty, price,
      date: firebase.firestore.FieldValue.serverTimestamp()
    });

    billingForm.reset();
    await loadSales();
  });

  // ── Edit Sale Modal ──
  window.openEditSale = (docId) => {
    editingDocId = docId;
    const sale = salesHistory.find(s => s.docId === docId);
    if (sale) {
      editSaleNameInput.value = sale.name;
      editSaleQtyInput.value = sale.qty || 1;
      editSalePriceInput.value = sale.price;
      editSaleModal.style.display = 'flex';
    }
  };

  window.closeEditModal = () => {
    editSaleModal.style.display = 'none';
    editingDocId = null;
    editSaleForm.reset();
  };

  editSaleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!editingDocId) return;
    await salesRef.doc(editingDocId).update({
      name: editSaleNameInput.value.trim(),
      qty: parseInt(editSaleQtyInput.value) || 1,
      price: parseFloat(editSalePriceInput.value)
    });
    closeEditModal();
    await loadSales();
  });

  // ── Delete Sale ──
  window.removeSale = async (docId) => {
    if (confirm('Delete this sale record?')) {
      await salesRef.doc(docId).delete();
      await loadSales();
    }
  };

  // Close modal on backdrop click
  editSaleModal.addEventListener('click', (e) => {
    if (e.target === editSaleModal) closeEditModal();
  });

  // ── Init ──
  await loadStocks();
  await loadSales();
});
