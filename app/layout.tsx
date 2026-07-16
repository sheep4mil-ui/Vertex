import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Vertex | Ideas, made real.", description: "Custom 3D printing by Vertex." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
