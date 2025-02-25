import { Router, Request, Response } from 'express';
import { UploadedFile, FileArray } from 'express-fileupload';
import { exec } from 'child_process';
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
    const outputFormat = req.body.outputFormat || 'json';
    const model = req.body.model || 'large-v3';
    const language = req.body.language || '';
    const batchSize = req.body.batchSize || '4';
    const computeType = req.body.computeType || 'float16';
    const hfToken = req.body.hfToken || '';
    const diarize = req.body.diarize === 'true';
    
    // Construire la commande WhisperX CLI
    let command = `whisperx_cli "${audioPath}" --model ${model} --batch_size ${batchSize} --compute_type ${computeType} --output "${outputPath}.${outputFormat}" --output_format ${outputFormat}`;
    
    // Ajouter les options conditionnelles
    if (language) {
      command += ` --language ${language}`;
    }
    
    if (hfToken && diarize) {
      command += ` --hf_token ${hfToken} --diarize`;
    }
    
    // Exécuter la commande
    console.log(`Exécution de la commande: ${command}`);
    exec(command, async (error, stdout, stderr) => {
      if (error) {
        console.error(`Erreur d'exécution: ${error.message}`);
        console.error(`stderr: ${stderr}`);
        res.status(500).json({ success: false, error: 'Erreur lors du traitement audio' });
        return;
      }
      
      // Logs de la sortie standard
      console.log(`Sortie standard de la commande:`);
      console.log(stdout);
      
      if (stderr) {
        console.log(`Sortie d'erreur de la commande (non fatale):`);
        console.log(stderr);
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