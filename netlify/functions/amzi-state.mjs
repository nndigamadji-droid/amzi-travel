import {getStore} from '@netlify/blobs';
import {stateHandler} from '../../lib/cloud-snapshot.mjs';

export default async request=>{
 const store=getStore({name:'amzi-private-state',consistency:'strong'});
 return stateHandler(store,{secret:process.env.AMZI_STATE_TOKEN})(request);
};
