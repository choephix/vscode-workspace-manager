# Multiple Workspaces Support

This document describes the new multiple workspaces feature that has been implemented in the code-launcher application.

## Usage

### Command Line

You can now specify multiple workspace paths using comma-separated values:

```bash
# Single workspace (existing behavior)
node server.js --workspace ~/workspace

# Multiple workspaces (new feature)
node server.js --workspace ~/workspace,~/noodlespace,~/hobbyprojects

# With spaces (automatically trimmed)
node server.js --workspace "~/workspace, ~/noodlespace, ~/hobbyprojects"

# Short flag also works
node server.js -w ~/workspace,~/noodlespace,~/hobbyprojects
```

### Environment Variable

You can also set multiple workspaces via environment variable:

```bash
export CODELAUNCHER_WORKSPACE_PATH="~/workspace,~/noodlespace,~/hobbyprojects"
node server.js
```

## Changes Made

### 1. Command Line Argument Parsing (`apps/server-with-fastify/lib/cmd-args.ts`)
- Changed `workspacePath` to `workspacePaths` (array)
- Added comma-splitting logic with whitespace trimming
- Updated help text with examples

### 2. Data Types (`packages/data-types/index.ts`)
- Added new `WorkspaceData` interface
- Updated `CodeLauncherServerActionResult` to contain `workspaces` array
- Added `workspacePath` identification to all workspace items

### 3. Shell Operations (`packages/shell-operations/src/`)
- Modified functions to accept array of workspace paths
- Added `getWorkspaceData` function for individual workspace processing
- Aggregate results from all workspaces with proper identification
- Updated both main and extra actions to handle multiple workspaces

### 4. Server Logic (`apps/server-with-fastify/server.ts`)
- Updated to handle multiple workspace paths from arguments and environment
- Modified action creation to pass workspace arrays

### 5. Client State Management (`apps/client-with-vite/src/lib/`)
- Updated store to handle `workspaces` array instead of single workspace
- Modified API service to work with new data structure

## Data Structure

The new API response structure looks like this:

```typescript
{
  workspaces: [
    {
      path: "/home/user/workspace",
      configuration: { /* workspace config */ },
      workspaceInfo: {
        rootDirectories: [
          {
            workspacePath: "/home/user/workspace",
            dirName: "project1",
            relativePath: "project1",
            absolutePath: "/home/user/workspace/project1",
            // ... other properties
          }
        ],
        vscodeWorkspaceFiles: [ /* with workspacePath */ ],
        gitRepositories: [ /* with workspacePath */ ]
      }
    },
    {
      path: "/home/user/noodlespace",
      // ... similar structure for second workspace
    }
  ],
  stats: { /* system stats */ },
  systemInfo: { /* system info */ },
  exitCode: null
}
```

## Backward Compatibility

- Single workspace usage continues to work exactly as before
- Environment variable `CODELAUNCHER_WORKSPACE_PATH` supports both single and comma-separated values
- All existing functionality is preserved

## Benefits

1. **Multi-project Management**: Manage projects across different root directories
2. **Organized Workspaces**: Keep different types of projects (work, personal, experiments) separate
3. **Unified Interface**: View and manage all your workspaces from a single interface
4. **Flexible Configuration**: Each workspace can have its own `.code-launcher.yaml` configuration

## Example Use Cases

- **Work/Personal Separation**: `--workspace ~/work-projects,~/personal-projects`
- **Technology Stacks**: `--workspace ~/web-projects,~/mobile-projects,~/data-science`
- **Client Projects**: `--workspace ~/client-a,~/client-b,~/internal-tools`
