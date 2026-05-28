import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vault | Secure File Host",
  description: "Terminal-accessible secure file hosting.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased text-white min-h-screen flex flex-col`}>
        <div className="absolute inset-0 z-[-1] pointer-events-none">
            {/* Optional glowing orbs could go here for extra effect */}
        </div>
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
