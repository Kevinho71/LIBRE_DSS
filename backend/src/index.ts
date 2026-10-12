/**
 * Plantilla de manejador AWS Lambda Function URL / Router para LIBREDSS Backend
 */
export async function handler(event: any, context: any) {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'LIBREDSS API Base Online',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    }),
  };
}
