import * as THREE from './assets/vendor/three.module.js';
export class Effects{
 constructor(scene){
 this.count=250;this.pos=new Float32Array(this.count*3);this.life=new Float32Array(this.count);this.vel=new Float32Array(this.count*3);this.cursor=0;
 this.geo=new THREE.BufferGeometry();this.geo.setAttribute('position',new THREE.BufferAttribute(this.pos,3));this.pos.fill(-999);
 this.mat=new THREE.PointsMaterial({color:0xd9c69c,size:.21,transparent:true,opacity:.58,depthWrite:false});
 this.points=new THREE.Points(this.geo,this.mat);this.points.frustumCulled=false;scene.add(this.points);
 this.wp=new Float32Array(1000*3);for(let i=0;i<1000;i++){this.wp[i*3]=(Math.random()-.5)*110;this.wp[i*3+1]=Math.random()*45;this.wp[i*3+2]=(Math.random()-.5)*65;}
 this.wg=new THREE.BufferGeometry();this.wg.setAttribute('position',new THREE.BufferAttribute(this.wp,3));this.wm=new THREE.PointsMaterial({color:0xf2f7f9,size:.13,transparent:true,opacity:.7});this.weather=new THREE.Points(this.wg,this.wm);this.weather.frustumCulled=false;scene.add(this.weather);
 }
 burst(x,y,n=12){for(let i=0;i<n;i++){const k=this.cursor++%this.count;this.pos[k*3]=x+(Math.random()-.5)*2;this.pos[k*3+1]=y;this.pos[k*3+2]=(Math.random()-.5)*1.8;this.vel[k*3]=-1-Math.random()*3;this.vel[k*3+1]=1+Math.random()*3;this.vel[k*3+2]=(Math.random()-.5)*2;this.life[k]=.6+Math.random()*.6;}}
 update(dt,s,weather,active){
 for(let i=0;i<this.count;i++){if(this.life[i]<=0)continue;this.life[i]-=dt;if(this.life[i]<=0){this.pos[i*3+1]=-999;continue;}for(let j=0;j<3;j++)this.pos[i*3+j]+=this.vel[i*3+j]*dt;this.vel[i*3+1]-=2*dt;}
 if(active&&s.grounded&&Math.abs(s.vx)>3&&Math.random()<.5)this.burst(s.x-1.2,s.y-.6,2);
 this.geo.attributes.position.needsUpdate=true;this.weather.visible=['Rain','Snow','Ash'].includes(weather);
 if(this.weather.visible){this.weather.position.set(s.x,s.y,0);this.wm.size=weather==='Rain'?.09:.2;for(let i=0;i<1000;i++){this.wp[i*3+1]-=dt*(weather==='Rain'?27:3.5);if(this.wp[i*3+1]<-5)this.wp[i*3+1]=40;}this.wg.attributes.position.needsUpdate=true;}
 }
}

