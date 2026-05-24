import type { CodeLauncherServerActionResult } from '@code-launcher/data-types';

import { store } from './store';

type ApiResponse = CodeLauncherServerActionResult;

interface PortInfo {
  port: number;
  contentType: string;
  status: number;
  title: string | null;
  favicon: string | null;
}

const createApiService = (baseUrl: string) => {
  const fetchJson = async (url: string, options?: RequestInit): Promise<ApiResponse> => {
    const response = await fetch(`${baseUrl}${url}`, options);
    return (await response.json()) as ApiResponse;
  };

  const applyToStore = (data: ApiResponse) => {
    if (data.commandOutput !== undefined) store.lastCommandOutput = data.commandOutput;
    if (data.stats !== undefined) store.stats = { ...store.stats, ...data.stats };
    if (data.configuration !== undefined) store.configuration = data.configuration;
    if (data.pathToWorkspaces !== undefined) store.pathToWorkspaces = data.pathToWorkspaces;
    if (data.workspaceInfo !== undefined) store.workspaceInfo = data.workspaceInfo;
  };

  const fetchWithStats = async (url: string, options?: RequestInit): Promise<ApiResponse> => {
    const data = await fetchJson(url, options);
    applyToStore(data);
    return data;
  };

  return {
    /**
     * Kicks off a fast (cached) request and a slow (fresh) request in
     * parallel. The cached response lights up the UI quickly, then the
     * fresh data is applied to the store last — guaranteeing it wins
     * regardless of which physical response arrives first.
     */
    fetchProjects: async (): Promise<ApiResponse> => {
      const cachedPromise = fetchWithStats('/ls').catch(() => null);
      const freshPromise = fetchJson('/ls?ignoreCache=true');
      await cachedPromise;
      const fresh = await freshPromise;
      applyToStore(fresh);
      return fresh;
    },

    runCommand: async (command: string): Promise<ApiResponse> => {
      const result = await fetchWithStats('/run-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      // Refresh project list (fresh) after the command may have mutated the filesystem.
      fetchWithStats('/ls?ignoreCache=true').catch(() => undefined);
      return result;
    },

    findOpenPorts: async (): Promise<PortInfo[]> => {
      const response = await fetch(`${baseUrl}/find-open-ports`);
      const data: PortInfo[] = await response.json();
      return data;
    },
  };
};

export const apiService = createApiService('/api');
