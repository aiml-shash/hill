import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import {hash} from './track.js';
export class Terrain{
 constructor(scene,track){
 this.scene=scene;this.track=track;this.theme=track.theme;this.chunks=new Map();this.pickups=[];this.movers=[];this.rocks=[];
 this.mats={};for(const [k,c] of Object.entries({ground:this.theme.ground,road:this.theme.road,tree:this.theme.trees,trunk:0x6a513b,rock:0x84877c,wood:0x937046,rail:0xc4aa77,coin:0xffc94d,fuel:0x40d6aa,water:0x72a6b6,lava:0xff632b,white:0xf4eee0,black:0x263c34})){
 this.mats[k]=new THREE.MeshStandardMaterial({color:c,roughness:k==='water'?.18:.95,metalness:k==='coin'?.5:0,emissive:k==='coin'?0xe88b12:k==='fuel'?0x27b784:k==='lava'?0xff471a:0x000000,emissiveIntensity:k==='coin'?.28:k==='fuel'?.35:k==='lava'?1:0});
 }
 this.geo={box:new THREE.BoxGeometry(1,1,1),pine:new THREE.ConeGeometry(1,1,7),rock:new THREE.DodecahedronGeometry(1,0),coin:new THREE.CylinderGeometry(.46,.46,.12,16),log:new THREE.CylinderGeometry(.4,.4,1,12)};
 this.matrix=new THREE.Object3D();this.background=new THREE.Group();scene.add(this.background);
 for(let i=0;i<28;i++){
 const m=new THREE.Mesh(new THREE.ConeGeometry(16+hash(i)*28,35+hash(i+55)*42,7),new THREE.MeshStandardMaterial({color:this.theme.mountain,roughness:1}));
 m.position.set(i*36-220,-2,-125-hash(i+11)*90);this.background.add(m);
 if(track.map===2||i%3===0){const cap=new THREE.Mesh(new THREE.ConeGeometry(8,15,7),this.mats.white);cap.position.set(m.position.x,m.position.y+m.geometry.parameters.height*.36,m.position.z);this.background.add(cap);}
 }
 this.clouds=new THREE.Group();this.background.add(this.clouds);
 for(let i=0;i<17;i++){const c=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshBasicMaterial({color:track.map===5?0x657587:0xf4f2e4,transparent:true,opacity:.6}));c.position.set(i*45-160,55+hash(i)*30,-90-hash(i+7)*100);c.scale.set(13+hash(i+4)*12,3,6);this.clouds.add(c);}
 }
 addMesh(group,g,m,x,y,z,sx=1,sy=1,sz=1){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;o.receiveShadow=true;group.add(o);return o;}
 strip(start,width,road=false){
 const steps=64,rows=road?2:20,positions=[],colors=[],indices=[];const col=new THREE.Color();
 for(let i=0;i<=steps;i++)for(let j=0;j<=rows;j++){
 const x=start+i,z=(j/rows-.5)*width,y=road?this.track.height(x)+.015:this.track.ground(x,z)-.025;
 positions.push(x,y,z);col.setHex(road?this.theme.road:this.theme.ground);
 col.multiplyScalar(road? .96+hash(i+start)*.07:.86+hash(i+start+j)*.22);colors.push(col.r,col.g,col.b);
 }
 for(let i=0;i<steps;i++)for(let j=0;j<rows;j++){
 const x=start+i+.5,f=this.track.feature(x);
 if(road&&f&&x>=f.start&&x<=f.end&&['bridge','broken','moving'].includes(f.type))continue;
 const a=i*(rows+1)+j,b=a+rows+1;indices.push(a,a+1,b,b,a+1,b+1);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();
 const m=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1});const mesh=new THREE.Mesh(g,m);mesh.receiveShadow=true;return mesh;
 }
 batch(group,geo,mat,items){if(!items.length)return;const mesh=new THREE.InstancedMesh(geo,mat,items.length);items.forEach((q,i)=>{this.matrix.position.set(q[0],q[1],q[2]);this.matrix.scale.set(q[3],q[4],q[5]);this.matrix.rotation.set(0,q[6]||0,q[7]||0);this.matrix.updateMatrix();mesh.setMatrixAt(i,this.matrix.matrix);});mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}
 create(n){
 const start=n*64,group=new THREE.Group(),chunk={group,start,end:start+64,pickups:[],meshes:[]};this.scene.add(group);
 const land=this.strip(start,180),road=this.strip(start,5.2,true);group.add(land,road);chunk.meshes.push(land,road);
 const trunks=[],pines=[],stones=[],grass=[],planks=[],rails=[];
 for(let i=0;i<22;i++){
 const x=start+hash(n*89+i)*64,z=(hash(i+n*5)>.5?1:-1)*(8+hash(i*5+n)*58),y=this.track.ground(x,z),size=1.8+hash(i+n*7)*3;
 if(this.track.map===1){trunks.push([x,y+size/2,z,.35,size,.35]);pines.push([x,y+size,z,.4,size*.5,.4]);}
 else if(this.track.map!==4&&this.track.map!==6){trunks.push([x,y+size*.5,z,.28,size,.28]);pines.push([x,y+size*1.25,z,size*.72,size*2,size*.72]);pines.push([x,y+size*1.9,z,size*.52,size*1.5,size*.52]);}
 stones.push([x+2,y+.3,z+2,.7+hash(i),.5,.7]);
 }
 for(let i=0;i<100;i++){const x=start+hash(i*11+n)*64,z=(hash(i*12+n)>.5?1:-1)*(3.4+hash(i*3+n)*13);grass.push([x,this.track.ground(x,z)+.2,z,.11,.5,.11]);}
 for(let i=0;i<64;i++){
 const x=start+i+.5,f=this.track.feature(x);if(!f||x<f.start||x>f.end)continue;
 const y=this.track.height(x);
 if(['bridge','broken','moving'].includes(f.type)){
 if(f.type==='broken'&&x>f.start+7&&x<f.start+10)continue;
 const plank=this.addMesh(group,this.geo.box,this.mats.wood,x,y-.11,0,.95,.2,3.8);plank.rotation.z=Math.atan(this.track.slope(x));
 if(f.type==='moving'){const m={mesh:plank,x,base:y-.11,f};this.movers.push(m);(chunk.movers||=[]).push(m);}
 if(i%3===0)for(const z of [-1.9,1.9]){rails.push([x,y+.55,z,.14,1.4,.14]);}
 if(i%2===0)for(const z of [-1.9,1.9])rails.push([x,y+.9,z,2.1,.12,.12,0,Math.atan(this.track.slope(x))]);
 }
 if(['mud','water'].includes(f.type)){const p=this.addMesh(group,this.geo.box,f.type==='mud'?this.mats.trunk:this.mats.water,x,y+.04,0,1.05,.05,4.9);p.rotation.z=Math.atan(this.track.slope(x));}
 if(Math.abs(x-(f.start+9))<.51){
 if(f.type==='log'){const log=this.addMesh(group,this.geo.log,this.mats.trunk,x,y-.26,0,1,4.9,1);log.rotation.x=Math.PI/2;}
 if(f.type==='rock')this.addMesh(group,this.geo.rock,this.mats.rock,x,y-.4,0,.9,.8,1.1);
 if(f.type==='falling'){const r=this.addMesh(group,this.geo.rock,this.mats.rock,x,y+12,0,.8,.8,.8);const e={mesh:r,f};this.rocks.push(e);(chunk.rocks||=[]).push(e);}
 }
 }
 this.batch(group,this.geo.box,this.mats.trunk,trunks);this.batch(group,this.geo.pine,this.mats.tree,pines);this.batch(group,this.geo.rock,this.mats.rock,stones);this.batch(group,this.geo.pine,this.mats.tree,grass);this.batch(group,this.geo.box,this.mats.rail,rails);
 for(let x=Math.ceil(start/8)*8;x<start+64;x+=8){if(x<20)continue;const f=this.track.feature(x),boost=f?.type==='jump'?1.5:0;this.pickup(chunk,'coin',x,this.track.height(x)+1.1+boost);}
 for(let x=Math.ceil((start-72)/96)*96+72;x<start+64;x+=96){if(x>=start&&x>0)this.pickup(chunk,'fuel',x,this.track.height(x)+1.1);}
 for(let x=Math.ceil(start/200)*200;x<start+64;x+=200)if(x>0){
 const y=this.track.height(x);for(const z of [-3.4,3.4])this.addMesh(group,this.geo.box,this.mats.white,x,y+2.8,z,.18,5.6,.18);
 this.addMesh(group,this.geo.box,this.mats.fuel,x,y+5.4,0,.25,.55,7);
 for(let j=0;j<14;j++)this.addMesh(group,this.geo.box,j%2?this.mats.white:this.mats.black,x+.14,y+5.4,j*.5-3.25,.03,.54,.49);
 }
 for(let x=Math.ceil((start-65)/150)*150+65;x<start+64;x+=150)if(x>=start&&x>0){
 const y=this.track.ground(x,-3.5);this.addMesh(group,this.geo.box,this.mats.trunk,x,y+.9,-3.5,.13,1.8,.13);
 const sign=this.addMesh(group,this.geo.box,this.mats.coin,x,y+1.9,-3.5,.85,.85,.12);sign.rotation.z=Math.PI/4;
 this.addMesh(group,this.geo.box,this.mats.black,x,y+1.97,-3.42,.1,.35,.02);
 }
 if(this.track.map===6){const lava=this.addMesh(group,this.geo.box,this.mats.lava,start+32,0,-13,64,.1,11);}
 this.chunks.set(n,chunk);
 }
 pickup(chunk,type,x,y){const group=new THREE.Group();group.position.set(x,y,0);chunk.group.add(group);
 if(type==='coin'){const c=this.addMesh(group,this.geo.coin,this.mats.coin,0,0,0);c.rotation.x=Math.PI/2;this.addMesh(group,this.geo.box,this.mats.white,0,0,.071,.05,.42,.02);}
 else{this.addMesh(group,this.geo.box,this.mats.fuel,0,0,0,.65,.84,.35);this.addMesh(group,this.geo.box,this.mats.black,.13,.47,0,.28,.12,.28);this.addMesh(group,this.geo.box,this.mats.white,0,0,.19,.1,.43,.02);this.addMesh(group,this.geo.box,this.mats.white,0,0,.2,.4,.1,.02);}
 const p={type,x,y,mesh:group,collected:false};chunk.pickups.push(p);this.pickups.push(p);
 }
 update(x,time){
 const lo=Math.floor((x-95)/64),hi=Math.floor((x+270)/64);
 for(let n=lo;n<=hi;n++)if(!this.chunks.has(n))this.create(n);
 for(const [n,c] of this.chunks)if(n<lo||n>hi){
 c.group.removeFromParent();c.group.traverse(o=>{if(o.isInstancedMesh)o.dispose();});c.meshes.forEach(m=>{m.geometry.dispose();m.material.dispose();});
 this.pickups=this.pickups.filter(p=>!c.pickups.includes(p));this.movers=this.movers.filter(p=>!(c.movers||[]).includes(p));this.rocks=this.rocks.filter(p=>!(c.rocks||[]).includes(p));this.chunks.delete(n);
 }
 this.background.position.x=x*.8;
 for(const p of this.pickups)if(!p.collected){p.mesh.rotation.y=time*1.7;p.mesh.position.y=p.y+Math.sin(time*2+p.x)*.14;}
 for(const m of this.movers)m.mesh.position.y=this.track.height(m.x,time)-.11;
 for(const r of this.rocks){const q=this.track.obstacle(r.f.start+9,time);if(q){r.mesh.position.y=q.y;r.mesh.rotation.z=time;}}
 }
 collect(s,events){
 for(const p of this.pickups){if(p.collected||Math.abs(p.x-s.x)>2.1||Math.abs(p.mesh.position.y-s.y)>1.65)continue;p.collected=true;p.mesh.visible=false;events.push({type:p.type,id:p.type+':'+p.x});}
 }
 dispose(){
 for(const c of this.chunks.values()){c.group.removeFromParent();c.group.traverse(o=>{if(o.isInstancedMesh)o.dispose();});c.meshes.forEach(m=>{m.geometry.dispose();m.material.dispose();});}
 this.background.traverse(o=>{if(o.isMesh){o.geometry.dispose();if(!Object.values(this.mats).includes(o.material))o.material.dispose();}});this.background.removeFromParent();
 Object.values(this.geo).forEach(g=>g.dispose());Object.values(this.mats).forEach(m=>m.dispose());
 }
}

