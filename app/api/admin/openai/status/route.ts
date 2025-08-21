import { NextResponse } from 'next/server';

export async function GET() {
  const hasKey = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim());
  return NextResponse.json({ hasKey });
}
