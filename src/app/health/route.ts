import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 3000,
    hostname: process.env.HOSTNAME || '0.0.0.0'
  });
}