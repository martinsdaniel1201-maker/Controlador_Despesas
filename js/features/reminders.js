// LEMBRETES DE VENCIMENTO (Notification API)
// Observação: como não é push do servidor, o aviso só dispara
// enquanto o app é aberto (ao entrar, uma vez por dia).
// ═══════════════════════════════════════════════
function remindersEnabled() {
  return localStorage.getItem('remindersEnabled') === 'true' && Notification?.permission === 'granted';
}

async function toggleReminders() {
  const currentlyOn = localStorage.getItem('remindersEnabled') === 'true';
  if (currentlyOn) {
    localStorage.setItem('remindersEnabled', 'false');
    updateReminderBtn();
    showToast('Lembretes desativados');
    return;
  }
  if (!('Notification' in window)) {
    showToast('Seu navegador não suporta notificações');
    return;
  }
  let perm = Notification.permission;
  if (perm === 'default') perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    showToast('Permissão de notificação negada');
    updateReminderBtn();
    return;
  }
  localStorage.setItem('remindersEnabled', 'true');
  updateReminderBtn();
  showToast('🔔 Lembretes ativados!');
  checkDueReminders(true);
}

function updateReminderBtn() {
  const icon  = document.getElementById('reminderIcon');
  const label = document.getElementById('reminderLabel');
  const on    = remindersEnabled();
  if (icon)  icon.innerHTML    = `<svg class="icon icon-sm" aria-hidden="true"><use href="#i-${on ? 'bell' : 'bell-off'}"></use></svg>`;
  if (label) label.textContent = on ? 'Lembretes Ativados' : 'Lembretes de Vencimento';
}

function checkDueReminders(force) {
  if (!remindersEnabled()) return;
  const todayKey = new Date().toISOString().slice(0, 10);
  if (!force && localStorage.getItem('notifLastCheck') === todayKey) return;
  localStorage.setItem('notifLastCheck', todayKey);

  const now = new Date();
  const disp = getMonthExpenses(now.getFullYear(), now.getMonth())
    .map(e => getDisplayExpense(e, now.getFullYear(), now.getMonth()))
    .filter(e => !e.paid);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dueSoon = disp.filter(e => {
    const parts = e.dateStr.split('/');
    if (parts.length < 3) return false;
    const due = new Date(parts[2], parts[1] - 1, parts[0]);
    const diff = Math.floor((due - today) / 86400000);
    return diff >= 0 && diff <= 1;
  });

  if (dueSoon.length === 0) return;

  const titulo = dueSoon.length === 1
    ? `💰 "${dueSoon[0].label}" vence ${dueSoon[0].dateStr === formatTodayDDMM() ? 'hoje' : 'amanhã'}`
    : `💰 Você tem ${dueSoon.length} contas vencendo`;
  const corpo = dueSoon.slice(0, 3).map(e => `${e.label}: ${formatBRL(e.valor)}`).join(' · ');

  try {
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) reg.showNotification(titulo, { body: corpo, icon: './icone-192.png', tag: 'vencimento-' + todayKey });
        else new Notification(titulo, { body: corpo });
      });
    } else {
      new Notification(titulo, { body: corpo });
    }
  } catch (e) { console.warn('Falha ao exibir notificação', e); }
}

function formatTodayDDMM() {
  const d = new Date();
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
}

// ═══════════════════════════════════════════════
