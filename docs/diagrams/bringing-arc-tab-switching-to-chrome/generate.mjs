import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '../../..');
const require = createRequire(path.join(root, 'package.json'));
const canvasPath = process.env.DIAGRAM_CANVAS_MODULE;
if (!canvasPath) {
  throw new Error(
    'DIAGRAM_CANVAS_MODULE에 기존 @napi-rs/canvas 모듈 경로를 지정하세요.'
  );
}
const { createCanvas, GlobalFonts, SvgExportFlag } = require(canvasPath);
const fontverter = require(
  require.resolve('fontverter', {
    paths: [require.resolve('subset-font')],
  })
);
const sans = await fs.readFile(
  path.join(root, 'src/app/fonts/PretendardVariable.woff2')
);
if (
  !GlobalFonts.register(
    await fontverter.convert(sans, 'truetype'),
    'DiagramPretendard'
  )
) {
  throw new Error('Pretendard 등록 실패');
}

const cssDirectory = path.join(root, '.next/static/css');
let monoPath;
for (const entry of await fs.readdir(cssDirectory)) {
  if (!entry.endsWith('.css')) {
    continue;
  }
  const css = await fs.readFile(path.join(cssDirectory, entry), 'utf8');
  const face = [...css.matchAll(/@font-face\{([^}]*)\}/g)].find(
    ([, body]) =>
      body.includes('font-family:Fira Mono;') &&
      body.includes('font-weight:400;') &&
      body.includes('u+00??')
  );
  if (face) {
    monoPath = path.join(
      root,
      '.next',
      face[1].match(/url\(\/_next\/([^)]*)\)/)[1]
    );
    break;
  }
}
if (
  !monoPath ||
  !GlobalFonts.register(
    await fontverter.convert(await fs.readFile(monoPath), 'truetype'),
    'DiagramMono'
  )
) {
  throw new Error('빌드된 Fira Mono 등록 실패. 먼저 pnpm build를 실행하세요.');
}

const C = {
  paper: 'hsl(0, 0%, 100%)',
  surface: 'hsl(0, 0%, 96.1%)',
  ink: 'hsl(0, 0%, 3.9%)',
  primary: 'hsl(0, 0%, 9%)',
  muted: 'hsl(0, 0%, 45.1%)',
  border: 'hsl(0, 0%, 55%)',
  rule: 'hsl(0, 0%, 89.8%)',
};
const escape = value =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

function outlinedPaint(svg) {
  return svg
    .replace(/#[0-9a-fA-F]{6}\b/g, value => {
      const channels = [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16));
      if (channels[0] !== channels[1] || channels[1] !== channels[2]) {
        throw new Error(`중립색이 아닌 글자 색: ${value}`);
      }
      return `hsl(0, 0%, ${((channels[0] / 255) * 100).toFixed(2)}%)`;
    })
    .replace(/-?\d+\.\d{3,}/g, value => Number(value).toFixed(2));
}

class Figure {
  constructor(slug, title, desc) {
    this.slug = slug;
    this.title = title;
    this.desc = desc;
    this.zones = [];
    this.lines = [];
    this.masks = [];
    this.nodes = [];
    this.bounds = [];
    this.maskBounds = [];
    this.labels = [];
    this.canvas = createCanvas(960, 600, SvgExportFlag.ConvertTextToPaths);
    this.context = this.canvas.getContext('2d');
    this.text(title, 40, 68, 28, 'ink', 600, 'left', 880);
  }

  text(
    value,
    x,
    y,
    size = 12,
    color = 'ink',
    weight = 400,
    align = 'left',
    max = 880,
    mono = false
  ) {
    const context = this.context;
    context.font = `${weight} ${size}px ${mono ? 'DiagramMono' : 'DiagramPretendard'}`;
    context.fillStyle = C[color];
    context.textAlign = align;
    const metrics = context.measureText(value);
    const left =
      x -
      (align === 'center'
        ? metrics.width / 2
        : align === 'right'
          ? metrics.width
          : 0);
    if (
      metrics.width > max ||
      left < 39 ||
      left + metrics.width > 921 ||
      y > 560
    ) {
      throw new Error(`${this.slug}: 글자 범위 초과: ${value}`);
    }
    context.fillText(value, x, y);
    this.labels.push({ value, x, y, size, weight, mono });
  }

