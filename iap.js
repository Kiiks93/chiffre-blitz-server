/* ============================================================
   IAP REVENUECAT — Achats in-app (Pass Premium + packs vies/jokers)
   - Actif UNIQUEMENT dans l'APK (window.Capacitor présent)
   - Web navigateur : boutons désactivés proprement
   - Octroi réel côté serveur via /api/iap_grant (anti double-crédit)
============================================================ */
const RC_API_KEY = 'goog_XFlNDHkJppdgUrBvKgMQilmCiaR';

const IAP = {
  ready: false,

  rc() {
    return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Purchases) || null;
  },

  async init() {
    const rc = this.rc();
    if (!rc) { console.log('[iap] hors APK : achats désactivés'); return; }
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
    if (!this.ready || !rc) { if (window.toast) toast(t('iap_unavailable')); return false; }
    try {
      const { products } = await rc.getProducts({ productIdentifiers: [sku] });
      if (!products || !products.length) { if (window.toast) toast(t('iap_unavailable')); return false; }

      const res = await rc.purchaseStoreProduct({ product: products[0] });
      const tx = res && res.transaction;
      const token = tx && (tx.purchaseToken || tx.transactionIdentifier);
      if (!token) throw new Error('token manquant');

      return await this.grant(sku, token);
    } catch (e) {
      const msg = (e && (e.message || '')) + ' ' + (e && e.code ? e.code : '');
      if (/cancel/i.test(msg)) return false;               // achat annulé par le joueur
      console.warn('[iap] échec achat :', e);
      if (window.toast) toast(t('iap_error'));
      return false;
    }
  },

  async grant(sku, token) {
    try {
      const r = await fetch(API_BASE + '/api/iap_grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pseudo: window.MY_PSEUDO, sku, token })
      });
      const j = await r.json();
      if (j.ok)      { if (window.toast) toast(t('iap_success')); if (window.refreshPlayer) await refreshPlayer(); return true; }
      if (j.already) { if (window.toast) toast(t('iap_already')); return true; }
      if (window.toast) toast(t('iap_error'));
      return false;
    } catch (e) {
      console.warn('[iap] grant serveur échoué :', e);
      if (window.toast) toast(t('iap_error'));
      return false;
    }
  },

  buyPassPremium() { return this.buy('blitz_pass_premium'); },
  buyPack(id)      { return this.buy(id); }   // 'pack_vies_1' | 'pack_mixte_3' | 'pack_blitz_5'
};

window.IAP = IAP;
