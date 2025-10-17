import { useCallback } from 'react';
import { apiService } from '@/lib/apiService';
import { useStore, store } from '@/lib/store';

export const useOpenEditorAt = () => {
  const { configuration, selectedEditorIndex } = useStore();

  const openEditorAt = useCallback(
    async (project: string, workspacePath?: string) => {
      if (!configuration) {
        throw new Error('Configuration not loaded');
      }

      const editorCfg = configuration.editors[selectedEditorIndex];
      if (!editorCfg) {
        console.warn({ editors: configuration.editors, selectedEditorIndex });
        throw new Error('No editor configuration found');
      }

      // Use provided workspacePath or fall back to the first workspace path
      const targetWorkspacePath = workspacePath || store.pathToWorkspaces;
      if (!targetWorkspacePath) {
        throw new Error('No workspace path available');
      }

      if (editorCfg.urlTemplate) {
        const url = editorCfg.urlTemplate
          .replace('{path}', `${targetWorkspacePath}/${project}`)
          .replace('{address}', location.hostname);
        window.open(url, '_blank');
        return;
      }

      if (editorCfg.shellExecutable) {
        const command = `"${editorCfg.shellExecutable}" "${targetWorkspacePath}/${project}"`;
        await apiService.runCommand(command);
        return;
      }

      console.warn({ editorCfg });
      throw new Error('Editor configuration has neither urlTemplate nor shellExecutable');
    },
    [configuration, selectedEditorIndex]
  );

  return openEditorAt;
};
