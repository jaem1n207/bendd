import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

const root = fileURLToPath(new URL('../', import.meta.url));

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(entry => {
      const file = path.join(directory, entry.name);
      return entry.isDirectory() ? filesIn(file) : [file];
    })
  );
  return files.flat().sort();
}

// Include interaction states as well as the initial render. Article frontmatter
// covers featured-title changes without adding the much larger article bodies.
const homeFiles = (
  await Promise.all(
    ['home', 'profile'].map(domain =>
      filesIn(path.join(root, 'src/components', domain))
    )
  )
)
  .flat()
  .filter(file => /\.(ts|tsx)$/.test(file) && !/\.(spec|test)\./.test(file));
const contentFiles = (await filesIn(path.join(root, 'content'))).filter(file =>
  file.endsWith('.mdx')
);
const sources = await Promise.all(
  [...homeFiles, path.join(root, 'src/lib/site-metadata.ts')].map(file =>
    readFile(file, 'utf8')
  )
);
const frontmatter = await Promise.all(
  contentFiles.map(async file => {
    const source = await readFile(file, 'utf8');
    return source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1] ?? '';
  })
);
const ascii = Array.from({ length: 95 }, (_, index) =>
  String.fromCodePoint(index + 32)
).join('');
const characters = Array.from(
  new Set([ascii, ...sources, ...frontmatter].join('').normalize('NFC'))
)
  .sort()
  .join('');

const original = await readFile(
  path.join(root, 'src/app/fonts/PretendardVariable.woff2')
);
const subset = await subsetFont(original, characters, {
  targetFormat: 'woff2',
  // Preserve the variable weight axis and the embedded license metadata.
  preserveNameIds: [0, 13, 14],
});
const output = path.join(root, 'src/app/fonts/PretendardHome.woff2');
const previous = await readFile(output).catch(error => {
  if (error.code !== 'ENOENT') {
    throw error;
  }
  return null;
});
if (!previous?.equals(subset)) {
  await writeFile(output, subset);
}

console.log(
  `Home Pretendard: ${subset.length.toLocaleString('en-US')} bytes ` +
    `(${(100 - (subset.length / original.length) * 100).toFixed(1)}% smaller)`
);
