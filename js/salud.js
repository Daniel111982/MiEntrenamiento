// =====================================================================
// Datos de salud (peso, medidas y actividad diaria)
// =====================================================================
// Lee un archivo CSV o JSON exportado de Google Fit, Health Connect, una
// báscula o cualquier app de salud, y devuelve los datos listos para
// fusionarlos con los de DANTAL. Todo ocurre en el dispositivo: el archivo
// no sale de aquí.
//
// No guarda nada por su cuenta: `interpretarSalud` lee el texto y
// `fusionarMedidas` / `fusionarActividad` lo mezclan con lo que ya hay.

// Campos que sabemos leer y sus nombres habituales (español e inglés).
const CAMPOS = {
  fecha: ['fecha', 'date', 'dia', 'day', 'start time', 'starttime', 'time', 'timestamp', 'fecha y hora', 'fecha hora', 'momento'],
  // Medidas corporales
  peso: ['peso', 'weight', 'masa', 'peso corporal', 'body weight'],
  grasa: ['grasa', 'body fat', 'bodyfat', 'fat', 'grasa corporal', 'body fat percentage', 'porcentaje de grasa'],
  cintura: ['cintura', 'waist'],
  pecho: ['pecho', 'chest'],
  cadera: ['cadera', 'hip', 'hips'],
  brazo: ['brazo', 'arm', 'bicep', 'biceps'],
  muslo: ['muslo', 'thigh'],
  // Actividad diaria
  pasos: ['pasos', 'steps', 'step count', 'conteo de pasos', 'numero de pasos', 'recuento de pasos'],
  distancia: ['distancia', 'distance', 'distancia recorrida', 'recorrido'],
  calorias: ['calorias', 'calories', 'calorias quemadas', 'calories burned', 'energia', 'energy', 'calorias activas'],
  minutos: ['minutos', 'minutes', 'minutos activos', 'active minutes', 'move minutes', 'minutos de movimiento', 'minutos de actividad'],
};

// Campos de medida (sin la fecha), en el orden en que se muestran.
export const MEDIDA_KEYS = ['peso', 'grasa', 'cintura', 'pecho', 'cadera', 'brazo', 'muslo'];
// Campos de actividad diaria (sin la fecha).
export const ACTIVIDAD_KEYS = ['pasos', 'distancia', 'calorias', 'minutos'];

// Rangos razonables; los mismos que usa la app al guardar a mano.
const LIMITES = {
  peso: [20, 400], grasa: [1, 75], cintura: [30, 250], pecho: [30, 250], cadera: [30, 250], brazo: [10, 100], muslo: [20, 150],
  pasos: [0, 200000], distancia: [0, 500], calorias: [0, 20000], minutos: [0, 1440],
};

const p2 = n => String(n).padStart(2, '0');
const isoFecha = d => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const sinAcentos = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const limpiaCabecera = h => sinAcentos(h).replace(/\([^)]*\)/g, ' ').replace(/[._\-/]+/g, ' ').replace(/\s+/g, ' ').trim();

// ¿El nombre de la columna dice que viene en libras?
const esLibras = cabecera => /\b(lb|lbs|pound|pounds|libra|libras|oz|onzas)\b/.test(sinAcentos(cabecera));

// ¿La distancia viene en metros? (en DANTAL se guarda en kilómetros)
function esMetros(cabecera) {
  const h = sinAcentos(cabecera);
  if (/\bkm\b|kilomet/.test(h)) return false;
  return /\(m\)|\bm\b|meters?|metros?/.test(h);
}

// Factor para pasar el valor leído a la unidad que usa DANTAL.
function factorUnidad(cabecera, campo) {
  if (campo === 'peso' && esLibras(cabecera)) return 0.45359237;
  if (campo === 'distancia' && esMetros(cabecera)) return 0.001;
  return 1;
}

