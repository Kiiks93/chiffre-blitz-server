/* ============================================================
VERSION.JS — Bannière update + version gating
--------------------------------------------------------------
WORKFLOW À CHAQUE RELEASE :
 1. Monte VERSION_CLIENT.version (ex: "1.4.0") + versionCode Capacitor
 2. Déploie le client
 3. Mets à jour VERSION_GATE côté serveur (latest / minWeb)
============================================================ */
const VERSION_CLIENT = {
  version: "1.3.0",                                  // version WEB actuelle (semver)
  shell: 4,                                          // versionCode Capacitor (Android)
  serverUrl: "https://chiffre-blitz-server.onrender.com"        // ← REMPLACE par ton URL Render
};

let VG_state = null;

/* ----- CSS ----- */
(function(){
  const s = document.createElement("style");
  s.textContent = `
    #vg-banner{position:fixed;top:0;left:0;right:0;z-index:99990;display:none;align-items:center;gap:10px;padding:8px 12px;background:linear-gradient(90deg,#0f051d,#1a1030);border-bottom:2px solid #f8b500;color:#fff;font-size:12px;font-weight:700;}
    #vg-banner .vg-ico{font-size:18px;}
    #vg-banner .vg-txt{flex:1;}
    #vg-banner button{border:none;border-radius:8px;padding:6px 12px;font-weight:900;cursor:pointer;}
    #vg-banner .vg-up{background:linear-gradient(180deg,#f8b500,#c9a227);color:#3a2a05;}
    #vg-banner .vg-x{background:#1a1a2e;color:#aaa;border:1px solid #333;}
    #vg-block{position:fixed;inset:0;z-index:99999;background:#05050f;display:none;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;padding:20px;}
    #vg-block .vg-big{font-size:44px;}
    #vg-block h2{color:#00d2ff;margin:0;font-size:22px;}
    #vg-block p{color:#aaa;font-size:13px;max-width:340px;line-height:1.5;margin:0;}
    #vg-block .vg-btn{background:linear-gradient(180deg,#3ae05a,#1a9a3a);border:3px solid #0a5a1a;border-radius:14px;padding:14px 40px;font-size:18px;font-weight:900;color:#fff;cursor:pointer;box-shadow:0 6px 0 #0a5a1a;}
  `;
  document.head.appendChild(s);
})();

/* ----- Utils ----- */
function vgCompare(a, b) {
  const pa = String(a).split(".").map(Number), pb = String(b).split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const x = pa[i] || 0, y = pb[i] || 0;
    if (x < y) return -1;
    if (x > y) return 1;
  }
  return 0;
}
function vgIsNative() { return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); }
function vgFr() { return (typeof currentLang !== "undefined" ? currentLang === "fr" : true); }

/* ----- UI : bannière douce (optionnelle) ----- */
function vgShowBanner() {
  if (document.getElementById("vg-banner")) return;
  const fr = vgFr();
  const b = document.createElement("div");
  b.id = "vg-banner";
  b.innerHTML = `<span class="vg-ico">✨</span><span class="vg-txt">${fr ? "Nouvelle version disponible !" : "New version available!"}</span><button class="vg-up" onclick="vgGoUpdate()">${fr ? "MAJ" : "UPDATE"}</button><button class="vg-x" onclick="this.parentNode.style.display='none'">✕</button>`;
  document.body.appendChild(b);
  b.style.display = "flex";
}

/* ----- UI : écran bloquant (obligatoire) ----- */
function vgShowBlock() {
  if (document.getElementById("vg-block")) return;
  const fr = vgFr();
  const b = document.createElement("div");
  b.id = "vg-block";
  b.innerHTML = `
    <div class="vg-big">🔄</div>
    <h2>${fr ? "Mise à jour obligatoire" : "Update required"}</h2>
    <p>${fr ? "Ta version de Chiffre Blitz est trop ancienne pour continuer. Mets-la à jour pour retrouver ton aventure !" : "Your Chiffre Blitz version is too old to continue. Update to get back to your adventure!"}</p>
    <button class="vg-btn" onclick="vgGoUpdate()">${fr ? "METTRE À JOUR" : "UPDATE NOW"}</button>`;
  document.body.appendChild(b);
  b.style.display = "flex";
}

function vgGoUpdate() {
  if (!VG_state) return;
  window.open(vgIsNative() ? VG_state.urlAndroid : VG_state.urlWeb, "_blank");
}

/* ----- Vérification au chargement ----- */
async function vgCheck() {
  try {
    const r = await fetch(VERSION_CLIENT.serverUrl + "/version", { cache: "no-store" });
    if (!r.ok) return;
    VG_state = await r.json();
    // 1) App native trop vieille → In-App Updates si plugin installé, sinon blocage
    if (vgIsNative() && VERSION_CLIENT.shell < (VG_state.minShell || 0)) {
      try {
        const mod = await import("@capacitor/in-app-update");
        if (mod && mod.InAppUpdate) { await mod.InAppUpdate.startUpdate({ updatePriority: 5 }); return; }
      } catch (e) { /* plugin absent → fallback blocage */ }
      vgShowBlock(); return;
    }
    // 2) Version web sous le minimum → blocage dur
    if (vgCompare(VERSION_CLIENT.version, VG_state.minWeb || VERSION_CLIENT.version) < 0) { vgShowBlock(); return; }
    // 3) Version sous la dernière → bannière douce
    if (vgCompare(VERSION_CLIENT.version, VG_state.latest || VERSION_CLIENT.version) < 0) vgShowBanner();
  } catch (e) { /* serveur injoignable : on ne bloque pas le jeu */ }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", vgCheck);
else vgCheck();
