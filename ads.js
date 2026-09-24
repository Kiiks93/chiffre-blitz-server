/* ============================================================
ADS.JS — Pubs : AdMob réel si APK Capacitor, simulé sinon
============================================================ */
const ADMOB_IDS = {
  interstitial: "ca-app-pub-1819170082992254/9095343035",
  rewarded: "ca-app-pub-1819170082992254/1893666559"
};

const ADS = {
  ready: false,
  native() {
    return !!(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob);
  },
  // ✅ INITIALISATION AdMob (était manquante → pubs plantées)
   init() {
    if (!this.native()) return Promise.resolve(false);
    const A = window.Capacitor.Plugins.AdMob;
    if (!A || typeof A.initialize !== 'function') return Promise.resolve(false);
       const start = () => A.initialize()
      .then(() => { this.ready = true; this.preloadRewarded(); return true; })
      .catch(() => { this.ready = false; return false; });
    // ✅ Consentement UMP (RGPD) obligatoire pour la France/UE
    if (typeof A.requestConsentInfo === 'function') {
      return A.requestConsentInfo({}).then(start).catch(start);
    }
    return start();
  },
  showInterstitial() {
    if (!this.native()) return Promise.resolve(false);
    const A = window.Capacitor.Plugins.AdMob;
    const prep = () => A.prepareInterstitial({ adId: ADMOB_IDS.interstitial })
      .then(() => A.showInterstitial())
      .then(() => true);
    return prep()
      .catch(() => this.init().then(() => prep()))   // 1 retry après init
      .catch(() => false);
  },
     preloadRewarded() {
    if (!this.native()) return;
    const A = window.Capacitor.Plugins.AdMob;
    if (!A || typeof A.prepareRewardVideoAd !== 'function') return;
    A.prepareRewardVideoAd({ adId: ADMOB_IDS.rewarded })
      .then(() => { this.__rwReady = true; })
      .catch(() => { this.__rwReady = false; });
  },
  showRewarded() {
    if (!this.native()) return Promise.resolve({ ok: false, early: false });
    const A = window.Capacitor.Plugins.AdMob;
    return new Promise((resolve) => {
      let earned = false, shown = false, done = false;
      const handles = [];
      const finish = (ok, early) => {
        if (done) return; done = true;
        handles.forEach(h => { try { h.remove(); } catch (e) {} });
        ADS.__rwReady = false;
        setTimeout(() => ADS.preloadRewarded(), 1500);   // ✅ prépare la suivante
        resolve({ ok, early });
      };
      const on = (name, cb) => {
        try {
          const p = A.addListener(name, cb);
          if (p && p.then) p.then(h => handles.push(h)); else if (p) handles.push(p);
        } catch (e) {}
      };
      // ✅ Toutes les familles de noms d'événements selon versions du plugin
      ['onRewardedVideoAdReward','rewardedVideoAdReward'].forEach(n => on(n, () => { earned = true; }));
      ['onRewardedVideoAdDismissed','rewardedVideoAdDidDismiss'].forEach(n => on(n, () => finish(earned, !earned && shown)));
      // ✅ Si déjà préchargée → affichage immédiat
      const prep = this.__rwReady ? Promise.resolve() : A.prepareRewardVideoAd({ adId: ADMOB_IDS.rewarded });
      prep.then(() => A.showRewardVideoAd())
        .then((payload) => {
          shown = true;
          if (payload && (payload.adRewardAmount !== undefined || payload.adRewardType !== undefined)) earned = true;
        })
        .catch(() => finish(false, false));
      setTimeout(() => finish(earned, !earned && shown), 120000);   // ✅ garde 2 min (vidéo 30 s)
    });
  }
};
window.addEventListener('load', () => { setTimeout(() => ADS.init(), 1000); });

let __adDone = null, __adIv = null, __skipIv = null;

function hideAdModals() {
  ['modal-launch-ad', 'simulated-ad-overlay', 'modal-support'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'none';
  });
}

function proceedAfterAd() {
  hideAdModals();
  if (typeof showMainMenu === 'function') { showMainMenu(); return; }
  const t = document.getElementById('screen-title'); if (t) t.style.display = 'none';
}

