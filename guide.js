// ================================================================
//  PULSAR ECO GROUP — Guide interactif avec doigt animé
// ================================================================

function lancerGuide(type) {
  // Supprimer guide existant
  var old = document.getElementById('peg-guide-overlay');
  if (old) old.remove();

  var etapes = {
    menage: [
      { sel: '#villeInput',        msg: 'Commencez par entrer votre ville d\'installation ici' },
      { sel: '.add-btn',           msg: 'Cliquez ici pour ajouter vos appareils électriques (TV, clim, frigo...)' },
      { sel: '#equipmentTable tr:last-child td:first-child input', msg: 'Entrez le nom de l\'appareil ici' },
      { sel: '#equipmentTable tr:last-child td:nth-child(2) input', msg: 'Entrez la puissance en Watts (ex: 75 pour un ventilateur)' },
      { sel: '#equipmentTable tr:last-child td:nth-child(3) input', msg: 'Entrez la quantité de cet appareil' },
      { sel: '#equipmentTable tr:last-child td:nth-child(4) input', msg: 'Combien d\'heures par jour utilisez-vous cet appareil ?' },
      { sel: '#autonomy',          msg: 'Combien de nuits sans soleil voulez-vous que vos batteries tiennent ?' },
      { sel: '#btn-valider',       msg: 'Une fois tout rempli, cliquez ici pour lancer l\'analyse IA !' }
    ],
    agri: [
      { sel: '#villeInput',    msg: 'Commencez par entrer votre ville d\'installation' },
      { sel: '#surface',       msg: 'Entrez la surface à irriguer en hectares' },
      { sel: '#culture',       msg: 'Choisissez votre type de culture' },
      { sel: '#efficiency',    msg: 'Choisissez votre système d\'irrigation' },
      { sel: '#depth',         msg: 'Entrez la profondeur du forage ou puits en mètres' },
      { sel: '#tankHeight',    msg: 'Hauteur du réservoir au-dessus du sol en mètres' },
      { sel: '#hours',         msg: 'Combien d\'heures par jour la pompe doit-elle fonctionner ?' },
      { sel: '#btn-valider',   msg: 'Cliquez ici pour lancer l\'analyse IA de votre système de pompage !' }
    ],
    entreprise: [
      { sel: '#villeInput',    msg: 'Commencez par entrer votre ville d\'installation' },
      { sel: '.add-btn',       msg: 'Ajoutez tous vos équipements électriques ici' },
      { sel: '#typeInstallation', msg: 'Choisissez le type d\'installation (autonome, hybride ou réseau)' },
      { sel: '#btn-valider',   msg: 'Une fois tout rempli, cliquez pour lancer l\'analyse IA !' }
    ]
  };

  var steps = etapes[type] || etapes.menage;
  var currentStep = 0;

  // Créer l'overlay
  var overlay = document.createElement('div');
  overlay.id = 'peg-guide-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;pointer-events:none;';

  // Fond semi-transparent
  var fond = document.createElement('div');
  fond.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,0.55);';
  overlay.appendChild(fond);

  // Doigt animé
  var doigt = document.createElement('div');
  doigt.innerHTML = '👆';
  doigt.style.cssText = 'position:absolute;font-size:2.2rem;transition:all 0.5s cubic-bezier(.25,.46,.45,.94);filter:drop-shadow(0 2px 6px rgba(0,0,0,0.5));z-index:100001;pointer-events:none;';
  overlay.appendChild(doigt);

  // Bulle message
  var bulle = document.createElement('div');
  bulle.style.cssText = 'position:absolute;background:#0a192f;color:#fff;border:2px solid #ffee58;border-radius:12px;padding:14px 18px;font-size:.9rem;max-width:280px;line-height:1.5;z-index:100001;box-shadow:0 4px 20px rgba(0,0,0,0.5);pointer-events:all;';
  overlay.appendChild(bulle);

  // Highlight de l'élément ciblé
  var highlight = document.createElement('div');
  highlight.style.cssText = 'position:absolute;border:3px solid #ffee58;border-radius:8px;transition:all 0.5s;z-index:100000;box-shadow:0 0 0 4px rgba(255,238,88,0.3);pointer-events:none;';
  overlay.appendChild(highlight);

  document.body.appendChild(overlay);

  function afficherEtape(idx) {
    if (idx >= steps.length) {
      overlay.remove();
      return;
    }

    var step = steps[idx];
    var el = document.querySelector(step.sel);

    // Si l'élément n'existe pas encore, passer
    if (!el) { afficherEtape(idx + 1); return; }

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    setTimeout(function() {
      var rect = el.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;

      // Positionner le highlight
      highlight.style.left   = (rect.left - 4 + window.scrollX) + 'px';
      highlight.style.top    = (rect.top  - 4 + window.scrollY) + 'px';
      highlight.style.width  = (rect.width  + 8) + 'px';
      highlight.style.height = (rect.height + 8) + 'px';

      // Positionner le doigt (en dessous de l'élément)
      doigt.style.left = (cx - 18 + window.scrollX) + 'px';
      doigt.style.top  = (rect.bottom + 8 + window.scrollY) + 'px';

      // Animation doigt rebond
      doigt.style.animation = 'none';
      setTimeout(function() {
        doigt.style.cssText += 'animation:pegBounce 0.8s ease-in-out infinite;';
      }, 100);

      // Positionner la bulle
      var bx = Math.min(cx - 140 + window.scrollX, window.innerWidth - 300);
      var by = rect.bottom + 55 + window.scrollY;
      if (by + 120 > window.scrollY + window.innerHeight) {
        by = rect.top - 130 + window.scrollY;
      }
      bulle.style.left = Math.max(10, bx) + 'px';
      bulle.style.top  = by + 'px';

      // Contenu bulle
      var isLast = idx === steps.length - 1;
      bulle.innerHTML =
        '<div style="color:#ffee58;font-size:.75rem;margin-bottom:6px;">Étape ' + (idx+1) + ' / ' + steps.length + '</div>' +
        '<p style="margin:0 0 12px;">' + step.msg + '</p>' +
        '<div style="display:flex;gap:8px;">' +
          (idx > 0 ? '<button id="guide-prev" style="flex:1;padding:7px;background:rgba(255,255,255,0.1);color:#fff;border:1px solid rgba(255,255,255,0.3);border-radius:6px;cursor:pointer;font-size:.82rem;">← Précédent</button>' : '') +
          '<button id="guide-next" style="flex:2;padding:7px;background:' + (isLast?'#2e7d32':'#1565c0') + ';color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:.85rem;">' + (isLast ? '✓ Terminer' : 'Suivant →') + '</button>' +
          '<button id="guide-skip" style="padding:7px 10px;background:transparent;color:#90caf9;border:1px solid #546e7a;border-radius:6px;cursor:pointer;font-size:.78rem;">✕</button>' +
        '</div>';

      // Events boutons
      setTimeout(function() {
        var btnNext = document.getElementById('guide-next');
        var btnPrev = document.getElementById('guide-prev');
        var btnSkip = document.getElementById('guide-skip');
        if (btnNext) btnNext.addEventListener('click', function(e) { e.stopPropagation(); afficherEtape(idx + 1); });
        if (btnPrev) btnPrev.addEventListener('click', function(e) { e.stopPropagation(); afficherEtape(idx - 1); });
        if (btnSkip) btnSkip.addEventListener('click', function(e) { e.stopPropagation(); overlay.remove(); });
      }, 50);

    }, 300);
  }

  // Injecter animation CSS
  if (!document.getElementById('peg-guide-style')) {
    var st = document.createElement('style');
    st.id = 'peg-guide-style';
    st.textContent = '@keyframes pegBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }';
    document.head.appendChild(st);
  }

  afficherEtape(currentStep);
}
