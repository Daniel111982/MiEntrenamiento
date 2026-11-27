// =====================================================================
// suplementos-ui.js · Sección #nutricion/suplementos
// ---------------------------------------------------------------------
// Usa el mismo <dialog id="modal">, la misma subnavegación y las mismas
// clases que el resto de DanTal. Registra sus listeners UNA sola vez con
// `data-sup-a` (prefijo propio) para no chocar con el `data-a` de app.js.
// =====================================================================

import { macrosDe, alergenosDe, ALERGENOS_UE, ESTADOS_ALERGENO } from './alimentos.js';
import { CLAVES_MICROS } from './escaner.js';
import {
  CAMPOS_MACROS, ESTADOS_DATO, TIPOS_SUPLEMENTO, UNIDADES_CONVERSION,
  calcularToma, detectarDuplicados, entradaSuplemento,
  esVarianteProducto, identificadoresProducto, validarGTIN, variantesDeProducto,
  ID_CONTROL_SEMILLA, VERSION_MODELO,
} from './suplementos.js';
import {
  alternarFavorito, borrarSuplemento, guardarSuplemento,
  inicializarSuplementos, listarSuplementos, obtenerSuplemento,
  listarVariantesDeBaseIDB, restablecerSemilla, infoSuplementosIDB,
  importarCatalogoHSN, informeImportacionHSN,
} from './suplementos-idb.js';

const UNIDADES_MICRO = {
  calcio: 'mg', hierro: 'mg', potasio: 'mg', magnesio: 'mg', fosforo: 'mg', zinc: 'mg',
  vitA: 'µg', vitC: 'mg', vitD: 'µg', vitE: 'mg', vitB1: 'mg', vitB2: 'mg',
  vitB6: 'mg', vitB12: 'µg', folato: 'µg',
};
const ETIQUETA_ESTADO = { confirmado: '✅ Confirmado', estimado: '≈ Estimado', desconocido: '? Desconocido' };
const uiSup = {
  q: '', tipo: '', estadoDato: '', soloFav: false,
  marca: '', linea: '', categoria: '', formato: '', sabor: '', soloHSN: false,
  lista: [], todas: [], indice: new Map(), cargando: true, error: '',
};
let api = null;
let listeners = false;

export function configurarSuplementosUI(config) {
  api = { ...(api || {}), ...(config || {}) };
  if (listeners) return;
  listeners = true;
  document.addEventListener('click', alClic);
  document.addEventListener('submit', alEnviar);
  document.addEventListener('input', alEscribir);
}

// ---------- Vista ----------
export function vistaSuplementos() {
  uiSup.cargando = true;
  queueMicrotask(() => { recargar().catch(() => { uiSup.error = 'No se pudo leer IndexedDB.'; pintar(); }); });
  return `<section id="suplementosRoot" class="sup-root">
    <div id="supFiltros">${htmlFiltros()}</div>
    <div id="supLista" class="sup-lista"><p class="tenue centro">Cargando suplementos guardados en este dispositivo…</p></div>
    <p id="supInfo" class="tenue centro"></p>
  </section>`;
}

function opcionesFiltro(valores, actual, todo = 'Todos') {
  const esc = api?.esc || (s => String(s ?? ''));
  return `<option value="" ${!actual ? 'selected' : ''}>${esc(todo)}</option>`
    + valores.map(v => `<option value="${esc(v)}" ${v === actual ? 'selected' : ''}>${esc(v)}</option>`).join('');
}
function valoresUnicos(clave, desdeVariantes = false) {
  const out = new Set();
  for (const s of uiSup.lista) {
    if (desdeVariantes) {
      for (const v of (s.variantesResumen || [])) {
        const valor = v?.[clave];
        if (valor) out.add(String(valor));
      }
    } else if (s[clave]) out.add(String(s[clave]));
  }
  return [...out].sort((a, b) => a.localeCompare(b, 'es'));
}
function htmlFiltros() {
  const esc = api?.esc || (s => String(s ?? ''));
  return `<div class="tarjeta sup-filtros">
    <div class="buscador"><span>🔍</span><input type="search" class="buscar" data-sup-buscar
      placeholder="Nombre, marca, SKU o EAN" value="${esc(uiSup.q)}" aria-label="Buscar suplementos"></div>
    <div class="chips scroll">
      <button class="chip ${!uiSup.tipo ? 'on' : ''}" data-sup-a="supFiltroTipo" data-v="">Todos</button>
      ${TIPOS_SUPLEMENTO.map(t => `<button class="chip ${uiSup.tipo === t.clave ? 'on' : ''}" data-sup-a="supFiltroTipo" data-v="${t.clave}">${esc(t.nombre)}</button>`).join('')}
    </div>
    <div class="sup-filtros-hsn">
      <label class="campo">Marca<select data-sup-a="supFiltroMarca">${opcionesFiltro(valoresUnicos('marca'), uiSup.marca)}</select></label>
      <label class="campo">Línea<select data-sup-a="supFiltroLinea">${opcionesFiltro(valoresUnicos('linea'), uiSup.linea)}</select></label>
      <label class="campo">Categoría<select data-sup-a="supFiltroCategoria">${opcionesFiltro(valoresUnicos('categoria'), uiSup.categoria)}</select></label>
      <label class="campo">Formato<select data-sup-a="supFiltroFormato">${opcionesFiltro(valoresUnicos('formato', true).concat(valoresUnicos('formato')).filter((v, i, a) => a.indexOf(v) === i), uiSup.formato)}</select></label>
      <label class="campo">Sabor<select data-sup-a="supFiltroSabor">${opcionesFiltro(valoresUnicos('sabor', true), uiSup.sabor)}</select></label>
    </div>
    <div class="fila sup-filtros-estado">
      <div class="chips">
        ${ESTADOS_DATO.map(e => `<button class="chip ${uiSup.estadoDato === e ? 'on' : ''}" data-sup-a="supFiltroEstado" data-v="${e}">${esc(ETIQUETA_ESTADO[e])}</button>`).join('')}
        <button class="chip ${uiSup.estadoDato === '' ? 'on' : ''}" data-sup-a="supFiltroEstado" data-v="">Cualquier estado</button>
        <button class="chip ${uiSup.soloHSN ? 'on' : ''}" data-sup-a="supFiltroHSN">Catálogo HSN</button>
      </div>
      <label class="chip"><input type="checkbox" data-sup-a="supFiltroFav" ${uiSup.soloFav ? 'checked' : ''}> ⭐ Favoritos</label>
    </div>
    <div class="botones">
      <button class="btn" data-sup-a="supNuevo">＋ Registrar suplemento</button>
      <button class="btn sec" data-sup-a="supRestablecer">↺ Restablecer ejemplos</button>
      <button class="btn sec" data-sup-a="supActualizarHSN">↻ Actualizar catálogo HSN</button>
    </div>
  </div>`;
}

