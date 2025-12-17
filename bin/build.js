const esbuild = require('esbuild');
const { dependencies = {}, peerDependencies = {} } = require('../package.json');

async function build() {
  try {
    const external = [
      ...Object.keys(dependencies),
      ...Object.keys(peerDependencies),
      'n8n-workflow',
    ];

    await esbuild.build({
      entryPoints: ['src/FFmpeg.node.ts'],
      bundle: true,
      platform: 'node',
      outdir: 'dist',
      external,
      sourcemap: true,
      minify: false,
    });
    console.log('Build successful!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
