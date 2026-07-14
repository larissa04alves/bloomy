import type { Metadata } from "next";
import { Nunito, Quicksand } from "next/font/google";

import { Toaster } from "@bloomy/ui/components/sonner";

import "../index.css";

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Bloomy",
  description: "Seu jardim de bolso — cuidar de você, todo dia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${quicksand.variable} ${nunito.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-board text-ink antialiased">
        <div className="mx-auto flex min-h-dvh w-full max-w-105 flex-col bg-bg sm:shadow-device">
          {children}
        </div>
        <Toaster position="top-center" richColors={false} />
      </body>
    </html>
  );
}