function filtrosActuales() {
  return {
    tipo: uiSup.tipo, estado: uiSup.estadoDato, soloFavoritos: uiSup.soloFav,
    marca: uiSup.marca, linea: uiSup.linea, categoria: uiSup.categoria,
    formato: uiSup.formato, sabor: uiSup.sabor, soloHSN: uiSup.soloHSN,
  };
}

async function recargar() {
  await inicializarSuplementos();
  uiSup.todas = await listarSuplementos();
  // La lista principal muestra productos (bases). Las variantes propias se
  // consultan desde la ficha de su base, igual que las variantes HSN.
  uiSup.lista = uiSup.todas.filter(s => !s.esVarianteHSN && !esVarianteProducto(s));
  uiSup.indice = new Map(uiSup.todas.map(s => [s.id, s]));
  uiSup.cargando = false;
  uiSup.error = '';
  pintar();
}

function pintar() {
  const root = document.querySelector('#suplementosRoot');
  if (!root) return;
  const filtros = document.querySelector('#supFiltros');
  const listaEl = document.querySelector('#supLista');
  const info = document.querySelector('#supInfo');
  if (filtros) filtros.innerHTML = htmlFiltros();
  if (info) {
    const i = infoSuplementosIDB;
    Promise.resolve(i()).then(x => {
      if (info.isConnected) info.textContent = `${uiSup.lista.length} ficha(s) en este dispositivo · ${x.disponible ? `IndexedDB ${x.base} v${x.dbVersion} · sincronización desactivada` : 'sin IndexedDB: solo ejemplos en memoria'}`;
    }).catch(() => {});
  }
  if (!listaEl) return;
  if (uiSup.cargando) { listaEl.innerHTML = '<p class="tenue centro">Cargando suplementos guardados en este dispositivo…</p>'; return; }
  if (uiSup.error) { listaEl.innerHTML = `<p class="aviso">${api.esc(uiSup.error)}</p>`; return; }
  const filtradas = (uiSup.fnBuscar || (lista => lista))(uiSup.lista, uiSup.q, filtrosActuales());
  if (!filtradas.length) {
    listaEl.innerHTML = `<p class="tenue centro">Sin resultados. Prueba otra búsqueda o registra un suplemento nuevo.</p>`;
    return;
  }
  listaEl.innerHTML = filtradas.map(tarjeta).join('');
}

function tarjeta(s) {
  const esc = api.esc;
  const estado = ESTADOS_DATO.includes(s.estado) ? s.estado : 'desconocido';
  const macros = Object.keys(s.macros100 || {}).length;
  const esHSN = s.origen === 'hsn-oficial';
  const nPropias = variantesDeProducto(uiSup.todas, s.id).length;
  const nVariantes = nPropias || Number(s.numVariantes) || (s.variantesResumen || []).length || 0;
  const sub = [
    s.marca, s.lineaNombre || s.linea, s.tipoProducto || TIPOS_SUPLEMENTO.find(t => t.clave === s.tipo)?.nombre || s.tipo,
    s.presentacion || s.formato, s.ean ? `EAN ${s.ean}` : '',
    s.gtin && s.gtin !== s.ean ? `GTIN ${s.gtin}` : '',
    s.skuOficial ? `SKU ${s.skuOficial}` : '',
  ].filter(Boolean).join(' · ');
  const origen = esHSN
    ? `🏷️ Catálogo oficial HSN · ${esc(nVariantes)} variante(s)`
    : `${s.esEjemplo ? (s.origen === 'semilla-real-off' ? '📚 Ejemplo con datos reales verificables' : '📝 Ejemplo pendiente de ficha verificable') : '✍️ Registro del usuario'}${nVariantes ? ` · ${esc(nVariantes)} variante(s)` : ''}`;
  return `<article class="tarjeta sup-tarjeta ${esHSN ? 'sup-tarjeta-hsn' : ''}">
    <div class="fila"><h3>💊 ${esc(s.nombre)}</h3><span class="badge sup-estado ${estado}">${esc(ETIQUETA_ESTADO[estado])}</span></div>
    <p class="tenue">${esc(sub)}</p>
    <p class="sup-dato">${macros ? `${macros} dato(s) de composición declarados` : 'Sin composición declarada: datos pendientes'}${s.dosisDeclarada?.texto ? ` · ${esc(s.dosisDeclarada.texto)}` : ''}</p>
    <p class="tenue">${origen}</p>
    ${(s.pendienteVerificacion || []).length ? `<p class="sup-pendiente">Pendiente: ${esc(s.pendienteVerificacion.join(', '))}</p>` : ''}
    <div class="botones">
      <button class="btn sec" data-sup-a="supFicha" data-id="${esc(s.id)}">📋 Ficha</button>
      ${nVariantes > 0
    ? `<button class="btn" data-sup-a="supVariantesToma" data-id="${esc(s.id)}">＋ Tomar variante</button>`
    : `<button class="btn" data-sup-a="supToma" data-id="${esc(s.id)}">＋ Tomar</button>`}
      <button class="icono peq" data-sup-a="supFav" data-id="${esc(s.id)}" title="Favorito">${s.favorito ? '⭐' : '☆'}</button>
      ${s.esEjemplo
    ? `<button class="icono peq" data-sup-a="supDuplicar" data-id="${esc(s.id)}" title="Copiar como ficha propia">⧉</button>`
    : `<button class="icono peq" data-sup-a="supEditar" data-id="${esc(s.id)}" title="Editar">✎</button>
           <button class="icono peq" data-sup-a="supBorrar" data-id="${esc(s.id)}" title="Borrar">🗑️</button>`}
    </div>
  </article>`;
}

// ---------- Ficha ----------
const guion = v => (v == null || v === '' ? '—' : String(v));
function fila(label, valor, titulo) {
  const t = titulo ? ` title="${api.esc(titulo)}"` : '';
  return `<div class="fila sup-fila"><span${t}>${api.esc(label)}</span><b>${api.esc(guion(valor))}</b></div>`;
}

// Etiquetas legibles para los aminoácidos declarados. La clave canónica es la
// bare; las claves amino_* originales se conservan en `componentesAlias` y se
// muestran como procedencia, nunca como una fila duplicada.
const ETIQUETAS_AMINOACIDOS = {
  alanina: 'Alanina', arginina: 'Arginina', acido_aspartico: 'Ácido aspártico',
  cisteina: 'Cisteína', acido_glutamico: 'Ácido glutámico', glicina: 'Glicina',
  histidina: 'Histidina', isoleucina: 'Isoleucina', leucina: 'Leucina',
  lisina: 'Lisina', metionina: 'Metionina', fenilalanina: 'Fenilalanina',
  prolina: 'Prolina', serina: 'Serina', tirosina: 'Tirosina',
  treonina: 'Treonina', triptofano: 'Triptófano', valina: 'Valina',
};

