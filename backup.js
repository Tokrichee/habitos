'use strict';
/* Copia automática: cada cambio se guarda solo en el servidor del VPS, con un código secreto de este teléfono. */

function newBackupCode() {
  const b = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function ensureBackupCode() {
  if (state.backup && state.backup.code) return;
  state.backup = { code: newBackupCode(), lastAt: null };     // datos borrados o nuevos: código nuevo
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}
ensureBackupCode();

let backupTimer, backupBusy = false, backupFailed = false;
function scheduleBackup(delay = 4000) {
  clearTimeout(backupTimer);
  backupTimer = setTimeout(runBackup, delay);
}

async function runBackup() {
  if (backupBusy) return scheduleBackup();
  ensureBackupCode();
  if (!navigator.onLine) { backupFailed = true; return; }
  backupBusy = true;
  try {
    const r = await fetch(`${PUSH_API}/api/backup`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: state.backup.code, data: state }),
    });
    if (!r.ok) throw new Error(r.status);
    state.backup.lastAt = Date.now(); backupFailed = false;
    localStorage.setItem(STORE_KEY, JSON.stringify(state));   // sin save(): no dispara otra copia
  } catch (_) {
    backupFailed = true;
  } finally {
    backupBusy = false;
    if (ui.tab === 'ajustes' && !sheetRender) render();
  }
}

function ago(ts) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'recién';
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${plural(Math.round(h / 24), 'día', 'días')}`;
}

function backupSettingsHTML() {
  ensureBackupCode();
  const b = state.backup;
  const status = backupFailed ? '⚠️ Pendiente: se guarda cuando haya conexión'
    : b.lastAt ? `☁️ Guardado ${ago(b.lastAt)}` : '☁️ Guardando…';
  return `
    <div class="section-title">Copia automática</div>
    <div class="list">
      <div>${status}</div>
      <button data-act="backup-now">🔄 Guardar ahora<span class="right">›</span></button>
      <button data-act="backup-code">🔑 Ver mi código de respaldo<span class="right">›</span></button>
      <button data-act="backup-restore">⬇️ Restaurar con un código<span class="right">›</span></button>
      <button data-act="export">📄 Exportar a un archivo<span class="right">.json</span></button>
      <button data-act="import">📂 Importar un archivo</button>
    </div>
    <div class="hint">Cada cambio se guarda solo en tu servidor, con copias de los últimos 14 días. Si cambiás de teléfono, instalá la app y tocá "Restaurar con un código".</div>`;
}

function renderCodeSheet() {
  return `
    <div class="sheet-head"><span style="width:52px"></span><h2>Código de respaldo</h2><button class="link" data-act="close-sheet">Listo</button></div>
    <p class="sub">Con este código recuperás todos tus datos en otro teléfono. Guardalo en un lugar seguro (por ejemplo, en tus notas) y no se lo pases a nadie.</p>
    <div class="code-box">${esc(state.backup.code)}</div>
    <button class="btn" data-act="backup-copy">Copiar código</button>`;
}

async function restoreFromCode(code) {
  code = (code || '').trim();
  if (!code) return;
  try {
    const r = await fetch(`${PUSH_API}/api/restore`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
    const j = await r.json();
    if (!r.ok) { toast(j.error || 'No se pudo restaurar'); return; }
    const n = j.data.habits.length;
    if (!confirm(`Copia del ${new Date(j.savedAt).toLocaleString('es-AR')} con ${plural(n, 'hábito', 'hábitos')}. ¿Reemplazar los datos de este teléfono?`)) return;
    state = migrate(j.data);
    state.backup = { ...(state.backup || {}), code };
    state.profile.onboarded = true;
    save(); goTab('hoy'); toast('Datos restaurados ✅');
  } catch (_) { toast('No se pudo conectar con el servidor'); }
}

window.addEventListener('online', () => { if (backupFailed) scheduleBackup(500); });
window.addEventListener('DOMContentLoaded', () => scheduleBackup(2000));

Object.assign(actions, {
  'backup-now': () => { backupFailed = false; runBackup().then(() => toast(backupFailed ? 'No se pudo guardar (¿sin conexión?)' : 'Copia guardada ☁️')); },
  'backup-code': () => openSheet(renderCodeSheet),
  'backup-copy': async () => {
    try { await navigator.clipboard.writeText(state.backup.code); toast('Código copiado'); }
    catch (_) { toast('Mantené apretado el código para copiarlo'); }
  },
  'backup-restore': () => restoreFromCode(prompt('Pegá tu código de respaldo:')),
});
