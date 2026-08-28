import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gold Jacket CFM",
  description: "Gold Jacket Connected Franchise",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#080807] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
