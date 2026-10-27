import { Inter } from 'next/font/google';
import Sidebar from '@/components/Sidebar';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata = {
  title: 'ConductGuard — Sales Conduct & Incentive Risk Monitoring',
  description: 'IS4234 Group 26 — Wells Fargo cross-selling GRC prototype',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans text-slate-900 antialiased">
        <div className="min-h-screen lg:flex">
          <Sidebar />
          <div className="min-w-0 flex-1">
            <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-10 lg:py-9">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
