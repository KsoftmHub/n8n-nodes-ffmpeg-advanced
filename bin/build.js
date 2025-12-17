const esbuild = require('esbuild');

async function build() {
  try {
    await esbuild.build({
      entryPoints: ['src/FFmpeg.node.ts'],
      bundle: true,
      platform: 'node',
      outdir: 'dist',
      external: ['n8n-workflow'],
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
