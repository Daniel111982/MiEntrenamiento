// Biblioteca de ejercicios de MiEntrenamiento.
// patron: hueco del programa que puede ocupar el ejercicio.
// equipo: material necesario (todo). Lista vacía = peso corporal.
// tipo: 'reps' (series x repeticiones) o 'tiempo' (segundos).

export const EQUIPOS = {
  barra: 'Barra y discos',
  mancuernas: 'Mancuernas',
  banco: 'Banco',
  maquinas: 'Máquinas guiadas',
  polea: 'Polea',
  dominadas: 'Barra de dominadas',
  kettlebell: 'Kettlebell',
  bandas: 'Bandas elásticas',
};

export const MUSCULOS = {
  pecho: 'Pecho',
  espalda: 'Espalda',
  hombros: 'Hombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  cuadriceps: 'Cuádriceps',
  femorales: 'Femorales',
  gluteos: 'Glúteos',
  gemelos: 'Gemelos',
  abdomen: 'Abdomen',
};

export const EJERCICIOS = [
  // Sentadilla
  { id: 'sentadilla-barra', nombre: 'Sentadilla con barra', patron: 'sentadilla', musculos: ['cuadriceps', 'gluteos'], equipo: ['barra'], compuesto: true,
    desc: 'Barra sobre los trapecios, pies a la anchura de los hombros. Baja con la espalda neutra hasta que los muslos queden al menos paralelos al suelo y sube empujando con todo el pie.' },
  { id: 'prensa', nombre: 'Prensa de piernas', patron: 'sentadilla', musculos: ['cuadriceps', 'gluteos'], equipo: ['maquinas'], compuesto: true,
    desc: 'Pies en el centro de la plataforma. Baja controlando hasta unos 90° de rodilla sin despegar la zona lumbar del respaldo y empuja sin bloquear las rodillas.' },
  { id: 'sentadilla-goblet', nombre: 'Sentadilla goblet', patron: 'sentadilla', musculos: ['cuadriceps', 'gluteos'], equipo: ['mancuernas'], compuesto: true,
    desc: 'Sujeta una mancuerna vertical pegada al pecho. Baja entre las piernas manteniendo el torso erguido y los codos por dentro de las rodillas.' },
  { id: 'sentadilla-goblet-kb', nombre: 'Sentadilla goblet con kettlebell', patron: 'sentadilla', musculos: ['cuadriceps', 'gluteos'], equipo: ['kettlebell'], compuesto: true,
    desc: 'Kettlebell sujeta por las asas a la altura del pecho. Baja profundo con el pecho alto y sube empujando el suelo.' },
  { id: 'sentadilla-peso', nombre: 'Sentadilla con peso corporal', patron: 'sentadilla', musculos: ['cuadriceps', 'gluteos'], equipo: [], compuesto: true,
    desc: 'Brazos al frente para equilibrar. Baja lo más profundo que puedas con la espalda recta y los talones en el suelo. Para progresar, haz pausas abajo o baja en 3 segundos.' },

  // Bisagra de cadera
  { id: 'peso-muerto-rumano', nombre: 'Peso muerto rumano', patron: 'bisagra', musculos: ['femorales', 'gluteos', 'espalda'], equipo: ['barra'], compuesto: true,
    desc: 'Rodillas ligeramente flexionadas. Lleva la cadera atrás deslizando la barra pegada a las piernas hasta notar estiramiento en los femorales y vuelve apretando glúteos.' },
  { id: 'peso-muerto', nombre: 'Peso muerto', patron: 'bisagra', musculos: ['femorales', 'gluteos', 'espalda'], equipo: ['barra'], compuesto: true, nivelMin: 'intermedio',
    desc: 'Barra sobre el medio del pie. Agarra, tensa la espalda y empuja el suelo con las piernas manteniendo la barra pegada al cuerpo hasta quedar erguido.' },
  { id: 'rumano-mancuernas', nombre: 'Peso muerto rumano con mancuernas', patron: 'bisagra', musculos: ['femorales', 'gluteos'], equipo: ['mancuernas'], compuesto: true,
    desc: 'Mancuernas delante de los muslos. Lleva la cadera atrás con la espalda neutra hasta media tibia y vuelve a la posición inicial.' },
  { id: 'swing-kb', nombre: 'Swing con kettlebell', patron: 'bisagra', musculos: ['gluteos', 'femorales'], equipo: ['kettlebell'], compuesto: true,
    desc: 'Balancea la kettlebell entre las piernas llevando la cadera atrás y proyéctala hasta la altura del pecho con un golpe explosivo de cadera.' },
  { id: 'puente-gluteo', nombre: 'Puente de glúteo', patron: 'bisagra', musculos: ['gluteos', 'femorales'], equipo: [], compuesto: false,
    desc: 'Tumbado boca arriba con las rodillas flexionadas. Eleva la cadera apretando glúteos hasta alinear rodillas, cadera y hombros. Pausa 1 segundo arriba.' },
  { id: 'hip-thrust', nombre: 'Hip thrust con barra', patron: 'bisagra', musculos: ['gluteos'], equipo: ['barra', 'banco'], compuesto: true,
    desc: 'Espalda alta apoyada en el banco, barra sobre la cadera. Empuja hasta la extensión completa de cadera con la barbilla recogida.' },

  // Zancada / unilateral
  { id: 'zancada-mancuernas', nombre: 'Zancadas con mancuernas', patron: 'zancada', musculos: ['cuadriceps', 'gluteos'], equipo: ['mancuernas'], compuesto: true,
    desc: 'Da un paso largo hacia delante y baja hasta que la rodilla trasera casi toque el suelo. Alterna piernas.' },
  { id: 'bulgara', nombre: 'Sentadilla búlgara', patron: 'zancada', musculos: ['cuadriceps', 'gluteos'], equipo: ['banco'], compuesto: true,
    desc: 'Empeine trasero apoyado en el banco. Baja en vertical sobre la pierna delantera. Añade mancuernas cuando sea fácil.' },
  { id: 'zancada-atras', nombre: 'Zancada hacia atrás', patron: 'zancada', musculos: ['cuadriceps', 'gluteos'], equipo: [], compuesto: true,
    desc: 'Da un paso atrás y baja la rodilla trasera hacia el suelo. Vuelve empujando con el talón de la pierna delantera.' },

  // Empuje horizontal
  { id: 'press-banca', nombre: 'Press de banca', patron: 'empuje_h', musculos: ['pecho', 'triceps', 'hombros'], equipo: ['barra', 'banco'], compuesto: true,
    desc: 'Escápulas juntas y pies firmes. Baja la barra controlada hasta el pecho, a la altura del esternón, y empuja hasta extender los brazos.' },
  { id: 'press-mancuernas', nombre: 'Press de banca con mancuernas', patron: 'empuje_h', musculos: ['pecho', 'triceps', 'hombros'], equipo: ['mancuernas', 'banco'], compuesto: true,
    desc: 'Mancuernas a los lados del pecho con los codos a unos 45°. Empuja hacia arriba juntándolas ligeramente.' },
  { id: 'press-maquina', nombre: 'Press de pecho en máquina', patron: 'empuje_h', musculos: ['pecho', 'triceps'], equipo: ['maquinas'], compuesto: true,
    desc: 'Ajusta el asiento para que las asas queden a la altura del pecho. Empuja sin despegar la espalda y vuelve controlando.' },
  { id: 'flexiones', nombre: 'Flexiones', patron: 'empuje_h', musculos: ['pecho', 'triceps', 'hombros'], equipo: [], compuesto: true,
    desc: 'Manos algo más abiertas que los hombros y cuerpo en línea recta. Baja hasta casi tocar el suelo con el pecho. Si cuestan, apoya las rodillas o las manos en un lugar elevado.' },
  { id: 'flexiones-bandas', nombre: 'Press de pecho con banda', patron: 'empuje_h', musculos: ['pecho', 'triceps'], equipo: ['bandas'], compuesto: true,
    desc: 'Banda anclada a la espalda. Empuja hacia delante hasta extender los brazos y vuelve despacio.' },

  // Empuje vertical
  { id: 'press-militar', nombre: 'Press militar con barra', patron: 'empuje_v', musculos: ['hombros', 'triceps'], equipo: ['barra'], compuesto: true,
    desc: 'De pie, glúteos y abdomen apretados. Empuja la barra desde la clavícula hasta encima de la cabeza, metiendo la cabeza bajo la barra al final.' },
  { id: 'press-hombro-mancuernas', nombre: 'Press de hombros con mancuernas', patron: 'empuje_v', musculos: ['hombros', 'triceps'], equipo: ['mancuernas'], compuesto: true,
    desc: 'Sentado o de pie, mancuernas a la altura de las orejas. Empuja hacia arriba sin arquear la zona lumbar.' },
  { id: 'press-hombro-maquina', nombre: 'Press de hombros en máquina', patron: 'empuje_v', musculos: ['hombros', 'triceps'], equipo: ['maquinas'], compuesto: true,
    desc: 'Asas a la altura de los hombros. Empuja hacia arriba y baja controlando.' },
  { id: 'pike', nombre: 'Flexiones pike', patron: 'empuje_v', musculos: ['hombros', 'triceps'], equipo: [], compuesto: true,
    desc: 'Cadera alta formando una V invertida. Flexiona los codos llevando la cabeza hacia el suelo entre las manos y empuja.' },
  { id: 'press-hombro-bandas', nombre: 'Press de hombros con banda', patron: 'empuje_v', musculos: ['hombros', 'triceps'], equipo: ['bandas'], compuesto: true,
    desc: 'Pisa la banda y empuja los extremos desde los hombros hasta arriba.' },

  // Tirón horizontal
  { id: 'remo-barra', nombre: 'Remo con barra', patron: 'tiron_h', musculos: ['espalda', 'biceps'], equipo: ['barra'], compuesto: true,
    desc: 'Torso inclinado unos 45° con la espalda neutra. Tira de la barra hacia el ombligo juntando las escápulas.' },
  { id: 'remo-mancuerna', nombre: 'Remo con mancuerna a una mano', patron: 'tiron_h', musculos: ['espalda', 'biceps'], equipo: ['mancuernas'], compuesto: true,
    desc: 'Rodilla y mano apoyadas en un banco o silla. Tira de la mancuerna hacia la cadera con el codo pegado.' },
  { id: 'remo-polea', nombre: 'Remo sentado en polea', patron: 'tiron_h', musculos: ['espalda', 'biceps'], equipo: ['polea'], compuesto: true,
    desc: 'Espalda recta. Tira del agarre hacia el abdomen llevando los codos atrás y vuelve estirando sin encorvarte.' },
  { id: 'remo-maquina', nombre: 'Remo en máquina', patron: 'tiron_h', musculos: ['espalda', 'biceps'], equipo: ['maquinas'], compuesto: true,
    desc: 'Pecho apoyado en el respaldo. Tira de las asas juntando las escápulas.' },
  { id: 'remo-bandas', nombre: 'Remo con banda', patron: 'tiron_h', musculos: ['espalda', 'biceps'], equipo: ['bandas'], compuesto: true,
    desc: 'Banda anclada delante a la altura del pecho. Tira hacia el abdomen juntando las escápulas.' },
  { id: 'remo-invertido', nombre: 'Remo invertido bajo mesa', patron: 'tiron_h', musculos: ['espalda', 'biceps'], equipo: [], compuesto: true,
    desc: 'Túmbate bajo una mesa robusta y agárrate al borde. Con el cuerpo recto, tira del pecho hacia la mesa. Asegúrate de que la mesa no vuelca.' },

  // Tirón vertical
  { id: 'dominadas', nombre: 'Dominadas', patron: 'tiron_v', musculos: ['espalda', 'biceps'], equipo: ['dominadas'], compuesto: true,
    desc: 'Agarre algo más ancho que los hombros. Tira hasta pasar la barbilla por encima de la barra y baja hasta extender los brazos. Si no puedes, haz solo la bajada en 4 segundos.' },
  { id: 'jalon', nombre: 'Jalón al pecho', patron: 'tiron_v', musculos: ['espalda', 'biceps'], equipo: ['polea'], compuesto: true,
    desc: 'Tira de la barra hacia la parte alta del pecho llevando los codos hacia abajo y atrás, sin balancearte.' },
  { id: 'jalon-bandas', nombre: 'Jalón con banda', patron: 'tiron_v', musculos: ['espalda', 'biceps'], equipo: ['bandas'], compuesto: true,
    desc: 'Banda anclada en alto. De rodillas, tira hacia el pecho llevando los codos a los costados.' },
  { id: 'pullover-mancuerna', nombre: 'Pullover con mancuerna', patron: 'tiron_v', musculos: ['espalda', 'pecho'], equipo: ['mancuernas'], compuesto: false,
    desc: 'Tumbado con una mancuerna sobre el pecho. Llévala detrás de la cabeza con los brazos casi rectos y vuelve.' },
  { id: 'superman', nombre: 'Superman en el suelo', patron: 'tiron_v', musculos: ['espalda'], equipo: [], compuesto: false,
    desc: 'Boca abajo, brazos en Y. Eleva pecho y brazos del suelo apretando la espalda y lleva los codos hacia las costillas.' },

  // Aislamiento pierna
  { id: 'extension-cuadriceps', nombre: 'Extensión de cuádriceps', patron: 'cuadriceps_aisl', musculos: ['cuadriceps'], equipo: ['maquinas'], compuesto: false,
    desc: 'Extiende las rodillas por completo, aprieta 1 segundo y baja controlando.' },
  { id: 'sentadilla-pared', nombre: 'Sentadilla isométrica en pared', patron: 'cuadriceps_aisl', musculos: ['cuadriceps'], equipo: [], compuesto: false, tipo: 'tiempo',
    desc: 'Espalda contra la pared y rodillas a 90°. Aguanta la posición.' },
  { id: 'curl-femoral', nombre: 'Curl femoral en máquina', patron: 'femoral', musculos: ['femorales'], equipo: ['maquinas'], compuesto: false,
    desc: 'Flexiona las rodillas llevando los talones hacia los glúteos y vuelve despacio.' },
  { id: 'curl-femoral-fitball', nombre: 'Curl femoral deslizante', patron: 'femoral', musculos: ['femorales'], equipo: [], compuesto: false,
    desc: 'Boca arriba con los talones sobre una toalla en suelo liso. Eleva la cadera y desliza los talones hacia ti y lejos.' },
  { id: 'gemelos-pie', nombre: 'Elevación de gemelos de pie', patron: 'gemelo', musculos: ['gemelos'], equipo: [], compuesto: false,
    desc: 'Puntas sobre un escalón. Sube lo más alto posible, pausa y baja estirando los talones por debajo del escalón. Sujeta mancuernas para añadir carga.' },
  { id: 'gemelos-maquina', nombre: 'Elevación de gemelos en máquina', patron: 'gemelo', musculos: ['gemelos'], equipo: ['maquinas'], compuesto: false,
    desc: 'Recorrido completo: estira abajo y sube al máximo con pausa arriba.' },

  // Aislamiento tren superior
  { id: 'aperturas-mancuernas', nombre: 'Aperturas con mancuernas', patron: 'pecho_aisl', musculos: ['pecho'], equipo: ['mancuernas', 'banco'], compuesto: false,
    desc: 'Codos ligeramente flexionados. Abre los brazos hasta notar estiramiento en el pecho y vuelve como si abrazaras un árbol.' },
  { id: 'cruce-poleas', nombre: 'Cruce de poleas', patron: 'pecho_aisl', musculos: ['pecho'], equipo: ['polea'], compuesto: false,
    desc: 'Lleva las manos desde los lados hacia el frente del pecho con los codos fijos.' },
  { id: 'flexiones-diamante', nombre: 'Flexiones cerradas', patron: 'pecho_aisl', musculos: ['pecho', 'triceps'], equipo: [], compuesto: false,
    desc: 'Manos juntas bajo el pecho. Baja con los codos pegados al cuerpo.' },
  { id: 'elevaciones-laterales', nombre: 'Elevaciones laterales', patron: 'hombro_lat', musculos: ['hombros'], equipo: ['mancuernas'], compuesto: false,
    desc: 'Eleva las mancuernas hacia los lados hasta la altura de los hombros con los codos algo flexionados.' },
  { id: 'laterales-polea', nombre: 'Elevación lateral en polea', patron: 'hombro_lat', musculos: ['hombros'], equipo: ['polea'], compuesto: false,
    desc: 'Polea baja, de lado. Eleva el brazo hasta la altura del hombro.' },
  { id: 'laterales-bandas', nombre: 'Elevaciones laterales con banda', patron: 'hombro_lat', musculos: ['hombros'], equipo: ['bandas'], compuesto: false,
    desc: 'Pisa la banda y eleva los brazos hacia los lados.' },
  { id: 'curl-barra', nombre: 'Curl de bíceps con barra', patron: 'biceps', musculos: ['biceps'], equipo: ['barra'], compuesto: false,
    desc: 'Codos pegados al cuerpo. Flexiona sin balancear y baja controlando.' },
  { id: 'curl-mancuernas', nombre: 'Curl de bíceps con mancuernas', patron: 'biceps', musculos: ['biceps'], equipo: ['mancuernas'], compuesto: false,
    desc: 'Alterna o a la vez, girando las palmas hacia arriba al subir.' },
  { id: 'curl-polea', nombre: 'Curl de bíceps en polea', patron: 'biceps', musculos: ['biceps'], equipo: ['polea'], compuesto: false,
    desc: 'Polea baja. Flexiona los codos manteniéndolos fijos.' },
  { id: 'curl-bandas', nombre: 'Curl de bíceps con banda', patron: 'biceps', musculos: ['biceps'], equipo: ['bandas'], compuesto: false,
    desc: 'Pisa la banda y flexiona los codos.' },
  { id: 'curl-toalla', nombre: 'Curl isométrico con toalla', patron: 'biceps', musculos: ['biceps'], equipo: [], compuesto: false, tipo: 'tiempo',
    desc: 'Pisa una toalla y tira de ella con los codos a 90° con toda tu fuerza. Aguanta.' },
  { id: 'extension-triceps-polea', nombre: 'Extensión de tríceps en polea', patron: 'triceps', musculos: ['triceps'], equipo: ['polea'], compuesto: false,
    desc: 'Codos pegados. Extiende los brazos hacia abajo por completo.' },
  { id: 'press-frances', nombre: 'Extensión de tríceps con mancuerna', patron: 'triceps', musculos: ['triceps'], equipo: ['mancuernas'], compuesto: false,
    desc: 'Mancuerna sobre la cabeza con ambas manos. Baja detrás de la nuca flexionando solo los codos.' },
  { id: 'fondos-banco', nombre: 'Fondos en banco o silla', patron: 'triceps', musculos: ['triceps'], equipo: [], compuesto: false,
    desc: 'Manos en el borde de una silla estable. Baja flexionando los codos hacia atrás hasta 90°.' },
  { id: 'triceps-bandas', nombre: 'Extensión de tríceps con banda', patron: 'triceps', musculos: ['triceps'], equipo: ['bandas'], compuesto: false,
    desc: 'Banda anclada en alto. Extiende los codos hacia abajo.' },
  { id: 'face-pull', nombre: 'Face pull', patron: 'hombro_post', musculos: ['hombros', 'espalda'], equipo: ['polea'], compuesto: false,
    desc: 'Cuerda a la altura de la cara. Tira hacia la frente separando las manos y llevando los codos altos.' },
  { id: 'pajaro', nombre: 'Pájaros con mancuernas', patron: 'hombro_post', musculos: ['hombros', 'espalda'], equipo: ['mancuernas'], compuesto: false,
    desc: 'Torso inclinado. Abre los brazos hacia los lados juntando las escápulas.' },
  { id: 'aperturas-bandas', nombre: 'Aperturas posteriores con banda', patron: 'hombro_post', musculos: ['hombros', 'espalda'], equipo: ['bandas'], compuesto: false,
    desc: 'Banda delante con los brazos extendidos. Ábrela hasta tocar el pecho.' },
  { id: 'ytw', nombre: 'Elevaciones Y-T-W boca abajo', patron: 'hombro_post', musculos: ['hombros', 'espalda'], equipo: [], compuesto: false,
    desc: 'Boca abajo, eleva los brazos formando una Y, luego una T y luego una W. Eso es una repetición.' },

  // Core
  { id: 'plancha', nombre: 'Plancha', patron: 'core', musculos: ['abdomen'], equipo: [], compuesto: false, tipo: 'tiempo',
    desc: 'Antebrazos en el suelo, cuerpo recto de la cabeza a los talones. Aprieta abdomen y glúteos.' },
  { id: 'dead-bug', nombre: 'Dead bug', patron: 'core', musculos: ['abdomen'], equipo: [], compuesto: false,
    desc: 'Boca arriba con brazos y piernas en el aire. Extiende brazo y pierna contrarios sin despegar la zona lumbar del suelo.' },
  { id: 'elevacion-piernas', nombre: 'Elevación de piernas colgado', patron: 'core', musculos: ['abdomen'], equipo: ['dominadas'], compuesto: false, nivelMin: 'intermedio',
    desc: 'Colgado de la barra, eleva las rodillas o las piernas rectas sin balancearte.' },
  { id: 'crunch-polea', nombre: 'Crunch en polea', patron: 'core', musculos: ['abdomen'], equipo: ['polea'], compuesto: false,
    desc: 'De rodillas con la cuerda junto a la cabeza. Flexiona el tronco llevando los codos a los muslos.' },
  { id: 'plancha-lateral', nombre: 'Plancha lateral', patron: 'core', musculos: ['abdomen'], equipo: [], compuesto: false, tipo: 'tiempo',
    desc: 'Apoyado en un antebrazo y el lateral del pie, cadera alta. Cambia de lado a mitad de tiempo.' },

  // Cardio metabólico (para pérdida de peso)
  { id: 'burpees', nombre: 'Burpees', patron: 'metabolico', musculos: ['cuadriceps', 'pecho'], equipo: [], compuesto: true,
    desc: 'Agáchate, lleva los pies atrás a plancha, vuelve y salta con los brazos arriba.' },
  { id: 'escaladores', nombre: 'Escaladores', patron: 'metabolico', musculos: ['abdomen', 'cuadriceps'], equipo: [], compuesto: false, tipo: 'tiempo',
    desc: 'En plancha alta, lleva las rodillas al pecho alternando a ritmo rápido.' },
  { id: 'jumping-jacks', nombre: 'Saltos de tijera', patron: 'metabolico', musculos: ['gemelos'], equipo: [], compuesto: false, tipo: 'tiempo',
    desc: 'Salta abriendo piernas y brazos y vuelve a cerrar. Ritmo constante.' },

  // ---- Máquinas guiadas (Technogym Selection 900 / Pure Strength) ----
  { id: 'prensa-horizontal', nombre: 'Prensa horizontal', patron: 'sentadilla', musculos: ['cuadriceps', 'gluteos'], equipo: ['maquinas'], compuesto: true,
    desc: 'Pies en el centro de la plataforma. Baja hasta unos 90° de rodilla sin despegar la zona lumbar del respaldo y empuja sin bloquear las rodillas.' },
  { id: 'hack-squat', nombre: 'Hack squat', patron: 'sentadilla', musculos: ['cuadriceps', 'gluteos'], equipo: ['maquinas'], compuesto: true,
    desc: 'Espalda y hombros apoyados. Baja controlando hasta que los muslos queden paralelos y empuja con todo el pie.' },
  { id: 'hip-thrust-maquina', nombre: 'Hip thrust en máquina', patron: 'bisagra', musculos: ['gluteos', 'femorales'], equipo: ['maquinas'], compuesto: true,
    desc: 'Espalda alta en el respaldo y almohadilla sobre la cadera. Extiende la cadera apretando glúteos sin arquear la lumbar.' },
  { id: 'abductores-maquina', nombre: 'Abductores en máquina', patron: 'gluteos_aisl', musculos: ['gluteos'], equipo: ['maquinas'], compuesto: false,
    desc: 'Sentado con las piernas en las almohadillas. Abre las piernas contra la resistencia y vuelve despacio.' },
  { id: 'aductores-maquina', nombre: 'Aductores en máquina', patron: 'gluteos_aisl', musculos: ['gluteos'], equipo: ['maquinas'], compuesto: false,
    desc: 'Sentado con las piernas abiertas. Cierra las piernas contra la resistencia y vuelve controlando.' },
  { id: 'patada-gluteo', nombre: 'Patada de glúteo en máquina', patron: 'gluteos_aisl', musculos: ['gluteos'], equipo: ['maquinas'], compuesto: false,
    desc: 'Apoyado en la máquina, empuja la pierna hacia atrás hasta extender la cadera. Aprieta el glúteo arriba.' },
  { id: 'pec-deck', nombre: 'Aperturas en máquina (pec deck)', patron: 'pecho_aisl', musculos: ['pecho'], equipo: ['maquinas'], compuesto: false,
    desc: 'Codos a la altura del pecho. Junta los brazos al frente apretando el pecho y vuelve controlando el estiramiento.' },
  { id: 'press-inclinado-maquina', nombre: 'Press inclinado en máquina', patron: 'empuje_h', musculos: ['pecho', 'hombros', 'triceps'], equipo: ['maquinas'], compuesto: true,
    desc: 'Asiento bajo para empujar en diagonal. Escápulas juntas y recorrido completo.' },
  { id: 'pullover-maquina', nombre: 'Pullover en máquina', patron: 'tiron_v', musculos: ['espalda', 'pecho'], equipo: ['maquinas'], compuesto: false,
    desc: 'Codos sobre la almohadilla. Baja los brazos en arco hasta las caderas llevando los codos al cuerpo.' },
  { id: 'remo-alto-maquina', nombre: 'Remo al cuello en máquina', patron: 'hombro_post', musculos: ['hombros', 'espalda'], equipo: ['maquinas'], compuesto: false,
    desc: 'Asas altas. Tira llevando los codos hacia fuera y arriba, juntando las escápulas.' },
  { id: 'curl-biceps-maquina', nombre: 'Curl de bíceps en máquina', patron: 'biceps', musculos: ['biceps'], equipo: ['maquinas'], compuesto: false,
    desc: 'Codos apoyados en la almohadilla. Flexiona sin mover los hombros y baja controlando.' },
  { id: 'extension-triceps-maquina', nombre: 'Extensión de tríceps en máquina', patron: 'triceps', musculos: ['triceps'], equipo: ['maquinas'], compuesto: false,
    desc: 'Codos fijos. Extiende los brazos por completo y vuelve despacio sin mover los hombros.' },
  { id: 'gemelos-sentado', nombre: 'Gemelos sentado en máquina', patron: 'gemelo', musculos: ['gemelos'], equipo: ['maquinas'], compuesto: false,
    desc: 'Rodillas bajo la almohadilla y puntas en la plataforma. Estira abajo y sube al máximo con pausa.' },
  { id: 'crunch-maquina', nombre: 'Crunch en máquina', patron: 'core', musculos: ['abdomen'], equipo: ['maquinas'], compuesto: false,
    desc: 'Sujeto con los brazos y los pies fijos. Flexiona el tronco llevando el esternón hacia la pelvis.' },
];

