// ═══════════════════════════════════════════════════════════
// TELA SIMULAÇÕES — UI
// ═══════════════════════════════════════════════════════════
// Consome o motor puro de js/features/simulations.js e monta:
//   1) seletor de cenário (grid de cartões)
//   2) formulário dinâmico por tipo de simulação
//   3) card de resultado (impacto mensal/anual, saldo previsto,
//      tempo de recuperação, gráfico de linha animado)
//   4) comparação entre cenários salvos (cards + gráfico de barras)
// ═══════════════════════════════════════════════════════════

const SIM_FORM_FIELDS = {
  celular: [
    { id: 'valorBem', label: 'Valor do celular (R$)', type: 'money', placeholder: '0,00' },
    { id: 'entrada', label: 'Entrada (R$) — opcional', type: 'money', placeholder: '0,00' },
    { id: 'parcelas', label: 'Parcelas (0 = à vista)', type: 'int', placeholder: 'Ex: 10' },
  ],
  carro: [
    { id: 'valorBem', label: 'Valor do carro (R$)', type: 'money', placeholder: '0,00' },
    { id: 'entrada', label: 'Entrada (R$) — opcional', type: 'money', placeholder: '0,00' },
    { id: 'parcelas', label: 'Parcelas (0 = à vista)', type: 'int', placeholder: 'Ex: 48' },
  ],
  financiamento: [
    { id: 'valorFinanciado', label: 'Valor financiado (R$)', type: 'money', placeholder: '0,00' },
    { id: 'taxaMensal', label: 'Taxa de juros (% ao mês)', type: 'pct', placeholder: 'Ex: 1,5' },
    { id: 'parcelas', label: 'Número de parcelas', type: 'int', placeholder: 'Ex: 48' },
  ],
  poupanca: [
    { id: 'valorMensal', label: 'Valor a guardar por mês (R$)', type: 'money', placeholder: '0,00' },
    { id: 'meses', label: 'Por quantos meses', type: 'int', placeholder: 'Ex: 12' },
    { id: 'rendimentoMensal', label: 'Rendimento (% ao mês) — opcional', type: 'pct', placeholder: 'Ex: 0,5' },
  ],
  dividas: [
    { id: 'valorDivida', label: 'Valor total da dívida (R$)', type: 'money', placeholder: '0,00' },
    { id: 'pagamentoMensal', label: 'Quanto pode pagar por mês (R$)', type: 'money', placeholder: '0,00' },
    { id: 'taxaMensal', label: 'Juros da dívida (% ao mês) — opcional', type: 'pct', placeholder: 'Ex: 2' },
  ],
  aumento: [
    { id: 'novoSalario', label: 'Novo salário mensal (R$)', type: 'money', placeholder: '0,00' },
  ],
  reducaoSalario: [
    { id: 'novoSalario', label: 'Novo salário mensal (R$)', type: 'money', placeholder: '0,00' },
    { id: 'reservaDisponivel', label: 'Reserva de emergência disponível (R$) — opcional', type: 'money', placeholder: '0,00' },
  ],
  perdaEmprego: [
    { id: 'reservaDisponivel', label: 'Reserva de emergência disponível (R$)', type: 'money', placeholder: '0,00' },
    { id: 'rendaAlternativa', label: 'Renda alternativa mensal (R$) — opcional', type: 'money', placeholder: '0,00' },
  ],
  reducaoGastos: [
    { id: 'valorReducao', label: 'Quanto pretende reduzir por mês (R$)', type: 'money', placeholder: '0,00' },
  ],
};

let simSelectedType = null;
let simLastComputed = null; // { type, inputs, result }
let simScenarios = [];      // cenários salvos para comparação

// ── PERSISTÊNCIA (apenas cache local de UI, não é dado financeiro novo) ──
function loadSimScenarios() {
  try {
    const raw = localStorage.getItem('sim_scenarios');
    simScenarios = raw ? JSON.parse(raw) : [];
  } catch (e) { simScenarios = []; }
}
function saveSimScenarios() {
  try { localStorage.setItem('sim_scenarios', JSON.stringify(simScenarios)); } catch (e) {}
}

function initSimulacoesPanel() {
  loadSimScenarios();
  const c = document.getElementById('simContainer');
  if (!c) return;
  c.innerHTML = `
    <div class="sim-intro">
      <h3>O que você quer simular?</h3>
      <p>Escolha um cenário para ver o impacto no seu orçamento — sem precisar decidir nada de verdade.</p>
    </div>
    <div class="sim-picker-grid" id="simPickerGrid"></div>
    <div id="simFormArea"></div>
    <div id="simResultArea"></div>
    <div id="simCompareArea"></div>
  `;
  renderSimPicker();
  renderSimComparison();
  if (simSelectedType) renderSimForm(simSelectedType);
}

