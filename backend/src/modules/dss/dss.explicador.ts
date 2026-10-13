import { GoogleGenAI } from '@google/genai';
import { env } from '../../shared/utils/env';
import { ContextoExplicacion, generarExplicacionBase } from '../../engine/explicador';

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    if (!env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY no está configurada.');
    }
    client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }
  return client;
}

const SYSTEM_PROMPT =
  'Eres un asistente de una plataforma de gestión de inventarios para pequeñas empresas. ' +
  'Redacta en español sencillo, en un solo párrafo de máximo 120 palabras, una explicación ejecutiva ' +
  'de la recomendación de reabastecimiento que se te proporciona. No inventes cifras.';

/**
 * Enriquecimiento con Gemini de la plantilla determinística. Devuelve el texto enriquecido
 * o lanza un error para que el servicio haga fallback a la plantilla base.
 */
export async function enriquecerExplicacionConIA(ctx: ContextoExplicacion): Promise<string> {
  const base = generarExplicacionBase(ctx);
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: env.GEMINI_MODEL,
    contents: [{ role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\nDatos: ${base}` }] }],
  });

  const texto = response.text?.trim();
  if (!texto) {
    throw new Error('Gemini no devolvió contenido para la explicación.');
  }

  return texto.slice(0, 1200);
}
