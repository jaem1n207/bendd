import Image from 'next/image';

import { Paragraph, Title } from '@/components/ui/typography';

export default function Home() {
  return (
    <main className="bd-relative bd-mx-auto bd-flex bd-min-h-screen bd-max-w-2xl bd-overflow-hidden bd-px-6 bd-py-20 sm:bd-py-32">
      <div className="bd-flex-1 bd-text-center">
        <Title className="bd-pb-10">Bendd</Title>
        <Paragraph size="lg" className="bd-pb-20">
          Frontend Software Engineer <br />·<br /> jaem1n207
        </Paragraph>
        <Image
          src="/rabbit.svg"
          alt="primary character"
          draggable={false}
          className="bd-mx-auto bd-block dark:bd-invert"
          width={420}
          height={436}
          priority
        />
      </div>
    </main>
  );
}
