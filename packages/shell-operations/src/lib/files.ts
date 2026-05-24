import { execFile } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import util from 'util';
import YAML from 'yaml';

import type { WorkspaceConfiguration } from '@code-launcher/data-types';
import { defaultConfigYaml } from '../data/defaultConfigYaml';

export async function getProjectDirectoriesList(workspacePath: string) {
  try {
    const directoryNames = await fs.readdir(workspacePath, {
      withFileTypes: true,
    });
    const projectDirs = [];

    for (const entry of directoryNames) {
      if (entry.isDirectory() && !entry.name.startsWith('.') && !shouldIgnoreDirectory(entry.name)) {
        const dirPath = path.join(workspacePath, entry.name);
        const lastModified = await getLastModifiedTime(dirPath);
        const isGitRepo = await checkIfGitRepo(dirPath);
        projectDirs.push({
          dirName: entry.name,
          relativePath: entry.name,
          absolutePath: path.resolve(workspacePath, entry.name),
          lastModified,
          isGitRepo,
        });
      }
    }

    console.log(`📂 Found ${projectDirs.length} project directories`);
    return projectDirs;
  } catch (error) {
    console.error(`🚨 Error reading directory: ${error}`);
    return [];
  }
}

async function checkIfGitRepo(dirPath: string): Promise<boolean> {
  try {
    const gitDir = path.join(dirPath, '.git');
    await fs.access(gitDir);
    return true;
  } catch {
    return false;
  }
}

async function getLastModifiedTime(dirPath: string): Promise<number> {
  // return 0;

  let latestMtime = 0;

  async function traverse(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !shouldIgnoreDirectory(entry.name)) {
        await traverse(fullPath);
      } else if (entry.isFile()) {
        const stats = await fs.stat(fullPath);
        latestMtime = Math.max(latestMtime, stats.mtimeMs);
      }
    }
  }

  await traverse(dirPath);
  return latestMtime;
}

//// //// //// //// //// //// //// //// //// //// //// //// //// //// //// //// //// //// //// ////

const IGNORED_PATTERNS = [
  // Package managers
  /^(?:node_modules|bower_components|jspm_packages|packages)$/,

  // Version control
  /^\.(?:git|svn|hg|bzr|fossil)$/,

  // Build outputs and caches
  /^(?:dist|build|target|out|bin|obj|lib|es|publish)$/,
  /^\.(?:next|nuxt|vuepress|docusaurus|gatsby-cache)$/,
  /^(?:\.cache|\.output|\.parcel-cache)$/,

  // Temporary and log files
  /^(?:tmp|temp|logs?|coverage|test-results)$/,

  // Vendor directories
  /^(?:vendor|third-party)$/,

  // Custom ignore pattern
  /^\.ignore-.+/,

  // Cursor/VSCode server directories
  /^\.(?:vscode-server|cursor-server)$/,
];

function shouldIgnoreDirectory(name: string): boolean {
  return IGNORED_PATTERNS.some(pattern => pattern.test(name));
}

export async function getVSCodeWorkspaceFiles(workspacePath: string) {
  const workspaceFiles: { relativePath: string; absolutePath: string }[] = [];

  async function traverse(dir: string) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !shouldIgnoreDirectory(entry.name)) {
          await traverse(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.code-workspace')) {
          workspaceFiles.push({
            relativePath: path.relative(workspacePath, fullPath),
            absolutePath: fullPath,
          });
        }
      }
    } catch (error) {
      const errorString = 'message' in (error as Error) ? (error as Error).message : String(error);
      console.warn('🚨 Error traversing directory:', dir, errorString);
    }
  }

  await traverse(workspacePath);
  return workspaceFiles;
}

async function getGitRemoteDomain(gitRepoPath: string): Promise<string | null> {
  try {
    const gitConfigPath = path.join(gitRepoPath, '.git', 'config');
    const configContent = await fs.readFile(gitConfigPath, 'utf-8');

    // Regular expression to match the remote origin URL
    const remoteOriginRegex = /\[remote "origin"\][\s\S]*?url = (.+)/;
    const match = configContent.match(remoteOriginRegex);

    if (match && match[1]) {
      const url = match[1].trim();

      // Extract domain from URL
      const domainRegex = /(?:https?:\/\/)?(?:www\.)?([^\/]+)/i;
      const domainMatch = url.match(domainRegex);

      if (domainMatch && domainMatch[1]) {
        let domain = domainMatch[1].toLowerCase();
        domain = domain.replace(/^.*@/, '');
        domain = domain.replace(/:[^:]*$/, '');
        return String(domain);
      }
    }

    return null; // No remote origin found or couldn't extract domain
  } catch (error) {
    console.error('Error reading git config:', error);
    return null;
  }
}

