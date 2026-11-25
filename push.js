'use strict';
/* Recordatorios: suscripción push y sincronización con el servidor del VPS. */

const PUSH_API = localStorage.getItem('habitos.api') || 'https://oficina.tail4fe751.ts.net';   // la clave es solo para pruebas
const ALL_WEEK = [0, 1, 2, 3, 4, 5, 6];
const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const isStandaloneApp = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function b64ToBytes(b64) {
  const s = atob((b64 + '='.repeat((4 - b64.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, c => c.charCodeAt(0));
}

function habitReminderBody(h) {
  if (h.note) return h.note;
  if (h.type === 'count') return `Meta de hoy: ${h.goal} ${h.unit || 'veces'}`;
  if (h.type === 'avoid') return 'Seguí firme hoy 💪';
  return 'Es momento de tu hábito';
}

function buildReminders() {
  const P = state.push, list = [];
  for (const h of activeHabits()) {
    if (!h.reminder) continue;
    list.push({ id: `h-${h.id}`, kind: 'habit', habitId: h.id, title: `${h.emoji} ${h.name}`, body: habitReminderBody(h),
      time: h.reminder, days: isWeekly(h) ? ALL_WEEK : h.days });
  }
  if (P.summary.on) {
    list.push({ id: 'summary', kind: 'summary', title: '📋 ¿Cómo va tu día?', body: '', time: P.summary.time, days: ALL_WEEK,
      habits: activeHabits().filter(h => !isWeekly(h)).map(h => ({ id: h.id, days: h.days })) });
  }
  if (P.gastos.on) {
    list.push({ id: 'gastos', kind: 'plain', title: '💸 Anotá tus gastos', body: '¿Gastaste algo hoy? Anotalo en 10 segundos.', time: P.gastos.time, days: ALL_WEEK });
  }
  return list;
}

async function currentSub() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

async function api(path, body) {
  const r = await fetch(PUSH_API + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function pushSync() {
  if (!state.push.enabled) return;
  const sub = await currentSub();
  if (!sub) { state.push.enabled = false; localStorage.setItem(STORE_KEY, JSON.stringify(state)); return; }
  const tk = todayKey();
  await api('/api/sync', {
    sub: sub.toJSON(), tz: Intl.DateTimeFormat().resolvedOptions().timeZone, reminders: buildReminders(),
    done: { date: tk, ids: activeHabits().filter(h => isDone(h, tk)).map(h => h.id) },
  });
}

let pushTimer;
function schedulePushSync() {
  if (!state.push || !state.push.enabled) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => pushSync().catch(() => {}), 1500);
}

async function enablePush() {
  if (!pushSupported()) {
    toast(isIOS && !isStandaloneApp() ? 'Primero instalá la app en la pantalla de inicio' : 'Este navegador no admite notificaciones');
    return;
  }
  const perm = await Notification.requestPermission();   // tiene que ser lo primero tras el toque (iOS)
  if (perm !== 'granted') { toast('No diste permiso para notificaciones'); render(); return; }
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const { key } = await api('/api/key');
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) });
    }
    state.push.enabled = true; save();
    await pushSync();
    render(); toast('Recordatorios activados 🔔');
  } catch (err) {
    state.push.enabled = false; save(); render();
    toast('No se pudo conectar con el servidor de avisos');
  }
}

async function disablePush() {
  try {
    const sub = await currentSub();
    if (sub) { await api('/api/unsubscribe', { endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe(); }
  } catch (_) { /* igual lo apagamos */ }
  state.push.enabled = false; save(); render(); toast('Recordatorios desactivados');
}

function pushSettingsHTML() {
  const P = state.push, n = activeHabits().filter(h => h.reminder).length;
  let status;
  if (!pushSupported()) {
    status = `<div class="hint" style="padding:12px 16px">${isIOS && !isStandaloneApp()
      ? 'Para recibir avisos en el iPhone, primero instalá la app en la pantalla de inicio (abajo te explico cómo) y abrila desde el ícono.'
      : 'Este navegador no admite notificaciones.'}</div>`;
  } else if (!P.enabled) {
    status = `<button data-act="push-enable">🔔 Activar notificaciones<span class="right">›</span></button>`;
  } else {
    status = `<div>🔔 Notificaciones activadas</div>
      <button data-act="push-test">📨 Enviarme una prueba<span class="right">›</span></button>`;
  }
  const row = (key, label) => `<div>${label}
    <span class="right row-gap">${P[key].on ? `<input type="time" class="time-input" data-push="${key}" value="${P[key].time}">` : ''}
    <button class="toggle ${P[key].on ? 'on' : ''}" data-act="push-toggle" data-v="${key}" aria-label="${label}"><i></i></button></span></div>`;
  return `
    <div class="section-title">Recordatorios</div>
    <div class="list">
      ${status}
      ${row('summary', '📋 Resumen del día')}
      ${row('gastos', '💸 Anotar gastos')}
      <button data-tab="hoy">⏰ Hábitos con aviso<span class="right">${n}</span></button>
      ${P.enabled ? '<button data-act="push-disable"><span class="red">Desactivar notificaciones</span></button>' : ''}
    </div>
    <div class="hint">El resumen solo llega si te quedan hábitos sin hacer. Para avisar un hábito puntual: abrilo → Editar → Recordatorio.</div>`;
}

document.addEventListener('change', e => {
  const k = e.target.dataset.push;
  if (k && /^\d{2}:\d{2}$/.test(e.target.value)) { state.push[k].time = e.target.value; save(); }
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') schedulePushSync(); });
window.addEventListener('DOMContentLoaded', () => schedulePushSync());

Object.assign(actions, {
  'push-enable': () => enablePush(),
  'push-disable': () => { if (confirm('¿Desactivar todas las notificaciones?')) disablePush(); },
  'push-test': async () => {
    try { const sub = await currentSub(); await api('/api/test', { endpoint: sub.endpoint }); toast('Prueba enviada: debería llegarte en segundos'); }
    catch (_) { toast('No se pudo enviar la prueba'); }
  },
  'push-toggle': el => { const k = el.dataset.v; state.push[k].on = !state.push[k].on; save(); render(); },
});
