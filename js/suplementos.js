// =====================================================================
// suplementos.js · Modelo, semilla y cálculos del catálogo de suplementos
// ---------------------------------------------------------------------
// Entidad INDEPENDIENTE del catálogo comercial. No altera `catalogo`,
// `detalle`, `meta`, los alimentos USDA ni las recetas.
//
// Regla de oro: un campo ausente NO es un cero. Si la ficha no declara
// composición, la toma se registra como «composición desconocida» y los
// informes la excluyen de las sumas en lugar de contarla como 0.
// =====================================================================

import { CLAVES_MICROS } from './escaner.js';
import { macrosDe, microsEntrada, sumarMacros, consumoNutrientes } from './alimentos.js';

export const ID_CONTROL_SEMILLA = '__semilla_suplementos_v1__';
export const ID_CONTROL_HSN = '__control_importacion_hsn_v1__';
export const TIPOS_SUPLEMENTO = [
  { clave: 'proteina', nombre: 'Proteína' },
  { clave: 'creatina', nombre: 'Creatina' },
  { clave: 'multivitaminico', nombre: 'Multivitamínico' },
  { clave: 'cafeina', nombre: 'Cafeína' },
  { clave: 'omega3', nombre: 'Omega-3' },
  { clave: 'aminoacidos', nombre: 'Aminoácidos' },
  { clave: 'fibra', nombre: 'Fibra' },
  { clave: 'otro', nombre: 'Otro' },
];
export const ESTADOS_DATO = ['confirmado', 'estimado', 'desconocido'];
export const CAMPOS_MACROS = ['kcal', 'kJ', 'prot', 'carbs', 'azucares', 'grasa', 'saturada',
  'monoinsaturada', 'poliinsaturada', 'fibra', 'sal', 'sodio'];
export const CAMPOS_TRAZABLES = [
  'nombre', 'marca', 'ean', 'tipo', 'formato', 'presentacion', 'cantidadProducto',
  'tamanoRacion', 'dosisDeclarada', 'macros100', 'micros100', 'ingredientes',
  'alergenos14', 'componentes', 'fabricante', 'fuente', 'url', 'fechaConsulta',
  'linea', 'categoria', 'skuOficial', 'sabor', 'pesoDeclarado', 'unidadesDeclaradas',
  'precio', 'disponibilidad', 'descripcion', 'macrosRacionDeclarada',
];
export const CAMPOS_NO_DISPONIBLES = [
  'macros100', 'micros100', 'dosisDeclarada', 'ingredientes', 'alergenos14',
  'componentes', 'fabricante', 'url', 'fechaConsulta', 'cantidadProducto',
];
export const UNIDADES_CONVERSION = ['g', 'mg', 'µg', 'kg', 'ml', 'cápsula', 'comprimido', 'cucharada', 'ración'];

// Fase 2.7: únicas equivalencias demostradas por la auditoría 2.6.
// La clave bare es la canónica porque ya tiene etiqueta legible en la UI.
// Solo se fusiona cuando valor, unidad, base y estado coinciden en el registro.
export const ALIAS_AMINOACIDOS = Object.freeze({
  amino_l_alanina: 'alanina',
  amino_l_arginina: 'arginina',
  amino_l_fenilalanina: 'fenilalanina',
  amino_glicina: 'glicina',
  amino_l_histidina: 'histidina',
  amino_l_isoleucina: 'isoleucina',
  amino_l_leucina: 'leucina',
  amino_l_lisina: 'lisina',
  amino_l_metionina: 'metionina',
  amino_l_prolina: 'prolina',
  amino_l_serina: 'serina',
  amino_l_tirosina: 'tirosina',
  amino_l_treonina: 'treonina',
  amino_l_valina: 'valina',
  amino_tirosina: 'tirosina',
  amino_treonina: 'treonina',
  amino_valina: 'valina',
});

// Las fichas guardadas antes de esta versión aún arrastran las claves
// duplicadas. El marcador fuerza UNA sola reimportación de HSN y después
// permite la salida rápida por caché sin reescribir nada.
export const MODELO_NORMALIZACION_COMPONENTES = 1;

const texto = v => String(v ?? '').trim();

// Fase 3: validación de códigos GTIN SIN modificar los identificadores ya
// guardados. Solo se quitan espacios y guiones para comparar o validar.
export const TIPOS_GTIN = Object.freeze({ 8: 'EAN-8', 12: 'UPC-A', 13: 'EAN-13', 14: 'GTIN-14' });

export function normalizarGTIN(valor) {
  return texto(valor).replace(/[\s\-_.]/g, '');
}

export function validarGTIN(valor) {
  const bruto = texto(valor);
  const codigo = normalizarGTIN(bruto);
  const tipo = TIPOS_GTIN[codigo.length] || null;
  if (!codigo) return { valido: false, codigo: '', tipo: null, motivo: 'Sin código declarado.' };
  if (!/^\d+$/.test(codigo)) return { valido: false, codigo, tipo, motivo: 'Solo se admiten dígitos, espacios y guiones.' };
  if (!tipo) return { valido: false, codigo, tipo, motivo: 'Longitud no admitida (8, 12, 13 o 14 dígitos).' };
  let suma = 0;
  for (let i = codigo.length - 1, peso = 1; i >= 0; i--, peso = peso === 1 ? 3 : 1) {
    suma += Number(codigo[i]) * peso;
  }
  const digito = codigo[codigo.length - 1];
  const esperado = String((10 - ((suma - Number(digito)) % 10)) % 10);
  return {
    valido: suma % 10 === 0, codigo, tipo, digitoControl: digito, esperado,
    motivo: suma % 10 === 0 ? null : `Dígito de control incorrecto: esperado ${esperado}.`,
  };
}

