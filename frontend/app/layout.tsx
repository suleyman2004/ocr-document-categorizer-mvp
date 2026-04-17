import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "OCR Document Categorizer MVP",
  description: "Upload a document image, extract text, and categorize content."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
