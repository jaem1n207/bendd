import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import dayjs from 'dayjs';
import {
  createDate,
  formatDate,
  getRelativeTime,
  isValidDate,
} from './date-utils';

describe('date-utils', () => {
  const TEST_TIMEZONE = 'Asia/Seoul';
  const FIXED_DATE = '2024-01-15T10:30:00+09:00';
  const FIXED_DATE_ONLY = '2024-01-15';

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FIXED_DATE));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createDate', () => {
    it('should create date with default timezone', () => {
      const date = createDate();
      expect(date.format('Z')).toBe('+09:00');
    });

    it('should handle date-only strings correctly', () => {
      const date = createDate('2024-01-15');
      expect(date.format('YYYY-MM-DD HH:mm:ss')).toBe('2024-01-15 00:00:00');
      expect(date.format('Z')).toBe('+09:00');
    });

    it('should handle ISO strings with timezone', () => {
      const date = createDate('2024-01-15T10:30:00Z');
      expect(date.format('Z')).toBe('+09:00');
    });

    it('should handle custom timezone', () => {
      const date = createDate('2024-01-15', 'America/New_York');
      expect(date.format('Z')).toBe('-05:00');
    });
  });

  describe('formatDate', () => {
    const testDate = '2024-01-15';

    it('should format with default Korean locale', () => {
      const formatted = formatDate(testDate);
      expect(formatted).toBe('24.01.15');
    });

    it('should format with English locale', () => {
      const formatted = formatDate(testDate, { locale: 'en' });
      expect(formatted).toBe('Jan 15, 2024');
    });

    it('should use custom format', () => {
      const formatted = formatDate(testDate, {
        locale: 'ko',
        format: 'YYYY년 MM월 DD일',
      });
      expect(formatted).toBe('2024년 01월 15일');
    });

    it('should include relative time when requested', () => {
      vi.setSystemTime(new Date('2024-01-20T10:30:00+09:00'));

      const formatted = formatDate(testDate, {
        locale: 'ko',
        includeRelative: true,
      });
      expect(formatted).toBe('24.01.15 (5일 전)');
    });

    it('should handle different timezones', () => {
      const formatted = formatDate(testDate, {
        locale: 'en',
        timezone: 'America/New_York',
      });
      expect(formatted).toBe('Jan 15, 2024');
    });
  });

  describe('getRelativeTime', () => {
    const baseDate = dayjs('2024-01-15T10:30:00+09:00');

    it('should handle "just now" in Korean', () => {
      const testDate = '2024-01-15T10:29:30+09:00';
      const relative = getRelativeTime(testDate, {
        locale: 'ko',
        baseDate,
      });
      expect(relative).toBe('몇 초 전');
    });

    it('should handle "just now" in English', () => {
      const testDate = '2024-01-15T10:29:30+09:00';
      const relative = getRelativeTime(testDate, {
        locale: 'en',
        baseDate,
      });
      expect(relative).toBe('a few seconds ago');
    });

    it('should handle minutes ago in Korean', () => {
      const testDate = '2024-01-15T10:25:00+09:00';
      const relative = getRelativeTime(testDate, {
        locale: 'ko',
        baseDate,
      });
      expect(relative).toBe('5분 전');
    });

    it('should handle minutes ago in English', () => {
      const testDate = '2024-01-15T10:25:00+09:00';
      const relative = getRelativeTime(testDate, {
        locale: 'en',
        baseDate,
      });
      expect(relative).toBe('5 minutes ago');
    });

    it('should handle hours ago in Korean', () => {
      const testDate = '2024-01-15T08:30:00+09:00';
      const relative = getRelativeTime(testDate, {
        locale: 'ko',
        baseDate,
      });
      expect(relative).toBe('2시간 전');
    });

    it('should handle single day in Korean', () => {
      const testDate = '2024-01-14T10:30:00+09:00';
      const relative = getRelativeTime(testDate, {
        locale: 'ko',
        baseDate,
      });
      expect(relative).toBe('하루 전');
    });

    it('should handle multiple days in Korean', () => {
      const testDate = '2024-01-10T10:30:00+09:00';
      const relative = getRelativeTime(testDate, {
        locale: 'ko',
        baseDate,
      });
      expect(relative).toBe('5일 전');
    });

    it('should handle weeks in Korean', () => {
      const testDate = '2024-01-01T10:30:00+09:00';
      const relative = getRelativeTime(testDate, {
        locale: 'ko',
        baseDate,
      });
      expect(relative).toBe('14일 전');
    });

    it('should handle months in Korean', () => {
      const testDate = '2023-10-15T10:30:00+09:00';
      const relative = getRelativeTime(testDate, {
        locale: 'ko',
        baseDate,
      });
      expect(relative).toBe('3달 전');
    });

    it('should handle years with months in Korean', () => {
      const testDate = '2022-10-15T10:30:00+09:00';
      const relative = getRelativeTime(testDate, {
        locale: 'ko',
        baseDate,
      });
      expect(relative).toBe('일 년 전');
    });

    it('should handle exact years in Korean', () => {
      const testDate = '2022-01-15T10:30:00+09:00';
      const relative = getRelativeTime(testDate, {
        locale: 'ko',
        baseDate,
      });
      expect(relative).toBe('2년 전');
    });

    it('should handle future dates', () => {
      const testDate = '2024-01-16T10:30:00+09:00';
      const relative = getRelativeTime(testDate, {
        locale: 'ko',
        baseDate,
      });
      expect(relative).toBe('미래');
    });

    it('should handle future dates in English', () => {
      const testDate = '2024-01-16T10:30:00+09:00';
      const relative = getRelativeTime(testDate, {
        locale: 'en',
        baseDate,
      });
      expect(relative).toBe('in the future');
    });
  });

  describe('isValidDate', () => {
    it('should validate correct date strings', () => {
      expect(isValidDate('2024-01-15')).toBe(true);
      expect(isValidDate('2024-01-15T10:30:00+09:00')).toBe(true);
      expect(isValidDate('2024-01-15T10:30:00Z')).toBe(true);
    });

    it('should reject invalid date strings', () => {
      expect(isValidDate('invalid')).toBe(false);
      expect(isValidDate('2024-13-01')).toBe(false);
      expect(isValidDate('2024-01-32')).toBe(false);
      expect(isValidDate('')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle leap year dates', () => {
      const leapDate = '2024-02-29';
      expect(isValidDate(leapDate)).toBe(true);

      const formatted = formatDate(leapDate, { locale: 'ko' });
      expect(formatted).toBe('24.02.29');
    });

    it('should handle year boundaries', () => {
      const baseDate = dayjs('2024-01-01T00:00:01+09:00');
      const testDate = '2023-12-31T23:59:59+09:00';

      const relative = getRelativeTime(testDate, {
        locale: 'ko',
        baseDate,
      });
      expect(relative).toBe('몇 초 전');
    });

    it('should handle daylight saving time transitions', () => {
      const date = createDate('2024-03-10', 'America/New_York');
      expect(date.isValid()).toBe(true);
    });

    it('should handle different date formats', () => {
      expect(isValidDate('2024/01/15')).toBe(true);
      expect(isValidDate('01-15-2024')).toBe(true);
    });
  });

  describe('locale-specific formatting', () => {
    const testDate = '2024-01-15';

    it('should format Korean dates correctly', () => {
      const formatted = formatDate(testDate, {
        locale: 'ko',
        format: 'YYYY년 M월 D일 dddd',
      });
      expect(formatted).toMatch(/2024년.*월.*일/);
    });

    it('should format English dates correctly', () => {
      const formatted = formatDate(testDate, {
        locale: 'en',
        format: 'MMMM Do, YYYY',
      });
      expect(formatted).toBe('January 15th, 2024');
    });
  });

  describe('timezone edge cases', () => {
    it('should handle timezone offset changes', () => {
      const date1 = createDate('2024-01-15T23:59:59', 'Asia/Seoul');
      const date2 = createDate('2024-01-15T23:59:59', 'UTC');

      expect(date1.format()).not.toBe(date2.format());
    });

    it('should maintain consistency across different input types', () => {
      const dateString = '2024-01-15';
      const dateObject = new Date('2024-01-15T00:00:00+09:00');
      const dayjsObject = dayjs('2024-01-15T00:00:00+09:00');

      const formatted1 = formatDate(dateString, { locale: 'ko' });
      const formatted2 = formatDate(dateObject, { locale: 'ko' });
      const formatted3 = formatDate(dayjsObject, { locale: 'ko' });

      expect(formatted1).toBe(formatted2);
      expect(formatted2).toBe(formatted3);
    });
  });
});
