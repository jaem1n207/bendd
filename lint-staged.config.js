module.exports = {
  '**/*.ts?(x)': () => 'pnpm check-types',
  '*.{md,mdx}': ['prettier --write'],
};