export function etiquetaComponente(clave) {
  const k = String(clave ?? '');
  if (ETIQUETAS_AMINOACIDOS[k]) return ETIQUETAS_AMINOACIDOS[k];
  // Respaldos legibles sin inventar significado: solo se separa el identificador.
  return k.replace(/(\d)_(\d)/g, '$1,$2')
    .replace(/_/g, ' ')
    .replace(/(\d)([A-Za-z])/g, '$1 $2')
    .replace(/\bkj\b/gi, 'kJ')
    .replace(/\bkcal\b/gi, 'kcal')
    .replace(/^[a-záéíóúñü]/, c => c.toLocaleUpperCase('es-ES'));
}
function tablaMacros(s) {
  const keys = CAMPOS_MACROS.filter(k => k in (s.macros100 || {}));
  if (!keys.length) return '<p class="tenue">Sin macros declarados. No se han inventado ceros.</p>';
  const racion = s.tamanoRacion?.gramos;
  const porRacion = racion ? macrosDe(s.macros100, racion) : null;
  return `<table class="tabla-sup"><thead><tr><th>Nutriente</th><th>Por 100 g</th>${porRacion ? `<th>Por ración (${api.fmtDec(racion)} g)</th>` : ''}</tr></thead><tbody>
    ${keys.map(k => `<tr><td>${api.esc(k)}</td><td>${api.fmtDec(s.macros100[k])}</td>${porRacion ? `<td>${k in porRacion ? api.fmtDec(porRacion[k]) : '—'}</td>` : ''}</tr>`).join('')}
  </tbody></table>`;
}
function tablaMicros(s) {
  const keys = CLAVES_MICROS.filter(k => k in (s.micros100 || {}));
  if (!keys.length) return '<p class="tenue">Sin micronutrientes declarados en la ficha.</p>';
  return `<table class="tabla-sup"><thead><tr><th>Micronutriente</th><th>Por 100 g</th><th>Unidad</th></tr></thead><tbody>
    ${keys.map(k => `<tr><td>${api.esc(k)}</td><td>${api.fmtDec(s.micros100[k])}</td><td>${UNIDADES_MICRO[k] || ''}</td></tr>`).join('')}
  </tbody></table>`;
}
function bloqueAlergenos(s) {
  if (!s.alergenos14) return '<p class="tenue">Sin declaración de alérgenos en la ficha.</p>';
  const lista = alergenosDe({ alergenos14: s.alergenos14 });
  return `<div class="sup-alergenos">${lista.map(a => `<span class="chip ${a.estado.clave}">${api.esc(a.nombre)}: ${api.esc(a.estado.texto)}</span>`).join('')}</div>`;
}
function htmlVariantes(s) {
  const esc = api.esc;
  const resumen = Array.isArray(s.variantesResumen) ? s.variantesResumen : [];
  const propias = variantesDeProducto(uiSup.todas, s.id);
  const idsPropias = new Set(propias.map(v => v.id));
  const entradas = [
    ...propias,
    ...resumen.filter(v => v && !idsPropias.has(v.id)),
  ];
  if (!entradas.length) return '';
  return `<h3>Variantes comerciales declaradas (${entradas.length})</h3>
    <p class="tenue">Cada variante conserva su identidad y sus propios códigos. La composición no se comparte entre variantes salvo declaración explícita en su ficha.</p>
    <div class="sup-variantes">
      ${entradas.map(v => {
    const id = esc(v.id || '');
    const datos = [
      v.sabor ? `Sabor: ${esc(v.sabor)}` : '',
      v.formato || v.formatoDeclarado ? `Formato: ${esc(v.formato || v.formatoDeclarado)}` : '',
      v.pesoDeclarado ? `Peso: ${esc(v.pesoDeclarado)}` : '',
      v.unidadVenta ? `Venta: ${esc(v.unidadVenta)}` : '',
      v.sku || v.skuOficial ? `SKU: ${esc(v.sku || v.skuOficial)}` : '',
      v.ean ? `EAN: ${esc(v.ean)}` : '',
      v.gtin && v.gtin !== v.ean ? `GTIN: ${esc(v.gtin)}` : '',
      v.precio != null ? `${api.fmtDec(v.precio)} €` : '',
      v.disponibilidad ? esc(v.disponibilidad) : '',
    ].filter(Boolean).join(' · ');
    return `<div class="sup-variante">
        <b>${esc(v.nombreComercial || v.nombre || s.nombre)}</b>
        <p class="tenue">${datos || 'Sin presentación declarada.'}</p>
        <div class="botones">
          ${id ? `<button class="btn sec" data-sup-a="supVerVariante" data-id="${id}">Ver ficha</button>
          <button class="btn" data-sup-a="supToma" data-id="${id}">＋ Tomar</button>` : ''}
          ${idsPropias.has(v.id) ? `<button class="icono peq" data-sup-a="supEditar" data-id="${id}" title="Editar variante">✎</button>` : ''}
        </div>
      </div>`;
  }).join('')}
    </div>`;
}

function htmlIdentificadores(s) {
  const esc = api.esc;
  const ids = identificadoresProducto(s);
  if (!ids.length) return '<p class="tenue">Sin códigos declarados: no se han inventado identificadores.</p>';
  return `<table class="tabla-sup"><thead><tr><th>Identificador</th><th>Valor declarado</th><th>Comprobación</th><th>Origen</th></tr></thead><tbody>
    ${ids.map(id => {
    const estado = id.valido === null ? 'No aplica (SKU interno)'
      : id.valido ? `✅ ${esc(id.tipo)} · dígito de control correcto`
        : `⚠️ ${esc(id.motivo || 'Formato no válido')}`;
    return `<tr><td>${esc(id.clase)}</td><td>${esc(id.valor)}</td><td>${estado}</td><td>${esc(id.origen)}</td></tr>`;
  }).join('')}
  </tbody></table>`;
}

