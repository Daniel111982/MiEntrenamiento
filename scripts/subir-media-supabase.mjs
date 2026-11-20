// Sube a Supabase las ilustraciones de RepDB emparejadas en
// scripts/mapeo-revisar.json y actualiza public.catalogos (tipo='ejercicio')
// con la media y los datos técnicos dentro del JSONB `datos`.
//
// Uso (desde la raíz del proyecto):
//   node scripts/subir-media-supabase.mjs --dry-run
//   node scripts/subir-media-supabase.mjs
// Lee automáticamente .env.local y .env (en ese orden); también acepta
// variables de entorno. Nunca imprime el valor de la clave.
//
// Opciones:
//   --dry-run           No sube nada; muestra lo que SE haría.
//   --include-review    Incluye también los 9 emparejamientos marcados
//                       como "revisar" (por defecto solo van los "auto").
//   --preservar         Si el ejercicio ya existe en catalogos, conserva
//                       sus campos actuales y solo añade/actualiza media.
//
// Seguridad: la clave service_role va SOLO en una variable de entorno de
// este script (fuera de la app y fuera del repo). Nunca se escribe en
// ningún archivo del proyecto. El bucket debe existir antes: ejecuta
// supabase/esquema-media-ejercicios.sql en el editor SQL.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAPEO = path.join(ROOT, 'scripts', 'mapeo-revisar.json');

// Carga archivos .env locales sin sobrescribir lo que ya venga del entorno.
async function cargarEnv(nombre) {
  try {
    const texto = await readFile(path.join(ROOT, nombre), 'utf8');
    for (const linea of texto.split(/\r?\n/)) {
      const limpia = linea.trim();
      if (!limpia || limpia.startsWith('#')) continue;
      const separador = limpia.indexOf('=');
      if (separador < 0) continue;
      const clave = limpia.slice(0, separador).trim();
      let valor = limpia.slice(separador + 1).trim();
      if ((valor.startsWith('"') && valor.endsWith('"')) ||
          (valor.startsWith("'") && valor.endsWith("'"))) valor = valor.slice(1, -1);
      if (clave && process.env[clave] === undefined) process.env[clave] = valor;
    }
  } catch { /* archivo opcional */ }
}
await cargarEnv('.env.local');
await cargarEnv('.env');

const args = new Set(process.argv.slice(2));
const DRY = args.has('--dry-run');
const INCLUDE_REVIEW = args.has('--include-review');
const PRESERVAR = args.has('--preservar');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BUCKET = 'exercise-media';

const cabeceras = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
};

function URL_publica(ruta) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${ruta}`;
}

async function peticion(url, opciones = {}) {
  const res = await fetch(url, { ...opciones, headers: { ...cabeceras, ...(opciones.headers || {}) } });
  const texto = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${texto.slice(0, 200)}`);
  return texto ? JSON.parse(texto) : null;
}

async function subirImagen(origenRelativo, destino) {
  const bytes = await readFile(path.join(ROOT, '.tmp', 'repdb', origenRelativo));
  return peticion(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${destino}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=3600',
      'x-upsert': 'true',
    },
    body: bytes,
  });
}

async function leerDatosExistentes(id) {
  const filas = await peticion(
    `${SUPABASE_URL}/rest/v1/catalogos?tipo=eq.ejercicio&id=eq.${encodeURIComponent(id)}&select=datos&limit=1`);
  return filas?.[0]?.datos || {};
}

async function guardarCatalogo(fila) {
  await peticion(`${SUPABASE_URL}/rest/v1/catalogos`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal', 'Content-Type': 'application/json' },
    body: JSON.stringify(fila),
  });
}

const mapeo = JSON.parse(await readFile(MAPEO, 'utf8'));
const seleccionados = mapeo.matches.filter(m =>
  m.estado === 'auto' || (INCLUDE_REVIEW && m.estado === 'revisar'));