// A qué campo de DANTAL corresponde una cabecera (o null si no la reconozco).
export function campoDeCabecera(cabecera) {
  const h = limpiaCabecera(cabecera);
  if (!h) return null;
  for (const [campo, alias] of Object.entries(CAMPOS)) if (alias.includes(h)) return campo;
  for (const [campo, alias] of Object.entries(CAMPOS)) {
    if (alias.some(a => h.startsWith(a + ' ') || h.endsWith(' ' + a) || h.includes(' ' + a + ' '))) return campo;
  }
  return null;
}

// Convierte cualquier valor en número, admitiendo «80,5», «80.5 kg», «150 lb»…
export function aNumero(valor) {
  if (valor == null) return null;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  let s = String(valor).trim();
  if (!s) return null;
  s = s.replace(/[^\d.,+-]/g, '');
  if (!s) return null;
  const coma = s.lastIndexOf(','), punto = s.lastIndexOf('.');
  if (coma > -1 && punto > -1) {
    if (coma > punto) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (coma > -1) s = s.replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// Los campos enteros (pasos, calorías, minutos) admiten «11.500» o
// «11,500» como separador de miles, no como decimales.
const CAMPOS_ENTEROS = ['pasos', 'calorias', 'minutos'];
function aEntero(valor) {
  if (valor == null) return null;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  const s = String(valor).trim().replace(/\s/g, '');
  if (/^\d{1,3}([.,]\d{3})+$/.test(s)) return Number(s.replace(/[.,]/g, ''));
  return aNumero(s);
}
const aValor = (campo, bruto) => CAMPOS_ENTEROS.includes(campo) ? aEntero(bruto) : aNumero(bruto);

const MESES = {  ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12,
  jan: 1, apr: 4, aug: 8, dec: 12,
};

// Convierte fechas en muchos formatos a «AAAA-MM-DD». Devuelve null si no la entiende.
export function aFecha(valor) {
  if (valor == null) return null;
  if (valor instanceof Date && !isNaN(valor)) return isoFecha(valor);
  let s = String(valor).trim();
  if (!s) return null;

  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{4})[/.](\d{1,2})[/.](\d{1,2})/);
  if (m) return `${m[1]}-${p2(m[2])}-${p2(m[3])}`;

  m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})/);
  if (m) {
    let a = Number(m[1]), b = Number(m[2]), anio = Number(m[3]);
    if (anio < 100) anio += anio >= 70 ? 1900 : 2000;
    // Si un número es mayor que 12, ese es el día. Si los dos lo son, se
    // asume el orden español (día primero).
    let dia = a, mes = b;
    if (b > 12 && a <= 12) { dia = b; mes = a; }
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
    return `${anio}-${p2(mes)}-${p2(dia)}`;
  }

  m = s.match(/^(\d{1,2})[\s\-]([a-záéíóú]{3,})[\s\-]+(\d{4})/i);
  if (m && MESES[sinAcentos(m[2]).slice(0, 3)]) return `${m[3]}-${p2(MESES[sinAcentos(m[2]).slice(0, 3)])}-${p2(Number(m[1]))}`;
  m = s.match(/^([a-záéíóú]{3,})[\s\-]+(\d{1,2}),?[\s\-]+(\d{4})/i);
  if (m && MESES[sinAcentos(m[1]).slice(0, 3)]) return `${m[3]}-${p2(MESES[sinAcentos(m[1]).slice(0, 3)])}-${p2(Number(m[2]))}`;

  // Marcas de tiempo en segundos o milisegundos.
  if (/^\d{10}$/.test(s)) return isoFecha(new Date(Number(s) * 1000));
  if (/^\d{13}$/.test(s)) return isoFecha(new Date(Number(s)));
  return null;
}

// Comprueba que el valor entra dentro de un rango sensato para su campo.
function valida(campo, v, factor = 1) {
  if (v == null) return null;
  v = v * factor;
  const lim = LIMITES[campo];
  if (!lim) return null;
  const [min, max] = lim;
  if (!Number.isFinite(v) || v < min || v > max) return null;
  return Math.round(v * 100) / 100;
}

// --------------------------- Lectura de CSV ---------------------------
function detectarDelimitador(linea) {
  let mejor = ',', max = 0;
  for (const c of [',', ';', '\t', '|']) { const n = linea.split(c).length; if (n > max) { max = n; mejor = c; } }
  return mejor;
}

