import {describe,expect,it} from "vitest";
import {eventsOverlap,eventInterval} from "@/lib/staff/conflicts";
const event=(id:string,date:string,setup:string,start:string,end:string)=>({id,number:id,eventDate:date,setupTime:setup,startTime:start,endTime:end});
describe("conflictos de personal",()=>{
  it("detecta superposición incluyendo armado y cruce de medianoche",()=>{expect(eventsOverlap(event("A","2026-08-20","18:30","21:00","03:00"),event("B","2026-08-20","20:00","22:00","04:00"))).toBe(true)});
  it("no marca eventos consecutivos",()=>{expect(eventsOverlap(event("A","2026-08-20","18:00","19:00","21:00"),event("B","2026-08-20","21:00","22:00","23:00"))).toBe(false)});
  it("ubica armado previo en el día anterior cuando corresponde",()=>{const x=eventInterval(event("A","2026-08-20","22:30","01:00","04:00"));expect(x.end-x.start).toBe(330)});
});
