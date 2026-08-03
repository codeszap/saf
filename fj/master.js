document.addEventListener('DOMContentLoaded', async () => {
  const masterModal = document.getElementById('masterModal');
  const categoryForm = document.getElementById('categoryForm');
  const categoryList = document.getElementById('categoryList');
  const catNameInput = document.getElementById('catName');
  const modalTitle = document.getElementById('modalTitle');
  const submitBtn = document.getElementById('submitBtn');

  let editingDocId = null;
  let categories = [];

  // Firestore reference
  const categoriesRef = db.collection('categories');

  // Icons
  const editIcon = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`;
  const deleteIcon = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#ff5252" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;

  // ── Modal Toggle ──
  window.toggleMasterModal = (show) => {
    if (masterModal) {
      masterModal.style.display = show ? 'flex' : 'none';
      if (!show) resetFormState();
    }
  };

  function resetFormState() {
    editingDocId = null;
    catNameInput.value = '';
    if (modalTitle) modalTitle.textContent = 'New Jewelry Category';
    if (submitBtn) submitBtn.textContent = 'Save';
  }

  // ── Load & Render Categories ──
  async function loadCategories() {
    const snap = await categoriesRef.orderBy('name').get();
    categories = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
    renderCategories();
  }

  function renderCategories() {
    if (!categoryList) return;
    categoryList.innerHTML = '';

    if (categories.length === 0) {
      categoryList.innerHTML = `
        <li style="text-align:center;color:var(--text-muted);padding:25px 15px;">
          No jewelry categories registered.<br>
          <span style="color:var(--color-gold);font-size:0.85rem;">Tap the floating button below to create one.</span>
        </li>`;
      return;
    }

    categories.forEach(cat => {
      const li = document.createElement('li');
      li.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:12px 15px;background:rgba(255,255,255,0.02);border-radius:6px;border:1px solid rgba(255,255,255,0.05);';
      li.innerHTML = `
        <span style="font-weight:500;">${cat.name}</span>
        <div style="display:flex;gap:12px;">
          <button onclick="editCategory('${cat.docId}')" style="background:none;border:none;color:var(--color-gold);cursor:pointer;padding:4px;" title="Edit Category">${editIcon}</button>
          <button onclick="removeCategory('${cat.docId}')" style="background:none;border:none;cursor:pointer;padding:4px;" title="Delete Category">${deleteIcon}</button>
        </div>`;
      categoryList.appendChild(li);
    });
  }

  // ── Edit Category ──
  window.editCategory = (docId) => {
    const cat = categories.find(c => c.docId === docId);
    if (cat) {
      editingDocId = docId;
      catNameInput.value = cat.name;
      if (modalTitle) modalTitle.textContent = 'Edit Jewelry Category';
      if (submitBtn) submitBtn.textContent = 'Update';
      toggleMasterModal(true);
    }
  };

  // ── Delete Category ──
  window.removeCategory = async (docId) => {
    if (confirm('Delete this category?')) {
      await categoriesRef.doc(docId).delete();
      await loadCategories();
    }
  };

  // ── Save / Update Category ──
  categoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = catNameInput.value.trim();
    if (!name) return;

    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;

    if (editingDocId) {
      await categoriesRef.doc(editingDocId).update({ name });
    } else {
      await categoriesRef.add({ name, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    }

    submitBtn.disabled = false;
    toggleMasterModal(false);
    await loadCategories();
  });

  // ── Init ──
  await loadCategories();
});
