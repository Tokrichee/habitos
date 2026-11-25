'use strict';
/* Contenido fijo de la app: categorías, biblioteca de hábitos, tips, retos y plan de crecimiento. */

const CATEGORIES = {
  salud:         { name: 'Salud',              emoji: '💪', color: '#2ed596' },
  mente:         { name: 'Mente y bienestar',  emoji: '🧘', color: '#a77bff' },
  productividad: { name: 'Productividad',      emoji: '🎯', color: '#5b8cff' },
  aprendizaje:   { name: 'Aprendizaje',        emoji: '🎓', color: '#45d4f5' },
  finanzas:      { name: 'Finanzas',           emoji: '💰', color: '#feca57' },
  relaciones:    { name: 'Relaciones',         emoji: '❤️', color: '#ff6fb5' },
  creatividad:   { name: 'Creatividad',        emoji: '🎨', color: '#ff9f43' },
  negocio:       { name: 'Negocio foto/video', emoji: '📷', color: '#ff6b6b' },
  otro:          { name: 'Otro',               emoji: '✨', color: '#8b7cff' },
};

const TIMES = {
  morning:   { name: 'Mañana',  emoji: '🌅' },
  afternoon: { name: 'Tarde',   emoji: '☀️' },
  evening:   { name: 'Noche',   emoji: '🌙' },
  any:       { name: 'En cualquier momento', emoji: '🕐' },
};

const TYPES = {
  check: { name: 'Sí / No',  hint: 'Un toque y listo.' },
  count: { name: 'Cantidad', hint: 'Sumás hasta llegar a una meta (vasos, minutos, páginas…).' },
  avoid: { name: 'Evitar',   hint: 'Algo que querés dejar: marcás cada día que lo evitaste.' },
};

const WEEKDAYS = [1, 2, 3, 4, 5];
const EVERYDAY = [0, 1, 2, 3, 4, 5, 6];

/* time: 'energy' = se ubica en el momento del día con más energía que elijas en las preguntas */
const L = (id, cat, emoji, name, o = {}) => ({
  id, cat, emoji, name, type: 'check', goal: 1, unit: '', step: 1, time: 'any',
  freq: 'days', days: EVERYDAY, perWeek: 3, note: '', ...o,
});