function showSimulatedAd(done) {
  __adDone = done;
  const ov = document.getElementById('simulated-ad-overlay');
  const timer = document.getElementById('ad-timer');
  const closeBtn = document.getElementById('ad-close-btn');
  if (!ov) { if (done) done(); return; }
  ov.style.display = 'flex';
  if (closeBtn) closeBtn.style.display = 'none';
  let t = 5; if (timer) timer.innerText = t;
  if (__adIv) clearInterval(__adIv);
  __adIv = setInterval(() => {
    t--; if (timer) timer.innerText = Math.max(t, 0);
    if (t <= 0) { clearInterval(__adIv); __adIv = null; if (closeBtn) closeBtn.style.display = 'inline-block'; }
  }, 1000);
}

function closeSimulatedAd() {
  if (__adIv) { clearInterval(__adIv); __adIv = null; }
  const ov = document.getElementById('simulated-ad-overlay'); if (ov) ov.style.display = 'none';
  const done = __adDone; __adDone = null;
  if (done) done();
}

function openLaunchAdModal() { playLaunchAd(); }

// ✅ FIX : plus JAMAIS bloqué — garde 10 s + try/catch + callback unique
function playLaunchAd() {
  hideAdModals();
  let proceeded = false;
  const go = () => { if (proceeded) return; proceeded = true; proceedAfterAd(); };
  if (ADS.native()) {
    const guard = setTimeout(go, 10000); // anti-blocage : même si la pub plante/pend, on arrive au menu
    try {
      ADS.showInterstitial().then(() => { clearTimeout(guard); go(); });
    } catch (e) { clearTimeout(guard); go(); }
    return;
  }
  showSimulatedAd(go);
}

// ✅ FIX : récap préservé (x2, bouton grisé) + garde anti-blocage sur rewarded
function watchAdToDoubleReward() {
  if (typeof rewardDoubled !== 'undefined' && rewardDoubled) return;
  const d = (typeof i18n !== 'undefined' && i18n[currentLang]) ? i18n[currentLang] : null;
  const onDone = () => {
    rewardDoubled = true;
    socket.emit('double_reward');
    currentCoinsGained *= 2;
    const el = document.getElementById('recap-coins-gained');
    if (el) el.innerText = `+${currentCoinsGained} (x2 ⚡)`;
    const btn = document.getElementById('btn-double-reward');
    if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; if (d) btn.innerText = d.reward_doubled; }
    const recap = document.getElementById('recap-modal');
    if (recap) recap.style.display = 'flex';
  };
  if (ADS.native()) {
    let proceeded = false;
    const go = (ok) => {
      if (proceeded) return; proceeded = true;
      if (ok) onDone();
      else if (typeof showNotificationToast === 'function') {
        showNotificationToast(currentLang === 'fr' ? '❌ Pub indisponible pour le moment' : '❌ Ad unavailable right now', 'announcement');
        const recap = document.getElementById('recap-modal'); if (recap) recap.style.display = 'flex';
      }
    };
    const guard = setTimeout(() => go(false), 120000);
    try { ADS.showRewarded().then(ok => { clearTimeout(guard); go(ok); }); } catch (e) { clearTimeout(guard); go(false); }
    return;
  }
  const recap = document.getElementById('recap-modal');
  if (recap) recap.style.display = 'none';
  showSimulatedAd(onDone);
}

function openSupportModal() {
  const m = document.getElementById('modal-support');
  if (!m) { proceedAfterAd(); return; }
  m.style.display = 'flex';
  const btn = document.getElementById('support-skip-btn');
  const lbl = document.getElementById('support-skip-lbl');
  const fr = (typeof currentLang !== 'undefined' && currentLang === 'fr');
  let t = 5;
  if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; }
  if (lbl) lbl.innerText = '⏭️ ' + (fr ? 'Passer' : 'Skip') + ' (' + t + ')';
  if (__skipIv) clearInterval(__skipIv);
  __skipIv = setInterval(() => {
    t--;
    if (t <= 0) {
      clearInterval(__skipIv); __skipIv = null;
      if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
      if (lbl) lbl.innerText = '⏭️ ' + (fr ? 'Passer et jouer' : 'Skip and play');
    } else if (lbl) lbl.innerText = '⏭️ ' + (fr ? 'Passer' : 'Skip') + ' (' + t + ')';
  }, 1000);
}

function closeSupportModal() {
  if (__skipIv) { clearInterval(__skipIv); __skipIv = null; }
  const m = document.getElementById('modal-support'); if (m) m.style.display = 'none';
}
