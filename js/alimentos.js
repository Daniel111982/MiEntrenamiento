// Base de datos de alimentos, comidas y recetas de DanTal.
// Valores por 100 g de alimento (kcal, proteína, carbohidratos, grasa y fibra en gramos).
// «porcion» es una ración habitual orientativa en gramos.

// Los micronutrientes declarados por Open Food Facts se definen en el escáner.
// Se importa la constante (no la lógica) para tener una sola lista de claves.
import { CLAVES_MICROS } from './escaner.js';
import { ALIMENTOS_IMPORTADOS } from './alimentos-importados.js';
import { ALIMENTOS_NATURALES } from './alimentos-naturales.js';
import { RECETAS_IMPORTADAS } from './recetas-catalogo.js';
import { estadoCatalogoIDB, leerCatalogoIDB, guardarCatalogoIDB, leerLoteIDB,
  versionLoteIDB, guardarDetalleIDB } from './catalogo-idb.js';
import { clasificarReceta } from './dieta.js';

export const COMIDAS = {
  desayuno: { nombre: 'Desayuno', icono: '🌅', hora: '07:30' },
  comida: { nombre: 'Comida', icono: '🍽️', hora: '13:30' },
  snack: { nombre: 'Merienda', icono: '🍎', hora: '17:30' },
  cena: { nombre: 'Cena', icono: '🌙', hora: '20:30' },
};

export const CATEGORIAS_ALIMENTO = {
  proteinas: 'Proteínas',
  carbohidratos: 'Cereales y tubérculos',
  legumbres: 'Legumbres',
  verduras: 'Verduras',
  frutas: 'Frutas',
  lacteos: 'Lácteos',
  grasas: 'Grasas y frutos secos',
  bebidas: 'Bebidas y otros',
};

