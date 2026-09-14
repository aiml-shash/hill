// Original lightweight synthesized sounds; no remote audio or autoplay required.
export class AudioSystem{
 constructor(settings){this.settings=settings;this.ctx=null;this.noteAt=0;this.step=0;}
 start(){if(!this.ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
 this.ctx=new C();this.master=this.ctx.createGain();this.master.connect(this.ctx.destination);
 this.engine=this.ctx.createOscillator();this.engine.type='sawtooth';
 this.filter=this.ctx.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=380;
 this.eg=this.ctx.createGain();this.eg.gain.value=0;this.engine.connect(this.filter);this.filter.connect(this.eg);this.eg.connect(this.master);this.engine.start();
 const buffer=this.ctx.createBuffer(1,this.ctx.sampleRate,this.ctx.sampleRate),d=buffer.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;this.noise=buffer;
 }this.ctx.resume();}
 tone(freq,duration=.13,gain=.1,type='sine',end=freq){if(!this.ctx)return;const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+duration);}
 hiss(gain=.08,duration=.12){if(!this.ctx)return;const n=this.ctx.createBufferSource(),g=this.ctx.createGain();n.buffer=this.noise;g.gain.setValueAtTime(gain,this.ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,this.ctx.currentTime+duration);n.connect(g);g.connect(this.master);n.start();n.stop(this.ctx.currentTime+duration);}
 event(type){const table={coin:[1000,.15,.1,'sine',1600],fuel:[420,.3,.13,'sine',950],upgrade:[420,.5,.13,'triangle',1700],click:[420,.06,.08,'sine',650],jump:[170,.2,.04,'sine',300],landing:[70,.18,.1,'sine',30],crash:[95,.55,.2,'sawtooth',25]};if(table[type])this.tone(...table[type]);if(type==='landing'||type==='crash')this.hiss(type==='crash'?.3:.12,.3);}
 update(s,active,input){if(!this.ctx)return;const t=this.ctx.currentTime;this.master.gain.setTargetAtTime(this.settings.master,t,.08);
 this.engine.frequency.setTargetAtTime(35+Math.abs(s.vx)*4+(input.throttle||0)*18,t,.08);this.eg.gain.setTargetAtTime(active&&s.fuel>0?.045:0,t,.1);
 if(active&&(input.handbrake||input.brake)&&Math.abs(s.vx)>4&&t>(this.skidAt||0)){this.hiss(.025,.1);this.skidAt=t+.15;}
 if(t>this.noteAt){this.noteAt=t+.32;const notes=[196,246.94,293.66,392,329.63,293.66,246.94,220];this.tone(notes[this.step++%8],.55,.035*this.settings.music,'triangle');}}
}
