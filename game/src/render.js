// Dapur Kilat — canvas renderer: the kitchen, the order board, the plate, the HUD.
// Everything is drawn from world.state, so a screenshot of any state is a real
// frame of the game. Logical size is FIELD (1280x720); main.js scales the canvas.
import { FIELD, FONT, INGREDIENTS, LAYOUT, PALETTE, STATIONS } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, findMatchingOrder } from './world.js';

function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'left', weight = '700') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

function emoji(ctx, str, x, y, size) {
  ctx.font = `${size}px "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function bar(ctx, x, y, w, h, frac, color, bg = 'rgba(0,0,0,0.25)') {
  ctx.fillStyle = bg;
  rr(ctx, x, y, w, h, h / 2);
  ctx.fill();
  const f = Math.max(0, Math.min(1, frac));
  if (f > 0) {
    ctx.fillStyle = color;
    rr(ctx, x, y, Math.max(h, w * f), h, h / 2);
    ctx.fill();
  }
}

function panel(ctx, x, y, w, h, fill = PALETTE.panel, edge = PALETTE.panelEdge) {
  ctx.fillStyle = edge;
  rr(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.fillStyle = fill;
  rr(ctx, x + 2, y + 2, w - 4, h - 4, 10);
  ctx.fill();
}

function drawBackground(ctx, s) {
  ctx.fillStyle = PALETTE.wall;
  ctx.fillRect(0, 0, FIELD.width, 520);
  // Tile lines on the wall.
  ctx.strokeStyle = PALETTE.wallTrim;
  ctx.lineWidth = 2;
  for (let x = 0; x <= FIELD.width; x += 80) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 520); ctx.stroke();
  }
  for (let y = 0; y <= 520; y += 80) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(FIELD.width, y); ctx.stroke();
  }
  // Warm window with a sunrise, so the kitchen feels alive.
  ctx.fillStyle = '#ffe9a8';
  rr(ctx, 1080, 200, 160, 110, 10);
  ctx.fill();
  ctx.fillStyle = '#ffb347';
  ctx.beginPath(); ctx.arc(1160, 285, 26, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff3d6';
  ctx.beginPath(); ctx.arc(1120, 235, 14, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(1145, 228, 18, 0, Math.PI * 2); ctx.fill();
  // Floor.
  ctx.fillStyle = PALETTE.floor;
  ctx.fillRect(0, 520, FIELD.width, 200);
  ctx.strokeStyle = PALETTE.floorLine;
  ctx.lineWidth = 2;
  for (let y = 560; y < 720; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(FIELD.width, y); ctx.stroke();
  }
  for (let x = 0; x <= FIELD.width; x += 90) {
    ctx.beginPath(); ctx.moveTo(x, 520); ctx.lineTo(x - 20, 720); ctx.stroke();
  }
  void s;
}

function drawHud(ctx, s, sound) {
  const hud = LAYOUT.hud;
  ctx.fillStyle = PALETTE.hud;
  ctx.fillRect(hud.x, hud.y, hud.w, hud.h);
  text(ctx, '🍳 DAPUR KILAT', 16, 42, 28, PALETTE.hudText);
  text(ctx, `Skor ${s.score}`, 250, 42, 22, PALETTE.gold);
  text(ctx, `🪙 ${s.coins}`, 400, 42, 22, PALETTE.hudText);
  text(ctx, s.combo > 1 ? `🔥 Kombo x${s.combo}` : 'Kombo —', 520, 42, 22, s.combo > 1 ? '#ff9a3c' : PALETTE.hudText);
  text(ctx, `Level ${s.level}`, 700, 42, 22, PALETTE.hudText);
  // Shift timer: a bar plus mm:ss, red under 30 seconds.
  const mins = Math.floor(s.shiftLeft / 60);
  const secs = Math.floor(s.shiftLeft % 60);
  const low = s.shiftLeft <= 30;
  bar(ctx, 800, 20, 180, 24, s.shiftLeft / s.shiftSeconds, low ? PALETTE.bad : PALETTE.good);
  text(ctx, `⏱ ${mins}:${String(secs).padStart(2, '0')}`, 890, 42, 20, low ? '#ff6b6b' : PALETTE.hudText, 'center');
  // Lives.
  let hearts = '';
  for (let i = 0; i < 3; i += 1) hearts += i < s.lives ? '❤️' : '🖤';
  emoji(ctx, hearts, 1060, 34, 22);
  // Mute button.
  const m = LAYOUT.muteButton;
  ctx.fillStyle = '#4a3a28';
  rr(ctx, m.x, m.y, m.w, m.h, 8);
  ctx.fill();
  emoji(ctx, sound.muted ? '🔇' : '🔊', m.x + m.w / 2, m.y + m.h / 2 + 1, 22);
}

function drawOrderCard(ctx, card, order, s) {
  panel(ctx, card.x, card.y, card.w, card.h);
  if (!order) {
    text(ctx, 'Menunggu pelanggan…', card.x + 20, card.y + 52, 18, PALETTE.muted, 'left', '600');
    return;
  }
  const impatience = 1 - order.patience / order.maxPatience;
  const face = order.patience < 12 ? '😠' : order.patience < 25 ? '😐' : order.customer;
  emoji(ctx, face, card.x + 34, card.y + 34, 40);
  text(ctx, `${order.recipe.emoji} ${order.recipe.name}`, card.x + 66, card.y + 30, 20, PALETTE.cardText);
  // Recipe chips: a green ring marks each ingredient already on the plate.
  let cx = card.x + 66;
  for (const item of order.recipe.items) {
    const def = INGREDIENTS[item];
    const onPlate = s.plate.filter((p) => p === item).length;
    const wanted = order.recipe.items.filter((p) => p === item).length;
    ctx.fillStyle = onPlate >= wanted ? '#d9f2e2' : '#f3e2c2';
    ctx.beginPath(); ctx.arc(cx + 16, card.y + 58, 17, 0, Math.PI * 2); ctx.fill();
    if (onPlate >= wanted) {
      ctx.strokeStyle = PALETTE.good;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx + 16, card.y + 58, 17, 0, Math.PI * 2); ctx.stroke();
    }
    emoji(ctx, def.emoji, cx + 16, card.y + 59, 22);
    cx += 38;
  }
  text(ctx, `🪙 ${order.recipe.reward}`, card.x + card.w - 16, card.y + 30, 18, '#8a6d1f', 'right');
  bar(ctx, card.x + 66, card.y + 76, card.w - 82, 8,
    order.patience / order.maxPatience,
    impatience > 0.66 ? PALETTE.bad : impatience > 0.33 ? PALETTE.warn : PALETTE.good);
}

function drawOrders(ctx, s) {
  text(ctx, '📋 PAPAN PESANAN', LAYOUT.ordersLabel.x, LAYOUT.ordersLabel.y + 16, 18, PALETTE.text);
  LAYOUT.orderCards.forEach((card, i) => drawOrderCard(ctx, card, s.orders[i] || null, s));
}

function drawBins(ctx, s, mouse) {
  text(ctx, '🧺 BAHAN — klik untuk ambil (1–9)', LAYOUT.binsLabel.x, LAYOUT.binsLabel.y + 16, 17, PALETTE.text);
  for (const bin of LAYOUT.bins) {
    const def = INGREDIENTS[bin.id];
    const hover = mouse && mouse.x >= bin.x && mouse.x <= bin.x + bin.w && mouse.y >= bin.y && mouse.y <= bin.y + bin.h;
    const held = s.hand && s.hand.item === bin.id;
    ctx.fillStyle = hover && !s.hand ? '#ffe9b8' : PALETTE.panel;
    ctx.strokeStyle = held ? PALETTE.good : PALETTE.panelEdge;
    ctx.lineWidth = held ? 4 : 2;
    rr(ctx, bin.x, bin.y, bin.w, bin.h, 10);
    ctx.fill();
    ctx.stroke();
    emoji(ctx, def.emoji, bin.x + bin.w / 2, bin.y + 30, 34);
    text(ctx, def.name, bin.x + bin.w / 2, bin.y + 62, 14, PALETTE.text, 'center', '600');
    const hotkey = LAYOUT.bins.indexOf(bin) + 1;
    text(ctx, String(hotkey), bin.x + 10, bin.y + 18, 12, PALETTE.muted, 'left', '600');
    if (def.prep) {
      const station = STATIONS[def.prep];
      text(ctx, station.emoji, bin.x + bin.w - 12, bin.y + 18, 13, PALETTE.muted, 'right', '600');
    }
  }
}

function drawSlot(ctx, rect, slot, kind) {
  const station = STATIONS[kind];
  ctx.fillStyle = '#241f1a';
  rr(ctx, rect.x, rect.y, rect.w, rect.h, 10);
  ctx.fill();
  ctx.strokeStyle = station.accent;
  ctx.lineWidth = 2;
  rr(ctx, rect.x, rect.y, rect.w, rect.h, 10);
  ctx.stroke();
  if (!slot) {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = `600 13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('kosong', rect.x + rect.w / 2, rect.y + rect.h / 2 + 5);
    return;
  }
  const def = INGREDIENTS[slot.item];
  if (slot.state === 'burnt') {
    emoji(ctx, '💨', rect.x + rect.w / 2, rect.y + 34, 26);
    emoji(ctx, '🍖', rect.x + rect.w / 2, rect.y + 62, 30);
    ctx.fillStyle = '#1a1a1a';
    ctx.globalAlpha = 0.45;
    rr(ctx, rect.x + 6, rect.y + 6, rect.w - 12, rect.h - 12, 8);
    ctx.fill();
    ctx.globalAlpha = 1;
    text(ctx, 'HANGUS!', rect.x + rect.w / 2, rect.y + rect.h - 10, 13, '#ff8a80', 'center');
    return;
  }
  emoji(ctx, def.emoji, rect.x + rect.w / 2, rect.y + 44, 40);
  if (slot.state === 'cooking') {
    const total = def.time;
    const left = Math.max(0, total * (1 - slot.progress));
    bar(ctx, rect.x + 10, rect.y + rect.h - 26, rect.w - 20, 10, slot.progress, station.accent);
    text(ctx, `${Math.ceil(left)} dtk`, rect.x + rect.w / 2, rect.y + rect.h - 34, 13, '#fff', 'center', '600');
    if (kind === 'grill') {
      emoji(ctx, '🔥', rect.x + rect.w / 2, rect.y + 72, 14);
    }
  } else {
    const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 180);
    ctx.fillStyle = `rgba(46,158,91,${0.25 + 0.35 * pulse})`;
    rr(ctx, rect.x + 4, rect.y + 4, rect.w - 8, rect.h - 8, 8);
    ctx.fill();
    text(ctx, 'SIAP! ✓', rect.x + rect.w / 2, rect.y + rect.h - 12, 14, '#7be495', 'center');
  }
}

