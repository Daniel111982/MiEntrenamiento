// Gráficos visuales del diario de DanTal: SVG puro, sin librerías ni red.
// Todas las funciones devuelven HTML y no leen estado global.

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));
const num = v => Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0;
const fmt = v => Math.round(num(v)).toLocaleString('es-ES');
const fmt1 = v => (Math.round(num(v) * 10) / 10).toLocaleString('es-ES', { maximumFractionDigits: 1 });
const circ = r => 2 * Math.PI * r;

// Anillo de calorías: se llena hasta el objetivo y pasa a rojo si se supera.
export function anilloKcal(kcal, meta = 0, { tam = 124, grosor = 11 } = {}) {
  const r = (tam - grosor) / 2 - 2;
  const c = circ(r);
  const valor = num(kcal);
  const objetivo = num(meta);
  const pct = objetivo ? Math.min(1, valor / objetivo) : 0;
  const medio = tam / 2;
  const color = objetivo && valor > objetivo ? 'var(--peligro)' : 'var(--naranja)';
  const arco = objetivo
    ? `<circle cx="${medio}" cy="${medio}" r="${r.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${grosor}" stroke-linecap="round"
         stroke-dasharray="${c.toFixed(1)} ${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct)).toFixed(1)}"
         transform="rotate(-90 ${medio} ${medio})"/>`
    : '';
  const pie = objetivo ? `${Math.round(pct * 100)} % de ${fmt(objetivo)}` : 'sin objetivo';
  return `<div class="g-anillo">
    <svg viewBox="0 0 ${tam} ${tam}" width="${tam}" height="${tam}" role="img" aria-label="${fmt(valor)} de ${fmt(objetivo)} kcal">
      <circle cx="${medio}" cy="${medio}" r="${r.toFixed(1)}" fill="none" stroke="var(--borde)" stroke-width="${grosor}"/>
      ${arco}
      <text x="${medio}" y="${medio - 2}" text-anchor="middle" class="g-num">${fmt(valor)}</text>
      <text x="${medio}" y="${medio + 16}" text-anchor="middle" class="g-sub">kcal</text>
    </svg>
    <small>${pie}</small>
  </div>`;
}

// Donut de reparto de macronutrientes (proteína, hidratos y grasa).
export function donutMacros(macros = {}, { tam = 124, grosor = 16 } = {}) {
  const partes = [
    { nombre: 'Proteína', g: num(macros.prot), color: 'var(--acento)' },
    { nombre: 'Hidratos', g: num(macros.carbs), color: 'var(--acento2)' },
    { nombre: 'Grasa', g: num(macros.grasa), color: 'var(--amarillo)' },
  ];
  const energias = partes.map(p => p.g * (p.nombre === 'Grasa' ? 9 : 4));
  const total = energias.reduce((a, b) => a + b, 0);
  const r = (tam - grosor) / 2 - 2;
  const c = circ(r);
  const medio = tam / 2;
  let consumido = 0;
  const segmentos = total > 0
    ? partes.map((p, i) => {
      const longitud = c * energias[i] / total;
      const visible = Math.max(0, longitud - 1.5);
      const arco = `<circle cx="${medio}" cy="${medio}" r="${r.toFixed(1)}" fill="none" stroke="${p.color}" stroke-width="${grosor}"
          stroke-dasharray="${visible.toFixed(1)} ${(c - visible).toFixed(1)}" stroke-dashoffset="${(-consumido).toFixed(1)}"
          transform="rotate(-90 ${medio} ${medio})"><title>${p.nombre}: ${fmt1(p.g)} g</title></circle>`;
      consumido += longitud;
      return arco;
    }).join('')
    : `<circle cx="${medio}" cy="${medio}" r="${r.toFixed(1)}" fill="none" stroke="var(--borde)" stroke-width="${grosor}"/>`;
  const leyenda = partes.map((p, i) => `<span><i style="background:${p.color}"></i>${p.nombre} <b>${fmt1(p.g)} g</b><small>${fmt(energias[i])} kcal</small></span>`).join('');
  return `<div class="g-donut">
    <svg viewBox="0 0 ${tam} ${tam}" width="${tam}" height="${tam}" role="img" aria-label="Reparto de macronutrientes">
      <circle cx="${medio}" cy="${medio}" r="${r.toFixed(1)}" fill="none" stroke="var(--borde)" stroke-width="${grosor}"/>
      ${segmentos}
      <text x="${medio}" y="${medio + 5}" text-anchor="middle" class="g-centro">${total ? fmt(total) : '—'}</text>
    </svg>
    <div class="g-leyenda">${leyenda}</div>
  </div>`;
}

