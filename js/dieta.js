// =====================================================================
// Clasificación dietética de recetas (FASE 10 · PARTE 2) · SOLO LECTURA
// ---------------------------------------------------------------------
// Tres filtros independientes: vegana, sin gluten y sin lactosa. Cada uno
// admite tres estados: `verificada`, `no_apta` y `desconocida`.
//
// Regla de oro: la AUSENCIA de información nunca es una clasificación
// positiva. Una receta solo es `verificada` cuando TODOS sus ingredientes
// están reconocidos como compatibles; basta un ingrediente sin datos para
// que quede `desconocida`, y basta uno incompatible para que sea `no_apta`.
//
// La clasificación se deriva de los ingredientes reales, de las declaraciones
// de alérgenos y de las fichas del catálogo. No lee el nombre de la receta:
// «no tengo carne en el título» no prueba que sea vegana. El nombre original
// del ingrediente importado tampoco se usa: a veces describe el plato de
// origen («beef stock») y no el alimento al que se mapéo.
// =====================================================================

export const ESTADOS_DIETA = Object.freeze({
  VERIFICADA: 'verificada',
  NO_APTA: 'no_apta',
  DESCONOCIDA: 'desconocida',
});

export const FILTROS_DIETA = Object.freeze([
  { clave: 'vegana', nombre: 'Vegana', icono: '🌱' },
  { clave: 'sinGluten', nombre: 'Sin gluten', icono: '🌾' },
  { clave: 'sinLactosa', nombre: 'Sin lactosa', icono: '🥛' },
]);

const APTA = ESTADOS_DIETA.VERIFICADA;
const NO = ESTADOS_DIETA.NO_APTA;
const DUDA = ESTADOS_DIETA.DESCONOCIDA;

const lista = s => new Set(s.trim().split(/\s+/).filter(Boolean));

// Ingredientes con origen animal conocido por su id de catálogo.
const ORIGEN_ANIMAL = lista(`
  huevo clara-huevo atun-natural atun-aceite salmon merluza gambas
  pollo-pechuga pavo-pechuga ternera-solomillo cerdo-lomo jamon-serrano
  usda-bacon usda-cordero miel
  leche-desnatada leche-entera leche-semidesnatada yogur-natural yogur-griego
  queso-curado queso-batido requeson whey usda-nata usda-nata-agria
  usda-mantequilla usda-feta usda-mozzarella usda-parmesano
`);

// Alimentos vegetales simples y verificables. No entran aquí productos
// compuestos sin composición declarada (salsas, hummus, mostaza preparada,
// pan rallado, levadura comercial, chocolate, agua aromatizada).
const VEGETAL_CONOCIDO = lista(`
  aceite-oliva aceitunas aguacate almendras alubias arandanos avellanas
  arroz-blanco arroz-integral avena batata bebida-almendra brocoli
  calabacin cebolla champinones coliflor crema-cacahuete espinacas fresas
  garbanzos guisantes kiwi lechuga lentejas maiz manzana naranja nueces
  pan-blanco pan-integral pasta pasta-integral patata pimiento platano pina
  quinoa semillas-chia seitan tempeh tofu tomate tortitas-arroz zanahoria
  off-albahaca off-azucar-glas off-azucar-moreno off-canela off-coco
  off-comino off-curcuma off-datiles off-jengibre off-lima off-limon
  off-nuez-moscada off-oregano off-perejil off-pimenton off-sesamo
  off-tomillo off-vainilla off-vinagre
  usda-aceite-vegetal usda-ajo usda-apio usda-arroz-crudo usda-azucar
  usda-berenjena usda-cacahuetes usda-cebolleta usda-chalota usda-col
  usda-harina usda-harina-integral usda-kale usda-pasas usda-pepino
  usda-pera usda-pinones usda-pasta-cruda usda-pure-tomate usda-rabanos
  usda-remolacha usda-sal usda-salsa-tomate
`);

// Cereales, harinas y derivados que contienen gluten por su propia
// identidad: no es una inferencia a partir del nombre de la receta.
const CON_GLUTEN = lista(`
  usda-harina usda-harina-integral usda-pasta-cruda pasta pasta-integral
  pan-blanco pan-integral off-pan-rallado seitan trigo cebada centeno espelta
`);

