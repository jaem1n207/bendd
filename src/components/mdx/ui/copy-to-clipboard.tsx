import { CheckIcon, CopyIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { isEmptyString } from '@/lib/assertions';

export const CopyToClipboard = ({
  getValue,
  ...props
}: {
  getValue: () => string;
} & ComponentProps<'button'>) => {
  const [isCopied, setCopied] = useState(false);

  useEffect(() => {
    if (!isCopied) return;
    const timerId = setTimeout(() => {
      setCopied(false);
    }, 2000);

    return () => {
      clearTimeout(timerId);
    };
  }, [isCopied]);

  const handleClick = useCallback<
    NonNullable<ComponentProps<'button'>['onClick']>
  >(async () => {
    const copyText = getValue();

    try {
      if (!navigator?.clipboard) {
        throw new Error('복사 기능을 지원하지 않는 브라우저에요.');
      }
      if (isEmptyString(copyText)) {
        throw new Error('복사할 내용이 없어요.');
      }

      setCopied(true);
      await navigator.clipboard.writeText(copyText);
    } catch (error) {
      toast('클립보드에 복사하는데 실패했어요.', {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }, [getValue]);

  const IconToUse = isCopied ? CheckIcon : CopyIcon;

  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={handleClick}
      title="Copy code"
      {...props}
    >
      <IconToUse className="bd-pointer-events-none bd-size-4" />
    </Button>
  );
};
