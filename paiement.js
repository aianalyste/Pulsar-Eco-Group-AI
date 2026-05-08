// ================================================================
//  PULSAR ECO GROUP — Système de paiement FedaPay v8
//  Mode SANDBOX (test) → changer clés pour passer en LIVE
// ================================================================

// ===== CLÉS API FEDAPAY =====
// MODE TEST (sandbox) — utiliser pour les tests
var FEDAPAY_PUBLIC_KEY  = 'pk_sandbox_8xx1MmQ0UypP-74eMT1I7txl';
var FEDAPAY_SECRET_KEY  = 'sk_sandbox_p24QxLvaCrZ5JH2baULA0Fry';
var FEDAPAY_ENV         = 'sandbox'; // 'sandbox' ou 'live'

// MODE LIVE (production) — décommenter et remplacer quand prêt
// var FEDAPAY_PUBLIC_KEY  = 'pk_live_VOTRE_CLE_PUBLIQUE_LIVE';
// var FEDAPAY_SECRET_KEY  = 'sk_live_VOTRE_CLE_SECRETE_LIVE';
// var FEDAPAY_ENV         = 'live';

// ===== PLANS D'ABONNEMENT =====
var PLANS = [
  { id:'heure',   label:'1 Heure',   prix:500,    duree:1*60*60*1000,        emoji:'⏱️', desc:'Accès 1 heure' },
  { id:'jour',    label:'1 Jour',    prix:1000,   duree:24*60*60*1000,       emoji:'📅', desc:'Accès 24 heures' },
  { id:'semaine', label:'1 Semaine', prix:3000,   duree:7*24*60*60*1000,     emoji:'📆', desc:'Accès 7 jours' },
  { id:'mois',    label:'1 Mois',    prix:15000,  duree:30*24*60*60*1000,    emoji:'🗓️', desc:'Accès 30 jours' },
  { id:'annee',   label:'1 An',      prix:100000, duree:365*24*60*60*1000,   emoji:'🏆', desc:'Accès 365 jours' }
];

// ===== COMPTES GRATUITS =====
// Pour ajouter un utilisateur gratuit: { contact:'email_ou_tel', nom:'Nom' }
var COMPTES_GRATUITS = [
  { contact: 'blanckombate93@gmail.com', nom: 'Admin Blanck' },
  { contact: '92196727',                 nom: 'Frère Admin' },
  { contact: '+22892196727',             nom: 'Frère Admin' }
];

// ================================================================
//  VÉRIFICATION ACCÈS
// ================================================================
function verifierAcces() {
  // Vérifier compte gratuit en mémoire session
  var free = sessionStorage.getItem('peg_free_access');
  if (free === '1') return true;

  var raw = localStorage.getItem('peg_user');
  if (!raw) return false;
  try {
    var u = JSON.parse(raw);
    if (u.gratuit) return true;
    if (u.expiration && Date.now() < u.expiration) return true;
  } catch(e) {}
  return false;
}

