/* ============================================================
   IAP.JS — Achats in-app RevenueCat (Pass Premium + packs)
   VERSION FINALE NETTOYÉE — remplacer le fichier entier
============================================================ */
const RC_API_KEY = 'goog_XFlNDHkJppdgUrBvKgMQilmCiaR';
// 🔐 Secret partagé avec le serveur (variable Render IAP_SHARED_SECRET).
// Test fermé uniquement — remplacé par la vérification RevenueCat/Google à la sortie (route G).
const IAP_SHARED_SECRET = '301fce065a6794b383e54ccd4aa249b6';
const IAP_SERVER_URL = location.hostname.endsWith(".onrender.com") ? location.origin : "https://chiffre-blitz-server.onrender.com";

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

  serverBase() {
    try {
      if (typeof socket !== 'undefined' && socket && socket.io && socket.io.uri) {
        return String(socket.io.uri).replace(/\/+$/, '');
      }
    } catch (e) {}
    return IAP_SERVER_URL;
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
        this.notify('iap_app_only', 'Achats disponibles uniquement sur l\'application Android', 'Purchases available only on the Android app');
        return false;
    }
    if (!this.ready) {
        await this.init();
        if (!this.ready) {
            this.notify('iap_store_unavailable', 'Boutique indisponible pour le moment', 'Store unavailable right now');
            return false;
        }
    }

    let products = null;
    try {
        const prod = await rc.getProducts({ productIdentifiers: [sku], type: 'inapp' });
        products = prod && prod.products;
    } catch (e) {
        console.warn('[iap] getProducts échoué :', e);
    }
    if (!products || !products.length) {
        this.notify('iap_product_not_found', 'Produit introuvable côté Google (' + sku + ')', 'Product not found (' + sku + ')');
        return false;
    }

    let res = null;
    try {
        res = await rc.purchaseStoreProduct({ product: products[0] });
    } catch (e) {
        const code = (e && (e.code || e.errorCode)) || '';
        const message = (e && e.message) || String(e);
        if (/cancel/i.test(code + message)) return false;
        console.warn('[iap] échec achat :', e);
        this.notify('iap_error', 'Achat annulé ou en erreur', 'Purchase cancelled or failed');
        return false;
    }

    const tx = res && res.transaction;
    const token = tx && (tx.purchaseToken || tx.transactionIdentifier);
    if (!token) {
        this.notify('iap_missing_token', 'Token Google manquant', 'Missing Google token');
        return false;
    }
    return await this.grant(sku, token);
},

  async grant(sku, token) {
    const pseudo = (typeof myProfile !== 'undefined' && myProfile && myProfile.username) ? myProfile.username : null;
    if (!pseudo) {
        this.notify('iap_login_required', 'Connecte-toi avant d\'acheter', 'Log in before purchasing');
        return false;
    }

    const base = this.serverBase();
    const url = base + '/api/iap_grant?pseudo=' + encodeURIComponent(pseudo)
              + '&sku=' + encodeURIComponent(sku)
              + '&token=' + encodeURIComponent(token);

    let response = null;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-cb-iap-key': IAP_SHARED_SECRET },
        body: JSON.stringify({ pseudo: pseudo, sku: sku, token: token })
      });
    } catch (e) {
    console.warn('[iap] fetch échoué :', e);
    this.notify('iap_network_error', 'Erreur réseau pendant l\'achat', 'Network error during purchase');
    return false;
}

    let j = null;
    try {
      j = await response.json();
    } catch (e) {
    console.warn('[iap] réponse illisible :', e);
    this.notify('iap_unreadable_response', 'Réponse serveur illisible', 'Unreadable server response');
    return false;
}

    if (j && j.ok && !j.already) {
      this.notify('iap_success', 'Achat confirmé ! Merci ⚡', 'Purchase confirmed! Thank you ⚡', 'gift');
      return true;
    }
    if (j && j.already) {
      this.notify('iap_already', 'Achat déjà traité', 'Purchase already processed');
      return true;
    }
    console.warn('[iap] grant refusé :', j);
this.notify('iap_server_failed', 'Achat impossible (serveur)', 'Purchase failed (server)');
return false;;
  },

  buyPassPremium() { return this.buy('blitz_pass_premium'); },

  buyPack(id) {
    const givesLives = ['pack_vies_1', 'pack_mixte_3', 'pack_blitz_5'].includes(id);
    if (givesLives && typeof twLives !== 'undefined') {
      if (twLives >= 30) {
        this.notify('iap_lives_full', '❤️ Réserve de vies pleine (30 max). Utilise-les avant d\'en acheter !', '❤️ Life reserve full (max 30). Use some before buying!');
        return Promise.resolve(false);
      }
      if (twLives >= 10) {
    const d = (typeof i18n !== 'undefined') ? i18n[currentLang] : {};
    const packLives = (id === 'pack_mixte_3') ? 5 : 10;
    const willGet = Math.max(0, Math.min(packLives, 30 - twLives));
    const msg = (d.iap_confirm_lives || '⚠️ Tu as {lives} vies. Tu ne recevras que {willGet} vies sur {packLives}. Continuer ?')
        .replace('{lives}', twLives)
        .replace('{willGet}', willGet)
        .replace('{packLives}', packLives);
    if (!confirm(msg)) return Promise.resolve(false);
   }   
    }
    return this.buy(id);
  }
};

window.IAP = IAP;

window.addEventListener('load', () => { setTimeout(() => IAP.init(), 800); });