function renderSimPicker() {
  const grid = document.getElementById('simPickerGrid');
  if (!grid) return;
  grid.innerHTML = Object.keys(SIM_TYPES).map(key => {
    const t = SIM_TYPES[key];
    return `
      <button type="button" class="sim-type-card ${simSelectedType === key ? 'active' : ''}" data-simtype="${key}" onclick="selectSimType('${key}')">
        <span class="sim-type-icon"><svg class="icon" aria-hidden="true"><use href="#${t.icon}"></use></svg></span>
        <span class="sim-type-label">${t.label}</span>
      </button>
    `;
  }).join('');
}

function selectSimType(key) {
  simSelectedType = key;
  document.querySelectorAll('.sim-type-card').forEach(el => {
    el.classList.toggle('active', el.dataset.simtype === key);
  });
  document.getElementById('simResultArea').innerHTML = '';
  renderSimForm(key);
}

function renderSimForm(key) {
  const area = document.getElementById('simFormArea');
  const fields = SIM_FORM_FIELDS[key];
  const t = SIM_TYPES[key];
  if (!fields || !area) return;

  area.innerHTML = `
    <div class="sim-form-card">
      <h3><svg class="icon icon-sm" aria-hidden="true"><use href="#${t.icon}"></use></svg> ${t.label}</h3>
      ${fields.map(f => `
        <div class="form-group">
          <label class="form-label" for="simIn_${f.id}">${f.label}</label>
          <input type="text" inputmode="decimal" class="form-input" id="simIn_${f.id}"
                 placeholder="${f.placeholder || ''}" autocomplete="off">
        </div>
      `).join('')}
      <button type="button" class="btn-primary sim-calc-btn" onclick="runSimAndShowResult('${key}')">
        <svg class="icon icon-sm" aria-hidden="true"><use href="#i-bar-chart"></use></svg> Calcular simulação
      </button>
    </div>
  `;

  fields.forEach(f => {
    const el = document.getElementById('simIn_' + f.id);
    if (f.type === 'money') aplicarMascaraDinheiro(el);
  });
}

function readSimInputs(key) {
  const fields = SIM_FORM_FIELDS[key];
  const inputs = {};
  fields.forEach(f => {
    const el = document.getElementById('simIn_' + f.id);
    const raw = el ? el.value : '';
    if (f.type === 'money') inputs[f.id] = parseBRL(raw);
    else if (f.type === 'pct') inputs[f.id] = parseFloat(String(raw).replace(',', '.')) || 0;
    else inputs[f.id] = parseInt(String(raw).replace(/[^\d-]/g, ''), 10) || 0;
  });
  return inputs;
}

