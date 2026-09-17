// Balance data shared by the garage, physics, and terrain.
export const MAPS=[
{name:'Green Hills',tag:'THE ALPINE CLASSIC',goal:500,sky:0xb9dce4,fog:0xb9dce4,ground:0x759a43,road:0xb18b60,trees:0x285e43,mountain:0x6d9693,grip:1,rough:1,weather:'Sunny'},
{name:'Desert Canyon',tag:'CHASE THE HORIZON',goal:650,sky:0xf2d8b1,fog:0xe8cfa9,ground:0xd1a46b,road:0xad754c,trees:0x6e8646,mountain:0xb87851,grip:.88,rough:1.15,weather:'Sunny'},
{name:'Snow Mountains',tag:'FIND YOUR TRACTION',goal:800,sky:0xc7dde9,fog:0xd5e3ec,ground:0xe6edef,road:0xb9cbd1,trees:0x436763,mountain:0xa0b5c8,grip:.68,rough:1.25,weather:'Snow'},
{name:'Forest Trail',tag:'INTO THE WILD',goal:950,sky:0xaec7bf,fog:0xabbdb3,ground:0x496747,road:0x79634d,trees:0x214d39,mountain:0x5c7b71,grip:.8,rough:1.35,weather:'Rain'},
{name:'Rocky Mountain',tag:'EARN THE SUMMIT',goal:1100,sky:0xbccddd,fog:0xb3c2ca,ground:0x879084,road:0x878477,trees:0x485d47,mountain:0x7e8c95,grip:.9,rough:1.5,weather:'Fog'},
{name:'Night Hills',tag:'AFTER THE SUN',goal:1250,sky:0x101e37,fog:0x172b40,ground:0x354b46,road:0x676258,trees:0x193d34,mountain:0x263c50,grip:.92,rough:1.35,weather:'Night'},
{name:'Volcano Valley',tag:'RIDE THE FIRE',goal:1500,sky:0x684d52,fog:0x725157,ground:0x4c4645,road:0x6b5850,trees:0x3b3535,mountain:0x4c3d42,grip:.85,rough:1.7,weather:'Ash'}
];
export const VEHICLES=[
{name:'Jeep',price:0,color:0xe55739,speed:25,power:19,grip:1,spring:90,tank:100,mass:1.05,radius:.55},
{name:'Pickup Truck',price:450,color:0xe8ad49,speed:27,power:21,grip:1.02,spring:97,tank:115,mass:1.2,radius:.58},
{name:'Monster Truck',price:1400,color:0x8859bd,speed:23,power:27,grip:1.25,spring:105,tank:125,mass:1.5,radius:.85},
{name:'Buggy',price:800,color:0x32b8a5,speed:30,power:22,grip:.94,spring:85,tank:85,mass:.8,radius:.51},
{name:'Rally Car',price:1100,color:0x5193db,speed:34,power:23,grip:1.08,spring:115,tank:95,mass:.95,radius:.49},
{name:'4x4 SUV',price:1900,color:0xddd8c7,speed:28,power:25,grip:1.3,spring:105,tank:140,mass:1.35,radius:.63}
];
export const UPGRADES=[
{id:'engine',name:'Engine',desc:'More acceleration and climbing power'},
{id:'tires',name:'Tires',desc:'Better traction on slippery surfaces'},
{id:'suspension',name:'Suspension',desc:'Softer impacts and steadier landings'},
{id:'tank',name:'Fuel tank',desc:'Travel farther between fuel stops'},
{id:'grip',name:'4WD / Grip',desc:'More power reaches the ground'}
];
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
export const upgradeCost=level=>100*level*level;

 export function stats(id, u = {}) {
  const v = { ...VEHICLES[id] };

  const engineLevel = Number(u.engine) || 1;

  // Level 1: 215 km/h → Level 5: 300 km/h
  v.maxSpeedKmh = 215 + (engineLevel - 1) * 21.25;
  v.speed = v.maxSpeedKmh / 3.6;

  v.power *= 1 + 0.16 * (engineLevel - 1);

  v.grip *=
    1 +
    0.09 * ((u.tires || 1) - 1) +
    0.08 * ((u.grip || 1) - 1);

  v.spring *= 1 + 0.04 * ((u.suspension || 1) - 1);
  v.protection = 1 + 0.2 * ((u.suspension || 1) - 1);

  v.tank *= 1 + 0.22 * ((u.tank || 1) - 1);

  return v;
}
