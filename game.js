(() => {
const c=document.getElementById('game'),g=c.getContext('2d'),W=780,H=930,$=id=>document.getElementById(id);
const scoreEl=$('score'),stageEl=$('stage'),lifeEl=$('life'),start=$('start'),count=$('count'),pause=$('pause');
const palette=['#d34acb','#7950d8','#22bde0','#18b8ad','#e6a14a'];
let score=0,stage=1,lives=3,bricks=[],drops=[],particles=[],paddle,balls=[],active=false,paused=false,between=false,raf=0,last=0,keys={},timers={WIDE:0,MULTI:0,SLOW:0};
let audio;
function beep(f=440,d=.08,type='sine',v=.035){try{audio ||= new(window.AudioContext||window.webkitAudioContext)();let o=audio.createOscillator(),a=audio.createGain();o.type=type;o.frequency.value=f;a.gain.setValueAtTime(v,audio.currentTime);a.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);o.connect(a);a.connect(audio.destination);o.start();o.stop(audio.currentTime+d)}catch(e){}}
function endSound(){beep(330,.18,'triangle',.05);setTimeout(()=>beep(247,.2,'triangle',.045),150);setTimeout(()=>beep(165,.4,'sawtooth',.035),320)}
function hud(){scoreEl.textContent=score;stageEl.textContent=stage;lifeEl.textContent=lives}
function initPaddle(){paddle={x:W/2-65,y:H-85,w:130,h:14}}
function makeBall(x=W/2,y=H-112,vx=null,vy=-5.2){return {x,y,r:10,vx:vx===null?4.2*(Math.random()<.5?-1:1):vx,vy}}
function resetBalls(){balls=[makeBall()]}
function makeBricks(){
 bricks=[];drops=[];
 const layouts={
  1:{rows:5,cols:8,pattern:'full'},
  2:{rows:6,cols:8,pattern:'checker'},
  3:{rows:6,cols:8,pattern:'diamond'},
  4:{rows:7,cols:8,pattern:'edges'},
  5:{rows:7,cols:8,pattern:'full'}
 };
 const cfg=layouts[stage],bw=76,bh=34,gap=10,left=(W-(cfg.cols*bw+(cfg.cols-1)*gap))/2,top=135;
 for(let r=0;r<cfg.rows;r++)for(let col=0;col<cfg.cols;col++){
  let keep=true;
  if(cfg.pattern==='checker')keep=(r+col)%2===0 || r===0;
  if(cfg.pattern==='diamond')keep=Math.abs(col-3.5)+Math.abs(r-2.5)<5.2;
  if(cfg.pattern==='edges')keep=(r===0||r===cfg.rows-1||col===0||col===7||((r+col)%3===0));
  if(!keep)continue;
  const tough=(stage>=3 && ((r+col+stage)%5===0));
  bricks.push({x:left+col*(bw+gap),y:top+r*(bh+18),w:bw,h:bh,hp:tough?2:1,color:palette[(r+stage-1)%palette.length],alive:true});
 }
}
function reset(){score=0;stage=1;lives=3;Object.keys(timers).forEach(k=>timers[k]=0);initPaddle();resetBalls();makeBricks();hud();active=false;paused=false;between=false;start.classList.remove('hidden');count.classList.add('hidden');pause.classList.add('hidden');$('startBtn').textContent='▶ GAME START';draw()}
function startGame(){start.classList.add('hidden');pause.classList.add('hidden');paused=false;active=true;last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop)}
function stageClear(){active=false;between=true;let n=3;$('countNum').textContent=n;count.classList.remove('hidden');let tick=()=>{n--;if(n>0){$('countNum').textContent=n;beep(600,.07);setTimeout(tick,700)}else{count.classList.add('hidden');between=false;stage++;if(stage>5){stage=5;start.querySelector('h1').textContent='ALL CLEAR';start.querySelector('.sub').textContent='CONGRATULATIONS ✦';$('startBtn').textContent='PLAY AGAIN';start.classList.remove('hidden');return}initPaddle();resetBalls();makeBricks();hud();startGame()}};setTimeout(tick,700)}
function loseLife(){lives--;hud();beep(180,.2,'triangle');if(lives<=0){active=false;endSound();setTimeout(()=>{start.querySelector('h1').textContent='NEON BREAKER';start.querySelector('.sub').textContent='FINAL FIX EDITION ✦';$('startBtn').textContent='PLAY AGAIN';start.classList.remove('hidden')},650)}else{initPaddle();resetBalls()}}
function rounded(x,y,w,h,r){g.beginPath();g.roundRect(x,y,w,h,r)}
function dropAt(x,y){if(Math.random()>.17)return;let type=['WIDE','MULTI','SLOW'][Math.floor(Math.random()*3)];drops.push({x,y,w:28,h:22,vy:3,type})}
function applyDrop(type){
 timers[type]=600;
 if(type==='WIDE')paddle.w=175;
 if(type==='MULTI'){
   // Split every ball into two diverging balls; cap total to keep the playfield readable.
   const extras=[];
   for(const b of balls){
     if(balls.length+extras.length>=8)break;
     const speed=Math.hypot(b.vx,b.vy),angle=Math.atan2(b.vy,b.vx);
     const a1=angle-0.34,a2=angle+0.34;
     b.vx=Math.cos(a1)*speed;b.vy=Math.sin(a1)*speed;
     extras.push(makeBall(b.x,b.y,Math.cos(a2)*speed,Math.sin(a2)*speed));
   }
   balls.push(...extras);
 }
 beep(type==='MULTI'?880:760,.14);
}
function update(dt){
 let f=dt/16.67;
 if(keys.ArrowLeft||keys.a)paddle.x-=9*f;if(keys.ArrowRight||keys.d)paddle.x+=9*f;paddle.x=Math.max(5,Math.min(W-paddle.w-5,paddle.x));
 for(let k in timers)if(timers[k]>0)timers[k]-=f;
 let slow=timers.SLOW>0?.72:1;
 for(let bi=balls.length-1;bi>=0;bi--){
  let b=balls[bi];b.x+=b.vx*f*slow;b.y+=b.vy*f*slow;
  if(b.x<b.r){b.x=b.r;b.vx=Math.abs(b.vx);beep(300,.025)}if(b.x>W-b.r){b.x=W-b.r;b.vx=-Math.abs(b.vx);beep(300,.025)}if(b.y<b.r){b.y=b.r;b.vy=Math.abs(b.vy);beep(300,.025)}
  if(b.y>H+15){balls.splice(bi,1);continue}
  if(b.vy>0&&b.y+b.r>=paddle.y&&b.y-b.r<=paddle.y+paddle.h&&b.x>=paddle.x&&b.x<=paddle.x+paddle.w){
   let hit=(b.x-(paddle.x+paddle.w/2))/(paddle.w/2),speed=Math.min(10,Math.hypot(b.vx,b.vy)*1.02);
   b.vx=hit*speed*.88;b.vy=-Math.sqrt(Math.max(8,speed*speed-b.vx*b.vx));b.y=paddle.y-b.r-1;beep(520,.04)
  }
  for(let brick of bricks){if(!brick.alive)continue;
   let nx=Math.max(brick.x,Math.min(b.x,brick.x+brick.w)),ny=Math.max(brick.y,Math.min(b.y,brick.y+brick.h)),dx=b.x-nx,dy=b.y-ny;
   if(dx*dx+dy*dy<b.r*b.r){
    brick.hp--;if(brick.hp<=0){brick.alive=false;score+=100;dropAt(brick.x+brick.w/2,brick.y+brick.h/2);for(let i=0;i<8;i++)particles.push({x:brick.x+brick.w/2,y:brick.y+brick.h/2,vx:(Math.random()-.5)*8,vy:(Math.random()-.5)*8,life:25,color:brick.color})}else score+=35;
    hud();if(Math.abs(dx)>Math.abs(dy))b.vx*=-1;else b.vy*=-1;beep(440,.035,'square',.025);break
   }
  }
 }
 if(balls.length===0){loseLife();return}
 for(let i=drops.length-1;i>=0;i--){let d=drops[i];d.y+=d.vy*f;if(d.y+d.h>=paddle.y&&d.x+d.w>=paddle.x&&d.x<=paddle.x+paddle.w){applyDrop(d.type);drops.splice(i,1)}else if(d.y>H)drops.splice(i,1)}
 particles=particles.filter(p=>p.life-->0);for(let p of particles){p.x+=p.vx*f;p.y+=p.vy*f}
 if(bricks.every(b=>!b.alive))stageClear()
}
function draw(){
 g.fillStyle='#070e23';g.fillRect(0,0,W,H);
 g.fillStyle='rgba(75,113,175,.07)';g.font='bold 24px Arial';g.textAlign='center';g.fillText('NEON ARCADE  •  STAGE '+stage,W/2,60);
 for(let b of bricks){if(!b.alive)continue;g.save();g.shadowBlur=14;g.shadowColor=b.color;g.fillStyle=b.color;g.globalAlpha=.95;rounded(b.x,b.y,b.w,b.h,9);g.fill();g.globalAlpha=.25;g.fillStyle='#fff';rounded(b.x+7,b.y+5,b.w-14,5,3);g.fill();g.restore()}
 for(let d of drops){g.fillStyle=d.type==='WIDE'?'#20dfff':d.type==='MULTI'?'#c879ff':'#9cff9c';rounded(d.x,d.y,d.w,d.h,6);g.fill();g.fillStyle='#081229';g.font='bold 12px Arial';g.textAlign='center';g.fillText(d.type[0],d.x+d.w/2,d.y+15)}
 for(let p of particles){g.globalAlpha=p.life/25;g.fillStyle=p.color;g.fillRect(p.x,p.y,5,5)}g.globalAlpha=1;
 if(timers.WIDE>0)paddle.w=175;else paddle.w=130;paddle.x=Math.max(5,Math.min(W-paddle.w-5,paddle.x));
 g.save();g.shadowBlur=20;g.shadowColor='#35dfff';let grad=g.createLinearGradient(paddle.x,0,paddle.x+paddle.w,0);grad.addColorStop(0,'#168cff');grad.addColorStop(.5,'#a5faff');grad.addColorStop(1,'#367aff');g.fillStyle=grad;rounded(paddle.x,paddle.y,paddle.w,paddle.h,8);g.fill();g.restore();
 for(const b of balls){g.save();g.shadowBlur=22;g.shadowColor='#fff';g.fillStyle='#fff';g.beginPath();g.arc(b.x,b.y,b.r,0,Math.PI*2);g.fill();g.restore()}
}
function loop(t){if(!active||paused||between)return;let dt=Math.min(32,t-last||16.67);last=t;update(dt);draw();if(active&&!paused&&!between)raf=requestAnimationFrame(loop)}
function move(e){let r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*W;paddle.x=Math.max(5,Math.min(W-paddle.w-5,x-paddle.w/2))}
c.addEventListener('pointermove',move);
document.addEventListener('keydown',e=>{keys[e.key]=true;if(e.key===' '&&active)togglePause()});document.addEventListener('keyup',e=>keys[e.key]=false);
function togglePause(){if(!active&&!paused)return;paused=!paused;if(paused){cancelAnimationFrame(raf);pause.classList.remove('hidden')}else{pause.classList.add('hidden');last=performance.now();raf=requestAnimationFrame(loop)}}
$('startBtn').onclick=()=>{if(stage===5&&bricks.every(b=>!b.alive))reset();startGame()};$('pauseBtn').onclick=togglePause;$('resume').onclick=togglePause;$('restartBtn').onclick=reset;
reset();
})();