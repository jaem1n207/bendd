// Legacy manual entry point. Font processing never runs in dev/build.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

execFileSync(
  process.env.FONT_PYTHON || 'python3',
  ['scripts/optimize-fonts.py', ...process.argv.slice(2)],
  {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    stdio: 'inherit',
  }
);
