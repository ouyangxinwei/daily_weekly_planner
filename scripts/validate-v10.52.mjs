import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getTodoCenterSections, getTodoFollowupDateState } from '../company-todo-center.js';

const today='2026-11-20';
const tasks=[
 {id:'overdue',status:'todo',due_date:'2026-11-19'},
 {id:'done-overdue',status:'completed',due_date:'2026-11-19'},
 {id:'today',status:'in_progress',due_date:'2026-11-20'},
 {id:'tomorrow',status:'blocked',due_date:'2026-11-21'},
 {id:'last-day',status:'todo',due_date:'2026-11-27'},
 {id:'outside',status:'todo',due_date:'2026-11-28'},
 {id:'undated',status:'todo',due_date:null}
];
const followups=[
 {id:'followup-later',status:'pending',data:{next_follow_up_date:'2026-11-25'}},
 {id:'followup-overdue',status:'pending',data:{next_follow_up_date:'2026-11-19'}},
 {id:'followup-today',status:'pending',data:{next_follow_up_date:'2026-11-20'}},
 {id:'followup-no-date',status:'pending',data:{}},
 {id:'followup-completed',status:'completed',data:{next_follow_up_date:'2026-11-18'}}
];
const sections=getTodoCenterSections(tasks,followups,today);
assert.deepEqual(sections.map(section=>section.records.map(record=>record.id)),[
 ['overdue'],['today'],['tomorrow','last-day'],['undated'],
 ['followup-overdue','followup-today','followup-later','followup-no-date']
]);
assert.equal(getTodoFollowupDateState(followups[1],today),'todoFollowupOverdue');
assert.equal(getTodoFollowupDateState(followups[2],today),'todoFollowupToday');
assert.equal(getTodoFollowupDateState(followups[3],today),'todoNoNextDate');
assert.deepEqual(getTodoCenterSections([],[],today).map(section=>section.records.length),[0,0,0,0,0]);
const source=readFileSync(new URL('../company-business.js',import.meta.url),'utf8');
for(const marker of ["id = 'cw-business-todos'","loadTodoCenter()","fetchCompleteRecords('/records?record_type=task'","fetchCompleteRecords('/records?record_type=follow_up'","getTodoCenterSections(tasks,followups,today)","openRelatedRecord(section.type,record)"])assert.ok(source.includes(marker),'Missing to-do center integration: '+marker);
for(const label of ["todoCenter:'待办中心'","todoCenter:'To-do center'","todoCenter:'To-doセンター'"])assert.ok(source.includes(label),'Missing translation: '+label);
console.log('V10.52 to-do center validation passed.');
