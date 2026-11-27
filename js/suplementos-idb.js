// =====================================================================
// suplementos-idb.js · Persistencia local de la entidad `suplemento`
// ---------------------------------------------------------------------
// Reutiliza la misma base `mientrenamiento` (v2) que catalogo-idb.js.
// No modifica los almacenes `catalogo`, `detalle` ni `meta`, y no envía
// nada a Supabase. Funciona sin red porque todo vive en IndexedDB.
//
// El catálogo HSN se importa como datos más dentro de este mismo store:
// no hay base paralela ni catálogo desconectado. La importación es
// idempotente, conserva historial de versiones y nunca borra fichas del
// usuario ni tomas del Diario.
// =====================================================================

import { abrirCatalogoIDB } from './catalogo-idb.js';
import HSN_CATALOGO from './hsn-catalogo.js';
import {
  ID_CONTROL_HSN, ID_CONTROL_SEMILLA, MODELO_NORMALIZACION_COMPONENTES,
  VERSION_MODELO, buscarSuplementos, normalizarSuplemento,
  productosBase, variantesDeProducto, semillaConControl, semillaSuplementos,
} from './suplementos.js';

const STORE = 'suplementos';
const LOTE = 400;
let promesaImportacion = null;
let importadoEnSesion = false;

// La categoría HSN se expone solo en lectura: meterla en el registro
// persistido cambiaría huella() y reescribiría las 3.512 fichas validadas.
const CATEGORIAS_HSN = new Map(
  [...(HSN_CATALOGO?.bases || []), ...(HSN_CATALOGO?.variantes || [])]
    .filter(e => e?.id && e?.categoria)
    .map(e => [e.id, e.categoria])
);
function enriquecerCategoria(sup) {
  if (!sup || sup.categoria) return sup;
  const categoria = CATEGORIAS_HSN.get(sup.id)
    || (sup.productoBaseId ? CATEGORIAS_HSN.get(sup.productoBaseId) : null);
  return categoria ? { ...sup, categoria } : sup;
}

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
async function abrir() {
  const db = await abrirCatalogoIDB();
  if (!db || !db.objectStoreNames.contains(STORE)) return null;
  return db;
}

// Compara el contenido verificable, sin los campos volátiles de la ficha.
// Las claves se ordenan: cambiar el orden en que se construye un objeto no
// debe reescribir 3.512 fichas HSN cuando los valores son idénticos.
function estable(valor) {
  if (Array.isArray(valor)) return valor.map(estable);
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(Object.keys(valor).sort().map(k => [k, estable(valor[k])]));
  }
  return valor;
}
function huella(registro) {
  const copia = { ...registro };
  delete copia.actualizado;
  delete copia.creado;
  delete copia.favorito;
  delete copia.historial;
  delete copia.version;
  delete copia.pendienteVerificacion;
  return JSON.stringify(estable(copia));
}

async function filasStore(db) {
  const tx = db.transaction(STORE, 'readonly');
  return (await pedir(tx.objectStore(STORE).getAll())) || [];
}

// La semilla se escribe una sola vez. El registro de control evita que una
// ficha borrada por el usuario reaparezca en la siguiente carga.
export async function inicializarSuplementos() {
  const db = await abrir();
  if (!db) return { ok: false, insertados: 0, motivo: 'IndexedDB no disponible' };
  try {
    const control = await pedir(db.transaction(STORE, 'readonly').objectStore(STORE).get(ID_CONTROL_SEMILLA));
    let insertados = 0;
    if (!control) {
      const alta = db.transaction(STORE, 'readwrite');
      const store = alta.objectStore(STORE);
      for (const s of semillaConControl()) store.put(s);
      await terminar(alta);
      insertados = semillaSuplementos().length;
    }
    await importarCatalogoHSN();
    return {
      ok: true, insertados,
      motivo: insertados ? 'semilla inicializada y catálogo HSN verificado' : 'semilla ya inicializada; catálogo HSN verificado',
    };
  } catch (e) {
    return { ok: false, insertados: 0, motivo: e?.message || 'No se pudo inicializar' };
  }
}

