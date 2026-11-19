// =====================================================================
// Escáner de códigos de barras para la pantalla de nutrición.
// Privacidad: solo se envía el código leído a Open Food Facts.
// Nunca se envían datos personales, peso ni historial de la app.
// =====================================================================

const FORMATOS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code'];
const API_BASE = 'https://world.openfoodfacts.org/api/v2/product';
const CAMPOS = 'product_name,brands,nutriments,serving_quantity,image_front_small_url';

// El navegador debe exponer BarcodeDetector para poder escanear.
export function soportaCodigos() {
  return typeof window !== 'undefined' && !!window.BarcodeDetector;
}

const limpiarCodigo = valor => String(valor || '').replace(/[^0-9A-Za-z]/g, '');

// Escanea con la cámara hasta leer un código o agotar `tiempo` (ms).
// Devuelve el código o null; nunca lanza: la UI ofrecerá escribirlo a mano.
export async function escanearCodigo({ tiempo = 9000 } = {}) {
  if (!soportaCodigos()) return null;

  let video = null;
  let stream = null;
  let frame = 0;
  let timer = 0;
  let listo = false;

  // Apaga la cámara y retira el <video> pase lo que pase.
  function limpiar() {
    if (frame) cancelAnimationFrame(frame);
    if (timer) clearTimeout(timer);
    if (stream) {
      try { stream.getTracks().forEach(t => t.stop()); } catch (_) { /* nada */ }
      stream = null;
    }
    if (video) {
      try {
        video.pause();
        video.srcObject = null;
        video.remove();
      } catch (_) { /* nada */ }
      video = null;
    }
  }

  return new Promise(resolve => {
    const terminar = valor => {
      if (listo) return;
      listo = true;
      limpiar();
      resolve(valor);
    };

    const duracion = Math.max(0, Number(tiempo) || 0);
    timer = setTimeout(() => terminar(null), duracion);

    (async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          terminar(null);
          return;
        }

        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        // Si venció el tiempo pidiendo permiso, apagamos la cámara igualmente.
        if (listo) { s.getTracks().forEach(t => t.stop()); return; }
        stream = s;

        video = document.createElement('video');
        video.autoplay = true;
        video.muted = true;
        video.setAttribute('playsinline', '');
        // Fuera de pantalla en vez de display:none: algunos motores no entregan
        // fotogramas si el vídeo está completamente oculto.
        video.style.position = 'fixed';
        video.style.left = '-9999px';
        video.style.top = '0';
        video.style.width = '1px';
        video.style.height = '1px';
        video.style.opacity = '0';
        video.style.pointerEvents = 'none';
        document.body.appendChild(video);
        video.srcObject = stream;
        await video.play();
        if (listo) return;

        const detector = new window.BarcodeDetector({ formats: FORMATOS });
        const limite = Date.now() + duracion;

        const barrer = async () => {
          if (listo) return;
          if (Date.now() >= limite) { terminar(null); return; }
          try {
            const hallazgos = await detector.detect(video);
            if (listo) return;
            if (hallazgos && hallazgos.length) {
              const codigo = String(hallazgos[0].rawValue || hallazgos[0].raw_data || '').trim();
              if (codigo) { terminar(codigo); return; }
            }
          } catch (_) {
            // Un fotograma fallido no aborta el escaneo.
          }
          frame = requestAnimationFrame(barrer);
        };
        frame = requestAnimationFrame(barrer);
      } catch (_) {
        // Sin permiso, sin cámara o sin vídeo: devolvemos null sin ruido.
        terminar(null);
      }
    })();
  });
}

// Consulta el producto a Open Food Facts. Solo viaja el código de barras.
export async function buscarAlimento(codigo) {
  const limpio = limpiarCodigo(codigo);
  if (!limpio) return null;

  try {
    const url = `${API_BASE}/${encodeURIComponent(limpio)}.json?fields=${CAMPOS}`;
    const respuesta = await fetch(url, { cache: 'no-store' });
    if (!respuesta || !respuesta.ok || respuesta.status === 0) return null;

    const datos = await respuesta.json();
    if (!datos || datos.status !== 1 || !datos.product) return null;

    const p = datos.product;
    const n = datos.nutriments || {};
    const redondear = valor => {
      const x = Number(valor);
      return Number.isFinite(x) ? Math.round(x * 10) / 10 : 0;
    };
    const racion = Number(p.serving_quantity);
    const porcion = Number.isFinite(racion) && racion > 0 ? redondear(racion) : 100;

    return {
      codigo: limpio,
      nombre: String(p.product_name || '').trim(),
      marca: String(p.brands || '').trim(),
      kcal: redondear(n['energy-kcal_100g']),
      prot: redondear(n.proteins_100g),
      carbs: redondear(n.carbohydrates_100g),
      grasa: redondear(n.fat_100g),
      porcion,
      imagen: String(p.image_front_small_url || ''),
      fuente: 'Open Food Facts',
    };
  } catch (_) {
    return null;
  }
}

// Enlace público a la ficha del producto (útil como respaldo manual).
export function urlProducto(codigo) {
  return `https://world.openfoodfacts.org/product/${encodeURIComponent(limpiarCodigo(codigo))}`;
}
