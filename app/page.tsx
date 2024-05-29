import Image from 'next/image';

import { ThemeSwitcher } from '@/components/theme-switcher';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="bd-flex bd-min-h-screen bd-flex-col bd-items-center bd-justify-between bd-p-24">
      <h1>Bendd</h1>
      <p>Frontend Software Engineer · jaem1n207</p>
      <Link href="/article">
        <Button variant="link">피드</Button>
      </Link>
      <ThemeSwitcher />
      <Image
        src="/vercel.svg"
        alt="Vercel Logo"
        className="dark:bd-invert"
        width={100}
        height={24}
        priority
      />
    </main>
  );
}
