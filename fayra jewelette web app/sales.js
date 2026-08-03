document.addEventListener('DOMContentLoaded', () => {
  const invoiceCustomerSelect = document.getElementById('invoiceCustomer');
  const previewCustomer = document.getElementById('previewCustomer');
  const billingForm = document.getElementById('billingForm');
  const itemNameInput = document.getElementById('itemName');
  const itemWeightInput = document.getElementById('itemWeight');
  const itemRateInput = document.getElementById('itemRate');
  const invoiceTableBody = document.getElementById('invoiceTableBody');
  
  const invoiceSubtotal = document.getElementById('invoiceSubtotal');
  const invoiceTax = document.getElementById('invoiceTax');
  const invoiceGrandTotal = document.getElementById('invoiceGrandTotal');
  const invoiceNumEl = document.getElementById('invoiceNum');

  // Load Customers
  const customers = JSON.parse(localStorage.getItem('jewelette_customers')) || [
    { name: 'Lady Genevieve', tier: 'Platinum' },
    { name: 'Sir Alexander', tier: 'Gold' },
    { name: 'Duchess Katherine', tier: 'Silver' }
  ];

  // Set Random Invoice Number
  invoiceNumEl.textContent = `#INV-${Math.floor(1000 + Math.random() * 9000)}`;

  function populateCustomers() {
    invoiceCustomerSelect.innerHTML = '';
    customers.forEach(cust => {
      const opt = document.createElement('option');
      opt.value = cust.name;
      opt.textContent = `${cust.name} (${cust.tier})`;
      invoiceCustomerSelect.appendChild(opt);
    });
    if(customers.length > 0) {
      previewCustomer.textContent = `${customers[0].name}`;
    }
  }

  invoiceCustomerSelect.addEventListener('change', (e) => {
    previewCustomer.textContent = e.target.value;
  });

  let invoiceItems = [];

  function updateInvoice() {
    invoiceTableBody.innerHTML = '';
    let subtotal = 0;

    invoiceItems.forEach((item, index) => {
      const total = item.weight * item.rate;
      subtotal += total;

      const tr = document.createElement('tr');
      tr.style.cssText = 'border-bottom: 1px solid rgba(255,255,255,0.03); color: var(--text-secondary);';
      tr.innerHTML = `
        <td style="padding: 12px 0;">
          ${item.name}
          <button onclick="removeInvoiceItem(${index})" style="background:none; border:none; color:#ff5252; margin-left:10px; cursor:pointer; font-size:0.75rem;">(Remove)</button>
        </td>
        <td style="padding: 12px 0; text-align: right;">${item.weight}g</td>
        <td style="padding: 12px 0; text-align: right;">$${item.rate.toFixed(2)}</td>
        <td style="padding: 12px 0; text-align: right;">$${total.toFixed(2)}</td>
      `;
      invoiceTableBody.appendChild(tr);
    });

    if (invoiceItems.length === 0) {
      invoiceTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--text-muted);">No items added to invoice.</td></tr>`;
    }

    const taxVal = subtotal * 0.05;
    const grandTotalVal = subtotal + taxVal;

    invoiceSubtotal.textContent = `$${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    invoiceTax.textContent = `$${taxVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    invoiceGrandTotal.textContent = `$${grandTotalVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  billingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = itemNameInput.value.trim();
    const weight = parseFloat(itemWeightInput.value);
    const rate = parseFloat(itemRateInput.value);

    if (name && weight && rate) {
      invoiceItems.push({ name, weight, rate });
      itemNameInput.value = '';
      itemWeightInput.value = '';
      itemRateInput.value = '';
      updateInvoice();
    }
  });

  window.removeInvoiceItem = (index) => {
    invoiceItems.splice(index, 1);
    updateInvoice();
  };

  window.clearInvoice = () => {
    invoiceItems = [];
    updateInvoice();
    invoiceNumEl.textContent = `#INV-${Math.floor(1000 + Math.random() * 9000)}`;
  };

  populateCustomers();
  updateInvoice();
});
