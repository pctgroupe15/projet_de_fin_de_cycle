import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  const headersList = headers();
  const host = headersList.get('host');
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
  
  // Rediriger vers la nouvelle route
  const response = await fetch(`${protocol}://${host}/api/citizen/birth-declaration`, {
    method: 'POST',
    headers: request.headers,
    body: request.body,
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

function generateTrackingNumber() {
  const prefix = 'BN';
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
}