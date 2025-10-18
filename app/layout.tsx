import type { Metadata } from "next";
import "./globals.css";
import { Poppins } from "next/font/google";
import React from "react";

const poppins = Poppins(
  { weight: "300", subsets: ["latin"] }
);

export const metadata: Metadata = {
  title: "argentique",
  description: "gallery of film photography",
};

export default function RootLayout( {
                                      children,
                                    }: Readonly<{
  children: React.ReactNode;
}> ) {
  return (
    <html lang="en" className="h-full">
    <body className={ `${ poppins.className } flex flex-col h-full` }>
    <main className="flex-grow">
      { children }
    </main>
    <footer className="text-center py-20 text-gray-500 text-sm">
      <p>&copy; { new Date().getFullYear() } argentique by Maxime Bodin. All rights reserved.</p>
    </footer>
    </body>
    </html>
  );
}