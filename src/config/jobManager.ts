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

    const process = spawn(job.command, [], { 
      shell: true,
      stdio: 'pipe'
    });

    job.process = process;

    process.stdout.on('data', (data: Buffer) => {
      const logLine = data.toString().trim();
      job.logs.push(logLine);
      this.emit('job-log', id, logLine);
      console.log(`[Job ${id}] stdout: ${logLine}`);
    });

    process.stderr.on('data', (data: Buffer) => {
      const logLine = data.toString().trim();
      job.logs.push(logLine);
      this.emit('job-log', id, logLine);
      console.log(`[Job ${id}] stderr: ${logLine}`);
    });

    process.on('close', (code: number) => {
      if (code === 0) {
        job.status = 'completed';
        this.emit('job-completed', id);
      } else {
        job.status = 'failed';
        job.error = `Process exited with code ${code}`;
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
}

// Singleton instance
export const jobManager = new JobManager();
export default jobManager; 