export function leerCSV(texto) {
  const t = String(texto).replace(/^\uFEFF/, '');
  const primera = t.split(/\r\n|\n|\r/).find(l => l.trim() !== '') || '';
  const delim = detectarDelimitador(primera);
  const filas = [];
  let campo = '', fila = [], comillas = false;
  const pushCampo = () => { fila.push(campo); campo = ''; };
  const pushFila = () => { pushCampo(); filas.push(fila); fila = []; };
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (comillas) {
      if (ch === '"') { if (t[i + 1] === '"') { campo += '"'; i++; } else comillas = false; }
      else campo += ch;
    } else if (ch === '"') comillas = true;
    else if (ch === delim) pushCampo();
    else if (ch === '\n') pushFila();
    else if (ch !== '\r') campo += ch;
  }
  if (campo !== '' || fila.length) pushFila();
  return filas.filter(f => f.some(c => String(c).trim() !== ''));
}

const esMedida = c => MEDIDA_KEYS.includes(c);
const esActividad = c => ACTIVIDAD_KEYS.includes(c);
const ordena = filas => filas.slice().sort((a, b) => a.fecha.localeCompare(b.fecha));

// ------------------- De filas crudas a mediciones --------------------
function leerCSVMedidas(texto) {
  const filas = leerCSV(texto);
  if (filas.length < 2) return { ok: false, error: 'El archivo no tiene datos (solo la cabecera).' };
  const cols = filas[0].map(c => { const campo = campoDeCabecera(c); return { campo, factor: factorUnidad(c, campo) }; });
  const camposM = [...new Set(cols.map(c => c.campo).filter(c => c && esMedida(c)))];
  const camposA = [...new Set(cols.map(c => c.campo).filter(c => c && esActividad(c)))];
  if (!cols.some(c => c.campo === 'fecha')) return { ok: false, error: 'No he encontrado ninguna columna de fecha (fecha, date, day…).' };
  if (!camposM.length && !camposA.length) return { ok: false, error: 'No he encontrado columnas de peso, medidas ni actividad (peso, weight, pasos, steps…).' };

  const outM = [], outA = [];
  let invalidas = 0;
  for (let i = 1; i < filas.length; i++) {
    const rec = { fecha: null }, recA = { fecha: null };
    let tieneM = false, tieneA = false;
    for (let j = 0; j < cols.length; j++) {
      const { campo, factor } = cols[j];
      if (!campo) continue;
      const bruto = filas[i][j];
      if (campo === 'fecha') { const f = aFecha(bruto); rec.fecha = f; recA.fecha = f; continue; }
      const v = valida(campo, aValor(campo, bruto), factor);
      if (v != null) {
        if (esMedida(campo)) { rec[campo] = v; tieneM = true; }
        else if (esActividad(campo)) { recA[campo] = v; tieneA = true; }
      } else if (String(bruto ?? '').trim() !== '') invalidas++;
    }
    if (rec.fecha && tieneM) outM.push(rec);
    if (recA.fecha && tieneA) outA.push(recA);
  }
  return { ok: true, filas: ordena(outM), campos: camposM, actividad: ordena(outA), camposAct: camposA, invalidas };
}

// --------------------- Lectura de JSON -------------------------------
function leerObjetosMedidas(arr) {
  const outM = [], outA = [];
  let invalidas = 0;
  const camposM = new Set(), camposA = new Set();
  for (const obj of arr) {
    if (!obj || typeof obj !== 'object') continue;
    const rec = { fecha: null }, recA = { fecha: null };
    let tieneM = false, tieneA = false;
    for (const [clave, valor] of Object.entries(obj)) {
      const campo = campoDeCabecera(clave);
      if (!campo) continue;
      if (campo === 'fecha') { const f = aFecha(valor); rec.fecha = f; recA.fecha = f; continue; }
      const v = valida(campo, aValor(campo, valor), factorUnidad(clave, campo));
      if (v != null) {
        if (esMedida(campo)) { rec[campo] = v; tieneM = true; camposM.add(campo); }
        else if (esActividad(campo)) { recA[campo] = v; tieneA = true; camposA.add(campo); }
      } else if (String(valor ?? '').trim() !== '') invalidas++;
    }
    if (rec.fecha && tieneM) outM.push(rec);
    if (recA.fecha && tieneA) outA.push(recA);
  }
  return { ok: true, filas: ordena(outM), campos: [...camposM], actividad: ordena(outA), camposAct: [...camposA], invalidas };
}

