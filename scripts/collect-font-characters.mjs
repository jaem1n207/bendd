import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(
    error => {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  );
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
    ['home', 'profile', 'navigation', 'connection-globe'].map(domain =>
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

// Portals and screen-reader-only labels are outside HomeStudio. They must not
// trigger the full article font just to render navigation or a settings menu.
const interfaceFiles = (
  await Promise.all(
    ['navigation', 'sound', 'theme'].map(domain =>
      filesIn(path.join(root, 'src/components', domain))
    )
  )
)
  .flat()
  .filter(file => /\.(ts|tsx)$/.test(file) && !/\.(spec|test)\./.test(file));
const interfaceSources = await Promise.all(
  [
    ...interfaceFiles,
    path.join(root, 'src/app/layout.tsx'),
    path.join(root, 'src/lib/site-metadata.ts'),
    path.join(root, 'src/components/home/ui/extension-install-menu.tsx'),
    path.join(root, 'src/components/observability/ui/privacy-footer.tsx'),
  ].map(async file => {
    const source = ts.createSourceFile(
      file,
      await readFile(file, 'utf8').catch(error => {
        if (error.code === 'ENOENT') {
          return '';
        }
        throw error;
      }),
      ts.ScriptTarget.Latest,
      true
    );
    const text = [];
    function visit(node) {
      if (
        ts.isStringLiteralLike(node) ||
        ts.isJsxText(node) ||
        ts.isTemplateHead(node) ||
        ts.isTemplateMiddle(node) ||
        ts.isTemplateTail(node)
      ) {
        text.push(node.text);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    return text.join('');
  })
);
const interfaceCharacters = Array.from(
  new Set([ascii, ...interfaceSources].join('').normalize('NFC'))
)
  .sort()
  .join('');
const codeSources = await Promise.all(
  (await filesIn(path.join(root, 'src/components/code-walkthrough')))
    .filter(file => /\.(ts|tsx)$/.test(file) && !/\.(spec|test)\./.test(file))
    .map(file => readFile(file, 'utf8'))
);
const result = {
  home: characters,
  interface: interfaceCharacters,
  'code-ui': characters + codeSources.join(''),
};
// Preserve the existing HarfBuzz subset representation before FontTools removes
// features and writes the final Unicode faces. This is manual-only, in /tmp.
if (process.argv[2]) {
  const { default: subsetFont } = await import('subset-font');
  const original = await readFile(
    path.join(root, 'src/app/fonts/PretendardVariable.woff2')
  );
  for (const [name, text] of Object.entries(result).filter(
    ([name]) => name !== 'code-ui'
  )) {
    await writeFile(
      path.join(process.argv[2], `${name}.woff2`),
      await subsetFont(original, text, {
        targetFormat: 'woff2',
        preserveNameIds: [0, 13, 14],
      })
    );
  }
}
process.stdout.write(JSON.stringify(result));