// ---------------------------------------------------------------------
// Importación controlada del catálogo HSN desde el archivo estático local.
// Sin red, sin borrados y reanudable: si se interrumpe, una nueva llamada
// compara y escribe solo lo que falta o ha cambiado.
// ---------------------------------------------------------------------
export function importarCatalogoHSN({ forzar = false } = {}) {
  if (!forzar && importadoEnSesion) return Promise.resolve(informeMemoria || {
    ok: true, nuevos: 0, actualizados: 0, sinCambios: 0, descatalogados: 0, motivo: 'catálogo ya verificado en esta sesión',
  });
  if (!forzar && promesaImportacion) return promesaImportacion;
  promesaImportacion = ejecutarImportacionHSN({ forzar })
    .then(informe => { importadoEnSesion = true; informeMemoria = informe; return informe; })
    .finally(() => { promesaImportacion = null; });
  return promesaImportacion;
}
let informeMemoria = null;

async function ejecutarImportacionHSN({ forzar }) {
  const db = await abrir();
  if (!db) return { ok: false, motivo: 'IndexedDB no disponible', nuevos: 0, actualizados: 0, sinCambios: 0, descatalogados: 0 };
  const fecha = new Date().toISOString();
  const filas = await filasStore(db);
  const previas = new Map(filas.map(f => [f?.id, f]).filter(([id]) => Boolean(id)));
  const controlPrevio = previas.get(ID_CONTROL_HSN);
  if (!forzar && controlPrevio?.estado === 'completo'
    && controlPrevio.version === (HSN_CATALOGO?.version || 1)
    && controlPrevio.modeloNormalizacion === MODELO_NORMALIZACION_COMPONENTES
    && controlPrevio.informe) {
    importadoEnSesion = true;
    informeMemoria = { ...controlPrevio.informe, sinCambios: controlPrevio.informe.sinCambios || 0, desdeCache: true };
    return informeMemoria;
  }
  const entradas = [...(HSN_CATALOGO?.bases || []), ...(HSN_CATALOGO?.variantes || [])];
  const idsNuevos = new Set(entradas.map(e => e?.id).filter(Boolean));
  const cambios = [];
  const informe = {
    ok: true, version: HSN_CATALOGO?.version || 1, fecha,
    nuevos: 0, actualizados: 0, sinCambios: 0, descatalogados: 0,
    totalBases: HSN_CATALOGO?.totalBases || 0,
    totalVariantes: HSN_CATALOGO?.totalVariantes || 0,
    fuente: HSN_CATALOGO?.fuente || null,
  };

  for (const entrada of entradas) {
    const limpio = normalizarSuplemento(entrada);
    if (!limpio) continue;
    const previo = previas.get(limpio.id);
    const cambio = previo ? huella(previo) !== huella(limpio) : true;
    const historial = Array.isArray(previo?.historial) ? [...previo.historial] : [];
    if (previo && cambio) {
      historial.push({ version: previo.version || 1, actualizado: previo.actualizado || null, datos: previo });
      informe.actualizados++;
    } else if (previo) {
      informe.sinCambios++;
    } else {
      informe.nuevos++;
    }
    limpio.historial = historial.slice(-20);
    limpio.creado = previo?.creado || limpio.creado;
    limpio.favorito = Boolean(previo?.favorito);
    limpio.version = previo ? ((previo.version || 1) + (cambio ? 1 : 0)) : 1;
    limpio.estadoCatalogo = 'activo';
    limpio.actualizado = fecha;
    if (!forzar && previo && !cambio) continue;
    cambios.push(limpio);
  }

  // Descatalogados: se MARCAN, nunca se borran y su historial sigue disponible.
  if (controlPrevio?.estado === 'completo' || forzar) {
    for (const [id, previo] of previas) {
      if (!id || !id.startsWith('hsn-') || idsNuevos.has(id) || !previo) continue;
      if (previo.estadoCatalogo === 'descatalogado') continue;
      const historial = Array.isArray(previo.historial) ? [...previo.historial] : [];
      historial.push({ version: previo.version || 1, actualizado: previo.actualizado || null, datos: previo });
      const marcado = normalizarSuplemento({
        ...previo, historial: historial.slice(-20), version: (previo.version || 1) + 1,
        estadoCatalogo: 'descatalogado', actualizado: fecha,
      });
      if (marcado) cambios.push(marcado);
      informe.descatalogados++;
    }
  }

  for (let i = 0; i < cambios.length; i += LOTE) {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    for (const registro of cambios.slice(i, i + LOTE)) store.put(registro);
    await terminar(tx);
  }

  const control = {
    id: ID_CONTROL_HSN, tipo: 'control', nombre: 'Control de importación HSN',
    esEjemplo: true, origen: 'sistema', estado: 'completo', version: informe.version,
    modeloNormalizacion: MODELO_NORMALIZACION_COMPONENTES,
    fecha: HSN_CATALOGO?.fechaImportacion || null, actualizado: fecha, informe,
  };
  const txControl = db.transaction(STORE, 'readwrite');
  txControl.objectStore(STORE).put(control);
  await terminar(txControl);
  return informe;
}