  rect(
    x,
    y,
    width,
    height,
    fill,
    stroke,
    radius = 6,
    destination = this.nodes
  ) {
    destination.push(
      `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${C[fill]}" stroke="${C[stroke]}" stroke-width="1.2"/>`
    );
    if (destination === this.nodes) {
      this.bounds.push({ x, y, width, height });
    }
  }

  path(d, kind = 'arrow', dashed = false) {
    this.lines.push(
      `<path d="${d}" fill="none" stroke="${C[kind === 'accent' ? 'primary' : 'muted']}" stroke-width="1.2"${dashed ? ' stroke-dasharray="5,4"' : ''} marker-end="url(#${kind})"/>`
    );
  }

  label(value, x, y, width, mono = false) {
    const height = 20;
    this.masks.push(
      `<rect x="${x - width / 2}" y="${y}" width="${width}" height="${height}" rx="2" fill="${C.paper}"/>`
    );
    this.maskBounds.push({ x: x - width / 2, y, width, height });
    this.text(
      value,
      x,
      y + 14,
      mono ? 8 : 12,
      'muted',
      400,
      'center',
      width - 16,
      mono
    );
  }

  diamond(cx, cy, width = 144, height = 72) {
    this.nodes.push(
      `<polygon points="${cx},${cy - height / 2} ${cx + width / 2},${cy} ${cx},${cy + height / 2} ${cx - width / 2},${cy}" fill="${C.paper}" stroke="${C.border}" stroke-width="1.2"/>`
    );
    this.bounds.push({ x: cx - width / 2, y: cy - height / 2, width, height });
    this.text(
      '상태가 같은가?',
      cx,
      cy + 4,
      12,
      'ink',
      600,
      'center',
      width - 40
    );
  }

  legend(items) {
    this.nodes.push(
      `<line x1="40" y1="532" x2="920" y2="532" stroke="${C.rule}"/>`
    );
    for (const [index, [label, kind]] of items.entries()) {
      const x = 40 + index * 280;
      this.nodes.push(
        `<path d="M${x} 548H${x + 32}" fill="none" stroke="${C.muted}" stroke-width="1.2"${kind === 'arrow' ? '' : ' stroke-dasharray="5,4"'} marker-end="url(#${kind === 'open' ? 'open' : 'arrow'})"/>`
      );
      this.text(label, x + 44, 552, 12, 'muted', 400, 'left', 224);
    }
  }

