import { ChildProcess, spawn } from 'child_process';
import { EventEmitter } from 'events';

export interface Job {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  command: string;
  process: ChildProcess | null;
  logs: string[];
  result: any;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
  outputPath?: string;
  outputFormat?: string;
}

class JobManager extends EventEmitter {
  private jobs: Map<string, Job> = new Map();

  constructor() {
    super();
  }

  createJob(id: string, command: string, outputPath?: string, outputFormat?: string): Job {
    const job: Job = {
      id,
      status: 'pending',
      command,
      process: null,
      logs: [],
      result: null,
      error: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      outputPath,
      outputFormat
    };

    this.jobs.set(id, job);
    this.addJobLog(id, "Job créé et en attente de démarrage");
    return job;
  }

  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  getAllJobs(): Job[] {
    return Array.from(this.jobs.values());
  }

  startJob(id: string): void {
    const job = this.jobs.get(id);
    if (!job) {
      throw new Error(`Job with id ${id} not found`);
    }

    job.status = 'running';
    job.updatedAt = new Date();
    
    this.addJobLog(id, "Préparation du traitement audio...");
    this.addJobLog(id, "Initialisation du processus WhisperX...");

    const childProcess = spawn(job.command, [], { 
      shell: true,
      stdio: 'pipe',
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });

    job.process = childProcess;
    this.addJobLog(id, "Processus WhisperX démarré");

    childProcess.stdout.on('data', (data: Buffer) => {
      const logLines = data.toString().split('\n').filter(line => line.trim());
      logLines.forEach(logLine => {
        this.addJobLog(id, logLine.trim());
      });
    });

    childProcess.on('close', (code: number) => {
      if (code === 0) {
        job.status = 'completed';
        this.addJobLog(id, "Traitement terminé avec succès");
        this.emit('job-completed', id);
      } else {
        job.status = 'failed';
        job.error = `Process exited with code ${code}`;
        this.addJobLog(id, `Échec du traitement: code d'erreur ${code}`);
        this.emit('job-failed', id, job.error);
      }
      job.updatedAt = new Date();
    });
  }

  removeJob(id: string): boolean {
    return this.jobs.delete(id);
  }

  getJobLogs(id: string): string[] {
    const job = this.jobs.get(id);
    if (!job) {
      throw new Error(`Job with id ${id} not found`);
    }
    return job.logs;
  }

  getLastLog(id: string): string | null {
    const job = this.jobs.get(id);
    if (!job || job.logs.length === 0) {
      return null;
    }
    return job.logs[job.logs.length - 1];
  }

  addJobLog(id: string, message: string): void {
    const job = this.jobs.get(id);
    if (!job) return;
    
    const timestamp = new Date().toISOString();
    const formattedLog = `[${timestamp}] ${message}`;
    
    job.logs.push(formattedLog);
    this.emit('job-log', id, formattedLog);
    console.log(`[Job ${id}] ${message}`);
  }
}

// Singleton instance
export const jobManager = new JobManager();
export default jobManager; 