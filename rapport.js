// ================================================================
//  PULSAR ECO GROUP — RAPPORT UNIFIÉ
//  Structure en 4 parties numérotées (I/II/III/IV), inspirée de
//  l'organisation standard des logiciels de dimensionnement PV
//  professionnels : Bilan énergétique -> Prédimensionnement ->
//  Dimensionnement -> Synoptique. Une seule structure de données
//  sert à la fois à l'écran ET au PDF -> plus jamais de désynchro.
// ================================================================

function construireSectionsRapport(r, contexte) {
  var b = r.bilan;
  var kWc = ((r.NP * r.panneau.puissance) / 1000).toFixed(2);
  var sections = [];

  // ===================== I. BILAN ÉNERGÉTIQUE =====================
  sections.push({
    titre: 'I. Bilan énergétique — Récepteurs classiques',
    type: 'tableau',
    entetes: ['Désignation', 'Qté', 'P.Unitaire [W]', 'Temps (h)', 'P.Réelle [W]', 'Énergie (Wh)'],
    lignes: b.classiques.map(function (l) {
      return [l.nom, l.nombre, l.pu, l.heures, l.PT.toFixed(1), l.E.toFixed(1)];
    })
  });

  sections.push({
    titre: 'I. Bilan énergétique — Récepteurs inductifs',
    type: 'tableau',
    entetes: ['Désignation', 'Qté', 'P.Unitaire [W]', 'Coef démarrage', 'Temps (h)', 'P.Réelle [W]', 'Énergie (Wh)'],
    lignes: b.inductifs.map(function (l) {
      return [l.nom, l.nombre, l.pu, '×' + l.coeff, l.heures, l.PT.toFixed(1), l.E.toFixed(1)];
    }),
    note: 'P.Réelle = P.Unitaire × Coefficient de démarrage (pointe réelle à l\'allumage).'
  });

  sections.push({
    titre: 'I. Bilan énergétique — Répartition Jour / Nuit',
    type: 'kv',
    lignes: [
      ['Puissance max des équipements (pointe)', r.bilan.P_pointe_max.toFixed(1) + ' W (à ' + r.bilan.heure_pointe + 'h)'],
      ['Énergie totale (Wh)', b.E_total.toFixed(1) + ' Wh'],
      ['Dont énergie de jour (' + b.heureLever + 'h-' + b.heureCoucher + 'h)', b.E_jour_total.toFixed(1) + ' Wh'],
      ['Dont énergie de nuit', b.E_nuit_total.toFixed(1) + ' Wh'],
      ['Indice de stockage Is (nuit/total)', r.Is]
    ]
  });

  // ===================== II. PRÉDIMENSIONNEMENT =====================
  sections.push({
    titre: 'II. Prédimensionnement — Paramètres',
    type: 'kv',
    compact: true,
    lignes: [
      ['Irradiation (kWh/m²/jr)', r.IR],
      ['Ratio de performance système (RP)', '0,70'],
      ['Énergie journalière Ej = 1,2 × E', r.Ej.toFixed(1) + ' Wh'],
      ['Jours d\'autonomie', r.joursAuto]
    ]
  });

  sections.push({
    titre: 'II. Prédimensionnement — Résultats',
    type: 'kv',
    lignes: [
      ['Puissance min. onduleur (W)', r.Pconv.brut.toFixed(1) + ' W'],
      ['Puissance min. champ PV (Wc)', r.Pc.toFixed(1) + ' Wc'],
      ['Énergie à stocker (30%×jour + nuit, +10%)', r.stockage.avecMarge.toFixed(1) + ' Wh'],
      ['Capacité min. de stockage (Wh)', r.Cb_Wh_total.toFixed(1) + ' Wh']
    ]
  });

  // ===================== III. DIMENSIONNEMENT =====================
  sections.push({
    titre: 'III. Dimensionnement — Choix des équipements',
    type: 'tableau',
    entetes: ['Composant', 'Modèle', 'Caractéristiques'],
    lignes: [
      ['Modules PV', r.panneau.fabricant + ' ' + r.panneau.modele, r.panneau.puissance + ' W · Voc ' + r.panneau.voc + 'V · Icc ' + r.panneau.icc + 'A'],
      ['Batteries', r.batterie.type, r.batterie.capacite + ' Ah · ' + (r.TD * 100) + '% décharge'],
      ['Onduleur', r.onduleur ? (r.onduleur.fabricant + ' ' + r.onduleur.modele) : '—', r.onduleur ? (r.onduleur.puissanceNominale + ' W') : '—']
    ]
  });

  sections.push({
    titre: 'III. Dimensionnement — Configuration réelle du système',
    type: 'kv',
    lignes: [
      ['Puissance champ PV', kWc + ' kWc (' + r.NP + ' panneaux)'],
      ['Arrangement (Np × Ns)', r.N + ' × ' + r.Ns + (r.ajusteNombrePremier ? '  (ajusté depuis ' + r.NP_calcule + ' — nombre premier)' : '')],
      ['Tension d\'une série', r.V_string + ' V'],
      ['Tension du système', r.Vsys + ' V'],
      ['Capacité parc batteries', r.Nb + ' × ' + r.batterie.capacite + ' Ah (' + (r.Cb_Wh_total / 1000).toFixed(2) + ' kWh)' +
        (r.Nb < r.Nb_initial ? '  — optimisé de ' + r.Nb_initial + ' à ' + r.Nb : '')],
      ['Puissance onduleur retenue', r.Pconv.normalise + ' W'],
      ['Compatibilité onduleur', r.compatOnduleur ? (r.compatOnduleur.compatible ? '✅ Compatible' : '❌ ' + r.compatOnduleur.alertes.join(' · ')) : 'Non vérifiée']
    ]
  });

  sections.push({
    titre: 'III. Dimensionnement — Énergie produite vs besoin',
    type: 'kv',
    compact: true,
    lignes: [
      ['Besoin quotidien du client', (r.comparaison.E_besoin_Wh / 1000).toFixed(2) + ' kWh/j'],
      ['Production estimée des panneaux', (r.comparaison.E_produite_Wh / 1000).toFixed(2) + ' kWh/j'],
      ['Taux de couverture', r.comparaison.tauxCouverture + ' %']
    ],
    note: 'Une marge de 20 à 30% au-dessus du besoin est normale (nuages, vieillissement des panneaux).'
  });

  // ===================== IV. SYNOPTIQUE =====================
  sections.push({
    titre: 'IV. Synoptique — Sections de câble',
    type: 'tableau',
    entetes: ['Tronçon', 'Longueur', 'Intensité', 'Tension', 'Section retenue'],
    lignes: [
      ['Champ PV → Onduleur', r.L1 + ' m', r.I1 + ' A', r.V1 + ' V', r.S1.S_normalise + ' mm²'],
      ['Onduleur → Batterie', r.L2 + ' m', r.I2.toFixed(1) + ' A', r.V2 + ' V', r.S2.S_normalise + ' mm²'],
      ['Onduleur → Charges', r.L3 + ' m', r.I3.toFixed(1) + ' A', r.V3 + ' V', r.S3.S_normalise + ' mm²']
    ]
  });

  sections.push({
    titre: 'IV. Synoptique — Éléments de protection',
    type: 'tableau',
    entetes: ['Position', 'Tension nominale', 'Calibre'],
    lignes: [
      ['Disjoncteur DC — Champ PV', r.D1.V + ' V', r.D1.I + ' A'],
      ['Disjoncteur DC — Batterie', r.D2.V + ' V', r.D2.I + ' A'],
      ['Disjoncteur AC — Charges', r.D3.V + ' V', r.D3.I + ' A']
    ]
  });

  sections.push({
    titre: '🌟 Message',
    type: 'texte',
    texte: 'Votre installation de ' + kWc + ' kWc couvre vos besoins quotidiens de ' + (r.comparaison.E_besoin_Wh / 1000).toFixed(2) + ' kWh avec ' + r.Nb + ' batterie(s) pour ' + r.joursAuto + ' jour(s) d\'autonomie. ' +
      (contexte.marque && contexte.marque.nom ? contexte.marque.nom : 'PULSAR ECO GROUP') + ' installe et garantit ce système solaire.'
  });

  return sections;
}

