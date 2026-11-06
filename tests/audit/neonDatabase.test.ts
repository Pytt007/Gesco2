// @vitest-environment node
import { beforeEach, afterAll, describe, it, expect } from 'vitest';
import { database, resetDatabase, closeDatabase, setActor, client, request } from '../helpers/postgres';

const payload = {
  student:{firstName:'Élève',lastName:'Test'},
  parents:{financialPayer:'MOTHER',mother:{firstName:'Parent',lastName:'Test',phone:'0700000000'}},
  assignment:{schoolYear:'2026-2027',levelId:'lvl-cp1',classId:''},
  payment:{discountType:'FIXED',discountValue:0,paidAmount:10000,paymentMode:'CASH'},
};
const register = (value:any=payload, id='11111111-1111-4111-8111-111111111111') => client.rpc('create_complete_student_enrollment',{p_request_id:id,p_payload:value});
beforeEach(async()=>{
  await resetDatabase();
  const db=await database();
  await db.query("INSERT INTO school_settings(id,data) VALUES ('school_years_list',$1)",[JSON.stringify([{id:'2026-2027',label:'2026-2027',startDate:'2026-09-14',endDate:'',isActive:true}])]);
  await db.query("INSERT INTO tuition_fee_schedules(id,data) VALUES ('fees',$1)",[JSON.stringify({id:'fees',academicYearId:'2026-2027',levelCode:'CP1',registrationFee:10000,tuitionFee:50000,status:'ACTIVE'})]);
},60000);
afterAll(closeDatabase,60000);
describe('Neon migrations and role enforcement in PostgreSQL',()=>{
  it('rejects a signed-in identity without an active profile',async()=>{
    await setActor('unprovisioned');
    expect((await register()).error?.code).toBe('42501');
  });
  it.each(['DIRECTEUR','SECRETAIRE'])('allows initial registration and payment by %s',async role=>{
    const db=await database();
    await db.exec(`INSERT INTO neon_auth."user" VALUES ('registrar');`);
    await db.query("INSERT INTO profiles(id,username,full_name,role) VALUES ('registrar','registrar','Test',$1)",[role]);
    await setActor('registrar');
    const result=await register();
    expect(result.error).toBeNull();
    expect(result.data.enrollment.totalPaid).toBe(10000);
  });
  it.each(['ENSEIGNANT','FINANCE','CAISSIER','CANTINE_TRANSPORT','RESP_CANTINE','RESP_TRANSPORT'])('rejects registration by %s',async role=>{
    const db=await database();
    await db.exec(`INSERT INTO neon_auth."user" VALUES ('other');`);
    await db.query("INSERT INTO profiles(id,username,full_name,role) VALUES ('other','other','Test',$1)",[role]);
    await setActor('other'); expect((await register()).error?.code).toBe('42501');
  });
  it('registers atomically, retries once, collects and cancels payment with consistent balances',async()=>{
    const first=await register(); expect(first.error).toBeNull();
    expect(first.data.enrollment).toMatchObject({totalPaid:10000,remainingBalance:50000});
    expect((await register()).data.payment.id).toBe(first.data.payment.id);
    expect((await request('SELECT * FROM tuition_payments')).data).toHaveLength(1);
    const paid=await client.rpc('record_tuition_payment',{p_request_id:'second-payment',p_input:{enrollmentId:first.data.enrollment.id,amount:20000,paymentMode:'CASH'}});
    expect(paid.error).toBeNull(); expect(paid.data.enrollment.totalPaid).toBe(30000);
    expect((await client.rpc('cancel_tuition_payment',{p_id:'second-payment',p_reason:'Annulation de test'})).data).toBe(true);
    const balance=await client.from('student_financial_enrollments').select('data').single();
    expect(balance.data.data).toMatchObject({totalPaid:10000,remainingBalance:50000});
  });
  it('rolls back every row when enrollment fails',async()=>{
    const r=await register({...payload,payment:{...payload.payment,customInstallments:[{amountDue:1}]}});
    expect(r.error).not.toBeNull();
    for(const table of ['students','parents','student_enrollments','student_financial_enrollments','tuition_payments'])expect((await request(`SELECT * FROM ${table}`)).data).toHaveLength(0);
  });
  it('rolls back all writes if the final audit insertion fails',async()=>{
    const db=await database();
    await db.exec(`CREATE FUNCTION public.fail_test_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Forced final failure'; END $$;
      CREATE TRIGGER fail_test_audit BEFORE INSERT ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.fail_test_audit();`);
    expect((await register()).error?.message).toContain('Forced final failure');
    for(const table of ['students','parents','student_parent_links','student_enrollments','student_financial_enrollments','tuition_payments'])expect((await request(`SELECT * FROM ${table}`)).data).toHaveLength(0);
  });
  it('denies direct finance writes and medical reads to a teacher',async()=>{
    const db=await database();
    await db.exec(`INSERT INTO students(id,matricule,data) VALUES ('sample','TEST','{"firstName":"Test","lastName":"Test"}');`);
    await db.exec(`INSERT INTO neon_auth."user" VALUES ('teacher'); INSERT INTO profiles(id,username,full_name,role) VALUES ('teacher','teacher','Test','ENSEIGNANT'); INSERT INTO medical_records(id,student_id,data) VALUES ('medical','sample','{}');`);
    await setActor('teacher');
    expect((await client.rpc('save_financial_enrollment',{p_data:{}})).error?.code).toBe('42501');
    expect((await client.from('medical_records').select('*')).data).toEqual([]);
  });
  it('rejects a suspended administrator',async()=>{
    const db=await database();
    await db.exec(`INSERT INTO neon_auth."user" VALUES ('suspended'); INSERT INTO profiles(id,username,full_name,role,status) VALUES ('suspended','suspended','Test','ADMIN_GENERALE','SUSPENDU');`);
    await setActor('suspended'); expect((await register()).error?.code).toBe('42501');
  });
  it('requires a payment mode when collecting initial fees',async()=>{
    expect((await register({...payload,payment:{...payload.payment,paymentMode:null}})).error?.message).toContain('Mode de paiement invalide');
  });
});