// Naturalmente libres de gluten o con ficha simple verificada. Quedan fuera
// la avena (trazabilidad de cross-contacto no verificada) y los compuestos
// sin declaración de composición.
const SIN_GLUTEN_CONOCIDO = lista(`
  aceite-oliva aceitunas aguacate almendras alubias arandanos avellanas
  arroz-blanco arroz-integral batata bebida-almendra brocoli calabacin
  cebolla champinones coliflor crema-cacahuete espinacas fresas garbanzos
  guisantes kiwi lechuga lentejas maiz manzana naranja nueces patata
  pimiento platano pina quinoa semillas-chia tempeh tofu tomate
  tortitas-arroz zanahoria
  off-albahaca off-azucar-glas off-azucar-moreno off-canela off-coco
  off-comino off-curcuma off-datiles off-jengibre off-lima off-limon
  off-nuez-moscada off-oregano off-perejil off-pimenton off-sesamo
  off-tomillo off-vainilla off-vinagre
  usda-aceite-vegetal usda-ajo usda-apio usda-arroz-crudo usda-azucar
  usda-berenjena usda-cacahuetes usda-cebolleta usda-chalota usda-col
  usda-kale usda-pasas usda-pepino usda-pera usda-pinones
  usda-pure-tomate usda-rabanos usda-remolacha usda-sal usda-salsa-tomate
  huevo clara-huevo atun-natural atun-aceite salmon merluza gambas
  pollo-pechuga pavo-pechuga ternera-solomillo cerdo-lomo jamon-serrano
  usda-bacon usda-cordero miel
  leche-desnatada leche-entera leche-semidesnatada yogur-natural yogur-griego
  queso-curado queso-batido requeson whey usda-nata usda-nata-agria
  usda-mantequilla usda-feta usda-mozzarella usda-parmesano
`);

// Lácteos con lactosa evidente: leche, yogur, nata, suero y requesón.
const CON_LACTOSA = lista(`
  leche-desnatada leche-entera leche-semidesnatada yogur-natural yogur-griego
  queso-batido requeson whey usda-nata usda-nata-agria
`);

// Derivados lácteos que pueden tener poco lactosa, pero no lo declaran:
// marcarlos como «sin lactosa» sería inventar una composición.
const LACTOSA_SIN_DECLARAR = lista(`
  queso-curado usda-feta usda-mozzarella usda-parmesano usda-mantequilla
`);

// Cualquier alimento no lácteo conocido es naturalmente libre de lactosa.
// «Sin lactosa» no se deduce de la ausencia de la palabra «leche» en el
// nombre de una receta: se exige que el ingrediente esté identificado.
const SIN_LACTOSA_CONOCIDO = new Set([...VEGETAL_CONOCIDO, ...ORIGEN_ANIMAL]);

const RE_ANIMAL = /\b(leche|lactosa|queso|yogur|mantequilla|nata|suero|whey|huevo|clara de huevo|miel|carne|pollo|pavo|cerdo|ternera|cordero|bacon|jam[oó]n|pescado|at[uú]n|salm[oó]n|merluza|gambas|camar[oó]n|langostino|mejill[oó]n|almeja|calamar|gelatina)\b/i;
const RE_GLUTEN = /\b(gluten|trigo|wheat|cebada|barley|centeno|rye|espelta|spelt|harina|pan rallado|breadcrumb)\b/i;
const RE_LACTOSA = /\b(lactosa|lactose|leche|milk|queso|cheese|yogur|nata|crema agria|crema pesada|suero|whey|reques[oó]n)\b/i;
const RE_SIN_LACTOSA = /sin lactosa|lactose[- ]?free|lactosa\s*[<=:]\s*0|0\s*g de lactosa/i;

// Textos que obligan a dudar aunque el id parezca simple: son productos
// compuestos cuya composición o trazabilidad no está declarada en el catálogo.
const COMPUESTO_SIN_TRAZABILIDAD = lista(`
  off-agua off-salsa-soja off-pan-rallado off-levadura usda-hummus
  usda-mostaza chocolate-85 usda-salsa
`);