// ----------------------------------------------------------------
//  RENDU ÉCRAN (HTML)
// ----------------------------------------------------------------
function rendreRapportHTML(sections, contexte) {
  var marque = contexte.marque || {};
  var nomAffiche = marque.nom || 'PULSAR ECO GROUP';
  var logoAffiche = marque.logoDataUrl || 'images/Pulsar Icon.jpeg';

  var html = '<div class="ia-container">' +
    '<div class="ia-header"><img class="ia-logo-img" src="' + logoAffiche + '" alt="logo"><div>' +
    '<h2>' + nomAffiche + ' — Rapport de Dimensionnement Solaire</h2>' +
    '<span class="ia-subtitle">📍 ' + (contexte.ville ? contexte.ville.nom : '') + ' · Module ' + contexte.nomModule + '</span>' +
    '</div></div>';

  sections.forEach(function (s) {
    html += '<div class="ia-bloc"><h3>' + s.titre + '</h3><div class="ia-contenu">';
    if (s.type === 'tableau') {
      html += '<table class="recap-table"><tr>' + s.entetes.map(function (e) { return '<th>' + e + '</th>'; }).join('') + '</tr>';
      s.lignes.forEach(function (row) {
        html += '<tr>' + row.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>';
      });
      html += '</table>';
    } else if (s.type === 'kv') {
      html += '<table class="recap-table' + (s.compact ? ' compact-kv' : '') + '">';
      s.lignes.forEach(function (row) { html += '<tr><td>' + row[0] + '</td><td><strong>' + row[1] + '</strong></td></tr>'; });
      html += '</table>';
    } else if (s.type === 'texte') {
      html += '<p>' + s.texte + '</p>';
    }
    if (s.note) html += '<p class="ia-note">' + s.note + '</p>';
    html += '</div></div>';
  });

  html += '<div class="ia-bloc ia-3d-bloc"><h3>🏗️ Plan d\'implantation 3D</h3><div id="rapport-3d-3d" class="scene3d-wrap"></div></div>';
  html += '</div>';
  return html;
}

