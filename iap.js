/* ============================================================
   IAP REVENUECAT — Achats in-app Chiffre Blitz
   Actif UNIQUEMENT dans l'APK. Web : boutons désactivés.
============================================================ */
const RC_API_KEY = 'goog_XFlNDHkJppdgUrBvKgMQilmCiaR';
const IAP_SERVER_URL = 'https://chiffre-blitz.fr';

const IAP = {
  ready: false,
  rc() { return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Purchases) || null; },

  async init() {
    const rc = this.rc();
    if (!rc) { console.log('[iap] hors APK : achats désactivés'); return; }
    try {
      await rc.configure({ apiKey: RC_API_KEY });
      this.ready = true;
      console.log('[iap] RevenueCat prêt');
    } catch (e) { console.warn('[iap] configure échoué :', e); }
  },

  async buy(sku) {
    const rc = this.rc();
    if (!this.ready || !rc) {
      if (window.toast) toast(window.t ? t('iap_unavailable') : 'Achats indisponibles sur le web');
      return false;
    }
    try {
      const { products } = await rc.getProducts({ productIdentifiers: [sku] });
      if (!products || !products.length) { if (window.toast) toast('Produit introuvable'); return false; }
      const res = await rc.purchaseStoreProduct({ product: products[0] });
      const tx = res && res.transaction;
      const token = tx && (tx.purchaseToken || tx.transactionIdentifier);
      if (!token) throw new Error('token manquant');
      return await this.grant(sku, token);
    } catch (e) {
      const msg = (e && (e.message || '')) + ' ' + (e && e.code ? e.code : '');
      if (/cancel/i.test(msg)) return false;
      console.warn('[iap] échec :', e);
      if (window.toast) toast(window.t ? t('iap_error') : 'Achat annulé');
      return false;
    }
  },

  async grant(sku, token) {
    const pseudo = window.MY_PSEUDO || (window.activePlayer && window.activePlayer.username);
    if (!pseudo) { if (window.toast) toast('Non connecté'); return false; }
    try {
      const r = await fetch(IAP_SERVER_URL + '/api/iap_grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pseudo, sku, token })
      });
      const j = await r.json();
      if (j.ok && !j.already) {
        if (window.toast) toast(window.t ? t('iap_success') : 'Achat confirmé !');
        if (typeof window.refreshPlayer === 'function') await window.refreshPlayer();
        return true;
      }
      if (j.already) {
        if (window.toast) toast(window.t ? t('iap_already') : 'Déjà traité');
        return true;
      }
      if (window.toast) toast(window.t ? t('iap_error') : 'Erreur serveur');
      return false;
    } catch (e) {
      console.warn('[iap] grant échoué :', e);
      if (window.toast) toast('Erreur réseau');
      return false;
    }
  },

  buyPassPremium() { return this.buy('blitz_pass_premium'); },
  buyPack(id)      { return this.buy(id); }
};

window.IAP = IAP;
