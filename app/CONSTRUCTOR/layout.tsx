import './constructor.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const metadata = {
  title: 'B2B Professional Constructor | Merchandise Design',
  description: 'Design your corporate merchandise with professional precision.',
};

export default function ConstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={inter.className}>
      {children}
    </div>
  );
}
