/* ============================================================
   IAP.JS — Achats in-app RevenueCat (Pass Premium + packs)
   - Actif UNIQUEMENT dans l'APK (window.Capacitor présent)
   - Web navigateur : message clair (plus de clic silencieux)
============================================================ */
const RC_API_KEY = 'goog_XFlNDHkJppdgUrBvKgMQilmCiaR';
const IAP_SERVER_URL = 'https://chiffre-blitz.fr';

const IAP = {
  ready: false,

  rc() {
    return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Purchases) || null;
  },

  msg(key, fr, en) {
    const d = (typeof i18n !== 'undefined') ? i18n[currentLang] : null;
    return (d && d[key]) ? d[key] : (currentLang === 'fr' ? fr : en);
  },

  notify(key, fr, en, type) {
    if (typeof showNotificationToast === 'function') {
      showNotificationToast(this.msg(key, fr, en), type || 'announcement');
    }
  },

  async init() {
    const rc = this.rc();
    if (!rc) { console.log('[iap] hors APK : achats réels désactivés'); return; }
    try {
      await rc.configure({ apiKey: RC_API_KEY });
      this.ready = true;
      console.log('[iap] RevenueCat prêt');
    } catch (e) {
      console.warn('[iap] configure échoué :', e);
      this.ready = false;
    }
  },

    async buy(sku) {
    const rc = this.rc();
    if (!rc) {
      this.notify('iap_unavailable', 'Achats disponibles uniquement sur l\'application Android', 'Purchases available only on the Android app');
      return false;
    }
    if (!this.ready) {
      await this.init();
      if (!this.ready) {
        if (typeof showNotificationToast === 'function') showNotificationToast('⚠️ IAP : configure RevenueCat échoué', 'announcement');
        return false;
      }
    }
    try {
      const { products } = await rc.getProducts({ productIdentifiers: [sku], type: 'inapp' });
      if (!products || !products.length) {
        if (typeof showNotificationToast === 'function') showNotificationToast('⚠️ IAP : produit introuvable côté Google (' + sku + ')', 'announcement');
        return false;
      }
      const res = await rc.purchaseStoreProduct({ product: products[0] });
      const tx = res && res.transaction;
      const token = tx && (tx.purchaseToken || tx.transactionIdentifier);
      if (!token) throw new Error('token manquant');
      return await this.grant(sku, token);
    } catch (e) {
      const code = (e && (e.code || e.errorCode)) || '';
      const message = (e && e.message) || String(e);
      if (/cancel/i.test(code + message)) return false; // annulé par le joueur
      console.warn('[iap] échec achat :', e);
      if (typeof showNotificationToast === 'function') showNotificationToast('⚠️ IAP : ' + code + ' — ' + message, 'announcement');
      return false;
    }
  },

  async grant(sku, token) {
    const pseudo = (typeof myProfile !== 'undefined' && myProfile && myProfile.username) 
      ? myProfile.username 
      : null;
    
    // DEBUG : ce qui est envoyé
    console.log('🔍 IAP grant:', { pseudo, sku, token });
    
    if (!pseudo) {
      this.notify('iap_error', 
        'Connecte-toi d\'abord avant d\'acheter', 
        'Log in first before purchasing');
      return false;
    }
    if (!sku || !token) {
      this.notify('iap_error', 
        'Erreur de transaction Google', 
        'Google transaction error');
      return false;
    }
    
    try {
      const base = (typeof socket !== 'undefined' && socket.io && socket.io.uri)
        ? String(socket.io.uri).replace(/\/+$/, '')
        : IAP_SERVER_URL;
      
      const r = await fetch(base + '/api/iap_grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pseudo, sku, token })
      });
      const j = await r.json();
      if (j.ok && !j.already) {
        this.notify('iap_success', 'Achat confirmé ! Merci ⚡', 'Purchase confirmed! Thank you ⚡', 'gift');
        return true;
      }
      if (j.already) {
        this.notify('iap_already', 'Achat déjà traité', 'Purchase already processed');
        return true;
      }
      console.warn('[iap] grant refusé :', j);
      if (typeof showNotificationToast === 'function') showNotificationToast('⚠️ IAP grant : ' + JSON.stringify(j), 'announcement');
      return false;
    } catch (e) {
      console.warn('[iap] grant échoué :', e);
      if (typeof showNotificationToast === 'function') showNotificationToast('⚠️ IAP grant réseau : ' + ((e && e.message) || e), 'announcement');
      return false;
    }
  },

  buyPassPremium() { return this.buy('blitz_pass_premium'); },
  buyPack(id)      { return this.buy(id); }
};

window.IAP = IAP;

// Auto-init : démarre RevenueCat dès que la page est prête (APK uniquement)
window.addEventListener('load', () => { setTimeout(() => IAP.init(), 800); });
