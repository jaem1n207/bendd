import type { MouseEventHandler, Ref } from 'react';

import styles from '@/components/observability/ui/privacy-settings.module.css';

type PrivacyFooterProps = {
  launcherRef: Ref<HTMLButtonElement>;
  ready: boolean;
  expanded: boolean;
  onOpen: MouseEventHandler<HTMLButtonElement>;
};

export function PrivacyFooter({
  launcherRef,
  ready,
  expanded,
  onOpen,
}: PrivacyFooterProps) {
  return (
    <footer
      className={styles.siteFooter}
      aria-label="사이트 하단"
      data-site-footer=""
    >
      <div className={styles.siteFooterContent}>
        <span>© {new Date().getFullYear()} bendd</span>
        <nav className={styles.siteFooterLinks} aria-label="개인정보 설정">
          <button
            type="button"
            onClick={onOpen}
            data-privacy-info=""
            aria-haspopup="dialog"
            disabled={!ready}
          >
            개인정보
          </button>
          <button
            ref={launcherRef}
            type="button"
            onClick={onOpen}
            aria-haspopup="dialog"
            aria-expanded={expanded}
            disabled={!ready}
          >
            쿠키 설정
          </button>
        </nav>
      </div>
    </footer>
  );
}
