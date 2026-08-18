export type CivilEventWindow={id:string;number:string;eventDate:string;startTime:string;endTime:string;setupTime?:string|null};

function minutes(value:string){const [h,m]=value.split(":").map(Number);return h*60+m;}
export function eventInterval(event:CivilEventWindow){
  const day=Date.parse(`${event.eventDate}T00:00:00.000Z`)/60000;
  const start=day+minutes(event.startTime); let end=day+minutes(event.endTime); if(end<=start)end+=1440;
  let operationalStart=start;
  if(event.setupTime){operationalStart=day+minutes(event.setupTime);if(operationalStart>start)operationalStart-=1440;}
  return {start:operationalStart,end};
}
export function eventsOverlap(a:CivilEventWindow,b:CivilEventWindow){const x=eventInterval(a),y=eventInterval(b);return x.start<y.end&&y.start<x.end;}
export function findStaffConflicts(events:CivilEventWindow[]){const pairs:Array<{first:CivilEventWindow;second:CivilEventWindow}>=[];for(let i=0;i<events.length;i++)for(let j=i+1;j<events.length;j++)if(eventsOverlap(events[i],events[j]))pairs.push({first:events[i],second:events[j]});return pairs;}
