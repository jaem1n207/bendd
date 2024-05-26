import { Button } from '@/components/ui/button';
import Image from 'next/image';

export default function Home() {
  return (
    <main className="bd-flex bd-min-h-screen bd-flex-col bd-items-center bd-justify-between bd-p-24">
      <h1>Bendd</h1>
      <p>Frontend Software Engineer · jaem1n207</p>
      <Button>Hello!</Button>
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
