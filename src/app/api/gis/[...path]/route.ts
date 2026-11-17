import { NextRequest, NextResponse } from 'next/server';

const GIS_INTERNAL_URL = process.env.GIS_INTERNAL_URL || 'http://gis-engine:4000/api/v1/gis';

function forwardGeoHeaders(req: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };
  const passThrough = [
    'content-type',
    'cf-ipcountry',
    'cf-ipcity',
    'cf-iplatitude',
    'cf-iplongitude',
    'cf-connecting-ip',
    'x-forwarded-for',
    'x-real-ip',
    'x-vercel-ip-country',
    'x-country-code',
  ];
  for (const h of passThrough) {
    const val = req.headers.get(h);
    if (val) headers[h] = val;
  }
  return headers;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const subPath = (path || []).join('/');
  const search = req.nextUrl.search || '';
  const targetUrl = `${GIS_INTERNAL_URL}/${subPath}${search}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2400);
  try {
    const upstream = await fetch(targetUrl, {
      method: 'GET',
      headers: forwardGeoHeaders(req),
      signal: ctrl.signal,
      cache: 'no-store',
    });
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { error: 'GIS ML Engine unreachable', fallback: true },
      { status: 503 }
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const subPath = (path || []).join('/');
  const targetUrl = `${GIS_INTERNAL_URL}/${subPath}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2400);
  try {
    const body = await req.text();
    const upstream = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        ...forwardGeoHeaders(req),
        'Content-Type': 'application/json',
      },
      body,
      signal: ctrl.signal,
    });
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ ok: false, fallback: true }, { status: 202 });
  } finally {
    clearTimeout(timer);
  }
}
