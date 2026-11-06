import { database } from './postgres';

// Explicit test records; these never enter a live Neon database.
export async function seedServiceFixtures(testPath:string) {
  const db=await database();
  const years=['ay-2026','ay-2027','ay-2028','ay-2030',...(/financial|tuition/.test(testPath)?['2027-2028']:[])].map(id=>({id,label:id,startDate:'2026-09-14',endDate:'2027-06-30',isActive:id==='ay-2026'}));
  await db.query("INSERT INTO school_settings(id,data) VALUES ('school_years_list',$1)",[JSON.stringify(years)]);
  const ids=['st-001','st-002','st-003','st-004','st-custom-year','st-offline-01','std-hook-academic-1','std-academic-test-1','stu-01','stu-02','stu-03','stu-occupant','stu-transfer-candidate','stu-valid-transfer','stu-hook-test-10','stu-test-1','stu-dup-link','stu-test-primary-rule','stu-test-payer-rule','stu-child-1','stu-child-2','stu-unlink-reassign-test','stu-comm-test','st-med-1','st-med-2','stu-99'];
  for(const id of ids)await db.query('INSERT INTO students(id,matricule,data) VALUES ($1,$2,$3)',[id,`MAT-${id}`,JSON.stringify({id,matricule:`MAT-${id}`,firstName:'Élève',lastName:`Test ${id}`,status:'Actif',schoolYearId:'ay-2026'})]);
  if(/academic|financial|tuition|schoolLevels/.test(testPath)){
    await db.exec("INSERT INTO classes(id,school_year_id,level_id,name,capacity) VALUES ('cls-1','ay-2026','lvl-cp1','CP1 A',30),('cls-2','ay-2026','lvl-cp1','CP1 B',30),('cls-3','ay-2026','lvl-ce1','CE1 A',30)");
  }
  for(const id of ['stf-100','stf-hook-test-contract','stf-hook-test-doc'])await db.query("INSERT INTO staff_members(id,first_name,last_name) VALUES ($1,'Employé','Test')",[id]);
  await db.exec("INSERT INTO expense_categories(id,name) VALUES ('cat-1','Maintenance')");
  if(/financial|tuition/.test(testPath)){
    for(const year of ['ay-2026','2027-2028'])for(const code of ['PS','MS','GS','CP1','CP2','CE1','CE2','CM1','CM2']){
      const record={id:`fees-${year}-${code}`,academicYearId:year,levelCode:code,registrationFee:60000,tuitionFee:300000,totalAnnualFee:360000,status:'ACTIVE',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
      await db.query('INSERT INTO tuition_fee_schedules(id,data) VALUES ($1,$2)',[record.id,JSON.stringify(record)]);
    }
  }
}
