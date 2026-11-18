// =====================================================================
// Beta testers: códigos de invitación firmados y caducidad de la cuenta.
// La app no tiene servidor, así que el propio código lleva dentro cuántos
// días dura el acceso. Se firma con una clave interna para que no se pueda
// inventar uno cualquiera: si alguien cambia un carácter, la firma no cuadra.
// Formato: DTB-XXX-XXXXXXXX-XXXX
//   XXX       duración en días en base 36 (000 = sin límite)
//   XXXXXXXX  token aleatorio
//   XXXX      firma (resumen del día + token + clave secreta)
// =====================================================================

const SECRETO = 'dantal-beta-v1';
const PREFIJO = 'DTB';
const MAX_DIAS = 3650; // 10 años, más que de sobra
// Alfabeto sin caracteres que se confunden al leerlos o copiarlos (I, O, 0, 1…).
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const RE_CODIGO = /^DTB-([0-9A-Z]{3})-([0-9A-Z]{8})-([0-9A-Z]{4})$/;

const acotarDias = n => Math.max(0, Math.min(MAX_DIAS, Math.floor(Number(n) || 0)));
const aBase36 = n => acotarDias(n).toString(36).toUpperCase().padStart(3, '0');
const deBase36 = s => parseInt(s, 36) || 0;

function alAzar(n) {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return [...bytes].map(b => ALFABETO[b % ALFABETO.length]).join('');
}

async function resumen(texto) {
  const datos = new TextEncoder().encode(texto);
  const buf = await crypto.subtle.digest('SHA-256', datos);
  return new Uint8Array(buf);
}

async function firma(dias36, token) {
  const bytes = await resumen(`${SECRETO}|${dias36}|${token}`);
  return [...bytes.slice(0, 4)].map(b => ALFABETO[b % ALFABETO.length]).join('');
}

// Crea un código de invitación válido durante `dias` días (0 = sin límite).
export async function generarCodigo(dias) {
  const d = aBase36(dias);
  const token = alAzar(8);
  return `${PREFIJO}-${d}-${token}-${await firma(d, token)}`;
}

// Lee un código escrito a mano o pegado. Devuelve { ok: true, dias } o { ok: false, error }.
export async function leerCodigo(texto) {
  const limpio = String(texto || '')
    .toUpperCase()
    .replace(/[^0-9A-Z]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
  const m = limpio.match(RE_CODIGO);
  if (!m) return { ok: false, error: 'El código no tiene el formato correcto. Debe ser parecido a DTB-030-XXXXXXXX-XXXX.' };
  const [, d, token, check] = m;
  if (await firma(d, token) !== check) return { ok: false, error: 'Ese código no es válido. Revisa que esté completo y bien copiado.' };
  return { ok: true, dias: deBase36(d) };
}

// Fecha local en formato 'AAAA-MM-DD' a milisegundos UTC (a medianoche).
const aMs = f => {
  const [a, m, d] = String(f || '').slice(0, 10).split('-').map(Number);
  if (!a || !m || !d) return NaN;
  return Date.UTC(a, m - 1, d);
};

// Suma días a una fecha 'AAAA-MM-DD' y devuelve otra fecha 'AAAA-MM-DD'.
export function sumarDiasIso(fecha, dias) {
  const ms = aMs(fecha) + Math.round(Number(dias) || 0) * 86400000;
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// ¿Ha caducado? `expira` vacío o null significa sin límite.
export function estaCaducada(expira, hoyIso) {
  if (!expira) return false;
  return String(expira).slice(0, 10) < String(hoyIso).slice(0, 10);
}

// Días que quedan. null = sin límite; 0 = hoy es el último día; negativo = ya caducada.
export function diasRestantes(expira, hoyIso) {
  if (!expira) return null;
  const dif = aMs(expira) - aMs(hoyIso);
  return Number.isNaN(dif) ? null : Math.round(dif / 86400000);
}

// Texto corto y claro para una duración en días.
export function etiquetaDuracion(dias) {
  const d = acotarDias(dias);
  if (!d) return 'Sin límite';
  if (d === 7) return '1 semana';
  if (d === 14) return '2 semanas';
  if (d === 21) return '3 semanas';
  if (d === 30) return '1 mes';
  if (d === 60) return '2 meses';
  if (d === 90) return '3 meses';
  if (d === 180) return '6 meses';
  if (d === 365) return '1 año';
  return d === 1 ? '1 día' : `${d} días`;
}
