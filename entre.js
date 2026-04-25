var equipements=[];

function addRow(){
    var table=document.getElementById("equipmentTable");
    var row=table.insertRow();
    row.innerHTML=
        '<td><input type="text" placeholder="Ex: Climatiseur" onchange="verifierFormulaire()"></td>'+
        '<td><input type="number" placeholder="1200" min="0" onchange="verifierFormulaire()"></td>'+
        '<td><input type="number" placeholder="2" min="1" onchange="verifierFormulaire()"></td>'+
        '<td><input type="number" placeholder="6" min="0" max="24" onchange="verifierFormulaire()"></td>'+
        '<td><button class="del-btn" onclick="deleteRow(this)">X</button></td>';
    verifierFormulaire();
}
function deleteRow(btn){btn.parentNode.parentNode.parentNode.removeChild(btn.parentNode.parentNode);verifierFormulaire();}

function verifierFormulaire(){
    var table=document.getElementById("equipmentTable");
    var ok=false;
    for(var i=1;i<table.rows.length;i++){
        var cells=table.rows[i].cells;
        var p=parseFloat(cells[1].children[0].value);
        var q=parseFloat(cells[2].children[0].value);
        var h=parseFloat(cells[3].children[0].value);
        if(p>0&&q>0&&h>0){ok=true;break;}
    }
    var btn=document.getElementById("btn-valider");
    if(btn) btn.disabled=!ok;
}

function validerEtAnalyser(){
    calculer();
    var iaDiv=document.getElementById("ia-results");
    iaDiv.innerHTML='<div class="ia-loading">⚡ PULSAR-AI analyse votre installation entreprise...<br><small>Dimensionnement industriel, ROI et câblage en cours...</small></div>';
    setTimeout(function(){iaDiv.scrollIntoView({behavior:"smooth"});},100);
    setTimeout(function(){
        var data=window._dernierResultatEntreprise;
        if(!data){iaDiv.innerHTML='<div class="ia-loading" style="border-color:red;color:red;">❌ Erreur de calcul.</div>';return;}
        var res=analyserIA_Entreprise(data);
        iaDiv.innerHTML=afficherResultatsIA(res,"canvas3d-entreprise");
        setTimeout(function(){dessiner3DPanneaux("canvas3d-entreprise",parseInt(data.nombre_panneaux_550W),8);},300);
    },800);
}

function calculer(){
    equipements=[];
    var table=document.getElementById("equipmentTable");
    var energie=0;
    for(var i=1;i<table.rows.length;i++){
        var cells=table.rows[i].cells;
        var nom=cells[0].children[0].value||"Équipement";
        var puissance=parseFloat(cells[1].children[0].value)||0;
        var quantite=parseFloat(cells[2].children[0].value)||0;
        var heures=parseFloat(cells[3].children[0].value)||0;
        if(puissance>0&&quantite>0&&heures>0){
            equipements.push({nom,puissance,quantite,heures});
            energie+=puissance*quantite*heures;
        }
    }
    var hsp=parseFloat(document.getElementById("hsp").value)||5;
    var efficiency=parseFloat(document.getElementById("efficiency").value)||0.75;
    var type=document.getElementById("typeInstallation").value;
    var budget=parseFloat(document.getElementById("budget").value)||0;
    const puissancePanneau=550;
    var pvPower=energie/(hsp*efficiency);
    var nbPanneaux=Math.ceil(pvPower/puissancePanneau);
    var batteries=type!=="reseau"?Math.ceil((energie/(48*0.8))/200):0;
    var onduleur=Math.ceil(pvPower*1.3/1000);
    var coutTotal=(nbPanneaux*180000)+(onduleur*300000)+(batteries*450000);
    var mainDoeuvre=nbPanneaux*10000;

    window._dernierResultatEntreprise={
        type_installation:type,
        consommation_journaliere_kWh:(energie/1000).toFixed(2),
        puissance_PV_kWc:(pvPower/1000).toFixed(2),
        nombre_panneaux_550W:nbPanneaux,
        onduleur_kVA:onduleur,
        batteries:type!=="reseau"?batteries+" unités 48V/200Ah":"Non requises",
        cout_estimatif_FCFA:coutTotal,
        main_doeuvre_FCFA:mainDoeuvre,
        cout_total_FCFA:coutTotal+mainDoeuvre,
        budget_client_FCFA:budget, hsp_heures:hsp, equipements:equipements
    };

    document.getElementById("results").innerHTML=
        '<p><strong>Consommation journalière :</strong> '+(energie/1000).toFixed(2)+' kWh</p>'+
        '<p><strong>Panneaux recommandés :</strong> '+nbPanneaux+' panneaux 550W</p>'+
        '<p><strong>Onduleur recommandé :</strong> '+onduleur+' kVA</p>'+
        '<p><strong>Batteries :</strong> '+(type!=="reseau"?batteries+" unités 48V":"Non requises")+'</p>'+
        '<p><strong>Coût estimatif :</strong> '+coutTotal.toLocaleString()+' FCFA</p>'+
        '<p><strong>Main d\'œuvre :</strong> '+mainDoeuvre.toLocaleString()+' FCFA</p>'+
        '<p><strong>Coût Total :</strong> '+(coutTotal+mainDoeuvre).toLocaleString()+' FCFA</p>';
}

function generateQuoteNumber(){var now=new Date();return 'PEG-'+now.getFullYear()+String(now.getMonth()+1).padStart(2,'0')+String(now.getDate()).padStart(2,'0')+'-'+(Math.floor(Math.random()*900)+100);}
function addWatermark(doc){doc.setTextColor(220);doc.setFontSize(60);doc.text("PULSAR ECO GROUP",150,220,{align:"center",angle:45});doc.setTextColor(0);}
function addFooter(doc){doc.setFontSize(9);doc.setTextColor(100);doc.line(20,280,190,280);doc.text("PULSAR ECO GROUP - Solutions solaires intelligentes",20,287);doc.text("Email : pulsarecogroup@gmail.com",120,287);doc.text("Lomé - Togo",120,292);doc.text("Tél : +228 92196727 / +228 90104393 / +228 93775800",20,292);doc.setTextColor(0);}
function generatePDF(){
    var jsPDF=window.jspdf.jsPDF;var doc=new jsPDF();var qn=generateQuoteNumber();
    addWatermark(doc);doc.setFontSize(18);doc.text("DEVIS Solaire Entreprise",20,25);
    doc.setFontSize(11);doc.text("N° Devis : "+qn,20,35);doc.text("Date : "+new Date().toLocaleDateString("fr-FR"),20,42);
    doc.line(20,48,190,48);doc.setFontSize(13);doc.text(document.getElementById("results").innerText,20,60);
    addFooter(doc);doc.save("Devis_"+qn+".pdf");
}
