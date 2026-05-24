import { spawn, SpawnOptions } from 'child_process';
import os from 'os';
import path from 'path';

export interface CommandResult {
  output: string;
  exitCode: number | null;
}

const VERBOSE = process.env.CODELAUNCHER_VERBOSE === '1' || process.env.CODELAUNCHER_VERBOSE === 'true';

export async function runCommand(command: string, options: SpawnOptions = {}): Promise<CommandResult> {
  return new Promise(resolve => {
    const defaultOptions: SpawnOptions = {
      shell: true,
      cwd: path.join(os.homedir(), 'workspace'),
      stdio: 'pipe',
    };
    const mergedOptions = { ...defaultOptions, ...options };
    const child = spawn(command, [], mergedOptions);

    let commandOutput = '';

    child.stdout?.on('data', data => {
      const output = data.toString();
      commandOutput += output;
      if (VERBOSE) console.log('[STDOUT]:', output);
    });

    child.stderr?.on('data', data => {
      const error = data.toString();
      commandOutput += error;
      if (VERBOSE) console.error('[STDERR]:', error);
    });

    child.on('close', code => {
      if (VERBOSE) console.log(`Command exited with code ${code}`);
      resolve({
        output: commandOutput,
        exitCode: code,
      });
    });
  });
}
