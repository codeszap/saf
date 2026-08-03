document.addEventListener('DOMContentLoaded', () => {
  const chartContainer = document.getElementById('chartContainer');
  const categorySummaryList = document.getElementById('categorySummaryList');
  const totalRevEl = document.getElementById('totalRev');

  // Load Inventory & Categories
  const stockItems = JSON.parse(localStorage.getItem('jewelette_stocks')) || [
    { code: 'FY-SR-101', desc: 'Aurora Solitaire Ring', category: 'Solitaire Rings', karat: '24K', weight: 4.8, qty: 15 },
    { code: 'FY-GN-205', desc: 'Imperial Gold Rope Chain', category: 'Gold Necklaces', karat: '22K', weight: 24.5, qty: 8 },
    { code: 'FY-TB-309', desc: 'Eternity Diamond Tennis Bracelet', category: 'Diamond Tennis Bracelets', karat: '18K', weight: 14.2, qty: 4 }
  ];

  // 1. Render Monthly Revenue Trend (Mock Bar Columns)
  const monthlyData = [125000, 142000, 198000, 245000];
  const maxVal = Math.max(...monthlyData);

  chartContainer.innerHTML = '';
  monthlyData.forEach(val => {
    const percentHeight = (val / maxVal) * 80; // Scale to fit container (max 80% height)
    
    const barOuter = document.createElement('div');
    barOuter.style.cssText = 'display: flex; flex-direction: column; align-items: center; width: 45px; height: 100%; justify-content: flex-end;';

    const barVal = document.createElement('div');
    barVal.style.cssText = 'font-size: 0.75rem; color: var(--color-gold); margin-bottom: 6px; font-weight: 500;';
    barVal.textContent = `$${Math.round(val / 1000)}k`;

    const bar = document.createElement('div');
    bar.style.cssText = `
      width: 100%;
      height: ${percentHeight}%;
      background: linear-gradient(180deg, var(--color-gold) 0%, rgba(197, 160, 89, 0.2) 100%);
      border-radius: 6px 6px 0 0;
      transition: height 1s ease-out;
    `;

    barOuter.appendChild(barVal);
    barOuter.appendChild(bar);
    chartContainer.appendChild(barOuter);
  });

  // 2. Compute Category Totals & Allocations from stock items
  let totalStockVal = 0;
  const categoryTotals = {};

  stockItems.forEach(item => {
    // Estimate value: weight * qty * Gold rate (~72/g) * luxury factor based on Karat
    let karatFactor = 1.0;
    if (item.karat === '22K') karatFactor = 0.916;
    if (item.karat === '18K') karatFactor = 0.750;
    
    const estVal = item.weight * item.qty * 72.45 * karatFactor;
    totalStockVal += estVal;

    categoryTotals[item.category] = (categoryTotals[item.category] || 0) + estVal;
  });

  // Display computed total
  totalRevEl.textContent = `$${totalStockVal.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

  // Render category contribution percentages
  categorySummaryList.innerHTML = '';
  Object.keys(categoryTotals).forEach(cat => {
    const val = categoryTotals[cat];
    const pct = totalStockVal > 0 ? (val / totalStockVal) * 100 : 0;

    const div = document.createElement('div');
    div.innerHTML = `
      <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 6px; color: var(--text-secondary);">
        <span>${cat}</span>
        <span style="color: var(--color-gold); font-weight: 600;">$${val.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${pct.toFixed(0)}%)</span>
      </div>
      <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden;">
        <div style="width: ${pct}%; height: 100%; background: var(--color-gold); border-radius: 3px;"></div>
      </div>
    `;
    categorySummaryList.appendChild(div);
  });

  if (Object.keys(categoryTotals).length === 0) {
    categorySummaryList.innerHTML = `<p style="color: var(--text-muted); text-align: center;">No category data configured yet.</p>`;
  }
});
