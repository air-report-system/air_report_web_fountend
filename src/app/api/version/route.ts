import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    // 读取项目根目录的 .version 文件
    const versionPath = path.join(process.cwd(), '.version');
    const version = await fs.readFile(versionPath, 'utf8');
    
    return NextResponse.json({
      version: version.trim(),
      timestamp: new Date().toISOString(),
      source: '.version file'
    });
  } catch (error) {
    console.error('Error reading version file:', error);
    return NextResponse.json({
      version: '1.0.0_unknown',
      timestamp: new Date().toISOString(),
      source: 'fallback',
      error: 'Could not read .version file'
    });
  }
}