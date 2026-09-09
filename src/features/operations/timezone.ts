export function zonedDateTimeToIso(date:string,time:string,timeZone:string) {
  const [year,month,day]=date.split('-').map(Number)
  const [hour,minute]=time.split(':').map(Number)
  const target=Date.UTC(year,month-1,day,hour,minute)
  let instant=target
  for(let attempt=0;attempt<3;attempt++) {
    const parts=new Intl.DateTimeFormat('en-US',{
      timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',
      minute:'2-digit',second:'2-digit',hourCycle:'h23',
    }).formatToParts(new Date(instant))
    const part=(type:string)=>Number(parts.find(item=>item.type===type)?.value)
    const rendered=Date.UTC(
      part('year'),part('month')-1,part('day'),part('hour'),part('minute'),part('second'),
    )
    instant+=target-rendered
  }
  return new Date(instant).toISOString()
}
