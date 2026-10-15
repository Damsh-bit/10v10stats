/** La clave de administrador que piden los formularios de carga (la misma de siempre). */
const CLAVE_ADMIN = 'alzhannah2026'

export function esClaveAdmin(clave: unknown) {
  return typeof clave === 'string' && clave === CLAVE_ADMIN
}
