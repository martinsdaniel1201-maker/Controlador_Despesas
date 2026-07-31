// ═══════════════════════════════════════════════════════════
// RESUMO DO MÊS — CARTÃO PARA COMPARTILHAR
// ═══════════════════════════════════════════════════════════
// Desenha um cartão vertical (estilo "wrapped") com os números do
// mês em exibição, usando só Canvas 2D nativo (sem libs). Oferece
// Web Share API quando disponível, com download como alternativa.
// ═══════════════════════════════════════════════════════════
const MONTH_SHARE_NAMES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function buildMonthShareCanvas() {
  const W = 720, H = 1280;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // ── fundo em degradê índigo/violeta ──
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#312e81');
  bg.addColorStop(0.5, '#4338ca');
  bg.addColorStop(1, '#7c3aed');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // brilhos decorativos
  const glow1 = ctx.createRadialGradient(W * 0.85, 120, 10, W * 0.85, 120, 260);
  glow1.addColorStop(0, 'rgba(255,255,255,0.20)');
  glow1.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, W, H);
  const glow2 = ctx.createRadialGradient(W * 0.1, H * 0.9, 10, W * 0.1, H * 0.9, 300);
  glow2.addColorStop(0, 'rgba(255,255,255,0.12)');
  glow2.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);

  // ── dados do mês em exibição ──
  const t = getMonthTotals(currentYear, currentMonth);
  let prevY = currentYear, prevM = currentMonth - 1;
  if (prevM < 0) { prevM = 11; prevY--; }
  const prevT = getMonthTotals(prevY, prevM);

  let salario = 0;
  try { salario = parseBRL(localStorage.getItem('sim_salario') || ''); } catch (e) {}
  const saldo = salario > 0 ? (salario - t.total) : null;

  const catEntries = Object.entries(t.byCat).sort((a, b) => b[1] - a[1]);
  const topCat = catEntries[0] ? (CATEGORIES.find(c => c.id === catEntries[0][0]) || CATEGORIES[9]) : null;
  const topCatVal = catEntries[0] ? catEntries[0][1] : 0;

  let deltaTxt = '';
  if (prevT.total > 0) {
    const pct = Math.round(((t.total - prevT.total) / prevT.total) * 100);
    deltaTxt = pct === 0 ? 'igual ao mês passado' : (pct > 0 ? `${pct}% a mais que o mês passado` : `${Math.abs(pct)}% a menos que o mês passado`);
  }

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#fff';

  // marca
  ctx.font = '700 26px Nunito, sans-serif';
  ctx.globalAlpha = 0.85;
  ctx.fillText('💰 MEU BOLSO', 56, 90);
  ctx.globalAlpha = 1;

  // título do mês
  ctx.font = '900 56px Nunito, sans-serif';
  ctx.fillText(`${MONTH_SHARE_NAMES[currentMonth]}`, 56, 170);
  ctx.font = '700 30px Nunito, sans-serif';
  ctx.globalAlpha = 0.8;
  ctx.fillText(`${currentYear}`, 56, 210);
  ctx.globalAlpha = 1;

  // cartão central — total gasto
  drawRoundedRect(ctx, 56, 280, W - 112, 210, 28);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fill();
  ctx.font = '800 24px Nunito, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('TOTAL DE DESPESAS', 90, 340);
  ctx.font = '900 68px Nunito, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText(formatBRL(t.total), 90, 420);
  if (deltaTxt) {
    ctx.font = '700 24px Nunito, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(deltaTxt, 90, 460);
  }

  // saldo
  let y = 560;
  if (saldo !== null) {
    ctx.font = '800 22px Nunito, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('SALDO DO MÊS', 56, y);
    ctx.font = '900 44px Nunito, sans-serif';
    ctx.fillStyle = saldo >= 0 ? '#bbf7d0' : '#fecaca';
    ctx.fillText(formatBRL(saldo), 56, y + 55);
    y += 130;
  }

  // maior categoria
  if (topCat) {
    ctx.font = '800 22px Nunito, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('MAIOR CATEGORIA', 56, y);
    ctx.font = '900 38px Nunito, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(`${topCat.emoji} ${topCat.label} — ${formatBRL(topCatVal)}`, 56, y + 50);
    y += 120;
  }

  // rodapé
  ctx.font = '700 20px Nunito, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('Controle financeiro pessoal', 56, H - 56);

  return canvas;
}

async function shareMonthCard() {
  let canvas;
  try {
    canvas = buildMonthShareCanvas();
  } catch (e) {
    showToast('Não foi possível gerar o resumo agora');
    return;
  }

  canvas.toBlob(async (blob) => {
    if (!blob) { showToast('Não foi possível gerar a imagem'); return; }
    const fileName = `resumo-${MONTH_SHARE_NAMES[currentMonth]}-${currentYear}.png`;
    const file = new File([blob], fileName, { type: 'image/png' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Resumo do mês', text: 'Meu resumo financeiro do mês 💰' });
        return;
      } catch (e) {
        // usuário cancelou o share ou falhou — cai para o download abaixo
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    showToast('🖼 Resumo salvo — confira nos seus downloads');
  }, 'image/png');
}

// ═══════════════════════════════════════════════════════════
