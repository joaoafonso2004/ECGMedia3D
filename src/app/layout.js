import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from '@/components/Providers';
import { SCRIPT_TEMA } from '@/lib/tema';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: 'ECGMedia3D',
  description: 'Plataforma de projetos do curso ECGM com visualização 3D',
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="pt"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // O script do tema pode pôr a classe .dark antes de o React carregar
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="min-h-full flex flex-col">
        {/* Providers fornece o contexto + canvas WebGL singleton a toda a app */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
