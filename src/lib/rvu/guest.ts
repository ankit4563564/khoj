import { cookies } from 'next/headers';
import { hash, secret, rateLimit, sessionUser, HttpError } from './auth';
import { id, now, one, run } from './db';
export async function guestId():Promise<string|undefined>{
  const token=(await cookies()).get('khoj_finder')?.value;
  return token?one<{userId:string}>('SELECT userId FROM guest_sessions WHERE token=? AND expires>?',hash(token),Date.now())?.userId:undefined;
}
export async function finderActor(req:Request):Promise<string>{
  const user=await sessionUser();if(user?.verified)return user.id;
  const existing=await guestId();if(existing)return existing;
  // Trust forwarded IP only when the operator controls the reverse proxy.
  const source=process.env.TRUST_PROXY==='true' ? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown' : 'local';
  rateLimit(`new-finder:${hash(source)}`,200,3600);
  const userId=id('finder'),token=secret();
  run('INSERT INTO users (id,name,email,studentId,department,role,createdAt) VALUES (?,?,?,?,?,?,?)',userId,'Campus finder',`${userId}@internal.invalid`,'','Other','guest',now());
  run('INSERT INTO guest_sessions VALUES (?,?,?)',hash(token),userId,Date.now()+30*86400000);
  (await cookies()).set('khoj_finder',token,{httpOnly:true,secure:process.env.APP_URL?.startsWith('https://')||false,sameSite:'lax',path:'/',maxAge:30*86400});
  return userId;
}
export async function existingFinder():Promise<string>{const user=await sessionUser();const actor=user?.verified?user.id:await guestId();if(!actor)throw new HttpError(401,'Open your receipt in the browser used to report this item.');return actor;}