const HABIT_LIBRARY = [
  // Salud
  L('agua', 'salud', '💧', 'Tomar agua', { type: 'count', goal: 8, unit: 'vasos', note: 'Más energía y concentración.' }),
  L('ejercicio', 'salud', '🏃', 'Hacer ejercicio', { time: 'energy', freq: 'weekly', perWeek: 3, note: 'Cuerpo fuerte, cabeza clara.' }),
  L('caminar', 'salud', '🚶', 'Caminar', { type: 'count', goal: 30, unit: 'minutos', step: 10 }),
  L('dormir', 'salud', '😴', 'Acostarme antes de las 00', { time: 'evening', note: 'Dormir bien es la base de todo.' }),
  L('fruta', 'salud', '🍎', 'Fruta o verdura', { type: 'count', goal: 3, unit: 'porciones' }),
  L('estirar', 'salud', '🤸', 'Estirar 10 minutos', { time: 'morning' }),
  L('nofumar', 'salud', '🚭', 'No fumar', { type: 'avoid' }),
  L('alcohol', 'salud', '🍷', 'Sin alcohol', { type: 'avoid', days: [1, 2, 3, 4] }),
  // Mente
  L('meditar', 'mente', '🧘', 'Meditar', { type: 'count', goal: 10, unit: 'minutos', step: 5, time: 'morning' }),
  L('gratitud', 'mente', '✍️', 'Escribir 3 cosas buenas del día', { time: 'evening' }),
  L('celular', 'mente', '📵', 'Sin celular la primera hora', { type: 'avoid', time: 'morning' }),
  L('leer', 'mente', '📚', 'Leer', { type: 'count', goal: 20, unit: 'páginas', step: 5, time: 'evening' }),
  L('aire', 'mente', '🌳', 'Salir al aire libre', { time: 'afternoon' }),
  // Productividad
  L('planificar', 'productividad', '🗓️', 'Planificar el día', { time: 'morning', days: WEEKDAYS, note: 'Saber qué es lo importante antes de empezar.' }),
  L('foco', 'productividad', '🎯', 'Bloque de foco de 90 min', { time: 'energy', days: WEEKDAYS }),
  L('inbox', 'productividad', '📥', 'Mensajes y mails al día', { time: 'afternoon', days: WEEKDAYS }),
  L('orden', 'productividad', '🧹', 'Ordenar el espacio de trabajo', { time: 'evening' }),
  // Aprendizaje
  L('curso', 'aprendizaje', '🎓', 'Estudiar / curso online', { type: 'count', goal: 30, unit: 'minutos', step: 10, freq: 'weekly', perWeek: 4 }),
  L('ingles', 'aprendizaje', '🗣️', 'Practicar inglés', { type: 'count', goal: 15, unit: 'minutos', step: 5 }),
  L('tutorial', 'aprendizaje', '▶️', 'Ver un tutorial y practicarlo', { freq: 'weekly', perWeek: 2 }),
  // Finanzas
  L('anotar', 'finanzas', '💸', 'Anotar gastos del día', { time: 'evening', note: 'Lo que se mide se puede mejorar.' }),
  L('sincompras', 'finanzas', '🛑', 'Día sin compras innecesarias', { type: 'avoid' }),
  L('presupuesto', 'finanzas', '🐷', 'Revisar mis números de la semana', { freq: 'weekly', perWeek: 1 }),
  // Relaciones
  L('llamar', 'relaciones', '📞', 'Llamar a un amigo o familiar', { freq: 'weekly', perWeek: 2 }),
  L('calidad', 'relaciones', '❤️', 'Tiempo de calidad sin pantallas', { time: 'evening' }),
  // Creatividad
  L('fotodia', 'creatividad', '📷', 'Una foto con intención', { note: 'Entrenar el ojo todos los días.' }),
  L('referentes', 'creatividad', '🖼️', 'Mirar trabajo de un referente', { type: 'count', goal: 15, unit: 'minutos', step: 5 }),
  L('ideas', 'creatividad', '💡', 'Anotar ideas creativas', { type: 'count', goal: 3, unit: 'ideas' }),
  L('personal', 'creatividad', '🎨', 'Proyecto personal', { time: 'energy', freq: 'weekly', perWeek: 2, note: 'Donde aparece tu estilo.' }),
  L('cine', 'creatividad', '🎬', 'Ver una peli analizando la fotografía', { time: 'evening', freq: 'weekly', perWeek: 1 }),
  // Negocio
  L('publicar', 'negocio', '📲', 'Publicar contenido en redes', { freq: 'weekly', perWeek: 3, note: 'Constancia antes que perfección.' }),
  L('contactar', 'negocio', '🤝', 'Contactar clientes potenciales', { type: 'count', goal: 2, unit: 'contactos', days: WEEKDAYS }),
  L('editar', 'negocio', '⏱️', 'Editar 2 h sin distracciones', { time: 'energy', days: WEEKDAYS }),
  L('responder', 'negocio', '💬', 'Responder consultas en el día', { time: 'afternoon', days: WEEKDAYS }),
  L('backup', 'negocio', '💾', 'Backup del material', { freq: 'weekly', perWeek: 1 }),
  L('portfolio', 'negocio', '🗂️', 'Mejorar el portfolio', { freq: 'weekly', perWeek: 1 }),
  L('tecnica', 'negocio', '🎥', 'Practicar una técnica nueva', { freq: 'weekly', perWeek: 2 }),
  L('numeros', 'negocio', '📊', 'Revisar números del negocio', { freq: 'weekly', perWeek: 1 }),
];

const BIZ_STAGES = {
  inicio:      { name: 'Recién empiezo',               desc: 'Armando portfolio y buscando primeros clientes.' },
  ocasional:   { name: 'Tengo clientes ocasionales',   desc: 'Hay trabajos, pero no son constantes.' },
  profesional: { name: 'Vivo de esto',                 desc: 'Es mi trabajo principal y quiero crecer.' },
};

const SPECIALTIES = ['Bodas y eventos', 'Retratos', 'Producto y gastronomía', 'Contenido para marcas',
  'Videoclips y música', 'Inmobiliaria', 'Deportes', 'Documental y viajes'];

