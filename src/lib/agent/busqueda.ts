/**
 * Búsqueda por nombre para el asistente (Hermes): equipos y jugadores, sin distinguir mayúsculas ni tildes.
 * Son funciones puras: devuelven los candidatos y la ruta decide qué hacer si hay 0 o más de 1.
 */

/** Minúsculas, sin tildes y con espacios simples. */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Candidatos que coinciden con `consulta`. Prioridad: nombre idéntico, después nombre que contiene toda la
 * consulta, después nombre que contiene todas las palabras de la consulta (en cualquier orden).
 */
export function buscarPorNombre<T extends { name: string }>(items: T[], consulta: string): T[] {
  const q = normalizarTexto(consulta);
  if (!q) return [];

  const conNombre = items.map((item) => ({ item, nombre: normalizarTexto(item.name) }));

  const identicos = conNombre.filter((x) => x.nombre === q);
  if (identicos.length > 0) return identicos.map((x) => x.item);

  const contienen = conNombre.filter((x) => x.nombre.includes(q));
  if (contienen.length > 0) return contienen.map((x) => x.item);

  const palabras = q.split(' ');
  return conNombre.filter((x) => palabras.every((w) => x.nombre.includes(w))).map((x) => x.item);
}

/**
 * Jugadores que coinciden. Si entre los candidatos hay habilitados, se descartan los deshabilitados
 * (un jugador dado de baja no es a quien se le suele cargar un pago).
 */
export function buscarJugadores<T extends { name: string; active: boolean }>(jugadores: T[], consulta: string): T[] {
  const candidatos = buscarPorNombre(jugadores, consulta);
  const habilitados = candidatos.filter((j) => j.active);
  return habilitados.length > 0 ? habilitados : candidatos;
}
