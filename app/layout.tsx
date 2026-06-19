import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Laila Collections - Aplikasi Kasir POS & Kelola Toko Modern",
  description: "Laila Collections - Aplikasi Kasir (POS) Butik Modern & Kelola Toko Terintegrasi. Optimalkan manajemen stok produk, transaksi, riwayat shift, dan laporan audit finansial Anda secara real-time.",
  verification: {
    
    google: "proses-verifikasi-google-search-console",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-right" closeButton />
      </body>
    </html>
  );
}
