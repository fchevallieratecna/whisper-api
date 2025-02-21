import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import fileUpload from 'express-fileupload';
import processAudioRoute from './routes/processAudio';
import config from './config';
import morgan from 'morgan';
import cors from 'cors';

const app = express();

app.use(express.json());
app.use(fileUpload());
app.use(morgan('combined'));
app.use(cors());

// Routes centralisées sous le préfixe /api
app.use('/api', processAudioRoute);

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
    ul { list-style: none; padding: 0; }
    li { margin-bottom: 10px; }
    form { margin-top: 20px; }
    label { display: block; margin-bottom: 5px; }
    input, select { margin-bottom: 10px; padding: 8px; width: 100%; box-sizing: border-box; }
    button { padding: 10px; background: #333; color: #fff; border: none; width: 100%; border-radius: 4px; cursor: pointer; }
    fieldset { margin-bottom: 15px; border: 1px solid #ddd; padding: 10px; border-radius: 4px; }
    legend { font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Documentation de l'API</h1>
    <p>Endpoints disponibles :</p>
    <ul>
      <li><strong>GET /</strong> : Documentation et exemples.</li>
      <li>
        <strong>POST /api/process</strong> : Traitement d'un fichier audio.
        <ul>
          <li><code>audio</code> – Fichier audio (obligatoire, multipart/form-data)</li>
          <li><code>outputType</code> – Type de sortie désiré (optionnel : "txt" ou "srt", défaut "txt")</li>
          <li><code>whisperModel</code> – Modèle Whisper (optionnel)</li>
          <li><code>language</code> – Langue (optionnel)</li>
          <li><code>noStem</code> – Désactivation de la racinisation (optionnel, booléen)</li>
          <li><code>suppressNumerals</code> – Suppression des nombres (optionnel, booléen)</li>
          <li><code>batchSize</code> – Taille des lots (optionnel, nombre)</li>
          <li><code>device</code> – Périphérique de traitement (optionnel)</li>
          <li><code>parallel</code> – Exécution parallèle (optionnel, booléen)</li>
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
            <label for="outputType">Type de sortie :</label>
            <select id="outputType" name="outputType">
              <option value="txt" selected>txt</option>
              <option value="srt">srt</option>
            </select>
            <label for="whisperModel">Modèle Whisper :</label>
            <input type="text" id="whisperModel" name="whisperModel" placeholder="ex: base, small, medium">
            <label for="language">Langue :</label>
            <input type="text" id="language" name="language" placeholder="ex: fr">
            <label>
              <input type="checkbox" id="noStem" name="noStem" value="true">
              Désactiver la racinisation
            </label>
            <label>
              <input type="checkbox" id="suppressNumerals" name="suppressNumerals" value="true">
              Supprimer les nombres
            </label>
            <label for="batchSize">Taille des lots :</label>
            <input type="number" id="batchSize" name="batchSize" placeholder="ex: 5">
            <label for="device">Périphérique :</label>
            <input type="text" id="device" name="device" placeholder="ex: cuda, cpu">
            <label>
              <input type="checkbox" id="parallel" name="parallel" value="true">
              Exécution parallèle
            </label>
          </fieldset>
          <button type="submit">Envoyer</button>
        </form>
      </li>
    </ul>
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