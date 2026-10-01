import { createHash, createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { getAdminKey, getSessionSecret } from './config'

/**
 * Identidad para apostar, sin cuentas ni mails: cada jugador tiene un PIN que
 * le arma el admin. Al entrar se guarda una cookie httpOnly firmada con
 * APUESTAS_SESSION_SECRET ("<player_id>.<vence>.<firma>"), así nadie puede
 * apostar ni aceptar un duelo en nombre de otro.
 */

export const COOKIE_SESION = 'apuestas_sesion'
export const DURACION_SESION_SEG = 30 * 24 * 60 * 60
/** Después de esta cantidad de PINs mal puestos, el jugador queda bloqueado un rato. */
export const MAX_INTENTOS_PIN = 5
export const BLOQUEO_PIN_MIN = 15

const PIN_REGEX = /^\d{4,8}$/

function scrypt(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, 32, (error, key) => (error ? reject(error) : resolve(key)))
  })
}

export function pinValido(pin: unknown): pin is string {
  return typeof pin === 'string' && PIN_REGEX.test(pin)
}

export async function hashPin(pin: string) {
  const salt = randomBytes(16)
  const hash = await scrypt(pin, salt)
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`
}

export async function verificarPin(pin: string, guardado: string) {
  const [algoritmo, saltB64, hashB64] = guardado.split('$')
  if (algoritmo !== 'scrypt' || !saltB64 || !hashB64) return false
  const esperado = Buffer.from(hashB64, 'base64')
  const calculado = await scrypt(pin, Buffer.from(saltB64, 'base64'))
  return esperado.length === calculado.length && timingSafeEqual(esperado, calculado)
}

function firma(contenido: string, secret: string) {
  return createHmac('sha256', secret).update(contenido).digest('base64url')
}

export function firmarSesion(playerId: string) {
  const secret = getSessionSecret()
  if (!secret) throw new Error('Falta APUESTAS_SESSION_SECRET')
  const vence = Math.floor(Date.now() / 1000) + DURACION_SESION_SEG
  const contenido = `${playerId}.${vence}`
  return `${contenido}.${firma(contenido, secret)}`
}

/** Devuelve el player_id si la cookie es válida y no venció. */
export function leerSesion(valor: string | undefined | null): string | null {
  const secret = getSessionSecret()
  if (!valor || !secret) return null
  const partes = valor.split('.')
  if (partes.length !== 3) return null
  const [playerId, vence, firmaRecibida] = partes
  const esperada = Buffer.from(firma(`${playerId}.${vence}`, secret))
  const recibida = Buffer.from(firmaRecibida)
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return null
  if (!/^\d+$/.test(vence) || Number(vence) < Date.now() / 1000) return null
  return playerId
}

/** Compara la clave del admin sin filtrar por tiempo cuántos caracteres coinciden. */
export function esClaveAdmin(clave: string | null | undefined) {
  const esperada = getAdminKey()
  if (!esperada || !clave) return false
  const a = createHash('sha256').update(clave).digest()
  const b = createHash('sha256').update(esperada).digest()
  return timingSafeEqual(a, b)
}
