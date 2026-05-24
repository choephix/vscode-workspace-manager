import os from 'os';

interface SystemStats {
  cpuUsage: number | null;
  memUsage: number | null;
}

/**
 * Returns CPU and memory usage as percentages (0..100), suitable
 * for direct rendering as bar widths.
 *
 * - `memUsage` is `(used / total) * 100`.
 * - `cpuUsage` is the 1-minute load average divided by the number of
 *   CPU cores, clamped to 100. This isn't a true "CPU %" but it's a
 *   reasonable single-number approximation that is bounded.
 */
export function getMemoryAndCPU(): SystemStats {
  try {
    return {
      cpuUsage: computeCpuPercent(),
      memUsage: computeMemPercent(),
    };
  } catch (error) {
    console.error(`🚨 Error getting system stats: ${error}`);
    return { cpuUsage: null, memUsage: null };
  }
}

export function getSystemInfo() {
  const platform = os.platform();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();

  const wslDistroName = process.env.WSL_DISTRO_NAME;
  const wslInterop = process.env.WSL_INTEROP;
  const isWSL = process.platform === 'linux' && Boolean(wslDistroName || wslInterop);

  return {
    platform,
    architecture: os.arch(),
    kernelVersion: os.release(),
    type: os.type(),
    userInfo: os.userInfo(),
    memTotal: totalMemory,
    memFree: freeMemory,
    memUsage: computeMemPercent(),
    cpuUsage: computeCpuPercent(),
    isWSL,
    wslDistroName,
    wslInterop,
  };
}

function computeMemPercent(): number {
  const total = os.totalmem();
  const free = os.freemem();
  if (!total) return 0;
  return ((total - free) / total) * 100;
}

function computeCpuPercent(): number {
  const load = os.loadavg()[0] ?? 0;
  const cores = os.cpus()?.length || 1;
  return Math.min(100, (load / cores) * 100);
}