// ----------------------------------------------------------------
//  RENDU PDF — jsPDF-AutoTable, structure I/II/III/IV
// ----------------------------------------------------------------
function genererPDFDepuisSections(sections, contexte) {
  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF();
  var marque = contexte.marque || {};
  var nomAffiche = marque.nom || 'PULSAR ECO GROUP';
  var qn = (contexte.prefixeRef || 'PEG') + '-' + Date.now();
  var y = 15;

  try {
    var logo = marque.logoDataUrl;
    var format = 'JPEG';
    if (logo && logo.indexOf('data:image/png') === 0) format = 'PNG';
    if (logo) doc.addImage(logo, format, 15, 10, 20, 20);
    else if (document.getElementById('logo')) doc.addImage(document.getElementById('logo'), 'JPEG', 15, 10, 20, 20);
  } catch (e) {}

  doc.setFontSize(15); doc.setFont(undefined, 'bold');
  doc.text(nomAffiche, 40, 18);
  doc.setFontSize(10); doc.setFont(undefined, 'normal');
  doc.text('SYSTÈME SOLAIRE PV — Rapport de dimensionnement — Module ' + contexte.nomModule, 40, 24);
  doc.setFontSize(9); doc.setTextColor(90);
  doc.text('N° ' + qn + '  ·  ' + new Date().toLocaleDateString('fr-FR') + (contexte.ville ? '  ·  ' + contexte.ville.nom : ''), 40, 30);
  doc.setTextColor(0);
  y = 38;
  doc.setDrawColor(21, 101, 192); doc.setLineWidth(0.5); doc.line(15, y, 195, y); y += 8;

  var titrePrecedent = '';
  sections.forEach(function (s) {
    // Détecte un changement de grande section (I./II./III./IV.) pour insérer un saut visuel
    var racine = s.titre.split(' — ')[0];
    if (racine !== titrePrecedent && /^(I|II|III|IV)\./.test(racine)) {
      if (y > 250) { doc.addPage(); y = 18; }
      y += 3;
      doc.setFillColor(13, 34, 68);
      doc.rect(15, y - 4, 180, 7, 'F');
      doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.setTextColor(255);
      doc.text(racine, 18, y + 1);
      doc.setTextColor(0);
      y += 8;
      titrePrecedent = racine;
    }

    if (y > 265) { doc.addPage(); y = 18; }
    var sousTitre = s.titre.indexOf(' — ') !== -1 ? s.titre.split(' — ')[1] : s.titre;
    doc.setFontSize(10.5); doc.setFont(undefined, 'bold'); doc.setTextColor(21, 101, 192);
    doc.text(sousTitre, 15, y); y += 5;
    doc.setTextColor(0);

    if (s.type === 'tableau') {
      doc.autoTable({
        startY: y,
        head: [s.entetes],
        body: s.lignes,
        theme: 'grid',
        styles: { fontSize: 8.5, cellPadding: 2 },
        headStyles: { fillColor: [13, 34, 68], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [244, 247, 251] },
        margin: { left: 15, right: 15 }
      });
      y = doc.lastAutoTable.finalY + 4;
    } else if (s.type === 'kv') {
      doc.autoTable({
        startY: y,
        body: s.lignes,
        theme: 'plain',
        styles: { fontSize: s.compact ? 9 : 9.5, cellPadding: 1.5 },
        columnStyles: { 0: { cellWidth: 110 }, 1: { fontStyle: 'bold' } },
        margin: { left: 15, right: 15 }
      });
      y = doc.lastAutoTable.finalY + 3;
    } else if (s.type === 'texte') {
      doc.setFontSize(9.5); doc.setFont(undefined, 'normal');
      var lignesTexte = doc.splitTextToSize(s.texte, 178);
      doc.text(lignesTexte, 15, y);
      y += lignesTexte.length * 4.5 + 3;
    }

    if (s.note) {
      doc.setFontSize(8); doc.setFont(undefined, 'italic'); doc.setTextColor(100);
      var lignesNote = doc.splitTextToSize(s.note, 178);
      doc.text(lignesNote, 15, y);
      y += lignesNote.length * 3.6 + 5;
      doc.setTextColor(0); doc.setFont(undefined, 'normal');
    } else {
      y += 3;
    }
  });

  var img3d = capturerScene3D('rapport-3d');
  if (img3d) {
    if (y > 190) { doc.addPage(); y = 18; }
    doc.setFillColor(13, 34, 68);
    doc.rect(15, y - 4, 180, 7, 'F');
    doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.setTextColor(255);
    doc.text('V. Synoptique et implantation 3D', 18, y + 1);
    doc.setTextColor(0);
    y += 10;
    try { doc.addImage(img3d, 'PNG', 15, y, 180, 100); } catch (e) {}
  }

  doc.setFontSize(7.5); doc.setTextColor(120);
  var nbPages = doc.internal.getNumberOfPages();
  for (var p = 1; p <= nbPages; p++) {
    doc.setPage(p);
    doc.text((marque.nom || 'PULSAR ECO GROUP') + (marque.nom ? ' · rapport généré via Pulsar Eco Group AI' : ' · pulsarecogroup@gmail.com · Lomé, Togo'), 15, 292);
    doc.text('Page ' + p + '/' + nbPages, 185, 292);
  }

  doc.save('Rapport_Solaire_' + qn + '.pdf');
}

