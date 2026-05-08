var devices = [];

function addRow() {
  var t = document.getElementById('equipmentTable');
  var r = t.insertRow();
  r.innerHTML =
    '<td><input type="text" placeholder="Ex: Climatiseur" oninput="verifierFormulaire()"></td>' +
    '<td><input type="number" placeholder="750" min="0" oninput="verifierFormulaire()"></td>' +
    '<td><input type="number" placeholder="1" min="1" oninput="verifierFormulaire()"></td>' +
    '<td><input type="number" placeholder="8" min="0" max="24" oninput="verifierFormulaire()"></td>' +
    '<td><button class="del-btn" onclick="deleteRow(this)">✕</button></td>';
  verifierFormulaire();
}

function deleteRow(btn) {
  btn.closest('tr').remove();
  verifierFormulaire();
}

function verifierFormulaire() {
  var t   = document.getElementById('equipmentTable');
  var ok  = false;
  for (var i = 1; i < t.rows.length; i++) {
    var c = t.rows[i].cells;
    if (c[0].children[0].value && parseFloat(c[1].children[0].value) > 0 &&
        parseFloat(c[2].children[0].value) > 0 && parseFloat(c[3].children[0].value) > 0) {
      ok = true; break;
    }
  }
  var ville = (document.getElementById('villeInput') || {}).value || '';
  var btn   = document.getElementById('btn-valider');
  if (btn) {
    btn.disabled = !(ok && ville.trim() !== '');
    btn.title    = !ville.trim() ? '⚠️ Entrez d\'abord votre ville' :
                   !ok           ? '⚠️ Ajoutez au moins un équipement' : '';
  }
}

function validerEtAnalyser() {
  // Récupérer équipements
  var t = document.getElementById('equipmentTable');
  devices = [];
  var E = 0, Ppic = 0;
  for (var i = 1; i < t.rows.length; i++) {
    var c   = t.rows[i].cells;
    var nom = c[0].children[0].value || 'Appareil';
    var pw  = parseFloat(c[1].children[0].value) || 0;
    var qty = parseFloat(c[2].children[0].value) || 0;
    var hrs = parseFloat(c[3].children[0].value) || 0;
    if (pw > 0 && qty > 0 && hrs > 0) {
      var coeff = typeof coeffDemarrage === 'function' ? coeffDemarrage(nom) : 1;
      E    += pw * qty * hrs;
      Ppic += pw * qty * coeff;
      devices.push({ nom: nom, power: pw, qty: qty, hours: hrs,
                     energie: pw * qty * hrs, coeff: coeff });
    }
  }

  var auto = parseFloat((document.getElementById('autonomy') || {}).value) || 1;
  var hsp  = parseFloat((document.getElementById('hsp') || {}).value) || 5.2;

  window._dernierResultatMenage = {
    consommation_journaliere_Wh: E.toFixed(0),
    equipements: devices,
    autonomie_jours: auto,
    hsp_heures: hsp
  };

  // Afficher loader
  var ia = document.getElementById('ia-results');
  ia.innerHTML = '<div class="ia-loading">⚡ PULSAR-AI analyse votre installation...<br><small>Calculs FES12, câblage et conception 3D en cours...</small></div>';
  ia.scrollIntoView({ behavior: 'smooth' });

  setTimeout(function() {
    var res = analyserIA_Menage(window._dernierResultatMenage);
    ia.innerHTML = afficherResultatsIA(res, 'canvas3d-menage');
    setTimeout(function() {
      dessiner3DPanneaux('canvas3d-menage', res.nb_pan, res.ville.inclinaison || 8);
    }, 300);
  }, 600);
}

// PDF
function generatePDF() {
  if (!devices || !devices.length) { alert('Lancez d\'abord l\'analyse !'); return; }
  var jsPDF = window.jspdf.jsPDF;
  var doc   = new jsPDF();
  var qn    = 'PEG-' + Date.now();
  doc.setTextColor(220); doc.setFontSize(50);
  doc.text('PULSAR ECO GROUP', 105, 150, { align:'center', angle:45 });
  doc.setTextColor(0);
  doc.setFontSize(18); doc.text('DEVIS Solaire Résidentiel', 20, 25);
  doc.setFontSize(11);
  doc.text('N° ' + qn, 20, 35);
  doc.text('Date : ' + new Date().toLocaleDateString('fr-FR'), 20, 42);
  doc.setFontSize(10);
  var ville = (window._villeSelectionnee || {}).nom || '';
  if (ville) doc.text('Ville : ' + ville, 20, 50);
  doc.line(20, 54, 190, 54);
  var txt = document.getElementById('ia-results');
  if (txt) doc.setFontSize(9).text(txt.innerText.substring(0, 1200), 20, 60, { maxWidth: 170 });
  doc.setFontSize(8); doc.setTextColor(100);
  doc.line(20, 278, 190, 278);
  doc.text('PULSAR ECO GROUP · pulsarecogroup@gmail.com · Lomé, Togo', 20, 284);
  doc.text('Tél: +228 92196727 / 90104393 / 93775800', 20, 289);
  doc.save('Devis_' + qn + '.pdf');
}
