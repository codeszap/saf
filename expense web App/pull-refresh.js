/* Global Pull to Refresh Logic */
(function () {
    let startY = 0;
    let isPulling = false;
    const threshold = 100;

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
            // Resistive feel
            const moveY = Math.min(pullDistance * 0.4, threshold + 30);
            indicator.style.top = `${moveY - 60}px`;
            indicator.style.transform = `translateX(-50%) rotate(${pullDistance * 1.5}deg)`;

            if (moveY > threshold) {
                indicator.style.background = '#10b981'; // Success Green
            } else {
                indicator.style.background = 'var(--primary-color)';
            }
        } else if (pullDistance < 0) {
            isPulling = false;
            indicator.style.top = '-60px';
        }
    }, { passive: true });

    window.addEventListener('touchend', () => {
        if (!isPulling) return;
        const currentTop = parseInt(indicator.style.top);
        if (currentTop >= threshold - 60) {
            indicator.style.top = '25px';
            indicator.classList.add('ptr-spinning');
            indicator.style.background = '#10b981';

            // Short delay for visual feedback before reload
            setTimeout(() => {
                location.reload();
            }, 600);
        } else {
            indicator.style.top = '-60px';
        }
        isPulling = false;
    });
})();
