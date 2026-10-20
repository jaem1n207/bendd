import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';
import ts from 'typescript';

const sourceUrl =
  'https://raw.githubusercontent.com/google/fonts/main/ofl/gaegu/Gaegu-Regular.ttf';
const sourcePath = new URL(
  '../src/components/home/ui/home-studio.tsx',
  import.meta.url
);
const source = ts.createSourceFile(
  fileURLToPath(sourcePath),
  await readFile(sourcePath, 'utf8'),
  ts.ScriptTarget.Latest,
  true
);
const notes = [];

function collectNotes(node) {
  if (
    ts.isJsxElement(node) &&
    node.openingElement.tagName.getText(source) === 'MarginNote'
  ) {
    const text = [];
    function collectText(child) {
      if (ts.isJsxText(child)) {
        text.push(child.text);
      }
      ts.forEachChild(child, collectText);
    }
    node.children.forEach(collectText);
    notes.push(text.join(' ').replace(/\s+/g, ' ').trim());
    return;
  }
  ts.forEachChild(node, collectNotes);
}
collectNotes(source);

if (notes.length === 0) {
  throw new Error('손글씨 안내 문구를 찾지 못했습니다.');
}

const response = await fetch(sourceUrl);
if (!response.ok) {
  throw new Error(`Gaegu 원본 다운로드 실패: ${response.status}`);
}
const subset = await subsetFont(
  Buffer.from(await response.arrayBuffer()),
  notes.join(' ').normalize('NFC'),
  { targetFormat: 'woff2', preserveNameIds: [0, 13, 14] }
);
const output = new URL('../public/fonts/gaegu-notes.woff2', import.meta.url);
if (!(await readFile(output)).equals(subset)) {
  await writeFile(output, subset);
}
console.log(
  `Gaegu: ${notes.length}개 안내, ${subset.length.toLocaleString('en-US')} bytes`
);
