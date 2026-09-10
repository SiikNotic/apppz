// Token de Mapbox — DEBE ser el token PÚBLICO de la cuenta (prefijo
// pk.), nunca uno secreto (sk.): Mapbox diseña el público para vivir en
// el navegador (solo lee mapas/estilos/geocoding), mientras que un
// secreto puede administrar la cuenta y jamás debe exponerse ahí.
//
// No se hardcodea el valor acá — GitHub Push Protection bloqueó un
// intento anterior de commitear el token literal, clasificándolo como
// "Mapbox Secret Access Token" pese al prefijo pk., así que la decisión
// de aceptar ese riesgo le corresponde al dueño de la cuenta, no a este
// commit. Se lee en runtime desde NEXT_PUBLIC_MAPBOX_TOKEN, que debe
// configurarse como Repository variable en GitHub (Settings → Secrets
// and variables → Actions → Variables → NEXT_PUBLIC_MAPBOX_TOKEN) para
// que el build de CI la tenga disponible — ver .github/workflows/*.yml.
export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

export const MAPBOX_STYLE = 'mapbox://styles/mapbox/streets-v12'