// --------------------------- Punto de entrada ------------------------
// Lee un texto (CSV o JSON) y devuelve { ok, filas, campos, actividad,
// camposAct, invalidas } o { ok:false, error } con un mensaje para el usuario.
export function interpretarSalud(texto, nombre = '') {
  if (!String(texto || '').trim()) return { ok: false, error: 'El archivo está vacío.' };
  const esJson = /\.json$/i.test(nombre) || /^[\s\uFEFF]*[{[]/.test(String(texto));
  const vacio = { ok: false, error: 'No he encontrado ninguna medición con fecha en el archivo.' };
  if (!esJson) {
    try {
      const r = leerCSVMedidas(texto);
      return r.ok && (r.filas.length || r.actividad.length) ? r : { ok: false, error: r.error || vacio.error };
    } catch { return { ok: false, error: 'No he podido leer ese CSV.' }; }
  }
  let datos;
  try { datos = JSON.parse(texto); } catch { return { ok: false, error: 'Ese archivo no es un JSON válido.' }; }
  const arr = Array.isArray(datos) ? datos
    : Array.isArray(datos?.medidas) ? datos.medidas
      : Array.isArray(datos?.items) ? datos.items
        : Array.isArray(datos?.data) ? datos.data
          : null;
  if (!arr) return { ok: false, error: 'No he encontrado una lista de mediciones en el JSON.' };
  const r = leerObjetosMedidas(arr);
  return (r.filas.length || r.actividad.length) ? r : vacio;
}

// Fusiona las mediciones leídas con las que ya hay. Nunca sobrescribe un
// valor existente: solo añade días nuevos y rellena campos vacíos.
export function fusionarMedidas(medidas, filas) {
  const porFecha = new Map((medidas || []).map(m => [m.fecha, m]));
  let nuevas = 0, completadas = 0;
  const campos = new Set();
  for (const f of filas) {
    if (!f.fecha) continue;
    const valores = MEDIDA_KEYS.filter(k => f[k] != null);
    if (!valores.length) continue;
    let m = porFecha.get(f.fecha);
    const esNueva = !m;
    if (esNueva) { m = { fecha: f.fecha }; porFecha.set(f.fecha, m); medidas.push(m); }
    let toco = false;
    for (const k of valores) {
      if (m[k] == null || m[k] === '') { m[k] = f[k]; toco = true; campos.add(k); }
    }
    if (esNueva) nuevas++;
    else if (toco) completadas++;
  }
  return { nuevas, completadas, campos: [...campos] };
}

// Fusiona la actividad diaria (pasos, distancia…). Aquí el valor más
// reciente manda: los pasos de un día crecen a lo largo de la jornada, así
// que al volver a sincronizar se actualiza el día en lugar de congelarlo.
export function fusionarActividad(actividad, filas) {
  const porFecha = new Map((actividad || []).map(a => [a.fecha, a]));
  let nuevas = 0, actualizadas = 0;
  const campos = new Set();
  for (const f of filas) {
    if (!f.fecha) continue;
    const valores = ACTIVIDAD_KEYS.filter(k => f[k] != null);
    if (!valores.length) continue;
    let a = porFecha.get(f.fecha);
    const esNueva = !a;
    if (esNueva) { a = { fecha: f.fecha }; porFecha.set(f.fecha, a); actividad.push(a); }
    let cambio = false;
    for (const k of valores) { if (a[k] !== f[k]) { a[k] = f[k]; cambio = true; campos.add(k); } }
    if (esNueva) nuevas++;
    else if (cambio) actualizadas++;
  }
  return { nuevas, actualizadas, campos: [...campos] };
}
