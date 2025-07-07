import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "室内空气检测数据处理系统",
  description: "基于AI的室内空气质量检测报告生成系统",
  keywords: "空气质量检测,室内环境,AI报告生成,数据处理,环境监测",
  authors: [{ name: "Air Report System" }],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/logo.svg", type: "image/svg+xml", sizes: "512x512" }
    ],
    shortcut: "/favicon.ico",
    apple: "/logo.svg",
  },
  manifest: "/manifest.json",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2196F3",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="16x16" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/logo.svg" />
        <meta name="theme-color" content="#2196F3" />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  );
}
