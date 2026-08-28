/* ============================================================
MODULE SAISONS — DA visuelle saisonnière
============================================================ */
function applySeasonDA() {
  if (typeof myProfile === "undefined") return;
  const seasonId = myProfile.currentSeasonId || "s1";
  window.CURRENT_SEASON = seasonId;
  document.body.classList.remove("season-s1", "season-s2", "season-s3");
  document.body.classList.add("season-" + seasonId);
  const fx = document.getElementById("bg-fx");
  if (fx) {
    fx.querySelectorAll(".bg-shape").forEach(s => s.remove());
    const shapes = seasonId === "s2" ? ["🎃", "👻", "🦇", "🕸️"] : seasonId === "s3" ? ["❄️", "⛄", "🎄", ""] : ["◆", "▲", "■", "●"];
    const colors = seasonId === "s2" ? ["#ff8a00", "#b06bff", "#ff4b2b", "#e8dcc0"] : seasonId === "s3" ? ["#ffffff", "#7be8ff", "#ff4b2b", "#38ef7d"] : ["#00d2ff", "#ff007f", "#ffe600", "#00ff88"];
    for (let i = 0; i < 12; i++) {
      const s = document.createElement("div");
      s.className = "bg-shape";
      s.innerText = shapes[i % shapes.length];
      s.style.fontSize = (14 + Math.random() * 26) + "px";
      s.style.left = Math.random() * 100 + "%";
      s.color = colors[i % colors.length];
      s.style.animationDuration = (14 + Math.random() * 16) + "s";
      s.style.animationDelay = (-Math.random() * 25) + "s";
      fx.appendChild(s);
    }
  }
}
