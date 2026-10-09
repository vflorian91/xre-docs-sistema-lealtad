// Clasificación de productos para filtros (tienda online + canjeables).
// Tipo y género/edad. Compartido por validación de schemas y respuestas.

export const STORE_PRODUCT_TYPES = [
  { code: 'DEPORTIVO', label: 'Deportivo' },
  { code: 'CASUAL', label: 'Casual' },
  { code: 'FORMAL', label: 'Formal' },
  { code: 'RUNNING', label: 'Running' },
  { code: 'URBANO', label: 'Urbano' },
  { code: 'ROPA', label: 'Ropa' },
  { code: 'ACCESORIO', label: 'Accesorio' },
  { code: 'OTRO', label: 'Otro' },
] as const;

export const STORE_GENDER_TARGETS = [
  { code: 'HOMBRE', label: 'Hombre' },
  { code: 'MUJER', label: 'Mujer' },
  { code: 'NINO', label: 'Niño' },
  { code: 'NINA', label: 'Niña' },
  { code: 'UNISEX', label: 'Unisex' },
] as const;

export const STORE_PRODUCT_TYPE_CODES = STORE_PRODUCT_TYPES.map((t) => t.code) as [string, ...string[]];
export const STORE_GENDER_TARGET_CODES = STORE_GENDER_TARGETS.map((g) => g.code) as [string, ...string[]];
