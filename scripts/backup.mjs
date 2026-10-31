import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdir} from 'node:fs/promises';
import {openStore} from '../lib/store.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const dataDir=resolve(process.env.AMZI_DATA_DIR||join(root,'data'));
const targetDir=resolve(process.env.AMZI_BACKUP_DIR||join(dataDir,'backups'));
await mkdir(targetDir,{recursive:true,mode:0o700});
const store=openStore(dataDir);
try{const target=join(targetDir,'amzi-manuel-'+new Date().toISOString().replaceAll(':','-')+'.sqlite');await store.backup(target);console.log('Sauvegarde créée : '+target)}finally{store.close()}