// Barra apilada y cantidades compactas para cada alimento del diario.
export function miniMacros(macros = {}) {
  const partes = [
    { k: 'P', valor: num(macros.prot), color: 'var(--acento)' },
    { k: 'C', valor: num(macros.carbs), color: 'var(--acento2)' },
    { k: 'G', valor: num(macros.grasa), color: 'var(--amarillo)' },
    { k: 'F', valor: num(macros.fibra), color: 'var(--violeta)' },
  ];
  const suma = partes.reduce((a, p) => a + p.valor, 0);
  const pista = suma
    ? partes.map(p => `<i style="width:${(p.valor / suma * 100).toFixed(1)}%;background:${p.color}" title="${p.k}: ${fmt1(p.valor)} g"></i>`).join('')
    : '';
  const chips = partes.map(p => `<span><i style="background:${p.color}"></i>${p.k} <b>${fmt1(p.valor)} g</b></span>`).join('');
  return `<div class="mini-macros">
    <div class="mini-macros-pista">${pista}</div>
    <div class="mini-macros-chips">${chips}</div>
  </div>`;
}

// Barras horizontales: calorías por comida, comparadas con la comida mayor.
export function barrasComidas(items = []) {
  const max = Math.max(1, ...items.map(i => num(i.kcal)));
  return `<div class="g-comidas">${items.map(i => `<div class="g-comida">
    <span class="g-comida-n">${esc(i.nombre)}</span>
    <div class="g-comida-pista"><i style="width:${(num(i.kcal) / max * 100).toFixed(1)}%"></i></div>
    <b>${fmt(i.kcal)}</b>
  </div>`).join('')}</div>`;
}

