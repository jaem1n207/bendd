// @vitest-environment node
import path from 'node:path';

import ts from 'typescript';
import { expect, test } from 'vitest';

const TYPECHECK_TIMEOUT_MS = 30_000;

test(
  '빌드로 생성한 Next 타입 없이 링크 props와 이벤트를 검사한다',
  { timeout: TYPECHECK_TIMEOUT_MS },
  () => {
    const root = process.cwd();
    const config = ts.readConfigFile(
      path.join(root, 'tsconfig.json'),
      ts.sys.readFile
    );
    expect(config.error).toBeUndefined();

    const { options, errors } = ts.convertCompilerOptionsFromJson(
      config.config.compilerOptions,
      root
    );
    expect(errors).toEqual([]);

    // next-env.d.ts와 .next/types를 제외해 빌드 전 CI 조건을 유지한다.
    const program = ts.createProgram({
      rootNames: [path.join(root, 'src/components/ui/intent-link.spec.tsx')],
      options: { ...options, incremental: false },
    });
    expect(
      program.getSourceFiles().some(file => file.fileName.includes('/.next/'))
    ).toBe(false);

    const diagnostics = ts
      .getPreEmitDiagnostics(program)
      .map(diagnostic =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
      );
    expect(diagnostics).toEqual([]);
  }
);