function drawStations(ctx, s) {
  text(ctx, '🔥 STASIUN MASAK — klik lagi kalau sudah siap', LAYOUT.stationsLabel.x, LAYOUT.stationsLabel.y + 16, 17, PALETTE.text);
  for (const panelDef of LAYOUT.stations) {
    const station = STATIONS[panelDef.kind];
    panel(ctx, panelDef.x, panelDef.y, panelDef.w, panelDef.h);
    text(ctx, `${station.emoji} ${station.name}`, panelDef.x + panelDef.w / 2, panelDef.y + 30, 17, PALETTE.text, 'center');
    panelDef.slots.forEach((rect, i) => drawSlot(ctx, rect, s.stations[panelDef.kind][i], panelDef.kind));
  }
}

function drawPlateArea(ctx, s, mouse) {
  text(ctx, '🍽️ PIRING — rakit di sini', LAYOUT.plateLabel.x, LAYOUT.plateLabel.y + 16, 17, PALETTE.text);
  const pp = LAYOUT.platePanel;
  panel(ctx, pp.x, pp.y, pp.w, pp.h);
  const plate = LAYOUT.plate;
  const match = findMatchingOrder(s);
  // The plate itself: a white ellipse with a rim.
  ctx.fillStyle = PALETTE.plateEdge;
  ctx.beginPath();
  ctx.ellipse(plate.x + plate.w / 2, plate.y + plate.h / 2, plate.w / 2, plate.h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.plate;
  ctx.beginPath();
  ctx.ellipse(plate.x + plate.w / 2, plate.y + plate.h / 2, plate.w / 2 - 8, plate.h / 2 - 7, 0, 0, Math.PI * 2);
  ctx.fill();
  if (s.plate.length === 0) {
    text(ctx, 'Piring kosong', plate.x + plate.w / 2, plate.y + plate.h / 2 + 6, 16, PALETTE.muted, 'center', '600');
  } else {
    // Stack the ingredients across the plate, biggest in the middle.
    const n = s.plate.length;
    s.plate.forEach((item, i) => {
      const x = plate.x + 34 + (i * (plate.w - 68)) / Math.max(1, n - 1 || 1);
      const y = plate.y + plate.h / 2 + (i % 2 === 0 ? -12 : 10);
      emoji(ctx, INGREDIENTS[item].emoji, x, y, 40);
    });
    if (match) {
      text(ctx, `✓ ${match.recipe.name} siap!`, plate.x + plate.w / 2, plate.y + plate.h - 2, 14, PALETTE.good, 'center');
    }
  }
  // Serve bell: glows gold while a matching dish sits on the plate.
  const serve = LAYOUT.serveButton;
  const glow = match ? 0.75 + 0.25 * Math.sin(Date.now() / 160) : 0;
  ctx.fillStyle = match ? `rgba(242,201,76,${glow})` : '#e8dcc2';
  rr(ctx, serve.x - 4, serve.y - 4, serve.w + 8, serve.h + 8, 12);
  ctx.fill();
  ctx.fillStyle = match ? '#2e9e5b' : '#a08c6a';
  rr(ctx, serve.x, serve.y, serve.w, serve.h, 10);
  ctx.fill();
  text(ctx, '🔔 SAJIKAN', serve.x + serve.w / 2, serve.y + 29, 18, '#fff', 'center');
  // Trash: empties the plate (or drops what the hand holds).
  const trash = LAYOUT.trashButton;
  ctx.fillStyle = '#8a7a63';
  rr(ctx, trash.x, trash.y, trash.w, trash.h, 10);
  ctx.fill();
  text(ctx, '🗑️ BUANG', trash.x + trash.w / 2, trash.y + 29, 18, '#fff', 'center');
  void mouse;
}

function drawChef(ctx, s) {
  const band = LAYOUT.counterBand;
  // The wooden counter the chef stands behind.
  ctx.fillStyle = PALETTE.counter;
  ctx.fillRect(band.x, band.y + 84, band.w, 44);
  ctx.fillStyle = PALETTE.counterTop;
  ctx.fillRect(band.x, band.y + 80, band.w, 10);
  const x = s.chefX;
  const y = band.y + 84;
  // Body and apron.
  ctx.fillStyle = '#f5f0e6';
  rr(ctx, x - 34, y - 52, 68, 56, 14);
  ctx.fill();
  ctx.fillStyle = '#4fc3f7';
  rr(ctx, x - 22, y - 40, 44, 44, 8);
  ctx.fill();
  // Head and toque.
  ctx.fillStyle = '#ffdbac';
  ctx.beginPath(); ctx.arc(x, y - 66, 22, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(x - 14, y - 84, 12, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x, y - 88, 14, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 14, y - 84, 12, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(x - 20, y - 88, 40, 12);
  // Eyes and smile.
  ctx.fillStyle = '#2b2118';
  ctx.beginPath(); ctx.arc(x - 8, y - 68, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 8, y - 68, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2b2118';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y - 60, 7, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  // What the hand holds, shown on the counter.
  const hand = LAYOUT.handLabel;
  if (s.hand) {
    const def = INGREDIENTS[s.hand.item];
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    rr(ctx, hand.x, hand.y, hand.w, hand.h, 10);
    ctx.fill();
    emoji(ctx, def.emoji, hand.x + 32, hand.y + 30, 34);
    text(ctx, `Di tangan: ${def.name}${s.hand.cooked ? ' (matang ✓)' : ' (mentah)'}`, hand.x + 56, hand.y + 36, 17, '#fff');
  } else {
    text(ctx, 'Tangan kosong — klik bahan di counter.', hand.x + 8, hand.y + 36, 16, '#ffe9b8', 'left', '600');
  }
  // Toasts float above the counter, only while a shift is running: on the
  // title screen they would sit under the title card's buttons.
  if (s.screen === SCREEN_PLAY) {
    const toastBox = LAYOUT.toast;
    s.toasts.forEach((toast, i) => {
    const alpha = Math.min(1, toast.life);
    ctx.globalAlpha = alpha;
    const colors = { good: '#2e9e5b', bad: '#d7263d', info: '#5b4a32' };
    ctx.fillStyle = colors[toast.kind] || colors.info;
    rr(ctx, toastBox.x, toastBox.y + i * 38, toastBox.w, 34, 8);
    ctx.fill();
    text(ctx, toast.text, toastBox.x + toastBox.w / 2, toastBox.y + i * 38 + 22, 15, '#fff', 'center', '600');
    ctx.globalAlpha = 1;
    });
  }
}

function drawHelp(ctx) {
  const h = LAYOUT.helpBar;
  ctx.fillStyle = 'rgba(43,33,24,0.92)';
  ctx.fillRect(h.x, h.y, h.w, h.h);
  text(ctx, 'Klik bahan → masak di stasiun → taruh di piring → 🔔 sajikan sebelum pelanggan kabur!  •  1–9 bahan  •  Spasi sajikan  •  T buang  •  M suara  •  P jeda',
    16, h.y + 40, 15, PALETTE.hudText, 'left', '600');
}

function drawParticles(ctx, s) {
  for (const p of s.particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    if (p.kind === 'steam') {
      ctx.fillStyle = `rgba(255,255,255,${0.5 * alpha})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, 8 + (1 - alpha) * 10, 0, Math.PI * 2); ctx.fill();
    } else if (p.kind === 'coin') {
      ctx.fillStyle = `rgba(242,201,76,${alpha})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.font = `700 9px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('🪙', p.x, p.y + 3);
    }
  }
  for (const f of s.floaters) {
    ctx.globalAlpha = Math.min(1, f.life);
    text(ctx, f.text, f.x, f.y, 22, f.color, 'center');
    ctx.globalAlpha = 1;
  }
}

function drawHandCursor(ctx, s, mouse) {
  if (!s.hand || !mouse) return;
  const def = INGREDIENTS[s.hand.item];
  ctx.globalAlpha = 0.9;
  emoji(ctx, def.emoji, mouse.x, mouse.y - 26, 36);
  ctx.globalAlpha = 1;
}

function drawTitle(ctx, s, best) {
  ctx.fillStyle = 'rgba(43,33,24,0.72)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  panel(ctx, 290, 110, 700, 340, '#fff8e7');
  text(ctx, '🍳 DAPUR KILAT', 640, 190, 56, '#3a2a18', 'center');
  text(ctx, 'Sizzle & Serve — game masak kejar-kejaran pesanan', 640, 230, 22, PALETTE.muted, 'center', '600');
  text(ctx, 'Terima pesanan dari papan, masak bahan di stasiun,', 640, 280, 19, PALETTE.text, 'center', '600');
  text(ctx, 'rakit hidangan di piring, dan sajikan sebelum pelanggan kabur!', 640, 306, 19, PALETTE.text, 'center', '600');
  text(ctx, '🍔 Burger Klasik  •  🍛 Nasi Goreng  •  🍗 Ayam Geprek  •  🍜 Mie Goreng', 640, 350, 18, PALETTE.text, 'center', '600');
  text(ctx, 'Shift 2½ menit  •  3 nyawa  •  Kombo menaikkan koin  •  Awas hangus!', 640, 382, 17, PALETTE.muted, 'center', '600');
  if (best > 0) text(ctx, `Skor terbaik: ${best}`, 640, 412, 18, '#8a6d1f', 'center');
  const b = LAYOUT.startButton;
  ctx.fillStyle = '#2e9e5b';
  rr(ctx, b.x, b.y, b.w, b.h, 14);
  ctx.fill();
  text(ctx, '▶  MULAI MASAK', b.x + b.w / 2, b.y + 42, 26, '#fff', 'center');
  text(ctx, 'atau tekan Enter — klik & keyboard 1–9, Spasi, T, M, P', 640, 566, 15, '#fff3d6', 'center', '600');
}

function drawOver(ctx, s, best) {
  ctx.fillStyle = 'rgba(43,33,24,0.78)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  panel(ctx, 290, 120, 700, 400, '#fff8e7');
  const title = s.overReason === 'lives' ? '😖 Dapur Ditutup!' : '⏰ Shift Selesai!';
  text(ctx, title, 640, 200, 48, '#3a2a18', 'center');
  text(ctx, s.overReason === 'lives'
    ? 'Tiga pelanggan kabur — dapur tutup lebih awal.'
    : 'Waktu shift habis — pelanggan terakhir sudah pulang.', 640, 240, 19, PALETTE.muted, 'center', '600');
  text(ctx, `Skor akhir: ${s.score}  •  Koin: ${s.coins}`, 640, 300, 26, PALETTE.text, 'center');
  text(ctx, `Hidangan tersaji: ${s.served}  •  Kombo terbaik: x${s.bestCombo}  •  Level: ${s.level}`, 640, 340, 20, PALETTE.text, 'center', '600');
  text(ctx, `Hangus: ${s.stats.burnt}  •  Pelanggan kabur: ${s.stats.expired}`, 640, 372, 17, PALETTE.muted, 'center', '600');
  const isBest = s.score >= best && s.score > 0;
  text(ctx, isBest ? '🏆 Skor terbaik baru!' : `Skor terbaik: ${best}`, 640, 410, 20, '#8a6d1f', 'center');
  const b = LAYOUT.restartButton;
  ctx.fillStyle = '#2e9e5b';
  rr(ctx, b.x, b.y, b.w, b.h, 14);
  ctx.fill();
  text(ctx, '↻  MASAK LAGI (R)', b.x + b.w / 2, b.y + 42, 26, '#fff', 'center');
}

/** Draw one frame. mouse is the pointer in logical coordinates, or null. */
export function draw(ctx, world, mouse, sound) {
  const s = world.state;
  ctx.save();
  if (s.shake > 0) {
    const mag = s.shake * 18;
    ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
  }
  drawBackground(ctx, s);
  drawOrders(ctx, s);
  drawBins(ctx, s, mouse);
  drawStations(ctx, s);
  drawPlateArea(ctx, s, mouse);
  drawChef(ctx, s);
  drawHelp(ctx);
  drawParticles(ctx, s);
  drawHud(ctx, s, sound);
  drawHandCursor(ctx, s, mouse);
  if (s.screen === SCREEN_TITLE) drawTitle(ctx, s, world.best || 0);
  if (s.screen === SCREEN_OVER) drawOver(ctx, s, world.best || 0);
  if (s.paused && s.screen === SCREEN_PLAY) {
    ctx.fillStyle = 'rgba(43,33,24,0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text(ctx, '⏸ JEDA — tekan P untuk lanjut', 640, 360, 32, '#fff', 'center');
  }
  ctx.restore();
}

