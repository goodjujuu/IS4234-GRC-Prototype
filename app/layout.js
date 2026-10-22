import './globals.css';

export const metadata = {
  title: 'Sales Conduct & Incentive Risk Monitoring Platform',
  description: 'IS4234 Group 26 — Wells Fargo cross-selling GRC prototype',
};

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/accounts/new', label: 'New Account' },
  { href: '/alerts', label: 'Alerts' },
  { href: '/cases', label: 'Cases' },
  { href: '/board', label: 'Board Dashboard' },
];

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <nav className="bg-slate-900 text-white">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <span className="font-semibold">Sales Conduct & Incentive Risk Monitoring</span>
            <div className="flex gap-4 text-sm">
              {navLinks.map((link) => (
                <a key={link.href} href={link.href} className="hover:text-amber-300">
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </nav>
        <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
