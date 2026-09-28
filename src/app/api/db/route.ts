import { NextResponse } from 'next/server';
// The insecure shared-demo API is retired. Existing data is preserved on disk.
export function GET(){return NextResponse.json({error:'This demo API has been retired. Use /api/rvu with an authenticated account.'},{status:410});}
export const POST=GET;
