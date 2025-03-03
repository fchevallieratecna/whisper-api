import { Router, Request, Response } from 'express';
import { UploadedFile, FileArray } from 'express-fileupload';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

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
    
    // Exécuter la commande
    console.log(`Exécution de la commande: ${command}`);
    
    // Utiliser spawn au lieu de exec pour capturer la sortie en temps réel
    const childProcess = require('child_process').spawn(command, [], { 
      shell: true,
      stdio: 'pipe'
    });
    
    // Capturer la sortie standard en temps réel
    childProcess.stdout.on('data', (data: Buffer) => {
      console.log(`stdout: ${data.toString()}`);
    });
    
    // Capturer la sortie d'erreur en temps réel
    childProcess.stderr.on('data', (data: Buffer) => {
      console.log(`stderr: ${data.toString()}`);
    });
    
    // Gérer la fin du processus
    childProcess.on('close', async (code: number) => {
      console.log(`Le processus s'est terminé avec le code: ${code}`);
      
      if (code !== 0) {
        console.error(`Erreur: le processus s'est terminé avec le code ${code}`);
        res.status(500).json({ success: false, error: 'Erreur lors du traitement audio' });
        return;
      }
      
      try {
        console.log(`Tentative de lecture du fichier de sortie: ${outputPath}.${outputFormat}`);
        // Lire le fichier de sortie
        const outputFilePath = `${outputPath}.${outputFormat}`;
        if (!fs.existsSync(outputFilePath)) {
          console.error(`Fichier de sortie non trouvé: ${outputFilePath}`);
          res.status(500).json({ success: false, error: 'Fichier de sortie non généré' });
          return;
        }
        
        console.log(`Fichier de sortie trouvé, lecture en cours...`);
        const fileContent = fs.readFileSync(outputFilePath, 'utf8');
        console.log(`Fichier lu avec succès, taille: ${fileContent.length} caractères`);
        
        // Définir le type de contenu en fonction du format de sortie
        let contentType = 'application/json';
        if (outputFormat === 'txt') {
          contentType = 'text/plain';
        } else if (outputFormat === 'srt') {
          contentType = 'text/plain';
        }
        
        // Envoyer la réponse
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="transcription.${outputFormat}"`);
        res.send(fileContent);
        
        // Nettoyer les fichiers temporaires
        console.log(`Nettoyage des fichiers temporaires: ${audioPath}, ${outputFilePath}`);
        fs.unlinkSync(audioPath);
        fs.unlinkSync(outputFilePath);
        console.log(`Nettoyage terminé, réponse envoyée avec succès`);
      } catch (readError) {
        console.error(`Erreur de lecture du fichier: ${readError}`);
        res.status(500).json({ success: false, error: 'Erreur lors de la lecture du fichier de sortie' });
      }
    });
  } catch (err) {
    console.error('Erreur:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

router.route('/process').post(processAudio);

export default router;