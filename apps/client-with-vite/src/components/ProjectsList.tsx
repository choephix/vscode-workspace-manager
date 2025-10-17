'use client';

import { formatDistanceToNow } from 'date-fns';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  CodeIcon,
  FilesIcon,
  FolderIcon,
  GitBranchIcon,
  GithubIcon,
  GitPullRequestIcon,
  PackageIcon,
  PlusIcon,
  BoxSelectIcon,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { useOpenEditorAt } from '@/lib/hooks/useOpenEditorAt';
import { actions, useStore } from '@/lib/store';
import { ProjectsListTabType, useSelectedProjectsListTab } from '@/lib/hooks/useSelectedProjectsTab';

const showDirectoryLastModified = false;
const showDirectoryGitRepoIcon = false;
const showRepoStashes = false;
const showRepoCommitMessage = false;
const showRepoDatetime = false;
const showRepoBranch = true;

const ProjectsList: React.FC = () => {
  const { workspaceInfo, uiState, configuration } = useStore();
  const openEditorAt = useOpenEditorAt();

  const [activeTab, setActiveTab] = useSelectedProjectsListTab();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!configuration) return null;

  const onProjectClick = (project: string) => {
    openEditorAt(project);
  };

  const renderItemPrefix = (item: any) => {
    switch (activeTab) {
      case 'directories':
        switch (configuration?.ui?.projectDirectoriesPrefix) {
          case 'folderIcon':
            return <FolderIcon size={12} className="mr-2 text-gray-500" />;
          case 'backslash':
            return <span className="text-gray-500">/</span>;
          default:
            return null;
        }
      case 'gitRepos':
        switch (item.originDomain) {
          case 'github.com':
            return <GithubIcon size={12} className="mr-2 text-gray-500" />;
          default:
            return <GitPullRequestIcon size={12} className="mr-2 text-gray-500" />;
        }
      case 'codeWorkspaces':
        return <CodeIcon size={12} className="mr-2 text-gray-500" />;
    }
  };

  const renderItemSuffix = (item: any) => {
    if (activeTab === 'gitRepos') {
      if (!item.status) {
        return null;
      }

      return (
        <span className="flex items-center text-xs space-x-2 ml-2 text-slate-600" title={item.status.lastCommitMessage}>
          {showRepoBranch && (
            <span className="flex items-center">
              <GitBranchIcon size={12} className="mr-1" />
              {item.status.branch}
            </span>
          )}
          {showRepoCommitMessage && (
            <span className="flex items-center overflow-hidden" title={item.status.lastCommitMessage}>
              <span className="truncate max-w-[150px]">{item.status.lastCommitMessage}</span>
            </span>
          )}
        </span>
      );
    }
    return null;
  };

  const renderRightPart = (item: any) => {
    if (activeTab === 'gitRepos') {
      if (!item.status) {
        return null;
      }

      return (
        <span className="flex items-center text-xs space-x-2">
          {showRepoDatetime && (
            <span className="flex items-center text-slate-600" title={`Last commit: ${item.status.lastCommitMessage}`}>
              {formatDistanceToNow(new Date(item.status.lastCommitDate), {
                addSuffix: true,
              })}
            </span>
          )}
          {showRepoStashes && item.status.stashes > 0 && (
            <span className="flex items-center text-slate-500" title="Stashes">
              <BoxSelectIcon size={12} className="mr-1" />
              {item.status.stashes}
            </span>
          )}
          {item.status.behind > 0 && (
            <span className="flex items-center text-slate-400" title="Commits behind remote">
              <ArrowDownIcon size={12} className="mr-1" />
              {item.status.behind}
            </span>
          )}
          {item.status.ahead > 0 && (
            <span className="flex items-center text-green-400" title="Commits ahead of remote">
              <ArrowUpIcon size={12} className="mr-1" />
              {item.status.ahead}
            </span>
          )}
          {item.status.unstagedChanges > 0 && (
            <span className="flex items-center text-yellow-400" title="Unstaged changes">
              <FilesIcon size={12} className="mr-1" />
              {item.status.unstagedChanges}
            </span>
          )}
          {item.status.stagedChanges > 0 && (
            <span className="flex items-center text-red-400" title="Staged changes">
              <PackageIcon size={12} className="mr-1" />
              {item.status.stagedChanges}
            </span>
          )}
        </span>
      );
    }

    if (activeTab === 'directories' && item.lastModified) {
      return (
        <>
          {showDirectoryLastModified && (
            <span className="text-slate-700 text-xs" title={new Date(item.lastModified).toLocaleString()}>
              {formatDistanceToNow(new Date(item.lastModified), {
                addSuffix: true,
              })}
            </span>
          )}
          {showDirectoryGitRepoIcon && item.isGitRepo && <GitBranchIcon size={14} className="text-slate-500 mr-2" />}
          <span className="text-blue-400 text-xs ml-2">→</span>
        </>
      );
    }

    return <span className="text-blue-400 text-xs ml-2">→</span>;
  };

  const renderCodeWorkspacePath = (path: string) => {
    // Split the path into directory and filename
    const lastSlashIndex = path.lastIndexOf('/');
    const directory = lastSlashIndex !== -1 ? path.substring(0, lastSlashIndex + 1) : '';
    const filenameWithExt = lastSlashIndex !== -1 ? path.substring(lastSlashIndex + 1) : path;
    
    // Split filename and extension
    const lastDotIndex = filenameWithExt.lastIndexOf('.');
    const filename = filenameWithExt.substring(0, lastDotIndex);
    const extension = filenameWithExt.substring(lastDotIndex);

    return (
      <span className="flex items-center">
        {directory && <span className="text-gray-400">{directory}</span>}
        <span className="font-semibold mx-1 text-gray-100">{filename}</span>
        <span className="opacity-25">{extension}</span>
      </span>
    );
  };

  const renderItemContent = (item: any) => {
    if (activeTab === 'codeWorkspaces') {
      return renderCodeWorkspacePath(item.relativePath);
    }
    return item.relativePath;
  };

  const renderTabContent = () => {
    if (!workspaceInfo) return null;

    const itemsMap = {
      directories: workspaceInfo.rootDirectories,
      gitRepos: workspaceInfo.gitRepositories,
      codeWorkspaces: workspaceInfo.vscodeWorkspaceFiles,
    } satisfies Record<ProjectsListTabType, readonly any[]>;

    const items = itemsMap[activeTab];

    return (
      <ul className="">
        {items.length > 0 ? (
          items.map((item, index) => (
            <li
              key={`${activeTab}|${item.absolutePath}`}
              className="animate-fade-in-left opacity-0 border-b border-gray-700"
              style={{
                animationDelay: `${index * 16.67}ms`,
                animationFillMode: 'forwards',
              }}
            >
              <button
                className="w-full text-left py-1 px-2 text-gray-300 hover:text-white hover:bg-gray-800 transition duration-300 hover:duration-0 flex justify-between items-center text-sm"
                onClick={() => onProjectClick(item.relativePath)}
              >
                <span className="flex items-center">
                  {renderItemPrefix(item)}
                  {renderItemContent(item)}
                  {renderItemSuffix(item)}
                </span>
                <span className="flex items-center">{renderRightPart(item)}</span>
              </button>
            </li>
          ))
        ) : (
          <div className="flex items-center justify-center py-4 border-b border-gray-700">
            <p>No items found.</p>
          </div>
        )}
      </ul>
    );
  };

  const tabLabels: Record<ProjectsListTabType, string> = {
    directories: 'directories',
    gitRepos: 'repositories',
    codeWorkspaces: '.code-workspaces',
  } satisfies Record<ProjectsListTabType, string>;

  const toggleDropdown = () => setIsOpen(!isOpen);

  const selectOption = (option: ProjectsListTabType) => {
    setActiveTab(option);
    setIsOpen(false);
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center py-2 px-2 border-b border-gray-700">
        <div className="text-sm text-gray-400 flex items-center">
          Existing project&nbsp;
          <div className="relative group" ref={dropdownRef}>
            <button
              onClick={toggleDropdown}
              className="appearance-none bg-transparent text-gray-300 pr-4 focus:outline-none cursor-pointer"
            >
              {tabLabels[activeTab]}
              <ChevronDownIcon className="absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-3 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </button>
            {isOpen && (
              <div className="absolute left-0 mt-1 min-w-[120px] max-w-[200px] bg-gray-800 border border-gray-700 rounded shadow-lg z-10">
                {Object.entries(tabLabels).map(([tab, label]) => (
                  <button
                    key={tab}
                    onClick={() => selectOption(tab as ProjectsListTabType)}
                    className="block w-full text-left px-2 py-1 text-gray-300 hover:bg-gray-700 focus:outline-none whitespace-nowrap overflow-hidden text-ellipsis"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={actions.toggleShowTemplates}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors duration-200 flex items-center"
        >
          {uiState.showTemplates ? (
            'Hide Templates'
          ) : (
            <>
              <PlusIcon size={14} className="mr-1" />
              Create
            </>
          )}
        </button>
      </div>

      {workspaceInfo === null ? (
        <div className="flex items-center justify-center py-4 border-b border-gray-700">
          <div className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 mr-2"></div>
          <span className="text-xs text-gray-400">Loading...</span>
        </div>
      ) : (
        renderTabContent()
      )}
    </div>
  );
};

// const renderItemRightPart = () => {
//   const { selectedEditor } = useSelectedEditor();

//   if (!selectedEditor) return null;
//   return <span className="text-blue-400 text-xs">Open in {selectedEditor?.name}</span>;
// };

export default ProjectsList;
