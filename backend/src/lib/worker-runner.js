import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

let activeWorker = null;

export function startWorkerOnce() {
  if (activeWorker && !activeWorker.killed) {
    return {
      started: false,
      reason: 'worker_already_running',
    };
  }

  const pythonCommand = process.env.PYTHON_COMMAND || 'python';
  const maxJobs = process.env.WORKER_UPLOAD_MAX_JOBS || '5';
  const worker = spawn(
    pythonCommand,
    ['-B', '-m', 'worker.worker', '--once', '--max-jobs', maxJobs],
    {
      cwd: backendRoot,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    },
  );

  activeWorker = worker;

  worker.stdout.on('data', (data) => {
    console.log(`[worker] ${data.toString().trim()}`);
  });

  worker.stderr.on('data', (data) => {
    console.error(`[worker] ${data.toString().trim()}`);
  });

  worker.on('close', (code) => {
    console.log(`[worker] exited with code ${code}`);
    if (activeWorker === worker) {
      activeWorker = null;
    }
  });

  worker.on('error', (error) => {
    console.error(`[worker] failed to start: ${error.message}`);
    if (activeWorker === worker) {
      activeWorker = null;
    }
  });

  return {
    started: true,
    pid: worker.pid,
  };
}
