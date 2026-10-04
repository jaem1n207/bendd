'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

import { hasModelContext } from '@/components/webmcp/lib/register-tool';

const WebMCPRegistration = dynamic(
  () =>
    import('@/components/webmcp/ui/webmcp-registration').then(
      module => module.WebMCPRegistration
    ),
  { ssr: false }
);

export function WebMCPProvider() {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(hasModelContext());
  }, []);

  return supported ? <WebMCPRegistration /> : null;
}