  async write() {
    for (const mask of this.maskBounds) {
      for (const node of this.bounds) {
        if (
          mask.x < node.x + node.width &&
          mask.x + mask.width > node.x &&
          mask.y < node.y + node.height &&
          mask.y + mask.height > node.y
        ) {
          throw new Error(`${this.slug}: 화살표 라벨이 노드를 침범함`);
        }
      }
    }
    const glyphs = outlinedPaint(
      this.canvas
        .getContent()
        .toString()
        .match(/<svg\b[^>]*>([\s\S]*)<\/svg>/)[1]
    );
    const marker = (name, color) =>
      `<marker id="${name}" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="${C[color]}"/></marker>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 600" role="img" aria-labelledby="${this.slug}-title ${this.slug}-desc">
<title id="${this.slug}-title">${escape(this.title)}</title>
<desc id="${this.slug}-desc">${escape(this.desc)}</desc>
<defs>${marker('arrow', 'muted')}${marker('accent', 'primary')}${marker('link', 'primary')}<marker id="open" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polyline points="0 0,8 3,0 6" fill="none" stroke="${C.muted}" stroke-width="1.2"/></marker></defs>
<rect width="960" height="600" fill="${C.paper}"/>
${this.zones.join('\n')}
${this.lines.join('\n')}
${this.masks.join('\n')}
${this.nodes.join('\n')}
<g aria-hidden="true">${glyphs}</g>
</svg>`;
    const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(this.title)}</title>
<style>
:root{--paper:${C.paper};--ink:${C.ink};--muted:${C.muted};--accent:${C.primary};--font-sans:'Pretendard',system-ui,sans-serif}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--font-sans)}.frame{width:100%;max-width:960px;min-width:0;margin:0 auto}.diagram-container{width:100%;overflow-x:auto}svg{width:100%;min-width:960px;display:block}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
@media print{.diagram-container{overflow-x:visible}svg{min-width:0}}
</style></head><body><main class="frame"><h1 class="sr-only">${escape(this.title)}</h1><div class="diagram-container">${svg}</div></main></body></html>
`;
    await fs.writeFile(path.join(directory, `${this.slug}.html`), html);
    await fs.writeFile(
      path.join(directory, `${this.slug}.labels.json`),
      JSON.stringify(this.labels, null, 2) + '\n'
    );
    console.log(
      `${this.slug}: ${this.bounds.length}개 도형, ${this.lines.length}개 연결, ${this.labels.length}개 라벨`
    );
  }
}

const architecture = new Figure(
  'architecture',
  '키 입력과 탭 제어를 나눠 처리했어요',
  '하나의 macOS 앱이 키 입력과 전환창을 맡고, 프로필별 Native Host가 Chrome 확장 프로그램의 탭 정보와 활성화 요청을 중계해요.'
);
architecture.text(
  'Chrome 프로필이 여러 개여도 입력과 전환창은 하나의 앱에서 처리해요.',
  40,
  96,
  12,
  'muted'
);
architecture.rect(384, 176, 536, 312, 'surface', 'rule', 8, architecture.zones);
architecture.text('프로필별 연결', 408, 204, 12, 'muted', 600);
architecture.path('M160 208V256');
architecture.path('M280 320H408');
architecture.path('M568 320H696');
architecture.path('M408 384H280', 'arrow', true);
architecture.path('M696 384H568', 'arrow', true);
architecture.label('UNIX SOCKET', 344, 292, 88, true);
architecture.label('NATIVE MSG', 632, 292, 88, true);
architecture.rect(40, 144, 240, 64, 'surface', 'border');
architecture.text('KEY INPUT', 56, 164, 8, 'muted', 400, 'left', 208, true);
architecture.text(
  'Ctrl+Tab · Control 해제 · Esc',
  56,
  188,
  12,
  'ink',
  400,
  'left',
  208
);
architecture.rect(40, 256, 240, 192, 'primary', 'primary');
architecture.text(
  'APP / ONE PROCESS',
  56,
  280,
  8,
  'paper',
  400,
  'left',
  208,
  true
);
architecture.text('macOS 앱', 56, 308, 14, 'paper', 600);
architecture.text('키 입력 · 선택 상태 관리', 56, 340, 12, 'paper');
architecture.text('포커스를 유지하는 전환창', 56, 364, 12, 'paper');
architecture.text(
  'CGEventTap / NSPanel',
  56,
  420,
  9,
  'paper',
  400,
  'left',
  208,
  true
);
architecture.rect(408, 256, 160, 192, 'paper', 'border');
architecture.text('HOST', 424, 280, 8, 'muted', 400, 'left', 128, true);
architecture.text('Native Host', 424, 308, 14, 'ink', 600, 'left', 128);
architecture.text('메시지 중계', 424, 340, 12, 'ink');
architecture.text('프로필마다 연결', 424, 364, 12, 'muted');
architecture.rect(696, 256, 224, 192, 'paper', 'border');
architecture.text('CHROME / MV3', 712, 280, 8, 'muted', 400, 'left', 192, true);
architecture.text('Chrome 확장 프로그램', 712, 308, 14, 'ink', 600);
architecture.text('탭 정보 · 캡처 이미지', 712, 340, 12, 'ink');
architecture.text('선택한 탭 활성화', 712, 364, 12, 'ink');
architecture.text(
  'tabs.update()',
  712,
  420,
  9,
  'muted',
  400,
  'left',
  192,
  true
);
architecture.legend([
  ['입력·활성화 요청', 'arrow'],
  ['탭 정보·이미지·응답', 'return'],
]);
await architecture.write();

const latest = new Figure(
  'latest-intent',
  '입력은 바로 반영하고, 전환 요청은 하나씩',
  'B 전환 응답을 기다리는 동안 A, B, A 입력을 모두 최근 탭 순서에 반영하고, 마지막 A 하나만 다음 전환 대상으로 남겨요.'
);
latest.text(
  '시작은 A 탭 · Chrome 요청 1개 + 마지막 대기 목적지 1개',
  40,
  96,
  12,
  'muted'
);
for (const x of [140, 480, 820]) {
  latest.zones.push(
    `<line x1="${x}" y1="184" x2="${x}" y2="520" stroke="${C.border}" stroke-width="1" stroke-dasharray="3,3"/>`
  );
}
latest.rect(40, 136, 200, 48, 'surface', 'border');
latest.rect(360, 136, 240, 48, 'paper', 'border');
latest.rect(720, 136, 200, 48, 'paper', 'border');
latest.text('키 입력', 140, 164, 14, 'ink', 600, 'center', 168);
latest.text('macOS 앱의 상태', 480, 164, 14, 'ink', 600, 'center', 208);
latest.text('Chrome API', 820, 164, 14, 'ink', 600, 'center', 168);
latest.rect(476, 224, 8, 288, 'surface', 'muted', 0);
latest.rect(816, 264, 8, 184, 'surface', 'muted', 0);
latest.rect(816, 496, 8, 24, 'surface', 'muted', 0);
for (const [y, tab, order] of [
  [224, 'B', 'B, A'],
  [304, 'A', 'A, B'],
  [352, 'B', 'B, A'],
  [400, 'A', 'A, B'],
]) {
  latest.path(`M140 ${y}H476`, 'open', true);
  latest.label(`${tab} 확정`, 308, y - 28, 80);
  latest.text(`MRU [${order}]`, 512, y + 4, 9, 'ink', 400, 'left', 112, true);
}
latest.path('M484 264H816');
latest.label('B 활성화', 650, 236, 88);
latest.text('대기 A', 668, 308, 12, 'muted');
latest.text('대기 B', 668, 356, 12, 'muted');
latest.rect(640, 384, 104, 28, 'primary', 'primary');
latest.text('대기 A', 692, 404, 12, 'paper', 600, 'center', 80);
latest.path('M816 448H484', 'arrow', true);
latest.label('B 응답', 650, 420, 80);
latest.path('M484 496H816', 'accent');
latest.label('마지막 A 활성화', 650, 468, 128);
latest.legend([
  ['선택 입력', 'open'],
  ['활성화 요청', 'arrow'],
  ['완료 응답', 'return'],
]);
await latest.write();

const preview = new Figure(
  'preview-validation',
  '캡처를 시작한 화면과 끝난 화면이 같아야 해요',
  '현재 탭을 캡처하고 축소하는 각 단계 뒤에 연결, 창, 탭과 탐색 세대를 확인해 상태가 바뀐 이미지는 버려요.'
);
preview.text(
  '탭 ID가 같아도 페이지가 이동했다면 결과를 버려요.',
  40,
  96,
  12,
  'muted'
);
preview.path('M272 180H320');
preview.path('M464 180H520');
preview.label('같음', 492, 152, 40);
preview.path('M616 212V232Q616 240 624 240H800Q808 240 808 248V264');
preview.path('M392 216V400');
preview.label('바뀜', 424, 296, 48);
preview.path('M736 300H592Q584 300 584 308V432Q584 440 576 440H504');
preview.label('바뀜', 656, 272, 48);
preview.path('M808 336V400');
preview.label('같음', 840, 352, 48);
preview.rect(40, 148, 232, 64, 'paper', 'border');
preview.text('현재 화면 캡처', 56, 176, 14, 'ink', 600);
preview.text('시작 상태 A 기록', 56, 200, 12, 'muted');
preview.diamond(392, 180);
preview.rect(520, 148, 192, 64, 'paper', 'border');
preview.text('이미지 축소', 616, 184, 14, 'ink', 600, 'center', 160);
preview.diamond(808, 300);
preview.rect(280, 400, 224, 80, 'surface', 'border', 20);
preview.text('결과 폐기', 392, 432, 14, 'ink', 600, 'center', 192);
preview.text('이미지를 붙이지 않음', 392, 456, 12, 'muted', 400, 'center', 192);
preview.rect(712, 400, 192, 80, 'primary', 'primary', 20);
preview.text('미리보기 저장', 808, 432, 14, 'paper', 600, 'center', 160);
preview.text('같은 탭·같은 페이지', 808, 456, 12, 'paper', 400, 'center', 160);
preview.text('각 단계에서 확인하는 값', 40, 344, 12, 'ink', 600);
preview.text(
  '연결 · 창 · 탭 · 탐색 세대',
  40,
  368,
  12,
  'muted',
  400,
  'left',
  224
);
preview.nodes.push(
  `<line x1="40" y1="532" x2="920" y2="532" stroke="${C.rule}"/>`
);
preview.text(
  '상태는 캡처 완료 뒤와 이미지 축소 완료 뒤에 각각 확인해요.',
  40,
  552,
  12,
  'muted'
);
await preview.write();
