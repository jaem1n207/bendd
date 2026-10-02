'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import styles from '@/components/home/ui/home-studio.module.css';

export function CopyEmail({ email }: { email: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(email);
      setStatus('copied');
    } catch {
      setStatus('error');
    }
    timer.current = setTimeout(() => setStatus('idle'), 2500);
  };

  return (
    <div className={styles.copyControl}>
      <button
        type="button"
        className={styles.copyButton}
        onClick={copy}
        aria-label={
          status === 'copied' ? '이메일 주소 복사 완료' : '이메일 주소 복사'
        }
      >
        {status === 'copied' ? (
          <Check aria-hidden="true" className={styles.copiedIcon} />
        ) : (
          <Copy aria-hidden="true" />
        )}
      </button>
      <span className={styles.copyStatus} role="status">
        {status === 'copied'
          ? '복사했어요'
          : status === 'error'
            ? '메일 주소를 직접 복사해 주세요'
            : ''}
      </span>
    </div>
  );
}