const ROADMAP = {
  inicio: [
    'Elegir un nicho para enfocarte (podés cambiarlo después)',
    'Armar un portfolio con tus 12–15 mejores trabajos',
    'Perfil profesional en redes con bio clara: qué hacés, para quién y cómo contactarte',
    'Hacer 3 proyectos de prueba en tu nicho para sumar material',
    'Calcular tus precios base (costos + horas + ganancia)',
    'Conseguir tus primeros 3 clientes pagos',
    'Pedir un testimonio a cada cliente',
    'Armar un sistema de backup 3-2-1',
  ],
  ocasional: [
    'Lista de precios con 3 paquetes',
    'Plantilla de presupuesto y contrato (seña, plazos, derechos de uso)',
    'Perfil de Google Business y una web o landing simple',
    'Publicar casos de clientes: problema, proceso y resultado',
    'Proceso de entrega definido: plazos, galería online y formatos',
    'Contactar 10 negocios potenciales por mes',
    'Separar las finanzas personales de las del negocio',
    'Pedir referidos a los clientes contentos',
  ],
  profesional: [
    'Revisar y subir precios al menos una vez al año',
    'Crear un servicio premium de mayor valor',
    'Delegar o tercerizar edición o asistencia',
    'Ofrecer abonos mensuales de contenido a clientes recurrentes',
    'Armar una lista de clientes para avisar novedades y promociones',
    'Alianzas con otros proveedores (agencias, wedding planners, estudios)',
    'Fondo de reserva de 3 meses de gastos',
    'Renovar equipo con plan y presupuesto, no por impulso',
  ],
};

