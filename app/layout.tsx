import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
    // Ganti nilai di bawah dengan tag kode verifikasi dari Google Search Console Anda
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
