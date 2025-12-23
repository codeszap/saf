function injectDrawer() {
    // URL-ilirundhu page name edukurom
    let path = window.location.pathname;
    let page = path.split("/").pop(); // Get filename
    if (!page || page === "") page = "index.html"; // Handle root path

    // Inject Theme Script dynamically
    if (!document.getElementById('themeScript')) {
        const script = document.createElement('script');
        script.id = 'themeScript';
        script.src = 'js/theme.js';
        document.head.appendChild(script);
    }
    // Inject Theme CSS dynamically
    if (!document.getElementById('themeCSS')) {
        const link = document.createElement('link');
        link.id = 'themeCSS';
        link.rel = 'stylesheet';
        link.href = 'css/theme.css';
        document.head.appendChild(link);
    }

    const drawerHTML = `
    <div id="drawerOverlay" onclick="toggleDrawer(false)" style="position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:2050; display:none;"></div>
    <div id="sideDrawer" style="position: fixed; top: 0; left: -280px; width: 280px; height: 100%; background: var(--bg-drawer); z-index: 2100; transition: 0.3s; padding: 30px 20px;">
        <div class="mb-5 ps-2 d-flex justify-content-between align-items-center">
            <div>
                <h4 class="fw-bold text-primary mb-0" style="font-weight:bold; color:#3b82f6;">ProCheck</h4>
                <p class="text-muted small mb-0">Task & Budget</p>
            </div>
            <!-- Theme Toggle Icon in Header -->
            <button onclick="toggleTheme()" class="btn btn-sm btn-outline-secondary rounded-circle border-0" style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
                <i class="bi bi-sun-fill" id="themeIcon" style="font-size: 1.2rem;"></i>
            </button>
        </div>
        
        <div onclick="navigationHandler('todo.html')" class="drawer-item ${page === 'todo.html' ? 'active' : ''}" id="nav-todo">
            <i class="bi bi-card-checklist"></i> Tasks
        </div>
        <div onclick="navigationHandler('purchase.html')" class="drawer-item ${page === 'purchase.html' ? 'active' : ''}" id="nav-purchase">
            <i class="bi bi-cart3"></i> Purchase
        </div>
        <div onclick="navigationHandler('loans.html')" class="drawer-item ${page === 'loans.html' ? 'active' : ''}" id="nav-loans">
            <i class="bi bi-bank"></i> Loans
        </div>
        <div onclick="navigationHandler('index.html')" class="drawer-item ${page === 'index.html' ? 'active' : ''}" id="nav-transaction">
            <i class="bi bi-arrow-left-right"></i> Transactions
        </div>
        <div onclick="navigationHandler('debitcredit.html')" class="drawer-item ${page === 'debitcredit.html' ? 'active' : ''}" id="nav-debitcredit">
            <i class="bi bi-credit-card-2-back"></i> Debit Credit
        </div>
    </div>

    <style>
        .drawer-item { 
            display: flex; align-items: center; padding: 14px 18px; 
            color: #888; text-decoration: none; border-radius: 12px; margin-bottom: 8px; 
            font-weight: 600; transition: 0.2s; cursor: pointer;
        }
        .drawer-item.active { background: #1a1a1a !important; color: #3b82f6 !important; }
        .drawer-item i { font-size: 20px; margin-right: 15px; }
        #sideDrawer.open { left: 0 !important; }
    </style>
    `;

    document.body.insertAdjacentHTML('afterbegin', drawerHTML);
}

// Navigation handle panni active class-ai update pannum
window.navigationHandler = function (pageName) {
    // 1. Memory-la save pannurom
    localStorage.setItem('lastActivePage', pageName);

    // 2. Page-ai load pannurom (Index-la loadPage function irukkanum)
    if (typeof loadPage === "function") {
        loadPage(pageName);
        toggleDrawer(false);

        // 3. UI-la active class-ai matrom
        document.querySelectorAll('.drawer-item').forEach(el => el.classList.remove('active'));

        // ID moolama select panni active class add panrom
        const activeId = 'nav-' + pageName.split('.')[0];
        const activeEl = document.getElementById(activeId);
        if (activeEl) {
            activeEl.classList.add('active');
        }
    } else {
        // Use replace to prevent history stack buildup when switching tabs
        window.location.replace(pageName);
    }
}

window.toggleDrawer = function (show) {
    const drawer = document.getElementById("sideDrawer");
    const overlay = document.getElementById("drawerOverlay");
    if (show) {
        drawer.classList.add("open");
        overlay.style.display = "block";
    } else {
        drawer.classList.remove("open");
        overlay.style.display = "none";
    }
}

// Inject pannumbothu execute aagum
injectDrawer();

// Sync theme icon if theme.js is already loaded
if (typeof window.updateToggleIcon === 'function') {
    const savedTheme = localStorage.getItem('app-theme') || 'light';
    window.updateToggleIcon(savedTheme);
}