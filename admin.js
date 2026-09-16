/* ============================================================
PANEL ADMIN — ouvre la fenêtre indépendante admin.html
Sur mobile : overlay iframe superposé dans l'app
Sur PC : fenêtre popup séparée
============================================================ */
function openAdminPanel() {
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || 
                   (navigator.maxTouchPoints > 2 && Math.min(screen.width, screen.height) < 900);
  
  if (isMobile) {
    // Mobile : ouvrir en overlay iframe superposé dans l'app
    let overlay = document.getElementById('admin-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
      return;
    }
    overlay = document.createElement('div');
    overlay.id = 'admin-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.97);display:flex;flex-direction:column;';
    overlay.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:#0f051d;border-bottom:2px solid #00d2ff;flex-shrink:0;">
        <span style="color:#00d2ff;font-weight:900;font-size:15px;">⚡ ADMIN COMMAND CENTER</span>
        <button onclick="closeAdminPanel()" style="background:none;border:none;color:#ff4b2b;font-size:24px;font-weight:900;cursor:pointer;padding:4px 8px;line-height:1;">✕</button>
      </div>
      <iframe src="https://chiffre-blitz-server.onrender.com/admin.html" style="flex:1;border:none;width:100%;"></iframe>
    `;
    document.body.appendChild(overlay);
  } else {
    // PC : fenêtre popup séparée
    window.open("https://chiffre-blitz-server.onrender.com/admin.html", "cb_admin", "width=430,height=780");
  }
}

function closeAdminPanel() {
  // Mobile : masquer l'overlay
  const overlay = document.getElementById('admin-overlay');
  if (overlay) {
    overlay.style.display = 'none';
    return;
  }
  // Garde-fou : ferme l'ancien modal in-game s'il existe encore
  const modal = document.getElementById("admin-modal");
  if (modal) modal.style.display = "none";
}
