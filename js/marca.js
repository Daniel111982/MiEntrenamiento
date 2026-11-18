// Identidad visual de DanTal.
// Inspirada en el Hotel Talaso Atlántico: azul petróleo, turquesa y turquesa luminoso.
// Todo se genera como SVG en línea (sin imágenes externas) para que funcione sin conexión.

export const MARCA = {
  nombre: 'DanTal',
  eslogan: 'Entrena · Nutre · Evoluciona',
  frase: 'Tu entrenamiento. Tu alimentación. Tu evolución.',
};

// Paleta oficial.
export const COLORES_MARCA = {
  petroleo: '#123C50',
  turquesa: '#087F91',
  turquesaLum: '#42C4C5',
};

// Degradados por variante: [inicio, medio, fin].
const DEGRADADOS = {
  color: ['#123C50', '#087F91', '#42C4C5'],
  claro: ['#FFFFFF', '#E8EEF0', '#42C4C5'],
  oscuro: ['#0C232F', '#123C50', '#087F91'],
  blanco: ['#FFFFFF', '#FFFFFF', '#FFFFFF'],
};

// Contador para que cada SVG tenga un id de degradado único y no choquen entre sí.
let _uid = 0;
const uid = () => `dantal-g${(++_uid).toString(36)}`;

// Estrella dinámica de 4 puntas (el isotipo de DanTal).
const ESTRELLA = 'M50 3 C54.5 30 70 45.5 97 50 C70 54.5 54.5 70 50 97 C45.5 70 30 54.5 3 50 C30 45.5 45.5 30 50 3 Z';

export function isotipoDantal({ tam = 40, variante = 'color', clase = '' } = {}) {
  const [c1, c2, c3] = DEGRADADOS[variante] || DEGRADADOS.color;
  const id = uid();
  return `<svg class="marca-isotipo ${clase}" width="${tam}" height="${tam}" viewBox="0 0 100 100" role="img" aria-label="${MARCA.nombre}" aria-hidden="false">
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${c1}"/>
        <stop offset="0.65" stop-color="${c2}"/>
        <stop offset="1" stop-color="${c3}"/>
      </linearGradient>
    </defs>
    <path d="${ESTRELLA}" fill="url(#${id})"/>
  </svg>`;
}

// Isotipo sobre un cuadrado redondeado (para avatares, cabeceras…).
export function isotipoCuadrado({ tam = 40, clase = '' } = {}) {
  const id = uid();
  return `<svg class="marca-isotipo ${clase}" width="${tam}" height="${tam}" viewBox="0 0 100 100" role="img" aria-label="${MARCA.nombre}">
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#123C50"/>
        <stop offset="0.65" stop-color="#087F91"/>
        <stop offset="1" stop-color="#42C4C5"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="24" fill="url(#${id})"/>
    <path d="${ESTRELLA}" fill="#FFFFFF" opacity="0.96" transform="translate(50 50) scale(0.62) translate(-50 -50)"/>
    <path d="${ESTRELLA}" fill="#42C4C5" opacity="0.9" transform="translate(50 50) scale(0.3) translate(-50 -50)"/>
  </svg>`;
}

export function logoDantal({ variante = 'claro', conEslogan = false, compacto = false } = {}) {
  const tam = compacto ? 26 : 34;
  const iso = variante === 'color' || variante === 'claro'
    ? isotipoDantal({ tam, variante: 'color' })
    : isotipoDantal({ tam, variante });
  return `<span class="marca-logo ${variante} ${compacto ? 'compacto' : ''}">
    ${iso}
    <span class="marca-logo-t">
      <b>${MARCA.nombre}</b>
      ${conEslogan ? `<small>${MARCA.eslogan}</small>` : ''}
    </span>
  </span>`;
}

// Cabecera de marca reutilizable (isotipo + nombre + frase opcional).
export function cabeceraMarca({ compacto = false, conFrase = false } = {}) {
  return `<div class="marca-cabecera ${compacto ? 'compacto' : ''}">
    ${logoDantal({ compacto, conEslogan: false })}
    ${conFrase ? `<p class="frase-marca">${MARCA.frase}</p>` : ''}
  </div>`;
}
