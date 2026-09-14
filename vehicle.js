import * as THREE from './assets/vendor/three.module.js';
export class Vehicle{
 constructor(scene,id,v){
 this.group=new THREE.Group();scene.add(this.group);this.wheels=[];this.springs=[];this.v=v;this.id=id;
 this.materials=[];this.geometries=[];
 const mat=(color,other={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.52,...other});this.materials.push(m);return m;};
 const body=mat(v.color,{metalness:.18}),black=mat(0x222c2c),metal=mat(0xb7c4bc,{metalness:.65,roughness:.3}),glass=mat(0x8db5bd,{metalness:.25,roughness:.12}),seat=mat(0x493d31);
 const mesh=(geo,m,x,y,z,parent=this.group)=>{this.geometries.push(geo);const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;};
 const box=(w,h,d,m,x,y,z,p)=>mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z,p);
 box(3.6,.36,1.65,black,0,-.17,0);box(3.45,.48,1.72,body,0,.12,0);
 box(1.05,.38,1.62,body,1.2,.5,0);box(.15,.2,1.96,metal,1.89,.03,0);box(.15,.2,1.96,metal,-1.84,.03,0);
 const buggy=id===3,rally=id===4,pickup=id===1;
 if(!buggy){
 box(pickup?1.2:1.95,.86,1.57,glass,pickup?.15:-.3,.79,0);
 box(pickup?1.4:2.1,.13,1.73,body,pickup?.15:-.3,1.25,0);
 for(const z of [-.8,.8]){
 for(const x of pickup?[-.47,.79]:[-1.24,.6])box(.1,.92,.1,body,x,.8,z);
 box(1.8,.1,.1,body,-.3,.59,z);box(.32,.07,.07,metal,-.35,.54,z*1.1);
 box(.23,.16,.2,body,.62,.85,z*1.19);
 }
 }else{
 for(const z of [-.72,.72]){box(.09,1.03,.09,metal,-.85,.66,z);box(.09,.84,.09,metal,.6,.57,z);box(1.57,.1,.1,metal,-.13,1.17,z);}
 box(.12,.12,1.5,metal,-.85,1.17,0);box(.12,.12,1.5,metal,.6,1.17,0);
 }
 box(.5,.48,1.25,seat,-.4,.62,0);
 if(pickup){box(1,.15,1.6,black,-1.13,.44,0);for(const z of [-.76,.76])box(1,.32,.12,body,-1.12,.62,z);}
 if(rally){box(.25,.12,1.95,black,-1.7,1.12,0);for(const z of [-.58,.58])box(.08,.45,.09,black,-1.6,.88,z);}
 // Visible radiator and auxiliary roof lights.
 for(let z=-.55;z<=.55;z+=.18)box(.04,.25,.07,black,1.75,.42,z);
 this.lampMat=mat(0xffe5ae,{emissive:0xffd283,emissiveIntensity:1});
 this.brakeMat=mat(0x821f1c,{emissive:0xff2918,emissiveIntensity:.1});
 for(const z of [-.62,.62]){
 box(.06,.2,.26,this.lampMat,1.79,.48,z);box(.07,.19,.23,this.brakeMat,-1.77,.3,z);
 box(.23,.13,.12,black,-.2,1.38,z*.7);
 const light=new THREE.SpotLight(0xffe2a5,0,38,Math.PI/6,.45,1.5);light.position.set(1.65,.55,z);light.target.position.set(20,-1,z);this.group.add(light,light.target);(this.lights||=[]).push(light);
 }
 for(const x of [-1.22,1.22])for(const z of [-.96,.96]){
 const pivot=new THREE.Group();pivot.position.set(x,-.8,z);this.group.add(pivot);
 const tire=mesh(new THREE.CylinderGeometry(v.radius,v.radius,.42,20),black,0,0,0,pivot);tire.rotation.x=Math.PI/2;
 const rim=mesh(new THREE.CylinderGeometry(v.radius*.56,v.radius*.56,.44,12),metal,0,0,0,pivot);rim.rotation.x=Math.PI/2;
 // Hub spokes make speed-linked rotation easy to see.
 box(v.radius*1.08,.10,.46,black,0,0,0,pivot);box(.1,v.radius*1.08,.46,black,0,0,0,pivot);
 for(let j=0;j<12;j++){const a=j*Math.PI/6;const tread=box(.19,.12,.44,black,Math.sin(a)*v.radius,Math.cos(a)*v.radius,0,pivot);tread.rotation.z=-a;}
 this.wheels.push({pivot,x});
 const spring=mesh(new THREE.CylinderGeometry(.065,.065,.6,8),metal,x,-.5,z*.8);this.springs.push(spring);
 }
 // Spare wheel.
 if(id===0||id===5){const spare=mesh(new THREE.CylinderGeometry(.48,.48,.25,16),black,-1.98,.58,0);spare.rotation.z=Math.PI/2;}
 this.spin=0;
 }
 update(s,dt,braking,night){
 this.group.position.set(s.x,s.y,0);this.group.rotation.z=s.a;this.spin-=s.vx*dt/this.v.radius;
 this.wheels.forEach((w,i)=>{const c=s.contacts[w.x<0?0:1]||0;w.pivot.position.y=-.89+c;w.pivot.rotation.z=this.spin;const sp=this.springs[i];sp.scale.y=Math.max(.25,(.62-c)/.6);sp.position.y=-.27-(.62-c)/2;});
 this.brakeMat.emissiveIntensity=braking?3:.12;this.lampMat.emissiveIntensity=night?3:1;this.lights.forEach(l=>l.intensity=night?38:0);
 }
 dispose(){this.group.removeFromParent();this.geometries.forEach(g=>g.dispose());this.materials.forEach(m=>m.dispose());}
}

