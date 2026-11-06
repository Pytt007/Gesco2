import { supabase } from '../common/supabaseClient';
import type { ServiceResponse } from './academicYearsService';
import { readRows,readRow,ok,failure } from '../common/remoteRows';
export type AssignmentStatus = 'Actif' | 'Transféré' | 'Archivé';

export interface StudentAssignment {
  id: string;
  schoolId?: string;
  studentId: string;
  studentName?: string;
  classroomId: string;
  classroomName?: string;
  academicYearId: string;
  academicYearName?: string;
  assignmentDate: string;
  exitDate?: string;
  status: AssignmentStatus;
  createdAt?: string;
  updatedAt?: string;
}

const mapRow=(r:any):StudentAssignment=>({id:r.id,studentId:r.student_id,classroomId:r.classroom_id,academicYearId:r.academic_year_id,assignmentDate:r.assignment_date,exitDate:r.exit_date,status:r.status,createdAt:r.created_at,updatedAt:r.updated_at});
export async function getAssignments():Promise<ServiceResponse<StudentAssignment[]>>{try{return ok((await readRows('student_class_assignments')).map(mapRow));}catch(e){return failure(e);}}
async function filtered(predicate:(a:StudentAssignment)=>boolean):Promise<ServiceResponse<StudentAssignment[]>>{const r=await getAssignments();return r.success?ok(r.data!.filter(predicate)):failure(r.error);}
export const getAssignmentsByClass=(id:string)=>filtered(a=>a.classroomId===id);
export const getClassroomAssignments=getAssignmentsByClass;
export const getAssignmentsByYear=(id:string)=>filtered(a=>a.academicYearId===id);
export const getStudentAssignments=(id:string)=>filtered(a=>a.studentId===id);
export async function getStudentAssignment(studentId:string,academicYearId:string):Promise<ServiceResponse<StudentAssignment|null>>{const r=await filtered(a=>a.studentId===studentId&&a.academicYearId===academicYearId&&a.status==='Actif');return r.success?ok(r.data![0]||null):failure(r.error);}
export async function assignStudent(studentId:string,classroomId:string,academicYearId:string,assignmentDate?:string,ignoreCapacity=false):Promise<ServiceResponse<StudentAssignment>>{
 try{const {data,error}=await supabase.rpc('assign_student',{p_id:crypto.randomUUID(),p_student_id:studentId,p_classroom_id:classroomId,p_year_id:academicYearId,p_date:assignmentDate||new Date().toISOString().slice(0,10),p_ignore_capacity:ignoreCapacity});if(error||!data)throw new Error(error?.message||'Affectation non confirmée.');return ok(mapRow(data));}catch(e){return failure(e);}
}
export const transferStudent=(studentId:string,classroomId:string,academicYearId:string,date?:string)=>assignStudent(studentId,classroomId,academicYearId,date,false);
export async function archiveAssignment(id:string):Promise<ServiceResponse<boolean>>{try{const{error}=await supabase.rpc('archive_assignment',{p_id:id});if(error)throw new Error(error.message);return ok(true);}catch(e){return failure(e);}}
export async function restoreAssignment(id:string):Promise<ServiceResponse<boolean>>{try{const row=await readRow('student_class_assignments',id);const r=await assignStudent(row.student_id,row.classroom_id,row.academic_year_id);return r.success?ok(true):failure(r.error);}catch(e){return failure(e);}}
