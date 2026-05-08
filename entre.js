var equipements = [];

function addRow() {
  var t = document.getElementById('equipmentTable');
  var r = t.insertRow();
  r.innerHTML =
    '<td><input type="text" placeholder="Ex: Ordinateur" oninput="verifierFormulaire()"></td>' +
    '<td><input type="number" placeholder="200" min="0" oninput="verifierFormulaire()"></td>' +
    '<td><input type="number" placeholder="5" min="1" oninput="verifierFormulaire()"></td>' +
    '<td><input type="number" placeholder="8" min="0" max="24" oninput="verifierFormulaire()"></td>' +
    '<td><button class="del-btn" onclick="deleteRow(this)">✕</button></td>';
  verifierFormulaire();
}

function deleteRow(btn) { btn.closest('tr').remove(); verifierFormulaire(); }

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
  var ville = (document.getElementById('villeInput')||{}).value || '';
  var btn   = document.getElementById('btn-valider');
  if (btn) { btn.disabled = !(ok && ville.trim() !== ''); }
}

function validerEtAnalyser() {
  var t = document.getElementById('equipmentTable');
  equipements = [];
  for (var i = 1; i < t.rows.length; i++) {
    var c   = t.rows[i].cells;
    var nom = c[0].children[0].value || 'Équipement';
    var pw  = parseFloat(c[1].children[0].value) || 0;
    var qty = parseFloat(c[2].children[0].value) || 0;
    var hrs = parseFloat(c[3].children[0].value) || 0;
    if (pw > 0 && qty > 0 && hrs > 0)
      equipements.push({ nom: nom, puissance: pw, quantite: qty, heures: hrs });
  }

  window._dernierResultatEntreprise = {
    consommation_journaliere_kWh: equipements.reduce(function(s,e){ return s + e.puissance*e.quantite*e.heures; }, 0) / 1000,
    equipements: equipements,
    hsp_heures: parseFloat((document.getElementById('hsp')||{}).value) || 5.2,
    type_installation: (document.getElementById('typeInstallation')||{}).value || 'autonome'
  };

  var ia = document.getElementById('ia-results');
  ia.innerHTML = '<div class="ia-loading">⚡ PULSAR-AI analyse votre installation entreprise...<br><small>Dimensionnement industriel et câblage en cours...</small></div>';
  ia.scrollIntoView({ behavior: 'smooth' });

  setTimeout(function() {
    var res = analyserIA_Entreprise(window._dernierResultatEntreprise);
    ia.innerHTML = afficherResultatsIA(res, 'canvas3d-entreprise');
    setTimeout(function() {
      dessiner3DPanneaux('canvas3d-entreprise', res.nb_pan, res.ville.inclinaison || 8);
    }, 300);
  }, 600);
}

function generatePDF() {
  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF();
  var qn  = 'PEG-' + Date.now();
  doc.setTextColor(220); doc.setFontSize(50);
  doc.text('PULSAR ECO GROUP', 105, 150, { align:'center', angle:45 });
  doc.setTextColor(0); doc.setFontSize(18);
  doc.text('DEVIS Solaire Entreprise / Institution', 20, 25);
  doc.setFontSize(11);
  doc.text('N° ' + qn, 20, 35);
  doc.text('Date : ' + new Date().toLocaleDateString('fr-FR'), 20, 42);
  doc.line(20, 48, 190, 48);
  var txt = document.getElementById('ia-results');
  if (txt) doc.setFontSize(9).text(txt.innerText.substring(0, 1200), 20, 55, { maxWidth: 170 });
  doc.setFontSize(8); doc.setTextColor(100);
  doc.line(20, 278, 190, 278);
  doc.text('PULSAR ECO GROUP · pulsarecogroup@gmail.com · Lomé, Togo', 20, 284);
  doc.save('Devis_' + qn + '.pdf');
}