// kcal, prot, carbs, grasa, fibra por 100 g.
export const ALIMENTOS = [
  // ---- Proteínas ----
  { id: 'pollo-pechuga', nombre: 'Pollo (pechuga)', cat: 'proteinas', kcal: 165, prot: 31, carbs: 0, grasa: 3.6, fibra: 0, porcion: 150 },
  { id: 'pavo-pechuga', nombre: 'Pavo (pechuga)', cat: 'proteinas', kcal: 135, prot: 29, carbs: 0, grasa: 1.5, fibra: 0, porcion: 150 },
  { id: 'ternera-solomillo', nombre: 'Ternera (solomillo)', cat: 'proteinas', kcal: 143, prot: 22, carbs: 0, grasa: 6, fibra: 0, porcion: 150 },
  { id: 'cerdo-lomo', nombre: 'Cerdo (lomo)', cat: 'proteinas', kcal: 143, prot: 21, carbs: 0, grasa: 6, fibra: 0, porcion: 150 },
  { id: 'huevo', nombre: 'Huevo entero', cat: 'proteinas', kcal: 143, prot: 13, carbs: 1.1, grasa: 9.5, fibra: 0, porcion: 60 },
  { id: 'clara-huevo', nombre: 'Clara de huevo', cat: 'proteinas', kcal: 52, prot: 11, carbs: 0.7, grasa: 0.2, fibra: 0, porcion: 100 },
  { id: 'atun-natural', nombre: 'Atún al natural', cat: 'proteinas', kcal: 116, prot: 26, carbs: 0, grasa: 1, fibra: 0, porcion: 100 },
  { id: 'atun-aceite', nombre: 'Atún en aceite (escurrido)', cat: 'proteinas', kcal: 190, prot: 25, carbs: 0, grasa: 10, fibra: 0, porcion: 80 },
  { id: 'salmon', nombre: 'Salmón', cat: 'proteinas', kcal: 208, prot: 20, carbs: 0, grasa: 13, fibra: 0, porcion: 150 },
  { id: 'merluza', nombre: 'Merluza', cat: 'proteinas', kcal: 86, prot: 17, carbs: 0, grasa: 1.5, fibra: 0, porcion: 150 },
  { id: 'gambas', nombre: 'Gambas', cat: 'proteinas', kcal: 99, prot: 24, carbs: 0.2, grasa: 0.3, fibra: 0, porcion: 150 },
  { id: 'tofu', nombre: 'Tofu firme', cat: 'proteinas', kcal: 144, prot: 17, carbs: 3, grasa: 9, fibra: 2, porcion: 150 },
  { id: 'tempeh', nombre: 'Tempeh', cat: 'proteinas', kcal: 192, prot: 20, carbs: 8, grasa: 11, fibra: 6, porcion: 120 },
  { id: 'seitan', nombre: 'Seitán', cat: 'proteinas', kcal: 141, prot: 25, carbs: 14, grasa: 2, fibra: 1, porcion: 120 },
  { id: 'whey', nombre: 'Proteína de suero (polvo)', cat: 'proteinas', kcal: 400, prot: 80, carbs: 8, grasa: 6, fibra: 0, porcion: 30 },
  { id: 'queso-batido', nombre: 'Queso batido 0 %', cat: 'proteinas', kcal: 47, prot: 8, carbs: 3.5, grasa: 0.2, fibra: 0, porcion: 150 },
  { id: 'requeson', nombre: 'Requesón / cottage', cat: 'proteinas', kcal: 98, prot: 11, carbs: 3.4, grasa: 4.3, fibra: 0, porcion: 150 },
  { id: 'jamon-serrano', nombre: 'Jamón serrano', cat: 'proteinas', kcal: 241, prot: 31, carbs: 0.3, grasa: 13, fibra: 0, porcion: 60 },

  // ---- Cereales y tubérculos ----
  { id: 'arroz-blanco', nombre: 'Arroz blanco cocido', cat: 'carbohidratos', kcal: 130, prot: 2.7, carbs: 28, grasa: 0.3, fibra: 0.4, porcion: 200 },
  { id: 'arroz-integral', nombre: 'Arroz integral cocido', cat: 'carbohidratos', kcal: 123, prot: 2.7, carbs: 26, grasa: 1, fibra: 1.8, porcion: 200 },
  { id: 'pasta', nombre: 'Pasta cocida', cat: 'carbohidratos', kcal: 131, prot: 5, carbs: 25, grasa: 1.1, fibra: 1.8, porcion: 200 },
  { id: 'pasta-integral', nombre: 'Pasta integral cocida', cat: 'carbohidratos', kcal: 124, prot: 5, carbs: 26, grasa: 0.5, fibra: 3.9, porcion: 200 },
  { id: 'patata', nombre: 'Patata cocida', cat: 'carbohidratos', kcal: 87, prot: 2, carbs: 20, grasa: 0.1, fibra: 1.8, porcion: 250 },
  { id: 'batata', nombre: 'Batata cocida', cat: 'carbohidratos', kcal: 90, prot: 2, carbs: 21, grasa: 0.2, fibra: 3, porcion: 250 },
  { id: 'pan-integral', nombre: 'Pan integral', cat: 'carbohidratos', kcal: 247, prot: 13, carbs: 41, grasa: 3.4, fibra: 7, porcion: 60 },
  { id: 'pan-blanco', nombre: 'Pan blanco', cat: 'carbohidratos', kcal: 265, prot: 9, carbs: 49, grasa: 3.2, fibra: 2.7, porcion: 60 },
  { id: 'avena', nombre: 'Copos de avena', cat: 'carbohidratos', kcal: 389, prot: 17, carbs: 66, grasa: 7, fibra: 11, porcion: 60 },
  { id: 'quinoa', nombre: 'Quinoa cocida', cat: 'carbohidratos', kcal: 120, prot: 4.4, carbs: 21, grasa: 1.9, fibra: 2.8, porcion: 200 },
  { id: 'tortitas-arroz', nombre: 'Tortitas de arroz', cat: 'carbohidratos', kcal: 387, prot: 8, carbs: 82, grasa: 3, fibra: 4, porcion: 20 },
  { id: 'maiz', nombre: 'Maíz dulce', cat: 'carbohidratos', kcal: 86, prot: 3.2, carbs: 19, grasa: 1.2, fibra: 2.7, porcion: 150 },

  // ---- Legumbres ----
  { id: 'lentejas', nombre: 'Lentejas cocidas', cat: 'legumbres', kcal: 116, prot: 9, carbs: 20, grasa: 0.4, fibra: 8, porcion: 200 },
  { id: 'garbanzos', nombre: 'Garbanzos cocidos', cat: 'legumbres', kcal: 164, prot: 8.9, carbs: 27, grasa: 2.6, fibra: 7.6, porcion: 200 },
  { id: 'alubias', nombre: 'Alubias cocidas', cat: 'legumbres', kcal: 127, prot: 8.7, carbs: 23, grasa: 0.5, fibra: 6.4, porcion: 200 },
  { id: 'guisantes', nombre: 'Guisantes', cat: 'legumbres', kcal: 81, prot: 5.4, carbs: 14, grasa: 0.4, fibra: 5.7, porcion: 150 },

  // ---- Verduras ----
  { id: 'brocoli', nombre: 'Brócoli', cat: 'verduras', kcal: 34, prot: 2.8, carbs: 7, grasa: 0.4, fibra: 2.6, porcion: 200 },
  { id: 'espinacas', nombre: 'Espinacas', cat: 'verduras', kcal: 23, prot: 2.9, carbs: 3.6, grasa: 0.4, fibra: 2.2, porcion: 200 },
  { id: 'lechuga', nombre: 'Lechuga', cat: 'verduras', kcal: 15, prot: 1.4, carbs: 2.9, grasa: 0.2, fibra: 1.3, porcion: 100 },
  { id: 'tomate', nombre: 'Tomate', cat: 'verduras', kcal: 18, prot: 0.9, carbs: 3.9, grasa: 0.2, fibra: 1.2, porcion: 150 },
  { id: 'calabacin', nombre: 'Calabacín', cat: 'verduras', kcal: 17, prot: 1.2, carbs: 3.1, grasa: 0.3, fibra: 1, porcion: 200 },
  { id: 'pimiento', nombre: 'Pimiento', cat: 'verduras', kcal: 26, prot: 1, carbs: 6, grasa: 0.3, fibra: 2.1, porcion: 150 },
  { id: 'zanahoria', nombre: 'Zanahoria', cat: 'verduras', kcal: 41, prot: 0.9, carbs: 10, grasa: 0.2, fibra: 2.8, porcion: 150 },
  { id: 'cebolla', nombre: 'Cebolla', cat: 'verduras', kcal: 40, prot: 1.1, carbs: 9, grasa: 0.1, fibra: 1.7, porcion: 100 },
  { id: 'champinones', nombre: 'Champiñones', cat: 'verduras', kcal: 22, prot: 3.1, carbs: 3.3, grasa: 0.3, fibra: 1, porcion: 150 },
  { id: 'coliflor', nombre: 'Coliflor', cat: 'verduras', kcal: 25, prot: 1.9, carbs: 5, grasa: 0.3, fibra: 2, porcion: 200 },

  // ---- Frutas ----
  { id: 'manzana', nombre: 'Manzana', cat: 'frutas', kcal: 52, prot: 0.3, carbs: 14, grasa: 0.2, fibra: 2.4, porcion: 180 },
  { id: 'platano', nombre: 'Plátano', cat: 'frutas', kcal: 89, prot: 1.1, carbs: 23, grasa: 0.3, fibra: 2.6, porcion: 120 },
  { id: 'naranja', nombre: 'Naranja', cat: 'frutas', kcal: 47, prot: 0.9, carbs: 12, grasa: 0.1, fibra: 2.4, porcion: 200 },
  { id: 'fresas', nombre: 'Fresas', cat: 'frutas', kcal: 32, prot: 0.7, carbs: 7.7, grasa: 0.3, fibra: 2, porcion: 200 },
  { id: 'arandanos', nombre: 'Arándanos', cat: 'frutas', kcal: 57, prot: 0.7, carbs: 14, grasa: 0.3, fibra: 2.4, porcion: 100 },
  { id: 'kiwi', nombre: 'Kiwi', cat: 'frutas', kcal: 61, prot: 1.1, carbs: 15, grasa: 0.5, fibra: 3, porcion: 100 },
  { id: 'pina', nombre: 'Piña', cat: 'frutas', kcal: 50, prot: 0.5, carbs: 13, grasa: 0.1, fibra: 1.4, porcion: 200 },

  // ---- Lácteos ----
  { id: 'leche-desnatada', nombre: 'Leche desnatada', cat: 'lacteos', kcal: 35, prot: 3.4, carbs: 5, grasa: 0.1, fibra: 0, porcion: 250 },
  { id: 'leche-entera', nombre: 'Leche entera', cat: 'lacteos', kcal: 61, prot: 3.2, carbs: 4.8, grasa: 3.3, fibra: 0, porcion: 250 },
  { id: 'yogur-natural', nombre: 'Yogur natural', cat: 'lacteos', kcal: 61, prot: 3.5, carbs: 4.7, grasa: 3.3, fibra: 0, porcion: 125 },
  { id: 'yogur-griego', nombre: 'Yogur griego natural', cat: 'lacteos', kcal: 97, prot: 9, carbs: 3.6, grasa: 5, fibra: 0, porcion: 125 },
  { id: 'queso-curado', nombre: 'Queso curado', cat: 'lacteos', kcal: 402, prot: 25, carbs: 1.4, grasa: 33, fibra: 0, porcion: 40 },

  // ---- Grasas y frutos secos ----
  { id: 'aceite-oliva', nombre: 'Aceite de oliva virgen extra', cat: 'grasas', kcal: 884, prot: 0, carbs: 0, grasa: 100, fibra: 0, porcion: 10 },
  { id: 'aguacate', nombre: 'Aguacate', cat: 'grasas', kcal: 160, prot: 2, carbs: 9, grasa: 15, fibra: 7, porcion: 100 },
  { id: 'crema-cacahuete', nombre: 'Crema de cacahuete', cat: 'grasas', kcal: 588, prot: 25, carbs: 20, grasa: 50, fibra: 6, porcion: 20 },
  { id: 'almendras', nombre: 'Almendras', cat: 'grasas', kcal: 579, prot: 21, carbs: 22, grasa: 50, fibra: 12.5, porcion: 30 },
  { id: 'nueces', nombre: 'Nueces', cat: 'grasas', kcal: 654, prot: 15, carbs: 14, grasa: 65, fibra: 6.7, porcion: 30 },
  { id: 'avellanas', nombre: 'Avellanas', cat: 'grasas', kcal: 628, prot: 15, carbs: 17, grasa: 61, fibra: 9.7, porcion: 30 },
  { id: 'semillas-chia', nombre: 'Semillas de chía', cat: 'grasas', kcal: 486, prot: 17, carbs: 42, grasa: 31, fibra: 34, porcion: 15 },
  { id: 'aceitunas', nombre: 'Aceitunas', cat: 'grasas', kcal: 145, prot: 1, carbs: 6, grasa: 15, fibra: 3.2, porcion: 40 },
  { id: 'chocolate-85', nombre: 'Chocolate negro 85 %', cat: 'grasas', kcal: 592, prot: 10, carbs: 22, grasa: 46, fibra: 11, porcion: 20 },

  // ---- Bebidas y otros ----
  { id: 'bebida-almendra', nombre: 'Bebida de almendra sin azúcar', cat: 'bebidas', kcal: 13, prot: 0.5, carbs: 0.3, grasa: 1.1, fibra: 0.4, porcion: 250 },
  { id: 'miel', nombre: 'Miel', cat: 'bebidas', kcal: 304, prot: 0.3, carbs: 82, grasa: 0, fibra: 0.2, porcion: 20 },
];

