import path from 'path';

import { CodeLauncherServerActionResult, WorkspaceData } from '@code-launcher/data-types';
import {
  getGitRepoDirectories as getGitRepositories,
  getProjectDirectoriesList,
  getVSCodeWorkspaceFiles,
  getWorkspaceConfiguration,
} from './lib/files';
import { scanOpenPorts } from './lib/ports';
import { runCommand } from './lib/shell';
import { getMemoryAndCPU, getSystemInfo } from './lib/system';
import { createCachedFunction } from './utils/caching';

async function getWorkspaceData(workspacePath: string): Promise<WorkspaceData> {
  const resolvedPath = path.resolve(workspacePath);

  const [configuration, rootDirectories, vscodeWorkspaceFiles, gitRepositories] = await Promise.all([
    getWorkspaceConfiguration(resolvedPath),
    getProjectDirectoriesList(resolvedPath).catch(() => []),
    getVSCodeWorkspaceFiles(resolvedPath).catch(() => []),
    getGitRepositories(resolvedPath).catch(() => []),
  ]);

  // Add workspace path identification to each item
  const workspaceInfo = {
    rootDirectories: rootDirectories.map(dir => ({ ...dir, workspacePath: resolvedPath })),
    vscodeWorkspaceFiles: vscodeWorkspaceFiles.map(file => ({ ...file, workspacePath: resolvedPath })),
    gitRepositories: gitRepositories.map(repo => ({ ...repo, workspacePath: resolvedPath })),
  };

  return {
    path: resolvedPath,
    configuration,
    workspaceInfo,
  };
}

export function createCodeLauncherServerActions(pathsToWorkspaces: string[]) {
  const resolvedPaths = pathsToWorkspaces.map(p => path.resolve(p));

  async function getTheStuff() {
    // console.log('🔍 Fetching workspace data...');
    const { cpuUsage, memUsage } = getMemoryAndCPU();
    const systemInfo = getSystemInfo();

    // Fetch data for all workspaces in parallel
    const workspaces = await Promise.all(
      resolvedPaths.map(workspacePath => getWorkspaceData(workspacePath))
    );

    // console.log('✅ Workspace data fetched successfully');
    return {
      workspaces,
      stats: { cpuUsage, memUsage },
      systemInfo,
      exitCode: null,
    };
  }

  const cachedGetTheStuff = createCachedFunction('getTheStuff', getTheStuff);
  cachedGetTheStuff.forceUpdate();

  return {
    getProjectDirectoriesList: async (ignoreCache: boolean = false) => {
      if (ignoreCache) {
        return await getTheStuff();
      }
      return await cachedGetTheStuff();
    },

    // runCommand: async (command: string) => {
    //   console.log(`🚀 Running command: ${command}`);
    //   const { output, exitCode } = await runCommand(command, {
    //     cwd: pathToWorkspaces,
    //   });
    //   const workspaceState = await cachedGetTheStuff();
    //   return {
    //     ...workspaceState,
    //     commandOutput: output,
    //     exitCode,
    //   };
    // },
  } satisfies Record<string, (...args: any[]) => Promise<CodeLauncherServerActionResult>>;
}

export function createCodeLauncherServerExtraActions(pathsToWorkspaces: string[]) {
  const resolvedPaths = pathsToWorkspaces.map(p => path.resolve(p));
  // Use the first workspace as the default for commands
  const defaultWorkspacePath = resolvedPaths[0];

  const cachedFindOpenPorts = createCachedFunction('scanOpenPorts', scanOpenPorts);
  cachedFindOpenPorts.forceUpdate();

  const handleError = (error: unknown) => {
    console.error('❌ Error scanning for open ports:', error);
    return [];
  };

  return {
    findOpenPorts: async (ignoreCache: boolean = false) => {
      if (ignoreCache) {
        return await scanOpenPorts().catch(handleError);
      }

      console.log('🔍 Scanning for open ports...');
      const result = await cachedFindOpenPorts().catch(handleError);
      console.log('✅ Port scan completed');
      return result;
    },

    runCommand: async (command: string, workspacePath?: string) => {
      const cwd = workspacePath ? path.resolve(workspacePath) : defaultWorkspacePath;
      console.log(`🚀 Running command: ${command} in ${cwd}`);
      const { output, exitCode } = await runCommand(command, {
        cwd,
      });

      return {
        commandOutput: output,
        exitCode,
      };
    },
  } satisfies Record<string, (...args: any[]) => Promise<any>>;
}

//// Experimental
// export * from './experimental/shell-stream';
export * from './experimental/hello-world';
export { runCommandStream } from './experimental/shell-iterative';
