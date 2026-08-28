// ================================================================
//  PULSAR ECO GROUP — SCÈNE 3D PRO (v9)
//  Amélioration BONUS demandée : indications précises et professionnelles
//  (nombre de séries x parallèles, inclinaison, azimut, ville, HSP, kWc)
// ================================================================
function dessiner3DPro(sceneId, opts) {
  // opts = { nbPanneaux, Ns, N, inclinaisonDeg, ville:{nom,hsp,lat}, kWc }
  var wrap = document.getElementById(sceneId + '-3d');
  if (!wrap) return;
  wrap.innerHTML = '';

  var nbPanneaux = opts.nbPanneaux || 1;
  var inclinaisonDeg = opts.inclinaisonDeg || 8;
  var imgSrc = nbPanneaux <= 1 ? 'images/p1.png' :
               nbPanneaux <= 2 ? 'images/p2.png' :
               nbPanneaux <= 3 ? 'images/p3.png' :
               nbPanneaux <= 4 ? 'images/p4.png' : 'images/p5plus.png';

  var W = Math.max(wrap.offsetWidth || 720, 600);
  var H = 540;

  var canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  canvas.style.cssText = 'width:100%;height:' + H + 'px;cursor:grab;border-radius:12px;display:block;';
  wrap.appendChild(canvas);
  var ctx = canvas.getContext('2d');

  var panImg = new Image();
  panImg.onload = function () { draw(); startAuto(); };
  panImg.onerror = function () { draw(); startAuto(); };
  panImg.src = imgSrc;

  var rotX = -0.20, rotY = 0.38, drag = false, lx = 0, ly = 0;

  canvas.addEventListener('mousedown', function (e) { drag = true; lx = e.clientX; ly = e.clientY; canvas.style.cursor = 'grabbing'; e.preventDefault(); });
  window.addEventListener('mouseup', function () { drag = false; canvas.style.cursor = 'grab'; });
  canvas.addEventListener('mousemove', function (e) {
    if (!drag) return;
    rotY += (e.clientX - lx) * 0.006; rotX += (e.clientY - ly) * 0.006;
    rotX = Math.max(-0.7, Math.min(0.3, rotX));
    lx = e.clientX; ly = e.clientY; draw();
  });
  canvas.addEventListener('touchstart', function (e) { drag = true; lx = e.touches[0].clientX; ly = e.touches[0].clientY; }, { passive: true });
  canvas.addEventListener('touchend', function () { drag = false; });
  canvas.addEventListener('touchmove', function (e) {
    if (!drag) return;
    rotY += (e.touches[0].clientX - lx) * 0.008; rotX += (e.touches[0].clientY - ly) * 0.008;
    rotX = Math.max(-0.7, Math.min(0.3, rotX));
    lx = e.touches[0].clientX; ly = e.touches[0].clientY; draw();
  }, { passive: true });

  function proj(x, y, z) {
    var cy = Math.cos(rotY), sy = Math.sin(rotY), cx = Math.cos(rotX), sx = Math.sin(rotX);
    var rx = x * cy + z * sy, ry = y, rz = -x * sy + z * cy;
    var fy = ry * cx - rz * sx, fz = ry * sx + rz * cx;
    var sc = 420 / (420 + fz + 150);
    return { x: W / 2 + rx * sc * 160, y: H * 0.5 + fy * sc *160 };
  }

  function applyTexture(img, p0, p1, p2, p3) {
    if (!img || !img.complete || !img.naturalWidth) return;
    var IW = img.naturalWidth, IH = img.naturalHeight;
    function tri(sx0, sy0, sx1, sy1, sx2, sy2, dx0, dy0, dx1, dy1, dx2, dy2) {
      ctx.save();
      ctx.beginPath(); ctx.moveTo(dx0, dy0); ctx.lineTo(dx1, dy1); ctx.lineTo(dx2, dy2);
      ctx.closePath(); ctx.clip();
      var d = 1 / ((sx1 - sx0) * (sy2 - sy0) - (sx2 - sx0) * (sy1 - sy0));
      var a = ((dx1 - dx0) * (sy2 - sy0) - (dx2 - dx0) * (sy1 - sy0)) * d;
      var b = ((dx2 - dx0) * (sx1 - sx0) - (dx1 - dx0) * (sx2 - sx0)) * d;
      var c2 = ((dy1 - dy0) * (sy2 - sy0) - (dy2 - dy0) * (sy1 - sy0)) * d;
      var dd = ((dy2 - dy0) * (sx1 - sx0) - (dy1 - dy0) * (sx2 - sx0)) * d;
      var e = dx0 - a * sx0 - b * sy0, f = dy0 - c2 * sx0 - dd * sy0;
      ctx.transform(a, c2, b, dd, e, f); ctx.drawImage(img, 0, 0); ctx.restore();
    }
    tri(0, IH, IW, IH, IW, 0, p0.x, p0.y, p1.x, p1.y, p2.x, p2.y);
    tri(0, IH, IW, 0, 0, 0, p0.x, p0.y, p2.x, p2.y, p3.x, p3.y);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    var sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#0d1b3e'); sky.addColorStop(0.6, '#1565c0'); sky.addColorStop(1, '#1b5e20');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

    var sp = proj(2.5, 3.5, 3);
    var sg = ctx.createRadialGradient(sp.x, sp.y, 2, sp.x, sp.y, 50);
    sg.addColorStop(0, 'rgba(255,245,80,1)'); sg.addColorStop(.4, 'rgba(255,200,30,.8)'); sg.addColorStop(1, 'rgba(255,130,0,0)');
    ctx.beginPath(); ctx.arc(sp.x, sp.y, 50, 0, Math.PI * 2); ctx.fillStyle = sg; ctx.fill();

    var inc = inclinaisonDeg * Math.PI / 180;
    var imgRatio = (panImg.complete && panImg.naturalWidth) ? panImg.naturalHeight / panImg.naturalWidth : 0.75;
    var PW = 3.2, PH = PW * imgRatio;
    var ci = Math.cos(inc), si = Math.sin(inc);
    var ox = -PW / 2, oz = -0.3;

    var q = [
      proj(ox, 0, oz),
      proj(ox + PW, 0, oz),
      proj(ox + PW, PH * ci, oz + PH * si),
      proj(ox, PH * ci, oz + PH * si)
    ];

    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(W / 2, H * 0.70, 120, 18, 0, 0, Math.PI * 2); ctx.fill();

    applyTexture(panImg, q[0], q[1], q[2], q[3]);

    ctx.beginPath(); ctx.moveTo(q[0].x, q[0].y);
    q.forEach(function (p) { ctx.lineTo(p.x, p.y); }); ctx.closePath();
    ctx.strokeStyle = 'rgba(220,225,230,0.9)'; ctx.lineWidth = 2.5; ctx.stroke();

    // Cote d'inclinaison (indication précise demandée en BONUS)
    var baseA = proj(ox, 0, oz), baseB = proj(ox, -0.55, oz);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(255,238,88,0.85)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(baseA.x, baseA.y); ctx.lineTo(baseB.x, baseB.y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffee58'; ctx.font = 'bold 11px Arial';
    ctx.fillText(inclinaisonDeg + '°', baseB.x - 26, baseB.y + 4);

    var pts = [[ox + PW * 0.25, oz + 0.05], [ox + PW * 0.75, oz + 0.05]];
    pts.forEach(function (pt) {
      var top = proj(pt[0], 0, pt[1]), gnd = proj(pt[0], -1.2, pt[1] + 0.06);
      ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(gnd.x, gnd.y);
      ctx.strokeStyle = 'rgba(160,165,170,0.85)'; ctx.lineWidth = 5; ctx.stroke();
      var gl = proj(pt[0] - 0.2, -1.2, pt[1]), gr = proj(pt[0] + 0.2, -1.2, pt[1]);
      ctx.beginPath(); ctx.moveTo(gl.x, gl.y); ctx.lineTo(gr.x, gr.y);
      ctx.strokeStyle = 'rgba(130,135,140,0.8)'; ctx.lineWidth = 6; ctx.stroke();
    });

    // Légende technique complète (BONUS : indications précises)
    var nomV = (opts.ville || {}).nom || 'Lomé';
    var hsp = (opts.ville || {}).hsp || 5.2;
    var lat = (opts.ville || {}).lat;
    var legX = W - 232, legY = 12;
    ctx.fillStyle = 'rgba(10,25,60,0.85)'; ctx.strokeStyle = 'rgba(79,195,247,0.8)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(legX, legY, 218, 128, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e3f2fd'; ctx.font = 'bold 12px Arial';
    ctx.fillText('📐 Inclinaison : ' + inclinaisonDeg + '°', legX + 10, legY + 18);
    ctx.font = '11px Arial'; ctx.fillStyle = '#ffee58';
    ctx.fillText('🧭 ' + ((lat === undefined || lat >= 0) ? 'Azimut Sud (180°)' : 'Azimut Nord (0°)'), legX + 10, legY + 35);
    ctx.fillStyle = '#80deea';
    ctx.fillText('☀️ HSP : ' + hsp + ' h/jour · ' + nomV, legX + 10, legY + 52);
    ctx.fillStyle = '#a5d6a7';
    ctx.fillText('🟦 ' + nbPanneaux + ' panneau' + (nbPanneaux > 1 ? 'x' : '') + ' solaire' + (nbPanneaux > 1 ? 's' : ''), legX + 10, legY + 69);
    ctx.fillStyle = '#ffcc80';
    ctx.fillText('🔗 Montage : ' + (opts.Ns || nbPanneaux) + ' en série × ' + (opts.N || 1) + ' en parallèle', legX + 10, legY + 86);
    ctx.fillStyle = '#f8bbd0';
    ctx.fillText('⚡ Puissance installée : ' + (opts.kWc || '') + ' kWc', legX + 10, legY + 103);
    ctx.fillStyle = 'rgba(200,200,200,0.6)'; ctx.font = '9.5px Arial';
    ctx.fillText('Glisser = tourner · Touch OK', legX + 10, legY + 120);

    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.strokeStyle = 'rgba(255,238,88,0.5)';
    ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(8, H - 42, W - 16, 34, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffee58'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
    ctx.fillText('☀️ Orientation plein sud/nord recommandée à ' + inclinaisonDeg + '° pour maximiser la production à ' + nomV + '.', W / 2, H - 21);
    ctx.textAlign = 'left';
  }

  function startAuto() {
    var a = 80;
    function f() { if (a > 0 && !drag) { rotY += 0.005; draw(); a--; requestAnimationFrame(f); } } f();
  }
  if (panImg.complete) { draw(); startAuto(); }
}

// Retourne un dataURL PNG de la scène (pour insertion dans le PDF)
function capturerScene3D(sceneId) {
  var wrap = document.getElementById(sceneId + '-3d');
  if (!wrap) return null;
  var canvas = wrap.querySelector('canvas');
  if (!canvas) return null;
  try { return canvas.toDataURL('image/png'); } catch (e) { return null; }
}

// ===== Styles du rapport IA (repris et étendus de v8) =====
(function () {
  var s = document.createElement('style');
  s.textContent = `
    .ia-container{margin-top:22px;font-family:'Segoe UI',Arial,sans-serif;}
    .ia-header{background:linear-gradient(135deg,#0a192f,#1a3a5c 60%,#1b5e20);color:#fff;padding:18px 22px;border-radius:12px 12px 0 0;display:flex;align-items:center;gap:14px;}
    .ia-header h2{margin:0 0 3px;font-size:.98rem;font-weight:700;}
    .ia-subtitle{font-size:.72rem;color:rgba(255,255,255,.6);}
    .ia-logo{font-size:2.2rem;}
    .ia-bloc{background:#f8faff;border-left:4px solid #1565c0;padding:18px 22px;margin-bottom:9px;border-radius:0 8px 8px 0;box-shadow:0 2px 8px rgba(0,0,0,.07);}
    .ia-bloc h3{margin:0 0 12px;font-size:.94rem;font-weight:700;padding-bottom:7px;border-bottom:1px solid #d0dcf5;color:#0d2244;}
    .ia-contenu{color:#1a2a1a;line-height:1.85;font-size:.9rem;}
    .ia-calcul{background:#eef3ff;border-left-color:#1976d2;} .ia-calcul h3{color:#1565c0;}
    .ia-decision{background:#e8f5e9;border-left-color:#2e7d32;} .ia-decision h3{color:#1b5e20;}
    .ia-cablage{background:#fff8e1;border-left-color:#f57f17;} .ia-cablage h3{color:#e65100;}
    .ia-motivant{background:linear-gradient(135deg,#e8f5e9,#fffde7);border-left-color:#f9a825;padding:22px;} .ia-motivant h3{color:#e65100;}
    .ia-3d-bloc{background:#0d1b3e;border-left:4px solid #4fc3f7;padding:18px;} .ia-3d-bloc h3{color:#4fc3f7;border-bottom:1px solid rgba(79,195,247,.2);padding-bottom:7px;margin-bottom:10px;}
    .scene3d-wrap{width:100%;border-radius:10px;overflow:hidden;min-height:540px;}
    .ia-loading{background:#e3f2fd;border:2px dashed #1976d2;padding:22px;border-radius:10px;text-align:center;color:#1565c0;font-size:1rem;animation:pls 1.4s ease-in-out infinite;}
    @keyframes pls{0%,100%{opacity:1}50%{opacity:.4}}
  `;
  document.head.appendChild(s);
})();