const TIPS = [
  { cat: 'Creatividad', title: 'Limitá para crear', text: 'Elegí una sola lente fija o una sola luz para una sesión. Las restricciones te obligan a resolver distinto y aparecen ideas nuevas.' },
  { cat: 'Creatividad', title: 'Moodboard antes de producir', text: 'Juntá 10–15 referencias (cine, pintura, revistas) antes de cada proyecto. Llegás con un lenguaje visual claro y el cliente ve que hay intención.' },
  { cat: 'Creatividad', title: 'Copiá para aprender', text: 'Recreá una foto o un plano de alguien que admirás, solo para vos. Entender cómo se hizo (luz, lente, posición) te da herramientas propias.' },
  { cat: 'Creatividad', title: 'Mirá fuera de tu rubro', text: 'Arquitectura, moda, pintura, diseño gráfico: muchas de las mejores ideas visuales vienen de otra disciplina.' },
  { cat: 'Creatividad', title: 'Proyecto personal sin cliente', text: 'Reservá tiempo cada mes para algo que nadie te pidió. Es donde aparece tu estilo, y suele ser lo que después te contratan.' },
  { cat: 'Creatividad', title: 'Cuaderno de ideas', text: 'Anotá cada idea apenas aparece, aunque parezca mala. Revisalas una vez por semana: muchas se combinan entre sí.' },
  { cat: 'Creatividad', title: 'Tres alturas', text: 'Antes de disparar probá tres puntos de vista: desde el piso, a la altura de los ojos y desde arriba. Casi siempre uno sorprende.' },
  { cat: 'Creatividad', title: 'La luz primero', text: 'Antes de pensar en el encuadre, mirá de dónde viene la luz y qué hace en la escena. La luz decide el clima de la imagen.' },
  { cat: 'Creatividad', title: 'Historia en 5 tomas', text: 'Plano general, medio, detalle, reacción y cierre. Sirve en foto y en video, y hace que tus entregas cuenten algo.' },
  { cat: 'Creatividad', title: 'Paleta de color', text: 'Definí 2 o 3 colores dominantes por proyecto (vestuario, fondo, edición). La coherencia de color se nota enseguida.' },
  { cat: 'Clientes', title: 'Respondé rápido', text: 'Contestar una consulta en menos de 2 horas sube mucho las chances de cerrar. Tené respuestas armadas para las preguntas frecuentes.' },
  { cat: 'Clientes', title: 'Preguntá antes de cotizar', text: '¿Para qué lo van a usar? ¿Dónde se publica? ¿Para cuándo? Cotizar con contexto te permite cobrar por el valor y no solo por las horas.' },
  { cat: 'Clientes', title: 'Siempre con seña', text: 'Reservá fechas solo con seña (30–50%). Te protege de cancelaciones y filtra a los clientes poco serios.' },
  { cat: 'Clientes', title: 'Un extra que no esperaban', text: 'Una foto de más, un clip vertical para redes o entregar antes de lo prometido. Ese detalle es lo que hace que te recomienden.' },
  { cat: 'Clientes', title: 'Pedí la reseña en el momento justo', text: 'Cuando el cliente te agradece la entrega, pedile la reseña ahí mismo, con el link listo para que tarde 30 segundos.' },
  { cat: 'Clientes', title: 'Hacé seguimiento', text: 'Si un presupuesto no tuvo respuesta, escribí a los 3 días y otra vez a la semana. Muchos trabajos se cierran en el segundo mensaje.' },
  { cat: 'Marketing', title: 'Mostrá el detrás de escena', text: 'El proceso genera más confianza que el resultado solo. Un clip del set puede rendir tanto como la foto final.' },
  { cat: 'Marketing', title: 'Hablale a un cliente ideal', text: 'Escribí cada posteo pensando en una persona concreta, por ejemplo "marca de ropa chica que lanza colección". El mensaje se vuelve más claro.' },
  { cat: 'Marketing', title: 'Constancia antes que perfección', text: 'Tres publicaciones por semana sostenidas rinden más que diez un mes y nada el siguiente. Prepará el contenido en tandas.' },
  { cat: 'Marketing', title: 'Casos, no solo fotos', text: 'Contá el problema del cliente, qué hiciste y el resultado. Así vendés soluciones, no imágenes sueltas.' },
  { cat: 'Marketing', title: 'Colaborá', text: 'Hacé proyectos con maquilladores, estilistas, modelos o marcas locales. Se comparten audiencias y todos suman portfolio.' },
  { cat: 'Marketing', title: 'Perfil de Google', text: 'Un perfil de empresa completo, con fotos y reseñas, te hace aparecer cuando alguien busca "fotógrafo en [tu ciudad]".' },
  { cat: 'Precios', title: 'Calculá tu costo real', text: 'Sumá gastos fijos, desgaste del equipo, horas de edición e impuestos, y dividí por los trabajos del mes. Ese es tu piso: nunca cobres menos.' },
  { cat: 'Precios', title: 'Tres paquetes', text: 'Básico, recomendado y premium. La mayoría elige el del medio, y el premium hace que el recomendado parezca razonable.' },
  { cat: 'Precios', title: 'No cobres solo el rodaje', text: 'Tu precio incluye preproducción, edición, entregas y experiencia. Dejalo explícito en el presupuesto.' },
  { cat: 'Precios', title: 'Derechos de uso', text: 'No es lo mismo una foto para redes que para publicidad paga o vía pública. Cobrá distinto según el uso.' },
  { cat: 'Precios', title: 'Subí precios cuando mejorás', text: 'Si la agenda se llena o tu portfolio dio un salto, ajustá precios para los clientes nuevos.' },
  { cat: 'Técnica', title: 'Una luz antes que dos', text: 'Aprendé todo lo que puede hacer una sola fuente (dura, difusa, rebotada) antes de comprar más equipo.' },
  { cat: 'Técnica', title: 'El audio importa', text: 'El público perdona una imagen imperfecta, pero no un mal sonido. Un buen micrófono vale más que otra cámara.' },
  { cat: 'Técnica', title: 'Exposición consistente', text: 'Usá histograma y cebra, y en video fijá el balance de blancos manual para que el color no salte entre tomas.' },
  { cat: 'Técnica', title: 'Elegí sin piedad', text: 'Entregar 40 fotos excelentes vale más que 200 correctas. La selección también es parte de tu estilo.' },
  { cat: 'Técnica', title: 'Presets propios', text: 'Armá tus presets o LUTs base: tu trabajo gana identidad y editás mucho más rápido.' },
  { cat: 'Organización', title: 'Backup 3-2-1', text: 'Tres copias, en dos soportes distintos, una fuera de casa o en la nube. Perder material de un cliente es lo peor que puede pasar.' },
  { cat: 'Organización', title: 'Plantillas para todo', text: 'Presupuesto, contrato, mail de entrega, checklist de equipo. Ahorrás horas y te ves más profesional.' },
  { cat: 'Organización', title: 'Editá en bloques', text: 'Bloques de 90 minutos sin notificaciones rinden el doble que editar entre mensajes.' },
  { cat: 'Organización', title: 'Revisión mensual', text: 'Una vez por mes mirá cuánto facturaste, cuánto gastaste y qué tipo de trabajo dejó más ganancia. Hacé más de ese.' },
  { cat: 'Organización', title: 'Checklist la noche anterior', text: 'Baterías cargadas, tarjetas formateadas, lentes limpios. Cinco minutos que evitan un mal día de rodaje.' },
  { cat: 'Portfolio', title: 'Mostrá lo que querés hacer', text: 'Tu portfolio atrae lo que muestra. Incluí solo el tipo de trabajo que querés que te contraten.' },
  { cat: 'Portfolio', title: 'Renovalo cada trimestre', text: 'Sacá lo más viejo y sumá lo mejor reciente. Un portfolio vivo muestra que estás activo.' },
];

