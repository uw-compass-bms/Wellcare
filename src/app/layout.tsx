import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UW Compass - Document Extractor",
  description: "Extract data from MVR and Auto+ documents using AI",
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