const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const resultado = (estado, motivo) => ({ estado, motivo });

// Peor estado según la jerarquía: no_apta > desconocida > verificada.
function combinar(resultados) {
  const validos = resultados.filter(Boolean);
  const no = validos.find(r => r.estado === NO);
  if (no) return no;
  const duda = validos.find(r => r.estado === DUDA);
  if (duda) return duda;
  return validos.find(r => r.estado === APTA) || resultado(APTA, 'Datos compatibles declarados');
}

function estadoAlergeno(alimento, indice) {
  return String(alimento?.alergenos14 || '')[indice] || '?';
}

function componentesDe(ingrediente) {
  const valor = ingrediente?.ingredientes;
  if (Array.isArray(valor)) return valor.map(c => typeof c === 'string'
    ? { nombre: c }
    : { id: c?.id || '', nombre: c?.nombre || '', composicion: c?.composicion || '' });
  if (typeof valor === 'string' && valor.trim()) {
    return valor.split(/[,;]+|\s+y\s+/i).map(x => ({ nombre: x.trim() })).filter(x => x.nombre);
  }
  return [];
}

function textoFicha(alimento, ingrediente) {
  return [
    alimento?.nombre, alimento?.descripcionFuente, alimento?.ingredientes,
    alimento?.alergenosTexto, alimento?.trazasTexto,
    ingrediente?.composicion,
    // El nombre solo se considera cuando viene de un componente explícito,
    // no del campo `nombre` del ingrediente importado.
    ingrediente?.esComponente ? ingrediente?.nombre : '',
  ].filter(Boolean).join(' ');
}

function estadoIngrediente(alimento, ingrediente, dieta, lookup, profundidad = 0) {
  const id = String(ingrediente?.id || '');
  const texto = textoFicha(alimento, ingrediente);

  if (!alimento && !componentesDe(ingrediente).length && !ingrediente?.composicion) {
    return resultado(DUDA, 'Alimento sin ficha en el catálogo');
  }

  // Un producto compuesto se valida por sus componentes declarados; si no
  // declara composición, no puede pasar a «verificada» por su nombre.
  const componentes = profundidad < 2 ? componentesDe(ingrediente) : [];
  const estados = [];

  if (dieta === 'vegana') {
    if (ORIGEN_ANIMAL.has(id) || RE_ANIMAL.test(texto)
      || ['P', 'T'].includes(estadoAlergeno(alimento, 1))
      || ['P', 'T'].includes(estadoAlergeno(alimento, 2))
      || ['P', 'T'].includes(estadoAlergeno(alimento, 3))
      || ['P', 'T'].includes(estadoAlergeno(alimento, 6))
      || ['P', 'T'].includes(estadoAlergeno(alimento, 13))) {
      estados.push(resultado(NO, 'Origen animal declarado'));
    } else if (VEGETAL_CONOCIDO.has(id) && !COMPUESTO_SIN_TRAZABILIDAD.has(id)) {
      estados.push(resultado(APTA, 'Origen vegetal conocido'));
    } else {
      estados.push(resultado(DUDA, 'Origen o composición no verificada'));
    }
  } else if (dieta === 'sinGluten') {
    if (CON_GLUTEN.has(id) || RE_GLUTEN.test(texto) || estadoAlergeno(alimento, 0) === 'P') {
      estados.push(resultado(NO, 'Gluten declarado en el ingrediente'));
    } else if (estadoAlergeno(alimento, 0) === 'T') {
      estados.push(resultado(DUDA, 'El ingrediente declara posibles trazas de gluten'));
    } else if (SIN_GLUTEN_CONOCIDO.has(id) && !COMPUESTO_SIN_TRAZABILIDAD.has(id)) {
      estados.push(resultado(APTA, 'Sin gluten por composición simple verificada'));
    } else {
      estados.push(resultado(DUDA, 'Composición, marca o trazabilidad sin verificar'));
    }
  } else {
    if (RE_SIN_LACTOSA.test(texto)) {
      estados.push(resultado(APTA, 'Ausencia de lactosa declarada en la ficha'));
    } else if (CON_LACTOSA.has(id) || estadoAlergeno(alimento, 6) === 'P') {
      estados.push(resultado(NO, 'Lácteo con lactosa declarado'));
    } else if (LACTOSA_SIN_DECLARAR.has(id) || estadoAlergeno(alimento, 6) === 'T'
      || /\b(queso|cheese|mantequilla|butter)\b/i.test(texto)) {
      // Queso curado, feta, mozzarella, parmesano y mantequilla pueden tener
      // muy poca lactosa, pero la fuente no la declara: no se inventa el dato.
      estados.push(resultado(DUDA, 'Derivado lácteo sin declaración de lactosa'));
    } else if (RE_LACTOSA.test(texto)) {
      estados.push(resultado(NO, 'Lácteo con lactosa declarado'));
    } else if (SIN_LACTOSA_CONOCIDO.has(id) && !COMPUESTO_SIN_TRAZABILIDAD.has(id)) {
      estados.push(resultado(APTA, 'Ingrediente no lácteo identificado'));
    } else {
      estados.push(resultado(DUDA, 'Composición sin verificar'));
    }
  }

  for (const componente of componentes) {
    estados.push(estadoIngrediente(
      componente.id ? (lookup(componente.id) || null) : null,
      { ...componente, esComponente: true }, dieta, lookup, profundidad + 1,
    ));
  }

  return combinar(estados);
}