if (!DRY && (!SUPABASE_URL || !SERVICE_KEY)) {
  console.error('Falta SUPABASE_SERVICE_ROLE_KEY. Rellénala en el archivo .env del proyecto');
  console.error('(Supabase → Project Settings → API → service_role). No la compartas ni la subas a Git.');
  process.exit(1);
}

console.log(`Modo: ${DRY ? 'SIMULACIÓN (--dry-run)' : 'SUBIDA REAL'}`);
console.log(`Emparejamientos: ${mapeo.auto} auto, ${mapeo.revision} revisar`);
console.log(`Se procesarán: ${seleccionados.length}${INCLUDE_REVIEW ? ' (incluye revisar)' : ' (solo auto)'}`);
if (PRESERVAR) console.log('Se conservarán los campos ya existentes en catalogos.datos.');
if (!DRY) console.log(`Bucket: ${BUCKET} · Proyecto: ${SUPABASE_URL}`);

let ok = 0, fallos = 0, archivos = 0, sinSegunda = 0;

for (const m of seleccionados) {
  const inicio = m.imagenes?.start;
  if (!inicio) {
    console.warn(`  ⚠ ${m.id}: sin imagen inicial, se omite`);
    continue;
  }
  const fin = m.imagenes?.end;
  if (!fin) sinSegunda++;

  const rutaInicio = `ejercicios/${m.id}-start.webp`;
  const rutaFin = fin ? `ejercicios/${m.id}-end.webp` : null;
  const media_url = URL_publica(rutaInicio);
  const media_url_end = rutaFin ? URL_publica(rutaFin) : null;

  if (DRY) {
    console.log(`  · ${m.id}: ${inicio}${fin ? ' + ' + fin : ' (una sola pose)'}`);
    archivos += fin ? 2 : 1;
    ok++;
    continue;
  }

  try {
    await subirImagen(inicio, rutaInicio);
    archivos++;
    if (rutaFin) { await subirImagen(fin, rutaFin); archivos++; }

    const base = m.nuestro || {};
    const anteriores = PRESERVAR ? await leerDatosExistentes(m.id) : {};
    const datos = {
      ...anteriores,
      id: m.id,
      nombre: base.nombre || m.nombre,
      patron: base.patron || '',
      musculos: base.musculos || [],
      equipo: base.equipo || [],
      compuesto: Boolean(base.compuesto),
      desc: base.desc || '',
      ...(base.tipo ? { tipo: base.tipo } : {}),
      ...(base.nivelMin ? { nivelMin: base.nivelMin } : {}),
      ...(base.videoCustom ? { videoCustom: base.videoCustom } : {}),
      ...(base.maquinaCustom ? {
        maquinaCustom: base.maquinaCustom, lineaCustom: base.lineaCustom,
        musculoCustom: base.musculoCustom, ajusteCustom: base.ajusteCustom,
      } : {}),
      media_url,
      ...(media_url_end ? { media_url_end } : { media_url_end: null }),
      primary_muscles: m.primary_muscles || [],
      secondary_muscles: m.secondary_muscles || [],
      execution_steps: m.instructions || [],
      fuente_media: 'RepDB',
    };
    await guardarCatalogo({ tipo: 'ejercicio', id: m.id, datos, activo: true,
      actualizado: new Date().toISOString() });
    console.log(`  ✓ ${m.id}`);
    ok++;
  } catch (e) {
    console.error(`  ✗ ${m.id}: ${e.message}`);
    fallos++;
  }
}

console.log(`\nResumen: ${ok} ejercicios procesados, ${archivos} archivos ${DRY ? 'que se subirían' : 'subidos'}, ${fallos} fallos.`);
console.log(`${sinSegunda} ejercicios tienen una sola postura (se usa la misma imagen en ambas).`);
if (DRY) console.log('\nPara subir de verdad, rellena SUPABASE_SERVICE_ROLE_KEY en .env y quita --dry-run.');