export async function informeImportacionHSN() {
  if (informeMemoria) return informeMemoria;
  const db = await abrir();
  if (!db) return null;
  try {
    const control = await pedir(db.transaction(STORE, 'readonly').objectStore(STORE).get(ID_CONTROL_HSN));
    return control?.informe || null;
  } catch { return null; }
}

export async function guardarSuplemento(raw) {
  const sup = normalizarSuplemento(raw);
  if (!sup) return null;
  const db = await abrir();
  if (!db) return sup; // sin IDB se devuelve normalizado; la UI avisa
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(sup);
    await terminar(tx);
    return sup;
  } catch { return null; }
}

export async function obtenerSuplemento(id) {
  const db = await abrir();
  if (!db) return null;
  try {
    const tx = db.transaction(STORE, 'readonly');
    const raw = await pedir(tx.objectStore(STORE).get(String(id)));
    return raw ? enriquecerCategoria(normalizarSuplemento(raw)) : null;
  } catch { return null; }
}

export async function listarSuplementos(opciones = {}) {
  const { soloBases = false, incluirDescatalogados = true } = opciones || {};
  const db = await abrir();
  if (!db) return semillaSuplementos().filter(s => !soloBases || !s.esVarianteHSN);
  try {
    const tx = db.transaction(STORE, 'readonly');
    const filas = await pedir(tx.objectStore(STORE).getAll());
    return (filas || [])
      .filter(f => f?.id !== ID_CONTROL_SEMILLA && f?.id !== ID_CONTROL_HSN && f?.tipo !== 'control')
      .filter(f => incluirDescatalogados || f?.estadoCatalogo !== 'descatalogado')
      .filter(f => !soloBases || !f?.esVarianteHSN)
      .map(s => enriquecerCategoria(normalizarSuplemento(s))).filter(Boolean)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  } catch { return semillaSuplementos().filter(s => !soloBases || !s.esVarianteHSN); }
}

export async function buscarSuplementosIDB(q, filtros, opciones = {}) {
  return buscarSuplementos(await listarSuplementos(opciones), q, filtros);
}

// Catálogo integrado: base ↔ variantes se resuelve por productoBaseId, sin
// duplicar el store ni volver a importar el catálogo HSN.
export async function listarProductosBaseIDB(opciones = {}) {
  return productosBase(await listarSuplementos(opciones));
}

export async function listarVariantesDeBaseIDB(baseId, opciones = {}) {
  return variantesDeProducto(await listarSuplementos(opciones), baseId);
}

export async function borrarSuplemento(id) {
  const clave = String(id || '');
  if (!clave || clave === ID_CONTROL_SEMILLA || clave === ID_CONTROL_HSN || clave.startsWith('hsn-')) return false;
  const db = await abrir();
  if (!db) return false;
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(clave);
    await terminar(tx);
    return true;
  } catch { return false; }
}

export async function alternarFavorito(id) {
  const actual = await obtenerSuplemento(id);
  if (!actual) return null;
  return guardarSuplemento({ ...actual, favorito: !actual.favorito });
}

// Restablece únicamente los 5 ejemplos originales; respeta las fichas propias.
export async function restablecerSemilla() {
  const db = await abrir();
  if (!db) return 0;
  let n = 0;
  for (const s of semillaSuplementos()) {
    const existe = await obtenerSuplemento(s.id);
    if (!existe) { await guardarSuplemento(s); n++; }
  }
  return n;
}

export async function infoSuplementosIDB() {
  const db = await abrir();
  if (!db) return { disponible: false, version: VERSION_MODELO, store: STORE, total: 0, base: 'mientrenamiento', dbVersion: null };
  return {
    disponible: true, version: VERSION_MODELO, store: STORE,
    total: (await listarSuplementos()).length,
    basesHSN: (await listarSuplementos({ soloBases: true })).filter(s => s.origen === 'hsn-oficial').length,
    base: 'mientrenamiento', dbVersion: db.version,
  };
}
