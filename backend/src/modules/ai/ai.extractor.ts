import { GoogleGenAI, Type, type Schema } from '@google/genai';
import { env } from '../../shared/utils/env';
import { ExtraccionRecibo, ItemExtraidoCrudo } from './ai.types';

const PROMPT =
  'Extrae los productos y cantidades visibles en la imagen de este recibo o cuaderno de ventas. ' +
  'Devuelve un JSON con una fecha opcional y la lista de ítems. ' +
  'Cada ítem debe incluir la descripción del producto tal como aparece, la cantidad y, si es visible, el precio unitario en bolivianos.';

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    fecha: {
      type: Type.STRING,
      description: 'Fecha del recibo o de las ventas en formato YYYY-MM-DD, si es visible.',
    },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          descripcion: { type: Type.STRING, description: 'Descripción o nombre del producto tal como aparece.' },
          cantidad: { type: Type.NUMBER, description: 'Cantidad de unidades.' },
          precioUnitario: { type: Type.NUMBER, description: 'Precio unitario en bolivianos, si es visible.' },
        },
        required: ['descripcion', 'cantidad'],
      },
    },
  },
  required: ['items'],
};

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    if (!env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY no está configurada. No es posible extraer recibos con IA.');
    }
    client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }
  return client;
}

function normalizarExtraccion(raw: unknown): ExtraccionRecibo {
  if (!raw || typeof raw !== 'object') {
    throw new Error('La respuesta de Gemini no tiene una estructura JSON válida.');
  }

  const obj = raw as { fecha?: unknown; items?: unknown };
  const itemsArray = Array.isArray(obj.items) ? obj.items : [];

  const items: ItemExtraidoCrudo[] = [];
  for (const raw of itemsArray) {
    const item = raw as { descripcion?: unknown; cantidad?: unknown; precioUnitario?: unknown };
    const cantidad = typeof item.cantidad === 'number' ? item.cantidad : Number(item.cantidad);
    if (typeof item.descripcion !== 'string' || !item.descripcion.trim() || !Number.isFinite(cantidad)) {
      continue;
    }
    items.push({
      descripcion: item.descripcion.trim(),
      cantidad,
      precioUnitario:
        item.precioUnitario != null && Number.isFinite(Number(item.precioUnitario))
          ? Number(item.precioUnitario)
          : null,
    });
  }

  return {
    fecha: typeof obj.fecha === 'string' && obj.fecha.trim() !== '' ? obj.fecha.trim() : null,
    items,
  };
}

export async function extraerDesdeImagen(mimeType: string, base64Data: string): Promise<ExtraccionRecibo> {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: env.GEMINI_MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: PROMPT },
        ],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('Gemini no devolvió contenido para la imagen.');
  }

  const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(clean);
  return normalizarExtraccion(parsed);
}