function estadoDeclarado(receta, dieta) {
  if (receta?.alergenosEstado !== 'declarado') return null;
  const declarados = (Array.isArray(receta?.alergenos) ? receta.alergenos : [])
    .map(norm);
  const tiene = (...palabras) => palabras.some(p => declarados.some(d => d.includes(p)));

  if (dieta === 'vegana' && tiene('leche', 'huevo', 'pescado', 'crustaceo', 'molusco')) {
    return resultado(NO, 'Alérgeno de origen animal declarado en la receta');
  }
  if (dieta === 'sinGluten' && tiene('gluten', 'trigo', 'cebada', 'centeno')) {
    return resultado(NO, 'Gluten declarado en la receta');
  }
  if (dieta === 'sinLactosa' && tiene('lactosa')) {
    return resultado(NO, 'Lactosa declarada en la receta');
  }
  if (dieta === 'sinLactosa' && tiene('leche')) {
    return resultado(DUDA, 'Lácteo declarado sin datos de lactosa');
  }
  return null;
}

/**
 * Clasifica una receta en los tres filtros dietéticos.
 * @param {object} receta Receta con sus `ingredientes` reales.
 * @param {(id:string)=>object|null} alimentoPorId Look-up del catálogo.
 * @returns {{vegana:object, sinGluten:object, sinLactosa:object}}
 */
export function clasificarReceta(receta, alimentoPorId = () => null) {
  const salida = {};
  for (const { clave } of FILTROS_DIETA) {
    const evidencias = [estadoDeclarado(receta, clave)];
    const ings = Array.isArray(receta?.ingredientes) ? receta.ingredientes : [];
    if (!ings.length) {
      evidencias.push(resultado(DUDA, 'Sin ingredientes declarados'));
    }
    for (const ing of ings) {
      evidencias.push(estadoIngrediente(alimentoPorId(ing?.id), ing, clave, alimentoPorId));
    }
    const final = combinar(evidencias);
    salida[clave] = {
      ...final,
      motivo: [...new Set(evidencias.map(e => e?.motivo).filter(Boolean))].join(' · ') || final.motivo,
    };
  }
  return salida;
}

// Un filtro dietético solo muestra recetas VERIFICADAS. Las desconocidas
// quedan fuera: no se puede afirmar que cumplen la restricción.
export function recetaCumpleDieta(receta, clave) {
  return receta?.dieta?.[clave]?.estado === APTA;
}

export const etiquetaDieta = estado => ({
  [APTA]: 'Verificada',
  [NO]: 'No apta',
  [DUDA]: 'Desconocida',
}[estado] || 'Desconocida');