// Evolución de calorías en los últimos días, con línea de objetivo.
export function sparklineKcal(valores = [], meta = 0, etiquetas = []) {
  const w = 280, h = 68, pad = 7;
  const vals = valores.map(num);
  const objetivo = num(meta);
  const techo = Math.max(objetivo, ...vals, 1) * 1.12;
  const x = i => pad + i * (w - 2 * pad) / Math.max(1, vals.length - 1);
  const y = v => h - pad - (v / techo) * (h - 2 * pad);
  const puntos = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = vals.length > 1
    ? `<polygon points="${pad},${h - pad} ${puntos} ${x(vals.length - 1).toFixed(1)},${h - pad}" class="g-spark-area"/>` : '';
  const metaLinea = objetivo
    ? `<line x1="${pad}" y1="${y(objetivo).toFixed(1)}" x2="${w - pad}" y2="${y(objetivo).toFixed(1)}" class="g-spark-meta"/>` : '';
  const puntosDibujados = vals.map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3" class="g-spark-punto">
    <title>${esc(etiquetas[i] || `Día ${i + 1}`)}: ${fmt(v)} kcal</title></circle>`).join('');
  return `<div class="g-spark">
    <svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none" role="img" aria-label="Evolución de calorías">
      ${area}${metaLinea}
      ${vals.length > 1 ? `<polyline points="${puntos}" class="g-spark-linea"/>` : ''}
      ${puntosDibujados}
    </svg>
    <div class="g-spark-etiquetas">${etiquetas.map(e => `<span>${esc(e)}</span>`).join('')}</div>
  </div>`;
}

// Tarjeta que aparece justo después de añadir una comida al diario.
export function tarjetaEntrada(macros = {}, nombre = '', micros = {}) {
  const filas = [
    ['🔥', 'Calorías', fmt(macros.kcal), 'kcal'],
    ['🥩', 'Proteína', fmt1(macros.prot), 'g'],
    ['🍚', 'Hidratos', fmt1(macros.carbs), 'g'],
    ['🧈', 'Grasa', fmt1(macros.grasa), 'g'],
    ['🌾', 'Fibra', fmt1(macros.fibra), 'g'],
  ];
  const extras = Object.keys(micros).length
    ? `<p class="tenue g-entrada-extra">Micronutrientes declarados: ${Object.entries(micros)
      .map(([k, v]) => `${esc(k)} ${fmt1(v)}`).join(' · ')}</p>`
    : '';
  return `<div class="g-entrada">
    <div class="g-entrada-cab"><b>${esc(nombre || 'Comida registrada')}</b><small>Así se suma a tu día</small></div>
    <div class="g-entrada-cuerpo">
      ${donutMacros(macros, { tam: 108, grosor: 14 })}
      <div class="g-entrada-datos">${filas.map(([icono, nombreFila, valor, unidad]) => `<div><span>${icono} ${nombreFila}</span><b>${valor} <small>${unidad}</small></b></div>`).join('')}</div>
    </div>
    ${extras}
  </div>`;
}

// Barra de referencia orientativa para un micronutriente con dato real.
export function barraMicro(valor, referencia, color = 'var(--acento)') {
  const pct = referencia > 0 ? Math.min(100, num(valor) / referencia * 100) : 0;
  return `<div class="micro-pista"><i style="width:${pct.toFixed(1)}%;background:${color}"></i></div>`;
}

// Calorías de los 7 días de la semana. Los días sin registro y los futuros se
// dibujan diferente para que nadie los confunda con un cero real.
export function barrasSemana(dias = [], meta = 0) {
  const w = 294, h = 150, base = h - 24, top = 12, paso = w / 7;
  const ancho = Math.min(26, paso * 0.58);
  const valores = dias.map(d => num(d.kcal));
  const techo = Math.max(num(meta), ...valores, 1) * 1.15;
  const y = v => base - (num(v) / techo) * (base - top);
  const objetivo = num(meta);
  const lineaMeta = objetivo
    ? `<line x1="0" y1="${y(objetivo).toFixed(1)}" x2="${w}" y2="${y(objetivo).toFixed(1)}" class="g-semana-meta"/>\n       <text x="${w - 2}" y="${(y(objetivo) - 4).toFixed(1)}" text-anchor="end" class="g-semana-obj">objetivo</text>`
    : '';
  const barras = dias.map((d, i) => {
    const x = i * paso + (paso - ancho) / 2;
    const futuro = Boolean(d.futuro);
    const registrado = Boolean(d.registrado);
    const altura = registrado ? Math.max(3, base - y(d.kcal)) : 3;
    const clase = futuro ? 'g-barra futuro' : registrado ? 'g-barra' : 'g-barra sin-dato';
    const detalle = futuro ? 'Todavía no es ese día' : registrado
      ? `${fmt(d.kcal)} kcal · ${fmt1(d.prot)} g proteína · ${fmt1(d.fibra)} g fibra`
      : 'Sin comidas registradas';
    return `<g>
      <rect x="${x.toFixed(1)}" y="${(base - altura).toFixed(1)}" width="${ancho.toFixed(1)}" height="${altura.toFixed(1)}" rx="5" class="${clase}">
        <title>${esc(d.fecha || `Día ${i + 1}`)}: ${esc(detalle)}</title>
      </rect>
      <text x="${(i * paso + paso / 2).toFixed(1)}" y="${h - 6}" text-anchor="middle" class="g-semana-dia ${d.fecha === dias.find(z => z.hoy)?.fecha ? 'hoy' : ''}">${esc(d.etiqueta || '')}</text>
    </g>`;
  }).join('');
  return `<div class="g-semana">
    <svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="Calorías de los últimos 7 días">
      ${lineaMeta}${barras}
    </svg>
    <div class="g-semana-leyenda"><span><i class="llena"></i>Registrado</span><span><i class="vacia"></i>Sin dato</span>${objetivo ? '<span><i class="obj"></i>Objetivo</span>' : ''}</div>
  </div>`;
}

// Comparación limpia de esta semana frente a la anterior, métrica por métrica.
export function barrasComparacion(filas = []) {
  const lista = filas.filter(f => f && f.nombre);
  const max = Math.max(1, ...lista.flatMap(f => [num(f.actual), num(f.anterior)]));
  return `<div class="g-comparacion">
    <div class="g-comp-leyenda"><span><i class="actual"></i>Esta semana</span><span><i class="anterior"></i>Anterior</span></div>
    ${lista.map(f => `<div class="g-comp-fila">
      <span class="g-comp-n">${esc(f.nombre)}</span>
      <div class="g-comp-barras">
        <div class="g-comp-pista"><i class="actual" style="width:${(num(f.actual) / max * 100).toFixed(1)}%"><title>Esta semana: ${fmt1(f.actual)} ${esc(f.uni || '')}</title></i></div>
        <div class="g-comp-pista"><i class="anterior" style="width:${(num(f.anterior) / max * 100).toFixed(1)}%"><title>Semana anterior: ${fmt1(f.anterior)} ${esc(f.uni || '')}</title></i></div>
      </div>
      <b>${fmt1(f.actual)} <small>${esc(f.uni || '')}</small></b>
    </div>`).join('')}
  </div>`;
}

// ---------------------------------------------------------------------
// 2.10: gráficos de entrenamiento. Misma familia visual que los del diario:
// SVG puro, tooltips con <title> y ningún dato inventado.
// ---------------------------------------------------------------------
const fechaCorta = f => {
  const d = new Date(f);
  return Number.isNaN(d.getTime()) ? String(f ?? '') : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};
let idGrafica = 0;

// Volumen (kg × repeticiones) por semana natural. Las semanas sin sesiones
// se dibujan con el contorno punteado para no confundirlas con un cero medido.
export function barrasVolumen(semanas = [], { mini = false, media = false } = {}) {
  const lista = semanas.filter(Boolean);
  const w = 294, h = mini ? 96 : 150, base = h - 22, top = 12;
  const paso = w / Math.max(1, lista.length);
  const ancho = Math.min(26, paso * 0.56);
  const activas = lista.filter(s => num(s.sesiones) > 0);
  const promedio = activas.length ? activas.reduce((t, s) => t + num(s.kg), 0) / activas.length : 0;
  const techo = Math.max(1, promedio, ...activas.map(s => num(s.kg))) * 1.15;
  const y = v => base - (num(v) / techo) * (base - top);
  const mediaLinea = media && promedio
    ? `<line x1="0" y1="${y(promedio).toFixed(1)}" x2="${w}" y2="${y(promedio).toFixed(1)}" class="g-vol-media"/>
       <text x="${w - 2}" y="${(y(promedio) - 4).toFixed(1)}" text-anchor="end" class="g-vol-media-txt">media</text>`
    : '';
  const ultima = lista[lista.length - 1]?.fecha;
  const barras = lista.map((s, i) => {
    const sin = num(s.sesiones) === 0;
    const altura = sin ? 4 : Math.max(3, base - y(s.kg));
    const x = i * paso + (paso - ancho) / 2;
    const etiqueta = mini ? String(s.etiqueta ?? '').split(' ')[0] : String(s.etiqueta ?? '');
    const detalle = sin
      ? 'Sin sesiones registradas'
      : `${fmt(s.kg)} kg movidos · ${num(s.sesiones)} ${num(s.sesiones) === 1 ? 'sesión' : 'sesiones'}`;
    return `<g>
      <rect x="${x.toFixed(1)}" y="${(base - altura).toFixed(1)}" width="${ancho.toFixed(1)}" height="${altura.toFixed(1)}" rx="5"
        class="g-vol-barra ${sin ? 'sin' : ''} ${s.fecha === ultima ? 'actual' : ''}">
        <title>${esc(s.fecha || `Semana ${i + 1}`)}: ${esc(detalle)}</title>
      </rect>
      <text x="${(i * paso + paso / 2).toFixed(1)}" y="${h - 6}" text-anchor="middle" class="g-vol-dia ${s.fecha === ultima ? 'actual' : ''}">${esc(etiqueta)}</text>
    </g>`;
  }).join('');
  return `<div class="g-vol ${mini ? 'mini' : ''}">
    <svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="Volumen de entrenamiento por semana">
      ${mediaLinea}${barras}
    </svg>
    <div class="g-vol-leyenda"><span><i class="con"></i>Con sesiones</span><span><i class="sin"></i>Sin sesiones</span>${media && promedio ? '<span><i class="med"></i>Media</span>' : ''}</div>
  </div>`;
}

// Recuperación media estimada día a día (0-100 %). Solo usa sesiones reales:
// un día sin entrenar reciente aparece al 100 % porque no hay fatiga registrada.
export function lineaRecuperacion(dias = []) {
  const lista = dias.filter(Boolean);
  const w = 294, h = 132, izq = 32, der = 8, arriba = 10, abajo = h - 24;
  const x = i => izq + (lista.length === 1 ? (w - izq - der) / 2 : i * (w - izq - der) / (lista.length - 1));
  const y = v => abajo - (Math.min(100, num(v)) / 100) * (abajo - arriba);
  const rejilla = [100, 50, 0].map(v => `<line x1="${izq}" y1="${y(v).toFixed(1)}" x2="${w - der}" y2="${y(v).toFixed(1)}" class="g-rec-rejilla"/>
    <text x="${izq - 5}" y="${(y(v) + 3).toFixed(1)}" text-anchor="end" class="g-rec-etq">${v}%</text>`).join('');
  const puntos = lista.map((d, i) => `${x(i).toFixed(1)},${y(d.pct).toFixed(1)}`).join(' ');
  const area = lista.length > 1
    ? `<polygon points="${izq},${abajo} ${puntos} ${x(lista.length - 1).toFixed(1)},${abajo}" class="g-rec-area"/>` : '';
  const circulos = lista.map((d, i) => {
    const pct = Math.round(num(d.pct));
    const clase = pct < 60 ? 'baja' : pct < 85 ? 'media' : '';
    const detalle = d.masFatigado
      ? ` · más fatigado: ${esc(d.masFatigado)} (${Math.round(num(d.masFatigadoPct))} %)`
      : '';
    return `<circle cx="${x(i).toFixed(1)}" cy="${y(d.pct).toFixed(1)}" r="3.2" class="g-rec-punto ${clase}">
      <title>${esc(d.fecha || `Día ${i + 1}`)}: ${pct} % de recuperación media${detalle}</title></circle>`;
  }).join('');
  const etiquetas = lista.map((d, i) => i % 2 === 0 || i === lista.length - 1
    ? `<text x="${x(i).toFixed(1)}" y="${h - 6}" text-anchor="middle" class="g-rec-dia">${esc(String(d.etiqueta ?? '').split(' ')[0])}</text>` : '').join('');
  return `<div class="g-rec">
    <svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="Recuperación muscular estimada de los últimos días">
      ${rejilla}${area}
      ${lista.length > 1 ? `<polyline points="${puntos}" class="g-rec-linea"/>` : ''}
      ${circulos}${etiquetas}
    </svg>
    <div class="g-rec-leyenda"><span><i class="alta"></i>Descansado</span><span><i class="media"></i>En recuperación</span><span><i class="baja"></i>Fatigado</span></div>
  </div>`;
}

// Evolución de la mejor serie de un ejercicio (1RM estimado con carga).
export function evolucionFuerza(puntos = [], { unidad = 'kg', nombre = '' } = {}) {
  const lista = puntos.filter(Boolean);
  if (!lista.length) return '<p class="tenue">Sin datos registrados para este ejercicio.</p>';
  const valores = lista.map(p => num(p.v));
  const max = Math.max(...valores), min = Math.min(...valores);
  const W = 320, H = 150, P = 30;
  const x = i => P + (lista.length === 1 ? (W - 2 * P) / 2 : i * (W - 2 * P) / (lista.length - 1));
  const y = v => H - P - ((v - min) / (max - min || 1)) * (H - 2 * P);
  const linea = lista.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(valores[i]).toFixed(1)}`).join(' ');
  const area = `${linea} L${x(lista.length - 1).toFixed(1)},${H - P} L${x(0).toFixed(1)},${H - P} Z`;
  const id = `g-fz-${++idGrafica}`;
  const mejor = lista[valores.indexOf(max)].m || {};
  const serieMejor = mejor.kg ? `${fmt(mejor.kg)}×${fmt(mejor.reps)}` : fmt(mejor.reps);
  return `<div class="g-fuerza">
    <svg viewBox="0 0 ${W} ${H}" class="svg-graf" role="img" aria-label="Evolución de fuerza de ${esc(nombre || 'este ejercicio')}">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--acento)" stop-opacity=".35"/><stop offset="1" stop-color="var(--acento)" stop-opacity="0"/></linearGradient></defs>
      <line x1="${P}" y1="${H - P}" x2="${W - P}" y2="${H - P}" class="eje"/>
      <text x="${P - 4}" y="${(y(max) + 4).toFixed(1)}" text-anchor="end" class="etq">${fmt(max)}</text>
      <text x="${P - 4}" y="${(y(min) + 4).toFixed(1)}" text-anchor="end" class="etq">${fmt(min)}</text>
      <path d="${area}" fill="url(#${id})"/>
      <path d="${linea}" class="trazo"/>
      ${lista.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(valores[i]).toFixed(1)}" r="${valores[i] === max ? 5 : 3.5}" class="punto ${valores[i] === max ? 'rec' : ''}">
        <title>${esc(fechaCorta(p.fecha))}: ${fmt(valores[i])} ${esc(unidad)}</title></circle>`).join('')}
    </svg>
    <div class="stats mini">
      <div><b>${fmt(valores[valores.length - 1])}</b><span>actual · ${esc(unidad)}</span></div>
      <div><b>🏆 ${fmt(max)}</b><span>récord</span></div>
      <div><b>${serieMejor}</b><span>mejor serie</span></div>
    </div>
    <p class="tenue">${lista.length} ${lista.length === 1 ? 'sesión registrada' : 'sesiones registradas'}. ${unidad.includes('1RM') ? 'Con carga se estima el 1RM con la fórmula de Epley.' : ''}</p>
  </div>`;
}

// FASE 9 · PARTE 3 — evolución corporal. Los círculos son datos reales (o la
// media del periodo, si se agregaron semanas/meses); la línea discontinua es
// una tendencia calculada y se corta donde no hay registros: nunca une dos
// puntos separados por un hueco ni inventa valores intermedios.
export function evolucionMedidas(puntos = [], { unidad = '', nombre = '', periodo = 'todo' } = {}) {
  const lista = puntos
    .filter(p => p && Number.isFinite(Number(p.v)))
    .map(p => ({ ...p, v: Number(p.v) }))
    .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  if (!lista.length) return '<p class="tenue centro">Sin registros para este dato. Añade una medición para ver su evolución.</p>';

  const W = 320, H = 160, P = 30;
  const tiempo = f => Date.parse(`${String(f ?? '').slice(0, 10)}T12:00:00`) || 0;
  const t0 = tiempo(lista[0].fecha);
  const t1 = tiempo(lista[lista.length - 1].fecha);
  const x = p => lista.length === 1 ? W / 2 : P + (tiempo(p.fecha) - t0) / (t1 - t0 || 1) * (W - 2 * P);
  const vals = lista.map(p => p.v);
  const min = Math.min(...vals), max = Math.max(...vals);
  const margen = (max - min) || Math.max(1, Math.abs(max) * 0.05);
  const yMin = min - margen * 0.15, yMax = max + margen * 0.15;
  const y = v => H - P - (v - yMin) / ((yMax - yMin) || 1) * (H - 2 * P);

  const segmentos = [];
  let actual = [];
  const cortes = [];
  lista.forEach((p, i) => {
    if (i && p.hueco) {
      segmentos.push(actual);
      actual = [];
      cortes.push((x(lista[i - 1]) + x(p)) / 2);
    }
    actual.push(p);
  });
  if (actual.length) segmentos.push(actual);
  const lineas = segmentos.filter(s => s.length > 1)
    .map(s => s.map((p, i) => `${i ? 'L' : 'M'}${x(p).toFixed(1)},${y(p.v).toFixed(1)}`).join(' '));
  const etiquetaPunto = periodo === 'todo' ? 'Dato registrado' : 'Media del periodo';
  const hayEstimados = lista.some(p => p.origen === 'estimado');

  return `<div class="g-evo">
    <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="Evolución de ${esc(nombre || 'este dato')}">
      <line x1="${P}" y1="${H - P}" x2="${W - P}" y2="${H - P}" class="g-evo-eje"/>
      <text x="${P - 4}" y="${(y(max) + 4).toFixed(1)}" text-anchor="end" class="g-evo-etq">${fmt1(max)}</text>
      <text x="${P - 4}" y="${(y(min) + 4).toFixed(1)}" text-anchor="end" class="g-evo-etq">${fmt1(min)}</text>
      ${lineas.map(d => `<path d="${d}" class="g-evo-tendencia"/>`).join('')}
      ${cortes.map(cx => `<text x="${cx.toFixed(1)}" y="${(H / 2).toFixed(1)}" text-anchor="middle" class="g-evo-sin">sin dato</text>`).join('')}
      ${lista.map((p, i) => `<circle cx="${x(p).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="${i === lista.length - 1 ? 5 : 3.5}"
        class="g-evo-punto ${p.origen === 'estimado' ? 'estimado' : ''} ${i === lista.length - 1 ? 'actual' : ''}">
        <title>${esc(fechaCorta(p.fecha))}: ${fmt1(p.v)} ${esc(unidad)}${p.origen === 'estimado' ? ' · estimación' : ''}</title></circle>`).join('')}
      ${lista.length === 1
        ? `<text x="${W / 2}" y="${H - 5}" text-anchor="middle" class="g-evo-etq">${esc(fechaCorta(lista[0].fecha))}</text>`
        : `<text x="${P}" y="${H - 5}" class="g-evo-etq">${esc(fechaCorta(lista[0].fecha))}</text>
           <text x="${W - P}" y="${H - 5}" text-anchor="end" class="g-evo-etq">${esc(fechaCorta(lista[lista.length - 1].fecha))}</text>`}
    </svg>
    <div class="g-evo-leyenda"><span><i class="dato"></i>${etiquetaPunto}</span><span><i class="tend"></i>Tendencia calculada</span>${hayEstimados ? '<span><i class="est"></i>Estimación</span>' : ''}</div>
  </div>`;
}
