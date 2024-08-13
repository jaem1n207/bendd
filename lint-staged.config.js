const path = require('path');

const buildEslintCommand = filenames =>
  `next lint --fix --file ${filenames
    .map(f => path.relative(process.cwd(), f))
    .join(' --file ')}`;

module.exports = {
  '**/*.ts?(x)': () => 'pnpm check-types',
  '*.{md,mdx}': ['prettier --write'],
};
