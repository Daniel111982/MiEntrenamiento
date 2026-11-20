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
