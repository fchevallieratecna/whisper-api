import { spawn } from 'child_process';
import path from 'path';
import config from '../config';

export interface DiarizationOptions {
  parallel?: boolean;
  whisperModel?: string;
  language?: string;
  noStem?: boolean | string;
  suppressNumerals?: boolean | string;
  batchSize?: number;
  device?: string;
}

function buildPythonArgs(filePath: string, options: DiarizationOptions): string[] {
  const scriptName = options.parallel ? 'diarize_parallel.py' : 'diarize.py';
  const scriptPath = path.join(config.whisperPath, scriptName);
  const args = [scriptPath, '-a', filePath];

  if (options.whisperModel) args.push('--whisper-model', options.whisperModel);
  if (options.language) args.push('--language', options.language);
  if (options.noStem === true || options.noStem === 'true') args.push('--no-stem');
  if (options.suppressNumerals === true || options.suppressNumerals === 'true') args.push('--suppress_numerals');
  if (options.batchSize) args.push('--batch-size', options.batchSize.toString());
  if (options.device) args.push('--device', options.device);

  return args;
}

/**
 * Exécute le script Python de diarisation audio.
 *
 * @param {string} filePath - Chemin vers le fichier audio.
 * @param {DiarizationOptions} [options={}] - Options de configuration pour la diarisation.
 * @returns {Promise<string>} - Promesse résolue avec la sortie du script Python ou rejetée en cas d'erreur.
 */
export function executeDiarizationProcess(filePath: string, options: DiarizationOptions = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const pythonInterpreter = path.join(config.whisperPath, 'venv/bin/python');
    const args = buildPythonArgs(filePath, options);
    const completeCommand = [pythonInterpreter, ...args].join(' ');
    console.log(
      `\n\x1b[1m\x1b[33m==== COMMANDE PYTHON ====\n${completeCommand}\n===========================\x1b[0m\n`
    );
    const pyProc = spawn(pythonInterpreter, args, { cwd: config.whisperPath });
    let outputBuffer = '';

    pyProc.stdout.on('data', data => {
      outputBuffer += data.toString();
    });

    pyProc.stderr.on('data', data => {
      console.error("[Python stderr]", data.toString());
    });

    pyProc.on('error', err => reject(new Error(`Erreur lors de l'exécution du processus Python: ${err.message}`)));

    pyProc.on('close', code => {
      code === 0 ? resolve(outputBuffer) : reject(new Error(`Processus terminé avec le code ${code}`));
    });
  });
}

module.exports = { executeDiarizationProcess };