// Todos los identificadores declarados, con su procedencia. El SKU no es un
// GTIN: se devuelve tal cual, sin aplicarle dígito de control.
export function identificadoresProducto(sup) {
  const out = [];
  const anadir = (valor, clase, origen) => {
    const textoCodigo = texto(valor);
    if (!textoCodigo) return;
    const clave = `${clase}|${normalizarGTIN(textoCodigo)}`;
    if (out.some(x => x.clave === clave)) return;
    out.push({
      clave, valor: textoCodigo, clase, origen,
      ...(clase === 'SKU'
        ? { valido: null, tipo: 'SKU', motivo: 'Identificador interno: no lleva dígito de control.' }
        : validarGTIN(textoCodigo)),
    });
  };
  const ficha = sup || {};
  anadir(ficha.gtin, 'GTIN', 'ficha');
  anadir(ficha.ean, 'EAN', 'ficha');
  anadir(ficha.skuOficial, 'SKU', 'ficha');
  const variantes = Array.isArray(ficha.variantesResumen) && ficha.variantesResumen.length
    ? ficha.variantesResumen
    : (Array.isArray(ficha.variantes) ? ficha.variantes.filter(v => v && typeof v === 'object') : []);
  for (const v of variantes) {
    const nombre = texto(v.nombreComercial || v.nombre || v.id) || 'variante';
    const origen = `variante:${texto(v.id) || nombre}`;
    anadir(v.gtin, 'GTIN', origen);
    anadir(v.ean, 'EAN', origen);
    anadir(v.sku || v.skuOficial, 'SKU', origen);
  }
  return out;
}
const numero = v => {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const positivo = v => { const n = numero(v); return n != null && n > 0 ? n : null; };
const slug = s => texto(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 26) || 'suplemento';
function hash(textoBase) {
  let h = 2166136261;
  for (let i = 0; i < textoBase.length; i++) { h ^= textoBase.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36).slice(0, 6);
}

export function idSuplemento(nombre, marca = '', ean = '') {
  return `sup-${slug(nombre)}-${slug(marca)}-${hash(`${nombre}|${marca}|${ean}`)}`;
}

export const esSuplemento = en => Boolean(en && en.tipoEntrada === 'suplemento');
export const esWhey = sup => /whey/i.test(`${texto(sup?.nombre)} ${texto(sup?.marca)} ${texto(sup?.tipo)}`);

// Un producto base y sus variantes son fichas separadas. La pertenencia se
// resuelve por `productoBaseId`, nunca por nombre ni por EAN compartido.
export const esVarianteProducto = sup => Boolean(sup?.productoBaseId && sup.productoBaseId !== sup.id);
export const esProductoBase = sup => Boolean(sup?.esProductoBase
  || (sup?.id && !esVarianteProducto(sup) && !sup?.esVarianteHSN));

export function variantesDeProducto(lista, baseId) {
  const id = texto(baseId);
  if (!id) return [];
  return (Array.isArray(lista) ? lista : [])
    .filter(s => s && s.id !== id && texto(s.productoBaseId) === id)
    .sort((a, b) => texto(a.nombreComercial || a.nombre).localeCompare(texto(b.nombreComercial || b.nombre), 'es'));
}

export function productosBase(lista) {
  return (Array.isArray(lista) ? lista : [])
    .filter(s => s && s.id !== ID_CONTROL_SEMILLA && s.id !== ID_CONTROL_HSN && s.tipo !== 'control'
      && !esVarianteProducto(s))
    .sort((a, b) => texto(a.nombre).localeCompare(texto(b.nombre), 'es'));
}

function normalizarMacros(origen) {
  const fuente = origen || {};
  const out = {};
  for (const k of CAMPOS_MACROS) {
    const n = numero(fuente[k]);
    if (n != null) out[k] = n;
  }
  return out;
}

function normalizarMicros(origen) {
  const fuente = origen || {};
  const out = {};
  for (const k of CLAVES_MICROS) {
    const n = numero(fuente[k]);
    if (n != null && n >= 0) out[k] = n;
  }
  return out;
}

const equivalenteComponente = (a, b) => Boolean(a && b
  && a.valor === b.valor && a.unidad === b.unidad
  && a.base === b.base && a.estado === b.estado);

function normalizarAliasComponentes(origen) {
  const out = {};
  if (!origen || typeof origen !== 'object' || Array.isArray(origen)) return out;
  for (const [canonica, bruto] of Object.entries(origen)) {
    const clave = texto(canonica);
    if (!clave) continue;
    const lista = (Array.isArray(bruto) ? bruto : [bruto]).map(texto).filter(Boolean);
    if (lista.length) out[clave] = [...new Set(lista)].sort();
  }
  return out;
}

// Devuelve los componentes con clave canónica y la procedencia de las claves
// originales. Solo se fusiona un alias cuando valor, unidad, base y estado
// coinciden exactamente; si no coinciden, se conserva con su clave original.
export function normalizarComponentes(origen) {
  const normalizados = [];
  for (const [clave, bruto] of Object.entries(origen || {})) {
    const valor = numero(bruto?.valor ?? bruto);
    if (valor == null) continue;
    normalizados.push([clave, {
      valor,
      unidad: texto(bruto?.unidad) || null,
      base: ['100g', 'racion'].includes(texto(bruto?.base)) ? texto(bruto.base) : '100g',
      estado: ESTADOS_DATO.includes(bruto?.estado) ? bruto.estado : 'confirmado',
    }]);
  }
  // Las claves canónicas van primero: así un alias con otro valor nunca
  // sobrescribe la declaración bare del propio registro.
  normalizados.sort((a, b) =>
    Number(Boolean(ALIAS_AMINOACIDOS[a[0]])) - Number(Boolean(ALIAS_AMINOACIDOS[b[0]])));
  const componentes = {};
  const aliasDetectados = {};
  const registrarAlias = (canonica, clave) => {
    (aliasDetectados[canonica] ||= []).push(clave);
  };
  for (const [clave, dato] of normalizados) {
    const canonica = ALIAS_AMINOACIDOS[clave] || clave;
    if (canonica === clave) {
      componentes[canonica] = dato;
      continue;
    }
    const destino = componentes[canonica];
    if (!destino) {
      componentes[canonica] = dato;
      registrarAlias(canonica, clave);
    } else if (equivalenteComponente(destino, dato)) {
      registrarAlias(canonica, clave);
    } else {
      // Equivalencia no demostrada en este registro: no se fusiona ni se
      // descarta. Se mantiene bajo su clave original.
      componentes[clave] = dato;
    }
  }
  for (const canonica of Object.keys(aliasDetectados)) {
    aliasDetectados[canonica] = [...new Set(aliasDetectados[canonica])].sort();
  }
  return { componentes, componentesAlias: aliasDetectados };
}

// Trazabilidad individual de componentes. No se confunde con la traza del
// campo `componentes`, que describe al conjunto (por ejemplo, el aminograma).
function normalizarTrazasComponentes(origen) {
  const out = {};
  for (const [clave, t] of Object.entries(origen || {})) {
    if (!t || typeof t !== 'object') continue;
    out[clave] = {
      estado: texto(t.estado) || 'no_verificable',
      fuente: texto(t.fuente) || null,
      url: texto(t.url) || null,
      fechaConsulta: texto(t.fechaConsulta) || null,
      tipoDato: texto(t.tipoDato) || null,
      detalle: texto(t.detalle) || null,
    };
  }
  return out;
}

function normalizarRacion(bruto) {
  const gramos = positivo(bruto?.gramos ?? bruto);
  if (gramos == null) return null;
  return {
    gramos,
    base: texto(bruto?.base) || `${gramos} g`,
    estado: ESTADOS_DATO.includes(bruto?.estado) ? bruto.estado : 'confirmado',
  };
}

function normalizarDosis(bruto) {
  const valor = positivo(bruto?.valor);
  const estado = ESTADOS_DATO.includes(bruto?.estado) ? bruto.estado : (valor != null ? 'confirmado' : 'desconocido');
  return {
    valor: estado === 'desconocido' ? null : valor,
    unidad: texto(bruto?.unidad) || null,
    texto: texto(bruto?.texto) || (valor != null ? `${valor} ${texto(bruto?.unidad) || ''}`.trim() : null),
    estado,
  };
}

function trazasPorDefecto(raw, nombre, marca, ean) {
  const originales = raw.trazabilidadCampos && typeof raw.trazabilidadCampos === 'object'
    ? raw.trazabilidadCampos : {};
  const origen = texto(raw.origen);
  const esUsuario = origen === 'usuario';
  const esHSN = origen === 'hsn-oficial';
  const porDefecto = {
    estado: esUsuario ? 'introducido_por_el_usuario'
      : (esHSN || origen.startsWith('semilla-real')) ? 'declarado_por_la_fuente' : 'sin_ficha_verificable',
    fuente: texto(raw.fuente) || (esUsuario ? 'Usuario' : null),
    url: texto(raw.url) || null,
    fechaConsulta: texto(raw.fechaConsulta) || null,
    actualizadoOFF: texto(raw.actualizadoOFF) || null,
    registroOriginal: texto(raw.registroOriginal) || null,
  };
  const trazas = {};
  for (const clave of CAMPOS_TRAZABLES) {
    const existe = originales[clave] && typeof originales[clave] === 'object';
    const previa = existe ? originales[clave] : {};
    const estado = texto(previa.estado) || (existe ? porDefecto.estado : 'no_disponible');
    const noDisponible = estado === 'no_disponible';
    trazas[clave] = {
      ...porDefecto, ...previa, estado,
      fuente: noDisponible ? null : (texto(previa.fuente) || porDefecto.fuente),
      url: noDisponible ? null : (texto(previa.url) || porDefecto.url),
    };
  }
  if (texto(nombre) && trazas.nombre.estado === 'no_disponible') trazas.nombre = { ...porDefecto };
  if (texto(marca) && trazas.marca.estado === 'no_disponible') trazas.marca = { ...porDefecto };
  if (texto(ean) && trazas.ean.estado === 'no_disponible') trazas.ean = { ...porDefecto };
  return trazas;
}

// Normalización única: la usan el alta, la edición, la semilla y la lectura IDB.
export function normalizarSuplemento(raw = {}) {
  if (raw?.id === ID_CONTROL_SEMILLA) return { ...raw, esEjemplo: true, tipo: 'control' };
  if (raw?.id === ID_CONTROL_HSN) return { ...raw, esEjemplo: true, tipo: 'control' };
  const nombre = texto(raw.nombre);
  const marca = texto(raw.marca);
  const ean = texto(raw.ean);
  if (!nombre) return null;
  const macros100 = normalizarMacros(raw.macros100 || raw.nutricion100);
  const micros100 = normalizarMicros(raw.micros100);
  const { componentes, componentesAlias: aliasDetectados } = normalizarComponentes(raw.componentes);
  const componentesAlias = {};
  for (const [k, lista] of Object.entries(normalizarAliasComponentes(raw.componentesAlias))) {
    componentesAlias[k] = [...lista];
  }
  for (const [k, lista] of Object.entries(aliasDetectados)) {
    componentesAlias[k] = [...new Set([...(componentesAlias[k] || []), ...lista])].sort();
  }
  const trazasComponentes = normalizarTrazasComponentes(raw.trazabilidadComponentes);
  const alergenos14 = /^[PTA?]{14}$/.test(texto(raw.alergenos14)) ? texto(raw.alergenos14) : null;
  const estadoAlergenos = alergenos14 && /[PTA]/.test(alergenos14) ? 'declarado' : 'desconocido';
  const noDisponible = [...new Set([
    ...(Array.isArray(raw.noDisponible) ? raw.noDisponible.map(texto).filter(Boolean) : []),
    ...CAMPOS_NO_DISPONIBLES.filter(c =>
      c === 'macros100' ? !Object.keys(macros100).length
        : c === 'micros100' ? !Object.keys(micros100).length
          : c === 'componentes' ? !Object.keys(componentes).length
            : c === 'alergenos14' ? estadoAlergenos !== 'declarado'
              : c === 'dosisDeclarada' ? (!raw.dosisDeclarada?.valor && !texto(raw.dosisDeclarada?.texto))
                : !texto(raw[c])),
  ])];
  const estado = ESTADOS_DATO.includes(raw.estado) ? raw.estado
    : (Object.keys(macros100).length || Object.keys(micros100).length ? 'confirmado' : 'desconocido');
  const advertenciasPrevias = Array.isArray(raw.advertencias)
    ? raw.advertencias.map(texto).filter(Boolean) : [];
  // Si la ficha ya trae un aviso whey verificado, no se genera otro con distinta
  // redacción: la vista previa debe mostrar un solo aviso con el mismo significado.
  const advertencias = [
    ...advertenciasPrevias,
    ...(esWhey({ ...raw, nombre, marca }) && !advertenciasPrevias.some(a => /whey/i.test(a))
      ? ['Este producto también existe como alimento «whey». No registres la misma toma dos veces: elige alimento o suplemento, no ambos.']
      : []),
  ];
  return {
    id: texto(raw.id) || idSuplemento(nombre, marca, ean),
    nombre, marca, ean: ean || null,
    // Identidad HSN: producto base y variante son entidades separadas.
    productoBaseId: texto(raw.productoBaseId) || null,
    esProductoBase: Boolean(raw.esProductoBase),
    esVarianteHSN: Boolean(raw.esVarianteHSN),
    esVariantePorDefecto: Boolean(raw.esVariantePorDefecto),
    nombreComercial: texto(raw.nombreComercial) || nombre,
    nombreBase: texto(raw.nombreBase) || null,
    descripcion: texto(raw.descripcion) || null,
    linea: texto(raw.linea) || null,
    lineaNombre: texto(raw.lineaNombre) || null,
    tipoProducto: texto(raw.tipoProducto) || null,
    skuOficial: texto(raw.skuOficial) || null,
    // `null` significa «no declarado», nunca un código inventado. Se mantiene
    // el campo en todas las fichas para no reescribir las ya importadas.
    gtin: texto(raw.gtin) || texto(raw.ean) || null,
    ...(texto(raw.unidadVenta) ? { unidadVenta: texto(raw.unidadVenta) } : {}),
    sabor: texto(raw.sabor) || null,
    pesoDeclarado: positivo(raw.pesoDeclarado),
    unidadesDeclaradas: texto(raw.unidadesDeclaradas) || null,
    serviciosDeclarados: positivo(raw.serviciosDeclarados),
    variantes: Array.isArray(raw.variantes) ? raw.variantes.map(texto).filter(Boolean) : [],
    variantesResumen: Array.isArray(raw.variantesResumen) ? raw.variantesResumen : [],
    numVariantes: positivo(raw.numVariantes),
    racionDeclaradaTexto: texto(raw.racionDeclaradaTexto) || null,
    macrosRacionDeclarada: normalizarMacros(raw.macrosRacionDeclarada),
    conversionDeclarada: raw.conversionDeclarada && typeof raw.conversionDeclarada === 'object'
      ? { ...raw.conversionDeclarada } : null,
    precio: numero(raw.precio),
    moneda: texto(raw.moneda) || null,
    disponibilidad: texto(raw.disponibilidad) || null,
    esMuestra: Boolean(raw.esMuestra),
    esPack: Boolean(raw.esPack),
    estadoIdentidad: texto(raw.estadoIdentidad) || null,
    estadoComposicion: texto(raw.estadoComposicion) || null,
    pendienteVerificacion: Array.isArray(raw.pendienteVerificacion) ? raw.pendienteVerificacion.map(texto) : [],
    historial: Array.isArray(raw.historial) ? raw.historial.slice(-20) : [],
    version: positivo(raw.version) || 1,
    estadoCatalogo: texto(raw.estadoCatalogo) || 'activo',
    tipo: texto(raw.tipo) || 'otro',
    formato: texto(raw.formato) || null,
    presentacion: texto(raw.presentacion) || null,
    cantidadProducto: texto(raw.cantidadProducto) || null,
    tamanoRacion: normalizarRacion(raw.tamanoRacion),
    dosisDeclarada: normalizarDosis(raw.dosisDeclarada || {}),
    macros100, micros100, componentes,
    // Procedencia de las claves canónicas. Solo se incluye cuando existe:
    // así las fichas sin aminoácidos no cambian de huella sin motivo.
    ...(Object.keys(componentesAlias).length ? { componentesAlias } : {}),
    ingredientes: texto(raw.ingredientes) || null,
    alergenos14, estadoAlergenos,
    fabricante: texto(raw.fabricante) || null,
    fuente: texto(raw.fuente) || null,
    url: texto(raw.url) || null,
    fechaConsulta: texto(raw.fechaConsulta) || null,
    actualizadoOFF: texto(raw.actualizadoOFF) || null,
    registroOriginal: texto(raw.registroOriginal) || null,
    trazabilidadCampos: trazasPorDefecto(raw, nombre, marca, ean),
    // Solo se incluye cuando existen trazas individuales: así la huella de
    // las fichas sin este dato no cambia y no se reescriben sin motivo.
    ...(Object.keys(trazasComponentes).length ? { trazabilidadComponentes: trazasComponentes } : {}),
    estado,
    noDisponible,
    observaciones: texto(raw.observaciones) || null,
    advertencias: [...new Set(advertencias)],
    origen: texto(raw.origen) || 'usuario',
    esEjemplo: Boolean(raw.esEjemplo),
    favorito: Boolean(raw.favorito),
    gramosPorUnidad: positivo(raw.gramosPorUnidad),
    gramosPorCucharada: positivo(raw.gramosPorCucharada),
    densidadGml: positivo(raw.densidadGml),
    creado: texto(raw.creado) || new Date().toISOString(),
    actualizado: new Date().toISOString(),
  };
}

// Búsqueda por nombre, marca y tipo. Los registros de control nunca se listan.
export function buscarSuplementos(lista, q = '', filtros = {}) {
  const aguja = texto(q).toLocaleLowerCase('es');
  const agujaCodigo = normalizarGTIN(aguja);
  const coincideCodigo = valor => Boolean(agujaCodigo) && /^\d+$/.test(agujaCodigo)
    && normalizarGTIN(valor) === agujaCodigo;
  const {
    tipo = '', estado = '', soloFavoritos = false,
    marca = '', linea = '', categoria = '', tipoProducto = '',
    formato = '', sabor = '', sku = '', ean = '', soloHSN = false,
  } = filtros || {};
  const variantesDe = s => Array.isArray(s?.variantesResumen) && s.variantesResumen.length
    ? s.variantesResumen
    : (Array.isArray(s?.variantes) ? s.variantes.filter(v => v && typeof v === 'object') : []);
  return (Array.isArray(lista) ? lista : [])
    .filter(s => s && s.id !== ID_CONTROL_SEMILLA && s.id !== ID_CONTROL_HSN && s.tipo !== 'control')
    .filter(s => !tipo || s.tipo === tipo)
    .filter(s => !estado || s.estado === estado)
    .filter(s => !soloFavoritos || s.favorito)
    .filter(s => !marca || s.marca === marca || s.lineaNombre === marca)
    .filter(s => !linea || s.linea === linea)
    .filter(s => !categoria || s.categoria === categoria)
    .filter(s => !tipoProducto || s.tipoProducto === tipoProducto)
    .filter(s => !soloHSN || s.origen === 'hsn-oficial')
    .filter(s => {
      if (!formato) return true;
      if (texto(s.formato) === formato || texto(s.pesoDeclarado) === formato) return true;
      return variantesDe(s).some(v => texto(v.formato) === formato
        || texto(v.pesoDeclarado) === formato || texto(v.formatoDeclarado) === formato);
    })
    .filter(s => {
      if (!sabor) return true;
      if (texto(s.sabor) === sabor) return true;
      return variantesDe(s).some(v => texto(v.sabor) === sabor);
    })
    .filter(s => {
      if (!sku) return true;
      if (texto(s.skuOficial).toLocaleLowerCase('es') === sku.toLocaleLowerCase('es')) return true;
      return variantesDe(s).some(v => texto(v.sku || v.skuOficial)
        .toLocaleLowerCase('es') === sku.toLocaleLowerCase('es'));
    })
    .filter(s => {
      const buscado = texto(ean);
      if (!buscado) return true;
      const coincide = valor => {
        const v = texto(valor);
        return v.toLocaleLowerCase('es') === buscado.toLocaleLowerCase('es')
          || (normalizarGTIN(v) && normalizarGTIN(v) === normalizarGTIN(buscado));
      };
      if ([s.ean, s.gtin, s.skuOficial].some(coincide)) return true;
      return variantesDe(s).some(v => [v.ean, v.gtin, v.sku, v.skuOficial].some(coincide));
    })
    .filter(s => {
      if (!aguja) return true;
      const campos = [s.nombre, s.nombreComercial, s.nombreBase, s.marca, s.linea,
        s.lineaNombre, s.categoria, s.tipo, s.tipoProducto, s.formato, s.ean,
        s.gtin, s.skuOficial, s.sabor];
      if (campos.some(v => texto(v).toLocaleLowerCase('es').includes(aguja))) return true;
      if ([s.ean, s.gtin, s.skuOficial].some(coincideCodigo)) return true;
      return variantesDe(s).some(v => [v.nombreComercial, v.sku, v.skuOficial, v.ean,
        v.gtin, v.sabor, v.formato].some(c => texto(c).toLocaleLowerCase('es').includes(aguja))
        || [v.ean, v.gtin, v.sku, v.skuOficial].some(coincideCodigo));
    })
    .sort((a, b) => Number(Boolean(b.favorito)) - Number(Boolean(a.favorito))
      || texto(a.nombre).localeCompare(texto(b.nombre), 'es'));
}

// Convierte la cantidad introducida a gramos usando SOLO datos declarados.
// Si la ficha no indica densidad o peso por unidad, el resultado es
// desconocido: nunca se inventa un gramo por cápsula ni un ml = 1 g.
export function convertirCantidad(sup, cantidad, unidad) {
  const n = positivo(cantidad);
  const u = texto(unidad).toLocaleLowerCase('es');
  const desconocido = motivo => ({ gramos: null, estado: 'desconocido', motivo });
  if (n == null) return desconocido('Escribe una cantidad mayor que cero.');
  if (['g', 'gr', 'gramo', 'gramos'].includes(u)) return { gramos: n, estado: 'confirmado', motivo: null };
  if (u === 'mg') return { gramos: n / 1000, estado: 'confirmado', motivo: null };
  if (['µg', 'mcg', 'microgramo', 'microgramos'].includes(u)) return { gramos: n / 1000000, estado: 'confirmado', motivo: null };
  if (u === 'kg') return { gramos: n * 1000, estado: 'confirmado', motivo: null };
  if (u === 'ml') {
    const d = positivo(sup?.densidadGml);
    return d ? { gramos: n * d, estado: 'confirmado', motivo: null }
      : desconocido('La ficha no declara densidad (g/ml); no se puede convertir sin inventar un valor.');
  }
  if (['capsula', 'cápsula', 'capsulas', 'cápsulas', 'comprimido', 'comprimidos'].includes(u)) {
    const g = positivo(sup?.gramosPorUnidad);
    return g ? { gramos: n * g, estado: 'confirmado', motivo: null }
      : desconocido('La ficha no declara gramos por cápsula/comprimido.');
  }
  if (u === 'cucharada') {
    const g = positivo(sup?.gramosPorCucharada);
    return g ? { gramos: n * g, estado: 'confirmado', motivo: null }
      : desconocido('La ficha no declara gramos por cucharada.');
  }
  if (['racion', 'ración', 'raciones'].includes(u)) {
    const g = positivo(sup?.tamanoRacion?.gramos);
    return g ? { gramos: n * g, estado: 'confirmado', motivo: null }
      : desconocido('La ficha no declara tamaño de ración.');
  }
  return desconocido(`Unidad «${u}» sin conversión declarada.`);
}

function escalarComponentes(sup, gramos) {
  // Los snapshots antiguos pueden traer aún las dos claves del mismo
  // aminoácido. Se normaliza una copia antes de escalar; el snapshot
  // guardado no se reescribe.
  const declarados = Object.entries(normalizarComponentes(sup?.componentes).componentes);
  if (!declarados.length || gramos == null) return null;
  const racion = positivo(sup?.tamanoRacion?.gramos);
  const out = {};
  for (const [clave, c] of declarados) {
    const factor = c.base === 'racion' && racion ? gramos / racion : gramos / 100;
    out[clave] = { valor: Math.round(c.valor * factor * 10000) / 10000, unidad: c.unidad, base: c.base, estado: c.estado };
  }
  return out;
}

// Usa SIEMPRE los motores de alimentos.js: aquí no se calcula nada dos veces.
export function calcularToma(sup, cantidad, unidad) {
  const conversion = convertirCantidad(sup, cantidad, unidad);
  const gramos = conversion.gramos;
  const conMacros = Object.keys(sup?.macros100 || {}).length > 0;
  const conMicros = Object.keys(sup?.micros100 || {}).length > 0;
  const composicionDeclarada = conMacros || conMicros;
  const macros = composicionDeclarada && gramos != null ? macrosDe(sup.macros100, gramos) : null;
  const micros = conMicros && gramos != null
    ? microsEntrada({ micros100: sup.micros100, gramos }) : null;
  // Los registros guardados antes de la corrección pueden traer dos avisos
  // whey con distinta redacción. Se muestra uno solo sin reescribir la ficha.
  const advertencias = [];
  let avisoWheyVisto = false;
  for (const a of (sup?.advertencias || [])) {
    if (/whey/i.test(a)) {
      if (avisoWheyVisto) continue;
      avisoWheyVisto = true;
    }
    advertencias.push(a);
  }
  if (!composicionDeclarada) advertencias.push('Composición desconocida: la ficha no declara macros ni micronutrientes. La toma se guarda, pero no se suma como cero.');
  if (conversion.estado !== 'confirmado') advertencias.push(`Cantidad no convertible: ${conversion.motivo}. Se guarda la cantidad declarada, sin nutrientes calculados.`);
  return {
    gramos, conversion, composicionDeclarada,
    macros, micros, componentes: escalarComponentes(sup, gramos),
    estadoComposicion: composicionDeclarada ? (sup.estado || 'confirmado') : 'desconocido',
    advertencias: [...new Set(advertencias)],
  };
}

// Snapshot autocontenido: si la ficha cambia después, la toma sigue igual.
export function entradaSuplemento(sup, { cantidad, unidad, comida, fecha, hora, calculo }) {
  const c = calculo || calcularToma(sup, cantidad, unidad);
  const entrada = {
    tipo: 'suplemento',
    tipoEntrada: 'suplemento',
    id: sup.id,
    suplementoId: sup.id,
    nombre: sup.nombre,
    marca: sup.marca || '',
    ean: sup.ean || null,
    gtin: sup.gtin || null,
    sku: sup.skuOficial || null,
    nombreComercial: texto(sup.nombreComercial) || sup.nombre,
    nombreBase: texto(sup.nombreBase) || null,
    productoBaseId: sup.productoBaseId || null,
    varianteId: esVarianteProducto(sup) ? sup.id : null,
    linea: sup.linea || null,
    fecha: texto(fecha) || null,
    hora: texto(hora) || null,
    cantidadConsumida: numero(cantidad),
    unidad: texto(unidad),
    gramos: c.gramos,
    conversionEstado: c.conversion.estado,
    conversionMotivo: c.conversion.motivo,
    macros100: c.composicionDeclarada && Object.keys(sup.macros100 || {}).length ? { ...sup.macros100 } : null,
    micros100: Object.keys(sup.micros100 || {}).length ? { ...sup.micros100 } : null,
    componentes: c.componentes,
    // Declaración sin escalar: sin ella, recalcular una toma escalaría dos
    // veces los componentes. Se guarda junto al valor escalado histórico.
    componentesDeclarados: Object.keys(sup.componentes || {}).length
      ? Object.fromEntries(Object.entries(sup.componentes).map(([k, c]) => [k, { ...c }])) : null,
    // Procedencia de las claves canónicas, para que la ficha mostrada desde
    // una toma antigua siga indicando de dónde venía cada aminoácido.
    componentesAlias: Object.keys(sup.componentesAlias || {}).length
      ? Object.fromEntries(Object.entries(sup.componentesAlias)
        .map(([k, v]) => [k, [...(Array.isArray(v) ? v : [])]])) : null,
    dosisDeclarada: { ...(sup.dosisDeclarada || {}) },
    tamanoRacion: sup.tamanoRacion ? { ...sup.tamanoRacion } : null,
    // Factores de conversión declarados en la ficha. Sin ellos una edición
    // posterior no podría reconstruir cápsulas, cucharadas ni mililitros.
    gramosPorUnidad: positivo(sup.gramosPorUnidad),
    gramosPorCucharada: positivo(sup.gramosPorCucharada),
    densidadGml: positivo(sup.densidadGml),
    // Identidad HSN: base, variante y pack son entidades distintas.
    esProductoBase: Boolean(sup.esProductoBase),
    esVarianteHSN: Boolean(sup.esVarianteHSN),
    esPack: Boolean(sup.esPack),
    procedencia: {
      fuente: sup.fuente || null, url: sup.url || null,
      fechaConsulta: sup.fechaConsulta || null, registroOriginal: sup.registroOriginal || null,
      origen: sup.origen, esEjemplo: Boolean(sup.esEjemplo),
    },
    estadoComposicion: c.estadoComposicion,
    composicionDesconocida: !c.composicionDeclarada || c.conversion.estado !== 'confirmado',
    advertencias: [...c.advertencias],
    esSuplemento: true,
  };
  return { comida, entrada };
}

// Recupera la declaración por 100 g / ración. Las tomas antiguas no guardaban
// ese dato: se reconstruye desescalando el snapshot con sus propios gramos.
function declaracionComponentes(entrada) {
  const declarados = entrada?.componentesDeclarados;
  if (declarados && typeof declarados === 'object') {
    return Object.fromEntries(Object.entries(declarados).map(([k, c]) => [k, { ...c }]));
  }
  const escalados = entrada?.componentes;
  if (!escalados || typeof escalados !== 'object') return {};
  const gramos = positivo(entrada.gramos);
  if (gramos == null) return {};
  const racion = positivo(entrada.tamanoRacion?.gramos);
  const out = {};
  for (const [k, c] of Object.entries(escalados)) {
    const factor = c?.base === 'racion' && racion ? gramos / racion : gramos / 100;
    out[k] = {
      ...c,
      valor: factor > 0 ? Math.round((c.valor / factor) * 1e6) / 1e6 : c.valor,
    };
  }
  return out;
}

// Reconstruye una toma ya guardada usando SOLO su snapshot. Consultar la ficha
// actual convertiría una toma histórica en un valor distinto; inventar una
// equivalencia ausente daría cifras falsas. Devuelve un objeto NUEVO: fecha,
// comida, hora, procedencia y composición declarada se conservan tal cual.
export function recalcularToma(entrada, cantidad, unidad) {
  if (!entrada || typeof entrada !== 'object') return null;
  const declarados = declaracionComponentes(entrada);
  const fichaDelSnapshot = {
    macros100: entrada.macros100 || null,
    micros100: entrada.micros100 || null,
    componentes: declarados,
    tamanoRacion: entrada.tamanoRacion || null,
    gramosPorUnidad: entrada.gramosPorUnidad ?? null,
    gramosPorCucharada: entrada.gramosPorCucharada ?? null,
    densidadGml: entrada.densidadGml ?? null,
    estado: entrada.estadoComposicion,
    advertencias: Array.isArray(entrada.advertencias) ? entrada.advertencias : [],
  };
  const c = calcularToma(fichaDelSnapshot, cantidad, unidad);
  return {
    ...entrada,
    cantidadConsumida: numero(cantidad),
    unidad: texto(unidad),
    gramos: c.gramos,
    conversionEstado: c.conversion.estado,
    conversionMotivo: c.conversion.motivo,
    componentes: c.componentes,
    componentesDeclarados: Object.keys(declarados).length ? declarados : null,
    estadoComposicion: c.estadoComposicion,
    composicionDesconocida: !c.composicionDeclarada || c.conversion.estado !== 'confirmado',
    advertencias: c.advertencias,
  };
}

const claveDuplicado = v => texto(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('es').replace(/[\s.,;:·\-_/]+/g, '');

// Base, variante y pack de HSN son fichas separadas: aunque compartan EAN o
// nombre comercial no se tratan como la misma toma repetida.
function identidadHSN(e) {
  return [
    texto(e?.productoBaseId) || texto(e?.suplementoId) || texto(e?.id) || '',
    texto(e?.suplementoId) || texto(e?.id) || '',
    e?.esVarianteHSN ? 'variante' : 'base',
    e?.esPack ? 'pack' : 'unidad',
  ].join('|');
}
function esFichaHSN(e) {
  return esSuplemento(e) && (
    texto(e?.origen) === 'hsn-oficial'
    || texto(e?.procedencia?.origen) === 'hsn-oficial'
    || texto(e?.suplementoId).startsWith('hsn-')
    || Boolean(e?.esVarianteHSN || e?.esProductoBase || e?.esPack)
  );
}

function duplicidadWhey(lista) {
  const alimentos = lista.filter(e => !esSuplemento(e)
    && (/whey/i.test(texto(e?.nombre)) || /whey/i.test(texto(e?.id))));
  const suplementos = lista.filter(e => esSuplemento(e)
    && (/whey/i.test(texto(e?.nombre)) || esWhey(e)));
  return {
    alimentos, suplementos,
    aviso: alimentos.length && suplementos.length
      ? `${alimentos.length} registro(s) de «whey» como alimento y ${suplementos.length} como suplemento en el mismo día. Puede ser la misma toma contada dos veces: conserva solo la que corresponda. No se han fusionado ni borrado registros históricos.`
      : null,
  };
}

// Sistema general de avisos: EAN/GTIN, SKU y nombre+marca, además del caso
// whey. Solo informa; nunca fusiona, borra ni altera registros existentes.
export function detectarDuplicados(entradas) {
  const lista = (Array.isArray(entradas) ? entradas : []).filter(Boolean);
  const avisos = [];
  const whey = duplicidadWhey(lista);
  if (whey.aviso) {
    avisos.push({
      tipo: 'whey', valor: 'whey', texto: whey.aviso,
      registros: [...whey.alimentos, ...whey.suplementos].map(e => e.id || e.suplementoId).filter(Boolean),
    });
  }

  const suplementos = lista.filter(esSuplemento);
  const criterios = [
    { tipo: 'ean', valor: e => claveDuplicado(e.ean || e.gtin), etiqueta: e => `EAN ${texto(e.ean || e.gtin)}` },
    { tipo: 'sku', valor: e => claveDuplicado(e.sku), etiqueta: e => `SKU ${texto(e.sku)}` },
    {
      tipo: 'nombre-marca',
      valor: e => (texto(e.nombre) ? `${claveDuplicado(e.nombre)}|${claveDuplicado(e.marca)}` : ''),
      etiqueta: e => `«${texto(e.nombre)}» de ${texto(e.marca) || 'marca desconocida'}`,
    },
  ];
  for (const criterio of criterios) {
    const grupos = new Map();
    for (const e of suplementos) {
      const valor = criterio.valor(e);
      if (!valor) continue;
      if (!grupos.has(valor)) grupos.set(valor, []);
      grupos.get(valor).push(e);
    }
    for (const [valor, miembros] of grupos) {
      if (miembros.length < 2) continue;
      const repetidos = miembros.some((a, i) => miembros.slice(i + 1).some(b =>
        !(esFichaHSN(a) && esFichaHSN(b) && identidadHSN(a) !== identidadHSN(b))));
      if (!repetidos) continue;
      avisos.push({
        tipo: criterio.tipo, valor,
        texto: `${miembros.length} registro(s) de suplemento comparten ${criterio.etiqueta(miembros[0])} en el mismo día. Revisa si es la misma toma duplicada; DanTal no fusiona ni borra registros.`,
        registros: miembros.map(e => e.id || e.suplementoId).filter(Boolean),
      });
    }
  }
  return { avisos, whey, texto: avisos.map(a => a.texto).join(' ') || null };
}

// Compatibilidad con la API anterior: el aviso whey sale del sistema general,
// por lo que no puede aparecer dos veces con textos distintos.
export function detectarDuplicidadWhey(entradas) {
  const { whey, avisos } = detectarDuplicados(entradas);
  return { ...whey, avisos: avisos.filter(a => a.tipo === 'whey').map(a => a.texto) };
}

// Resumen de un conjunto de tomas con los mismos motores que el Diario.
export function resumenTomas(entradas) {
  const validas = (entradas || []).filter(e => esSuplemento(e) && !e.composicionDesconocida);
  const { macros, micros } = consumoNutrientes(validas);
  return {
    tomas: (entradas || []).filter(esSuplemento).length,
    conDato: validas.length,
    sinDato: (entradas || []).filter(esSuplemento).length - validas.length,
    macros: sumarMacros(validas.map(e => (e.macros100 ? macrosDe(e.macros100, e.gramos) : null))),
    micros,
  };
}

// ---------------------------------------------------------------------
// Semilla: 5 fichas. Solo la proteína tiene composición verificable (OFF).
// El resto se crea incompleta y pendiente, sin inventar dosis ni valores.
// ---------------------------------------------------------------------
const OFF_WHEY = {
  fuente: 'Open Food Facts',
  url: 'https://world.openfoodfacts.org/product/8431876342857',
  fechaConsulta: '2026-11-25',
  actualizadoOFF: '2026-03-28',
  registroOriginal: 'c08e188f65778c2fc43465809c3d2d2bac3c1ae0b23dff8f1bf29f4dbc2216d3',
};
const trazaOFF = campoOFF => ({
  campoOFF, estado: 'declarado_por_la_fuente', fuente: OFF_WHEY.fuente,
  url: OFF_WHEY.url, fechaConsulta: OFF_WHEY.fechaConsulta,
  actualizadoOFF: OFF_WHEY.actualizadoOFF, registroOriginal: OFF_WHEY.registroOriginal,
});
const pendiente = (nombre, marca, tipo, extra = {}) => ({
  nombre, marca, tipo,
  formato: extra.formato || null,
  presentacion: extra.presentacion || null,
  cantidadProducto: extra.cantidadProducto || null,
  ean: extra.ean || null,
  origen: 'semilla-pendiente', esEjemplo: true, estado: 'desconocido',
  observaciones: extra.observaciones,
  advertencias: ['Ficha pendiente: no se han inventado dosis ni composición. Consulta el envase antes de registrarla como propia.'],
});

export function semillaSuplementos() {
  return [
    normalizarSuplemento({
      id: 'semilla:whey-8431876342857',
      nombre: 'Whey protein', marca: 'Carrefour', tipo: 'proteina',
      formato: 'polvo', ean: '8431876342857',
      ...OFF_WHEY,
      origen: 'semilla-real-off', esEjemplo: true, estado: 'confirmado',
      tamanoRacion: { gramos: 30, base: '30.0 g', estado: 'confirmado' },
      dosisDeclarada: {
        valor: null, unidad: 'g', estado: 'desconocido',
        texto: 'La ficha declara una ración de 30 g, pero no una dosis recomendada por el fabricante.',
      },
      macros100: { kcal: 397, kJ: 1672.1, prot: 73, carbs: 16, azucares: 6.6, grasa: 4.3, saturada: 3 },
      trazabilidadCampos: {
        nombre: trazaOFF('product_name'), marca: trazaOFF('brands'), ean: trazaOFF('code'),
        tipo: { estado: 'clasificado_por_dantal', fuente: 'Nombre declarado por la fuente', fechaConsulta: OFF_WHEY.fechaConsulta },
        formato: { estado: 'sin_dato_verificable', fuente: null },
        macros100: trazaOFF('nutriments (por 100 g)'),
        micros100: { estado: 'no_disponible', fuente: OFF_WHEY.fuente, url: OFF_WHEY.url, fechaConsulta: OFF_WHEY.fechaConsulta },
        tamanoRacion: trazaOFF('nutriments (ración declarada)'),
        dosisDeclarada: { estado: 'no_disponible', fuente: OFF_WHEY.fuente, url: OFF_WHEY.url, fechaConsulta: OFF_WHEY.fechaConsulta },
        ingredientes: { estado: 'no_disponible', fuente: OFF_WHEY.fuente, url: OFF_WHEY.url, fechaConsulta: OFF_WHEY.fechaConsulta },
        alergenos14: { estado: 'no_disponible', fuente: OFF_WHEY.fuente, url: OFF_WHEY.url, fechaConsulta: OFF_WHEY.fechaConsulta },
        fuente: trazaOFF('fuente de la ficha local'), url: trazaOFF('url de la ficha local'),
        fechaConsulta: trazaOFF('fecha de consulta local'),
      },
      observaciones: 'Macros por 100 g y ración de 30 g declarados en la ficha detallada de Open Food Facts (lote 025). La ración no es una recomendación de dosis.',
      advertencias: ['Este producto también existe como alimento «whey»; no contabilices la misma toma dos veces.'],
    }),
    normalizarSuplemento(pendiente(
      'Creatina monohidrato', '', 'creatina',
      { observaciones: 'No hay ficha contrastable en el catálogo local. Sin gramos por cápsula ni dosis declarada: alta pendiente.', advertencias: [] },
    )),
    normalizarSuplemento(pendiente(
      'Multivitamin', 'Carrefour', 'multivitaminico',
      { ean: '3560071542917', presentacion: '10 x 18 cl', formato: 'bebida',
        observaciones: 'Nombre, marca y EAN verificables en el catálogo comercial local. Sin valores de vitaminas declarados en la ficha consultada: alta pendiente.', advertencias: [] },
    )),
    normalizarSuplemento(pendiente(
      'Cafeína', '', 'cafeina',
      { observaciones: 'No se encontró ficha verificable como suplemento de cafeína en el catálogo local. Sin mg ni dosis declarados: alta pendiente.', advertencias: [] },
    )),
    normalizarSuplemento(pendiente(
      'Bebida láctea omega 3', 'Alteza', 'omega3',
      { ean: '8480024833297', formato: 'bebida',
        observaciones: 'Nombre, marca y EAN verificables en el catálogo comercial local. La etiqueta no declara miligramos de EPA/DHA en la ficha consultada: alta pendiente.', advertencias: [] },
    )),
  ].filter(Boolean);
}

export function semillaConControl() {
  return [...semillaSuplementos(), {
    id: ID_CONTROL_SEMILLA, tipo: 'control', nombre: 'Control de semilla',
    esEjemplo: true, origen: 'sistema', fechaConsulta: '2026-11-25',
    version: 1, actualizado: new Date().toISOString(),
  }];
}

export const VERSION_MODELO = 2;
