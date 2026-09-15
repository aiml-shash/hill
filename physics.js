import {clamp,wrap} from './config.js';
// 120 Hz rigid body in the route's X/Y plane. Four visual wheels share two axles.
// Spring forces act along surface normals; torque uses each contact's lever arm.
export class Physics{
 constructor(track,v){this.track=track;this.v=v;this.reset();}
 reset(){const h=this.track.height(0);this.s={x:0,y:h+this.v.radius+.76,vx:0,vy:0,a:0,av:0,fuel:this.v.tank,health:100,time:0,grounded:true,contacts:[0,0],air:0,airStart:0,airAngle:0,upside:0,empty:0,dead:null,distance:0};}
 step(dt,input,weather='Sunny'){
 const s=this.s,v=this.v,events=[];if(s.dead)return events;s.time+=dt;
 const was=s.grounded,oldVy=s.vy,oldA=s.a;
 let fx=0,fy=-22*v.mass,torque=0,contacts=0;const cs=Math.cos(s.a),sn=Math.sin(s.a);
 for(let i=0;i<2;i++){
 const lx=i===0?-1.22:1.22,ly=-.27;
 const rx=lx*cs-ly*sn,ry=lx*sn+ly*cs;
 const wx=s.x+rx+sn*.62,wy=s.y+ry-cs*.62;
 const h=this.track.surface(wx,s.time),m=this.track.slope(wx,s.time),inv=1/Math.hypot(1,m),nx=-m*inv,ny=inv;
 const compression=clamp(h+v.radius-wy,0,.7);s.contacts[i]=compression;
 if(compression>0&&cs>-.2){
 contacts++;const cvx=s.vx-s.av*ry,cvy=s.vy+s.av*rx;
 const force=clamp(compression*v.spring-(cvx*nx+cvy*ny)*8.5,0,150);
 fx+=force*nx;fy+=force*ny;torque+=rx*force*ny-ry*force*nx;
 const grip=clamp(v.grip*this.track.grip(wx,weather),.15,1.6);
 let drive=0;
 if(input.throttle>0&&s.fuel>0)drive=v.power*v.mass*500*input.throttle;
 if(input.brake>0)drive=s.vx>1?-30*v.mass*.5: s.fuel>0?-v.power*.3*v.mass:0;
 if(input.handbrake)drive=-s.vx*8*v.mass;
 drive-=s.vx*.09*v.mass;
 drive=clamp(drive,-force*grip*1.8,force*grip*1.8);
 fx+=drive*inv;fy+=drive*m*inv;torque-=drive*.1;
 }
 }
 s.grounded=contacts>0;
 torque+=input.tilt*(s.grounded?2.7:8)*v.mass;
 torque-=s.av*(s.grounded?3: .65)*v.mass;
fx-=.008*s.vx*Math.abs(s.vx);s.vx=clamp(s.vx+fx/v.mass*dt,-9,160934);s.vy+=fy/v.mass*dt;
 s.av=clamp(s.av+torque/(v.mass*2.4)*dt,-5.8,5.8);
 s.x+=s.vx*dt;s.y+=s.vy*dt;s.a+=s.av*dt;
 if(s.x<-12){s.x=-12;s.vx=Math.max(0,s.vx);}
 s.distance=Math.max(s.distance,s.x);
 s.fuel=Math.max(0,s.fuel-dt*(.25+.75*input.throttle+.012*Math.abs(s.vx)));
 // Chassis and roof collision independently of wheel contacts.
 let impact=0;
 for(const lx of [-1.15,1.15]){
 const ly=.66,rx=lx*Math.cos(s.a)-ly*Math.sin(s.a),ry=lx*Math.sin(s.a)+ly*Math.cos(s.a);
 const h=this.track.surface(s.x+rx,s.time);
 if(s.y+ry<h+.12){const penetration=h+.12-s.y-ry;s.y+=Math.min(penetration,.3);impact=Math.max(impact,Math.abs(oldVy)+Math.abs(s.av)*2);
 s.vy=Math.max(s.vy,1.5);s.vx*=.992;s.av*=.99;s.health-=dt*(18+impact*8);}
 }
 if(Math.cos(s.a)<.05&&s.y<this.track.height(s.x,s.time)+2.2)s.upside+=dt;else s.upside=Math.max(0,s.upside-dt*2);
 if(was&&!s.grounded){s.air=0;s.airStart=s.x;s.airAngle=oldA;}
 if(!s.grounded){s.air+=dt;if(was)events.push({type:'jump'});}
 if(!was&&s.grounded){
 const slope=Math.atan(this.track.slope(s.x,s.time)),error=Math.abs(wrap(s.a-slope));
 const normalSpeed=Math.abs(oldVy-s.vx*Math.sin(slope));
 if(s.air>.28){
 events.push({type:'landing',impact:normalSpeed});
 const flips=Math.floor((Math.abs(s.a-s.airAngle)+.15)/(Math.PI*2));
 if(error<.65){
 if(flips)events.push({type:'stunt',name:s.a-s.airAngle>0?'BACKFLIP':'FRONT FLIP',points:500*flips});
 if(s.air>1.1)events.push({type:'stunt',name:'BIG AIR',points:300});
 else events.push({type:'stunt',name:'AIRTIME',points:Math.round(s.air*60)});
 if(s.x-s.airStart>16)events.push({type:'stunt',name:'LONG JUMP',points:250});
 if(error<.22&&normalSpeed<13)events.push({type:'stunt',name:'PERFECT LANDING',points:200});
 }
 //fall damage chan
 // s.health-=Math.max(0,normalSpeed-13)*2.5/v.protection+(error>1?15:0);
  s.health-=Math.max(0,normalSpeed-13)*0.05/v.protection+(error>1?2:0);
 }
 s.air=0;
 }
 if(s.fuel<=0){s.empty+=dt;if(Math.abs(s.vx)<.5&&s.empty>2)s.dead='OUT OF FUEL';if(s.empty>14)s.dead='OUT OF FUEL';}
 if(s.health<=0||s.upside>1.8||impact>24)s.dead='VEHICLE WRECKED';
 if(s.y<this.track.base(s.x)-30)s.dead='LOST IN THE VALLEY';
 s.health=clamp(s.health,100);return events;
 }
}
