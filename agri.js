function verifierFormulaire(){
    var surface=parseFloat(document.getElementById("surface").value);
    var depth=parseFloat(document.getElementById("depth").value);
    var tankH=parseFloat(document.getElementById("tankHeight").value);
    var hours=parseFloat(document.getElementById("hours").value);
    var psh=parseFloat(document.getElementById("psh").value);
    var btn=document.getElementById("btn-valider");
    if(btn) btn.disabled=!(surface>0&&depth>=0&&tankH>=0&&hours>0&&psh>0);
}

function validerEtAnalyser(){
    calculer();
    var iaDiv=document.getElementById("ia-results");
    iaDiv.innerHTML='<div class="ia-loading">⚡ PULSAR-AI analyse votre système de pompage...<br><small>Pompe, panneaux, câblage agricole en cours...</small></div>';
    setTimeout(function(){ iaDiv.scrollIntoView({behavior:"smooth"}); },100);
    setTimeout(function(){
        var data=window._dernierResultatAgri;
        if(!data){iaDiv.innerHTML='<div class="ia-loading" style="border-color:red;color:red;">❌ Erreur de calcul.</div>';return;}
        var res=analyserIA_Agri(data);
        iaDiv.innerHTML=afficherResultatsIA(res,"canvas3d-agri");
        setTimeout(function(){dessiner3DPanneaux("canvas3d-agri",parseInt(data.nombre_panneaux),10);},300);
    },800);
}

function calculer() {
    var surface=parseFloat(document.getElementById("surface").value);
    var culture=parseFloat(document.getElementById("culture").value);
    var ef=parseFloat(document.getElementById("efficiency").value);
    var dp=parseFloat(document.getElementById("depth").value);
    var th=parseFloat(document.getElementById("tankHeight").value);
    var hr=parseFloat(document.getElementById("hours").value);
    var psh=parseFloat(document.getElementById("psh").value);
    var panelPower=parseFloat(document.getElementById("panelPower").value);

    if(surface<0||dp<0){alert("Valeurs positives requises !");return;}
    if(hr<0||hr>24){alert("Heures entre 0 et 24 !");return;}

    var waterNeed=surface*culture*10/ef;
    var flow=waterNeed/hr;
    var HMT=(dp+th)*1.1;
    var Q=flow/3600;
    var Ph=1000*9.81*Q*HMT;
    var pumpPower=Ph/0.5;
    var pvPower=pumpPower/(psh*0.75);
    var nbPanels=Math.ceil(pvPower/panelPower);
    var cultureName = document.getElementById("culture").options[document.getElementById("culture").selectedIndex].text;
    var effName = document.getElementById("efficiency").options[document.getElementById("efficiency").selectedIndex].text;

    window._dernierResultatAgri={
        surface_ha:surface, type_culture:cultureName, type_irrigation:effName,
        profondeur_dynamique_m:dp, hauteur_reservoir_m:th, heures_pompage_par_jour:hr, hsp_heures:psh,
        puissance_panneau_W:panelPower,
        besoin_eau_m3_par_jour:waterNeed.toFixed(1), debit_requis_m3h:flow.toFixed(2),
        HMT_m:HMT.toFixed(1), puissance_pompe_kW:(pumpPower/1000).toFixed(2),
        puissance_PV_kWc:(pvPower/1000).toFixed(2), nombre_panneaux:nbPanels
    };

    document.getElementById("results").innerHTML=
        '<h2>RÉSULTATS :</h2>'+
        '<p><strong>Besoin en eau : </strong>'+waterNeed.toFixed(1)+' m³/j</p>'+
        '<p><strong>Débit requis : </strong>'+flow.toFixed(2)+' m³/h</p>'+
        '<p><strong>HMT : </strong>'+HMT.toFixed(1)+' m</p>'+
        '<p><strong>Puissance pompe : </strong>'+(pumpPower/1000).toFixed(2)+' kW</p>'+
        '<p><strong>Puissance PV : </strong>'+(pvPower/1000).toFixed(2)+' kWc</p>'+
        '<p><strong>Nombre panneaux : </strong>'+nbPanels+'</p>';
}

function generateQuoteNumber(){var now=new Date();return 'PEG-'+now.getFullYear()+String(now.getMonth()+1).padStart(2,'0')+String(now.getDate()).padStart(2,'0')+'-'+(Math.floor(Math.random()*900)+100);}
function addWatermark(doc){doc.setTextColor(220);doc.setFontSize(60);doc.text("PULSAR ECO GROUP",150,220,{align:"center",angle:45});doc.setTextColor(0);}
function addFooter(doc){doc.setFontSize(9);doc.setTextColor(100);doc.line(20,280,190,280);doc.text("PULSAR ECO GROUP - Solutions solaires intelligentes",20,287);doc.text("Email : pulsarecogroup@gmail.com",120,287);doc.text("Lomé - Togo",120,292);doc.text("Tél : +228 92196727 / +228 90104393 / +228 93775800",20,292);doc.setTextColor(0);}
function generatePDF(){
    var jsPDF=window.jspdf.jsPDF;var doc=new jsPDF();var qn=generateQuoteNumber();
    addWatermark(doc);doc.setFontSize(18);doc.text("DEVIS Pompage Solaire Agricole",20,25);
    doc.setFontSize(11);doc.text("N° Devis : "+qn,20,35);doc.text("Date : "+new Date().toLocaleDateString("fr-FR"),20,42);
    doc.line(20,48,190,48);doc.setFontSize(13);doc.text(document.getElementById("results").innerText,20,60);
    addFooter(doc);doc.save("Devis_"+qn+".pdf");
}
