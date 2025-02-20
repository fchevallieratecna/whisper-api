import express, { Router, Request, Response, RequestHandler } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { executeDiarizationProcess } from '../utils/runPython';
import { z } from 'zod';
import config from '../config';


const router: Router = express.Router();

// Schéma de validation Zod pour les options de requête
const processOptionsSchema = z.object({
  outputType: z.enum(['txt', 'srt']).default('txt'),
  whisperModel: z.string().optional(),
  language: z.string().optional(),
  noStem: z.preprocess(val => val === 'true' || val === true, z.boolean().optional()),
  suppressNumerals: z.preprocess(val => val === 'true' || val === true, z.boolean().optional()),
  batchSize: z.preprocess(val => Number(val), z.number().optional()),
  device: z.string().optional(),
  parallel: z.preprocess(val => val === 'true' || val === true, z.boolean().optional()),
});

const processHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  if (!req.files?.audio) {
    res.status(400).json({ success: false, error: "Aucun fichier audio reçu" });
    return;
  }
  const audioFile = Array.isArray(req.files.audio) ? req.files.audio[0] : req.files.audio;
  const sanitizedFileName = audioFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uploadPath = path.join(config.uploadPath, sanitizedFileName);

  try {
    await audioFile.mv(uploadPath);
    const optionsResult = processOptionsSchema.safeParse(req.body);
    if (!optionsResult.success) {
      await fs.unlink(uploadPath);
      res.status(400).json({ success: false, error: "Options invalides", validationErrors: optionsResult.error.issues });
      return;
    }
    const options = optionsResult.data;
    await executeDiarizationProcess(uploadPath, options);

    const { name } = path.parse(uploadPath);
    const outputType = options.outputType || 'txt';
    const outputFile = path.join(config.uploadPath, `${name}.${outputType}`);
    const data = await fs.readFile(outputFile, 'utf8');
    res.json({ success: true, outputType, content: data });
  } catch (err) {
    console.error("Erreur de traitement :", err);
    res.status(500).json({ success: false, error: "Erreur lors du traitement audio" });
  }
};

router.post('/process', processHandler);
export default router;