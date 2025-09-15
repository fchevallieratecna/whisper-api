import { Router, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { specs } from '../swagger/openapi';

const router = Router();

// Servir l'interface Swagger UI
router.use('/docs', swaggerUi.serve);
router.get('/docs', swaggerUi.setup(specs, {
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info .title { color: #3b82f6; }
    .swagger-ui .scheme-container { background: #f8fafc; border: 1px solid #e2e8f0; }
  `,
  customSiteTitle: 'Whisper API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
    supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch']
  }
}));

// Endpoint pour récupérer la spécification OpenAPI en JSON
router.get('/openapi.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(specs);
});

// Endpoint pour récupérer la spécification OpenAPI en YAML (optionnel)
router.get('/openapi.yaml', (_req: Request, res: Response) => {
  const yaml = require('yaml');
  res.setHeader('Content-Type', 'text/yaml');
  res.send(yaml.stringify(specs));
});

export default router;