// DARK MODE
// ═══════════════════════════════════════════════
function applyDarkModePreference() {
  try {
    const pref = localStorage.getItem('darkMode');
    if (pref === 'true') {
      document.body.classList.add('dark-mode');
      document.body.classList.remove('light-mode');
    } else if (pref === 'false') {
      document.body.classList.add('light-mode');
      document.body.classList.remove('dark-mode');
    }
  } catch (e) {}
  updateDarkModeBtn();
}

function isDarkActive() {
  if (document.body.classList.contains('dark-mode'))  return true;
  if (document.body.classList.contains('light-mode')) return false;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function toggleDarkMode() {
  const nowDark = isDarkActive();
  document.body.classList.remove('dark-mode', 'light-mode');
  try {
    if (!nowDark) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.body.classList.add('light-mode');
      localStorage.setItem('darkMode', 'false');
    }
  } catch (e) {}
  updateDarkModeBtn();
}

function updateDarkModeBtn() {
  const dark  = isDarkActive();
  const icon  = document.getElementById('darkModeIcon');
  const label = document.getElementById('darkModeLabel');
  if (icon)  icon.innerHTML    = `<svg class="icon icon-sm" aria-hidden="true"><use href="#i-${dark ? 'sun' : 'moon'}"></use></svg>`;
  if (label) label.textContent = dark ? 'Modo Claro' : 'Modo Escuro';
}

applyDarkModePreference();

// ═══════════════════════════════════════════════
