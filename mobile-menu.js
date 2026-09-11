/* ============================================================
MENU MOBILE — Toggle "Admirer" + synchro boutons conditionnels
============================================================ */
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
        // Auto-réactiver après 8s
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

// Synchro des boutons conditionnels (Halloween/Noël/TOW) entre menu PC et mobile
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

// Observer les changements de display sur les boutons PC
const observer = new MutationObserver(syncMobileMenuButtons);
document.addEventListener('DOMContentLoaded', () => {
    ['btn-halloween-menu', 'btn-noel-menu', 'btn-tow-menu'].forEach(id => {
        const el = document.getElementById(id);
        if (el) observer.observe(el, { attributes: true, attributeFilter: ['style'] });
    });
    syncMobileMenuButtons();
});
