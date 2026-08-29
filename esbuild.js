const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

const watchNotifyPlugin = {
  name: 'watch-notify',
  setup(build) {
    build.onStart(() => console.log('[watch] build started'));
    build.onEnd(() => console.log('[watch] build finished'));
  },
};

const shared = {
  bundle: true,
  minify: production,
  sourcemap: !production,
  logLevel: 'info',
  plugins: [watchNotifyPlugin],
};

const builds = [
  {
    ...shared,
    entryPoints: ['src/extension.ts'],
    format: 'cjs',
    platform: 'node',
    outfile: 'dist/extension.js',
    external: ['vscode'],
  },
  {
    // The dashboard webview runs in a browser context with no module loader and
    // no access to any Node or VS Code API.
    ...shared,
    entryPoints: ['src/webview/main.ts'],
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    outfile: 'dist/webview.js',
  },
];

async function main() {
  const contexts = await Promise.all(builds.map((options) => esbuild.context(options)));

  if (watch) {
    await Promise.all(contexts.map((ctx) => ctx.watch()));
  } else {
    await Promise.all(contexts.map((ctx) => ctx.rebuild()));
    await Promise.all(contexts.map((ctx) => ctx.dispose()));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
