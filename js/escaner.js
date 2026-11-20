// =====================================================================
// Escáner de códigos de barras para la pantalla de nutrición.
// Privacidad: solo se envía el código leído a Open Food Facts.
// Nunca se envían datos personales, peso ni historial de la app.
// Usamos la API v3 (recomendada) y una caché local: 1 petición = 1 escaneo.
// =====================================================================

const FORMATOS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code'];
const API_BASE = 'https://world.openfoodfacts.org/api/v3/product';
const CAMPOS = [
  'code', 'product_name', 'product_name_es', 'product_name_en', 'generic_name',
  'abbreviated_product_name', 'brands', 'nutriments', 'ingredients_text',
  'allergens', 'traces', 'quantity', 'serving_quantity', 'serving_size',
  'nutrition_data_per', 'completeness', 'image_front_small_url',
].join(',');

// Micronutrientes que Open Food Facts puede declarar por 100 g.
// Solo se guardan si vienen en la ficha: nunca se inventan ni se estiman.
const MICROS_OFF = {
  calcio: 'calcium_100g',
  hierro: 'iron_100g',
  vitD: 'vitamin-d_100g',
  vitC: 'vitamin-c_100g',
  potasio: 'potassium_100g',
};
export const CLAVES_MICROS = Object.keys(MICROS_OFF);

function microNumero(x) {
  const v = Number(x);
  if (!Number.isFinite(v) || v < 0) return null;
  const redondeado = Math.round(v * 100) / 100;
  return redondeado || (v > 0 ? Math.round(v * 1000) / 1000 : 0);
}

function leerMicros(nutriments = {}, datos = null) {
  const n = datos || nutriments || {};
  const out = {};
  for (const [clave, campo] of Object.entries(MICROS_OFF)) {
    const valor = microNumero(n[datos ? clave : campo]);
    if (valor != null) out[clave] = valor;
  }
  return out;
}

// Claves nuevas: no se tocan las claves históricas de la app.
export const CLAVE_CACHE_ESCANER = 'mientrenamiento:escaner-cache';
export const CLAVE_HISTORIAL_ESCANER = 'mientrenamiento:escaner-historial';

const TTL_CACHE = 30 * 24 * 60 * 60 * 1000; // 30 días
const MAX_CACHE = 400;
const MAX_HISTORIAL = 50;

function leerJSON(clave, porDefecto) {
  try {
    const raw = localStorage.getItem(clave);
    return raw ? JSON.parse(raw) : porDefecto;
  } catch (_) {
    return porDefecto;
  }
}

function escribirJSON(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (_) { /* sin espacio */ }
}

function podarCache(cache) {
  const entradas = Object.entries(cache);
  if (entradas.length <= MAX_CACHE) return;
  const viejas = entradas
    .filter(([, v]) => !v?.manual)
    .sort((a, b) => (a[1]?.fecha || 0) - (b[1]?.fecha || 0));
  const aBorrar = viejas.slice(0, Math.max(0, entradas.length - MAX_CACHE));
  for (const [codigo] of aBorrar) delete cache[codigo];
}

function anadirHistorial(producto) {
  if (!producto?.codigo) return;
  const actual = leerJSON(CLAVE_HISTORIAL_ESCANER, []).filter(x => x?.codigo !== producto.codigo);
  actual.unshift({
    codigo: producto.codigo,
    nombre: producto.nombre || 'Producto sin nombre',
    marca: producto.marca || '',
    kcal: producto.kcal || 0,
    porcion: producto.porcion || 100,
    fuente: producto.fuente || 'Open Food Facts',
    fecha: new Date().toISOString(),
  });
  escribirJSON(CLAVE_HISTORIAL_ESCANER, actual.slice(0, MAX_HISTORIAL));
}

// Devuelve los últimos productos consultados, primero el más reciente.
export function historialEscaner() {
  const h = leerJSON(CLAVE_HISTORIAL_ESCANER, []);
  return Array.isArray(h) ? h : [];
}

// Borra el historial y la caché consultada. Conserva los productos creados a mano.
export function limpiarHistorialEscaner() {
  try { localStorage.removeItem(CLAVE_HISTORIAL_ESCANER); } catch (_) { /* nada */ }
  const cache = leerJSON(CLAVE_CACHE_ESCANER, {});
  for (const [codigo, entry] of Object.entries(cache)) {
    if (!entry?.manual) delete cache[codigo];
  }
  escribirJSON(CLAVE_CACHE_ESCANER, cache);
}

