import { TextAnimation } from '@/components/text-animation';
import { Paragraph, Title } from '@/components/ui/typography';

export default function Home() {
  return (
    <main className="bd-relative bd-mx-auto bd-flex bd-min-h-screen bd-max-w-2xl bd-items-center bd-overflow-hidden bd-px-6 bd-py-20 sm:bd-py-32">
      <div className="bd-flex-1 bd-text-center">
        <Title className="bd-pb-10">Hello, I&apos;m Ben</Title>
        <Paragraph size="lg" className="bd-pb-10">
          Frontend Software Engineer
        </Paragraph>
        <TextAnimation
          texts={[
            '프론트엔드 엔지니어입니다. 👋',
            '단순함을 유지하려 노력합니다.',
            '좋은 애니메이션을 만들기 위해 노력합니다.',
            '모든 사용자가 사용하기 쉬운 제품을 만들기 위해 노력합니다.',
            '동료의 시간을 존중합니다.',
          ]}
          className="bd-mb-14 bd-min-h-14"
        />
      </div>
    </main>
  );
}
