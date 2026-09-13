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
        this.notify('iap_error', 'Boutique indisponible pour le moment', 'Store unavailable right now');
        return false;
      }
    }
    try {
      const { products } = await rc.getProducts({ productIdentifiers: [sku] });
      if (!products || !products.length) {
        this.notify('iap_error', 'Produit introuvable', 'Product not found');
        return false;
      }
      const res = await rc.purchaseStoreProduct({ product: products[0] });
      const tx = res && res.transaction;
      const token = tx && (tx.purchaseToken || tx.transactionIdentifier);
      if (!token) throw new Error('token manquant');
      return await this.grant(sku, token);
    } catch (e) {
      const msg = ((e && e.message) || '') + ' ' + ((e && e.code) || '');
      if (/cancel/i.test(msg)) return false; // annulé par le joueur
      console.warn('[iap] échec achat :', e);
      this.notify('iap_error', 'Achat annulé ou en erreur', 'Purchase cancelled or failed');
      return false;
    }
  },

  async grant(sku, token) {
    const pseudo = (typeof myProfile !== 'undefined' && myProfile) ? myProfile.username : null;
    if (!pseudo) {
      this.notify('iap_error', 'Connecte-toi avant d\'acheter', 'Log in before purchasing');
      return false;
    }
    try {
      const r = await fetch(IAP_SERVER_URL + '/api/iap_grant', {
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
      this.notify('iap_error', 'Achat impossible (serveur)', 'Purchase failed (server)');
      return false;
    } catch (e) {
      console.warn('[iap] grant échoué :', e);
      this.notify('iap_error', 'Erreur réseau pendant l\'achat', 'Network error during purchase');
      return false;
    }
  },

  buyPassPremium() { return this.buy('blitz_pass_premium'); },
  buyPack(id)      { return this.buy(id); }
};

window.IAP = IAP;

// Auto-init : démarre RevenueCat dès que la page est prête (APK uniquement)
window.addEventListener('load', () => { setTimeout(() => IAP.init(), 800); });
