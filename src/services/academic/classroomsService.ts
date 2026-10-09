import type { ServiceResponse } from './academicYearsService';
import { readRows,readRow,insertRow,updateRow,ok,failure } from '../common/remoteRows';
export interface Classroom {
  id: string;
  schoolId?: string;
  academicYearId: string;
  academicYearName?: string;
  levelId: string;
  levelCode?: string;
  levelName?: string;
  name: string;
  roomName?: string;
  mainTeacherId?: string;
  mainTeacherName?: string;
  capacity: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClassroomFilters {
  academicYearId?: string;
  schoolYearId?: string;
  levelId?: string;
  searchQuery?: string;
  isActive?: boolean | 'all';
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'capacity' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ClassroomListResult {
  classrooms: Classroom[];
  totalCount: number;
  page: number;
  totalPages: number;
}

const columns={schoolId:'school_id',academicYearId:'school_year_id',levelId:'level_id',name:'name',roomName:'room',mainTeacherId:'main_teacher_id',mainTeacherName:'main_teacher_name',capacity:'capacity'};
const mapRow=(r:any):Classroom=>({id:r.id,schoolId:r.school_id,academicYearId:r.school_year_id,levelId:r.level_id,levelCode:r.school_levels?.code,levelName:r.school_levels?.name,name:r.name,roomName:r.room,mainTeacherId:r.main_teacher_id,mainTeacherName:r.main_teacher_name,capacity:r.capacity,isActive:r.status==='ACTIVE',createdAt:r.created_at,updatedAt:r.updated_at});
function toRow(input:Partial<Classroom>){const row:Record<string,unknown>={};for(const[key,column]of Object.entries(columns))if(input[key]!==undefined)row[column]=typeof input[key]==='string'?input[key].trim():input[key];if(input.isActive!==undefined)row.status=input.isActive?'ACTIVE':'INACTIVE';return row;}
export async function searchClassrooms(filters:ClassroomFilters={}):Promise<ServiceResponse<ClassroomListResult>>{
 try{
  let list=(await readRows('classes','*,school_levels(code,name)')).map(mapRow);
  const year=filters.academicYearId||filters.schoolYearId;
  if(year)list=list.filter(c=>c.academicYearId===year);
  if(filters.levelId)list=list.filter(c=>c.levelId===filters.levelId||c.levelCode===filters.levelId);
  if(filters.isActive!=='all')list=list.filter(c=>c.isActive===(filters.isActive??true));
  const q=filters.searchQuery?.trim().toLowerCase();if(q)list=list.filter(c=>[c.name,c.roomName,c.mainTeacherName].some(x=>x?.toLowerCase().includes(q)));
  const key=filters.sortBy||'name',dir=filters.sortOrder==='desc'?-1:1;
  list.sort((a,b)=>dir*(key==='capacity'?a.capacity-b.capacity:String(a[key]||'').localeCompare(String(b[key]||''))));
  const page=Math.max(1,filters.page||1),size=Math.max(1,filters.pageSize||20);
  return ok({classrooms:list.slice((page-1)*size,page*size),totalCount:list.length,page,totalPages:Math.max(1,Math.ceil(list.length/size))});
 }catch(e){return failure(e);}
}
export async function getClassrooms(filters:ClassroomFilters={}):Promise<ServiceResponse<Classroom[]>>{const r=await searchClassrooms({...filters,page:1,pageSize:Number.MAX_SAFE_INTEGER});return r.success?ok(r.data!.classrooms):failure(r.error);}
export async function getClassroom(id:string):Promise<ServiceResponse<Classroom>>{try{return ok(mapRow(await readRow('classes',id,'*,school_levels(code,name)')));}catch(e){return failure(e);}}
export const getClassroomsByLevel=(levelId:string)=>getClassrooms({levelId});
export const getClassroomsByAcademicYear=(academicYearId:string)=>getClassrooms({academicYearId});
export async function createClassroom(input:Partial<Classroom>):Promise<ServiceResponse<Classroom>>{
 try{if(!input.name?.trim()||!input.levelId||!input.academicYearId)throw new Error('Année, niveau et nom requis.');if(input.capacity!==undefined&&(!Number.isInteger(input.capacity)||input.capacity<=0))throw new Error('La capacité doit être un entier positif.');
 return ok(mapRow(await insertRow('classes',{id:input.id||crypto.randomUUID(),...toRow({capacity:35,isActive:true,...input})})));
 }catch(e){return failure(e);}
}
export async function updateClassroom(id:string,input:Partial<Classroom>):Promise<ServiceResponse<Classroom>>{try{return ok(mapRow(await updateRow('classes',id,{...toRow(input),updated_at:new Date().toISOString()})));}catch(e){return failure(e);}}
export async function archiveClassroom(id:string):Promise<ServiceResponse<boolean>>{const r=await updateClassroom(id,{isActive:false});return r.success?ok(true):failure(r.error);}
export async function restoreClassroom(id:string):Promise<ServiceResponse<boolean>>{const r=await updateClassroom(id,{isActive:true});return r.success?ok(true):failure(r.error);}