// Copia de la tabla de serie: los 67 alimentos originales. Los importados,
// los globales del dueño y los del escáner se añaden después sin tocar esta base.
export const ALIMENTOS_BASE = ALIMENTOS.map(a => ({ ...a }));

// Alimentos verificados (USDA FoodData Central CC0 / Open Food Facts ODbL).
// Sus macros se calculan con las mismas funciones que los alimentos base.
const IDS_BASE = new Set(ALIMENTOS_BASE.map(a => a.id));
ALIMENTOS.push(...ALIMENTOS_IMPORTADOS.filter(a => a && a.id && !IDS_BASE.has(a.id)));

// Alimentos naturales e ingredientes de USDA FoodData Central (CC0).
// Se añaden después de la base y de los importados, sin sobrescribir ningún
// registro existente: el identificador es la única clave de deduplicación.
const IDS_YA = new Set(ALIMENTOS.map(a => a.id));
ALIMENTOS.push(...ALIMENTOS_NATURALES.filter(a => a && a.id && !IDS_YA.has(a.id)));

// Catálogo de supermercados españoles (Open Food Facts, ODbL).
// Se carga solo cuando el usuario abre el buscador de alimentos: así la app
// arranca rápido y el service worker lo guarda en caché para usarlo sin red.
const URL_SUPERMERCADOS = './supabase/catalogo-supermercados.json';
let productosSupermercado = [];
let promesaSupermercado = null;

