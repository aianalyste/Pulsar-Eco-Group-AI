// ================================================================
//  PULSAR ECO GROUP — RAPPORT UNIFIÉ v10
//  Une seule structure de données ("sections") sert à la fois à
//  l'affichage écran ET au PDF -> plus jamais de PDF différent de
//  l'écran. Supporte la marque blanche (logo + nom du client).
// ================================================================

// ----------------------------------------------------------------
//  Construit la structure canonique du rapport à partir du résultat
//  du moteur (r = calculDimensionnementComplet(...))
// ----------------------------------------------------------------
function construireSectionsRapport(r, contexte) {
  // contexte = { nomModule, ville:{nom}, controleurType, marque:{nom, logoDataUrl} }
  var b = r.bilan;
  var kWc = ((r.NP * r.panneau.puissance) / 1000).toFixed(2);
  var sections = [];

  sections.push({
    titre: '① Bilan des appareils (jour / nuit)',
    type: 'tableau',
    entetes: ['Appareil', 'Nb', 'PU (W)', 'Heures/j', 'Jour (Wh)', 'Nuit (Wh)', 'PT (W)', 'Énergie (Wh)'],
    lignes: b.lignes.map(function (l) {
      return [l.nom, l.nombre, l.pu, l.heures, l.E_jour.toFixed(0), l.E_nuit.toFixed(0), l.PT.toFixed(0), l.E.toFixed(0)];
    }),
    totalRow: ['TOTAL', '', '', '', b.E_jour_total.toFixed(0), b.E_nuit_total.toFixed(0), b.PT_total.toFixed(0), b.E_total.toFixed(0)],
    note: 'Ej = 1,2 × E = ' + r.Ej.toFixed(1) + ' Wh   ·   Pc = Ej ÷ (η ondu × η rég × RP × IR) = ' + r.Pc.toFixed(0) + ' Wc   ·   IR = ' + r.IR + ' kWh/m²/j'
  });

  sections.push({
    titre: '② Classement des appareils',
    type: 'kv',
    lignes: [
      ['Appareils classiques (coefficient 1)', (b.classiques.map(function (l) { return l.nom; }).join(', ') || '—')],
      ['Appareils à démarrage inductif', (b.inductifs.map(function (l) { return l.nom + ' (×' + l.coeff + ')'; }).join(', ') || '—')]
    ]
  });

  sections.push({
    titre: '③ Pointe de démarrage réelle',
    type: 'kv',
    lignes: [
      ['Heure de pointe (le plus d\'appareils inductifs ensemble)', r.bilan.heure_pointe + 'h - ' + (r.bilan.heure_pointe + 1) + 'h'],
      ['Puissance de pointe à cette heure', r.bilan.P_pointe_max.toFixed(0) + ' W'],
      ['Puissance du convertisseur retenue (K × pointe)', r.Pconv.normalise + ' W']
    ],
    note: 'Le convertisseur est dimensionné sur la pointe réelle de démarrage simultané, pas sur la somme brute de tous les appareils.'
  });

  sections.push({
    titre: '④ Panneaux solaires sélectionnés',
    type: 'tableau',
    entetes: ['Fabricant', 'Modèle', 'Puissance', 'VOC', 'Icc', 'Quantité'],
    lignes: [[r.panneau.fabricant, r.panneau.modele, r.panneau.puissance + ' W', r.panneau.voc + ' V', r.panneau.icc + ' A', r.NP]],
    note: 'Installé : ' + kWc + ' kWc  ·  Tension système : ' + r.Vsys + ' V  ·  Montage : ' + r.Ns + ' séries × ' + r.N + ' parallèles  ·  Contrôleur : ' + (contexte.controleurType || 'MPPT')
  });

  sections.push({
    titre: '⑤ Batteries sélectionnées',
    type: 'tableau',
    entetes: ['Type', 'Capacité unitaire', 'Taux décharge', 'Quantité', 'Capacité totale'],
    lignes: [[r.batterie.type, r.batterie.capacite + ' Ah', (r.TD * 100) + ' %', r.Nb, (r.Cb_Wh_total / 1000).toFixed(2) + ' kWh']],
    note: 'Autonomie : ' + r.joursAuto + ' jour(s)  ·  Dimensionnée sur le besoin de nuit (' + (r.bilan.E_nuit_total / 1000).toFixed(2) + ' kWh) + réserve nuageuse ' + (r.reserveNuageuse * 100) + '% du besoin jour  ·  Cb calculée = ' + r.Cb.toFixed(1) + ' Ah'
  });

  sections.push({
    titre: '⑥ Énergie produite vs besoin',
    type: 'kv',
    lignes: [
      ['Besoin quotidien du client', (r.comparaison.E_besoin_Wh / 1000).toFixed(2) + ' kWh/j'],
      ['Production estimée des panneaux', (r.comparaison.E_produite_Wh / 1000).toFixed(2) + ' kWh/j'],
      ['Taux de couverture', r.comparaison.tauxCouverture + ' %'],
      ['Marge de sécurité (nuages, vieillissement panneaux)', r.comparaison.margeSecurite + ' %']
    ],
    note: 'Une marge de 20 à 30% au-dessus du besoin est normale et recommandée (jours nuageux, dégradation ~0,5%/an des panneaux).',
    compact: true
  });

  sections.push({
    titre: '⑦ Sections de câble',
    type: 'tableau',
    entetes: ['Tronçon', 'Longueur (max)', 'Intensité', 'Tension réf.', 'Calculé', 'Section retenue'],
    lignes: [
      ['S1 — Panneaux → régulateur', r.L1 + ' m', r.I1 + ' A', r.V1 + ' V', r.S1.S_calc + ' mm²', r.S1.S_normalise + ' mm²'],
      ['S2 — Batteries → régulateur', r.L2 + ' m', r.I2.toFixed(1) + ' A', r.V2 + ' V', r.S2.S_calc + ' mm²', r.S2.S_normalise + ' mm²'],
      ['S3 — Convertisseur → sortie', r.L3 + ' m', r.I3.toFixed(1) + ' A', r.V3 + ' V', r.S3.S_calc + ' mm²', r.S3.S_normalise + ' mm²']
    ]
  });

  sections.push({
    titre: '⑧ Disjoncteurs / Protections',
    type: 'tableau',
    entetes: ['Position', 'Tension nominale', 'Calibre'],
    lignes: [
      ['D1 — Côté panneaux', r.D1.V + ' V', r.D1.I + ' A'],
      ['D2 — Côté batteries', r.D2.V + ' V', r.D2.I + ' A'],
      ['D3 — Côté sortie AC', r.D3.V + ' V', r.D3.I + ' A']
    ],
    note: 'Convertisseur : Pconv = ' + r.Pconv.normalise + ' W'
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
//  RENDU ÉCRAN (HTML) à partir des sections
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
      if (s.totalRow) html += '<tr class="total-row">' + s.totalRow.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>';
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
//  RENDU PDF — utilise jsPDF-AutoTable pour de VRAIS tableaux
//  (corrige le bug "pas de tableau, pas de ligne, illisible")
// ----------------------------------------------------------------
function genererPDFDepuisSections(sections, contexte) {
  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF();
  var marque = contexte.marque || {};
  var nomAffiche = marque.nom || 'PULSAR ECO GROUP';
  var qn = (contexte.prefixeRef || 'PEG') + '-' + Date.now();
  var y = 15;

  // En-tête marque blanche
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
  doc.text('Rapport de dimensionnement solaire — Module ' + contexte.nomModule, 40, 24);
  doc.setFontSize(9); doc.setTextColor(90);
  doc.text('N° ' + qn + '  ·  ' + new Date().toLocaleDateString('fr-FR') + (contexte.ville ? '  ·  ' + contexte.ville.nom : ''), 40, 30);
  doc.setTextColor(0);
  y = 38;
  doc.setDrawColor(21, 101, 192); doc.setLineWidth(0.5); doc.line(15, y, 195, y); y += 8;

  sections.forEach(function (s) {
    if (y > 265) { doc.addPage(); y = 18; }
    doc.setFontSize(11.5); doc.setFont(undefined, 'bold'); doc.setTextColor(13, 34, 68);
    doc.text(s.titre, 15, y); y += 5;
    doc.setTextColor(0);

    if (s.type === 'tableau') {
      var body = s.lignes.slice();
      if (s.totalRow) body.push(s.totalRow);
      doc.autoTable({
        startY: y,
        head: [s.entetes],
        body: body,
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

  // Image 3D
  var img3d = capturerScene3D('rapport-3d');
  if (img3d) {
    if (y > 190) { doc.addPage(); y = 18; }
    doc.setFontSize(11.5); doc.setFont(undefined, 'bold'); doc.setTextColor(13, 34, 68);
    doc.text('🏗️ Plan d\'implantation 3D', 15, y); y += 5;
    doc.setTextColor(0);
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
//  Styles du rapport (fond blanc, texte compact pour la section ⑥)
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
    .recap-table .total-row td{font-weight:700;background:#e3f2fd;}
    .recap-table.compact-kv td{font-size:.78rem;padding:5px 9px;}
    .ia-3d-bloc{background:#fff;border-left:4px solid #1565c0;padding:16px;}
    .scene3d-wrap{width:100%;border-radius:10px;overflow:hidden;min-height:480px;}
    .ia-loading{background:#e3f2fd;border:2px dashed #1976d2;padding:20px;border-radius:10px;text-align:center;color:#1565c0;font-size:.95rem;animation:pls 1.4s ease-in-out infinite;}
    @keyframes pls{0%,100%{opacity:1}50%{opacity:.4}}
  `;
  document.head.appendChild(s);
})();
