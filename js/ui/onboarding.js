// ═══════════════════════════════════════════════════════════
// TOUR RÁPIDO — apresenta as novidades pra quem já usa o app
// ═══════════════════════════════════════════════════════════
const ONBOARDING_SLIDES = [
  {
    icon: 'i-sparkle',
    title: 'Sua Home ficou premium',
    text: 'Saldo do mês, comparação com o mês anterior e tudo o que importa, em um dashboard só seu.',
  },
  {
    icon: 'i-shield',
    title: 'Score Financeiro',
    text: 'Uma nota de 0 a 100 mostra sua saúde financeira do mês, com dicas concretas pra melhorar.',
  },
  {
    icon: 'i-bar-chart',
    title: 'Insights automáticos',
    text: 'Dezenas de análises aparecem sozinhas na Home: maior gasto, categorias em alta, previsões e mais.',
  },
  {
    icon: 'i-target',
    title: 'Simulações',
    text: 'Em Ferramentas → Simulações, veja o impacto de comprar algo, quitar dívidas ou mudar de renda antes de decidir de verdade.',
  },
];

let _onboardingStep = 0;

function maybeShowOnboarding() {
  try {
    if (localStorage.getItem('onboarding_v2_seen')) return;
  } catch (e) { return; }
  const overlay = document.getElementById('onboardingOverlay');
  if (!overlay) return;
  _onboardingStep = 0;
  renderOnboardingStep();
  overlay.classList.add('open');
}

function renderOnboardingStep() {
  const slide = ONBOARDING_SLIDES[_onboardingStep];
  const body = document.getElementById('onboardingBody');
  if (!body) return;
  body.innerHTML = `
    <div class="onboarding-icon"><svg class="icon icon-xl" aria-hidden="true"><use href="#${slide.icon}"></use></svg></div>
    <h3>${sanitize(slide.title)}</h3>
    <p>${sanitize(slide.text)}</p>
    <div class="onboarding-dots">
      ${ONBOARDING_SLIDES.map((_, i) => `<span class="onboarding-dot${i === _onboardingStep ? ' active' : ''}"></span>`).join('')}
    </div>
  `;
  const btn = document.getElementById('onboardingNextBtn');
  if (btn) btn.textContent = (_onboardingStep === ONBOARDING_SLIDES.length - 1) ? 'Começar' : 'Próximo';
}

function onboardingNext() {
  if (_onboardingStep < ONBOARDING_SLIDES.length - 1) {
    _onboardingStep++;
    renderOnboardingStep();
  } else {
    finishOnboarding();
  }
}

function finishOnboarding() {
  try { localStorage.setItem('onboarding_v2_seen', '1'); } catch (e) {}
  const overlay = document.getElementById('onboardingOverlay');
  if (overlay) overlay.classList.remove('open');
}

// ═══════════════════════════════════════════════════════════
