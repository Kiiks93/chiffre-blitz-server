/* ============================================================
PANEL ADMIN — ouvre la fenêtre indépendante admin.html
(Le dashboard complet vit dans admin.html, pas ici.)
============================================================ */
function openAdminPanel() {
  // Ouvre l'admin dans une fenêtre dédiée (430x780)
  window.open("admin.html", "cb_admin", "width=430,height=780");
}

function closeAdminPanel() {
  // Garde-fou : ferme l'ancien modal in-game s'il existe encore
  const modal = document.getElementById("admin-modal");
  if (modal) modal.style.display = "none";
}
