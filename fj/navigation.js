document.addEventListener('DOMContentLoaded', () => {
  const brandName = "Fayra Jewelette";
  
  // Icon SVG definitions
  const icons = {
    home: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
    master: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="M12 6v6l4 2"></path></svg>`,
    sales: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>`,
    stocks: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>`,
    reports: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`
  };

  const navItems = [
    { name: "Home", url: "index.html", icon: icons.home },
    { name: "Master", url: "master.html", icon: icons.master },
    { name: "Sales", url: "sales.html", icon: icons.sales },
    { name: "Stocks", url: "stocks.html", icon: icons.stocks },
    { name: "Reports", url: "reports.html", icon: icons.reports }
  ];

  const path = window.location.pathname;
  const page = path.substring(path.lastIndexOf('/') + 1) || 'index.html';

  const appContainer = document.querySelector('.app-container');
  if (!appContainer) return;

  // Create mobile header
  const mobileHeader = document.createElement('div');
  mobileHeader.className = 'mobile-header';
  mobileHeader.innerHTML = `
    <button class="menu-toggle" id="menuToggle" type="button">
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
    </button>
    <a href="index.html" class="brand-logo text-decoration-none">${brandName}</a>
    <div style="width: 24px;"></div>
  `;

  // Create Sidebar
  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  sidebar.id = 'sidebarMenu';

  let sidebarLinksHtml = '';
  navItems.forEach(item => {
    const isActive = page === item.url || (page === '' && item.url === 'index.html');
    sidebarLinksHtml += `
      <li class="nav-item ${isActive ? 'active' : ''}">
        <a href="${item.url}" class="text-decoration-none">
          ${item.icon}
          <span>${item.name}</span>
        </a>
      </li>
    `;
  });

  sidebar.innerHTML = `
    <div class="brand-section">
      <a href="index.html" class="brand-logo text-decoration-none">${brandName}</a>
    </div>
    <ul class="nav-links list-unstyled flex-column gap-2">
      ${sidebarLinksHtml}
    </ul>
  `;

  // Create Overlay for mobile drawer
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  overlay.id = 'sidebarOverlay';

  // Create Bottom Nav
  const bottomNav = document.createElement('nav');
  bottomNav.className = 'bottom-nav';
  
  let bottomNavLinksHtml = '';
  navItems.forEach(item => {
    const isActive = page === item.url || (page === '' && item.url === 'index.html');
    bottomNavLinksHtml += `
      <a href="${item.url}" class="bottom-nav-item ${isActive ? 'active' : ''}">
        ${item.icon}
        <span>${item.name}</span>
      </a>
    `;
  });
  bottomNav.innerHTML = bottomNavLinksHtml;

  // Insert elements into the container
  appContainer.insertBefore(sidebar, appContainer.firstChild);
  appContainer.insertBefore(mobileHeader, appContainer.firstChild);
  appContainer.appendChild(overlay);
  appContainer.appendChild(bottomNav);

  // Toggle Sidebar Drawer actions
  const menuToggleBtn = document.getElementById('menuToggle');
  
  function openSidebar() {
    sidebar.classList.add('open');
    overlay.classList.add('active');
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  }

  if (menuToggleBtn) {
    menuToggleBtn.addEventListener('click', openSidebar);
  }
  
  overlay.addEventListener('click', closeSidebar);
});
