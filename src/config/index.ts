import dotenv from 'dotenv';
dotenv.config();

const config = {
  port: Number(process.env.PORT) || 3000,
  uploadPath: process.env.UPLOAD_PATH || 'uploads',
  whisperPath: process.env.WHISPER_PATH || ''
};

if (!config.whisperPath) {
  throw new Error("Variable d'environnement WHISPER_PATH non définie.");
}

export default config; 