import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';import path from 'node:path';
// Operator-only import of an institution-authorised minimal USN/email mapping.
// Never run against scraped or guessed student records.
const file=process.argv[2];if(!file){console.error('Usage: npm run directory:import -- <authorised-directory.json>');process.exit(1);}
const rows=JSON.parse(fs.readFileSync(file,'utf8'));const allowed=(process.env.RVU_EMAIL_DOMAINS||'rvu.edu.in').split(',').map(s=>s.trim());
if(!Array.isArray(rows)||rows.length>100000)throw new Error('Expected an array of {usn,email,active} records.');
const pattern=new RegExp(process.env.RVU_USN_PATTERN||'^[A-Z0-9][A-Z0-9-]{4,31}$');
const normalized=rows.map(r=>{const usn=String(r.usn||'').trim().toUpperCase(),email=String(r.email||'').trim().toLowerCase();if(!pattern.test(usn)||usn.length>32||!allowed.includes(email.split('@')[1])||!/^[^\s@]+@[^\s@]+$/.test(email))throw new Error('A directory record has an invalid USN or university email. No records imported.');return {usn,email,active:r.active===false?0:1};});
const db=new DatabaseSync(process.env.RVU_DB_PATH||path.join(process.cwd(),'data','rvu.sqlite'));db.exec('PRAGMA busy_timeout=5000; BEGIN IMMEDIATE');
try{const statement=db.prepare('INSERT INTO campus_directory VALUES (?,?,?) ON CONFLICT(usn) DO UPDATE SET email=excluded.email,active=excluded.active');for(const row of normalized)statement.run(row.usn,row.email,row.active);db.exec('COMMIT');console.log(`Imported ${normalized.length} eligible campus records. No personal records were printed.`);}catch(e){db.exec('ROLLBACK');throw e;}finally{db.close();}
