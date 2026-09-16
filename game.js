import * as THREE from "https://unpkg.com/three@0.180.0/build/three.module.js";
import {MAPS,stats,clamp} from './config.js';
import {Save} from './save.js';
import {Track} from './track.js';
import {Physics} from './physics.js';
import {Terrain} from './terrain.js';
import {Vehicle} from './vehicle.js';
import {Effects} from './effects.js';
import {AudioSystem} from './audio.js';
import {UI} from './ui.js';

class Game{
 constructor(){
 this.save=new Save();this.audio=new AudioSystem(this.save.data.settings);this.mode='menu';this.keys=new Set();this.input={throttle:0,brake:0,tilt:0,handbrake:false};this.accumulator=0;this.clock=0;this.shake=0;this.crashTime=0;this.hudTime=0;this.saveTime=0;this.runCoins=0;this.bonus=0;this.checkpoint=0;this.taken=new Set();this.hit=new Set();
 this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,.1,800);
 this.renderer=new THREE.WebGLRenderer({canvas:document.getElementById('world'),antialias:true,alpha:false,powerPreference:'high-performance'});
 this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.2;
 this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 this.ambient=new THREE.HemisphereLight(0xf0f6e8,0x526443,2.3);this.scene.add(this.ambient);
 this.sun=new THREE.DirectionalLight(0xffedc5,3);this.sun.castShadow=true;this.sun.shadow.mapSize.set(1024,1024);Object.assign(this.sun.shadow.camera,{left:-35,right:35,top:35,bottom:-35,near:1,far:130});this.sun.shadow.bias=-.0007;this.scene.add(this.sun,this.sun.target);
 this.sunOrb=new THREE.Mesh(new THREE.SphereGeometry(5,16,12),new THREE.MeshBasicMaterial({color:0xffe7aa}));this.scene.add(this.sunOrb);
 this.effects=new Effects(this.scene);this.look=new THREE.Vector3();this.desired=new THREE.Vector3();this.aim=new THREE.Vector3();this.targetColor=new THREE.Color();
 this.ui=new UI(this);this.preview();this.applySettings();this.bind();
 document.getElementById('loading').hidden=true;
 this.last=performance.now();this.frame=this.frame.bind(this);requestAnimationFrame(this.frame);
 this.touchInput = {
  throttle: false,
  brake: false,
  left: false,
  right: false
};
 }
 bind(){
 const control=new Set(['KeyW','ArrowUp','KeyS','ArrowDown','KeyA','ArrowLeft','KeyD','ArrowRight','Space','KeyR','KeyP','Escape']);
 addEventListener('keydown',e=>{
 if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)&&e.code!=='Escape')return;
 if(!control.has(e.code))return;e.preventDefault();
 if(e.code==='KeyP'||e.code==='Escape'){if(e.repeat)return;if(!document.getElementById('modal').hidden&&this.ui.page!=='pause'&&this.ui.page!=='over'){this.ui.close();if(this.mode==='paused')this.resume();}else if(this.mode==='playing')this.pause();else if(this.mode==='paused')this.resume();return;}
 if(e.code==='KeyR'&&!e.repeat&&['playing','paused','over','crashing'].includes(this.mode)){this.start();return;}
 if(this.mode==='playing')this.keys.add(e.code);
 });
 addEventListener('keyup',e=>this.keys.delete(e.code));
 addEventListener('blur',()=>{this.keys.clear();if(this.mode==='playing')this.pause();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.mode==='playing')this.pause();});
 addEventListener('resize',()=>this.resize());
 addEventListener('pagehide',()=>this.record());
 const canvas=document.getElementById('world');canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();if(this.mode==='playing')this.pause();document.getElementById('fatal').hidden=false;document.getElementById('fatalText').textContent='The graphics connection was lost. Reload to continue. Your saved coins and upgrades are safe.';});
 }
 resize(){this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight,false);}
 applySettings(){const s=this.save.data.settings;this.renderer.setPixelRatio(Math.min(devicePixelRatio,s.quality==='high'?1.6:1));this.renderer.shadowMap.enabled=s.quality==='high';this.sun.castShadow=s.quality==='high';this.resize();this.audio.settings=s;}
 buildWorld(){
 this.terrain?.dispose();this.vehicle?.dispose();const d=this.save.data;
 this.track=new Track(d.selectedMap);this.vehicleStats=stats(d.selectedVehicle,d.upgrades[d.selectedVehicle]);
 this.physics=new Physics(this.track,this.vehicleStats);this.terrain=new Terrain(this.scene,this.track);this.vehicle=new Vehicle(this.scene,d.selectedVehicle,this.vehicleStats);
 this.weather=MAPS[d.selectedMap].weather;this.scene.background=new THREE.Color(this.track.theme.sky);this.scene.fog=new THREE.Fog(this.track.theme.fog,90,380);
 this.terrain.update(0,0);this.look.set(0,this.physics.s.y,0);
 this.camera.position.set(-8,this.physics.s.y+5,13);this.applyLighting();
 }
 preview(){this.mode='menu';this.keys.clear();this.buildWorld();this.ui.screen(false);}
 start(){
 if(['playing','paused','crashing'].includes(this.mode))this.record();
 this.ui.close();this.audio.start();this.buildWorld();this.mode='playing';this.keys.clear();this.accumulator=0;this.runCoins=0;this.bonus=0;this.checkpoint=0;this.taken.clear();this.hit.clear();this.shake=0;this.crashTime=0;
 this.ui.screen(true);this.ui.update();this.ui.toast('W / ↑ TO DRIVE · A / D TO BALANCE');
 }
 menu(){this.record();this.ui.close();this.preview();}
 pause(show=true){if(this.mode!=='playing')return;this.mode='paused';this.keys.clear();this.accumulator=0;this.record();if(show)this.ui.open('pause');}
 resume(){if(this.mode!=='paused')return;this.ui.close();this.keys.clear();this.mode='playing';this.accumulator=0;}
 score(){return Math.floor(this.physics.s.distance)+this.runCoins*10+this.bonus;}
 record(){if(!this.physics||this.mode==='menu')return;const d=this.save.data,s=this.physics.s;d.best=Math.max(d.best,Math.floor(s.distance));d.bestScore=Math.max(d.bestScore,this.score());d.records[d.selectedMap]=Math.max(d.records[d.selectedMap]||0,Math.floor(s.distance));this.save.write();}
 reward(coins){this.runCoins+=coins;this.save.data.bank+=coins;this.save.write();}
 event(e){
 const s=this.physics.s;
 if(e.type==='coin'||e.type==='fuel'){
 if(this.taken.has(e.id))return;this.taken.add(e.id);this.audio.event(e.type);
 if(e.type==='coin')this.reward(1);else{s.fuel=Math.min(this.vehicleStats.tank,s.fuel+this.vehicleStats.tank*.38);this.ui.toast('FUEL +38%');}
 }else if(e.type==='stunt'){this.bonus+=e.points;this.reward(Math.max(1,Math.floor(e.points/100)));this.ui.toast(e.name+' +'+e.points);this.audio.event('coin');}
 else{this.audio.event(e.type);if(e.type==='landing'){this.shake=Math.min(1,e.impact*.055);this.effects.burst(s.x,s.y-.7,25);}}
 document.querySelectorAll('[data-touch]').forEach(button => {
  const control = button.dataset.touch;

  const press = event => {
    event.preventDefault();

    if (button.setPointerCapture) {
      button.setPointerCapture(event.pointerId);
    }

    this.touchInput[control] = true;
    button.classList.add('pressed');
  };

  const release = event => {
    event.preventDefault();
    this.touchInput[control] = false;
    button.classList.remove('pressed');
  };

  button.addEventListener('pointerdown', press);
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
});
 }
 
 tick(dt){
const throttle =
  this.keys.has('KeyW') ||
  this.keys.has('ArrowUp') ||
  this.touchInput.throttle;

const brake =
  this.keys.has('KeyS') ||
  this.keys.has('ArrowDown') ||
  this.touchInput.brake;

const left =
  this.keys.has('KeyA') ||
  this.keys.has('ArrowLeft') ||
  this.touchInput.left;

const right =
  this.keys.has('KeyD') ||
  this.keys.has('ArrowRight') ||
  this.touchInput.right;

this.input.throttle = throttle ? 1 : 0;
this.input.brake = brake ? 1 : 0;
this.input.tilt = (left ? 1 : 0) - (right ? 1 : 0);
 this.input.handbrake=this.keys.has('Space');if(this.input.brake)this.input.throttle=0;
 const s=this.physics.s;
 const events=this.physics.step(dt,this.input,this.weather);this.terrain.collect(s,events);for(const e of events)this.event(e);
 const cp=Math.floor(s.distance/200);if(cp>this.checkpoint){const count=cp-this.checkpoint;this.checkpoint=cp;this.reward(25*count);s.fuel=Math.min(this.vehicleStats.tank,s.fuel+this.vehicleStats.tank*.12);s.health=Math.min(100,s.health+5);this.save.data.checkpoints[this.save.data.selectedMap]=cp*200;this.save.write();this.ui.toast('CHECKPOINT! +25 COINS');this.audio.event('upgrade');}
 const d=this.save.data,goal=MAPS[d.selectedMap].goal;
 if(s.distance>=goal&&d.unlocked===d.selectedMap+1&&d.unlocked<7){d.unlocked++;this.save.write();this.ui.toast(MAPS[d.unlocked-1].name.toUpperCase()+' UNLOCKED!');}
 const rock=this.track.obstacle(s.x,s.time);
 if(rock&&Math.abs(rock.x-s.x)<1.8&&Math.abs(rock.y-s.y)<1.5&&!this.hit.has(rock.id)){this.hit.add(rock.id);s.health-=40/this.vehicleStats.protection;s.vx*=.4;s.av+=2;this.shake=.8;this.audio.event('crash');this.ui.toast('ROCK IMPACT!');}
 if(s.dead){this.record();this.mode='crashing';this.crashTime=0;this.keys.clear();this.audio.event(s.dead==='OUT OF FUEL'?'landing':'crash');this.shake=s.dead==='OUT OF FUEL'?0:1;this.effects.burst(s.x,s.y,70);if(s.dead!=='OUT OF FUEL'&&this.save.data.settings.shake){document.getElementById('crashFlash').classList.add('flash');setTimeout(()=>document.getElementById('crashFlash').classList.remove('flash'),160);}}
 }
 applySettings() {
  const s = this.save.data.settings;

  const mobile = matchMedia('(pointer: coarse)').matches;

  const pixelRatio = mobile
    ? 1
    : (s.quality === 'high' ? 1.6 : 1);

  this.renderer.setPixelRatio(
    Math.min(devicePixelRatio, pixelRatio)
  );

  this.renderer.shadowMap.enabled =
    !mobile && s.quality === 'high';

  this.sun.castShadow =
    !mobile && s.quality === 'high';

  this.resize();
  this.audio.settings = s;
}
 frame(now){
 const dt=Math.min((now-this.last)/1000,.1);this.last=now;this.clock+=dt;
 if(this.mode==='playing'){
 this.accumulator+=dt;let steps=0;while(this.accumulator>=1/120&&steps<12&&this.mode==='playing'){this.tick(1/120);this.accumulator-=1/120;steps++;}
 this.saveTime+=dt;if(this.saveTime>1){this.record();this.saveTime=0;}
 }else this.accumulator=0;
 const s=this.physics.s,active=this.mode==='playing',menu=this.mode==='menu';
 if(this.mode==='crashing'){this.crashTime+=dt;if(s.dead!=='OUT OF FUEL'){s.a+=dt*Math.min(1,s.av);s.y-=dt*.15;}if(this.crashTime>1.1){this.mode='over';this.ui.open('over');}}
 if(menu)this.terrain.update(0,this.clock*.25);else if(active)this.terrain.update(s.x,s.time);
 const base=MAPS[this.save.data.selectedMap].weather;
 const weather=base==='Sunny'?['Sunny','Cloudy','Rain','Sunny'][Math.floor(s.time/55)%4]:base;
 if(this.weather!==weather){this.weather=weather;this.applyLighting();if(active)this.ui.toast(weather.toUpperCase()+' WEATHER');}
 this.vehicle.update(s,active?dt:menu?dt*.05:0,this.input.brake||this.input.handbrake,this.weather==='Night');
 if(menu)this.vehicle.group.rotation.y=Math.sin(this.clock*.2)*.09;
 this.effects.update(active?dt:0,s,this.weather,active);
 this.audio.update(s,active,this.input);
 const speed=Math.abs(s.vx),side=this.save.data.settings.camera==='side';
 if(menu){this.desired.set(s.x-6+Math.sin(this.clock*.15)*1.2,s.y+4.1,11.7);this.aim.set(s.x-3.6,s.y+.15,0);}
 else if(side){this.desired.set(s.x-4,s.y+6,22+speed*.1);this.aim.set(s.x+6,s.y+1.5,0);}
 else{this.desired.set(s.x-12-speed*.1,s.y+6.5+speed*.045,11+speed*.05);this.aim.set(s.x+7,s.y+1.3,0);}
 const k=1-Math.exp(-dt*(menu?2:6));this.camera.position.lerp(this.desired,k);this.look.lerp(this.aim,k);this.camera.lookAt(this.look);
 this.shake*=Math.exp(-dt*6);if(this.save.data.settings.shake&&this.shake>.01){this.camera.position.y+=(Math.random()-.5)*this.shake*.65;this.camera.position.x+=(Math.random()-.5)*this.shake*.3;}
 const fov=menu?46:52+Math.min(speed/3,11);this.camera.fov+=(fov-this.camera.fov)*k;this.camera.updateProjectionMatrix();
 this.sun.position.set(s.x-20,s.y+55,30);this.sun.target.position.set(s.x+8,s.y,0);
 this.sunOrb.position.set(s.x+150,95,-230);this.sunOrb.material.color.setHex(this.weather==='Night'?0xe3edff:0xffe7aa);
 this.renderer.render(this.scene,this.camera);
 this.hudTime+=dt;if(this.hudTime>.1){if(!menu)this.ui.update();this.hudTime=0;}
 if(location.search.includes('debug')){const e=document.getElementById('debug');e.hidden=false;e.textContent=Math.round(1/Math.max(dt,.001))+' FPS\n'+this.renderer.info.render.calls+' draw calls\n'+this.renderer.info.memory.geometries+' geometries\n'+this.mode+' · '+this.weather+'\n'+s.x.toFixed(1)+' m · '+s.a.toFixed(2)+' rad';}
 requestAnimationFrame(this.frame);
 }
}
try{window.game=new Game();}catch(e){console.error(e);document.getElementById('loading').hidden=true;document.getElementById('fatal').hidden=false;document.getElementById('fatalText').textContent='Please use Live Server and enable browser hardware acceleration. '+e.message;}

