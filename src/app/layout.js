import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "Antigravity Stream | Premium Video Streaming",
  description: "Discover, stream, and manage video content seamlessly on the next-generation streaming platform.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Navbar />
        <main className="page-fade-in">
          {children}
        </main>
      </body>
    </html>
  );
}
