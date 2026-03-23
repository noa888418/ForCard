const path = require('node:path');
const { spawnSync } = require('node:child_process');

const builderCli = path.join(
  __dirname,
  '..',
  'node_modules',
  'electron-builder',
  'out',
  'cli',
  'cli.js',
);

const currentPath = process.env.PATH || '';
const repairedPath = [
  'C:\\Windows\\System32',
  'C:\\Windows',
  currentPath,
]
  .filter(Boolean)
  .join(';');

const args = [builderCli, ...process.argv.slice(2)];
const result = spawnSync(process.execPath, args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    PATH: repairedPath,
  },
});

if (typeof result.status === 'number') {
  process.exit(result.status);
}

process.exit(1);
