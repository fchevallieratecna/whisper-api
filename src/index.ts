import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import fileUpload from 'express-fileupload';
import processAudioRoute from './routes/processAudio';
import config from './config';
import morgan from 'morgan';

const app = express();

app.use(express.json());
app.use(fileUpload());
app.use(morgan('combined'));

// Routes centralisées sous le préfixe /api
app.use('/api', processAudioRoute);

// Middleware global de gestion des erreurs
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Erreur globale :", err);
  res.status(500).json({ success: false, error: "Erreur serveur" });
});

app.listen(config.port, () => {
  console.log(`Serveur démarré sur le port ${config.port}`);
});