// =====================================================================
// escaner-identidad.js · Qué es un código leído por el escáner
// ---------------------------------------------------------------------
// Resuelve si un GTIN/EAN pertenece a un suplemento (ficha o declaración
// de variante), a un alimento del catálogo local o a Open Food Facts.
// NO calcula nutrientes, NO crea fichas y NO escribe en el Diario: solo
// devuelve candidatos para que la interfaz pida confirmación.
//
// Reglas:
//  · El código se compara normalizado (espacios/guiones), tal como lo
//    declaró cada ficha. Nunca se reescribe un identificador guardado.
//  · El dígito de control se informa, pero no descarta una coincidencia:
//    parte del catálogo HSN declarado tiene EAN no GS1 y no se va a inventar
//    ni a corregir ningún código.
//  · SKU no se trata como GTIN.
//  · Varias coincidencias se devuelven todas: nunca se elige una al azar
//    ni se fusionan fichas.
// =====================================================================

import { normalizarGTIN, validarGTIN, esVarianteProducto } from './suplementos.js';
import { listarSuplementos } from './suplementos-idb.js';
import { buscarAlimentos } from './alimentos.js';
import { buscarAlimento } from './escaner.js';

const texto = v => String(v ?? '').trim();

// Solo GTIN/EAN: el SKU es un identificador interno sin dígito de control.
function codigosDeFicha(sup) {
  return [sup?.ean, sup?.gtin].map(normalizarGTIN).filter(Boolean);
}

function codigosDeResumen(v) {
  return [v?.ean, v?.gtin].map(normalizarGTIN).filter(Boolean);
}

function candidatoSuplemento(sup, base, coincidencia, codigo, resumen = null) {
  return {
    tipo: 'suplemento',
    // Un mismo ficha puede declarar el EAN directamente y además en el
    // resumen de su base. Es UNA ficha: no debe contarse como ambigüedad.
    clave: `sup:${sup.id}`,
    suplemento: sup,
    base: base || null,
    variante: !resumen && esVarianteProducto(sup) ? sup : null,
    varianteResumen: resumen || null,
    nombre: texto(resumen?.nombreComercial || sup.nombreComercial || sup.nombre) || 'Suplemento sin nombre',
    marca: texto(sup.marca),
    codigo,
    coincidencia,
    fuente: sup.origen || 'usuario',
  };
}

function candidatoAlimento(producto, codigo, fuente) {
  return {
    tipo: 'alimento',
    clave: `alimento:${producto.id}:${codigo}`,
    producto,
    nombre: texto(producto.nombre) || 'Alimento sin nombre',
    marca: texto(producto.marca),
    codigo,
    coincidencia: 'catalogo',
    fuente,
  };
}

/**
 * Identifica un código leído. Devuelve:
 * { codigo, raw, validacion, estado: 'unico'|'ambiguo'|'no_encontrado',
 *   candidatos: [], conSuplemento, fuente }
 *
 * `soloCache` evita la consulta remota al reabrir el historial sin red.
 */
export async function identificarCodigo(raw, { soloCache = false, incluirRemoto = true } = {}) {
  const original = texto(raw);
  const codigo = normalizarGTIN(original);
  const validacion = validarGTIN(original);
  const vacio = fuente => ({
    codigo, raw: original, validacion, estado: 'no_encontrado',
    candidatos: [], conSuplemento: false, fuente,
  });
  if (!codigo || !/^\d+$/.test(codigo)) return vacio(null);

  const resultado = candidatos => ({
    codigo, raw: original, validacion,
    estado: candidatos.length > 1 ? 'ambiguo' : candidatos.length === 1 ? 'unico' : 'no_encontrado',
    candidatos,
    conSuplemento: candidatos.some(c => c.tipo === 'suplemento'),
    fuente: candidatos[0]?.fuente || null,
  });

  let suplementos = [];
  try { suplementos = await listarSuplementos(); } catch (_) { /* catálogo no disponible */ }
  const porId = new Map(suplementos.map(s => [s.id, s]));
  const candidatos = [];
  const vistos = new Set();

  const anadir = candidato => {
    if (vistos.has(candidato.clave)) return;
    vistos.add(candidato.clave);
    candidatos.push(candidato);
  };

  // 1) Fichas propias e HSN que declaran el código en su identidad.
  for (const s of suplementos) {
    if (!codigosDeFicha(s).includes(codigo)) continue;
    const base = esVarianteProducto(s) ? (porId.get(s.productoBaseId) || null) : s;
    anadir(candidatoSuplemento(s, base, 'ficha', codigo));
  }

  // 2) Declaraciones de variante dentro de una ficha base. No se crea una
  //    ficha nueva: se apunta a la variante real si existe, o a la base
  //    cuando HSN solo publicó el resumen comercial.
  for (const s of suplementos) {
    const resumen = Array.isArray(s.variantesResumen) ? s.variantesResumen : [];
    for (const v of resumen) {
      if (!v || !codigosDeResumen(v).includes(codigo)) continue;
      const fichaVariante = texto(v.id) ? porId.get(texto(v.id)) : null;
      const destino = fichaVariante || s;
      const base = esVarianteProducto(destino)
        ? (porId.get(destino.productoBaseId) || s)
        : destino;
      anadir(candidatoSuplemento(destino, base, 'declaracion-base', codigo, v));
    }
  }

  // 3) Catálogo de alimentos ya cargado en la app (serie + supermercados).
  let alimentos = [];
  try { alimentos = buscarAlimentos(codigo); } catch (_) { /* sin catálogo */ }
  for (const a of alimentos) {
    if (!codigosDeFicha(a).includes(codigo)) continue;
    anadir(candidatoAlimento(a, codigo, a.origen || 'catálogo local'));
  }

  // Si ya hay suplementos identificados, NO se consulta Open Food Facts:
  // un EAN de suplemento no debe acabar convertido en alimento por una
  // respuesta remota ajena al catálogo de la app.
  if (candidatos.length) return resultado(candidatos);
  if (!incluirRemoto) return vacio(null);

  try {
    const remoto = await buscarAlimento(original, { soloCache });
    if (remoto?.codigo) {
      anadir(candidatoAlimento(remoto, normalizarGTIN(remoto.codigo) || codigo, remoto.fuente || 'Open Food Facts'));
    }
  } catch (_) { /* sin red: se mantiene como no encontrado */ }
  return resultado(candidatos);
}
