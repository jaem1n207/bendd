// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { readArticles } from '@/mdx/mdx';

describe('대표 영상 frontmatter 검증', () => {
  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), 'bendd-video-metadata-'));
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  function readWithVideoFields(fields: string) {
    writeFileSync(
      path.join(directory, 'example.mdx'),
      `---
title: '영상 예제'
publishedAt: '2026-10-22'
category: 'react'
description: '대표 영상 메타데이터 검증'
summary: '영상 예제'
${fields}
---
본문의 /videos/example.mp4 문자열만으로는 대표 영상을 지정하지 않습니다.
`
    );
    return readArticles(directory)[0].metadata;
  }

  it('기존 글은 영상 설정 없이 읽는다', () => {
    expect(readWithVideoFields('')).not.toHaveProperty('video');
  });

  it.each(['mp4', 'webm'])('로컬 %s 영상과 실제 크기를 읽는다', extension => {
    expect(
      readWithVideoFields(
        `video: '/videos/example.${extension}'\nvideoWidth: 1280\nvideoHeight: 720`
      )
    ).toMatchObject({
      video: `/videos/example.${extension}`,
      videoWidth: 1280,
      videoHeight: 720,
    });
  });

  it.each([
    "video: '/videos/example.mp4'",
    'videoWidth: 1280\nvideoHeight: 720',
    "video: '/videos/example.mp4'\nvideoWidth: 0\nvideoHeight: 720",
    "video: '/videos/example.mp4'\nvideoWidth: 1280\nvideoHeight: 1.5",
    "video: 'https://example.com/watch'\nvideoWidth: 1280\nvideoHeight: 720",
    "video: '//example.com/video.mp4'\nvideoWidth: 1280\nvideoHeight: 720",
  ])('잘못된 영상 설정을 거부한다: %s', fields => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => readWithVideoFields(fields)).toThrow();
  });
});
