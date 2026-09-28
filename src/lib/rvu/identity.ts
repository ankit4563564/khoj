import { HttpError } from './auth';
// A structural check, not proof of enrollment. Only a trusted directory match or
// staff review can transition an identity to LINKED.
export function decodeUsn(payload: unknown): string {
  if(typeof payload!=='string' || payload.length>512) throw new HttpError(400,'This QR does not contain a supported college identifier. Enter the USN manually.');
  let value=payload.trim();
  if(value.startsWith('{')) {
    try { const parsed=JSON.parse(value); if(typeof parsed.usn!=='string' || Object.keys(parsed).some(k=>!['usn','version'].includes(k)))throw new Error(); value=parsed.usn; } catch {throw new HttpError(400,'QR format not recognised. Enter the USN printed on the card.');}
  }
  value=value.trim().toUpperCase();
  const pattern=process.env.RVU_USN_PATTERN||'^[A-Z0-9][A-Z0-9-]{4,31}$';
  if(!new RegExp(pattern).test(value)||value.length>32||!/^[A-Z0-9-]+$/.test(value)) throw new HttpError(400,'Enter a valid college USN using letters, numbers or hyphens.');
  return value;
}
