import { Router, Request, Response } from 'express';
import jobManager from '../config/jobManager';
import fs from 'fs';

/**
 * @swagger
 * components:
 *   schemas:
 *     JobStatus:
 *       type: string
 *       enum: [pending, running, completed, failed]
 *       description: État du job
 *       example: running
 *
 *     JobSummary:
 *       type: object
 *       required:
 *         - id
 *         - status
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Identifiant unique du job
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         status:
 *           $ref: '#/components/schemas/JobStatus'
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Date de création du job
 *           example: "2024-01-15T10:30:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Date de dernière mise à jour
 *           example: "2024-01-15T10:32:15.000Z"
 *         lastLog:
 *           type: string
 *           nullable: true
 *           description: Dernier message de log
 *           example: "Transcription terminée avec succès"
 *
 *     JobDetail:
 *       allOf:
 *         - $ref: '#/components/schemas/JobSummary'
 *         - type: object
 *           properties:
 *             outputPath:
 *               type: string
 *               description: Chemin vers le fichier de sortie
 *               example: "/tmp/whisperx-api/output-123"
 *             outputFormat:
 *               type: string
 *               enum: [json, txt, srt]
 *               description: Format du fichier de sortie
 *               example: json
 *             logs:
 *               type: array
 *               items:
 *                 type: string
 *               description: Historique complet des logs
 *               example: ["Job started", "Loading model...", "Processing audio..."]
 *
 *     JobsListResponse:
 *       type: object
 *       required:
 *         - success
 *         - jobs
 *       properties:
 *         success:
 *           type: boolean
 *           enum: [true]
 *           example: true
 *         jobs:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/JobSummary'
 *
 *     JobDetailResponse:
 *       type: object
 *       required:
 *         - success
 *         - job
 *       properties:
 *         success:
 *           type: boolean
 *           enum: [true]
 *           example: true
 *         job:
 *           $ref: '#/components/schemas/JobDetail'
 *
 *     JobLogsResponse:
 *       type: object
 *       required:
 *         - success
 *         - logs
 *       properties:
 *         success:
 *           type: boolean
 *           enum: [true]
 *           example: true
 *         logs:
 *           type: array
 *           items:
 *             type: string
 *           description: Liste complète des logs du job
 *           example: ["Job started", "Loading model large-v3...", "Processing audio...", "Transcription completed"]
 *
 *   parameters:
 *     JobIdParam:
 *       name: id
 *       in: path
 *       required: true
 *       description: Identifiant unique du job
 *       schema:
 *         type: string
 *         format: uuid
 *       example: "123e4567-e89b-12d3-a456-426614174000"
 */

const router = Router();

