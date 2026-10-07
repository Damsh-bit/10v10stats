// Modo liviano: el botón de la navbar apaga las animaciones de todo el sitio.
// Fuera de los componentes cliente porque el layout (servidor) usa el script.

export const MOTION_STORAGE_KEY = 'animaciones'
export const MOTION_CHANGE_EVENT = 'animaciones-change'

/** Script para el <head>: marca <html> antes del primer pintado, así no arranca ninguna animación. */
export const motionPreferenceScript = `try{if(localStorage.getItem(${JSON.stringify(MOTION_STORAGE_KEY)})==='off')document.documentElement.dataset.motion='off'}catch(e){}`

/** En el servidor siempre da false: la preferencia vive en el navegador. */
export function isMotionOff() {
  return typeof document !== 'undefined' && document.documentElement.dataset.motion === 'off'
}
