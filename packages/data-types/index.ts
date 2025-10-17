export interface WorkspaceConfiguration {
  ui: {
    projectDirectoriesPrefix: 'folderIcon' | 'backslash' | null;
  };
  editors: {
    name: string;
    shellExecutable?: string;
    urlTemplate?: string;
  }[];
  templates: {
    name: string;
    icon: string;
    command: string;
  }[];
}

export interface WorkspaceData {
  path: string;
  configuration: WorkspaceConfiguration;
  workspaceInfo: {
    rootDirectories: {
      workspacePath: string;
      dirName: string;
      relativePath: string;
      absolutePath: string;
      lastModified: number;
      isGitRepo: boolean;
    }[];
    vscodeWorkspaceFiles: {
      workspacePath: string;
      relativePath: string;
      absolutePath: string;
    }[];
    gitRepositories: {
      workspacePath: string;
      relativePath: string;
      absolutePath: string;
      originDomain: string | null;
      status: {
        ahead: number;
        behind: number;
        branch: string;
        lastCommitHash: string;
        lastCommitDate: string;
        lastCommitMessage: string;
        unstagedChanges: number;
        stagedChanges: number;
        stashes: number;
      } | null;
    }[];
  };
}

export interface CodeLauncherServerActionResult {
  workspaces: WorkspaceData[];
  stats?: {
    cpuUsage: number | null;
    memUsage: number | null;
  };
  systemInfo?: {
    platform: string;
    architecture: string;
    kernelVersion: string;
    type: string;
    userInfo: {
      username: string;
      uid: number;
      gid: number;
      shell: string | null;
      homedir: string;
    };
    memTotal: number;
    memFree: number;
    memUsage: number;
    cpuUsage: number;
    isWSL: boolean;
    wslDistroName?: string;
    wslInterop?: string;
  };
  commandOutput?: string;
  exitCode: number | null;
}
