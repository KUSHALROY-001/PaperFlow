import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

let activeWorker = null;

export function startWorkerOnce() {
  if (activeWorker && !activeWorker.killed) {
    return {
      started: false,
      reason: "worker_already_running",
    };
  }

  // PYTHON_COMMAND lets deployments pin a specific interpreter path.
  // On Windows, "python" may not be on PATH - "py" (Python Launcher) is
  // the reliable fallback. We try "python" first (cross-platform default),
  // but the env var override handles any edge case.
  const pythonCommand = process.env.PYTHON_COMMAND || "python";
  const maxJobs = process.env.WORKER_UPLOAD_MAX_JOBS || "5";

  console.log(`[worker-runner] Spawning worker: ${pythonCommand} -m worker.worker --once --max-jobs ${maxJobs} (cwd: ${backendRoot})`);

  const worker = spawn(
    pythonCommand,
    ["-B", "-m", "worker.worker", "--once", "--max-jobs", maxJobs],
    {
      cwd: backendRoot,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );

  activeWorker = worker;

  worker.stdout.on("data", (data) => {
    console.log(`[worker] ${data.toString().trim()}`);
  });

  worker.stderr.on("data", (data) => {
    // Python writes import errors and tracebacks to stderr - log at error
    // level so they're visible even if the console is noisy.
    console.error(`[worker] ${data.toString().trim()}`);
  });

  worker.on("close", (code) => {
    if (code === 0) {
      console.log(`[worker] Finished successfully (exit code 0)`);
    } else {
      console.error(`[worker] Exited with code ${code} — check stderr above for details`);
    }
    if (activeWorker === worker) {
      activeWorker = null;
    }
  });

  worker.on("error", (error) => {
    console.error(
      `[worker] Failed to start Python process ("${pythonCommand}"): ${error.message}. ` +
      `Try setting PYTHON_COMMAND=py in backend/.env if you're on Windows.`
    );
    if (activeWorker === worker) {
      activeWorker = null;
    }
  });

  return {
    started: true,
    pid: worker.pid,
  };
}
