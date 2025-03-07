import { Router, Request, Response } from 'express';
import { UploadedFile, FileArray } from 'express-fileupload';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import jobManager from '../config/jobManager';

interface RequestWithFiles extends Request {
  files?: FileArray | null;
}

const router = Router();

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

export default router;