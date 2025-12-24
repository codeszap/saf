function injectBottomNav() {
    const path = window.location.pathname;
    const page = path.split("/").pop() || "index.html";

    const navHTML = `
        <div id="bottomNav">
            <div class="nav-item ${page === 'index.html' ? 'active' : ''}" onclick="window.location.replace('index.html')">
                <i class="bi bi-house-door-fill"></i>
                <span>Home</span>
            </div>
            <div class="nav-item ${page === 'purchase.html' ? 'active' : ''}" onclick="window.location.replace('purchase.html')">
                <i class="bi bi-bag-check-fill"></i>
                <span>Shop</span>
            </div>
            <div class="nav-item add-btn" onclick="window.location.href='add.html'">
                <div class="plus-circle">
                    <i class="bi bi-plus-lg"></i>
                </div>
            </div>
            <div class="nav-item ${page === 'loans.html' ? 'active' : ''}" onclick="window.location.replace('loans.html')">
                <i class="bi bi-cash-stack"></i>
                <span>Loans</span>
            </div>
            <div class="nav-item ${page === 'todo.html' ? 'active' : ''}" onclick="window.location.replace('todo.html')">
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
            
            /* FAB adjustments - Push up anything fixed at bottom */
            #addBtn, .add-fab, .bottom-bar { 
                bottom: 85px !important; 
            }
            #voiceFab { bottom: 155px !important; }
            #voiceStatusOverlay { bottom: 225px !important; }
            
            /* Specific tweaks for Todo bottom bar to integrate better */
            .bottom-bar {
                border-top: 1px solid var(--border-color);
                box-shadow: 0 -5px 15px rgba(0,0,0,0.05);
            }

            /* Ensure body has enough space */
            body { padding-bottom: 90px !important; }
        </style>
    `;
    document.body.insertAdjacentHTML('beforeend', navHTML);
}
injectBottomNav();

/* Global Pull to Refresh Logic */
(function () {
    let startY = 0;
    let isPulling = false;
    const threshold = 120;

    const indicator = document.createElement('div');
    indicator.id = 'pullRefreshIndicator';
    indicator.innerHTML = '<i class="bi bi-arrow-clockwise"></i>';
    document.body.prepend(indicator);

    const style = document.createElement('style');
    style.innerHTML = `
        #pullRefreshIndicator {
            position: fixed;
            top: -60px;
            left: 50%;
            transform: translateX(-50%);
            width: 45px;
            height: 45px;
            background: var(--primary-color);
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            box-shadow: 0 5px 15px rgba(0,0,0,0.25);
            transition: top 0.2s ease, transform 0.1s linear, background 0.3s;
            pointer-events: none;
        }
        #pullRefreshIndicator i { font-size: 22px; }
        .ptr-spinning { animation: ptr-spin 0.6s linear infinite; }
        @keyframes ptr-spin { 
            0% { transform: translateX(-50%) rotate(0deg); }
            100% { transform: translateX(-50%) rotate(360deg); }
        }
    `;
    document.head.appendChild(style);

    window.addEventListener('touchstart', (e) => {
        if (window.scrollY <= 1) {
            startY = e.touches[0].pageY;
            isPulling = true;
        }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        if (!isPulling) return;
        const y = e.touches[0].pageY;
        const pullDistance = y - startY;

        if (pullDistance > 0 && window.scrollY <= 1) {
            const moveY = Math.min(pullDistance * 0.4, threshold + 30);
            indicator.style.top = `${moveY - 60}px`;
            indicator.style.transform = `translateX(-50%) rotate(${pullDistance * 1.5}deg)`;

            if (moveY > threshold) {
                indicator.style.background = '#10b981';
            } else {
                indicator.style.background = 'var(--primary-color)';
            }
        }
    }, { passive: true });

    window.addEventListener('touchend', () => {
        if (!isPulling) return;
        const currentTop = parseInt(indicator.style.top);
        if (currentTop >= threshold - 60) {
            indicator.style.top = '25px';
            indicator.classList.add('ptr-spinning');
            setTimeout(() => { location.reload(); }, 500);
        } else {
            indicator.style.top = '-60px';
        }
        isPulling = false;
    });
})();