/**
 * @swagger
 * /:
 *   get:
 *     tags:
 *       - Jobs Management
 *     summary: Lister tous les jobs
 *     description: |
 *       Retourne la liste de tous les jobs de traitement audio avec leur statut actuel.
 *
 *       Utile pour :
 *       - Monitorer tous les traitements en cours
 *       - Consulter l'historique des jobs
 *       - Obtenir une vue d'ensemble de l'activité
 *
 *       **Pour les IA** : Endpoint de monitoring pour suivre plusieurs traitements simultanés.
 *     operationId: getAllJobs
 *     responses:
 *       200:
 *         description: Liste des jobs récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobsListResponse'
 *       500:
 *         description: Erreur serveur interne
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Récupérer tous les jobs
router.get('/', (_req: Request, res: Response): void => {
  try {
    const jobs = jobManager.getAllJobs().map(job => ({
      id: job.id,
      status: job.status,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      lastLog: jobManager.getLastLog(job.id)
    }));
    
    res.json({ success: true, jobs });
  } catch (error) {
    console.error('Erreur lors de la récupération des jobs:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /{id}:
 *   get:
 *     tags:
 *       - Jobs Management
 *     summary: Récupérer un job spécifique
 *     description: |
 *       Obtient les détails complets d'un job particulier.
 *
 *       Informations retournées :
 *       - Statut actuel (pending, running, completed, failed)
 *       - Timestamps de création et mise à jour
 *       - Chemin et format du fichier de sortie
 *       - Dernier message de log
 *
 *       **Pour les IA** : Endpoint principal pour vérifier l'état d'un traitement avant de récupérer le résultat.
 *     operationId: getJobById
 *     parameters:
 *       - $ref: '#/components/parameters/JobIdParam'
 *     responses:
 *       200:
 *         description: Détails du job récupérés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobDetailResponse'
 *       404:
 *         description: Job non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               error: "Job non trouvé"
 *       500:
 *         description: Erreur serveur interne
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Récupérer un job spécifique
router.route('/:id')
  .get((req: Request, res: Response): void => {
    try {
      const jobId = req.params.id;
      const job = jobManager.getJob(jobId);
      
      if (!job) {
        res.status(404).json({ success: false, error: 'Job non trouvé' });
        return;
      }
      
      // Exclure le process et la commande complète pour des raisons de sécurité
      const { process, command, ...safeJob } = job;
      
      res.json({ 
        success: true, 
        job: {
          ...safeJob,
          lastLog: jobManager.getLastLog(jobId)
        } 
      });
    } catch (error) {
      console.error(`Erreur lors de la récupération du job ${req.params.id}:`, error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  });

/**
 * @swagger
 * /{id}/logs:
 *   get:
 *     tags:
 *       - Jobs Management
 *     summary: Récupérer les logs d'un job
 *     description: |
 *       Obtient l'historique complet des logs d'un job.
 *
 *       Les logs incluent :
 *       - Messages de progression du traitement
 *       - Informations de debug (si activé)
 *       - Messages d'erreur éventuels
 *       - Étapes de la transcription et diarisation
 *
 *       **Pour les IA** : Utilisez cet endpoint pour diagnostiquer les problèmes ou suivre la progression détaillée.
 *     operationId: getJobLogs
 *     parameters:
 *       - $ref: '#/components/parameters/JobIdParam'
 *     responses:
 *       200:
 *         description: Logs du job récupérés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobLogsResponse'
 *       404:
 *         description: Job non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erreur serveur interne
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Récupérer les logs d'un job
router.route('/:id/logs')
  .get((req: Request, res: Response): void => {
    try {
      const jobId = req.params.id;
      const job = jobManager.getJob(jobId);
      
      if (!job) {
        res.status(404).json({ success: false, error: 'Job non trouvé' });
        return;
      }
      
      res.json({ success: true, logs: job.logs });
    } catch (error) {
      console.error(`Erreur lors de la récupération des logs du job ${req.params.id}:`, error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  });

/**
 * @swagger
 * /{id}/logs/stream:
 *   get:
 *     tags:
 *       - Jobs Management
 *     summary: Stream temps réel des logs (Server-Sent Events)
 *     description: |
 *       Établit une connexion Server-Sent Events pour recevoir les logs en temps réel.
 *
 *       **Fonctionnement** :
 *       - Envoie d'abord tous les logs existants
 *       - Puis diffuse les nouveaux logs au fur et à mesure
 *       - Met à jour le statut du job en temps réel
 *       - Connexion maintenue jusqu'à fermeture par le client
 *
 *       **Format des messages** :
 *       - `data: {"logs": [...]}` - Logs existants (premier message)
 *       - `data: {"log": "message"}` - Nouveau log
 *       - `data: {"status": "completed"}` - Changement de statut
 *
 *       **Pour les IA** : Idéal pour un suivi temps réel sans polling répétitif.
 *     operationId: streamJobLogs
 *     parameters:
 *       - $ref: '#/components/parameters/JobIdParam'
 *     responses:
 *       200:
 *         description: Stream des logs établi avec succès
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               description: |
 *                 Server-Sent Events stream with logs and status updates.
 *                 Each event contains JSON data with either:
 *                 - {"logs": [...]} for initial logs
 *                 - {"log": "message"} for new log entries
 *                 - {"status": "status"} for status changes
 *             examples:
 *               initialLogs:
 *                 summary: Logs initiaux
 *                 value: 'data: {"logs": ["Job started", "Loading model..."]}\n\n'
 *               newLog:
 *                 summary: Nouveau log
 *                 value: 'data: {"log": "Processing audio segment 1/5"}\n\n'
 *               statusUpdate:
 *                 summary: Mise à jour du statut
 *                 value: 'data: {"status": "completed"}\n\n'
 *       404:
 *         description: Job non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erreur serveur interne
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Récupérer les logs d'un job en temps réel (Server-Sent Events)
router.route('/:id/logs/stream')
  .get((req: Request, res: Response): void => {
    try {
      const jobId = req.params.id;
      const job = jobManager.getJob(jobId);
      
      if (!job) {
        res.status(404).json({ success: false, error: 'Job non trouvé' });
        return;
      }
      
      // Configuration pour SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Envoyer tous les logs existants
      const existingLogs = job.logs;
      res.write(`data: ${JSON.stringify({ logs: existingLogs })}\n\n`);
      
      // Fonction pour envoyer les nouveaux logs
      const sendLog = (id: string, log: string) => {
        if (id === jobId) {
          res.write(`data: ${JSON.stringify({ log })}\n\n`);
        }
      };
      
      // Fonction pour envoyer les mises à jour de statut
      const sendStatusUpdate = (id: string) => {
        if (id === jobId) {
          const updatedJob = jobManager.getJob(id);
          if (updatedJob) {
            res.write(`data: ${JSON.stringify({ status: updatedJob.status })}\n\n`);
          }
        }
      };
      
      // Écouter les nouveaux logs
      jobManager.on('job-log', sendLog);
      
      // Écouter les changements de statut
      jobManager.on('job-completed', sendStatusUpdate);
      jobManager.on('job-failed', sendStatusUpdate);
      
      // Nettoyer les écouteurs lorsque la connexion est fermée
      req.on('close', () => {
        jobManager.removeListener('job-log', sendLog);
        jobManager.removeListener('job-completed', sendStatusUpdate);
        jobManager.removeListener('job-failed', sendStatusUpdate);
      });
      
    } catch (error) {
      console.error(`Erreur lors de la diffusion des logs du job ${req.params.id}:`, error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  });

/**
 * @swagger
 * /{id}/result:
 *   get:
 *     tags:
 *       - Jobs Management
 *     summary: Récupérer le résultat d'un job terminé
 *     description: |
 *       Télécharge le fichier de transcription d'un job terminé avec succès.
 *
 *       **Prérequis** :
 *       - Le job doit avoir le statut `completed`
 *       - Le fichier de résultat doit exister
 *
 *       **Formats de sortie** :
 *       - **JSON** : Structure avec segments, timestamps, locuteurs
 *       - **TXT** : Texte simple avec identification des locuteurs
 *       - **SRT** : Format sous-titres avec timestamps
 *
 *       **Exemple JSON** :
 *       ```json
 *       {
 *         "segments": [
 *           {
 *             "start": 0.0,
 *             "end": 3.2,
 *             "text": "Bonjour tout le monde",
 *             "speaker": "SPEAKER_00"
 *           }
 *         ]
 *       }
 *       ```
 *
 *       **Pour les IA** : Endpoint final pour récupérer la transcription complète après vérification du statut.
 *     operationId: getJobResult
 *     parameters:
 *       - $ref: '#/components/parameters/JobIdParam'
 *     responses:
 *       200:
 *         description: Résultat du job récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: Transcription au format JSON avec segments et métadonnées
 *               example:
 *                 segments:
 *                   - start: 0.0
 *                     end: 3.2
 *                     text: "Bonjour tout le monde"
 *                     speaker: "SPEAKER_00"
 *                   - start: 3.5
 *                     end: 7.1
 *                     text: "Comment allez-vous ?"
 *                     speaker: "SPEAKER_01"
 *           text/plain:
 *             schema:
 *               type: string
 *               description: Transcription au format texte simple
 *               example: |
 *                 SPEAKER_00: Bonjour tout le monde
 *                 SPEAKER_01: Comment allez-vous ?
 *         headers:
 *           Content-Disposition:
 *             schema:
 *               type: string
 *             description: Nom du fichier à télécharger
 *             example: 'attachment; filename="transcription.json"'
 *       400:
 *         description: Job pas encore terminé ou en erreur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               notCompleted:
 *                 summary: Job pas terminé
 *                 value:
 *                   success: false
 *                   error: "Le job n'est pas terminé"
 *                   status: "running"
 *               missingOutput:
 *                 summary: Informations de sortie manquantes
 *                 value:
 *                   success: false
 *                   error: "Informations de sortie manquantes"
 *       404:
 *         description: Job ou fichier de résultat non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               jobNotFound:
 *                 summary: Job non trouvé
 *                 value:
 *                   success: false
 *                   error: "Job non trouvé"
 *               fileNotFound:
 *                 summary: Fichier de résultat non trouvé
 *                 value:
 *                   success: false
 *                   error: "Fichier de résultat non trouvé"
 *       500:
 *         description: Erreur serveur interne
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Récupérer le résultat d'un job terminé
router.route('/:id/result')
  .get((req: Request, res: Response): void => {
    try {
      const jobId = req.params.id;
      const job = jobManager.getJob(jobId);
      
      if (!job) {
        res.status(404).json({ success: false, error: 'Job non trouvé' });
        return;
      }
      
      if (job.status !== 'completed') {
        res.status(400).json({ 
          success: false, 
          error: 'Le job n\'est pas terminé', 
          status: job.status 
        });
        return;
      }
      
      // Si le job est terminé mais que le résultat n'est pas encore défini
      if (!job.outputPath || !job.outputFormat) {
        res.status(500).json({ 
          success: false, 
          error: 'Informations de sortie manquantes' 
        });
        return;
      }
      
      const outputFilePath = `${job.outputPath}.${job.outputFormat}`;
      
      if (!fs.existsSync(outputFilePath)) {
        res.status(404).json({ 
          success: false, 
          error: 'Fichier de résultat non trouvé' 
        });
        return;
      }
      
      const fileContent = fs.readFileSync(outputFilePath, 'utf8');
      
      // Définir le type de contenu en fonction du format de sortie
      let contentType = 'application/json';
      if (job.outputFormat === 'txt') {
        contentType = 'text/plain';
      } else if (job.outputFormat === 'srt') {
        contentType = 'text/plain';
      }
      
      // Envoyer la réponse
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="transcription.${job.outputFormat}"`);
      res.send(fileContent);
      
    } catch (error) {
      console.error(`Erreur lors de la récupération du résultat du job ${req.params.id}:`, error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  });

export default router; 