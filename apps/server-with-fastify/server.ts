const fastifyStatic = require('@fastify/static') as typeof import('@fastify/static');
const Fastify = require('fastify') as typeof import('fastify');
const path = require('path') as typeof import('path');
const fs = require('fs') as typeof import('fs');

const { parseCommandLineArgs, displayCommandLineHelp } = require('./lib/cmd-args') as typeof import('./lib/cmd-args');

import { fetchFaviconFromPaths, fetchFaviconFromHead } from './faviconUtils';

log('//// prod/dev:', process.env.NODE_ENV);
log('//// __dirname:', __dirname);

const cmdArgs = parseCommandLineArgs();
const verbose = cmdArgs.verbose || false;
const expose = cmdArgs.expose || false;

if (cmdArgs.help) {
  displayCommandLineHelp();
  process.exit(0);
}

function log(...args: any[]) {
  if (verbose) {
    console.log(...args);
  }
}

const workspacePathsRaw = cmdArgs.workspacePaths ||
  (process.env.CODELAUNCHER_WORKSPACE_PATH ?
    process.env.CODELAUNCHER_WORKSPACE_PATH.split(',').map(p => p.trim()).filter(p => p.length > 0) :
    ['..']);
const port = +(cmdArgs.port || process.env.CODELAUNCHER_PORT || 19001);

if (!workspacePathsRaw || workspacePathsRaw.length === 0) {
  console.error(
    'Workspace paths not given. Please provide a --workspace argument or set the CODELAUNCHER_WORKSPACE_PATH environment variable.'
  );
  throw process.exit(1);
}

log('//// Port:', port);
log('//// Workspace Paths:', workspacePathsRaw);

const workspacePaths = workspacePathsRaw.map(p => path.resolve(p));
log('//// Workspace Paths (resolved):', workspacePaths);

const fastify = Fastify({
  logger: verbose,
}) as import('fastify').FastifyInstance;

const pathsToServeMaybe = [path.join(__dirname, 'client')];
const pathsToServe = pathsToServeMaybe.filter(p => fs.existsSync(p));
log('//// Paths to serve statically?', pathsToServeMaybe);
if (pathsToServe.length > 0) {
  fastify.register(fastifyStatic, { root: pathsToServe, prefix: '/' });
}

// fastify.register(require('@fastify/websocket'));

type RequestWithIgnoreCache = import('fastify').FastifyRequest<{ Querystring: { ignoreCache?: string } }>;
type RequestWithCommand = import('fastify').FastifyRequest<{ Body: { command: string } }>;

// API routes
fastify.register(
  async fastify => {
    const {
      createCodeLauncherServerActions,
      createCodeLauncherServerExtraActions,
    } = //
      await import('@code-launcher/shell-operations');

    const stateActions = createCodeLauncherServerActions(workspacePaths);
    const extraActions = createCodeLauncherServerExtraActions(workspacePaths);

    //// Get Project Directories List
    fastify.get('/ls', async (request: RequestWithIgnoreCache) => {
      const ignoreCache = request.query.ignoreCache === 'true';
      console.log(`🔧 Fetching project directories${ignoreCache ? ' (ignoring cache)' : ''}`);
      return await stateActions.getProjectDirectoriesList(ignoreCache);
    });

    //// Run Shell Command
    fastify.post('/run-command', async (request: RequestWithCommand) => {
      const { command } = request.body;
      return await extraActions.runCommand(command);
    });

    //// Find Open Ports
    fastify.get('/find-open-ports', async (request: RequestWithIgnoreCache) => {
      const ignoreCache = request.query.ignoreCache === 'true';
      const allPorts = await extraActions.findOpenPorts(ignoreCache);
      const nonThisPorts = allPorts.filter(o => 'port' in o && o.port !== port);
      return nonThisPorts;
    });

    //// Proxy Favicon
    fastify.get(
      '/proxy-favicon/:port',
      async (
        request: import('fastify').FastifyRequest<{ Params: { port: number } }>,
        reply: import('fastify').FastifyReply
      ) => {
        const { port } = request.params;
        try {
          const [b1, b2] = await Promise.all([fetchFaviconFromPaths(port), fetchFaviconFromHead(port)]);
          const faviconBuffer = b1 || b2;
          // if (faviconBuffer) {
          reply.type('image/x-icon').send(faviconBuffer);
          // } else {
          //   throw new Error('Favicon not found');
          // }
        } catch (error) {
          // console.error(`❌ Error fetching favicon for port ${port}:`, error);
          reply.status(404).send(':(\n\nFavicon not found\n\n' + error);
        }
      }
    );
  },
  { prefix: '/api' }
);

const start = async () => {
  try {
    const host = expose ? '0.0.0.0' : 'localhost';
    await fastify.listen({ port, host });
    console.log(`🚀 Fastify server is running on ${host}:${port}`);
    if (expose) {
      console.log('⚠️ Server is exposed to the local network. Be cautious.');
    }
  } catch (err) {
    console.error(err);
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