const CHALLENGES = [
  'Hacé 20 fotos de un mismo objeto, todas distintas.',
  'Un día entero solo con una lente fija (o sin usar zoom en el celular).',
  'Filmá un video de 30 segundos usando solo luz de ventana.',
  'Contá una historia en 5 fotos sin que aparezcan personas.',
  'Fotografiá algo cotidiano como si fuera una campaña de lujo.',
  'Editá una misma foto en 3 estilos distintos y elegí cuál te representa.',
  'Recreá una escena de una película que te guste con lo que tengas a mano.',
  'Salí a fotografiar solo sombras y reflejos.',
  'Hacé el retrato de alguien que no conocés (con su permiso).',
  'Grabá un clip donde la cámara nunca quede quieta.',
  'Fotografiá un mismo lugar a la mañana, a la tarde y a la noche.',
  'Hacé un video vertical de 15 segundos con 8 cortes al ritmo de una canción.',
  'Usá un solo color dominante en todas las fotos del día.',
  'Hacé una sesión de producto con objetos que cuesten menos que un café.',
  'Fotografiá manos: 10 fotos que cuenten 10 oficios o emociones.',
  'Grabá un mini documental de 1 minuto sobre alguien de tu barrio.',
  'Hacé 10 fotos tomadas desde el piso.',
  'Analizá 5 trabajos de un fotógrafo o director que admires: luz, lente y color.',
  'Publicá un detrás de escena de tu último trabajo.',
  'Probá una técnica nueva: larga exposición, doble exposición, hyperlapse o stop motion.',
];

const CURRENCIES = ['ARS', 'USD', 'EUR', 'UYU', 'CLP', 'MXN', 'COP', 'PEN'];

const FIN_CATS = {
  ingreso: ['Fotografía', 'Video', 'Sueldo', 'Ventas', 'Inversiones', 'Otro'],
  gasto:   ['Comida', 'Supermercado', 'Transporte', 'Salidas', 'Compras', 'Salud', 'Otro'],
  egreso:  ['Alquiler', 'Servicios', 'Impuestos', 'Equipo', 'Software', 'Marketing', 'Ahorro', 'Otro'],
};
const FIN_CAT_EMOJI = {
  'Fotografía': '📷', 'Video': '🎥', 'Sueldo': '💼', 'Ventas': '🛍️', 'Inversiones': '📈',
  'Comida': '🍔', 'Supermercado': '🛒', 'Transporte': '🚕', 'Salidas': '🍻', 'Compras': '🛍️', 'Salud': '💊',
  'Alquiler': '🏠', 'Servicios': '💡', 'Impuestos': '🧾', 'Equipo': '📸', 'Software': '💻', 'Marketing': '📣',
  'Ahorro': '🐷', 'Otro': '•',
};
const FIN_TYPES = {
  ingreso: { name: 'Ingreso', hint: 'Plata que entra.' },
  gasto:   { name: 'Gasto',   hint: 'Consumo del día a día: comida, transporte, salidas.' },
  egreso:  { name: 'Egreso',  hint: 'Pagos fijos o grandes: alquiler, servicios, impuestos, equipo.' },
};