// ── GRÁFICO DE LINHA (projeção de saldo/patrimônio/dívida) ──
function buildSimLineChartSvg(serie, tone) {
  if (!serie || !serie.length) return '';
  const W = 300, H = 110, PAD = 6;
  const min = Math.min(0, ...serie);
  const max = Math.max(0, ...serie);
  const range = (max - min) || 1;
  const stepX = (W - PAD * 2) / Math.max(serie.length - 1, 1);
  const colorMap = { good: '#16a34a', bad: '#dc2626', warning: '#f97316', neutral: '#4338ca' };
  const color = colorMap[tone] || colorMap.neutral;

  const pts = serie.map((v, idx) => {
    const x = PAD + idx * stepX;
    const y = H - PAD - ((v - min) / range) * (H - PAD * 2);
    return [x, y];
  });
  const linePath = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const zeroY = H - PAD - ((0 - min) / range) * (H - PAD * 2);
  const areaPath = linePath + ` L${pts[pts.length - 1][0].toFixed(1)} ${zeroY.toFixed(1)} L${pts[0][0].toFixed(1)} ${zeroY.toFixed(1)} Z`;

  return `
    <svg class="sim-chart-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <line x1="${PAD}" y1="${zeroY.toFixed(1)}" x2="${W - PAD}" y2="${zeroY.toFixed(1)}" stroke="var(--border)" stroke-width="1" stroke-dasharray="3,3"/>
      <path d="${areaPath}" fill="${color}" opacity="0.12" stroke="none"/>
      <path d="${linePath}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
}

function runSimAndShowResult(key) {
  const inputs = readSimInputs(key);
  const run = runSimulation(key, inputs);
  if (!run) return;
  simLastComputed = { type: key, inputs, result: run.result };

  const t = SIM_TYPES[key];
  const r = run.result;
  const toneClass = 'tone-' + r.tone;

  const html = `
    <div class="sim-result-card ${toneClass}">
      <div class="sim-result-head">
        <span class="sim-result-icon"><svg class="icon icon-sm" aria-hidden="true"><use href="#${t.icon}"></use></svg></span>
        <span class="sim-result-title">${t.label}</span>
      </div>
      <p class="sim-result-resumo">${r.resumo}</p>

      <div class="sim-metric-grid">
        <div class="sim-metric">
          <div class="sim-metric-label">Impacto mensal</div>
          <div class="sim-metric-value ${r.impactoMensal < 0 ? 'neg' : 'pos'}">${r.impactoMensal >= 0 ? '+' : ''}${formatBRL(r.impactoMensal)}</div>
        </div>
        <div class="sim-metric">
          <div class="sim-metric-label">Impacto anual</div>
          <div class="sim-metric-value ${r.impactoAnual < 0 ? 'neg' : 'pos'}">${r.impactoAnual >= 0 ? '+' : ''}${formatBRL(r.impactoAnual)}</div>
        </div>
        <div class="sim-metric">
          <div class="sim-metric-label">Saldo previsto</div>
          <div class="sim-metric-value ${r.saldoPrevisto < 0 ? 'neg' : 'pos'}">${formatBRL(r.saldoPrevisto)}</div>
        </div>
        <div class="sim-metric">
          <div class="sim-metric-label">${r.tempoLabel}</div>
          <div class="sim-metric-value">${r.tempoRecuperacao === null || r.tempoRecuperacao === undefined ? '—' : r.tempoRecuperacao + ' meses'}</div>
        </div>
      </div>

      <div class="sim-chart-wrap">
        <div class="sim-chart-title">${r.serieLabel}</div>
        ${buildSimLineChartSvg(r.serie, r.tone)}
      </div>

      ${r.detalhes.length ? `<ul class="sim-detail-list">${r.detalhes.map(d => `<li>${d}</li>`).join('')}</ul>` : ''}

      <button type="button" class="sim-add-btn" onclick="addScenarioToComparison()">
        <svg class="icon icon-sm" aria-hidden="true"><use href="#i-plus"></use></svg> Adicionar à comparação
      </button>
    </div>
  `;
  const area = document.getElementById('simResultArea');
  area.innerHTML = html;
  area.classList.remove('sim-pop-in');
  void area.offsetWidth;
  area.classList.add('sim-pop-in');
}

// ── COMPARAÇÃO ENTRE CENÁRIOS ──
function addScenarioToComparison() {
  if (!simLastComputed) return;
  const t = SIM_TYPES[simLastComputed.type];
  simScenarios.push({
    id: 'sc_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    typeLabel: t.label,
    icon: t.icon,
    impactoMensal: simLastComputed.result.impactoMensal,
    saldoPrevisto: simLastComputed.result.saldoPrevisto,
    tempoRecuperacao: simLastComputed.result.tempoRecuperacao,
    tempoLabel: simLastComputed.result.tempoLabel,
    tone: simLastComputed.result.tone,
  });
  if (simScenarios.length > 6) simScenarios.shift();
  saveSimScenarios();
  renderSimComparison();
}

function removeSimScenario(id) {
  simScenarios = simScenarios.filter(s => s.id !== id);
  saveSimScenarios();
  renderSimComparison();
}

function buildSimBarChartHtml(scenarios) {
  const maxAbs = Math.max(...scenarios.map(s => Math.abs(s.impactoMensal)), 1);
  const colorMap = { good: '#16a34a', bad: '#dc2626', warning: '#f97316', neutral: '#4338ca' };
  return `
    <div class="sim-bar-chart">
      ${scenarios.map(s => {
        const pct = Math.max(Math.abs(s.impactoMensal) / maxAbs * 100, 3);
        const color = colorMap[s.tone] || colorMap.neutral;
        return `
          <div class="sim-bar-row">
            <span class="sim-bar-label">${sanitize(s.typeLabel)}</span>
            <div class="sim-bar-track">
              <div class="sim-bar-fill" style="width:${pct.toFixed(1)}%;background:${color}"></div>
            </div>
            <span class="sim-bar-value" style="color:${color}">${s.impactoMensal >= 0 ? '+' : ''}${formatBRL(s.impactoMensal)}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderSimComparison() {
  const area = document.getElementById('simCompareArea');
  if (!area) return;
  if (!simScenarios.length) {
    area.innerHTML = `
      <div class="sim-compare-empty">
        <svg class="icon" aria-hidden="true"><use href="#i-bar-chart"></use></svg>
        Calcule uma simulação e toque em "Adicionar à comparação" para ver os cenários lado a lado.
      </div>
    `;
    return;
  }
  area.innerHTML = `
    <div class="sim-compare-section">
      <div class="sim-compare-title">Comparação entre cenários <span class="sim-compare-count">${simScenarios.length}</span></div>
      ${buildSimBarChartHtml(simScenarios)}
      <div class="sim-compare-list">
        ${simScenarios.map(s => `
          <div class="sim-compare-card tone-${s.tone}">
            <span class="sim-compare-icon"><svg class="icon icon-sm" aria-hidden="true"><use href="#${s.icon}"></use></svg></span>
            <div class="sim-compare-body">
              <div class="sim-compare-name">${sanitize(s.typeLabel)}</div>
              <div class="sim-compare-metrics">
                <span>Saldo previsto: <strong>${formatBRL(s.saldoPrevisto)}</strong></span>
                ${s.tempoRecuperacao !== null && s.tempoRecuperacao !== undefined ? `<span>${sanitize(s.tempoLabel)}: <strong>${s.tempoRecuperacao} meses</strong></span>` : ''}
              </div>
            </div>
            <button type="button" class="sim-compare-remove" onclick="removeSimScenario('${s.id}')" aria-label="Remover cenário">
              <svg class="icon icon-sm" aria-hidden="true"><use href="#i-x"></use></svg>
            </button>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════
