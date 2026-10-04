export enum PrivacyView {
  Closed = 'closed',
  Notice = 'notice',
  Details = 'details',
  Confirmation = 'confirmation',
}

export const PRIVACY_SESSION_KEY = 'bendd-privacy-prompt-v1';
export const READING_PROMPT_MS = 10_000;
export const CONFIRMATION_MS = 4_000;
export const PRIVACY_EASE = [0.19, 1, 0.22, 1] satisfies [
  number,
  number,
  number,
  number,
];
export const PRIVACY_ENTER_SECONDS = 0.3;
export const PRIVACY_EXIT_SECONDS = 0.2;
export const PRIVACY_FADE_SECONDS = 0.1;
