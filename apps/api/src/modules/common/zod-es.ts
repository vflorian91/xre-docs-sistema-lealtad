import { z, ZodIssueCode, ZodParsedType } from 'zod';

const TYPE_LABELS: Partial<Record<ZodParsedType, string>> = {
  string: 'texto',
  number: 'número',
  boolean: 'booleano',
  date: 'fecha',
  array: 'lista',
  object: 'objeto',
  integer: 'número entero',
  null: 'nulo',
  undefined: 'indefinido',
  nan: 'número',
};

function typeLabel(type?: ZodParsedType): string {
  return (type && TYPE_LABELS[type]) || 'valor válido';
}

/**
 * Traduce los mensajes de error por defecto de Zod al español para que ninguna
 * alerta de validación se muestre en inglés al usuario.
 */
const spanishErrorMap: z.ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === 'undefined' || issue.received === 'null') {
        return { message: 'Este campo es obligatorio.' };
      }
      return { message: `Se esperaba ${typeLabel(issue.expected)}.` };
    case ZodIssueCode.invalid_enum_value:
      return { message: `Valor no permitido. Opciones válidas: ${issue.options?.join(', ')}.` };
    case ZodIssueCode.invalid_string: {
      if (issue.validation === 'email') return { message: 'Ingresa un correo electrónico válido.' };
      if (issue.validation === 'url') return { message: 'Ingresa una URL válida.' };
      if (issue.validation === 'uuid' || issue.validation === 'cuid' || issue.validation === 'cuid2') {
        return { message: 'Identificador inválido.' };
      }
      return { message: 'El texto tiene un formato inválido.' };
    }
    case ZodIssueCode.too_small: {
      if (issue.type === 'string') {
        return issue.minimum === 1
          ? { message: 'Este campo es obligatorio.' }
          : { message: `Debe tener al menos ${issue.minimum} caracteres.` };
      }
      if (issue.type === 'number') return { message: `Debe ser mayor o igual a ${issue.minimum}.` };
      if (issue.type === 'array') return { message: `Selecciona al menos ${issue.minimum} elemento(s).` };
      return { message: 'El valor es demasiado pequeño.' };
    }
    case ZodIssueCode.too_big: {
      if (issue.type === 'string') return { message: `No debe superar los ${issue.maximum} caracteres.` };
      if (issue.type === 'number') return { message: `Debe ser menor o igual a ${issue.maximum}.` };
      if (issue.type === 'array') return { message: `Selecciona como máximo ${issue.maximum} elemento(s).` };
      return { message: 'El valor es demasiado grande.' };
    }
    case ZodIssueCode.not_multiple_of:
      return { message: `Debe ser múltiplo de ${issue.multipleOf}.` };
    case ZodIssueCode.unrecognized_keys:
      return { message: `Campos no permitidos: ${issue.keys?.join(', ')}.` };
    case ZodIssueCode.invalid_date:
      return { message: 'Ingresa una fecha válida.' };
    default:
      return { message: ctx.defaultError === 'Required' ? 'Este campo es obligatorio.' : ctx.defaultError };
  }
};

export function applySpanishZodErrors() {
  z.setErrorMap(spanishErrorMap);
}
