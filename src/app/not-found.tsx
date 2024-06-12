import { Paragraph, Title } from '@/components/ui/typography';

export default function NotFound() {
  return (
    <section className="bd-flex bd-h-screen bd-flex-col bd-items-center bd-justify-center">
      <Title size="h1">404 - 페이지를 찾을 수 없어요</Title>
      <Paragraph>요청한 페이지가 존재하지 않아요.</Paragraph>
    </section>
  );
}
