/* ============================================================
PANEL ADMIN — PC : fenêtre popup · Mobile : overlay dans l'app
============================================================ */
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
      ov.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#0f051d;border-bottom:2px solid #00d2ff;">' +
          '<span style="color:#00d2ff;font-weight:900;font-size:14px;">⚡ ADMIN COMMAND CENTER</span>' +
          '<button id="admin-overlay-close" style="width:38px;height:38px;border-radius:50%;border:none;background:#ff4b2b;color:#fff;font-size:18px;font-weight:900;cursor:pointer;">✕</button>' +
        '</div>' +
        '<iframe id="admin-iframe" src="admin.html" style="flex:1;width:100%;border:none;background:#0f051d;"></iframe>';
      document.body.appendChild(ov);
      ov.querySelector('#admin-overlay-close').addEventListener('click', closeAdminPanel);
    } else {
      ov.style.display = 'flex';
      ov.querySelector('#admin-iframe').src = 'admin.html';
    }
    return;
  }
  window.open("admin.html", "cb_admin", "width=430,height=780");
}

function closeAdminPanel() {
  const ov = document.getElementById('admin-overlay');
  if (ov) {
    ov.style.display = 'none';
    const f = ov.querySelector('#admin-iframe');
    if (f) f.src = 'about:blank';
  }
  const modal = document.getElementById("admin-modal");
  if (modal) modal.style.display = "none";
}

// La croix DANS admin.html (iframe) demande au parent de fermer l'overlay
window.addEventListener('message', (e) => {
  if (e.data && e.data.cbAction === 'close_admin') closeAdminPanel();
});
