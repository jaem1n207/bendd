const URL_PATTERN = /https?:\/\/[^\s<>"']+/g;
const EMAIL_PATTERN = /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g;
const TOKEN_PATTERN =
  /\b(Bearer\s+|(?:token|password|secret|api[_-]?key)=)[^\s&,;]+/gi;

export function stripUrlDetails(value: string): string {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return value.split(/[?#]/)[0];
  }
}

export function redactErrorText(value: string): string {
  return value
    .replace(URL_PATTERN, stripUrlDetails)
    .replace(EMAIL_PATTERN, '[email]')
    .replace(TOKEN_PATTERN, '$1[redacted]');
}