async function getGitStatus(repoPath: string, autoFetchAll: boolean = false) {
  try {
    const execFilePromise = util.promisify(execFile);

    if (autoFetchAll) {
      // console.log('🔄 Fetching latest changes at', repoPath);
      await execFilePromise('git', ['fetch'], { cwd: repoPath });
    }

    const [statusOutput, branchOutput, lastCommitOutput, stashOutput] = await Promise.all([
      execFilePromise('git', ['status', '-sb'], { cwd: repoPath }),
      execFilePromise('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
        cwd: repoPath,
      }),
      execFilePromise('git', ['log', '-1', '--pretty=format:%h|%ad|%s'], {
        cwd: repoPath,
      }).catch(() => ({
        stdout: '||',
      })),
      execFilePromise('git', ['stash', 'list'], { cwd: repoPath }),
    ]);

    const currentBranch = branchOutput.stdout.trim();

    let ahead = 0;
    let behind = 0;

    try {
      const [aheadOutput, behindOutput] = await Promise.all([
        execFilePromise('git', ['rev-list', `origin/${currentBranch}..${currentBranch}`, '--count'], { cwd: repoPath }),
        execFilePromise('git', ['rev-list', `${currentBranch}..origin/${currentBranch}`, '--count'], { cwd: repoPath }),
      ]);
      ahead = parseInt(aheadOutput.stdout.trim(), 10);
      behind = parseInt(behindOutput.stdout.trim(), 10);
    } catch (error) {
      console.warn(`Unable to determine ahead/behind status for ${repoPath}: ${error}`);
    }

    const unstagedMatch = statusOutput.stdout.match(/\n\s*M\s/g);
    const stagedMatch = statusOutput.stdout.match(/\n\w/g);

    const [lastCommitHash, lastCommitDate, lastCommitMessage] = lastCommitOutput.stdout.split('|');

    return {
      ahead,
      behind,
      branch: currentBranch,
      lastCommitHash,
      lastCommitDate,
      lastCommitMessage,
      unstagedChanges: unstagedMatch ? unstagedMatch.length : 0,
      stagedChanges: stagedMatch ? stagedMatch.length : 0,
      stashes: stashOutput.stdout.split('\n').filter(Boolean).length,
    };
  } catch (error) {
    console.error('🚨 Error getting git status:', error);
    return null;
  }
}

export async function getGitRepoDirectories(workspacePath: string) {
  const gitRepos: {
    relativePath: string;
    absolutePath: string;
    originDomain: string | null;
    status: Awaited<ReturnType<typeof getGitStatus>>;
  }[] = [];

  async function traverse(dir: string) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const isGitRepo = entries.some(entry => entry.name === '.git' && entry.isDirectory());
      if (isGitRepo) {
        const relativePath = path.relative(workspacePath, dir);
        const absolutePath = path.resolve(workspacePath, dir);
        const originDomain = await getGitRemoteDomain(absolutePath);
        const status = await getGitStatus(absolutePath);
        gitRepos.push({
          relativePath,
          absolutePath,
          originDomain,
          status,
        });
        // console.log(`📊 Git repo found: ${relativePath}, Status: ${JSON.stringify(status)}`);
        return; // Don't traverse further if it's a git repo
      }

      for (const entry of entries) {
        if (entry.isDirectory() && !shouldIgnoreDirectory(entry.name)) {
          await traverse(path.join(dir, entry.name));
        }
      }
    } catch (error) {
      const errorString = 'message' in (error as Error) ? (error as Error).message : String(error);
      console.warn('🚨 Error traversing directory:', dir, errorString);
    }
  }

  await traverse(workspacePath);

  return gitRepos;
}

//// //// //// //// //// //// //// //// //// //// //// //// //// //// //// //// //// //// //// ////

export async function getWorkspaceConfiguration(workspacePath: string): Promise<WorkspaceConfiguration> {
  try {
    const configFilePath = path.resolve(workspacePath, '.code-launcher.yaml');
    const configFileContent = await loadConfigFileContent(configFilePath, false);
    const configuration = YAML.parse(configFileContent);
    return configuration;
  } catch (error) {
    console.error(`⚠️ Error reading workspace configuration: ${error}. Falling back to bundled defaults.`);
    try {
      return YAML.parse(defaultConfigYaml) as WorkspaceConfiguration;
    } catch {
      return {
        ui: { projectDirectoriesPrefix: null },
        editors: [],
        templates: [],
      };
    }
  }
}

async function loadConfigFileContent(configFilePath: string, writeIfMissing: boolean): Promise<string> {
  try {
    const configFileContent = await fs.readFile(configFilePath, 'utf8');
    return configFileContent;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }

    if (writeIfMissing) {
      await fs.writeFile(configFilePath, defaultConfigYaml, 'utf8');
    }

    return defaultConfigYaml;
  }
}
