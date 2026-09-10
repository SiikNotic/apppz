// Emoji por categoría — mismo tratamiento que la referencia (🍔 Burger,
// 🍕 Pizza, 🌭 Sandwich) dentro de cada píldora de categoría. Las
// categorías las escribe el staff libremente (tabla `categories`), así
// que esto es un mapeo por palabra clave sobre el nombre real, no un
// campo nuevo en la base de datos — con un genérico de respaldo para
// cualquier categoría que no calce con ninguna palabra conocida.
const KEYWORD_EMOJI: Array<[RegExp, string]> = [
  [/pizza/i, '🍕'],
  [/(burger|hambur)/i, '🍔'],
  [/(bebida|drink|refresco|soda|jugo|juice)/i, '🥤'],
  [/(postre|dessert|dulce|helado|ice cream)/i, '🍰'],
  [/(ensalada|salad)/i, '🥗'],
  [/(pasta|spaghetti|espagueti)/i, '🍝'],
  [/(pollo|chicken|alitas|wings)/i, '🍗'],
  [/(entrada|appetizer|starter|boton)/i, '🍟'],
  [/(pan|bread|panader|bakery)/i, '🥖'],
  [/(sandwich|sándwich|torta|sub)/i, '🥪'],
  [/(taco|burrito|mexican)/i, '🌮'],
  [/(sushi|roll)/i, '🍣'],
  [/(cafe|café|coffee)/i, '☕'],
  [/(desayuno|breakfast)/i, '🍳'],
]

export function categoryEmoji(name: string): string {
  for (const [pattern, emoji] of KEYWORD_EMOJI) {
    if (pattern.test(name)) return emoji
  }
  return '🍽️'
}
