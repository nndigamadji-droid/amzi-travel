import {randomBytes,scrypt as scryptCallback,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(scryptCallback);
export const hashToken=s=>createHash('sha256').update(s).digest('hex');
export async function hashPassword(password){const salt=randomBytes(16).toString('hex');return salt+':'+(await scrypt(password,salt,64)).toString('hex')}
export async function verifyPassword(password,stored){const [salt,hash]=stored.split(':');const candidate=await scrypt(password,salt,64);return hash.length===128&&timingSafeEqual(Buffer.from(hash,'hex'),candidate)}
export function createSession(db,userId=null){const token=randomBytes(32).toString('hex'),csrf=randomBytes(24).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(hashToken(token),csrf,userId,Date.now()+8*3600_000);return {token,csrf}}
export function sessionFromRequest(db,req){const token=/amzi_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie||'')?.[1];if(!token)return null;return db.prepare('SELECT s.*,u.username,u.role FROM sessions s LEFT JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>?').get(hashToken(token),Date.now())||null}
