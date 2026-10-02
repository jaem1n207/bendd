import { signaturePath } from '@/lib/signature-path';
import { siteMetadata } from '@/lib/site-metadata';
import Link from 'next/link';

export function Signature() {
  return (
    <Link
      href="/"
      className="absolute left-0 top-0 z-10 m-5 inline-block size-12 select-none lg:fixed"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="4.09543 -0.09 4.999 3.196"
      >
        <title>
          {siteMetadata.author} @ {siteMetadata.title}
        </title>
        <path
          d={signaturePath}
          stroke="currentColor"
          strokeWidth="0.1"
          fill="none"
          strokeDasharray={28.13859748840332}
          strokeDashoffset={28.13859748840332}
          className="animate-signature motion-reduce:animate-none motion-reduce:[stroke-dashoffset:0]"
        />
      </svg>
    </Link>
  );
}