function htmlFicha(s) {
  const esc = api.esc;
  const trazas = Object.entries(s.trazabilidadCampos || {});
  const componentes = Object.entries(s.componentes || {});
  const trazasComponentes = s.trazabilidadComponentes || {};
  const base = esVarianteProducto(s) ? uiSup.todas.find(x => x.id === s.productoBaseId) : null;
  return `<div class="sup-ficha">
    <h2>💊 ${esc(s.nombre)}</h2>
    <p class="tenue">${s.origen === 'hsn-oficial' ? 'Catálogo oficial HSN' : (s.esEjemplo ? (s.origen === 'semilla-real-off' ? 'Ejemplo con datos reales verificables' : 'Ejemplo pendiente de ficha verificable') : 'Registro del usuario')} · ${esc(ETIQUETA_ESTADO[s.estado] || s.estado)}</p>
    ${fila('Tipo de producto', s.tipoProducto)}${fila('Línea', s.lineaNombre || s.linea)}${fila('Categoría', s.categoria)}
    <h3>Producto base y variantes</h3>
    ${base ? `<p>Variante de <button class="enlace" data-sup-a="supFicha" data-id="${esc(base.id)}">${esc(base.nombre)}</button></p>` : '<p class="tenue">Esta ficha es un producto base.</p>'}
    ${fila('Nombre comercial', s.nombreComercial)}${fila('Descripción', s.descripcion)}
    ${htmlVariantes(s)}
    ${!s.esEjemplo && !base ? `<p><button class="btn sec" data-sup-a="supNuevaVariante" data-id="${esc(s.id)}">＋ Registrar variante de este producto</button></p>` : ''}
    <h3>Identificadores y códigos</h3>
    ${htmlIdentificadores(s)}
    <h3>Identidad y presentación</h3>
    ${fila('Marca', s.marca)}${fila('Tipo', s.tipo)}${fila('Formato', s.formato || s.pesoDeclarado)}${fila('Presentación', s.presentacion || s.unidadesDeclaradas)}
    ${fila('Sabor', s.sabor)}${fila('Unidad de venta', s.unidadVenta)}
    ${fila('Cantidad del producto', s.cantidadProducto)}${fila('Fabricante', s.fabricante)}
    ${fila('Precio verificado', s.precio != null ? `${api.fmtDec(s.precio)} ${s.moneda || ''}`.trim() : null)}
    ${fila('Disponibilidad', s.disponibilidad)}
    <h3>Dosis, ración y cantidad consumida</h3>
    <p class="tenue">Son tres conceptos distintos. La dosis del fabricante nunca es una recomendación personalizada de DanTal.</p>
    ${fila('Dosis declarada por el fabricante', s.dosisDeclarada?.texto || (s.dosisDeclarada?.estado === 'desconocido' ? 'Desconocida' : '—'))}
    ${fila('Ración declarada en el envase', s.racionDeclaradaTexto)}
    ${fila('Tamaño de ración', s.tamanoRacion ? `${api.fmtDec(s.tamanoRacion.gramos)} g (${s.tamanoRacion.base})` : null)}
    ${fila('Servicios declarados', s.serviciosDeclarados)}
    ${fila('Gramos por cápsula/comprimido', s.gramosPorUnidad)}${fila('Gramos por cucharada', s.gramosPorCucharada)}${fila('Densidad (g/ml)', s.densidadGml)}
    <h3>Composición declarada</h3>
    ${tablaMacros(s)}
    ${s.conversionDeclarada ? `<p class="aviso">🔁 ${esc(s.conversionDeclarada.nota || 'Conversión registrada desde la ración declarada.')}</p>` : ''}
    ${Object.keys(s.macrosRacionDeclarada || {}).length
    ? `<details><summary>Tabla original por ración declarada</summary><table class="tabla-sup"><tbody>
        ${Object.entries(s.macrosRacionDeclarada).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${api.fmtDec(v)}</td></tr>`).join('')}
      </tbody></table></details>`
    : ''}
    ${tablaMicros(s)}
    <h3>Ingredientes y alérgenos</h3>
    <p>${s.ingredientes ? esc(s.ingredientes) : 'Sin ingredientes declarados en la ficha.'}</p>
    ${bloqueAlergenos(s)}
    <h3>Componentes específicos</h3>
    ${componentes.length ? componentes.map(([k, c]) => {
      const alias = Array.isArray(s.componentesAlias?.[k]) ? s.componentesAlias[k] : [];
      const tc = trazasComponentes[k] || alias.map(a => trazasComponentes[a]).find(Boolean);
      const aviso = tc ? ` · ${tc.estado === 'no_verificable' ? 'procedencia no verificable' : (tc.estado || 'sin traza')}` : '';
      const titulo = [
        etiquetaComponente(k) === k ? null : `Clave: ${k}`,
        alias.length ? `Claves originales: ${alias.join(', ')}` : null,
      ].filter(Boolean).join(' · ') || null;
      return fila(etiquetaComponente(k),
        `${api.fmtDec(c.valor)} ${c.unidad || ''} por ${c.base === 'racion' ? 'ración' : '100 g'}${aviso}`,
        titulo);
    }).join('')
    : '<p class="tenue">Ni cafeína, creatina ni otros componentes declarados con valor cuantitativo.</p>'}
    <h3>Procedencia y trazabilidad</h3>
    ${fila('Fuente', s.fuente)}${fila('URL', s.url)}${fila('Fecha de consulta', s.fechaConsulta)}${fila('Actualizado en la fuente', s.actualizadoOFF)}
    <details><summary>Trazabilidad por campo (${trazas.length})</summary>
      <table class="tabla-sup"><thead><tr><th>Campo</th><th>Estado</th><th>Fuente</th><th>Fecha</th></tr></thead><tbody>
      ${trazas.map(([k, t]) => `<tr><td>${esc(k)}</td><td>${esc(t?.estado || '—')}</td><td>${esc(t?.fuente || '—')}</td><td>${esc(t?.fechaConsulta || '—')}</td></tr>`).join('')}
      </tbody></table>
    </details>
    ${(s.pendienteVerificacion || []).length ? `<h3>Datos pendientes de verificar</h3><p class="sup-pendiente">${esc(s.pendienteVerificacion.join(', '))}. No se han rellenado con valores estimados.</p>` : ''}
    <h3>Observaciones y advertencias</h3>
    <p>${s.observaciones ? esc(s.observaciones) : 'Sin observaciones.'}</p>
    ${(s.advertencias || []).map(a => `<p class="aviso">⚠️ ${esc(a)}</p>`).join('')}
    ${(s.noDisponible || []).length ? `<p class="tenue">No disponible: ${esc(s.noDisponible.join(', '))}.</p>` : ''}
  </div>`;
}

export function abrirFichaSuplemento(id) {
  const s = uiSup.todas.find(x => x.id === id) || uiSup.lista.find(x => x.id === id);
  if (!s) return;
  api.modal(`<h2>Ficha de suplemento</h2>${htmlFicha(s)}
    <div class="botones"><button class="btn sec" data-sup-a="supToma" data-id="${api.esc(s.id)}">＋ Añadir toma al diario</button>
    <button class="btn" data-sup-a="supCerrar">Cerrar</button></div>`);
}

// ---------- Alta y edición ----------
function campo(texto, html) { return `<label class="campo">${api.esc(texto)}${html}</label>`; }
function opciones(lista, actual) {
  return lista.map(([v, n]) => `<option value="${api.esc(v)}" ${v === actual ? 'selected' : ''}>${api.esc(n)}</option>`).join('');
}
function htmlFormSuplemento(s, modo = 'normal') {
  const esc = api.esc;
  const edicion = Boolean(s?.id) && modo !== 'variante';
  const base = s || {};
  const mac = base.macros100 || {};
  const mic = base.micros100 || {};
  const comp = base.componentes || {};
  const entradasComponentes = Object.entries(comp);
  const restantes = [['cafeina', 'Cafeína'], ['creatina', 'Creatina']]
    .filter(([k]) => !(k in comp));
  const titulo = modo === 'variante' ? `Registrar variante de ${esc(base.nombreBase || base.nombre || '')}`
    : edicion ? 'Editar ficha propia' : 'Registrar suplemento';
  return `<h2>${titulo}</h2>
    <p class="tenue">Deja en blanco lo que no conozcas: DanTal no convierte un dato ausente en cero. Un EAN/GTIN se comprueba por su dígito de control; el SKU es un identificador interno.</p>
    <form id="formSuplemento" data-id="${esc(edicion ? base.id : '')}"
      data-modo="${esc(modo)}" data-base-id="${esc(base.productoBaseId || '')}">
      <input type="hidden" name="productoBaseId" value="${esc(base.productoBaseId || '')}">
      <input type="hidden" name="nombreBase" value="${esc(base.nombreBase || '')}">
      <input type="hidden" name="esProductoBase" value="${esVarianteProducto(base) || modo === 'variante' ? 'false' : String(Boolean(base.esProductoBase || !edicion))}">
      <h3>Identidad</h3>
      ${campo('Nombre *', `<input name="nombre" required value="${esc(base.nombre || '')}" placeholder="Ej.: Creatina monohidrato — 300 g">`)}
      ${campo('Nombre comercial', `<input name="nombreComercial" value="${esc(base.nombreComercial || '')}" placeholder="Denominación impresa en el envase">`)}
      ${campo('Marca / fabricante', `<input name="marca" value="${esc(base.marca || '')}">`)}
      ${campo('Categoría', `<input name="categoria" value="${esc(base.categoria || '')}">`)}
      ${campo('Descripción', `<textarea name="descripcion" rows="2">${esc(base.descripcion || '')}</textarea>`)}
      ${campo('Tipo', `<select name="tipo">${opciones([...TIPOS_SUPLEMENTO.map(t => [t.clave, t.nombre]), ['control', 'Control (no listar)']], base.tipo || 'otro')}</select>`)}
      ${campo('Formato', `<input name="formato" value="${esc(base.formato || '')}" placeholder="polvo, cápsulas, bebida…">`)}
      ${campo('Presentación', `<input name="presentacion" value="${esc(base.presentacion || '')}" placeholder="bote 300 g, 60 cápsulas…">`)}
      ${campo('Cantidad del producto', `<input name="cantidadProducto" value="${esc(base.cantidadProducto || '')}">`)}
      ${campo('Peso o volumen declarado', `<input name="pesoDeclarado" type="number" step="any" min="0" value="${esc(base.pesoDeclarado ?? '')}">`)}
      ${campo('Unidades declaradas', `<input name="unidadesDeclaradas" value="${esc(base.unidadesDeclaradas || '')}" placeholder="60 cápsulas">`)}
      ${campo('Unidad de venta', `<input name="unidadVenta" value="${esc(base.unidadVenta || '')}" placeholder="bote, blíster, sobres…">`)}
      ${campo('EAN', `<input name="ean" inputmode="numeric" value="${esc(base.ean || '')}" placeholder="13 dígitos con guiones opcionales">`)}
      ${campo('GTIN', `<input name="gtin" inputmode="numeric" value="${esc(base.gtin || '')}" placeholder="8, 12, 13 o 14 dígitos">`)}
      ${campo('SKU oficial', `<input name="skuOficial" value="${esc(base.skuOficial || '')}">`)}
      ${campo('Fabricante', `<input name="fabricante" value="${esc(base.fabricante || '')}">`)}
      <h3>Dosis declarada frente a ración</h3>
      ${campo('Dosis declarada (valor)', `<input type="number" step="any" min="0" name="dosisValor" value="${esc(base.dosisDeclarada?.valor ?? '')}" placeholder="Solo si el fabricante la declara">`)}
      ${campo('Unidad de la dosis', `<input name="dosisUnidad" value="${esc(base.dosisDeclarada?.unidad || '')}" placeholder="g, mg, cápsulas…">`)}
      ${campo('Texto de la dosis declarada', `<input name="dosisTexto" value="${esc(base.dosisDeclarada?.texto || '')}">`)}
      ${campo('Tamaño de ración (g)', `<input type="number" step="any" min="0" name="racionGramos" value="${esc(base.tamanoRacion?.gramos ?? '')}">`)}
      ${campo('Base de la ración', `<input name="racionBase" value="${esc(base.tamanoRacion?.base || '')}" placeholder="30 g, 1 cápsula…">`)}
      ${campo('Gramos por cápsula/comprimido', `<input type="number" step="any" min="0" name="gramosPorUnidad" value="${esc(base.gramosPorUnidad ?? '')}">`)}
      ${campo('Gramos por cucharada', `<input type="number" step="any" min="0" name="gramosPorCucharada" value="${esc(base.gramosPorCucharada ?? '')}">`)}
      ${campo('Densidad g/ml', `<input type="number" step="any" min="0" name="densidadGml" value="${esc(base.densidadGml ?? '')}">`)}
      <h3>Macros por 100 g</h3>
      <div class="sup-campos">${CAMPOS_MACROS.map(k => campo(k, `<input type="number" step="any" min="0" name="mac_${k}" value="${esc(mac[k] ?? '')}">`)).join('')}</div>
      <details><summary>Micronutrientes por 100 g (${CLAVES_MICROS.length})</summary>
        <div class="sup-campos">${CLAVES_MICROS.map(k => campo(`${k} (${UNIDADES_MICRO[k] || ''})`, `<input type="number" step="any" min="0" name="mic_${k}" value="${esc(mic[k] ?? '')}">`)).join('')}</div>
      </details>
      <h3>Ingredientes y alérgenos (14 grupos)</h3>
      ${campo('Ingredientes', `<textarea name="ingredientes" rows="3">${esc(base.ingredientes || '')}</textarea>`)}
      <div class="sup-campos">${ALERGENOS_UE.map((a, i) => campo(a.nombre, `<select name="alerg_${i}">${opciones([
    ['', 'Sin dato'], ['P', 'Contiene'], ['T', 'Trazas'], ['A', 'Ausencia declarada'], ['?', 'Desconocido'],
  ], (base.alergenos14 || '??????????????')[i] === '?' ? '' : (base.alergenos14 || '')[i])}</select>`)).join('')}</div>
      <details ${entradasComponentes.length ? 'open' : ''}><summary>Componentes declarados (${entradasComponentes.length})</summary>
        <p class="tenue">Se editan todos los componentes ya declarados. Las claves canónicas y sus alias se conservan; dejar el valor vacío elimina esa declaración.</p>
        ${entradasComponentes.map(([k, c], i) => `<div class="fila sup-comp">
          <input type="hidden" name="comp_${i}_clave" value="${esc(k)}">
          <b>${esc(etiquetaComponente(k))}</b>
          <input type="number" step="any" min="0" name="comp_${i}_valor" value="${esc(c?.valor ?? '')}" placeholder="valor">
          <input name="comp_${i}_unidad" value="${esc(c?.unidad || '')}" placeholder="mg/g">
          <select name="comp_${i}_base">${opciones([['100g', 'por 100 g'], ['racion', 'por ración']], c?.base || '100g')}</select>
          <select name="comp_${i}_estado">${opciones(ESTADOS_DATO, c?.estado || 'confirmado')}</select>
        </div>`).join('')}
        ${restantes.map(([k, n]) => `<div class="fila sup-comp">
          <input type="hidden" name="comp_${k}_clave" value="${esc(k)}">
          <b>${n}</b>
          <input type="number" step="any" min="0" name="comp_${k}_valor" placeholder="valor">
          <input name="comp_${k}_unidad" placeholder="mg/g">
          <select name="comp_${k}_base">${opciones([['100g', 'por 100 g'], ['racion', 'por ración']], '100g')}</select>
          <select name="comp_${k}_estado">${opciones(ESTADOS_DATO, 'confirmado')}</select>
        </div>`).join('')}
        <div class="fila sup-comp"><b>Otro componente</b><input name="comp_otro_nombre" placeholder="nombre">
          <input type="number" step="any" min="0" name="comp_otro_valor" placeholder="valor">
          <input name="comp_otro_unidad" placeholder="unidad">
          <select name="comp_otro_base">${opciones([['100g', 'por 100 g'], ['racion', 'por ración']], '100g')}</select>
          <select name="comp_otro_estado">${opciones(ESTADOS_DATO, 'confirmado')}</select></div>
      </details>
      <h3>Procedencia y revisión</h3>
      ${campo('Fuente', `<input name="fuente" value="${esc(base.fuente || '')}" placeholder="Etiqueta, fabricante, Open Food Facts…">`)}
      ${campo('URL de procedencia', `<input type="url" name="url" value="${esc(base.url || '')}">`)}
      ${campo('Fecha de consulta', `<input type="date" name="fechaConsulta" value="${esc(base.fechaConsulta || '')}">`)}
      ${campo('Estado del dato', `<select name="estado">${opciones(ESTADOS_DATO, base.estado || 'desconocido')}</select>`)}
      ${campo('Observaciones', `<textarea name="observaciones" rows="2">${esc(base.observaciones || '')}</textarea>`)}
      ${campo('Advertencias de revisión', `<textarea name="advertencias" rows="2">${esc((base.advertencias || []).join('\n'))}</textarea>`)}
      <div class="botones">
        <button class="btn sec" type="button" data-sup-a="supCerrar">Cancelar</button>
        <button class="btn" type="submit">${edicion ? 'Guardar cambios' : 'Guardar suplemento'}</button>
      </div>
    </form>`;
}

// `borrador` permite abrir el alta desde el escáner con el único dato
// conocido (el código leído). No se inventa ningún otro campo.
export function abrirFormSuplemento(id = null, modo = 'normal', borrador = null) {
  if (modo === 'variante') {
    const producto = uiSup.todas.find(x => x.id === id);
    if (!producto) return;
    api.modal(htmlFormSuplemento({
      ...producto,
      id: undefined,
      nombre: `${producto.nombreComercial || producto.nombre} — nueva variante`,
      nombreComercial: '',
      nombreBase: producto.nombreComercial || producto.nombre,
      productoBaseId: producto.id,
      esProductoBase: false,
      esVarianteHSN: false,
      esVariantePorDefecto: false,
      ean: null, gtin: null, skuOficial: null, precio: null, disponibilidad: null,
      macros100: {}, micros100: {}, componentes: {}, componentesAlias: undefined,
      trazabilidadComponentes: undefined, variantes: [], variantesResumen: [], numVariantes: null,
    }, modo));
    return;
  }
  const base = id ? (uiSup.todas.find(x => x.id === id) || uiSup.lista.find(x => x.id === id))
    : (borrador ? { ...borrador } : null);
  api.modal(htmlFormSuplemento(base));
}

function leerFormSuplemento(form) {
  const f = new FormData(form);
  const v = k => String(f.get(k) ?? '').trim();
  const num = k => { const s = v(k); if (!s) return undefined; const n = Number(s); return Number.isFinite(n) ? n : undefined; };
  const macros100 = {};
  for (const k of CAMPOS_MACROS) { const n = num(`mac_${k}`); if (n !== undefined) macros100[k] = n; }
  const micros100 = {};
  for (const k of CLAVES_MICROS) { const n = num(`mic_${k}`); if (n !== undefined) micros100[k] = n; }
  let alergenos14 = '';
  for (let i = 0; i < 14; i++) alergenos14 += v(`alerg_${i}`) || '?';
  const componentes = {};
  // Todos los componentes declarados se editan por índice, más las dos
  // claves habituales si no estaban presentes. Las claves canónicas y sus
  // alias se conservan desde la ficha anterior.
  for (const [nombre] of f.entries()) {
    const m = /^comp_(\d+|cafeina|creatina)_clave$/.exec(nombre);
    if (!m) continue;
    const sufijo = m[1];
    const clave = v(`comp_${sufijo}_clave`);
    const valor = num(`comp_${sufijo}_valor`);
    if (!clave || valor === undefined) continue;
    componentes[clave] = {
      valor,
      unidad: v(`comp_${sufijo}_unidad`),
      base: v(`comp_${sufijo}_base`) || '100g',
      estado: ESTADOS_DATO.includes(v(`comp_${sufijo}_estado`)) ? v(`comp_${sufijo}_estado`) : 'confirmado',
    };
  }
  const otroNombre = v('comp_otro_nombre'), otroValor = num('comp_otro_valor');
  if (otroNombre && otroValor !== undefined) {
    componentes[otroNombre] = {
      valor: otroValor, unidad: v('comp_otro_unidad'), base: v('comp_otro_base') || '100g',
      estado: ESTADOS_DATO.includes(v('comp_otro_estado')) ? v('comp_otro_estado') : 'confirmado',
    };
  }
  const dosisValor = num('dosisValor');
  const anterior = uiSup.todas.find(x => x.id === v('id'));
  const productoBaseId = v('productoBaseId') || anterior?.productoBaseId || null;
  return {
    id: v('id') || undefined,
    nombre: v('nombre'), nombreComercial: v('nombreComercial') || v('nombre'),
    nombreBase: v('nombreBase') || anterior?.nombreBase || null,
    marca: v('marca'), categoria: v('categoria'), descripcion: v('descripcion'), tipo: v('tipo') || 'otro',
    formato: v('formato'), presentacion: v('presentacion'), cantidadProducto: v('cantidadProducto'),
    pesoDeclarado: num('pesoDeclarado'), unidadesDeclaradas: v('unidadesDeclaradas'), unidadVenta: v('unidadVenta'),
    ean: v('ean') || null, gtin: v('gtin') || null, skuOficial: v('skuOficial') || null,
    productoBaseId,
    esProductoBase: v('esProductoBase') === 'true',
    esVarianteHSN: Boolean(anterior?.esVarianteHSN),
    esVariantePorDefecto: Boolean(anterior?.esVariantePorDefecto),
    fabricante: v('fabricante'),
    dosisDeclarada: {
      valor: dosisValor ?? null, unidad: v('dosisUnidad'), texto: v('dosisTexto'),
      estado: dosisValor != null || v('dosisTexto') ? 'confirmado' : 'desconocido',
    },
    tamanoRacion: num('racionGramos') !== undefined
      ? { gramos: num('racionGramos'), base: v('racionBase') || `${num('racionGramos')} g`, estado: 'confirmado' } : null,
    gramosPorUnidad: num('gramosPorUnidad'), gramosPorCucharada: num('gramosPorCucharada'), densidadGml: num('densidadGml'),
    macros100, micros100, componentes,
    ingredientes: v('ingredientes'), alergenos14, estadoAlergenos: /[PTA]/.test(alergenos14) ? 'declarado' : 'desconocido',
    fuente: v('fuente') || 'Usuario', url: v('url'), fechaConsulta: v('fechaConsulta') || api.hoy?.() || null,
    estado: v('estado') || 'desconocido',
    observaciones: v('observaciones'),
    advertencias: v('advertencias').split('\n').map(s => s.trim()).filter(Boolean),
    origen: 'usuario', esEjemplo: false,
    favorito: Boolean(anterior?.favorito),
    creado: anterior?.creado,
    // Procedencia y trazabilidad no se editan en el formulario: no deben
    // borrarse al guardar de nuevo una ficha normalizada.
    componentesAlias: anterior?.componentesAlias,
    trazabilidadComponentes: anterior?.trazabilidadComponentes,
  };
}

// ---------- Toma ----------
export function abrirFormToma(id) {
  const s = uiSup.todas.find(x => x.id === id) || uiSup.lista.find(x => x.id === id);
  if (!s) return;
  const hoy = api.hoy?.() || new Date().toISOString().slice(0, 10);
  const entrada = api.entradasDelDia?.(hoy) || [];
  const dup = detectarDuplicados(entrada);
  api.modal(`<h2>💊 Añadir toma al diario</h2>
    <p><b>${api.esc(s.nombre)}</b>${s.marca ? ` · ${api.esc(s.marca)}` : ''}</p>
    ${dup.avisos.map(a => `<p class="aviso">⚠️ ${api.esc(a.texto)}</p>`).join('')}
    <div class="sup-datos-toma">
      ${fila('Cantidad del producto', s.cantidadProducto)}
      ${fila('Dosis declarada por el fabricante', s.dosisDeclarada?.texto || 'Desconocida')}
      ${fila('Tamaño de ración', s.tamanoRacion ? `${api.fmtDec(s.tamanoRacion.gramos)} g` : null)}
      ${fila('Composición', Object.keys(s.macros100 || {}).length ? 'Declarada' : 'Desconocida')}
      ${fila('Identificadores', identificadoresProducto(s).map(i => `${i.clase}: ${i.valor}`).join(' · ') || 'Sin códigos declarados')}
      ${esVarianteProducto(s) ? fila('Producto base', uiSup.todas.find(x => x.id === s.productoBaseId)?.nombre || s.productoBaseId) : ''}
    </div>
    <form id="formTomaSuplemento" data-id="${api.esc(s.id)}">
      ${campo('Comida', `<select name="comida">${opciones(Object.entries(api.COMIDAS || {}).map(([k, c]) => [k, `${c.icono} ${c.nombre}`]), 'comida')}</select>`)}
      <div class="fila sup-toma-cantidad">
        ${campo('Cantidad consumida', `<input type="number" step="any" min="0" name="cantidad" data-sup-cant value="${api.fmtDec(s.tamanoRacion?.gramos || 1)}" required>`)}
        ${campo('Unidad', `<select name="unidad" data-sup-cant>${opciones(UNIDADES_CONVERSION.map(u => [u, u]), s.tamanoRacion ? 'g' : 'cápsula')}</select>`)}
      </div>
      ${campo('Fecha', `<input type="date" name="fecha" value="${hoy}" max="${hoy}" required>`)}
      ${campo('Hora', `<input type="time" name="hora" value="${new Date().toTimeString().slice(0, 5)}">`)}
      <div id="vistaTomaSuplemento" class="tarjeta"></div>
      <div class="botones">
        <button class="btn sec" type="button" data-sup-a="supCerrar">Cancelar</button>
        <button class="btn" type="submit">＋ Añadir al diario</button>
      </div>
    </form>`);
  actualizarVistaToma();
}

export function abrirSelectorVariantes(id) {
  const base = uiSup.todas.find(x => x.id === id) || uiSup.lista.find(x => x.id === id);
  if (!base) return;
  api.modal(`<h2>Variantes de ${api.esc(base.nombre)}</h2>
    <p class="tenue">Selecciona la variante comercial exacta. DanTal no comparte la composición entre variantes sin verificación.</p>
    ${htmlVariantes(base) || '<p class="tenue">Esta ficha no declara variantes.</p>'}
    <div class="botones"><button class="btn sec" data-sup-a="supCerrar">Cerrar</button></div>`);
}

function actualizarVistaToma() {
  const form = document.querySelector('#formTomaSuplemento');
  const vista = document.querySelector('#vistaTomaSuplemento');
  if (!form || !vista) return;
  const id = form.dataset.id;
  const s = uiSup.todas.find(x => x.id === id) || uiSup.lista.find(x => x.id === id);
  if (!s) return;
  const f = new FormData(form);
  const c = calcularToma(s, f.get('cantidad'), f.get('unidad'));
  const fmt = api.fmtDec;
  const macrosTxt = c.macros
    ? `${fmt(c.macros.kcal)} kcal · ${fmt(c.macros.prot)} g proteína · ${fmt(c.macros.carbs)} g hidratos · ${fmt(c.macros.grasa)} g grasa`
    : 'Sin nutrientes calculados (composición desconocida)';
  vista.innerHTML = `<div class="fila"><b>${c.gramos != null ? `${fmt(c.gramos)} g` : 'Cantidad no convertible'}</b>
      <span class="badge ${c.composicionDeclarada ? 'sup-ok' : 'sup-estado desconocido'}">${c.composicionDeclarada ? 'Composición declarada' : 'Composición desconocida'}</span></div>
    <p>${api.esc(macrosTxt)}</p>
    ${c.micros && Object.keys(c.micros).length ? `<p class="tenue">Micros: ${api.esc(Object.entries(c.micros).map(([k, v]) => `${k} ${fmt(v)}`).join(' · '))}</p>` : ''}
    ${c.advertencias.map(a => `<p class="aviso">⚠️ ${api.esc(a)}</p>`).join('')}`;
}

// ---------- Eventos ----------
function alClic(ev) {
  const b = ev.target.closest?.('[data-sup-a]');
  if (!b || b.tagName === 'INPUT' || b.tagName === 'SELECT') return;
  const accion = b.dataset.supA;
  const id = b.dataset.id;
  switch (accion) {
    case 'supCerrar': api.cerrarModal?.(); break;
    case 'supNuevo': abrirFormSuplemento(); break;
    case 'supFicha': abrirFichaSuplemento(id); break;
    case 'supVerVariante': abrirFichaSuplemento(id); break;
    case 'supToma': abrirFormToma(id); break;
    case 'supVariantesToma': abrirSelectorVariantes(id); break;
    case 'supNuevaVariante': abrirFormSuplemento(id, 'variante'); break;
    case 'supActualizarHSN':
      api.toast?.('Verificando catálogo HSN en este dispositivo…');
      importarCatalogoHSN({ forzar: true }).then(r => recargar().then(() => {
        api.toast?.(`HSN: ${r?.nuevos || 0} nuevos · ${r?.actualizados || 0} actualizados · ${r?.descatalogados || 0} descatalogados`);
      })).catch(() => api.toast?.('No se pudo actualizar el catálogo HSN'));
      break;
    case 'supEditar':
      if (uiSup.todas.find(s => s.id === id && !s.esEjemplo && s.origen !== 'hsn-oficial')) abrirFormSuplemento(id);
      else api.toast?.('Solo puedes editar fichas propias. Usa ⧉ para copiar un ejemplo.');
      break;
    case 'supDuplicar': {
      const s = uiSup.lista.find(x => x.id === id);
      if (!s) break;
      api.modal(`<h2>Copiar como ficha propia</h2><p class="tenue">Se creará una ficha editable con los mismos datos declarados. No modifica el ejemplo original.</p>
        <form id="formSupDuplicar" data-id="${api.esc(id)}">
          ${campo('Nombre', `<input name="nombre" value="${api.esc(`${s.nombre} (copia)`)}" required>`)}
          <div class="botones"><button class="btn sec" type="button" data-sup-a="supCerrar">Cancelar</button>
          <button class="btn" type="submit">Crear copia</button></div>
        </form>`);
      break;
    }
    case 'supFav': alternarFavorito(id).then(() => recargar()); break;
    case 'supBorrar':
      api.confirmar?.(`¿Borrar la ficha «${uiSup.lista.find(s => s.id === id)?.nombre || id}»? Las tomas ya registradas en el diario no se modifican.`, async ok => {
        if (!ok) return;
        await borrarSuplemento(id); await recargar(); api.toast?.('Ficha borrada');
      });
      break;
    case 'supRestablecer':
      restablecerSemilla().then(n => recargar().then(() => api.toast?.(n ? `${n} ejemplo(s) restablecido(s)` : 'Los ejemplos ya estaban presentes')));
      break;
    case 'supFiltroTipo': uiSup.tipo = b.dataset.v || ''; pintar(); break;
    case 'supFiltroEstado': uiSup.estadoDato = b.dataset.v || ''; pintar(); break;
    case 'supFiltroHSN': uiSup.soloHSN = !uiSup.soloHSN; pintar(); break;
    default: break;
  }
}

function alEscribir(ev) {
  const t = ev.target;
  if (t.matches?.('[data-sup-buscar]')) {
    uiSup.q = t.value || '';
    const listaEl = document.querySelector('#supLista');
    if (listaEl) {
      const filtradas = (uiSup.fnBuscar || (lista => lista))(uiSup.lista, uiSup.q, filtrosActuales());
      listaEl.innerHTML = filtradas.length ? filtradas.map(tarjeta).join('') : '<p class="tenue centro">Sin resultados.</p>';
    }
    const chips = document.querySelectorAll('#supFiltros .chip[data-sup-a]');
    chips.forEach(c => {
      if (c.dataset.supA === 'supFiltroTipo') c.classList.toggle('on', (c.dataset.v || '') === uiSup.tipo);
      if (c.dataset.supA === 'supFiltroEstado') c.classList.toggle('on', (c.dataset.v || '') === uiSup.estadoDato);
    });
    return;
  }
  const filtrosSelect = {
    supFiltroMarca: 'marca', supFiltroLinea: 'linea', supFiltroCategoria: 'categoria',
    supFiltroFormato: 'formato', supFiltroSabor: 'sabor',
  };
  if (t.matches?.('[data-sup-a]') && filtrosSelect[t.dataset.supA]) {
    uiSup[filtrosSelect[t.dataset.supA]] = t.value || '';
    pintar(); return;
  }
  if (t.matches?.('[data-sup-a="supFiltroFav"]')) {
    uiSup.soloFav = Boolean(t.checked); pintar(); return;
  }
  if (t.matches?.('[data-sup-cant]')) actualizarVistaToma();
}

async function alEnviar(ev) {
  const form = ev.target;
  if (form.id === 'formSuplemento') {
    ev.preventDefault();
    if (api.confirmar && form.dataset.id) {
      // La edición siempre es de una ficha propia (validada en alClic).
    }
    const raw = leerFormSuplemento(form);
    if (!raw.nombre) { api.toast?.('Escribe el nombre del suplemento.'); return; }
    for (const clave of ['ean', 'gtin']) {
      const valor = raw[clave];
      if (!valor) continue;
      const comprobacion = validarGTIN(valor);
      if (!comprobacion.valido) {
        api.toast?.(`${clave.toUpperCase()}: ${comprobacion.motivo || 'formato no válido'} No se ha guardado la ficha.`);
        return;
      }
    }
    const guardado = await guardarSuplemento(raw);
    api.cerrarModal?.();
    await recargar();
    const mensaje = form.dataset.modo === 'variante' ? 'Variante registrada en el catálogo'
      : (form.dataset.id ? 'Ficha actualizada' : 'Suplemento registrado');
    api.toast?.(guardado ? mensaje : 'No se pudo guardar');
    return;
  }
  if (form.id === 'formSupDuplicar') {
    ev.preventDefault();
    const s = await obtenerSuplemento(form.dataset.id);
    if (!s) return;
    const nombre = String(new FormData(form).get('nombre') || '').trim();
    if (!nombre) return;
    await guardarSuplemento({
      ...s, id: undefined, nombre, origen: 'usuario', esEjemplo: false, favorito: false, creado: undefined,
      esProductoBase: false, esVarianteHSN: false, esVariantePorDefecto: false,
      productoBaseId: null, variantes: [], variantesResumen: [], numVariantes: null,
      skuOficial: null, linea: null, lineaNombre: null, tipoProducto: null,
      historial: [], version: 1, pendienteVerificacion: [],
    });
    api.cerrarModal?.(); await recargar(); api.toast?.('Copia creada como ficha propia');
    return;
  }
  if (form.id === 'formTomaSuplemento') {
    ev.preventDefault();
    const f = new FormData(form);
    const s = uiSup.todas.find(x => x.id === form.dataset.id) || uiSup.lista.find(x => x.id === form.dataset.id);
    if (!s) return;
    const calculo = calcularToma(s, f.get('cantidad'), f.get('unidad'));
    const { comida, entrada } = entradaSuplemento(s, {
      cantidad: f.get('cantidad'), unidad: f.get('unidad'),
      comida: String(f.get('comida') || 'comida'), fecha: String(f.get('fecha') || ''),
      hora: String(f.get('hora') || ''), calculo,
    });
    api.cerrarModal?.();
    api.anadirSuplementoAlDiario?.(comida, entrada);
    api.toast?.(calculo.composicionDeclarada
      ? `${s.nombre} añadido al diario`
      : `${s.nombre} añadido, pero sin composición declarada: no se suma como cero`);
    return;
  }
}

// Se inyecta la función de búsqueda del modelo sin acoplar la UI a app.js.
export function configurarBuscadorSuplementos(fn) { uiSup.fnBuscar = fn; }

export function estadoSuplementosUI() {
  return { ...uiSup, version: VERSION_MODELO, idControl: ID_CONTROL_SEMILLA };
}
