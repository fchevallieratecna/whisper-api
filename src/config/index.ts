import dotenv from 'dotenv';
dotenv.config();

const config = {
  port: Number(process.env.PORT) || 3000,
  uploadPath: process.env.UPLOAD_PATH || 'uploads'
};

export default config; 