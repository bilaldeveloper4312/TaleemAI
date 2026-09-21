import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TaleemAI — Learn deeply, in your language",
  description: "An Urdu-English AI study assistant for documents, quizzes, and flashcards.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
