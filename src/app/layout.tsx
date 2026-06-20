import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "CV Creator — AI-Powered Resume Builder",
  description:
    "Build tailored CVs and cover letters from your LinkedIn, Monster, uploaded documents, and more. Apply to jobs with AI automation.",
  keywords: ["CV builder", "resume builder", "AI resume", "ATS optimization", "cover letter"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#1e293b",
              color: "#f1f5f9",
              border: "1px solid #334155",
              borderRadius: "12px",
            },
            success: { iconTheme: { primary: "#4157f8", secondary: "#fff" } },
          }}
        />
      </body>
    </html>
  );
}
