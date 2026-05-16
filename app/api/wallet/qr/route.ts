import { NextResponse } from 'next/server';
import { generateSecurePassPayload } from '@/lib/walletCrypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { registrationId, eventId, attendeeId, participantName } = body;

    if (!registrationId || !eventId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // In a real app we'd verify Supabase auth here using @supabase/ssr or similar,
    // and verify the registration ownership.
    
    const jwt = await generateSecurePassPayload({
      attendeeId: attendeeId || 'unknown',
      eventId,
      registrationId,
      participantName: participantName || 'Attendee',
    });

    return NextResponse.json({ token: jwt });
  } catch (err: any) {
    console.error('QR Generate Error:', err);
    return NextResponse.json({ error: 'Failed to generate secure QR' }, { status: 500 });
  }
}
