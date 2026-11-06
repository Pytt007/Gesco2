import type { ServiceResponse } from './academicYearsService';
import { readRows,readRow,insertRow,updateRow,deleteRow,ok,failure } from '../common/remoteRows';
export interface SchoolLevel {
  id: string;
  schoolId?: string;
  cycleId: string;
  code: string;
  name: string;
  shortName: string;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const columns = {'schoolId': 'school_id', 'cycleId': 'cycle_id', 'code': 'code', 'name': 'name', 'shortName': 'short_name', 'sortOrder': 'sort_order', 'isActive': 'is_active'} as const;
const mapRow=(r:any):SchoolLevel=>({id:r.id,schoolId:r.school_id,cycleId:r.cycle_id,code:r.code,name:r.name,shortName:r.short_name,sortOrder:r.sort_order,isActive:r.is_active,createdAt:r.created_at,updatedAt:r.updated_at});
function toRow(input:Record<string,any>){const row:Record<string,unknown>={};for(const [key,column] of Object.entries(columns))if(input[key]!==undefined)row[column]=typeof input[key]==='string'?input[key].trim():input[key];return row;}
export async function getLevels():Promise<ServiceResponse<SchoolLevel[]>>{try{return ok((await readRows('school_levels')).filter(r=>!r.is_deleted).map(mapRow).sort((a,b)=>a.sortOrder-b.sortOrder));}catch(e){return failure(e);}}
export async function getLevel(id:string):Promise<ServiceResponse<SchoolLevel>>{try{return ok(mapRow(await readRow('school_levels',id)));}catch(e){return failure(e);}}
export async function createLevel(input:Partial<SchoolLevel>):Promise<ServiceResponse<SchoolLevel>>{try{const value={sortOrder:1,isActive:true,...input,code:input.code||input.name?.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'_').slice(0,20)};if(!value.cycleId?.trim()||!value.name?.trim()||!value.code?.trim())throw new Error('Les champs obligatoires sont manquants.');return ok(mapRow(await insertRow('school_levels',{id:input.id||crypto.randomUUID(),...toRow(value)})));}catch(e){return failure(e);}}
export async function updateLevel(id:string,input:Partial<SchoolLevel>):Promise<ServiceResponse<SchoolLevel>>{try{return ok(mapRow(await updateRow('school_levels',id,{...toRow(input),updated_at:new Date().toISOString()})));}catch(e){return failure(e);}}
export async function archiveLevel(id:string):Promise<ServiceResponse<boolean>>{const result=await updateLevel(id,{isActive:false});return result.success?ok(true):failure(result.error);}
export function clearLevelsCache():void{}
export async function getLevelsByCycle(cycleId:string):Promise<ServiceResponse<SchoolLevel[]>>{const result=await getLevels();return result.success?ok(result.data!.filter(l=>l.cycleId===cycleId)):failure(result.error);}
export async function deleteLevel(id:string):Promise<ServiceResponse<boolean>>{try{await deleteRow('school_levels',id);return ok(true);}catch(e){return failure(e);}}
