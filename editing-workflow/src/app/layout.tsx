import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "editing-workflow",
  description: "YouTube video editing pipeline",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
