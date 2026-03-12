import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Arcfall Stand',
  description: 'A wave survival browser game inspired by Seraph\'s Last Stand.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