// El navegador debe exponer BarcodeDetector para poder escanear.
export function soportaCodigos() {
  return typeof window !== 'undefined' && !!window.BarcodeDetector;
}

const limpiarCodigo = valor => String(valor || '').replace(/[^0-9A-Za-z]/g, '');

// Escanea con la cámara hasta leer un código o agotar `tiempo` (ms).
// Devuelve el código o null; nunca lanza: la UI ofrecerá escribirlo a mano.
export async function escanearCodigo({ tiempo = 9000 } = {}) {
  if (!soportaCodigos()) return null;

  let video = null;
  let stream = null;
  let frame = 0;
  let timer = 0;
  let listo = false;

  // Apaga la cámara y retira el <video> pase lo que pase.
  function limpiar() {
    if (frame) cancelAnimationFrame(frame);
    if (timer) clearTimeout(timer);
    if (stream) {
      try { stream.getTracks().forEach(t => t.stop()); } catch (_) { /* nada */ }
      stream = null;
    }
    if (video) {
      try {
        video.pause();
        video.srcObject = null;
        video.remove();
      } catch (_) { /* nada */ }
      video = null;
    }
  }

  return new Promise(resolve => {
    const terminar = valor => {
      if (listo) return;
      listo = true;
      limpiar();
      resolve(valor);
    };

    const duracion = Math.max(0, Number(tiempo) || 0);
    timer = setTimeout(() => terminar(null), duracion);

    (async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          terminar(null);
          return;
        }

        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        // Si venció el tiempo pidiendo permiso, apagamos la cámara igualmente.
        if (listo) { s.getTracks().forEach(t => t.stop()); return; }
        stream = s;

        video = document.createElement('video');
        video.autoplay = true;
        video.muted = true;
        video.setAttribute('playsinline', '');
        // Fuera de pantalla en vez de display:none: algunos motores no entregan
        // fotogramas si el vídeo está completamente oculto.
        video.style.position = 'fixed';
        video.style.left = '-9999px';
        video.style.top = '0';
        video.style.width = '1px';
        video.style.height = '1px';
        video.style.opacity = '0';
        video.style.pointerEvents = 'none';
        document.body.appendChild(video);
        video.srcObject = stream;
        await video.play();
        if (listo) return;

        const detector = new window.BarcodeDetector({ formats: FORMATOS });
        const limite = Date.now() + duracion;

        const barrer = async () => {
          if (listo) return;
          if (Date.now() >= limite) { terminar(null); return; }
          try {
            const hallazgos = await detector.detect(video);
            if (listo) return;
            if (hallazgos && hallazgos.length) {
              const codigo = String(hallazgos[0].rawValue || hallazgos[0].raw_data || '').trim();
              if (codigo) { terminar(codigo); return; }
            }
          } catch (_) {
            // Un fotograma fallido no aborta el escaneo.
          }
          frame = requestAnimationFrame(barrer);
        };
        frame = requestAnimationFrame(barrer);
      } catch (_) {
        // Sin permiso, sin cámara o sin vídeo: devolvemos null sin ruido.
        terminar(null);
      }
    })();
  });
}

const redondear = valor => {
  const x = Number(valor);
  return Number.isFinite(x) ? Math.round(x * 10) / 10 : 0;
};

