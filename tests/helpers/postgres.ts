import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Test-only PostgREST transport. Business rules run in the actual SQL migrations.
let db: PGlite;
let actor = 'test-admin';
let queue: Promise<unknown> = Promise.resolve();
const ident = (s: string) => { if (!/^[a-z_][a-z_0-9]*$/i.test(s)) throw Error(`Invalid identifier: ${s}`); return `"${s}"`; };
const param = (v: any) => v !== null && typeof v === 'object' ? JSON.stringify(v) : v;
export async function database() {
  if (db) return db;
  db = new PGlite();
  await db.exec(`CREATE ROLE authenticated; CREATE ROLE anonymous;
    CREATE SCHEMA auth; CREATE SCHEMA neon_auth; CREATE TABLE neon_auth."user"(id text PRIMARY KEY);
    CREATE FUNCTION auth.user_id() RETURNS text LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.actor',true),'') $$;
    GRANT USAGE ON SCHEMA auth TO authenticated,anonymous;
    GRANT EXECUTE ON FUNCTION auth.user_id() TO authenticated,anonymous;`);
  const dir = resolve('neon');
  for (const file of readdirSync(dir).filter(f => f.endsWith('.sql')).sort()) await db.exec(readFileSync(resolve(dir,file),'utf8'));
  await db.exec(`INSERT INTO neon_auth."user" VALUES ('test-admin');
    INSERT INTO profiles(id,username,full_name,role) VALUES ('test-admin','test-admin','Administrateur de test','ADMIN_GENERALE');`);
  return db;
}
export async function resetDatabase() {
  await queue;
  const d = await database();
  await d.exec('ROLLBACK; BEGIN;');
  actor = 'test-admin';
  await d.query("SELECT set_config('test.actor',$1,false)",[actor]);
}
export async function setActor(id: string) { actor = id; }
export async function closeDatabase() { await queue; if (db) await db.close(); db = undefined as any; }
export async function request(sql: string, values: any[] = []) {
  const run = async () => {
    const d = await database();
    await d.exec('SAVEPOINT transport_request');
    try {
      await d.query("SELECT set_config('test.actor',$1,true)",[actor]);
      await d.exec('SET LOCAL ROLE authenticated');
      const result = await d.query(sql,values.map(param));
      // PostgREST encodes SQL numeric as a JSON number; PGlite returns a string.
      for(const field of result.fields)if(field.dataTypeID===1700)for(const row of result.rows as any[])if(row[field.name]!==null)row[field.name]=Number(row[field.name]);
      await d.exec('RESET ROLE; RELEASE SAVEPOINT transport_request');
      return { data: result.rows as any[], error: null };
    } catch (e: any) {
      await d.exec('ROLLBACK TO SAVEPOINT transport_request; RELEASE SAVEPOINT transport_request');
      return { data: null, error: { message:e.message,code:e.code } };
    }
  };
  const result = queue.then(run); queue = result.catch(()=>{}); return result;
}
class Query {
  fields='*'; op='select'; payload:any; conflict='id'; filters: Array<[string,string,any]>=[]; sorts:string[]=[]; offset=0; size:number|undefined; one=false; required=false;
  constructor(private table:string){}
  select(fields='*', _options?:any){this.fields=fields;return this;}
  insert(value:any){this.op='insert';this.payload=value;return this;}
  upsert(value:any, options?:any){this.op='upsert';this.payload=value;this.conflict=options?.onConflict||'id';return this;}
  update(value:any){this.op='update';this.payload=value;return this;}
  delete(){this.op='delete';return this;}
  eq(c:string,v:any){this.filters.push([c,'=',v]);return this;}
  neq(c:string,v:any){this.filters.push([c,'<>',v]);return this;}
  in(c:string,v:any[]){this.filters.push([c,'IN',v]);return this;}
  ilike(c:string,v:any){this.filters.push([c,'ILIKE',v]);return this;}
  is(c:string,v:any){this.filters.push([c,'IS',v]);return this;}
  order(c:string,o?:any){this.sorts.push(`${ident(c)} ${o?.ascending===false?'DESC':'ASC'}`);return this;}
  range(a:number,b:number){this.offset=a;this.size=b-a+1;return this;}
  limit(n:number){this.size=n;return this;}
  single(){this.one=true;this.required=true;return this;}
  maybeSingle(){this.one=true;return this;}
  async execute(){
    const vals:any[]=[]; const bind=(v:any)=>{vals.push(v);return `$${vals.length}`;};
    let sql=''; const table=`public.${ident(this.table)}`;
    if(this.op==='insert'||this.op==='upsert'){
      const rows=(Array.isArray(this.payload)?this.payload:[this.payload]).map(r=>Object.fromEntries(Object.entries(r).filter(([,v])=>v!==undefined)));
      if(!rows.length)return {data:[],error:null};
      const keys=[...new Set(rows.flatMap(r=>Object.keys(r)))];
      sql=`INSERT INTO ${table} (${keys.map(ident)}) VALUES ${rows.map(r=>`(${keys.map(k=>k in r?bind(r[k]):'DEFAULT')})`).join(',')}`;
      if(this.op==='upsert')sql+=` ON CONFLICT (${this.conflict.split(',').map(ident)}) DO UPDATE SET ${keys.map(k=>`${ident(k)}=excluded.${ident(k)}`)}`;
    } else if(this.op==='update')sql=`UPDATE ${table} SET ${Object.entries(this.payload).filter(([,v])=>v!==undefined).map(([k,v])=>`${ident(k)}=${bind(v)}`)}`;
    else if(this.op==='delete')sql=`DELETE FROM ${table}`;
    else sql=`SELECT * FROM ${table}`;
    if(this.filters.length)sql+=` WHERE ${this.filters.map(([c,op,v])=>op==='IN'?`${ident(c)} IN (${v.map(bind)})`:op==='IS'&&v===null?`${ident(c)} IS NULL`:`${ident(c)} ${op} ${bind(v)}`).join(' AND ')}`;
    if(this.op==='select'){
      if(this.sorts.length)sql+=` ORDER BY ${this.sorts.join(',')}`;
      if(this.size!==undefined)sql+=` LIMIT ${bind(this.size)}`;
      if(this.offset)sql+=` OFFSET ${bind(this.offset)}`;
    }else sql+=' RETURNING *';
    const r=await request(sql,vals); if(r.error)return r;
    let rows=r.data!;
    if(this.fields.includes('school_levels('))for(const row of rows){const level=await request('SELECT code,name FROM public.school_levels WHERE id=$1',[row.level_id]);row.school_levels=level.data?.[0];}
    if(this.one){if(rows.length>1||this.required&&rows.length!==1)return {data:null,error:{message:'Enregistrement introuvable.',code:'PGRST116'}};return {data:rows[0]||null,error:null};}
    return {data:rows,error:null,count:rows.length};
  }
  then<T=any,U=never>(resolve?:((value:any)=>T|PromiseLike<T>)|null,reject?:((reason:any)=>U|PromiseLike<U>)|null):Promise<T|U>{return this.execute().then(resolve,reject);}
}
export const client = {
  from:(table:string)=>new Query(table),
  rpc:async(name:string,args:Record<string,any>={})=>{
    const entries=Object.entries(args);
    const r=await request(`SELECT public.${ident(name)}(${entries.map(([key],i)=>`${ident(key)} => $${i+1}`).join(',')}) AS result`,entries.map(([,v])=>v));
    return r.error?r:{data:r.data?.[0]?.result,error:null};
  },
  auth:{getUser:async()=>({data:{user:{id:actor}},error:null}),getSession:async()=>({data:{session:{user:{id:actor}}},error:null}),signOut:async()=>({error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
};
