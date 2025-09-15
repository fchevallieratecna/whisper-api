import { Router, Request, Response } from 'express';
import { UploadedFile, FileArray } from 'express-fileupload';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import jobManager from '../config/jobManager';
import status from './status';

/**
 * @swagger
 * components:
 *   schemas:
 *     Error:
 *       type: object
 *       required:
 *         - success
 *         - error
 *       properties:
 *         success:
 *           type: boolean
 *           enum: [false]
 *           description: Indique l'échec de l'opération
 *           example: false
 *         error:
 *           type: string
 *           description: Description de l'erreur
 *           example: "Aucun fichier audio fourni"
 *
 *     ProcessAudioRequest:
 *       type: object
 *       required:
 *         - audio
 *       properties:
 *         audio:
 *           type: string
 *           format: binary
 *           description: Fichier audio à traiter (formats supportés - wav, mp3, mp4, flac, m4a, etc.)
 *         outputFormat:
 *           type: string
 *           enum: [json, txt, srt]
 *           default: txt
 *           description: Format de sortie souhaité
 *           example: json
 *         model:
 *           type: string
 *           default: large-v3
 *           description: Modèle WhisperX à utiliser
 *           example: large-v3
 *           enum: [tiny, base, small, medium, large-v1, large-v2, large-v3]
 *         language:
 *           type: string
 *           default: fr
 *           description: Code langue ISO (ex - fr, en, es). Laisser vide pour détection automatique
 *           example: fr
 *         batchSize:
 *           type: integer
 *           default: 8
 *           minimum: 1
 *           maximum: 32
 *           description: Taille des lots pour le traitement (impact sur vitesse/mémoire)
 *           example: 8
 *         computeType:
 *           type: string
 *           enum: [int8, float16, float32]
 *           default: float16
 *           description: Type de calcul (int8 pour Mac M1/M2, float16 pour GPU)
 *           example: float16
 *         hfToken:
 *           type: string
 *           description: Token Hugging Face (requis pour la diarisation)
 *           example: hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *         diarize:
 *           type: boolean
 *           default: true
 *           description: Activer la diarisation (séparation des locuteurs)
 *           example: true
 *         initialPrompt:
 *           type: string
 *           description: Prompt initial pour guider la transcription
 *           example: "Transcription d'un meeting d'équipe"
 *         debug:
 *           type: boolean
 *           default: false
 *           description: Activer le mode debug (logs détaillés)
 *           example: false
 *         nbSpeaker:
 *           type: integer
 *           default: 2
 *           minimum: 1
 *           maximum: 20
 *           description: Nombre estimé de locuteurs (pour améliorer la diarisation)
 *           example: 2
 *
 *     JobResponse:
 *       type: object
 *       required:
 *         - success
 *         - message
 *         - jobId
 *         - links
 *       properties:
 *         success:
 *           type: boolean
 *           enum: [true]
 *           description: Indique le succès du démarrage du traitement
 *           example: true
 *         message:
 *           type: string
 *           description: Message de confirmation
 *           example: "Traitement audio démarré"
 *         jobId:
 *           type: string
 *           format: uuid
 *           description: Identifiant unique du job créé
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         links:
 *           type: object
 *           description: Liens utiles pour le suivi du job
 *           properties:
 *             status:
 *               type: string
 *               description: URL pour obtenir le statut du job
 *               example: "/api/jobs/123e4567-e89b-12d3-a456-426614174000"
 *             logs:
 *               type: string
 *               description: URL pour obtenir les logs du job
 *               example: "/api/jobs/123e4567-e89b-12d3-a456-426614174000/logs"
 *             logsStream:
 *               type: string
 *               description: URL pour le stream temps-réel des logs (Server-Sent Events)
 *               example: "/api/jobs/123e4567-e89b-12d3-a456-426614174000/logs/stream"
 *             result:
 *               type: string
 *               description: URL pour récupérer le résultat une fois terminé
 *               example: "/api/jobs/123e4567-e89b-12d3-a456-426614174000/result"
 */
interface RequestWithFiles extends Request {
  files?: FileArray | null;
}

const router = Router();

