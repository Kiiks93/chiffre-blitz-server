/* ============================================================
PANEL ADMIN — ouvre la fenêtre indépendante admin.html
(PC : fenêtre popup | Mobile : overlay dans l'app)
============================================================ */
const ADMIN_URL = "https://chiffre-blitz-server.onrender.com/admin.html";

function openAdminPanel() {
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) 
    || (navigator.maxTouchPoints > 2 && Math.min(screen.width, screen.height) < 900);
  
  if (isMobile) {
    // 📱 MOBILE : overlay plein écran dans l'app
    let overlay = document.getElementById('admin-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
      return;
    }
    overlay = document.createElement('div');
    overlay.id = 'admin-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0f051d;display:flex;flex-direction:column;';
    
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#0f051d;border-bottom:1px solid #333;flex-shrink:0;';
    header.innerHTML = '<span style="color:#00d2ff;font-weight:900;font-size:14px;">⚡ ADMIN</span>';
    
    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = 'width:40px;height:40px;border-radius:50%;background:#ff4b2b;color:#fff;font-size:20px;font-weight:900;border:none;cursor:pointer;';
    closeBtn.textContent = '✕';
    closeBtn.onclick = closeAdminPanel;
    header.appendChild(closeBtn);
    
    const iframe = document.createElement('iframe');
    iframe.src = ADMIN_URL;
    iframe.style.cssText = 'flex:1;border:none;width:100%;background:#0f051d;';
    
    overlay.appendChild(header);
    overlay.appendChild(iframe);
    document.body.appendChild(overlay);
  } else {
    // 💻 PC : fenêtre popup classique
    window.open(ADMIN_URL, "cb_admin", "width=430,height=780");
  }
}

function closeAdminPanel() {
  // 📱 Mobile : fermer l'overlay
  const overlay = document.getElementById('admin-overlay');
  if (overlay) {
    overlay.style.display = 'none';
    return;
  }
  // Garde-fou : ferme l'ancien modal in-game s'il existe encore
  const modal = document.getElementById("admin-modal");
  if (modal) modal.style.display = "none";
}

// Écouter le message de fermeture depuis l'iframe admin
window.addEventListener('message', (e) => {
  if (e.data && e.data.action === 'close_admin_panel') {
    closeAdminPanel();
  }
});
