// ============================================================================
// JWT Utilities for Tracking Tokens
// ============================================================================

export interface TrackingTokenPayload {
  sessionId: string;
  userId: string;
  campaignId: string;
  workspaceId: string;
  projectId: string;
  landingPageId: string;
  abTestId?: string;
  abTestVariantId?: string;
  timestamp: number;
  exp: number; // Expiry timestamp
}

/**
 * Generate a tracking JWT token containing session and campaign data
 */
export async function generateTrackingToken(
  payload: Omit<TrackingTokenPayload, 'exp' | 'timestamp'>,
  secret: string,
  expiryMinutes = 30
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: TrackingTokenPayload = {
    ...payload,
    timestamp: now,
    exp: now + (expiryMinutes * 60),
  };

  // Create JWT header
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  // Base64 encode header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  // Create signature
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = await signHmacSha256(data, secret);

  return `${data}.${signature}`;
}

/**
 * Verify and decode a tracking JWT token
 */
export async function verifyTrackingToken(
  token: string,
  secret: string
): Promise<TrackingTokenPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    const data = `${encodedHeader}.${encodedPayload}`;

    // Verify signature
    const expectedSignature = await signHmacSha256(data, secret);
    if (signature !== expectedSignature) {
      return null;
    }

    // Decode payload
    const payload: TrackingTokenPayload = JSON.parse(base64UrlDecode(encodedPayload));

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return null; // Token expired
    }

    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Base64 URL encode (RFC 7515)
 */
function base64UrlEncode(data: string): string {
  return btoa(data)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Base64 URL decode (RFC 7515)
 */
function base64UrlDecode(data: string): string {
  // Add padding if needed
  const padding = data.length % 4;
  if (padding === 2) {
    data += '==';
  } else if (padding === 3) {
    data += '=';
  }

  return atob(data.replace(/-/g, '+').replace(/_/g, '/'));
}

/**
 * Sign data using HMAC SHA-256
 */
async function signHmacSha256(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(data)
  );

  const signatureArray = new Uint8Array(signature);
  return base64UrlEncode(String.fromCharCode(...signatureArray));
}