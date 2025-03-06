import { Router, Request, Response } from 'express';
import jobManager from '../config/jobManager';
import fs from 'fs';

const router = Router();

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