export const PATRONES = {
  sentadilla: 'Sentadilla', bisagra: 'Bisagra de cadera', zancada: 'Unilateral de pierna',
  empuje_h: 'Empuje horizontal', empuje_v: 'Empuje vertical', tiron_h: 'Tirón horizontal', tiron_v: 'Tirón vertical',
  cuadriceps_aisl: 'Cuádriceps', femoral: 'Femoral', gemelo: 'Gemelos', pecho_aisl: 'Pecho',
  hombro_lat: 'Hombro lateral', hombro_post: 'Hombro posterior', biceps: 'Bíceps', triceps: 'Tríceps',
  gluteos_aisl: 'Glúteos (aislamiento)', core: 'Core', metabolico: 'Metabólico',
};

// Copia de los ejercicios de serie. Los ejercicios propios del usuario se añaden
// después y se pueden quitar sin tocar esta base.
export const EJERCICIOS_BASE = EJERCICIOS.map(e => ({ ...e }));

export const porId = Object.fromEntries(EJERCICIOS.map(e => [e.id, e]));

// Añade (o reemplaza) los ejercicios propios del usuario. Muta EJERCICIOS y porId
// en el sitio para que los enlaces vivos de los demás módulos sigan siendo válidos.
export function sincronizarEjerciciosUsuario(propios = []) {
  for (let i = EJERCICIOS.length - 1; i >= 0; i--) {
    if (EJERCICIOS[i].propio) { delete porId[EJERCICIOS[i].id]; EJERCICIOS.splice(i, 1); }
  }
  for (const e of propios) {
    if (!e?.id || porId[e.id]) continue;
    const ej = {
      id: e.id, nombre: e.nombre, patron: e.patron, musculos: e.musculos || [],
      equipo: e.equipo || [], compuesto: Boolean(e.compuesto), desc: e.desc || '',
      tipo: e.tipo === 'tiempo' ? 'tiempo' : undefined,
      ...(e.maquinaCustom ? {
        maquinaCustom: e.maquinaCustom, lineaCustom: e.lineaCustom,
        musculoCustom: e.musculoCustom, ajusteCustom: e.ajusteCustom, videoCustom: e.videoCustom,
      } : {}),
      propio: true,
    };
    if (ej.tipo === undefined) delete ej.tipo;
    EJERCICIOS.push(ej);
    porId[ej.id] = ej;
  }
}
