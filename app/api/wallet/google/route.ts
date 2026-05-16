import { NextResponse } from 'next/server';
import { generateSecurePassPayload } from '@/lib/walletCrypto';
import { SignJWT, importPKCS8 } from 'jose';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      registrationId, 
      eventId, 
      eventTitle, 
      participantName,
      venue,
      date,
      time 
    } = body;

    if (!registrationId || !eventId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Environment Variables Validation
    const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
    const clientEmail = process.env.GOOGLE_WALLET_CLIENT_EMAIL;
    const privateKeyRaw = process.env.GOOGLE_WALLET_PRIVATE_KEY;

    if (!issuerId || !clientEmail || !privateKeyRaw) {
      console.error('Google Wallet Config Missing:', { 
        hasIssuer: !!issuerId, 
        hasEmail: !!clientEmail, 
        hasKey: !!privateKeyRaw 
      });
      return NextResponse.json({ 
        error: 'Google Wallet integration is not configured on the server. Please check environment variables.' 
      }, { status: 500 });
    }

    // 2. Private Key Fix
    // Replace literal \n with actual newlines if present in env
    const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

    // 3. Generate the same secure token used for the app QR
    // This ensures that scanning the Google Wallet pass uses the same validation pipeline
    const secureBarcodeValue = await generateSecurePassPayload({
      attendeeId: 'google-wallet',
      eventId,
      registrationId,
      participantName: participantName || 'Attendee',
    });

    // 4. Define Google Wallet Objects
    // Production IDs: issuerId.objectSuffix
    const classId = `${issuerId}.EventTicketClass_${eventId}`;
    const objectId = `${issuerId}.EventTicketObject_${registrationId}`;

    const claims = {
      iss: clientEmail,
      aud: 'google',
      typ: 'savetowallet',
      iat: Math.floor(Date.now() / 1000),
      payload: {
        eventTicketClasses: [
          {
            id: classId,
            issuerName: 'SOCIO',
            eventName: {
              defaultValue: {
                language: 'en-US',
                value: eventTitle || 'Event'
              }
            },
            logo: {
              sourceUri: {
                uri: 'https://app.withsocio.com/icon-512x512.png'
              },
              accessibilityText: {
                defaultValue: {
                  language: 'en-US',
                  value: 'SOCIO Logo'
                }
              }
            },
            reviewStatus: 'APPROVED',
            hexBackgroundColor: '#011F7B'
          }
        ],
        eventTicketObjects: [
          {
            id: objectId,
            classId: classId,
            state: 'ACTIVE',
            barcode: {
              type: 'QR_CODE',
              value: secureBarcodeValue,
              alternateText: registrationId
            },
            ticketHolderName: participantName || 'Attendee',
            venue: {
              name: {
                defaultValue: {
                  language: 'en-US',
                  value: venue || 'Venue TBA'
                }
              }
            },
            reservationInfo: {
              confirmationCode: registrationId
            },
            // Metadata for the user inside the pass
            textModulesData: [
              {
                header: 'EVENT DATE',
                body: date || 'TBA',
                id: 'event_date'
              },
              {
                header: 'EVENT TIME',
                body: time || 'TBA',
                id: 'event_time'
              }
            ]
          }
        ]
      }
    };

    // 5. Sign the JWT with RS256 using the service account private key
    const ecPrivateKey = await importPKCS8(privateKey, 'RS256');
    
    const signedJwt = await new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256' })
      .sign(ecPrivateKey);

    const saveUrl = `https://pay.google.com/gp/v/save/${signedJwt}`;

    return NextResponse.json({ 
      saveUrl,
      objectId,
      classId
    });
  } catch (err: any) {
    console.error('Google Wallet Integration Error:', err);
    return NextResponse.json({ 
      error: `Google Wallet API Error: ${err.message}` 
    }, { status: 500 });
  }
}


