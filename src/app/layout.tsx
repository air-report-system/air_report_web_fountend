import type { Metadata } from "next";
import "./globals.css";
import { ClientProviders } from "./client-providers";

export const metadata: Metadata = {
  title: "室内空气检测数据处理系统",
  description: "基于AI的室内空气质量检测报告生成系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="font-sans antialiased" suppressHydrationWarning={true}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
