import {clamp} from './config.js';
const KEY='hill-climb-3d-v1';
const defaults=()=>({version:1,bank:0,best:0,bestScore:0,selectedVehicle:0,selectedMap:0,owned:[0],unlocked:1,upgrades:{},records:{},checkpoints:{},settings:{master:.65,music:.18,quality:'high',shake:true,camera:'chase'}});
export class Save {
 constructor(){this.data=defaults();this.available=true;try{
 const r=JSON.parse(localStorage.getItem(KEY)||'null');if(r&&r.version===1){
 for(const k of ['bank','best','bestScore'])this.data[k]=clamp(Number(r[k])||0,0,1e9);
 this.data.owned=[...new Set([0,...(Array.isArray(r.owned)?r.owned:[]).filter(i=>Number.isInteger(i)&&i>=0&&i<6)])];
 this.data.unlocked=clamp(Math.floor(Number(r.unlocked)||1),1,7);
 this.data.selectedVehicle=this.data.owned.includes(r.selectedVehicle)?r.selectedVehicle:0;
 this.data.selectedMap=Number.isInteger(r.selectedMap)&&r.selectedMap>=0&&r.selectedMap<this.data.unlocked?r.selectedMap:0;
 for(let i=0;i<6;i++){this.data.upgrades[i]={};for(const k of ['engine','tires','suspension','tank','grip'])this.data.upgrades[i][k]=clamp(Math.floor(Number(r.upgrades?.[i]?.[k])||1),1,5);}
 for(let i=0;i<7;i++){this.data.records[i]=clamp(Number(r.records?.[i])||0,0,1e9);this.data.checkpoints[i]=clamp(Number(r.checkpoints?.[i])||0,0,1e9);}
 const s=r.settings||{};this.data.settings={master:clamp(Number.isFinite(Number(s.master))?Number(s.master):.65,0,1),music:clamp(Number.isFinite(Number(s.music))?Number(s.music):.18,0,1),quality:['low','high'].includes(s.quality)?s.quality:'high',shake:s.shake!==false,camera:s.camera==='side'?'side':'chase'};
 }}catch{this.available=false;}}
 write(){try{localStorage.setItem(KEY,JSON.stringify(this.data));return true;}catch{this.available=false;return false;}}
 buy(id,cost){if(this.data.bank<cost)return false;this.data.bank-=cost;this.data.owned.push(id);this.data.selectedVehicle=id;this.write();return true;}
 upgrade(id,key,cost){if(this.data.bank<cost)return false;const u=this.data.upgrades[id]||={};if((u[key]||1)>=5)return false;this.data.bank-=cost;u[key]=(u[key]||1)+1;this.write();return true;}
}
