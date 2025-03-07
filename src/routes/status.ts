import { Router, Request, Response } from 'express';
import os from 'os';
import { execSync } from 'child_process';

const router = Router();

router.get('/status', (_req: Request, res: Response) => {
  let whisperVersion;
  try {
    whisperVersion = execSync('whisperx_cli --version', { encoding: 'utf8' }).trim();
  } catch (error) {
    whisperVersion = 'whisperx_cli introuvable ou ne fonctionne pas';
  }

  const platform = os.platform();
  let osName: string, computeType: string;
  switch(platform) {
    case 'win32':
      osName = 'windows';
      computeType = 'int8';
      break;
    case 'darwin':
      osName = 'mac';
      computeType = 'float16';
      break;
    case 'linux':
      osName = 'linux';
      computeType = 'float32';
      break;
    default:
      osName = platform;
      computeType = 'float16';
  }

  res.status(200).json({
    status: 'ok',
    whisperx_cli_version: whisperVersion,
    os: osName,
    recommended_compute: computeType
  });
});

export default router; 