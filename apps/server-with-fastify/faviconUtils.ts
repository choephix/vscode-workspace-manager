export interface FaviconResult {
  buffer: Buffer;
  contentType: string;
}

const CANDIDATE_PATHS = ['/favicon.ico', '/favicon.png', '/favicon.svg', '/favicon.jpg'];

export async function fetchFaviconFromPaths(port: number): Promise<FaviconResult | null> {
  for (const candidate of CANDIDATE_PATHS) {
    const url = `http://localhost:${port}${candidate}`;
    try {
      const response = await fetch(url);
      const contentType = response.headers.get('Content-Type') ?? '';
      if (response.ok && contentType.startsWith('image/')) {
        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength > 0) {
          console.log('✅ Favicon found at', url, contentType, 'for port', port);
          return { buffer: Buffer.from(arrayBuffer), contentType };
        }
      }
    } catch {
      // Network errors are non-fatal; try the next candidate.
    }
  }
  return null;
}

const LINK_ICON_REGEX = /<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["'][^>]*>/i;

export async function fetchFaviconFromHead(port: number): Promise<FaviconResult | null> {
  try {
    const response = await fetch(`http://localhost:${port}`);
    if (!response.ok) return null;

    const text = await response.text();
    const match = text.match(LINK_ICON_REGEX);
    if (!match) return null;

    const faviconUrl = match[1];
    const absoluteUrl = faviconUrl.startsWith('http') ? faviconUrl : `http://localhost:${port}${faviconUrl}`;
    const faviconResponse = await fetch(absoluteUrl);

    const contentType = faviconResponse.headers.get('Content-Type') ?? '';
    if (faviconResponse.ok && contentType.startsWith('image/')) {
      const arrayBuffer = await faviconResponse.arrayBuffer();
      if (arrayBuffer.byteLength > 0) {
        console.log('✅ Favicon found at', absoluteUrl, contentType, 'for port', port);
        return { buffer: Buffer.from(arrayBuffer), contentType };
      }
    }
  } catch {
    // Swallow — caller falls through to the next strategy / 404.
  }
  return null;
}