// ----------------------------------------------------------------
//  Styles
// ----------------------------------------------------------------
(function () {
  var s = document.createElement('style');
  s.textContent = `
    .ia-container{margin-top:22px;font-family:'Segoe UI',Arial,sans-serif;}
    .ia-header{background:linear-gradient(135deg,#0a192f,#1a3a5c 60%,#1b5e20);color:#fff;padding:16px 20px;border-radius:12px 12px 0 0;display:flex;align-items:center;gap:14px;}
    .ia-header h2{margin:0 0 3px;font-size:.95rem;font-weight:700;}
    .ia-subtitle{font-size:.72rem;color:rgba(255,255,255,.65);}
    .ia-logo-img{width:44px;height:44px;border-radius:9px;object-fit:cover;background:#fff;}
    .ia-bloc{background:#f8faff;border-left:4px solid #1565c0;padding:16px 20px;margin-bottom:8px;border-radius:0 8px 8px 0;box-shadow:0 2px 6px rgba(0,0,0,.06);}
    .ia-bloc h3{margin:0 0 10px;font-size:.9rem;font-weight:700;padding-bottom:6px;border-bottom:1px solid #d0dcf5;color:#0d2244;}
    .ia-contenu{color:#1a2a1a;line-height:1.7;font-size:.86rem;}
    .ia-note{font-size:.75rem;color:#78909c;font-style:italic;margin-top:6px;}
    .recap-table{width:100%;border-collapse:collapse;margin:6px 0;}
    .recap-table th,.recap-table td{border:1px solid #cfd8dc;padding:6px 9px;font-size:.82rem;text-align:left;}
    .recap-table th{background:#0d2244;color:#fff;}
    .recap-table.compact-kv td{font-size:.78rem;padding:5px 9px;}
    .ia-3d-bloc{background:#fff;border-left:4px solid #1565c0;padding:16px;}
    .scene3d-wrap{width:100%;border-radius:10px;overflow:hidden;min-height:480px;}
    .ia-loading{background:#e3f2fd;border:2px dashed #1976d2;padding:20px;border-radius:10px;text-align:center;color:#1565c0;font-size:.95rem;animation:pls 1.4s ease-in-out infinite;}
    @keyframes pls{0%,100%{opacity:1}50%{opacity:.4}}
  `;
  document.head.appendChild(s);
})();