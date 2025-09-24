import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import relativeTime from 'dayjs/plugin/relativeTime';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import 'dayjs/locale/ko';
import 'dayjs/locale/en';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);
dayjs.extend(advancedFormat);

const SEOUL_TIMEZONE = 'Asia/Seoul';
const KOREAN_LOCALE = 'ko';

type SupportedLocale = 'ko' | 'en';
const DEFAULT_TIMEZONE = SEOUL_TIMEZONE;

const getDefaultLocale = (): SupportedLocale => KOREAN_LOCALE;

export const createDate = (
  input?: string | number | Date | dayjs.Dayjs,
  timezone: string = DEFAULT_TIMEZONE
): dayjs.Dayjs => {
  if (!input) {
    return dayjs().tz(timezone);
  }

  if (typeof input === 'string' && !input.includes('T')) {
    return dayjs.tz(`${input}T00:00:00`, timezone);
  }

  return dayjs(input).tz(timezone);
};

const formatDateWithLocale = (
  date: dayjs.Dayjs,
  locale: SupportedLocale,
  customFormat?: string
): string => {
  const formatString = customFormat || (locale === KOREAN_LOCALE ? 'YY.MM.DD' : 'MMM DD, YYYY');
  return date.locale(locale).format(formatString);
};

export const formatDate = (
  input: string | number | Date | dayjs.Dayjs,
  options: {
    locale?: SupportedLocale;
    timezone?: string;
    format?: string;
    includeRelative?: boolean;
  } = {}
): string => {
  const {
    locale = getDefaultLocale(),
    timezone = DEFAULT_TIMEZONE,
    format,
    includeRelative = false,
  } = options;

  const date = createDate(input, timezone);
  const formattedDate = formatDateWithLocale(date, locale, format);

  if (includeRelative) {
    const relativeDate = getRelativeTime(date, { locale, timezone });
    return `${formattedDate} (${relativeDate})`;
  }

  return formattedDate;
};

export const getRelativeTime = (
  input: string | number | Date | dayjs.Dayjs,
  options: {
    locale?: SupportedLocale;
    timezone?: string;
    baseDate?: dayjs.Dayjs;
  } = {}
): string => {
  const {
    locale = getDefaultLocale(),
    timezone = DEFAULT_TIMEZONE,
    baseDate,
  } = options;

  const targetDate = createDate(input, timezone);
  const currentDate = baseDate || dayjs().tz(timezone);

  if (targetDate.isAfter(currentDate)) {
    return locale === KOREAN_LOCALE ? '미래' : 'in the future';
  }

  const localizedDate = targetDate.locale(locale);
  return baseDate ? localizedDate.from(currentDate) : localizedDate.fromNow();
};

export const isValidDate = (dateString: string): boolean => {
  if (!dateString || dateString.trim() === '') {
    return false;
  }

  const date = dayjs(dateString, undefined, true);
  if (!date.isValid()) {
    return false;
  }

  const trimmedInput = dateString.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedInput)) {
    return true;
  }

  const [inputYear, inputMonth, inputDay] = trimmedInput.split('-').map(Number);
  const parsedYear = date.year();
  const parsedMonth = date.month() + 1;
  const parsedDay = date.date();

  return (
    inputYear === parsedYear &&
    inputMonth === parsedMonth &&
    inputDay === parsedDay
  );
};

