import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { handler } from './index';
import { LambdaEvent } from './shared/types/lambda';

// Cargar .env.development o .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.development') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.development') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

const server = http.createServer(async (req, res) => {
  // Manejo de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Idempotency-Key');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const chunks: Buffer[] = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', async () => {
    const rawBody = Buffer.concat(chunks).toString('utf-8');
    const [pathPart, queryPart] = (req.url || '/').split('?');

    const queryParams: Record<string, string> = {};
    if (queryPart) {
      const searchParams = new URLSearchParams(queryPart);
      searchParams.forEach((value, key) => {
        queryParams[key] = value;
      });
    }

    const event: LambdaEvent = {
      rawPath: pathPart,
      rawQueryString: queryPart,
      queryStringParameters: queryParams,
      headers: req.headers as Record<string, string>,
      requestContext: {
        http: {
          method: req.method || 'GET',
          path: pathPart,
          protocol: req.httpVersion,
          sourceIp: req.socket.remoteAddress || '127.0.0.1',
          userAgent: req.headers['user-agent'] || '',
        },
      },
      body: rawBody.length > 0 ? rawBody : null,
    };

    try {
      const response = await handler(event);
      res.statusCode = response.statusCode;
      if (response.headers) {
        for (const [key, value] of Object.entries(response.headers)) {
          res.setHeader(key, value);
        }
      }
      res.end(response.body);
    } catch (err: any) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'INTERNAL_SERVER_ERROR', message: err.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 LIBREDSS Backend Local API escuchando en:`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`======================================================\n`);
});
