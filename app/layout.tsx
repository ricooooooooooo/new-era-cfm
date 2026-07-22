import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Era CFM",
  description: "Connected Franchise",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#080909] text-white antialiased">
        {children}
      </body>
    </html>
  );
}