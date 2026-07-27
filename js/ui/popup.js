// POPUP CUSTOMIZADO
// Usa DOM em vez de innerHTML para segurança.
// ═══════════════════════════════════════════════
function mostrarPopup({ emoji, titulo, texto, botoes }) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('confirmOverlay');

    const box = document.createElement('div');
    box.className = 'custom-confirm-box';

    const emojiEl = document.createElement('span');
    emojiEl.className = 'confirm-emoji';
    emojiEl.textContent = emoji;

    const titleEl = document.createElement('div');
    titleEl.className = 'confirm-title';
    titleEl.textContent = titulo;          // textContent → XSS-safe

    const textEl = document.createElement('div');
    textEl.className = 'confirm-text';
    textEl.textContent = texto;            // textContent → XSS-safe

    const btnsEl = document.createElement('div');
    btnsEl.className = 'confirm-buttons';

    botoes.forEach((btn) => {
      const b = document.createElement('button');
      b.className = btn.classe;
      b.textContent = btn.texto;
      b.onclick = () => {
        overlay.classList.remove('open');
        overlay.innerHTML = '';
        resolve(btn.valor);
      };
      btnsEl.appendChild(b);
    });

    box.appendChild(emojiEl);
    box.appendChild(titleEl);
    box.appendChild(textEl);
    box.appendChild(btnsEl);

    overlay.innerHTML = '';
    overlay.appendChild(box);
    overlay.classList.add('open');
  });
}

// ═══════════════════════════════════════════════