// Nutrientes opcionales: solo se copian si la ficha los declara. Un campo
// ausente nunca se convierte en cero (un cero es un dato declarado).
const OPCIONALES_COMERCIAL = ['fibra', 'azucares', 'saturada', 'monoinsaturada',
  'poliinsaturada', 'sal', 'sodio', 'kJ', 'alcohol'];

// Los 14 alérgenos de declaración obligatoria en la UE, en el orden en que se
// codifican en `alergenos14` (una letra por alérgeno).
export const ALERGENOS_UE = [
  { clave: 'gluten', nombre: 'Cereales con gluten' },
  { clave: 'crustaceos', nombre: 'Crustáceos' },
  { clave: 'huevo', nombre: 'Huevos' },
  { clave: 'pescado', nombre: 'Pescado' },
  { clave: 'cacahuetes', nombre: 'Cacahuetes' },
  { clave: 'soja', nombre: 'Soja' },
  { clave: 'leche', nombre: 'Leche' },
  { clave: 'frutos_cascara', nombre: 'Frutos de cáscara' },
  { clave: 'apio', nombre: 'Apio' },
  { clave: 'mostaza', nombre: 'Mostaza' },
  { clave: 'sesamo', nombre: 'Granos de sésamo' },
  { clave: 'sulfitos', nombre: 'Dióxido de azufre y sulfitos' },
  { clave: 'altramuces', nombre: 'Altramuces' },
  { clave: 'moluscos', nombre: 'Moluscos' },
];

export const ESTADOS_ALERGENO = {
  P: { clave: 'presente', texto: 'Contiene', nivel: 2 },
  T: { clave: 'trazas', texto: 'Puede contener trazas', nivel: 1 },
  A: { clave: 'ausencia_declarada', texto: 'Ausencia declarada', nivel: 0 },
  '?': { clave: 'desconocido', texto: 'Sin datos', nivel: 0 },
};

// Devuelve los 14 alérgenos con su estado. Un estado `?` significa que la
// fuente no dice nada: no se interpreta como ausencia.
export function alergenosDe(alimento) {
  const codigo = String(alimento?.alergenos14 || '');
  return ALERGENOS_UE.map((a, i) => ({
    ...a,
    estado: ESTADOS_ALERGENO[codigo[i]] || ESTADOS_ALERGENO['?'],
  }));
}

// Normalización única: la misma para la descarga y para la caché IndexedDB.
function normalizarComercial(lista, ya) {
  return (Array.isArray(lista) ? lista : [])
    .filter(p => p?.id && p?.nombre && Number.isFinite(Number(p.kcal))
      && Number(p.kcal) >= 0 && !ya.has(p.id))
    .map(p => {
      const a = {
        id: p.id, nombre: p.nombre, cat: p.cat || 'bebidas',
        kcal: Number(p.kcal) || 0, prot: Number(p.prot) || 0,
        carbs: Number(p.carbs) || 0, grasa: Number(p.grasa) || 0,
        porcion: Number(p.porcion) || 100,
        marca: p.marca || '', ean: p.ean || '', ingredientes: p.ingredientes || '',
        alergenos: p.alergenos || '', cantidad: p.cantidad || '',
        origen: p.origen || 'Open Food Facts', supermercado: true,
      };
      for (const k of OPCIONALES_COMERCIAL) {
        if (k in p && Number.isFinite(Number(p[k]))) a[k] = Number(p[k]);
      }
      if (p.alergenos14) {
        a.alergenos14 = p.alergenos14;
        a.alergenosTexto = p.alergenosTexto || '';
        a.trazasTexto = p.trazasTexto || '';
      }
      if (p.detalle != null) a.detalle = Number(p.detalle);
      if (Array.isArray(p.noDisponible) && p.noDisponible.length) a.noDisponible = [...p.noDisponible];
      if (Array.isArray(p.revisar) && p.revisar.length) a.revisar = [...p.revisar];
      return a;
    });
}

