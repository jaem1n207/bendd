module.exports = {
  '*.{js,jsx,ts,tsx}': ['eslint --fix', 'prettier --write'],
  '**/*.ts?(x)': () => 'pnpm check-types',
  '*.{md,mdx}': ['prettier --write'],
};
