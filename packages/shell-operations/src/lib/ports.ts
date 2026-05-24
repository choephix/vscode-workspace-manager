import http from 'http';
import portscanner from 'portscanner';

interface PortInfo {
  port: number;
  contentType: string;
  status: number;
  title: string | null;
  favicon: string | null;
}

/**
 * Default scan window covers the common dev-server / proxy / preview ranges.
 * Scanning the full 1..65535 range was the previous default but it ran fully
 * sequentially and made every fresh call take minutes. Callers can still
 * pass explicit start/end to scan a wider window.
 */
const DEFAULT_START_PORT = 1024;
const DEFAULT_END_PORT = 19999;
const SCAN_CONCURRENCY = 64;

export async function scanOpenPorts(
  startPort: number = DEFAULT_START_PORT,
  endPort: number = DEFAULT_END_PORT
): Promise<PortInfo[]> {
  const allPorts: number[] = [];
  for (let port = startPort; port <= endPort; port++) allPorts.push(port);

  const openPorts: PortInfo[] = [];

  // Process in fixed-size parallel batches to bound concurrency without
  // pulling in p-limit just for this.
  for (let i = 0; i < allPorts.length; i += SCAN_CONCURRENCY) {
    const batch = allPorts.slice(i, i + SCAN_CONCURRENCY);
    const results = await Promise.all(batch.map(probePort));
    for (const result of results) {
      if (result) openPorts.push(result);
    }
  }

  return openPorts;
}

async function probePort(port: number): Promise<PortInfo | null> {
  try {
    const status = await portscanner.checkPortStatus(port, '127.0.0.1');
    if (status !== 'open') return null;
    return await checkHttpContent(port);
  } catch (error) {
    console.warn('⚠️ Error scanning port', port, error);
    return null;
  }
}

const FAVICON_REGEX = /<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["'][^>]*>/i;
const TITLE_REGEX = /<title>([\s\S]*?)<\/title>/i;

function checkHttpContent(port: number): Promise<PortInfo | null> {
  return new Promise(resolve => {
    const options: http.RequestOptions = {
      hostname: 'localhost',
      port,
      method: 'GET',
      timeout: 1000,
    };

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => {
        data += chunk;
      });
      res.on('end', () => {
        const contentType = res.headers['content-type'] || '';
        if (!contentType.includes('html') && !contentType.includes('json')) {
          resolve(null);
          return;
        }

        let title: string | null = null;
        let favicon: string | null = null;
        if (contentType.includes('html')) {
          title = data.match(TITLE_REGEX)?.[1] ?? null;
          favicon = data.match(FAVICON_REGEX)?.[1] ?? null;
        }

        resolve({
          port,
          contentType,
          status: res.statusCode || 0,
          title,
          favicon,
        });
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });

    req.end();
  });
}
