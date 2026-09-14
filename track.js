import {MAPS,clamp} from './config.js';
// Identical seeded terrain for rendering and collisions. No random state in physics.
export const hash=n=>{const q=Math.sin(n*127.1+311.7)*43758.5453;return q-Math.floor(q);};
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
export class Track{
 constructor(map=0){this.map=map;this.theme=MAPS[map];}
 base(x){const fade=smooth((x-14)/48),difficulty=Math.min(1+x/1800,2.3)*this.theme.rough;
 return 6+fade*(Math.sin(x*.047)*4+Math.sin(x*.103+.5)*1.8+Math.sin(x*.021)*6)*difficulty;}
 feature(x){const n=Math.floor((x-100)/150);if(n<0)return null;const start=100+n*150;const types=['bridge','mud','log','jump','water','rock','broken','moving','falling'];return {id:n,type:types[(n+this.map*2)%types.length],start,end:start+18};}
 height(x,t=0){let h=this.base(x);const f=this.feature(x);if(!f||x<f.start||x>f.end)return h;
 const q=(x-f.start)/18;
 if(f.type==='bridge'||f.type==='broken'||f.type==='moving'){
 h=this.base(f.start)*(1-q)+this.base(f.end)*q;
 if(f.type==='moving')h+=Math.sin(t*1.4)*.7*Math.sin(q*Math.PI);
 }
 if(f.type==='log')h+=.5*Math.exp(-Math.pow((q-.5)*13,2));
 if(f.type==='rock')h+=.8*Math.exp(-Math.pow((q-.5)*9,2));
 if(f.type==='jump')h+=4*Math.pow(Math.sin(q*Math.PI),2);
 return h;}
 ground(x,z){const f=this.feature(x);if(f&&x>=f.start&&x<=f.end&&['bridge','broken','moving'].includes(f.type))return this.base(x)-8;
 return this.base(x)-Math.min(2,Math.abs(z)*.02)+(Math.sin(x*.028+z*.12)*6+Math.sin(z*.23)*3)*smooth((Math.abs(z)-4)/15);}
 surface(x,t=0){const f=this.feature(x);if(f&&x>f.start+7&&x<f.start+10&&f.type==='broken')return -100;
 return this.height(x,t);}
 slope(x,t=0){return (this.height(x+.15,t)-this.height(x-.15,t))/.3;}
 grip(x,weather){const f=this.feature(x);const type=f&&x>=f.start&&x<=f.end?f.type:'';return this.theme.grip*(type==='mud'?.5:type==='water'?.65:1)*(weather==='Rain'?.82:1);}
 obstacle(x,t){const f=this.feature(x);if(!f||f.type!=='falling')return null;const phase=(t+f.id*.7)%5;return {x:f.start+9,y:this.height(f.start+9,t)+Math.max(.8,13-phase*5),id:f.id};}
}
