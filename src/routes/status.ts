import { Router, Request, Response } from 'express';
import os from 'os';
import { execSync } from 'child_process';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     SystemStatus:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [ok]
 *           description: État du système
 *           example: ok
 *         whisperx_cli_version:
 *           type: string
 *           description: Version de WhisperX CLI installée
 *           example: "whisperx 3.1.1"
 *         os:
 *           type: string
 *           enum: [windows, mac, linux]
 *           description: Système d'exploitation détecté
 *           example: mac
 *         recommended_compute:
 *           type: string
 *           enum: [float16, int8]
 *           description: Type de calcul recommandé pour ce système
 *           example: int8
 */

/**
 * @swagger
 * /status:
 *   get:
 *     tags:
 *       - System Status
 *     summary: Obtenir l'état du système
 *     description: |
 *       Retourne les informations système incluant :
 *       - État général du service
 *       - Version de WhisperX CLI installée
 *       - Système d'exploitation détecté
 *       - Type de calcul recommandé (optimisé par plateforme)
 *
 *       Utile pour vérifier la disponibilité du service et ses capacités avant traitement.
 *     operationId: getSystemStatus
 *     responses:
 *       200:
 *         description: Informations système récupérées avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SystemStatus'
 *       500:
 *         description: Erreur serveur interne
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/status', (_req: Request, res: Response) => {
  let whisperVersion;
  try {
    whisperVersion = execSync('whisperx_cli --version', { encoding: 'utf8' }).trim();
  } catch (error) {
    whisperVersion = 'whisperx_cli introuvable ou ne fonctionne pas';
  }

  const platform = os.platform();
  let osName: string, computeType: string;
  switch(platform) {
    case 'win32':
      osName = 'windows';
      computeType = 'float16';
      break;
    case 'darwin':
      osName = 'mac';
      computeType = 'int8';
      break;
    case 'linux':
      osName = 'linux';
      computeType = 'float16';
      break;
    default:
      osName = platform;
      computeType = 'float16';
  }

  res.status(200).json({
    status: 'ok',
    whisperx_cli_version: whisperVersion,
    os: osName,
    recommended_compute: computeType
  });
});

export default router; 