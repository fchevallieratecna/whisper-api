import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import fileUpload from 'express-fileupload';
import processAudioRoute from './routes/processAudio';
import jobsRoute from './routes/jobs';
import docsRoute from './routes/docs';
import config from './config';
import morgan from 'morgan';
import cors from 'cors';

const app = express();

app.use(express.json());
app.use(fileUpload());
app.use(morgan('combined'));
app.use(cors());

// Middleware pour gérer les fichiers temporaires
app.use((req, res, next) => {
  // Nettoyer les fichiers temporaires après la réponse
  res.on('finish', () => {
    if (req.files) {
      // Logique de nettoyage si nécessaire
    }
  });
  next();
});

// Routes centralisées sous le préfixe /api
app.use('/api', processAudioRoute);
app.use('/api/jobs', jobsRoute);
app.use('/api', docsRoute);

app.get('/', (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Documentation de l'API</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; padding: 30px; }
    .container { max-width: 800px; margin: auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
    h1 { color: #333; text-align: center; }
    h2 { color: #555; margin-top: 20px; }
    ul { list-style: none; padding: 0; }
    li { margin-bottom: 10px; }
    form { margin-top: 20px; }
    label { display: block; margin-bottom: 5px; }
    input, select { margin-bottom: 10px; padding: 8px; width: 100%; box-sizing: border-box; }
    button { padding: 10px; background: #333; color: #fff; border: none; width: 100%; border-radius: 4px; cursor: pointer; }
    fieldset { margin-bottom: 15px; border: 1px solid #ddd; padding: 10px; border-radius: 4px; }
    legend { font-weight: bold; }
    code { background: #f8f8f8; padding: 2px 5px; border-radius: 3px; font-family: monospace; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Whisper API - Service de transcription audio</h1>

    <h2>🔗 Documentation Interactive</h2>
    <p><strong><a href="/api/docs" target="_blank">📖 Documentation OpenAPI/Swagger</a></strong> - Interface interactive complète</p>
    <p><strong><a href="/api/openapi.json" target="_blank">📄 Spécification OpenAPI JSON</a></strong> - Pour génération automatique de clients</p>
    <p><strong><a href="/api/openapi.yaml" target="_blank">📄 Spécification OpenAPI YAML</a></strong> - Format YAML</p>

    <h2>📋 Endpoints disponibles</h2>
    <ul>
      <li><strong>GET /</strong> : Documentation et exemples.</li>
      <li>
        <strong>POST /api/process</strong> : Traitement d'un fichier audio.
        <ul>
          <li><code>audio</code> – Fichier audio (obligatoire, multipart/form-data)</li>
          <li><code>outputFormat</code> – Format de sortie (optionnel : "json", "txt" ou "srt", défaut "json")</li>
          <li><code>model</code> – Modèle WhisperX (optionnel, défaut "large-v3")</li>
          <li><code>language</code> – Langue (optionnel, ex: fr, en)</li>
          <li><code>batchSize</code> – Taille des lots (optionnel, défaut "4")</li>
          <li><code>computeType</code> – Type de calcul (optionnel, défaut "float16")</li>
          <li><code>hfToken</code> – Token Hugging Face (requis pour la diarization)</li>
          <li><code>diarize</code> – Active la diarization (optionnel, "true" ou "false")</li>
        </ul>
        <p>Cette route retourne maintenant un ID de job au lieu d'attendre la fin du traitement.</p>
      </li>
      
      <h2>Gestion des Jobs</h2>
      <li>
        <strong>GET /api/jobs</strong> : Liste tous les jobs en cours et terminés.
      </li>
      <li>
        <strong>GET /api/jobs/:id</strong> : Récupère les informations d'un job spécifique.
      </li>
      <li>
        <strong>GET /api/jobs/:id/logs</strong> : Récupère les logs d'un job spécifique.
      </li>
      <li>
        <strong>GET /api/jobs/:id/result</strong> : Récupère le résultat d'un job terminé.
      </li>
    </ul>
    
    <p>Exemple de formulaire :</p>
    <form action="/api/process" method="post" enctype="multipart/form-data">
      <fieldset>
        <legend>Fichier audio</legend>
        <label for="audio">Fichier audio (obligatoire) :</label>
        <input type="file" id="audio" name="audio" accept="audio/*" required>
      </fieldset>
      <fieldset>
        <legend>Options</legend>
        <label for="outputFormat">Format de sortie :</label>
        <select id="outputFormat" name="outputFormat">
          <option value="json" selected>json</option>
          <option value="txt">txt</option>
          <option value="srt">srt</option>
        </select>
        <label for="model">Modèle WhisperX :</label>
        <input type="text" id="model" name="model" placeholder="ex: large-v3, medium, small" value="large-v3">
        <label for="language">Langue :</label>
        <input type="text" id="language" name="language" placeholder="ex: fr, en (vide = détection auto)">
        <label for="batchSize">Taille des lots :</label>
        <input type="number" id="batchSize" name="batchSize" placeholder="ex: 4" value="4">
        <label for="computeType">Type de calcul :</label>
        <input type="text" id="computeType" name="computeType" placeholder="ex: float16, int8" value="float16">
        <label for="hfToken">Token Hugging Face :</label>
        <input type="text" id="hfToken" name="hfToken" placeholder="Requis pour la diarization">
        <label>
          <input type="checkbox" id="diarize" name="diarize" value="true">
          Activer la diarization (nécessite un token HF)
        </label>
      </fieldset>
      <button type="submit">Envoyer</button>
    </form>
  </div>
</body>
</html>`);
});

// Middleware global de gestion des erreurs
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Erreur globale :", err);
  res.status(500).json({ success: false, error: "Erreur serveur" });
});

app.listen(config.port, () => {
  console.log(`Serveur démarré sur le port ${config.port}`);
});