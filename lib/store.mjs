import {DatabaseSync,backup} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {trips} from '../catalog.mjs';
export function openStore(dataDir,dbPath=join(dataDir,'amzi.sqlite')){
 mkdirSync(dirname(dbPath),{recursive:true,mode:0o700});const db=new DatabaseSync(dbPath);
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,username TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,role TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,csrf TEXT NOT NULL,user_id INTEGER REFERENCES users(id),expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS catalog(id TEXT PRIMARY KEY,data TEXT NOT NULL,published INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS quotes(reference TEXT PRIMARY KEY,request_key TEXT NOT NULL UNIQUE,fingerprint TEXT NOT NULL,data TEXT NOT NULL,status TEXT NOT NULL,notes TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,notification TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,last_attempt TEXT);
 CREATE TABLE IF NOT EXISTS history(id INTEGER PRIMARY KEY,reference TEXT NOT NULL REFERENCES quotes(reference),actor TEXT NOT NULL,action TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL);`);
 if(!db.prepare("SELECT 1 FROM metadata WHERE key='catalog_seeded'").get()){
  db.exec('BEGIN IMMEDIATE');try{for(const trip of trips)db.prepare('INSERT OR IGNORE INTO catalog VALUES(?,?,1,?)').run(trip.id,JSON.stringify({...trip,published:true}),new Date().toISOString());db.prepare('INSERT INTO metadata VALUES(?,?)').run('catalog_seeded','1');db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}
 }
 return {db,backup:path=>backup(db,path),close:()=>db.close()};
}
