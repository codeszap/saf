document.addEventListener('DOMContentLoaded', async () => {
  const chartContainer = document.getElementById('chartContainer');
  const categorySummaryList = document.getElementById('categorySummaryList');
  const totalRevEl = document.getElementById('totalRev');

  // Firestore references
  const stocksRef = db.collection('stocks');
  const salesRef = db.collection('sales');

  // ── Load Stocks from Firestore ──
  const stockSnap = await stocksRef.get();
  const stockItems = stockSnap.docs.map(d => d.data());

  // ── Load Sales from Firestore ──
  const salesSnap = await salesRef.get();
  const salesHistory = salesSnap.docs.map(d => d.data());

  // ── 1. Monthly Revenue from real sales data ──
  // Group by month (last 4 months)
  const now = new Date();
  const monthlyRevenue = [0, 0, 0, 0];
  const monthLabels = [];

  for (let i = 3; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthLabels.push(d.toLocaleString('default', { month: 'short' }));
  }

  salesHistory.forEach(sale => {
    const saleDate = sale.date?.toDate ? sale.date.toDate() : new Date(sale.date);
    for (let i = 0; i < 4; i++) {
      const targetMonth = new Date(now.getFullYear(), now.getMonth() - (3 - i), 1);
      if (saleDate.getFullYear() === targetMonth.getFullYear() && saleDate.getMonth() === targetMonth.getMonth()) {
        monthlyRevenue[i] += (sale.price || 0) * (sale.qty || 1);
      }
    }
  });

  // ── Render Bar Chart ──
  const maxVal = Math.max(...monthlyRevenue, 1);
  chartContainer.innerHTML = '';
  monthlyRevenue.forEach((val, i) => {
    const percentHeight = (val / maxVal) * 80;
    const barOuter = document.createElement('div');
    barOuter.style.cssText = 'display:flex;flex-direction:column;align-items:center;width:60px;height:100%;justify-content:flex-end;gap:6px;';

    const barVal = document.createElement('div');
    barVal.style.cssText = 'font-size:0.72rem;color:var(--color-gold);font-weight:500;';
    barVal.textContent = val > 0 ? `₹${(val/1000).toFixed(0)}k` : '—';

    const bar = document.createElement('div');
    bar.style.cssText = `width:100%;height:${percentHeight || 4}%;background:linear-gradient(180deg, var(--color-gold) 0%, rgba(197,160,89,0.2) 100%);border-radius:6px 6px 0 0;transition:height 1s ease-out;`;

    const label = document.createElement('div');
    label.style.cssText = 'font-size:0.75rem;color:var(--text-muted);padding-top:4px;';
    label.textContent = monthLabels[i];

    barOuter.appendChild(barVal);
    barOuter.appendChild(bar);
    barOuter.appendChild(label);
    chartContainer.appendChild(barOuter);
  });

  // ── 2. Stock Category Totals ──
  let totalStockVal = 0;
  const categoryTotals = {};

  stockItems.forEach(item => {
    const estVal = (item.amount || 0) * (item.qty || 0);
    totalStockVal += estVal;
    categoryTotals[item.category] = (categoryTotals[item.category] || 0) + estVal;
  });

  totalRevEl.textContent = `₹${totalStockVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  // ── 3. Category Summary Bars ──
  categorySummaryList.innerHTML = '';
  Object.keys(categoryTotals).forEach(cat => {
    const val = categoryTotals[cat];
    const pct = totalStockVal > 0 ? (val / totalStockVal) * 100 : 0;
    const div = document.createElement('div');
    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;font-size:0.9rem;margin-bottom:6px;color:var(--text-secondary);">
        <span>${cat}</span>
        <span style="color:var(--color-gold);font-weight:600;">₹${val.toLocaleString('en-IN',{maximumFractionDigits:0})} (${pct.toFixed(0)}%)</span>
      </div>
      <div style="width:100%;height:6px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:var(--color-gold);border-radius:3px;"></div>
      </div>
    `;
    categorySummaryList.appendChild(div);
  });

  if (Object.keys(categoryTotals).length === 0) {
    categorySummaryList.innerHTML = `<p style="color:var(--text-muted);text-align:center;">No category data configured yet.</p>`;
  }
});