/**
 * @swagger
 * /process:
 *   post:
 *     tags:
 *       - Audio Processing
 *     summary: Démarrer le traitement d'un fichier audio
 *     description: |
 *       Lance le traitement asynchrone d'un fichier audio avec WhisperX.
 *
 *       **Fonctionnalités** :
 *       - Transcription speech-to-text haute qualité
 *       - Diarisation (séparation des locuteurs) avec token Hugging Face
 *       - Support de multiples formats audio (wav, mp3, mp4, flac, m4a, etc.)
 *       - Choix du format de sortie (JSON, TXT, SRT)
 *       - Optimisation automatique selon la plateforme
 *
 *       **Processus** :
 *       1. Upload du fichier audio (multipart/form-data)
 *       2. Création d'un job asynchrone
 *       3. Retour immédiat avec ID du job et liens de suivi
 *       4. Traitement en arrière-plan
 *       5. Résultats accessibles via l'API Jobs
 *
 *       **Pour les IA** : Utilisez le jobId retourné pour suivre le progress via `/api/jobs/{jobId}` et récupérer le résultat final via `/api/jobs/{jobId}/result`.
 *     operationId: processAudio
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/ProcessAudioRequest'
 *           encoding:
 *             audio:
 *               contentType: audio/*
 *     responses:
 *       202:
 *         description: Traitement démarré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobResponse'
 *             example:
 *               success: true
 *               message: "Traitement audio démarré"
 *               jobId: "123e4567-e89b-12d3-a456-426614174000"
 *               links:
 *                 status: "/api/jobs/123e4567-e89b-12d3-a456-426614174000"
 *                 logs: "/api/jobs/123e4567-e89b-12d3-a456-426614174000/logs"
 *                 logsStream: "/api/jobs/123e4567-e89b-12d3-a456-426614174000/logs/stream"
 *                 result: "/api/jobs/123e4567-e89b-12d3-a456-426614174000/result"
 *       400:
 *         description: Requête invalide (fichier manquant ou paramètres incorrects)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               missingFile:
 *                 summary: Fichier audio manquant
 *                 value:
 *                   success: false
 *                   error: "Aucun fichier audio fourni"
 *               invalidParameter:
 *                 summary: Paramètre invalide
 *                 value:
 *                   success: false
 *                   error: "Format de sortie invalide"
 *       500:
 *         description: Erreur serveur interne
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const processAudio = async (req: RequestWithFiles, res: Response): Promise<void> => {
  try {
    if (!req.files || !req.files.audio) {
      res.status(400).json({ success: false, error: 'Aucun fichier audio fourni' });
      return;
    }

    const audioFile = req.files.audio as UploadedFile;
    const tempDir = path.join(os.tmpdir(), 'whisperx-api');
    
    // Créer le répertoire temporaire s'il n'existe pas
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Générer des noms de fichiers uniques
    const fileId = uuidv4();
    const audioPath = path.join(tempDir, `${fileId}-${audioFile.name}`);
    const outputPath = path.join(tempDir, `${fileId}-output`);
    
    // Enregistrer le fichier audio
    await audioFile.mv(audioPath);
    
    // Récupérer les paramètres de la requête
    const outputFormat = req.body.outputFormat || 'txt';
    const model = req.body.model || 'large-v3';
    const language = req.body.language || 'fr';
    const batchSize = parseInt(req.body.batchSize || '8', 10);
    const computeType = req.body.computeType || 'float16';
    const hfToken = req.body.hfToken || '';
    const diarize = req.body.diarize !== 'false';
    const initialPrompt = req.body.initialPrompt || '';
    const debug = req.body.debug === 'true';
    const nbSpeaker = req.body.nbSpeaker || 2;
    
    // Construire la commande WhisperX CLI
    let command = `whisperx_cli "${audioPath}" --model ${model} --batch_size ${batchSize} --compute_type ${computeType} --output "${outputPath}.${outputFormat}" --output_format ${outputFormat}`;
    console.log(command);
    // Ajouter les options conditionnelles
    if (language) {
      command += ` --language ${language}`;
    }
    
    if (diarize) {
      command += ` --diarize`;
    } else {
      command += ` --no-diarize`;
    }
    
    if (hfToken) {
      command += ` --hf_token ${hfToken}`;
    }
    
    if (initialPrompt) {
      command += ` --initial_prompt "${initialPrompt}"`;
    }
    
    if (debug) {
      command += ` --debug`;
    }

    if (nbSpeaker) {
      command += ` --nb_speaker ${nbSpeaker}`;
    }
    
    // Créer un job et le démarrer
    const jobId = uuidv4();
    jobManager.createJob(jobId, command, outputPath, outputFormat);
    
    if (initialPrompt) {
      jobManager.addJobLog(jobId, `Prompt initial: "${initialPrompt}"`);
    }
    if (nbSpeaker && diarize) {
      jobManager.addJobLog(jobId, `Nombre de locuteurs: ${nbSpeaker}`);
    }
    
    // Démarrer le job de manière asynchrone
    setTimeout(() => {
      try {
        jobManager.startJob(jobId);
        
        // Configurer un écouteur pour la fin du job
        jobManager.once('job-completed', (completedJobId: string) => {
          if (completedJobId === jobId) {
            console.log(`Job ${jobId} terminé avec succès`);
          }
        });
        
        jobManager.once('job-failed', (failedJobId: string, error: string) => {
          if (failedJobId === jobId) {
            console.error(`Job ${jobId} échoué: ${error}`);
          }
        });
      } catch (error) {
        console.error(`Erreur lors du démarrage du job ${jobId}:`, error);
        jobManager.addJobLog(jobId, `Erreur lors du démarrage: ${error}`);
      }
    }, 0);
    
    // Retourner immédiatement l'ID du job
    res.status(202).json({ 
      success: true, 
      message: 'Traitement audio démarré', 
      jobId,
      links: {
        status: `/api/jobs/${jobId}`,
        logs: `/api/jobs/${jobId}/logs`,
        logsStream: `/api/jobs/${jobId}/logs/stream`,
        result: `/api/jobs/${jobId}/result`
      }
    });
    
  } catch (err) {
    console.error('Erreur:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

router.route('/process').post(processAudio);
router.route('/status').get(status);

export default router;