// Carga una sola vez por sesión. Si IndexedDB tiene la misma versión del
// archivo, no se descarga nada; si no hay red, sirve la caché local.
export function cargarCatalogoSupermercados() {
  if (productosSupermercado.length) return Promise.resolve(true);
  if (promesaSupermercado) return promesaSupermercado;
  promesaSupermercado = (async () => {
    const ya = new Set(ALIMENTOS.map(a => a.id));
    const estado = await estadoCatalogoIDB().catch(() => null);
    // Sin conexión no se intenta ninguna petición: se sirve directamente IndexedDB.
    const enLinea = typeof navigator === 'undefined' || navigator.onLine !== false;
    let cabecera = null;
    if (enLinea) {
      try {
        const head = await fetch(URL_SUPERMERCADOS, { method: 'HEAD', cache: 'no-store' });
        if (head.ok) cabecera = head.headers.get('etag') || head.headers.get('last-modified') || null;
      } catch { /* sin red: se usa la caché */ }
    }

    if (estado?.total && (!cabecera || estado.archivo === cabecera)) {
      const guardados = await leerCatalogoIDB().catch(() => null);
      if (Array.isArray(guardados) && guardados.length === estado.total) {
        productosSupermercado = normalizarComercial(guardados, ya);
        if (productosSupermercado.length) return true;
      }
    }

    if (enLinea) {
      try {
        const r = await fetch(URL_SUPERMERCADOS, { cache: 'no-cache' });
        if (!r.ok) throw new Error('catalogo no disponible');
        const datos = await r.json();
        const lista = normalizarComercial(datos?.productos, ya);
        if (!lista.length) throw new Error('catalogo vacio');
        productosSupermercado = lista;
        const version = datos?.enriquecimiento?.revision
          || datos?.enriquecimiento?.fechaConsulta || String(datos?.generado || '');
        await guardarCatalogoIDB(version, lista, {
          fecha: datos?.enriquecimiento?.fechaConsulta || null,
          archivo: cabecera,
        }).catch(() => {});
        return true;
      } catch { /* se intenta la caché local */ }
    }
    const guardados = await leerCatalogoIDB().catch(() => null);
    if (Array.isArray(guardados) && guardados.length) {
      productosSupermercado = normalizarComercial(guardados, ya);
      if (productosSupermercado.length) return true;
    }
    return false;
  })().finally(() => { promesaSupermercado = null; });
  return promesaSupermercado;
}

export const catalogoSupermercadosCargado = () => productosSupermercado.length > 0;

// Ficha detallada por lotes: ingredientes, aditivos, alérgenos y ración.
// Se descarga solo el lote del producto abierto y se guarda en IndexedDB.
const URL_DETALLE = './supabase/catalogo-detalle/';
const cacheDetalle = new Map();
const promesasDetalle = new Map();

