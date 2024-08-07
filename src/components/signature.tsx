import { siteMetadata } from '@/lib/site-metadata';
import Link from 'next/link';

export function Signature() {
  return (
    <Link
      href="/"
      className="bd-absolute bd-left-0 bd-top-0 bd-z-10 bd-m-5 bd-inline-block bd-size-12 bd-select-none lg:bd-fixed"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="4.09543 -0.09 4.999 3.196"
      >
        <title>
          {siteMetadata.author} @ {siteMetadata.title}
        </title>
        <path
          d="m 5.01 0.01 l -0.684 2.996 m 0.395 -1.597 c 1.546 -2.408 2.769 -0.892 1.147 -0.103 s 0.052 -0.263 -0.16 0.972 c -0.044 0.65 -0.65 0.701 -0.84 0.701 c -0.57 -0.095 -0.826 -0.402 -0.578 -0.723 c 0.248 -0.321 1.288 -0.63 1.922 -0.483 c 0.659 0.198 0.755 0.117 0.786 0.061 c 0.248 -0.405 -0.488 -0.567 -0.888 -0.182 c -0.208 0.117 -0.152 0.502 0.095 0.589 c 0.431 0.117 0.84 0.037 1.154 -0.35 l -0.022 0.496 c 0.08 -0.19 0.266 -0.421 0.46 -0.423 s 0.1073 0.3307 0.143 0.489 s 0.34 -0.152 0.776 -0.715 l 0.278 -1.672 c -0.076 -0.152 -0.193 0.426 -0.238 1.825 c -0.031 0.253 0 0.653 0.203 0.75 c -0.274 -0.183 -0.1927 -0.74 -0.289 -1.11 c -0.066 -0.122 -0.213 -0.218 -0.446 -0.203 s -0.522 0.355 -0.269 0.76 C 8.097 2.302 8.368 2.401 8.742 2.172"
          stroke="currentColor"
          strokeWidth="0.1"
          fill="none"
          strokeDasharray={28.13859748840332}
          strokeDashoffset={28.13859748840332}
          className="bd-animate-signature"
        />
      </svg>
    </Link>
  );
}
