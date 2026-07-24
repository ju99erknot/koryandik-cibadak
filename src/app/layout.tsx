import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import ThemeProvider from '@/components/ThemeProvider';
import Script from 'next/script';
import DynamicIsland from '@/components/DynamicIsland';
import ConfirmDialog from '@/components/ConfirmDialog';
import PushNotificationListener from '@/components/PushNotificationListener';
import ScrollProgress from '@/components/ScrollProgress';
import { ToastProvider } from '@/components/Toast';
import { Toaster } from 'sonner';
import CustomCursor from '@/components/CustomCursor';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

export const metadata: Metadata = {
  title: 'Koryandik Cibadak — Portal Berkas Pendidikan Digital',
  description: 'Sistem manajemen berkas digital terintegrasi untuk koordinasi administrasi, pelaporan guru, sertifikasi, dan Dana BOS di Kecamatan Cibadak, Kabupaten Sukabumi, Jawa Barat.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/logo.png', sizes: '512x512', type: 'image/png' },
      { url: '/logo.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon.png', type: 'image/png' },
    ],
    shortcut: ['/logo.png'],
    apple: [
      { url: '/logo.png', sizes: '512x512', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var t = localStorage.getItem('koryandik_theme');
              if (!t) {
                var s = localStorage.getItem('koryandik_app_settings');
                if (s) {
                  try {
                    var p = JSON.parse(s);
                    t = p?.default_theme?.value?.mode;
                  } catch(e) {}
                }
              }
              if (!t) {
                t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
              }
              t = (t === 'light' || t === 'dark') ? t : 'dark';
              document.documentElement.classList.remove('light', 'dark');
              document.documentElement.classList.add(t);
              document.documentElement.style.colorScheme = t;
            } catch(e) {
              document.documentElement.classList.add('dark');
              document.documentElement.style.colorScheme = 'dark';
            }
          })();
        `}} />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(function(registration) {
                  console.log('ServiceWorker registration successful');
                }, function(err) {
                  console.log('ServiceWorker registration failed: ', err);
                });
              });
            }
          `}
        </Script>
      </head>
      <body className={`${inter.variable} ${plusJakartaSans.variable}`}>
        <ThemeProvider>
          <ToastProvider>
            <CustomCursor />
            <ScrollProgress />
            <DynamicIsland />
            <ConfirmDialog />
            <PushNotificationListener />
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: 'var(--card-glass)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid var(--card-border)',
                  color: 'var(--text-primary)',
                  borderRadius: '14px',
                  fontSize: '13.5px',
                  fontWeight: 500,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                },
              }}
            />
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
