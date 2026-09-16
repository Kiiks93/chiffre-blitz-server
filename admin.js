/* ============================================================
PANEL ADMIN — Ouvre le panel dans une fenêtre plein écran (Mobile & PC)
============================================================ */
function openAdminPanel() {
  let modal = document.getElementById("admin-fullscreen-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "admin-fullscreen-modal";
    modal.style.cssText = `
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      background: #0f051d;
      z-index: 99999;
      display: flex;
      flex-direction: column;
    `;

    // Barre supérieure avec la croix
    const header = document.createElement("div");
    header.style.cssText = `
      width: 100%;
      height: 50px;
      background: #1e1035;
      border-bottom: 2px solid #00d2ff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 15px;
      box-sizing: border-box;
      flex-shrink: 0;
      box-shadow: 0 4px 15px rgba(0,0,0,0.5);
    `;

    const title = document.createElement("div");
    title.innerText = "⚡ Admin Panel";
    title.style.cssText = `
      color: #00d2ff;
      font-weight: 900;
      font-size: 16px;
      letter-spacing: 1px;
      text-shadow: 0 0 10px rgba(0, 210, 255, 0.5);
    `;

    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = "✕";
    closeBtn.style.cssText = `
      width: 36px;
      height: 36px;
      background: rgba(255, 75, 43, 0.2);
      color: #ff4b2b;
      border: 2px solid #ff4b2b;
      border-radius: 50%;
      font-size: 18px;
      font-weight: bold;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 10px rgba(255, 75, 43, 0.4);
      transition: transform 0.1s;
    `;
    closeBtn.onmousedown = () => closeBtn.style.transform = "scale(0.9)";
    closeBtn.onmouseup = () => closeBtn.style.transform = "scale(1)";
    closeBtn.ontouchstart = () => closeBtn.style.transform = "scale(0.9)";
    closeBtn.ontouchend = () => closeBtn.style.transform = "scale(1)";
    closeBtn.onclick = closeAdminPanel;

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Iframe pour charger admin.html sans quitter l'app
    const iframe = document.createElement("iframe");
    iframe.id = "admin-iframe";
    iframe.src = "https://chiffre-blitz-server.onrender.com/admin.html";
    iframe.style.cssText = `
      width: 100%;
      flex: 1;
      border: none;
      background: #0f051d;
    `;
    iframe.setAttribute("allow", "clipboard-write");

    modal.appendChild(header);
    modal.appendChild(iframe);
    document.body.appendChild(modal);
  } else {
    modal.style.display = "flex";
    const iframe = document.getElementById("admin-iframe");
    if (iframe) {
      // Recharger pour s'assurer que l'état est frais à l'ouverture
      iframe.src = "https://chiffre-blitz-server.onrender.com/admin.html";
    }
  }
}

function closeAdminPanel() {
  const modal = document.getElementById("admin-fullscreen-modal");
  if (modal) {
    modal.style.display = "none";
    // On vide l'iframe pour couper la connexion Socket.io interne et libérer la mémoire
    const iframe = document.getElementById("admin-iframe");
    if (iframe) iframe.src = "about:blank";
  }
}