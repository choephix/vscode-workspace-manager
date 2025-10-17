import { proxy, useSnapshot } from 'valtio';
import { apiService } from './apiService';

import { WorkspaceConfiguration, WorkspaceData } from '@code-launcher/data-types';
import { SmartBarFeature } from './smartbar/SmartBarFeatures';

interface State {
  isSomeActionRunning: boolean;
  uiState: {
    showTemplates: boolean;
  };
  activeSmartBarFeature: SmartBarFeature | null;
  //// Workspace State
  workspaces: WorkspaceData[];
  lastCommandOutput: string | null;
  stats: {
    cpuUsage: number | null;
    memUsage: number | null;
  };
  selectedEditorIndex: number;
  configuration: WorkspaceConfiguration | null;
  workspaceInfo: WorkspaceData['workspaceInfo'] | null;
  pathToWorkspaces: string | null;
}

export const store = proxy<State>({
  isSomeActionRunning: false,
  uiState: { showTemplates: false },
  activeSmartBarFeature: null,
  ////
  workspaces: [],
  lastCommandOutput: null,
  stats: {
    memUsage: 0,
    cpuUsage: 0,
  },
  selectedEditorIndex: 0,
  configuration: null,
  workspaceInfo: null,
  pathToWorkspaces: null,
});

export const actions = {
  updateStore: (data: Partial<State>) => {
    Object.assign(store, data);
  },
  refreshProjects: async () => {
    return await apiService.fetchProjects();
  },
  runCommand: async (command: string) => {
    return await apiService.runCommand(command);
  },
  setIsSomeActionRunning: (value: boolean) => {
    store.isSomeActionRunning = value;
  },
  clearCommandOutput: () => {
    store.lastCommandOutput = null;
  },
  toggleShowTemplates: () => {
    store.uiState.showTemplates = !store.uiState.showTemplates;
  },
  setActiveSmartBarFeature: (feature: SmartBarFeature | null) => {
    if (feature !== store.activeSmartBarFeature) {
      store.activeSmartBarFeature = feature;
    }
  },
};

export function useStore() {
  return useSnapshot(store);
}

Object.assign(globalThis, { store, actions });
