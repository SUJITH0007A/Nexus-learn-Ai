import type { Metadata } from "next";
import "./globals.css";
import QueryProvider from "@/components/query-provider";

export const metadata: Metadata = {
  title: "NexusLearn AI | Premium AI Learning Workspace",
  description: "Next-gen AI assistant to analyze docs, auto-schedule plans, run code labs, and score technical interviews.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
