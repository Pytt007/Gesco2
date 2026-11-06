import type { ServiceResponse } from './academicYearsService';
import { readRows,readRow,insertRow,updateRow,deleteRow,ok,failure } from '../common/remoteRows';
export interface SchoolCycle {
  id: string;
  schoolId?: string;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const columns = {'schoolId': 'school_id', 'code': 'code', 'name': 'name', 'sortOrder': 'sort_order', 'isActive': 'is_active'} as const;
const mapRow=(r:any):SchoolCycle=>({id:r.id,schoolId:r.school_id,code:r.code,name:r.name,sortOrder:r.sort_order,isActive:r.is_active,createdAt:r.created_at,updatedAt:r.updated_at});
function toRow(input:Record<string,any>){const row:Record<string,unknown>={};for(const [key,column] of Object.entries(columns))if(input[key]!==undefined)row[column]=typeof input[key]==='string'?input[key].trim():input[key];return row;}
export async function getCycles():Promise<ServiceResponse<SchoolCycle[]>>{try{return ok((await readRows('school_cycles')).filter(r=>!r.is_deleted).map(mapRow).sort((a,b)=>a.sortOrder-b.sortOrder));}catch(e){return failure(e);}}
export async function getCycle(id:string):Promise<ServiceResponse<SchoolCycle>>{try{return ok(mapRow(await readRow('school_cycles',id)));}catch(e){return failure(e);}}
export async function createCycle(input:Partial<SchoolCycle>):Promise<ServiceResponse<SchoolCycle>>{try{const value={sortOrder:1,isActive:true,...input,code:input.code||input.name?.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'_').slice(0,20)};if(!value.name?.trim()||!value.code?.trim())throw new Error('Les champs obligatoires sont manquants.');return ok(mapRow(await insertRow('school_cycles',{id:input.id||crypto.randomUUID(),...toRow(value)})));}catch(e){return failure(e);}}
export async function updateCycle(id:string,input:Partial<SchoolCycle>):Promise<ServiceResponse<SchoolCycle>>{try{return ok(mapRow(await updateRow('school_cycles',id,{...toRow(input),updated_at:new Date().toISOString()})));}catch(e){return failure(e);}}
export async function archiveCycle(id:string):Promise<ServiceResponse<boolean>>{const result=await updateCycle(id,{isActive:false});return result.success?ok(true):failure(result.error);}