// Normaliza tanto una ficha de Open Food Facts como un producto escrito a mano.
function normalizar(p = {}, codigo = '') {
  const n = p.nutriments || {};
  const racion = Number(p.serving_quantity);
  const porcion = Number.isFinite(racion) && racion > 0 ? redondear(racion) : 100;
  const nombre = [p.product_name_es, p.product_name, p.generic_name,
    p.abbreviated_product_name, p.product_name_en]
    .map(x => String(x || '').trim()).find(Boolean) || '';

  return {
    codigo,
    nombre,
    marca: String(p.brands || '').trim(),
    kcal: redondear(n['energy-kcal_100g']),
    prot: redondear(n.proteins_100g),
    carbs: redondear(n.carbohydrates_100g),
    grasa: redondear(n.fat_100g),
    fibra: redondear(n.fiber_100g),
    azucares: redondear(n.sugars_100g),
    saturada: redondear(n['saturated-fat_100g']),
    sal: redondear(n.salt_100g),
    micros100: leerMicros(n),
    porcion,
    cantidad: String(p.quantity || '').trim(),
    ingredientes: String(p.ingredients_text || '').trim(),
    alergenos: String(p.allergens || '').trim(),
    trazas: String(p.traces || '').trim(),
    imagen: String(p.image_front_small_url || ''),
    completa: Number(p.completeness) || 0,
    sinDatos: String(p.nutrition_data || '') !== 'on' && !n['energy-kcal_100g'],
    fuente: 'Open Food Facts',
    url: `https://world.openfoodfacts.org/product/${encodeURIComponent(codigo)}`,
  };
}

// Consulta el producto. Solo viaja el código de barras; se guarda en caché.
// `soloCache` permite rellenar la ficha sin red (útil al abrir el historial).
export async function buscarAlimento(codigo, { soloCache = false } = {}) {
  const limpio = limpiarCodigo(codigo);
  if (!limpio) return null;

  const cache = leerJSON(CLAVE_CACHE_ESCANER, {});
  const entrada = cache[limpio];
  const ahora = Date.now();
  const sirve = entrada?.producto && (entrada.manual || ahora - (entrada.fecha || 0) < TTL_CACHE);
  if (sirve) return entrada.producto;
  if (soloCache) return entrada?.producto || null;

  try {
    const url = `${API_BASE}/${encodeURIComponent(limpio)}?fields=${CAMPOS}&cc=es&lc=es`;
    const respuesta = await fetch(url, { cache: 'no-store' });
    if (!respuesta || !respuesta.ok) return entrada?.producto || null;

    const datos = await respuesta.json();
    if (!datos || datos.status !== 'success' || !datos.product) return entrada?.producto || null;

    const producto = normalizar(datos.product, limpio);
    cache[limpio] = { producto, fecha: ahora };
    podarCache(cache);
    escribirJSON(CLAVE_CACHE_ESCANER, cache);
    anadirHistorial(producto);
    return producto;
  } catch (_) {
    return entrada?.producto || null;
  }
}

// Crea un producto cuando el código no está en Open Food Facts o hay que corregirlo.
export function productoManual(datos = {}) {
  const codigo = limpiarCodigo(datos.codigo) || `man${Date.now()}`;
  return {
    codigo,
    nombre: String(datos.nombre || '').trim() || 'Producto sin nombre',
    marca: String(datos.marca || '').trim(),
    kcal: redondear(datos.kcal),
    prot: redondear(datos.prot),
    carbs: redondear(datos.carbs),
    grasa: redondear(datos.grasa),
    fibra: redondear(datos.fibra),
    azucares: redondear(datos.azucares),
    saturada: redondear(datos.saturada),
    sal: redondear(datos.sal),
    micros100: leerMicros({}, datos.micros100 || {}),
    porcion: Math.max(1, redondear(datos.porcion) || 100),
    ingredientes: String(datos.ingredientes || '').trim(),
    alergenos: String(datos.alergenos || '').trim(),
    trazas: String(datos.trazas || '').trim(),
    imagen: '',
    completa: 1,
    sinDatos: false,
    fuente: 'Mis productos',
    url: '',
    manual: true,
  };
}

// Guarda un producto propio en la caché y en el historial, sin enviarlo a ningún servidor.
export function guardarProductoLocal(producto) {
  const limpio = limpiarCodigo(producto?.codigo);
  if (!limpio) return producto;
  const final = { ...producto, codigo: limpio, manual: true, fuente: producto.fuente || 'Mis productos' };
  const cache = leerJSON(CLAVE_CACHE_ESCANER, {});
  cache[limpio] = { producto: final, fecha: Date.now(), manual: true };
  podarCache(cache);
  escribirJSON(CLAVE_CACHE_ESCANER, cache);
  anadirHistorial(final);
  return final;
}

// Enlace público a la ficha del producto (útil como respaldo manual).
export function urlProducto(codigo) {
  return `https://world.openfoodfacts.org/product/${encodeURIComponent(limpiarCodigo(codigo))}`;
}
