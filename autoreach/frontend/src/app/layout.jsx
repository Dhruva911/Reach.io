import './globals.css';

export const metadata = {
  title: 'Reach.io — B2B Prospecting Platform',
  description: 'Full B2B pipeline: prospect, outreach, track, convert.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
