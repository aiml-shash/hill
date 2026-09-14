import {MAPS,VEHICLES,UPGRADES,upgradeCost} from './config.js';
const $=id=>document.getElementById(id);
const number=n=>Math.floor(n).toLocaleString('en-US');
export class UI{
 constructor(game){this.g=game;this.page=null;this.returnFocus=null;this.timer=0;
 document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b||b.disabled)return;game.audio.start();game.audio.event('click');this.action(b.dataset.action,b.dataset);});
 $('dialogContent').addEventListener('input',e=>{if(!e.target.dataset.setting)return;const k=e.target.dataset.setting;game.save.data.settings[k]=e.target.type==='checkbox'?e.target.checked:e.target.type==='range'?Number(e.target.value):e.target.value;game.save.write();game.applySettings();});
 document.addEventListener('keydown',e=>{if(e.code!=='Tab'||$('modal').hidden)return;const els=[...$('modal').querySelectorAll('button:not(:disabled),input,select')];if(!els.length)return;const first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
 }
 action(action,d){
 const g=this.g,s=g.save.data;
 switch(action){
 case 'play':g.start();break;
 case 'restart':g.start();break;
 case 'menu':g.menu();break;
 case 'pause':g.pause();break;
 case 'resume':g.resume();break;
 case 'close':this.close();if(g.mode==='paused')g.resume();else if(g.mode==='over')g.menu();break;
 case 'garage':case 'levels':case 'upgrades':case 'settings':case 'help':this.open(action);break;
 case 'vehicle':{const id=Number(d.id);if(s.owned.includes(id)){s.selectedVehicle=id;g.save.write();}else if(!g.save.buy(id,VEHICLES[id].price)){this.toast('NOT ENOUGH COINS');return;}else g.audio.event('upgrade');g.preview();this.open('garage');break;}
 case 'map':{const id=Number(d.id);if(id>=s.unlocked)return;s.selectedMap=id;g.save.write();g.preview();this.open('levels');break;}
 case 'upgrade':{const key=d.key,id=s.selectedVehicle,lv=s.upgrades[id]?.[key]||1;if(lv<5&&g.save.upgrade(id,key,upgradeCost(lv))){g.audio.event('upgrade');g.preview();this.open('upgrades');}else this.toast('NOT ENOUGH COINS');break;}
 }
 }
 refresh(){const d=this.g.save.data;$('bank').textContent=number(d.bank);$('menuBest').textContent=number(d.best)+' m';$('garageCount').textContent=d.owned.length+' / 6 vehicles';$('mapCount').textContent=d.unlocked+' / 7 landscapes';$('sceneMap').textContent=MAPS[d.selectedMap].name.toUpperCase();$('sceneVehicle').textContent=VEHICLES[d.selectedVehicle].name.toUpperCase()+' • READY TO ROAM';}
 screen(playing){$('menu').hidden=playing;$('header').hidden=playing;$('hud').hidden=!playing;this.refresh();}
 close(){this.page=null;$('modal').hidden=true;this.returnFocus?.focus();}
 open(page){
 const g=this.g,d=g.save.data;this.page=page;if(g.mode==='playing')g.pause(false);
 this.returnFocus=document.activeElement;$('modal').hidden=false;
 let html='',title='',intro='';
 if(page==='garage'){
 title='Your next set of wheels.';intro='Six different ways to find your limit. Coins earned on every run are yours to keep.';
 html='<div class="cards">'+VEHICLES.map((v,i)=>{const owned=d.owned.includes(i),selected=i===d.selectedVehicle;return '<article class="card '+(selected?'selected':'')+'"><div class="vehicle-art" style="--color:#'+v.color.toString(16).padStart(6,'0')+'">▰●—●</div><h3>'+v.name+'</h3>'+[['Speed',v.speed/36],['Climb',v.power/30],['Grip',v.grip/1.4],['Suspension',v.spring/120],['Fuel',v.tank/150],['Weight',v.mass/1.6]].map(([n,f])=>'<div class="stat"><span>'+n+'</span><div class="meter"><i style="width:'+f*100+'%"></i></div></div>').join('')+'<button data-action="vehicle" data-id="'+i+'" '+(!owned&&d.bank<v.price?'disabled':'')+'>'+ (selected?'SELECTED':owned?'SELECT VEHICLE':'UNLOCK · '+number(v.price)+' COINS')+'</button></article>';}).join('')+'</div>';
 }else if(page==='levels'){
 title='Seven roads. Endless stories.';intro='Reach each landscape’s distance goal in one run to open the next. Start every expedition at the trailhead.';
 html='<div class="cards">'+MAPS.map((m,i)=>{const unlocked=i<d.unlocked,selected=d.selectedMap===i;return '<article class="card '+(selected?'selected':'')+'"><div class="mini-art" style="--color:#'+m.ground.toString(16).padStart(6,'0')+'"></div><h3>'+String(i+1).padStart(2,'0')+' · '+m.name+'</h3><small>'+ (unlocked?m.weather+' · Best '+number(d.records[i]||0)+' m':'Reach '+MAPS[i-1]?.goal+' m in '+MAPS[i-1]?.name)+'</small><button data-action="map" data-id="'+i+'" '+(!unlocked?'disabled':'')+'>'+(selected?'SELECTED':unlocked?'EXPLORE MAP':'LOCKED')+'</button></article>';}).join('')+'</div>';
 }else if(page==='upgrades'){
 title='Make every hill possible.';intro='Upgrading '+VEHICLES[d.selectedVehicle].name+'. Each upgrade stays with this vehicle permanently.';
 html=UPGRADES.map(u=>{const lv=d.upgrades[d.selectedVehicle]?.[u.id]||1,cost=upgradeCost(lv);return '<div class="upgrade-row"><div><h3>'+u.name+' <small>Lv. '+lv+' / 5</small></h3><p>'+u.desc+'</p></div><div class="upgrade-level">'+[1,2,3,4,5].map(n=>'<i class="'+(n<=lv?'on':'')+'"></i>').join('')+'</div><button class="primary" data-action="upgrade" data-key="'+u.id+'" '+(lv>=5||d.bank<cost?'disabled':'')+'>'+(lv>=5?'MAX LEVEL':'UPGRADE · '+number(cost)+' ◉')+'</button></div>';}).join('');
 }else if(page==='settings'){
 const s=d.settings;title='Find your comfort zone.';intro='Audio begins after your first click. Choose lower graphics quality for less powerful computers.';
 html='<label class="setting">Master volume<input aria-label="Master volume" type="range" min="0" max="1" step=".01" value="'+s.master+'" data-setting="master"></label><label class="setting">Music volume<input aria-label="Music volume" type="range" min="0" max="1" step=".01" value="'+s.music+'" data-setting="music"></label><label class="setting">Graphics quality<select data-setting="quality"><option value="high" '+(s.quality==='high'?'selected':'')+'>High · shadows</option><option value="low" '+(s.quality==='low'?'selected':'')+'>Low · performance</option></select></label><label class="setting">Camera<select data-setting="camera"><option value="chase" '+(s.camera==='chase'?'selected':'')+'>Third-person chase</option><option value="side" '+(s.camera==='side'?'selected':'')+'>Wide side view</option></select></label><label class="setting">Camera shake<input type="checkbox" data-setting="shake" '+(s.shake?'checked':'')+'></label>';
 }else if(page==='help'){
 title='A little balance goes a long way.';intro='Follow the fixed trail. This is a 3D hill climber: left and right control pitch, while the vehicle stays on the road.';
 html='<div class="help-grid"><div><kbd>W</kbd> / <kbd>↑</kbd> Accelerate<p>Build momentum before a climb. Ease off before a sharp drop.</p></div><div><kbd>S</kbd> / <kbd>↓</kbd> Brake / reverse<p>Slow down first, then keep holding to reverse.</p></div><div><kbd>A</kbd> / <kbd>←</kbd> Tilt backward<p>Raise the nose. In the air, hold for a backflip.</p></div><div><kbd>D</kbd> / <kbd>→</kbd> Tilt forward<p>Lower the nose. Match your landing angle to the slope.</p></div><div><kbd>SPACE</kbd> Handbrake<p><kbd>R</kbd> Restart · <kbd>P</kbd> / <kbd>ESC</kbd> Pause</p></div><div>Keep the adventure going<p>Gold coins buy upgrades. Green fuel cans refill 38% of your tank. Checkpoints every 200 m award 25 coins and a little fuel. Stunts count after you land safely.</p></div></div><p class="intro">Score = distance + 10 × collected coins + landed stunt bonuses. Coins and personal records save on this browser. Fuel runs out, hard impacts damage the car, and an unrecovered rollover ends the run.</p>';
 }else if(page==='pause'){
 title='Take in the view.';intro='Your run is paused. The hills can wait.';
 html='<div class="dialog-actions"><button class="primary" data-action="resume">KEEP DRIVING</button><button class="secondary" data-action="restart">RESTART</button><button class="secondary" data-action="menu">MAIN MENU</button></div><div class="dialog-actions"><button class="secondary" data-action="settings">SETTINGS</button><button class="secondary" data-action="help">CONTROLS</button></div>';
 }else if(page==='over'){
 title=g.physics.s.dead==='OUT OF FUEL'?'OUT OF FUEL':'GAME OVER';intro=g.physics.s.dead==='OUT OF FUEL'?'The tank is empty. A bigger fuel tank could take you farther.':'That was a good adventure. There’s always one more hill.';
 const s=g.physics.s;html='<div class="end-stats">'+[['DISTANCE',number(s.distance)+' m'],['COINS',number(g.runCoins)],['SCORE',number(g.score())],['BEST SCORE',number(d.bestScore)]].map(([k,v])=>'<div><small>'+k+'</small><b>'+v+'</b></div>').join('')+'</div><p class="intro">'+number(g.runCoins)+' coins saved to your balance.</p><div class="dialog-actions"><button class="primary" data-action="restart">DRIVE AGAIN ↗</button><button class="secondary" data-action="menu">MAIN MENU</button><button class="secondary" data-action="upgrades">UPGRADES</button></div>';
 }
 $('dialogContent').innerHTML='<div class="eyebrow">HILL CLIMB 3D / '+page.toUpperCase()+'</div><h2 id="dialogTitle" class="'+(page==='over'?'end-title':'')+'">'+title+'</h2><p class="intro">'+intro+'</p>'+html+(!g.save.available?'<p class="notice">Browser storage is unavailable. Progress will last for this session only.</p>':'');
 this.refresh();$('modal').querySelector('.close-btn').focus();
 }
 update(){const g=this.g,s=g.physics.s,d=g.save.data;const fuel=Math.round(s.fuel/g.vehicleStats.tank*100);
 $('fuelValue').textContent=fuel+'%';$('fuelBar').style.width=fuel+'%';$('fuelBar').style.background=fuel<20?'#d66a40':'#3c9773';$('healthValue').textContent=Math.round(s.health)+'%';$('healthBar').style.width=s.health+'%';
 $('distance').textContent=number(s.distance);$('score').textContent=number(g.score());$('coins').textContent=number(g.runCoins);$('best').textContent=number(Math.max(d.best,s.distance))+' m';$('speed').textContent=number(Math.abs(s.vx)*3.6);
 $('runMap').textContent=MAPS[d.selectedMap].name.toUpperCase();const next=(g.checkpoint+1)*200;$('goalDistance').textContent=Math.max(0,Math.ceil(next-s.distance))+' m';$('goalBar').style.width=(s.distance%200)/2+'%';}
 toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(this.timer);this.timer=setTimeout(()=>$('toast').classList.remove('show'),2200);}
}