export function cargarDetalleComercial(alimento) {
  const lote = alimento?.detalle;
  if (lote == null || !Number.isFinite(Number(lote))) return Promise.resolve(null);
  const clave = Number(lote);
  if (cacheDetalle.has(clave)) return Promise.resolve(cacheDetalle.get(clave));
  if (promesasDetalle.has(clave)) return promesasDetalle.get(clave);
  const promesa = (async () => {
    // El lote ya estuvo descargado: se lee de IndexedDB, sin red.
    if (await versionLoteIDB(clave).catch(() => null)) {
      const guardado = await leerLoteIDB(clave).catch(() => null);
      if (guardado) {
        cacheDetalle.set(clave, guardado);
        return guardado;
      }
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;
    const nombre = `${String(clave).padStart(3, '0')}.json`;
    const r = await fetch(URL_DETALLE + nombre, { cache: 'no-cache' });
    if (!r.ok) throw new Error('detalle no disponible');
    const datos = await r.json();
    const mapa = datos?.productos && typeof datos.productos === 'object' ? datos.productos : {};
    cacheDetalle.set(clave, mapa);
    await guardarDetalleIDB(mapa, clave).catch(() => {});
    return mapa;
  })().catch(() => null).finally(() => { promesasDetalle.delete(clave); });
  promesasDetalle.set(clave, promesa);
  return promesa;
}

// Devuelve la ficha detallada del producto (o null si no la tiene).
export async function detalleComercial(alimento) {
  if (!alimento?.detalle && alimento?.detalle !== 0) return null;
  const mapa = await cargarDetalleComercial(alimento);
  if (!mapa) return null;
  return mapa[String(alimento.ean || '')] || null;
}

// Añade los alimentos que publica el dueño desde el panel de administración.
// Se reconstruyen en cada carga para que los cambios lleguen a todas las
// cuentas sin tocar los valores guardados por cada usuario.
export function sincronizarAlimentosGlobales(lista = []) {
  for (let i = ALIMENTOS.length - 1; i >= 0; i--) {
    if (ALIMENTOS[i].global) ALIMENTOS.splice(i, 1);
  }
  for (const a of lista) {
    if (!a?.id || !a?.nombre) continue;
    const i = ALIMENTOS.findIndex(x => x.id === a.id);
    if (i >= 0) ALIMENTOS.splice(i, 1);
    ALIMENTOS.push({
      id: a.id, nombre: a.nombre, cat: a.cat || 'bebidas',
      kcal: Number(a.kcal) || 0, prot: Number(a.prot) || 0,
      carbs: Number(a.carbs) || 0, grasa: Number(a.grasa) || 0,
      fibra: Number(a.fibra) || 0, porcion: Number(a.porcion) || 100,
      marca: a.marca || '', ean: a.ean || '', ingredientes: a.ingredientes || '',
      alergenos: a.alergenos || '', cantidad: a.cantidad || '',
      origen: a.origen || (String(a.id).startsWith('off-') ? 'Open Food Facts' : ''),
      global: true,
    });
  }
}

export const alimentoPorId = id =>
  ALIMENTOS.find(a => a.id === id) || productosSupermercado.find(a => a.id === id) || null;

// Campos nutricionales que se propagan por todas las sumas. Los opcionales
// (azúcares, saturada, sal y sodio) solo aparecen cuando la fuente los declaró:
// un campo ausente no se convierte en cero.
const NUTRIENTES_MACRO = ['kcal', 'prot', 'carbs', 'grasa', 'fibra', 'azucares', 'saturada', 'sal', 'sodio'];
const BASE_MACROS = { kcal: 0, prot: 0, carbs: 0, grasa: 0, fibra: 0 };
const numeroSeguro = v => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Macros de una cantidad concreta de un alimento (o de una lista de ingredientes).
export function macrosDe(alimento, gramos = 100) {
  if (!alimento) return { ...BASE_MACROS };
  const k = numeroSeguro(gramos) / 100;
  const out = { ...BASE_MACROS };
  for (const campo of NUTRIENTES_MACRO) {
    if (campo in alimento) out[campo] = numeroSeguro(alimento[campo]) * k;
  }
  return out;
}

export function sumarMacros(lista) {
  const out = { ...BASE_MACROS };
  for (const m of lista || []) {
    for (const campo of NUTRIENTES_MACRO) {
      if (campo in (m || {})) out[campo] = (out[campo] || 0) + numeroSeguro(m[campo]);
    }
  }
  return out;
}

// Busca alimentos por nombre, marca, código o categoría.
// Con 26.000 productos de supermercado, solo se incluyen cuando hay búsqueda:
// así la lista inicial sigue siendo rápida y manejable.
export function buscarAlimentos(texto = '', categoria = '') {
  const q = texto.trim().toLowerCase();
  const palabras = q.split(/\s+/).filter(Boolean);
  const fuente = palabras.length ? [...ALIMENTOS, ...productosSupermercado] : ALIMENTOS;
  const vistos = new Set();
  const resultados = [];
  for (const a of fuente) {
    if (categoria && a.cat !== categoria) continue;
    if (vistos.has(a.id)) continue;
    const textoAlimento = `${a.nombre} ${a.marca || ''} ${a.ean || ''}`.toLowerCase();
    if (!palabras.every(p => textoAlimento.includes(p))) continue;
    vistos.add(a.id);
    resultados.push(a);
    if (palabras.length && resultados.length >= 80) break;
  }
  return resultados;
}

// 8 recetas equilibradas. Los ingredientes van en gramos.
export const RECETAS = [
  {
    id: 'avena-proteica', nombre: 'Avena proteica con frutos rojos', comidas: ['desayuno'], icono: '🥣',
    ingredientes: [{ id: 'avena', gramos: 60 }, { id: 'whey', gramos: 30 }, { id: 'leche-desnatada', gramos: 200 }, { id: 'arandanos', gramos: 80 }, { id: 'nueces', gramos: 15 }],
    pasos: ['Mezcla la avena con la leche y calienta 2 minutos.', 'Retira del fuego y añade la proteína removiendo.', 'Corona con arándanos y nueces picadas.'],
  },
  {
    id: 'tortilla-atun', nombre: 'Tortilla de atún y espinacas', comidas: ['comida', 'cena'], icono: '🍳',
    ingredientes: [{ id: 'huevo', gramos: 150 }, { id: 'atun-natural', gramos: 100 }, { id: 'espinacas', gramos: 100 }, { id: 'aceite-oliva', gramos: 10 }],
    pasos: ['Saltea las espinacas con el aceite.', 'Añade el atún escurrido y bate los huevos.', 'Cuaja la tortilla a fuego medio.'],
  },
  {
    id: 'pollo-arroz-verdura', nombre: 'Pollo con arroz y brócoli', comidas: ['comida'], icono: '🍗',
    ingredientes: [{ id: 'pollo-pechuga', gramos: 180 }, { id: 'arroz-integral', gramos: 200 }, { id: 'brocoli', gramos: 200 }, { id: 'aceite-oliva', gramos: 10 }],
    pasos: ['Cocina el arroz integral.', 'Haz el pollo a la plancha con el aceite.', 'Añade el brócoli al vapor los últimos minutos.'],
  },
  {
    id: 'salmon-batata', nombre: 'Salmón al horno con batata', comidas: ['cena'], icono: '🐟',
    ingredientes: [{ id: 'salmon', gramos: 150 }, { id: 'batata', gramos: 250 }, { id: 'espinacas', gramos: 150 }, { id: 'aceite-oliva', gramos: 8 }],
    pasos: ['Asa la batata en dados 25 minutos a 200 °C.', 'Añade el salmón los últimos 12 minutos.', 'Sirve con las espinacas salteadas.'],
  },
  {
    id: 'lentejas-verduras', nombre: 'Guiso de lentejas con verduras', comidas: ['comida'], icono: '🥘',
    ingredientes: [{ id: 'lentejas', gramos: 300 }, { id: 'zanahoria', gramos: 100 }, { id: 'cebolla', gramos: 80 }, { id: 'pimiento', gramos: 100 }, { id: 'aceite-oliva', gramos: 10 }],
    pasos: ['Pocha la cebolla y el pimiento.', 'Añade zanahoria y lentejas con agua.', 'Cocina 20 minutos y ajusta de sal.'],
  },
  {
    id: 'yogur-griego-fruta', nombre: 'Yogur griego con fruta y chía', comidas: ['snack'], icono: '🍓',
    ingredientes: [{ id: 'yogur-griego', gramos: 200 }, { id: 'fresas', gramos: 150 }, { id: 'semillas-chia', gramos: 10 }, { id: 'miel', gramos: 10 }],
    pasos: ['Pon el yogur en un bol.', 'Añade la fruta troceada.', 'Espolvorea chía y un hilo de miel.'],
  },
  {
    id: 'tostada-aguacate-huevo', nombre: 'Tostada de aguacate y huevo', comidas: ['desayuno', 'snack'], icono: '🥑',
    ingredientes: [{ id: 'pan-integral', gramos: 80 }, { id: 'aguacate', gramos: 80 }, { id: 'huevo', gramos: 120 }, { id: 'tomate', gramos: 60 }],
    pasos: ['Tuesta el pan.', 'Machaca el aguacate con tomate y sal.', 'Corona con los huevos pochados o a la plancha.'],
  },
  {
    id: 'wok-tofu', nombre: 'Wok de tofu y verduras', comidas: ['cena'], icono: '🥦',
    ingredientes: [{ id: 'tofu', gramos: 200 }, { id: 'arroz-blanco', gramos: 150 }, { id: 'pimiento', gramos: 120 }, { id: 'calabacin', gramos: 150 }, { id: 'aceite-oliva', gramos: 10 }],
    pasos: ['Dora el tofu en dados.', 'Añade las verduras y saltea a fuego fuerte.', 'Sirve sobre el arroz.'],
  },
];

// Recetas verificadas importadas (UniTools, CC BY-SA 4.0). Se normalizan
// aquí para que el resto de la app siga usando `comidas`, `icono` y `pasos`.
const CLAVES_COMIDA_IMPORTADAS = ['desayuno', 'comida', 'snack', 'cena'];
function normalizarRecetaImportada(r) {
  const tipo = r.tipoComida == null ? [] : (Array.isArray(r.tipoComida) ? r.tipoComida : [r.tipoComida]);
  const comidas = tipo.map(c => String(c).toLowerCase().trim()).filter(c => CLAVES_COMIDA_IMPORTADAS.includes(c));
  return {
    ...r,
    comidas: comidas.length ? comidas : ['comida', 'cena'],
    icono: r.icono || '🍽️',
    pasos: Array.isArray(r.pasos) ? r.pasos : [],
    ingredientes: (r.ingredientes || []).filter(i => i && i.id && Number(i.gramos) > 0),
    estado: r.estado || 'incompleto',
  };
}
RECETAS.push(...RECETAS_IMPORTADAS.map(normalizarRecetaImportada));

// Categorías en español derivadas de los datos de cada receta. Solo clasifican:
// no cambian ingredientes, cantidades ni valores nutricionales.
const CATS_INGREDIENTES = {
  carnes: ['pollo-pechuga', 'pavo-pechuga', 'ternera-solomillo', 'cerdo-lomo', 'jamon-serrano', 'usda-bacon', 'usda-cordero'],
  pescados: ['atun-natural', 'atun-aceite', 'salmon', 'merluza'],
  mariscos: ['gambas'],
  huevos: ['huevo', 'clara-huevo'],
  legumbres: ['lentejas', 'garbanzos', 'alubias', 'guisantes', 'tofu', 'tempeh', 'usda-hummus'],
  arroces: ['arroz-blanco', 'arroz-integral', 'usda-arroz-crudo'],
  pastas: ['pasta', 'pasta-integral', 'usda-pasta-cruda'],
  verduras: ['brocoli', 'espinacas', 'lechuga', 'tomate', 'calabacin', 'pimiento', 'zanahoria',
    'cebolla', 'champinones', 'coliflor', 'usda-col', 'usda-pepino', 'usda-berenjena',
    'usda-apio', 'usda-remolacha', 'usda-kale', 'usda-rabanos', 'usda-cebolleta',
    'usda-chalota', 'usda-salsa-tomate', 'usda-pure-tomate'],
};
export function categoriasEnEspanol(r) {
  const out = new Set(r.categorias || []);
  const comidas = r.comidas || [];
  if (comidas.includes('desayuno')) out.add('desayunos');
  if (comidas.includes('comida')) out.add('comidas');
  if (comidas.includes('snack')) out.add('meriendas');
  if (comidas.includes('cena')) out.add('cenas');
  const tags = (r.categorias || []).map(c => String(c).toLowerCase());
  if (tags.includes('salad')) out.add('ensaladas');
  if (tags.includes('soup') || tags.includes('stew')) out.add('platos de cuchara');
  if (tags.includes('vegetarian') || tags.includes('vegan')) out.add('vegetarianas');
  if (tags.includes('pescatarian')) out.add('pescados');
  if (['soup', 'sauce', 'side'].some(t => tags.includes(t))) out.add('preparables por adelantado');
  const ids = new Set((r.ingredientes || []).map(i => String(i.id)));
  for (const [cat, lista] of Object.entries(CATS_INGREDIENTES)) {
    if (lista.some(id => ids.has(id))) out.add(cat);
  }
  if ((Number(r.tiempoPrep) || 0) + (Number(r.tiempoCoccion) || 0) <= 20) out.add('rápidas');
  try {
    if (resumenReceta(r).total.prot >= 25) out.add('altas en proteínas');
  } catch { /* receta sin ingredientes utilizables */ }
  return [...out];
}
// Clasificación dietética derivada (FASE 10 · PARTE 2). Se calcula una sola
// vez desde los ingredientes reales; activar filtros nunca modifica la receta.
RECETAS.forEach((r, i) => {
  RECETAS[i] = { ...r, categorias: categoriasEnEspanol(r), dieta: clasificarReceta(r, alimentoPorId) };
});

// Totales y desglose de una receta.
export function resumenReceta(receta) {
  const items = (receta?.ingredientes || []).map(i => {
    const a = alimentoPorId(i.id);
    return { alimento: a, gramos: i.gramos, macros: macrosDe(a, i.gramos) };
  });
  return { items, total: sumarMacros(items.map(i => i.macros)) };
}

// Desglose y totales para un número concreto de raciones. Toda la nutrición
// sigue viniendo de resumenReceta(); aquí únicamente se escala el resultado.
// Por defecto se devuelve UNA ración real: las recetas que rinden varias
// deben dividir el total de la receta entre `raciones`.
export function resumenRecetaPorRacion(receta, raciones = 1) {
  const base = resumenReceta(receta);
  const propias = Math.max(1, Number(receta?.raciones) || 1);
  const n = Math.max(0.25, Number(raciones) || 1);
  const factor = n / propias;
  const escalar = m => Object.fromEntries(NUTRIENTES_MACRO
    .filter(k => k in (m || {})).map(k => [k, numeroSeguro(m[k]) * factor]));
  return {
    raciones: n,
    items: base.items.map(i => ({
      ...i, gramos: (Number(i.gramos) || 0) * factor, macros: escalar(i.macros),
    })),
    total: escalar(base.total),
  };
}

// =====================================================================
// Cálculo nutricional compartido (diario, informes y coach)
// ---------------------------------------------------------------------
// Una sola implementación para interpretar una entrada del diario:
// alimentos con macros por 100 g, recetas (con ingredientes reales o de
// la biblioteca) y productos del escáner. Devuelve TODOS los nutrientes
// disponibles (macros + micronutrientes declarados) con precisión interna;
// el redondeo corresponde únicamente a la presentación.
// =====================================================================
export const hayMicros = m => Boolean(m && Object.keys(m).length);

function escalarMicros(micros = {}, factor = 1) {
  const out = {};
  for (const [k, v] of Object.entries(micros || {})) {
    if (!CLAVES_MICROS.includes(k)) continue;
    const x = Number(v);
    if (Number.isFinite(x) && x >= 0) out[k] = x * factor;
  }
  return out;
}

const microsDeAlimento = (alimento, gramos) =>
  escalarMicros(alimento?.micros100, numeroSeguro(gramos) / 100);

export function microsEntrada(entrada) {
  if (!entrada) return {};
  if (hayMicros(entrada.micros100)) {
    return escalarMicros(entrada.micros100, numeroSeguro(entrada.gramos) / 100);
  }
  if (entrada.tipo === 'receta') {
    const ings = Array.isArray(entrada.ingredientes) && entrada.ingredientes.length
      ? entrada.ingredientes
      : (RECETAS.find(x => x.id === entrada.id)?.ingredientes || []);
    if (!ings.length) return {};
    const partes = ings.map(i => microsDeAlimento(alimentoPorId(i.id), numeroSeguro(i.gramos)));
    // Solo se muestra un mineral si todos los ingredientes lo declaran.
    const completos = CLAVES_MICROS.filter(k => partes.every(p => k in p));
    // `racionesReceta` guarda de cuántas raciones es la receta original:
    // los ingredientes almacenados son los de la receta completa, así que
    // una ración es el total dividido entre ese número.
    const porReceta = Math.max(1, numeroSeguro(entrada.racionesReceta) || 1);
    const raciones = (numeroSeguro(entrada.racion) || 1) / porReceta;
    return Object.fromEntries(completos.map(k => [k, partes.reduce((s, p) => s + p[k], 0) * raciones]));
  }
  return microsDeAlimento(alimentoPorId(entrada.id), numeroSeguro(entrada.gramos));
}

// Única función de cálculo: interpreta una entrada y devuelve macros y micros.
export function entradaNutrientes(entrada) {
  if (!entrada) return { macros: macrosDe(null, 0), micros: {} };

  let macros;
  if (entrada.macros100) {
    const factor = numeroSeguro(entrada.gramos) / 100;
    macros = Object.fromEntries(NUTRIENTES_MACRO.filter(k => k in entrada.macros100).map(k =>
      [k, numeroSeguro(entrada.macros100[k]) * factor]));
  } else if (entrada.tipo === 'receta') {
    let total;
    if (Array.isArray(entrada.ingredientes) && entrada.ingredientes.length) {
      total = sumarMacros(entrada.ingredientes.map(i =>
        macrosDe(alimentoPorId(i.id), numeroSeguro(i.gramos))));
    } else {
      const r = RECETAS.find(x => x.id === entrada.id);
      total = r ? resumenReceta(r).total : macrosDe(null, 0);
    }
    // 1 ración = 1 ración real de la receta, no la receta entera. Las entradas
    // antiguas sin `racionesReceta` siguen valiendo lo que valían (factor 1).
    const porReceta = Math.max(1, numeroSeguro(entrada.racionesReceta) || 1);
    const raciones = (numeroSeguro(entrada.racion) || 1) / porReceta;
    macros = Object.fromEntries(NUTRIENTES_MACRO.filter(k => k in total).map(k =>
      [k, numeroSeguro(total[k]) * raciones]));
  } else {
    macros = macrosDe(alimentoPorId(entrada.id), numeroSeguro(entrada.gramos));
  }

  return { macros: { ...BASE_MACROS, ...macros }, micros: microsEntrada(entrada) };
}

export const macrosEntrada = entrada => entradaNutrientes(entrada).macros;

export function sumarMicros(lista = []) {
  const out = {};
  for (const m of lista) {
    for (const [k, v] of Object.entries(m || {})) {
      if (!CLAVES_MICROS.includes(k)) continue;
      out[k] = (out[k] || 0) + numeroSeguro(v);
    }
  }
  return out;
}

// Agregado de un conjunto de entradas con la misma precisión que el diario.
export function consumoNutrientes(entradas = []) {
  const lista = Array.isArray(entradas) ? entradas : [];
  return {
    macros: sumarMacros(lista.map(macrosEntrada)),
    micros: sumarMicros(lista.map(microsEntrada)),
  };
}
