let devices = [];

function addRow(){
    var table = document.getElementById("equipmentTable");
    var row = table.insertRow();
    row.innerHTML =
        '<td><input type="text" placeholder="Ex: Climatiseur" onchange="verifierFormulaire()"></td>' +
        '<td><input type="number" placeholder="1200" min="0" onchange="verifierFormulaire()"></td>' +
        '<td><input type="number" placeholder="2" min="1" onchange="verifierFormulaire()"></td>' +
        '<td><input type="number" placeholder="6" min="0" max="24" onchange="verifierFormulaire()"></td>' +
        '<td><button class="del-btn" onclick="deleteRow(this)">X</button></td>';
    verifierFormulaire();
}

function deleteRow(btn){
    btn.parentNode.parentNode.parentNode.removeChild(btn.parentNode.parentNode);
    verifierFormulaire();
}

function verifierFormulaire(){
    var table = document.getElementById("equipmentTable");
    var ok = false;
    for(var i=1;i<table.rows.length;i++){
        var cells = table.rows[i].cells;
        var nom = cells[0].children[0].value;
        var p = parseFloat(cells[1].children[0].value);
        var q = parseFloat(cells[2].children[0].value);
        var h = parseFloat(cells[3].children[0].value);
        if(nom && p>0 && q>0 && h>0){ ok=true; break; }
    }
    var autonomy = parseFloat(document.getElementById("autonomy").value);
    var hsp = parseFloat(document.getElementById("hsp").value);
    var btn = document.getElementById("btn-valider");
    if(btn) btn.disabled = !(ok && autonomy>0 && hsp>0);
}

function validerEtAnalyser(){
    calculer();
    var iaDiv = document.getElementById("ia-results");
    iaDiv.innerHTML = '<div class="ia-loading">⚡ PULSAR-AI analyse votre installation...<br><small>Dimensionnement, câblage et orientation en cours...</small></div>';
    setTimeout(function(){
        iaDiv.scrollIntoView({behavior:"smooth"});
    }, 100);
    setTimeout(function(){
        var data = window._dernierResultatMenage;
        if(!data){ iaDiv.innerHTML='<div class="ia-loading" style="border-color:red;color:red;">❌ Erreur de calcul.</div>'; return; }
        var res = analyserIA_Menage(data);
        iaDiv.innerHTML = afficherResultatsIA(res, "canvas3d-menage");
        setTimeout(function(){ dessiner3DPanneaux("canvas3d-menage", parseInt(data.nombre_panneaux_400W), 8); }, 300);
    }, 800);
}

function calculer() {
    var table = document.getElementById("equipmentTable");
    var totalEnergy = 0;
    devices = [];
    for(var i=1;i<table.rows.length;i++){
        var cells = table.rows[i].cells;
        var nom = cells[0].children[0].value || "Appareil";
        var power = parseFloat(cells[1].children[0].value)||0;
        var qty = parseFloat(cells[2].children[0].value)||0;
        var hours = parseFloat(cells[3].children[0].value)||0;
        totalEnergy += power*qty*hours;
        if(power>0&&qty>0&&hours>0) devices.push({nom,power,qty,hours,energie:power*qty*hours});
    }
    var autonomy = parseFloat(document.getElementById("autonomy").value)||1;
    var hsp = parseFloat(document.getElementById("hsp").value)||5;
    var bud = parseFloat(document.getElementById("bud").value)||0;
    var efficiency = parseFloat(document.getElementById("efficiency").value)||0.75;

    var pvPower = totalEnergy/(hsp*efficiency);
    var batteryWh = totalEnergy*autonomy;
    var inverterPower = totalEnergy/5*1.25;
    var panelCount = Math.ceil(pvPower/400);
    var batteryCount = Math.ceil(batteryWh/2400);
    var regOnd = 250000;
    var estimatedCost = panelCount*150000+batteryCount*300000+regOnd;
    var mainDoeuvre = panelCount*10000;

    window._dernierResultatMenage = {
        consommation_journaliere_Wh: totalEnergy.toFixed(0),
        puissance_PV_requise_W: pvPower.toFixed(0),
        nombre_panneaux_400W: panelCount,
        capacite_batterie_Wh: batteryWh.toFixed(0),
        nombre_batteries_2_4kWh: batteryCount,
        puissance_onduleur_W: inverterPower.toFixed(0),
        autonomie_jours: autonomy, hsp_heures: hsp,
        cout_estime_FCFA: estimatedCost,
        main_doeuvre_FCFA: mainDoeuvre,
        cout_total_FCFA: estimatedCost+mainDoeuvre,
        budget_client_FCFA: bud, equipements: devices
    };

    document.getElementById("results").innerHTML =
        '<p><strong>Consommation journalière : </strong>'+totalEnergy.toFixed(0)+' Wh</p>'+
        '<p><strong>Puissance panneaux requise : </strong>'+pvPower.toFixed(0)+' W</p>'+
        '<p><strong>Nombre de panneaux 400W : </strong>'+panelCount+'</p>'+
        '<p><strong>Capacité batterie requise : </strong>'+batteryWh.toFixed(0)+' Wh</p>'+
        '<p><strong>Nombre batteries 2.4 kWh : </strong>'+batteryCount+'</p>'+
        '<p><strong>Puissance onduleur recommandée : </strong>'+inverterPower.toFixed(0)+' W</p>'+
        '<p><strong>Régulateur MPPT + Onduleur : </strong>'+regOnd.toLocaleString()+' FCFA</p>'+
        '<p><strong>Coût estimé : </strong>'+estimatedCost.toLocaleString()+' FCFA</p>'+
        '<p><strong>Main d\'œuvre : </strong>'+mainDoeuvre.toLocaleString()+' FCFA</p>'+
        '<p><strong>Coût Total : </strong>'+(estimatedCost+mainDoeuvre).toLocaleString()+' FCFA</p>';
}

function generateQuoteNumber(){
    var now=new Date();
    return 'PEG-'+now.getFullYear()+String(now.getMonth()+1).padStart(2,'0')+String(now.getDate()).padStart(2,'0')+'-'+(Math.floor(Math.random()*900)+100);
}
function addWatermark(doc){doc.setTextColor(220);doc.setFontSize(60);doc.text("PULSAR ECO GROUP",150,220,{align:"center",angle:45});doc.setTextColor(0);}
function addFooter(doc){doc.setFontSize(9);doc.setTextColor(100);doc.line(20,280,190,280);doc.text("PULSAR ECO GROUP - Solutions solaires intelligentes",20,287);doc.text("Email : pulsarecogroup@gmail.com",120,287);doc.text("Lomé - Togo",120,292);doc.text("Tél : +228 92196727 / +228 90104393 / +228 93775800",20,292);doc.setTextColor(0);}
function generatePDF(){
    if(!devices||devices.length===0){alert("Veuillez d'abord remplir et valider le formulaire");return;}
    var jsPDF=window.jspdf.jsPDF;
    var doc=new jsPDF();
    var qn=generateQuoteNumber();
    addWatermark(doc);
    doc.setFontSize(18);doc.text("DEVIS Solaire Résidentiel",20,25);
    doc.setFontSize(11);doc.text("N° Devis : "+qn,20,35);doc.text("Date : "+new Date().toLocaleDateString("fr-FR"),20,42);
    doc.line(20,48,190,48);
    doc.setFontSize(13);doc.text(document.getElementById("results").innerText,20,60);
    addFooter(doc);doc.save("Devis_"+qn+".pdf");
}
