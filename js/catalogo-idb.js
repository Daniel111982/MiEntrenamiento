// =====================================================================
// catalogo-idb.js · Caché local del catálogo comercial en IndexedDB
// ---------------------------------------------------------------------
// Una sola base local (`mientrenamiento`) con cuatro almacenes:
//   · catalogo: productos compactos, clave estable `id` (índice por `ean`).
//   · detalle:  fichas extendidas, clave `ean`.
//   · meta:     versión del catálogo y lotes de detalle ya descargados.
//   · suplementos: entidad independiente, clave `id` (v2). No sustituye a
//     los tres anteriores ni se sincroniza con Supabase.
//
// Es una caché de solo lectura para la app: no sustituye a Supabase ni
// guarda credenciales. Si IndexedDB no está disponible, alimentos.js sigue
// funcionando con la descarga directa del JSON como hasta ahora.
// =====================================================================

const NOMBRE_DB = 'mientrenamiento';
const VERSION_DB = 2;
const TAM_LOTE_IDB = 1000;

let promesaDb = null;

function pedir(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function terminar(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('transacción abortada'));
  });
}

export function abrirCatalogoIDB() {
  if (promesaDb) return promesaDb;
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  promesaDb = new Promise(resolve => {
    let req;
    try { req = indexedDB.open(NOMBRE_DB, VERSION_DB); }
    catch { resolve(null); return; }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('catalogo')) {
        const t = db.createObjectStore('catalogo', { keyPath: 'id' });
        t.createIndex('ean', 'ean', { unique: false });
      }
      if (!db.objectStoreNames.contains('detalle')) {
        const d = db.createObjectStore('detalle', { keyPath: 'ean' });
        d.createIndex('lote', 'lote', { unique: false });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'clave' });
      }
      // Migración v1 → v2: solo se CREA el almacén nuevo. Los stores
      // `catalogo`, `detalle` y `meta` no se tocan ni se vacían.
      if (!db.objectStoreNames.contains('suplementos')) {
        const s = db.createObjectStore('suplementos', { keyPath: 'id' });
        s.createIndex('nombre', 'nombre', { unique: false });
        s.createIndex('marca', 'marca', { unique: false });
        s.createIndex('tipo', 'tipo', { unique: false });
        s.createIndex('favorito', 'favorito', { unique: false });
        s.createIndex('origen', 'origen', { unique: false });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => { db.close(); promesaDb = null; };
      resolve(db);
    };
    req.onerror = () => { promesaDb = null; resolve(null); };
    req.onblocked = () => resolve(null);
  });
  return promesaDb;
}

async function meta(clave) {
  const db = await abrirCatalogoIDB();
  if (!db) return null;
  try {
    const tx = db.transaction('meta', 'readonly');
    return await pedir(tx.objectStore('meta').get(clave)) || null;
  } catch { return null; }
}

export const estadoCatalogoIDB = () => meta('catalogo');
export const versionLoteIDB = numero => meta(`lote:${numero}`);

export async function leerLoteIDB(numero) {
  const db = await abrirCatalogoIDB();
  if (!db) return null;
  try {
    const tx = db.transaction('detalle', 'readonly');
    const filas = await pedir(tx.objectStore('detalle').index('lote').getAll(Number(numero)));
    const mapa = {};
    for (const f of filas || {}) {
      const { lote, ...ficha } = f;
      mapa[String(ficha.ean)] = ficha;
    }
    return mapa;
  } catch { return null; }
}

export async function leerCatalogoIDB() {
  const db = await abrirCatalogoIDB();
  if (!db) return null;
  try {
    const tx = db.transaction('catalogo', 'readonly');
    return await pedir(tx.objectStore('catalogo').getAll());
  } catch { return null; }
}

// Reemplaza la caché por completo. La versión se escribe al final: si se
// interrumpe, la caché anterior sigue siendo válida y se reintentará.
export async function guardarCatalogoIDB(version, productos, info = {}) {
  const db = await abrirCatalogoIDB();
  if (!db) return false;
  try {
    const limpieza = db.transaction('catalogo', 'readwrite');
    limpieza.objectStore('catalogo').clear();
    await terminar(limpieza);
    for (let i = 0; i < productos.length; i += TAM_LOTE_IDB) {
      const tx = db.transaction('catalogo', 'readwrite');
      const store = tx.objectStore('catalogo');
      for (const p of productos.slice(i, i + TAM_LOTE_IDB)) store.put(p);
      await terminar(tx);
    }
    const fin = db.transaction('meta', 'readwrite');
    fin.objectStore('meta').put({
      clave: 'catalogo', version, total: productos.length,
      fecha: info.fecha || null, archivo: info.archivo || null,
      actualizado: Date.now(),
    });
    await terminar(fin);
    return true;
  } catch { return false; }
}

export async function leerDetalleIDB(ean) {
  const db = await abrirCatalogoIDB();
  if (!db) return null;
  try {
    const tx = db.transaction('detalle', 'readonly');
    return await pedir(tx.objectStore('detalle').get(String(ean))) || null;
  } catch { return null; }
}

export async function guardarDetalleIDB(fichas, numeroLote) {
  const db = await abrirCatalogoIDB();
  if (!db) return false;
  try {
    const tx = db.transaction(['detalle', 'meta'], 'readwrite');
    const store = tx.objectStore('detalle');
    for (const [ean, ficha] of Object.entries(fichas || {})) {
      store.put({ ...ficha, ean: String(ean), lote: Number(numeroLote) });
    }
    if (numeroLote != null) {
      tx.objectStore('meta').put({
        clave: `lote:${numeroLote}`, actualizado: Date.now(),
      });
    }
    await terminar(tx);
    return true;
  } catch { return false; }
}

export async function vaciarCatalogoIDB() {
  const db = await abrirCatalogoIDB();
  if (!db) return false;
  try {
    const tx = db.transaction(['catalogo', 'detalle', 'meta'], 'readwrite');
    for (const nombre of ['catalogo', 'detalle', 'meta']) {
      tx.objectStore(nombre).clear();
    }
    await terminar(tx);
    return true;
  } catch { return false; }
}
