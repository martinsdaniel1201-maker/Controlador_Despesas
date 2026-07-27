function loadSimInputs() {
  try {
    const salRaw = localStorage.getItem('sim_salario') || '';
    const metaRaw = localStorage.getItem('sim_meta_pct') || '';
    // Restaura salário já no formato de máscara (ex: "3.500,00")
    if (salRaw) {
      const num = parseBRL(salRaw);
      document.getElementById('simSalario').value = num > 0
        ? num.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
        : '';
    }
    document.getElementById('simMetaPct').value = metaRaw;
  } catch (e) {}
}

function saveSimInputs() {
  try {
    localStorage.setItem('sim_salario',  document.getElementById('simSalario').value);
    localStorage.setItem('sim_meta_pct', document.getElementById('simMetaPct').value);
  } catch (e) {}
}

// ═══════════════════════════════════════════════
// SIMULAÇÃO / CALCULADORA
// FIX: "=Platform =" removido; lógica de cores alinhada com a progress bar
// ═══════════════════════════════════════════════
function calcularSimulacao() {
  const raw           = getMonthExpenses(currentYear, currentMonth);
  const totalDespesas = raw.reduce((s, e) => s + e.valor, 0);
  const paidDespesas  = raw.filter(e => (e.pagamentos || {})[getMonthKey(currentYear, currentMonth)])
                           .reduce((s, e) => s + e.valor, 0);
  const saldoAPagar   = totalDespesas - paidDespesas;

  const salario  = parseBRL(document.getElementById('simSalario').value);
  const metaPct  = parseFloat(document.getElementById('simMetaPct').value) || 0;

  let valorMeta       = 0;
  let comprometimento = 0;
  let sobra           = 0;

  if (salario > 0) {
    comprometimento = Math.round((totalDespesas / salario) * 100); // usa total, não só pendente
    valorMeta       = (salario * metaPct) / 100;
    sobra           = salario - totalDespesas - valorMeta;
  } else {
    sobra = -totalDespesas;
  }

  document.getElementById('simValorMeta').textContent = formatBRL(valorMeta);

  const sobraEl = document.getElementById('simSobra');
  sobraEl.textContent = formatBRL(Math.max(sobra, 0) === 0 && sobra < 0 ? sobra : sobra);
  sobraEl.style.color = sobra >= 0 ? 'var(--green-dark)' : 'var(--red)';

  // Saldo disponível: salário − o que já foi pago
  const saldoDispEl = document.getElementById('simSaldoDisp');
  if (salario > 0) {
    const saldoDisp = salario - paidDespesas;
    saldoDispEl.textContent = formatBRL(saldoDisp);
    saldoDispEl.style.color = saldoDisp >= 0 ? '#6c3483' : 'var(--red)';
  } else {
    saldoDispEl.textContent = '—';
    saldoDispEl.style.color = '#6c3483';
  }

  document.getElementById('simPctBarLabel').textContent = comprometimento + '%';

  const bar = document.getElementById('simProgressBar');
  bar.style.width = Math.min(comprometimento, 100) + '%';
  if      (comprometimento <= 50) bar.style.background = 'var(--green)';
  else if (comprometimento <= 80) bar.style.background = 'var(--orange)';
  else                            bar.style.background = 'var(--red)';

  const alertContainer = document.getElementById('simAlertContainer');
  if (salario === 0) { alertContainer.innerHTML = ''; return; }

  if (sobra < 0) {
    alertContainer.innerHTML = `<div class="sim-alert-box danger"><svg class="icon icon-sm" aria-hidden="true"><use href="#i-alert"></use></svg> <strong>Orçamento Estourado!</strong> Suas despesas superam sua renda em ${formatBRL(Math.abs(sobra + valorMeta))}.</div>`;
  } else if (sobra < valorMeta) {
    alertContainer.innerHTML = `<div class="sim-alert-box warning"><svg class="icon icon-sm" aria-hidden="true"><use href="#i-alert"></use></svg> <strong>Atenção!</strong> O salário paga as contas, mas não cumpre a meta de guardar ${metaPct}%.</div>`;
  } else if (comprometimento > 70) {
    alertContainer.innerHTML = `<div class="sim-alert-box warning"><svg class="icon icon-sm" aria-hidden="true"><use href="#i-target"></use></svg> <strong>Aviso:</strong> Você paga tudo, mas comprometeu ${comprometimento}% do orçamento.</div>`;
  } else {
    alertContainer.innerHTML = `<div class="sim-alert-box success"><svg class="icon icon-sm" aria-hidden="true"><use href="#i-party"></use></svg> <strong>Parabéns!</strong> Finanças equilibradas. Sobram ${formatBRL(sobra)}.</div>`;
  }
}

// ═══════════════════════════════════════════════
