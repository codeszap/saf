document.addEventListener('DOMContentLoaded', () => {
  const masterModal = document.getElementById('masterModal');
  const categoryForm = document.getElementById('categoryForm');
  const categoryList = document.getElementById('categoryList');
  
  const catNameInput = document.getElementById('catName');
  const modalTitle = document.getElementById('modalTitle');
  const submitBtn = document.getElementById('submitBtn');

  // Track edit state
  let editingId = null;

  // Load Categories (ensure each item has a unique ID)
  let categories = JSON.parse(localStorage.getItem('jewelette_categories')) || [
    { id: 1, name: 'Solitaire Rings' },
    { id: 2, name: 'Gold Necklaces' },
    { id: 3, name: 'Diamond Tennis Bracelets' }
  ];

  // Icons
  const editIcon = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`;
  const deleteIcon = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#ff5252" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;

  // Toggle Modal
  window.toggleMasterModal = (show) => {
    if (masterModal) {
      if (show) {
        masterModal.style.display = 'flex';
      } else {
        masterModal.style.display = 'none';
        resetFormState(); // Always clear state on close
      }
    }
  };

  function resetFormState() {
    editingId = null;
    catNameInput.value = '';
    if (modalTitle) modalTitle.textContent = 'New Jewelry Category';
    if (submitBtn) submitBtn.textContent = 'Save';
  }

  // Render Jewelry Categories List
  function renderCategories() {
    if (!categoryList) return;
    categoryList.innerHTML = '';

    if (categories.length === 0) {
      categoryList.innerHTML = `
        <li style="text-align: center; color: var(--text-muted); padding: 25px 15px;">
          No jewelry categories registered.<br>
          <span style="color: var(--color-gold); font-size: 0.85rem;">Tap the floating button below to create one.</span>
        </li>
      `;
      return;
    }

    categories.forEach((cat) => {
      // Ensure category has an ID
      if (!cat.id) {
        cat.id = Date.now() + Math.floor(Math.random() * 1000);
      }

      const li = document.createElement('li');
      li.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; background: rgba(255,255,255,0.02); border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);';
      
      li.innerHTML = `
        <span style="font-weight: 500;">${cat.name}</span>
        <div style="display: flex; gap: 12px;">
          <button onclick="editCategory(${cat.id})" style="background: none; border: none; color: var(--color-gold); cursor: pointer; padding: 4px;" title="Edit Category">
            ${editIcon}
          </button>
          <button onclick="removeCategory(${cat.id})" style="background: none; border: none; cursor: pointer; padding: 4px;" title="Delete Category">
            ${deleteIcon}
          </button>
        </div>
      `;
      categoryList.appendChild(li);
    });

    localStorage.setItem('jewelette_categories', JSON.stringify(categories));
  }

  // Edit Category Trigger
  window.editCategory = (id) => {
    const cat = categories.find(c => c.id == id);
    if (cat) {
      editingId = id;
      catNameInput.value = cat.name;
      if (modalTitle) modalTitle.textContent = 'Edit Jewelry Category';
      if (submitBtn) submitBtn.textContent = 'Update';
      toggleMasterModal(true);
    }
  };

  // Remove category
  window.removeCategory = (id) => {
    categories = categories.filter(c => c.id != id);
    renderCategories();
  };

  // Handle Form Submission
  categoryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = catNameInput.value.trim();
    
    if (name) {
      if (editingId) {
        // Update Action
        const cat = categories.find(c => c.id == editingId);
        if (cat) {
          cat.name = name;
        }
      } else {
        // Create Action
        categories.push({
          id: Date.now() + Math.floor(Math.random() * 1000),
          name: name
        });
      }
      
      toggleMasterModal(false);
      renderCategories();
    }
  });

  // Initial render calls
  renderCategories();
});
