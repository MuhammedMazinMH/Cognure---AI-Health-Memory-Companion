import type { Metadata } from "next";
// next/font automatically self-hosts Google Fonts for us (no extra network
// requests at runtime). We load two families and expose them as CSS variables
// that globals.css reads (--font-inter, --font-playfair).
import { Inter, Playfair_Display, Geist_Mono } from "next/font/google";
import "./globals.css";

// Inter is our clean body/UI font.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Playfair Display is an elegant serif used for headings/logo.
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

// Monospace font kept for any code-like UI.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Metadata is read by Next.js to fill in the <title> and <meta> tags.
export const metadata: Metadata = {
  title: "Cognure - Your Health Memory",
  description:
    "Cognure is your personal Health Memory AI. Upload documents, build a living memory graph, and ask questions about your health history.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // Attach all three font variables so any component can use them.
      className={`${inter.variable} ${playfair.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* Background cream (#F5F1E8) and text charcoal (#2C2C2C) come from
          the CSS variables defined in globals.css. */}
      <body className="min-h-full bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
