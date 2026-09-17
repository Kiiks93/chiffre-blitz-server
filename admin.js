/* ============================================================
PANEL ADMIN — PC : fenêtre popup · Mobile : overlay dans l'app
============================================================ */

// 🔧 URL dynamique : pointe vers le backend (ou le frontend selon ton hébergement)
const ADMIN_PANEL_URL = (typeof CONFIG !== 'undefined' && CONFIG.SERVER_URL) 
  ? CONFIG.SERVER_URL + "/admin.html" 
  : "https://chiffre-blitz-server.onrender.com/admin.html"; 
// ⚠️ NOTE : Si admin.html est hébergé sur le MÊME domaine que ton index.html (frontend), 
// tu peux simplement mettre : const ADMIN_PANEL_URL = "admin.html";

function isAdminMobile() {
  return (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())
    || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints > 2 && Math.min(screen.width, screen.height) < 900);
}

function openAdminPanel() {
  if (isAdminMobile()) {
    let ov = document.getElementById('admin-overlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'admin-overlay';
      ov.style.cssText = 'position:fixed;inset:0;z-index:99998;background:#0f051d;display:flex;flex-direction:column;';
      
      // 🍏 Ajout de env(safe-area-inset-top) pour dégager l'encoche iPhone
      ov.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;padding-top:calc(8px + env(safe-area-inset-top));background:#0f051d;border-bottom:2px solid #00d2ff;z-index:10;">' +
          '<span style="color:#00d2ff;font-weight:900;font-size:14px;">⚡ ADMIN COMMAND CENTER</span>' +
          '<button id="admin-overlay-close" style="width:38px;height:38px;border-radius:50%;border:none;background:#ff4b2b;color:#fff;font-size:18px;font-weight:900;cursor:pointer;">✕</button>' +
        '</div>' +
        '<iframe id="admin-iframe" src="about:blank" style="flex:1;width:100%;border:none;background:#0f051d;" allow="clipboard-write"></iframe>';
      
      document.body.appendChild(ov);
      ov.querySelector('#admin-overlay-close').addEventListener('click', closeAdminPanel);
      
      // 🚀 Chargement initial avec cache-buster
      const f = ov.querySelector('#admin-iframe');
      f.src = ADMIN_PANEL_URL + '?v=' + Date.now();
    } else {
      ov.style.display = 'flex';
      const f = ov.querySelector('#admin-iframe');
      // 🔄 On force le rechargement pour être sûr d'avoir la dernière version et réinitialiser l'état
      f.src = ADMIN_PANEL_URL + '?v=' + Date.now();
    }
    return;
  }
  
  // 💻 PC : Popup classique
  window.open(ADMIN_PANEL_URL, "cb_admin", "width=430,height=780");
}

function closeAdminPanel() {
  const ov = document.getElementById('admin-overlay');
  if (ov) {
    ov.style.display = 'none';
    const f = ov.querySelector('#admin-iframe');
    // 🛑 about:blank tue les WebSockets et intervals de l'iframe pour économiser la batterie/RAM
    if (f) f.src = 'about:blank'; 
  }
  const modal = document.getElementById("admin-modal");
  if (modal) modal.style.display = "none";
}

// 📡 Écoute du message de fermeture envoyé par admin.html
window.addEventListener('message', (e) => {
  // Sécurité : on vérifie que c'est bien un objet avec la bonne action
  if (e.data && typeof e.data === 'object' && e.data.cbAction === 'close_admin') {
    closeAdminPanel();
  }
});
