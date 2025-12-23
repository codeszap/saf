function injectBottomNav() {
    const path = window.location.pathname;
    const page = path.split("/").pop() || "index.html";

    const navHTML = `
        <div id="bottomNav">
            <div class="nav-item ${page === 'index.html' ? 'active' : ''}" onclick="window.location.href='index.html'">
                <i class="bi bi-house-door-fill"></i>
                <span>Home</span>
            </div>
            <div class="nav-item ${page === 'purchase.html' ? 'active' : ''}" onclick="window.location.href='purchase.html'">
                <i class="bi bi-bag-check-fill"></i>
                <span>Shop</span>
            </div>
            <div class="nav-item add-btn" onclick="window.location.href='add.html'">
                <div class="plus-circle">
                    <i class="bi bi-plus-lg"></i>
                </div>
            </div>
            <div class="nav-item ${page === 'loans.html' ? 'active' : ''}" onclick="window.location.href='loans.html'">
                <i class="bi bi-cash-stack"></i>
                <span>Loans</span>
            </div>
            <div class="nav-item ${page === 'todo.html' ? 'active' : ''}" onclick="window.location.href='todo.html'">
                <i class="bi bi-check2-square"></i>
                <span>Tasks</span>
            </div>
        </div>
        <style>
            #bottomNav {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                height: 70px;
                background: var(--bg-card);
                display: flex;
                justify-content: space-around;
                align-items: center;
                border-top: 1px solid var(--border-color);
                z-index: 2000;
                padding-bottom: env(safe-area-inset-bottom);
                backdrop-filter: blur(10px);
            }
            .nav-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                color: var(--text-muted);
                cursor: pointer;
                transition: 0.2s;
                flex: 1;
                text-decoration: none;
            }
            .nav-item i { font-size: 20px; }
            .nav-item span { font-size: 10px; font-weight: 700; margin-top: 2px; }
            .nav-item.active { color: var(--primary-color); }
            
            .add-btn { 
                position: relative; 
                top: -18px; 
                flex: 0 0 70px;
            }
            .plus-circle {
                width: 58px;
                height: 58px;
                background: var(--primary-color);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
                color: white;
                border: 4px solid var(--bg-main);
            }
            .plus-circle i { font-size: 24px; color: white !important; }
            
            /* Ensure body has enough space */
            body { padding-bottom: 80px !important; }
        </style>
    `;
    document.body.insertAdjacentHTML('beforeend', navHTML);
}
injectBottomNav();
