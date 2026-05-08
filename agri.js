function verifierFormulaire() {
  var surface = parseFloat((document.getElementById('surface')||{}).value);
  var depth   = parseFloat((document.getElementById('depth')||{}).value);
  var tankH   = parseFloat((document.getElementById('tankHeight')||{}).value);
  var hours   = parseFloat((document.getElementById('hours')||{}).value);
  var ville   = (document.getElementById('villeInput')||{}).value || '';
  var btn     = document.getElementById('btn-valider');
  var ok = surface > 0 && depth >= 0 && tankH >= 0 && hours > 0 && ville.trim() !== '';
  if (btn) { btn.disabled = !ok; btn.title = !ville.trim() ? '⚠️ Entrez votre ville' : ''; }
}

function validerEtAnalyser() {
  var surface  = parseFloat(document.getElementById('surface').value) || 1;
  var cultureV = parseFloat(document.getElementById('culture').value) || 5;
  var cultureT = document.getElementById('culture').options[document.getElementById('culture').selectedIndex].text;
  var ef       = parseFloat(document.getElementById('efficiency').value) || 0.9;
  var efT      = document.getElementById('efficiency').options[document.getElementById('efficiency').selectedIndex].text;
  var depth    = parseFloat(document.getElementById('depth').value) || 10;
  var tankH    = parseFloat(document.getElementById('tankHeight').value) || 5;
  var hours    = parseFloat(document.getElementById('hours').value) || 6;
  var psh      = parseFloat(document.getElementById('psh').value) || 5.2;
  var panPow   = parseFloat(document.getElementById('panelPower').value) || 400;

  window._dernierResultatAgri = {
    surface_ha: surface, culture_mm: cultureV, type_culture: cultureT,
    ef_irrig: ef, type_irrigation: efT,
    profondeur_m: depth, hauteur_res_m: tankH,
    heures_pompage: hours, hsp_heures: psh, puissance_panneau_W: panPow
  };

  var ia = document.getElementById('ia-results');
  ia.innerHTML = '<div class="ia-loading">⚡ PULSAR-AI analyse votre système de pompage...<br><small>HMT, puissance pompe, PV et câblage en cours...</small></div>';
  ia.scrollIntoView({ behavior: 'smooth' });

  setTimeout(function() {
    var res = analyserIA_Agri(window._dernierResultatAgri);
    ia.innerHTML = afficherResultatsIA(res, 'canvas3d-agri');
    setTimeout(function() {
      dessiner3DPanneaux('canvas3d-agri', res.nb_pan, res.ville.inclinaison || 10);
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
  doc.text('DEVIS Pompage Solaire Agricole', 20, 25);
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
