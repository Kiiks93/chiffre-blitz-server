/* ============================================================
PANEL ADMIN — ouvre la fenêtre indépendante admin.html
(Le dashboard complet vit dans admin.html, pas ici.)
============================================================ */
function openAdminPanel() {
  const isMobile = /Android|iPhone|iPad|iPod|Tablet|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 2 && Math.min(screen.width, screen.height) < 900);

  if (isMobile) {
    // 📱 MOBILE : ouvrir en overlay iframe DANS l'application (pas de Chrome externe)
    let overlay = document.getElementById('admin-panel-overlay');
    if (overlay) {
      overlay.style.display = 'block';
      return;
    }
    overlay = document.createElement('div');
    overlay.id = 'admin-panel-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#0f051d;';
    overlay.innerHTML = '<iframe src="admin.html" style="width:100%;height:100%;border:none;"></iframe>';
    document.body.appendChild(overlay);
  } else {
    // 💻 PC : fenêtre popup séparée (comportement actuel)
    window.open("admin.html", "cb_admin", "width=430,height=780");
  }
}

function closeAdminPanel() {
  // 📱 Mobile : fermer l'overlay
  const overlay = document.getElementById('admin-panel-overlay');
  if (overlay) {
    overlay.style.display = 'none';
    return;
  }
  // Garde-fou : ferme l'ancien modal in-game s'il existe encore
  const modal = document.getElementById("admin-modal");
  if (modal) modal.style.display = "none";
}

// Écoute le message de fermeture envoyé depuis l'iframe admin
window.addEventListener('message', (e) => {
  if (e.data && e.data.action === 'close_admin_panel') {
    closeAdminPanel();
  }
});
