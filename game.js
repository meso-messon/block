(() => {
const c=document.getElementById('game'),g=c.getContext('2d'),W=780,H=930,$=id=>document.getElementById(id);
const scoreEl=$('score'),stageEl=$('stage'),lifeEl=$('life'),start=$('start'),count=$('count'),pause=$('pause');
const palette=['#d34acb','#7950d8','#22bde0','#18b8ad','#e6a14a'];
let score=0,stage=1,lives=3,bricks=[],drops=[],particles=[],paddle,ball,active=false,paused=false,between=false,raf=0,last=0,keys={},timers={WIDE:0,MULTI:0,SLOW:0},audio;
function beep(f=440,d=.08,type='sine',v=.035){try{audio ||= new(window.AudioContext||window.webkitAudioContext)();let o=audio.createOscillator(),a=audio.createGain();o.type=type;o.frequency.value=f;a.gain.setValueAtTime(v,audio.currentTime);a.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);o.connect(a);a.connect(audio.destination);o.start();o.stop(audio.currentTime+d)}catch(e){}}
function endSound(){beep(330,.18,'triangle',.05);setTimeout(()=>beep(247,.2,'triangle',.045),150);setTimeout(()=>beep(165,.4,'sawtooth',.035),320)}
function hud(){scoreEl.textContent=score;stageEl.textContent=stage;lifeEl.textContent=lives}
function initPaddle(){paddle={x:W/2-65,y:H-85,w:130,h:14}}
function initBall(){ball={x:W/2,y:H-112,r:10,vx:4.2*(Math.random()<.5?-1:1),vy:-5.2}}
function makeBricks(){bricks=[];drops=[];let cols=8,rows=5,bw=76,bh=34,gap=10,left=(W-(cols*bw+(cols-1)*gap))/2,top=140;
for(let r=0;r<rows;r++)for(let col=0;col<cols;col++)bricks.push({x:left+col*(bw+gap),y:top+r*(bh+18),w:bw,h:bh,hp:1,color:palette[r],alive:true});}
function reset(){score=0;stage=1;lives=3;Object.keys(timers).forEach(k=>timers[k]=0);initPaddle();initBall();makeBricks();hud();active=false;paused=false;between=false;start.classList.remove('hidden');count.classList.add('hidden');pause.classList.add('hidden');$('startBtn').textContent='▶ GAME START';draw()}
function startGame(){start.classList.add('hidden');pause.classList.add('hidden');paused=false;active=true;last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop)}
function stageClear(){active=false;between=true;let n=3;$('countNum').textContent=n;count.classList.remove('hidden');let tick=()=>{n--;if(n>0){$('countNum').textContent=n;beep(600,.07);setTimeout(tick,700)}else{count.classList.add('hidden');between=false;stage++;if(stage>5){stage=5;start.querySelector('h1').textContent='ALL CLEAR';start.querySelector('.sub').textContent='CONGRATULATIONS ✦';$('startBtn').textContent='PLAY AGAIN';start.classList.remove('hidden');return}initPaddle();initBall();makeBricks();hud();startGame()}};setTimeout(tick,700)}
function loseLife(){lives--;hud();beep(180,.2,'triangle');if(lives<=0){active=false;endSound();setTimeout(()=>{start.querySelector('h1').textContent='NEON BREAKER';start.querySelector('.sub').textContent='FINAL FIX EDITION ✦';$('startBtn').textContent='PLAY AGAIN';start.classList.remove('hidden')},650)}else{initPaddle();initBall()}}
function rounded(x,y,w,h,r){g.beginPath();g.roundRect(x,y,w,h,r)}
function dropAt(x,y){if(Math.random()>.17)return;let type=['WIDE','MULTI','SLOW'][Math.floor(Math.random()*3)];drops.push({x,y,w:28,h:22,vy:3,type})}
function update(dt){let f=dt/16.67;
if(keys.ArrowLeft||keys.a)paddle.x-=9*f;if(keys.ArrowRight||keys.d)paddle.x+=9*f;paddle.x=Math.max(5,Math.min(W-paddle.w-5,paddle.x));
for(let k in timers)if(timers[k]>0)timers[k]-=f;
let slow=timers.SLOW>0?.72:1;ball.x+=ball.vx*f*slow;ball.y+=ball.vy*f*slow;
if(ball.x<ball.r){ball.x=ball.r;ball.vx=Math.abs(ball.vx);beep(300,.03)}if(ball.x>W-ball.r){ball.x=W-ball.r;ball.vx=-Math.abs(ball.vx);beep(300,.03)}if(ball.y<ball.r){ball.y=ball.r;ball.vy=Math.abs(ball.vy);beep(300,.03)}
if(ball.y>H+15){loseLife();return}
if(ball.vy>0&&ball.y+ball.r>=paddle.y&&ball.y-ball.r<=paddle.y+paddle.h&&ball.x>=paddle.x&&ball.x<=paddle.x+paddle.w){let hit=(ball.x-(paddle.x+paddle.w/2))/(paddle.w/2),speed=Math.min(10,Math.hypot(ball.vx,ball.vy)*1.02);ball.vx=hit*speed*.88;ball.vy=-Math.sqrt(speed*speed-ball.vx*ball.vx);ball.y=paddle.y-ball.r-1;beep(520,.05)}
for(let b of bricks){if(!b.alive)continue;let nx=Math.max(b.x,Math.min(ball.x,b.x+b.w)),ny=Math.max(b.y,Math.min(ball.y,b.y+b.h)),dx=ball.x-nx,dy=ball.y-ny;if(dx*dx+dy*dy<ball.r*ball.r){b.alive=false;score+=100;hud();if(Math.abs(dx)>Math.abs(dy))ball.vx*=-1;else ball.vy*=-1;dropAt(b.x+b.w/2,b.y+b.h/2);for(let i=0;i<8;i++)particles.push({x:b.x+b.w/2,y:b.y+b.h/2,vx:(Math.random()-.5)*8,vy:(Math.random()-.5)*8,life:25,color:b.color});beep(440,.04,'square',.025);break}}
for(let i=drops.length-1;i>=0;i--){let d=drops[i];d.y+=d.vy*f;if(d.y+d.h>=paddle.y&&d.x+d.w>=paddle.x&&d.x<=paddle.x+paddle.w){timers[d.type]=600;if(d.type==='WIDE')paddle.w=175;if(d.type==='MULTI'){ball.vx*=1.15;ball.vy*=1.15}beep(760,.12);drops.splice(i,1)}else if(d.y>H)drops.splice(i,1)}
particles=particles.filter(p=>p.life-->0);for(let p of particles){p.x+=p.vx*f;p.y+=p.vy*f}
if(bricks.every(b=>!b.alive))stageClear()
}
function draw(){g.fillStyle='#070e23';g.fillRect(0,0,W,H);
// faint stage title
g.fillStyle='rgba(75,113,175,.07)';g.font='bold 24px Arial';g.textAlign='center';g.fillText('NEON ARCADE  •  STAGE '+stage,W/2,60);
for(let b of bricks){if(!b.alive)continue;g.save();g.shadowBlur=14;g.shadowColor=b.color;g.fillStyle=b.color;g.globalAlpha=.95;rounded(b.x,b.y,b.w,b.h,9);g.fill();g.globalAlpha=.25;g.fillStyle='#fff';rounded(b.x+7,b.y+5,b.w-14,5,3);g.fill();g.restore()}
for(let d of drops){g.fillStyle=d.type==='WIDE'?'#20dfff':d.type==='MULTI'?'#c879ff':'#9cff9c';rounded(d.x,d.y,d.w,d.h,6);g.fill();g.fillStyle='#081229';g.font='bold 12px Arial';g.textAlign='center';g.fillText(d.type[0],d.x+d.w/2,d.y+15)}
for(let p of particles){g.globalAlpha=p.life/25;g.fillStyle=p.color;g.fillRect(p.x,p.y,5,5)}g.globalAlpha=1;
if(timers.WIDE>0)paddle.w=175;else paddle.w=130;paddle.x=Math.max(5,Math.min(W-paddle.w-5,paddle.x));
g.save();g.shadowBlur=20;g.shadowColor='#35dfff';let grad=g.createLinearGradient(paddle.x,0,paddle.x+paddle.w,0);grad.addColorStop(0,'#168cff');grad.addColorStop(.5,'#a5faff');grad.addColorStop(1,'#367aff');g.fillStyle=grad;rounded(paddle.x,paddle.y,paddle.w,paddle.h,8);g.fill();g.restore();
g.save();g.shadowBlur=22;g.shadowColor='#fff';g.fillStyle='#fff';g.beginPath();g.arc(ball.x,ball.y,ball.r,0,Math.PI*2);g.fill();g.restore()}
function loop(t){if(!active||paused||between)return;let dt=Math.min(32,t-last||16.67);last=t;update(dt);draw();if(active&&!paused&&!between)raf=requestAnimationFrame(loop)}
function move(e){let r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*W;paddle.x=Math.max(5,Math.min(W-paddle.w-5,x-paddle.w/2))}
c.addEventListener('pointermove',move);document.addEventListener('keydown',e=>{keys[e.key]=true;if(e.key===' '&&active)togglePause()});document.addEventListener('keyup',e=>keys[e.key]=false);
function togglePause(){if(!active&&!paused)return;paused=!paused;if(paused){cancelAnimationFrame(raf);pause.classList.remove('hidden')}else{pause.classList.add('hidden');last=performance.now();raf=requestAnimationFrame(loop)}}
$('startBtn').onclick=()=>{if(stage===5&&bricks.every(b=>!b.alive))reset();startGame()};$('pauseBtn').onclick=togglePause;$('resume').onclick=togglePause;$('restartBtn').onclick=reset;
reset();
})();