function getInfoUser() {
  var raw = localStorage.getItem('peg_user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch(e) { return null; }
}

function deconnexion() {
  localStorage.removeItem('peg_user');
  sessionStorage.removeItem('peg_free_access');
  window.location.href = 'index.html';
}

function afficherBandeauUser() {
  var u = getInfoUser();
  var free = sessionStorage.getItem('peg_free_access') === '1';
  if (!u && !free) return;
  var contact = u ? (u.contact || 'Utilisateur') : 'Accès gratuit';
  var reste = (u && u.gratuit) || free ? '∞' :
    (u && u.expiration ? Math.max(0, Math.ceil((u.expiration - Date.now())/(1000*60*60))) + 'h restante(s)' : '');
  var div = document.createElement('div');
  div.id = 'bandeau-user';
  div.style.cssText = 'background:#1b5e20;color:#fff;padding:7px 16px;display:flex;justify-content:space-between;align-items:center;font-size:.82rem;position:sticky;top:0;z-index:100;';
  div.innerHTML =
    '<span>✅ ' + contact + (reste?' — '+reste:'') + '</span>' +
    '<button onclick="deconnexion()" style="background:rgba(255,255,255,0.18);border:none;color:#fff;padding:4px 10px;border-radius:5px;cursor:pointer;font-size:.78rem;">Déconnexion</button>';
  document.body.insertBefore(div, document.body.firstChild);
}

// ================================================================
//  PAGE D'ABONNEMENT — AFFICHAGE
// ================================================================
function afficherPageAbonnement(moduleNom) {
  document.body.innerHTML = '';
  document.body.style.cssText = 'margin:0;padding:0;font-family:Segoe UI,Arial,sans-serif;background:#0a192f;min-height:100vh;color:#fff;';

  var html = `
  <div style="max-width:560px;margin:0 auto;padding:20px 16px;">
    <div style="text-align:center;padding:28px 0 18px;">
      <img src="images/Pulsar Icon.jpeg" style="width:65px;border-radius:50%;margin-bottom:10px;">
      <h1 style="color:#4fc3f7;margin:0;font-size:1.3rem;">PULSAR ECO GROUP</h1>
      <p style="color:#90caf9;margin:5px 0 0;font-size:.88rem;">Module : <strong style="color:#ffee58;">${moduleNom}</strong></p>
    </div>

    <!-- RECONNEXION -->
    <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(79,195,247,0.25);border-radius:12px;padding:18px;margin-bottom:16px;">
      <h3 style="color:#ffee58;margin:0 0 12px;font-size:.92rem;">👤 Déjà abonné ? Entrez votre contact</h3>
      <input id="login-contact" type="text" placeholder="Email ou numéro de téléphone"
        style="width:100%;padding:10px 12px;border-radius:8px;border:1.5px solid #546e7a;background:#1a2a3a;color:#fff;box-sizing:border-box;font-size:.9rem;margin-bottom:10px;">
      <button onclick="tentativeReconnexion()"
        style="width:100%;padding:11px;background:#1565c0;color:#fff;border:none;border-radius:8px;font-size:.92rem;cursor:pointer;font-weight:600;">
        ✅ Accéder à mon compte
      </button>
    </div>

    <!-- PLANS -->
    <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(79,195,247,0.2);border-radius:12px;padding:18px;margin-bottom:16px;">
      <h2 style="color:#fff;margin:0 0 5px;font-size:1rem;">💳 Choisir un abonnement</h2>
      <p style="color:#90caf9;font-size:.82rem;margin:0 0 16px;">Paiement sécurisé via FedaPay · T-Money ou Flooz</p>
      <div id="plans-liste"></div>
    </div>

    <div style="text-align:center;padding:8px 0;">
      <a href="index.html" style="color:#90caf9;font-size:.83rem;">← Retour à l'accueil</a>
    </div>
  </div>

  <!-- MODAL PAIEMENT -->
  <div id="modal-pay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:9000;overflow-y:auto;">
    <div style="max-width:480px;margin:30px auto;padding:16px;">
      <div id="modal-body" style="background:#0d2244;border-radius:14px;padding:26px;border:1.5px solid rgba(79,195,247,0.35);"></div>
    </div>
  </div>
  `;
  document.body.innerHTML = html;

  // Remplir plans
  var liste = document.getElementById('plans-liste');
  PLANS.forEach(function(p) {
    var d = document.createElement('div');
    d.style.cssText = 'display:flex;align-items:center;justify-content:space-between;background:rgba(21,101,192,0.18);border:1px solid rgba(21,101,192,0.4);border-radius:9px;padding:13px 15px;margin-bottom:9px;cursor:pointer;transition:background .2s;';
    d.onmouseover = function(){this.style.background='rgba(21,101,192,0.36)';};
    d.onmouseout  = function(){this.style.background='rgba(21,101,192,0.18)';};
    d.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;">' +
        '<span style="font-size:1.5rem;">' + p.emoji + '</span>' +
        '<div><div style="font-weight:700;font-size:.95rem;">' + p.label + '</div>' +
        '<div style="color:#90caf9;font-size:.78rem;">' + p.desc + '</div></div>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:10px;">' +
        '<span style="color:#ffee58;font-weight:700;font-size:.98rem;">' + p.prix.toLocaleString() + ' FCFA</span>' +
        '<button style="background:#2e7d32;color:#fff;border:none;border-radius:6px;padding:7px 14px;cursor:pointer;font-weight:600;font-size:.82rem;">Payer</button>' +
      '</div>';
    d.onclick = function() { ouvrirPaiement(p); };
    liste.appendChild(d);
  });
}

// ================================================================
//  OUVERTURE MODAL PAIEMENT — étapes
// ================================================================
function ouvrirPaiement(plan) {
  var modal = document.getElementById('modal-pay');
  var body  = document.getElementById('modal-body');
  modal.style.display = 'block';

  body.innerHTML = `
    <h2 style="color:#4fc3f7;margin:0 0 5px;font-size:1.05rem;">${plan.emoji} ${plan.label} — ${plan.prix.toLocaleString()} FCFA</h2>
    <p style="color:#90caf9;font-size:.82rem;margin:0 0 18px;">Paiement mobile sécurisé</p>

    <!-- Étape 1: Choix opérateur -->
    <p style="font-weight:600;margin:0 0 10px;font-size:.9rem;">① Choisissez votre opérateur :</p>
    <div style="display:flex;gap:12px;margin-bottom:18px;">
      <button id="btn-tmoney" onclick="choisirOperateur('tmoney')"
        style="flex:1;padding:14px;background:rgba(255,165,0,0.15);border:2px solid #ff9800;border-radius:10px;color:#ff9800;font-weight:700;font-size:.9rem;cursor:pointer;transition:all .2s;">
        📱 T-Money<br><span style="font-size:.7rem;font-weight:400;">Mixx by YAS</span>
      </button>
      <button id="btn-flooz" onclick="choisirOperateur('flooz')"
        style="flex:1;padding:14px;background:rgba(30,136,229,0.15);border:2px solid #1e88e5;border-radius:10px;color:#1e88e5;font-weight:700;font-size:.9rem;cursor:pointer;transition:all .2s;">
        📱 Flooz<br><span style="font-size:.7rem;font-weight:400;">Moov Money</span>
      </button>
    </div>

    <!-- Étape 2: Numéro -->
    <div id="etape2" style="display:none;">
      <p style="font-weight:600;margin:0 0 8px;font-size:.9rem;">② Votre numéro de téléphone :</p>
      <input id="num-tel" type="tel" placeholder="Ex: 92196727 ou +22892196727"
        style="width:100%;padding:10px;border-radius:8px;border:1.5px solid #546e7a;background:#1a2a3a;color:#fff;box-sizing:border-box;font-size:.9rem;margin-bottom:10px;">
      <p style="font-weight:600;margin:0 0 8px;font-size:.9rem;">③ Votre email (pour reconnexion) :</p>
      <input id="num-email" type="text" placeholder="votre@email.com ou numéro"
        style="width:100%;padding:10px;border-radius:8px;border:1.5px solid #546e7a;background:#1a2a3a;color:#fff;box-sizing:border-box;font-size:.9rem;margin-bottom:16px;">
      <button onclick="lancerPaiementFedapay()"
        style="width:100%;padding:13px;background:linear-gradient(135deg,#2e7d32,#1b5e20);color:#fff;border:none;border-radius:10px;font-size:.97rem;cursor:pointer;font-weight:700;margin-bottom:10px;">
        🔒 Payer ${plan.prix.toLocaleString()} FCFA maintenant
      </button>
    </div>

    <div id="statut-pay" style="display:none;"></div>

    <button onclick="document.getElementById('modal-pay').style.display='none'"
      style="width:100%;padding:9px;background:transparent;color:#90caf9;border:1px solid #546e7a;border-radius:8px;font-size:.88rem;cursor:pointer;margin-top:6px;">
      ← Retour
    </button>
  `;

  // Stocker le plan courant
  window._planCourant = plan;
  window._operateurCourant = null;
}

function choisirOperateur(op) {
  window._operateurCourant = op;
  document.getElementById('btn-tmoney').style.background = op==='tmoney' ? 'rgba(255,165,0,0.35)' : 'rgba(255,165,0,0.15)';
  document.getElementById('btn-flooz').style.background  = op==='flooz'  ? 'rgba(30,136,229,0.35)' : 'rgba(30,136,229,0.15)';
  document.getElementById('etape2').style.display = 'block';
}

// ================================================================
//  PAIEMENT FEDAPAY — Intégration complète
// ================================================================
function lancerPaiementFedapay() {
  var plan     = window._planCourant;
  var operateur= window._operateurCourant;
  var tel      = document.getElementById('num-tel').value.trim();
  var email    = document.getElementById('num-email').value.trim();

  if (!operateur) { alert('Veuillez choisir un opérateur !'); return; }
  if (!tel)       { alert('Veuillez entrer votre numéro de téléphone !'); return; }
  if (!email)     { alert('Veuillez entrer votre email ou numéro pour la reconnexion !'); return; }

  var statut = document.getElementById('statut-pay');
  statut.style.display = 'block';
  statut.innerHTML = '<div style="background:#e3f2fd;border:1px solid #1976d2;border-radius:8px;padding:14px;text-align:center;color:#1565c0;margin-bottom:10px;">⏳ Connexion à FedaPay en cours...</div>';

  // Charger le SDK FedaPay
  if (!window.FedaPay) {
    var script = document.createElement('script');
    script.src = 'https://cdn.fedapay.com/checkout.js?v=1.1.7';
    script.onload = function() { initFedaPay(plan, operateur, tel, email, statut); };
    script.onerror = function() {
      statut.innerHTML = '<div style="background:#ffebee;border:1px solid red;border-radius:8px;padding:14px;color:red;">❌ Impossible de charger FedaPay. Vérifiez votre connexion internet.</div>';
    };
    document.head.appendChild(script);
  } else {
    initFedaPay(plan, operateur, tel, email, statut);
  }
}

function initFedaPay(plan, operateur, tel, email, statut) {
  try {
    // Mapper opérateur → méthode FedaPay
    var methodMap = { tmoney: 'mtn', flooz: 'moov' };
    var method = methodMap[operateur] || 'mtn';

    // Formater numéro téléphone
    var telFormate = tel.replace(/\s/g,'').replace(/^\+228/,'').replace(/^228/,'');

    statut.innerHTML = '<div style="background:#e8f5e9;border:1px solid #43a047;border-radius:8px;padding:14px;text-align:center;color:#1b5e20;">✅ FedaPay chargé — ouverture du paiement...</div>';

    FedaPay.init({
      public_key: FEDAPAY_PUBLIC_KEY,
      transaction: {
        amount:      plan.prix,
        description: 'Pulsar Eco Group — ' + plan.label,
        callback_url: window.location.origin + '/webhook.html'
      },
      customer: {
        email:        email.indexOf('@') > -1 ? email : email + '@pulsareco.tg',
        phone_number: { number: telFormate, country: 'TG' }
      },
      currency: { iso: 'XOF' },
      onComplete: function(resp) {
        if (resp.reason === FedaPay.CHECKOUT_COMPLETED) {
          activerAcces(plan, email || tel, resp.transaction);
          statut.innerHTML = '<div style="background:#e8f5e9;border:2px solid #43a047;border-radius:10px;padding:18px;text-align:center;">' +
            '<div style="font-size:2.5rem;margin-bottom:10px;">✅</div>' +
            '<h3 style="color:#1b5e20;margin:0 0 8px;">Paiement réussi !</h3>' +
            '<p style="color:#2e7d32;">Accès activé pour : <strong>' + (email||tel) + '</strong></p>' +
            '<button onclick="window.location.reload()" style="margin-top:12px;padding:11px 24px;background:#1565c0;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;">🚀 Accéder au module</button>' +
            '</div>';
        } else {
          statut.innerHTML = '<div style="background:#ffebee;border:1px solid red;border-radius:8px;padding:14px;color:red;">❌ Paiement échoué ou annulé. Veuillez réessayer.</div>';
        }
      }
    }).open();

  } catch(err) {
    statut.innerHTML = '<div style="background:#ffebee;border:1px solid red;border-radius:8px;padding:14px;color:red;">❌ Erreur FedaPay : ' + err.message + '</div>';
  }
}

function activerAcces(plan, contact, transaction) {
  var userData = {
    contact:    contact,
    planId:     plan.id,
    dateAchat:  Date.now(),
    expiration: Date.now() + plan.duree,
    transId:    transaction ? transaction.id : 'local-' + Date.now(),
    statut:     'actif'
  };
  localStorage.setItem('peg_user', JSON.stringify(userData));
}

// ================================================================
//  RECONNEXION
// ================================================================
function tentativeReconnexion() {
  var contact = (document.getElementById('login-contact').value || '').trim();
  if (!contact) { alert('Veuillez entrer votre email ou numéro !'); return; }

  // Vérifier compte gratuit
  var normalise = contact.replace(/\s/g,'').replace(/^\+228/,'').replace(/^228/,'');
  for (var i=0; i<COMPTES_GRATUITS.length; i++) {
    var c = COMPTES_GRATUITS[i].contact.replace(/\s/g,'').replace(/^\+228/,'').replace(/^228/,'');
    if (c === normalise || COMPTES_GRATUITS[i].contact === contact) {
      sessionStorage.setItem('peg_free_access','1');
      localStorage.setItem('peg_user', JSON.stringify({contact:contact, gratuit:true}));
      alert('✅ Bienvenue, '+COMPTES_GRATUITS[i].nom+' ! Accès gratuit activé.');
      window.location.reload();
      return;
    }
  }

  // Vérifier abonnement existant
  var u = getInfoUser();
  if (u && u.contact === contact && u.expiration && Date.now() < u.expiration) {
    alert('✅ Reconnexion réussie !');
    window.location.reload();
    return;
  }

  alert('❌ Aucun abonnement actif pour ce contact.\nSi vous venez de payer, attendez quelques secondes et réessayez.');
}
