// ================================================================
//  PULSAR ECO GROUP — SCÈNE 3D v10 (refonte complète demandée)
//  Fond blanc, grillage léger, panneaux groupés en blocs (Ns x N),
//  2-3 couleurs max + légende. Pensé pour être lisible sur le terrain.
// ================================================================
function dessiner3DBlocs(sceneId, opts) {
  // opts = { Ns, N, inclinaisonDeg, kWc, ville:{nom}, typeMontage }
  var wrap = document.getElementById(sceneId + '-3d');
  if (!wrap) return;
  wrap.innerHTML = '';

  var Ns = opts.Ns || 1, N = opts.N || 1;
  var inclinaisonDeg = opts.inclinaisonDeg || 8;

  var W = Math.max(wrap.offsetWidth || 720, 600);
  var H = 480;
  var canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  canvas.style.cssText = 'width:100%;height:' + H + 'px;cursor:grab;border-radius:12px;display:block;background:#fff;border:1.5px solid #cfd8dc;';
  wrap.appendChild(canvas);
  var ctx = canvas.getContext('2d');

  var rotY = 0.55, rotX = -0.28, drag = false, lx = 0, ly = 0;

  canvas.addEventListener('mousedown', function (e) { drag = true; lx = e.clientX; ly = e.clientY; canvas.style.cursor = 'grabbing'; e.preventDefault(); });
  window.addEventListener('mouseup', function () { drag = false; canvas.style.cursor = 'grab'; });
  canvas.addEventListener('mousemove', function (e) {
    if (!drag) return;
    rotY += (e.clientX - lx) * 0.006; rotX += (e.clientY - ly) * 0.006;
    rotX = Math.max(-0.6, Math.min(0.15, rotX));
    lx = e.clientX; ly = e.clientY; draw();
  });
  canvas.addEventListener('touchstart', function (e) { drag = true; lx = e.touches[0].clientX; ly = e.touches[0].clientY; }, { passive: true });
  canvas.addEventListener('touchend', function () { drag = false; });
  canvas.addEventListener('touchmove', function (e) {
    if (!drag) return;
    rotY += (e.touches[0].clientX - lx) * 0.008; rotX += (e.touches[0].clientY - ly) * 0.008;
    rotX = Math.max(-0.6, Math.min(0.15, rotX));
    lx = e.touches[0].clientX; ly = e.touches[0].clientY; draw();
  }, { passive: true });

  function proj(x, y, z) {
    var cy = Math.cos(rotY), sy = Math.sin(rotY), cx = Math.cos(rotX), sx = Math.sin(rotX);
    var rx = x * cy + z * sy, ry = y, rz = -x * sy + z * cy;
    var fy = ry * cx - rz * sx, fz = ry * sx + rz * cx;
    var sc = 480 / (480 + fz + 150);
    return { x: W / 2 + rx * sc * 78, y: H * 0.62 + fy * sc * 78 };
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);

    // Grillage léger au sol (aide à visualiser l'échelle/l'implantation)
    ctx.strokeStyle = '#e3e8ee'; ctx.lineWidth = 1;
    var demiGrille = 8;
    for (var g = -demiGrille; g <= demiGrille; g++) {
      var a = proj(g, 0, -demiGrille), b = proj(g, 0, demiGrille);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      var c = proj(-demiGrille, 0, g), d = proj(demiGrille, 0, g);
      ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.stroke();
    }

    var inc = inclinaisonDeg * Math.PI / 180;
    var ci = Math.cos(inc), si = Math.sin(inc);
    var PW = 1.0, PH = 1.6;   // dimensions relatives d'un panneau (portrait)
    var espacement = 0.08;

    var largeurBloc = Ns * (PW + espacement) - espacement;
    var profondeurBloc = N * (PH * ci + espacement * 2);
    var startX = -largeurBloc / 2;
    var startZ = -profondeurBloc / 2;

    // Ombre au sol du bloc complet
    var ombreCoins = [
      proj(startX - 0.15, 0.001, startZ - 0.15),
      proj(startX + largeurBloc + 0.15, 0.001, startZ - 0.15),
      proj(startX + largeurBloc + 0.15, 0.001, startZ + profondeurBloc + 0.15),
      proj(startX - 0.15, 0.001, startZ + profondeurBloc + 0.15)
    ];
    ctx.fillStyle = 'rgba(20,30,40,0.10)';
    ctx.beginPath(); ctx.moveTo(ombreCoins[0].x, ombreCoins[0].y);
    ombreCoins.forEach(function (p) { ctx.lineTo(p.x, p.y); }); ctx.closePath(); ctx.fill();

    // Dessiner chaque panneau du bloc (Ns colonnes x N rangées)
    var couleurPanneau = '#1565c0';       // bleu Pulsar (une des 2-3 couleurs)
    var couleurCadre = '#0d2244';
    for (var row = 0; row < N; row++) {
      for (var col = 0; col < Ns; col++) {
        var x0 = startX + col * (PW + espacement);
        var z0 = startZ + row * (PH * ci + espacement * 2);

        var q = [
          proj(x0, 0, z0),
          proj(x0 + PW, 0, z0),
          proj(x0 + PW, PH * ci, z0 + PH * si),
          proj(x0, PH * ci, z0 + PH * si)
        ];

        ctx.fillStyle = couleurPanneau;
        ctx.beginPath(); ctx.moveTo(q[0].x, q[0].y);
        q.forEach(function (p) { ctx.lineTo(p.x, p.y); }); ctx.closePath(); ctx.fill();

        // Quadrillage de cellules PV sur chaque panneau (repère visuel simple)
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
        for (var cell = 1; cell < 4; cell++) {
          var t = cell / 4;
          var pa = { x: q[0].x + (q[1].x - q[0].x) * t, y: q[0].y + (q[1].y - q[0].y) * t };
          var pb = { x: q[3].x + (q[2].x - q[3].x) * t, y: q[3].y + (q[2].y - q[3].y) * t };
          ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
        }

        ctx.strokeStyle = couleurCadre; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(q[0].x, q[0].y);
        q.forEach(function (p) { ctx.lineTo(p.x, p.y); }); ctx.closePath(); ctx.stroke();
      }
    }

    // Supports/pieds du bloc (2 points d'ancrage)
    [0.2, 0.8].forEach(function (frac) {
      var px = startX + largeurBloc * frac;
      var top = proj(px, 0, startZ - 0.05), gnd = proj(px, -0.9, startZ - 0.02);
      ctx.strokeStyle = '#90a4ae'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(gnd.x, gnd.y); ctx.stroke();
    });

    // Cote d'inclinaison
    var baseA = proj(startX, 0, startZ), baseB = proj(startX, -0.5, startZ);
    ctx.setLineDash([3, 3]); ctx.strokeStyle = '#e65100'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(baseA.x, baseA.y); ctx.lineTo(baseB.x, baseB.y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#e65100'; ctx.font = 'bold 12px Arial';
    ctx.fillText(inclinaisonDeg + '°', baseB.x - 24, baseB.y + 14);

    // Légende (coin, 2-3 couleurs + texte)
    var legX = 14, legY = 14, legW = 220, legH = 112;
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#cfd8dc'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.roundRect(legX, legY, legW, legH, 8); ctx.fill(); ctx.stroke();

    ctx.fillStyle = couleurPanneau; ctx.fillRect(legX + 12, legY + 14, 14, 10);
    ctx.fillStyle = '#0d2244'; ctx.font = 'bold 11px Arial';
    ctx.fillText('Panneaux solaires', legX + 32, legY + 23);

    ctx.fillStyle = '#37474f'; ctx.font = '11.5px Arial';
    ctx.fillText('🔗 Montage : ' + Ns + ' en série × ' + N + ' en parallèle', legX + 12, legY + 44);
    ctx.fillText('📐 Inclinaison : ' + inclinaisonDeg + '°', legX + 12, legY + 60);
    ctx.fillText('⚡ Puissance : ' + (opts.kWc || '') + ' kWc', legX + 12, legY + 76);
    ctx.fillStyle = '#78909c'; ctx.font = '10px Arial';
    ctx.fillText('📍 ' + ((opts.ville || {}).nom || ''), legX + 12, legY + 92);
    ctx.fillText('Glisser pour tourner', legX + 12, legY + 106);

    // Bandeau info bas (discret, pas criard)
    ctx.fillStyle = '#f4f7fb'; ctx.strokeStyle = '#cfd8dc';
    ctx.beginPath(); ctx.roundRect(14, H - 34, W - 28, 24, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#37474f'; ctx.font = '11px Arial'; ctx.textAlign = 'center';
    ctx.fillText('Plan d\'implantation — ' + (Ns * N) + ' panneau' + (Ns * N > 1 ? 'x' : '') + ' groupés en bloc' + (N > 1 ? 's' : '') + ' de ' + Ns, W / 2, H - 18);
    ctx.textAlign = 'left';
  }

  draw();
}

function capturerScene3D(sceneId) {
  var wrap = document.getElementById(sceneId + '-3d');
  if (!wrap) return null;
  var canvas = wrap.querySelector('canvas');
  if (!canvas) return null;
  try { return canvas.toDataURL('image/png'); } catch (e) { return null; }
}
