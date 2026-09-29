import { NextResponse } from 'next/server';
import { choice, hash, HttpError, originCheck, rateLimit, text } from '@/lib/rvu/auth';
import { existingFinder, finderActor } from '@/lib/rvu/guest';
import { audit, id, matchReport, notify, now, one, report, run, transaction } from '@/lib/rvu/db';
import { decodeUsn } from '@/lib/rvu/identity';
import { completeHandover } from '@/lib/rvu/recovery';
import { categories, departments, type Handover, type Report } from '@/lib/rvu/types';
import { extractAndSaveFoundFingerprint } from '@/lib/rvu/fingerprints';
export const runtime='nodejs';export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
const fail=(e:unknown)=>json({error:e instanceof HttpError?e.message:'Unable to save this report. Please try again.'},e instanceof HttpError?e.status:500);
export async function GET(req:Request){try{const actor=await existingFinder();const reportId=new URL(req.url).searchParams.get('id')||'';const r=report(reportId);if(!r||r.userId!==actor)throw new HttpError(404,'This receipt is not available in this browser.');const h=one<Handover>('SELECT * FROM handovers WHERE reportId=?',reportId);return json({report:{id:r.id,title:r.title,location:r.location,date:r.date,status:r.status,imageId:r.imageId},handover:h?{point:h.point,ownerConfirmed:Boolean(h.ownerConfirmed),finderConfirmed:Boolean(h.finderConfirmed),returnedAt:h.returnedAt,finderUpi:h.finderUpi}:null});}catch(e){return fail(e);}}
export async function POST(req:Request){try{
  originCheck(req);const raw=await req.text();if(raw.length>12000)throw new HttpError(413,'Report is too large.');const p=JSON.parse(raw);const actor=await finderActor(req);
  if(p.action==='confirm_finder'||p.action==='finder_upi'){
    const reportId=text(p.reportId,'Report reference');const r=report(reportId);if(!r||r.userId!==actor)throw new HttpError(404,'Receipt not found.');
    const h=one<Handover>('SELECT * FROM handovers WHERE reportId=?',reportId);if(!h)throw new HttpError(409,'Ownership must be verified before handover.');
    if(p.action==='finder_upi'){const upi=text(p.upi,'UPI ID',3,120);if(!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/.test(upi))throw new HttpError(400,'Enter a valid UPI ID.');run('UPDATE handovers SET finderUpi=? WHERE reportId=?',upi,reportId);}
    else transaction(()=>{if(h.returnedAt)throw new HttpError(409,'This return is already complete.');run('UPDATE handovers SET finderConfirmed=1 WHERE reportId=?',reportId);completeHandover(reportId,actor);});
    return json({ok:true});
  }
  rateLimit(`public-report:${actor}`,12,3600);
  const location=text(p.location,'Location',2,150);
  const currentDate=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
  const date=p.date?text(p.date,'Date',10,10):currentDate;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||date>currentDate)throw new HttpError(400,'Choose a valid date that is not in the future.');
  let target:string|null=null,subjectHash:string|null=null;
  if(p.action==='found_id'){
    const usn=decodeUsn(p.payload);subjectHash=hash(usn);
    // This is a reporting action, never a public identity lookup. All valid
    // inputs have the same response whether linked, unlinked, inactive or unknown.
    target=one<{userId:string}>("SELECT userId FROM identity_links WHERE usn=? AND status='LINKED'",usn)?.userId||null;
  }else if(p.action!=='found_report')throw new HttpError(400,'Unknown reporting action.');
  const imageId=p.action==='found_id'?null:typeof p.imageId==='string'&&p.imageId?p.imageId:null;
  if(imageId&&!one('SELECT id FROM uploads WHERE id=? AND userId=?',imageId,actor))throw new HttpError(400,'Upload your own photo first.');
  const r:Report={id:`RVU-${id('').replaceAll('-','').slice(0,12).toUpperCase()}`,userId:actor,kind:'found',title:p.action==='found_id'?'College ID card':text(p.title,'Item name',3,100),category:p.action==='found_id'?'ID cards':choice(p.category,categories,'category'),color:p.action==='found_id'?'':text(p.color||'','Colour',0,60),brand:p.action==='found_id'?'':text(p.brand||'','Brand',0,80),description:p.action==='found_id'?'A college ID card was found. The recovery is handled privately.':text(p.description,'Description',10,2000),privateDetail:p.action==='found_id'?'':text(p.privateDetail||'','Private identifying detail',0,1000),location,date,department:p.action==='found_id'?'Other':choice(p.department||'Other',departments,'school'),status:'open',imageId,createdAt:now(),custodyLocation:''};
  transaction(()=>{run('INSERT INTO reports (id,userId,kind,title,category,color,brand,description,privateDetail,location,date,department,status,imageId,createdAt,custodyLocation) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',r.id,r.userId,r.kind,r.title,r.category,r.color,r.brand,r.description,r.privateDetail!,r.location,r.date,r.department,r.status,r.imageId,r.createdAt,'');
    if(subjectHash){run('INSERT INTO found_ids VALUES (?,?,?,?)',r.id,target,subjectHash,now());run('INSERT INTO identity_audit VALUES (?,?,?,?,?)',id('identity'),actor,'found_id_reported',subjectHash,now());if(target){const recent=one<{n:number}>('SELECT COUNT(*) AS n FROM found_ids WHERE targetUserId=? AND createdAt>?',target,new Date(Date.now()-3600000).toISOString())!.n;if(recent<=3)notify(target,'Someone reported your college ID. Review the recovery privately.','/profile');}}
    else matchReport(r);
    audit(actor,r.id,'Found report submitted');
  });

  // Phase 3: Extract and persist found item fingerprint without breaking report flow
  try {
    await extractAndSaveFoundFingerprint({
      foundReportId: r.id,
      imageId,
      location: r.location,
      foundAt: r.date,
      finderNotes: r.description,
      actorUserId: actor,
    });
    // Phase 5: Generate vector embedding for found report
    try {
      const { generateFoundReportEmbedding } = await import('@/lib/rvu/embeddings');
      await generateFoundReportEmbedding(r.id);
    } catch (embErr) {
      console.warn('Found report embedding warning:', embErr);
    }
    // Phase 4: Baseline candidate matching engine (generates and stores candidate scorecards, no auto-verification)
    const { matchFoundItem } = await import('@/lib/rvu/matching');
    await matchFoundItem(r.id);
    // Phase 6: Multimodal candidate reranking engine (ranks candidates, no ownership verdict)
    try {
      const { rerankFoundCandidates } = await import('@/lib/rvu/reranking');
      await rerankFoundCandidates(r.id);
    } catch (rerankErr) {
      console.warn('Multimodal candidate reranking warning:', rerankErr);
    }
  } catch (fpErr) {
    console.warn('Found item processing background warning:', fpErr);
  }

  return json({ok:true,id:r.id,message:p.action==='found_id'?'Report received. If this ID is linked, we’ll privately notify its owner. Keep the card safe and retain this receipt.':'Found report received. Keep this receipt to track the return.'});
}catch(e){return fail(e);}}
