import { Typography } from '@/components/ui/typography';

export default function NotFound() {
  return (
    <section className="bd-flex bd-h-screen bd-flex-col bd-items-center bd-justify-center">
      <Typography variant="h1">404 - 페이지를 찾을 수 없어요</Typography>
      <Typography variant="p" asChild>
        <p>요청한 페이지가 존재하지 않아요.</p>
      </Typography>
    </section>
  );
}
