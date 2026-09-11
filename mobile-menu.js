/* ============================================================
MENU MOBILE — Sync affichage + Toggle "Admirer"
============================================================ */

// Affiche/cache le menu mobile en même temps que le menu principal
function showMobileMenu(show) {
    const mobileMenu = document.getElementById('screen-menu-mobile');
    if (!mobileMenu) return;
    mobileMenu.style.display = show ? 'flex' : 'none';
    if (show) syncMobileMenuButtons();
}

function toggleAdmireMode() {
    const mobileMenu = document.getElementById('screen-menu-mobile');
    const btn = document.getElementById('admire-btn');
    const icon = document.getElementById('admire-icon');
    const text = document.getElementById('admire-text');
    
    if (!mobileMenu) return;
    
    const isActive = mobileMenu.classList.toggle('admire-active');
    btn.classList.toggle('active', isActive);
    
    if (isActive) {
        icon.textContent = '🎮';
        text.textContent = 'Jouer';
        setTimeout(() => {
            if (mobileMenu.classList.contains('admire-active')) {
                toggleAdmireMode();
            }
        }, 8000);
    } else {
        icon.textContent = '👁️';
        text.textContent = 'Admirer';
    }
}

// Synchro des boutons conditionnels (Halloween/Noël/TOW)
function syncMobileMenuButtons() {
    const halloweenPc = document.getElementById('btn-halloween-menu');
    const noelPc = document.getElementById('btn-noel-menu');
    const towPc = document.getElementById('btn-tow-menu');
    
    const halloweenMobile = document.getElementById('mobile-btn-halloween');
    const noelMobile = document.getElementById('mobile-btn-noel');
    const towMobile = document.getElementById('mobile-btn-tow');
    
    if (halloweenPc && halloweenMobile) {
        halloweenMobile.style.display = halloweenPc.style.display;
    }
    if (noelPc && noelMobile) {
        noelMobile.style.display = noelPc.style.display;
    }
    if (towPc && towMobile) {
        towMobile.style.display = towPc.style.display;
    }
}

// Observer les changements de display
document.addEventListener('DOMContentLoaded', () => {
    ['btn-halloween-menu', 'btn-noel-menu', 'btn-tow-menu'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const observer = new MutationObserver(syncMobileMenuButtons);
            observer.observe(el, { attributes: true, attributeFilter: ['style'] });
        }
    });
});

// Hook showMainMenu() pour afficher aussi le menu mobile
(function(){
    const waitForShowMainMenu = setInterval(() => {
        if (typeof window.showMainMenu === 'function' && !window.showMainMenu.__hooked) {
            const original = window.showMainMenu;
            window.showMainMenu = function() {
                original.apply(this, arguments);
                showMobileMenu(true);
            };
            window.showMainMenu.__hooked = true;
            clearInterval(waitForShowMainMenu);
        }
    }, 100);
    
    // Hook pour cacher le menu mobile quand on change d'écran
    ['openTower', 'openSoloMenu', 'open1v1Hub', 'openShop', 'openLeaderboard', 
     'openRoomsScreen', 'openTournamentScreen', 'openBlitzPass', 'enterTrophyRoom',
     'showTitleScreen'].forEach(fn => {
        const wait = setInterval(() => {
            if (typeof window[fn] === 'function' && !window[fn].__hooked) {
                const original = window[fn];
                window[fn] = function() {
                    showMobileMenu(false);
                    return original.apply(this, arguments);
                };
                window[fn].__hooked = true;
                clearInterval(wait);
            }
        }, 100);
    });
})();