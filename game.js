(()=>{
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);
const overlay=$('overlay'),title=$('title'),subtitle=$('subtitle'),message=$('message'),mainBtn=$('mainBtn');
let W=360,H=540,dpr=1,score=0,stage=1,life=3,running=false,paused=false,clearing=false,gameEnded=false,raf=0,last=0,countTimer=0;
let paddle,balls=[],bricks=[],items=[],particles=[];
const palette=['#ff4bd8','#a45cff','#31dfff','#2de6c1','#ffc75a'];
const rand=(a,b)=>Math.random()*(b-a)+a;
function resize(){
 const r=canvas.getBoundingClientRect();dpr=Math.min(devicePixelRatio||1,2);
 canvas.width=Math.max(1,Math.round(r.width*dpr));canvas.height=Math.max(1,Math.round(r.height*dpr));
 ctx.setTransform(dpr,0,0,dpr,0,0);W=r.width;H=r.height;
 if(paddle){paddle.x=Math.min(W-paddle.w/2,Math.max(paddle.w/2,paddle.x));paddle.y=H-38}
 draw();
}
window.addEventListener('resize',resize);
function hud(){$('score').textContent=score;$('stage').textContent=stage;$('life').textContent=life}
function makeBricks(){
 bricks=[];const cols=8,rows=Math.min(3+stage,6),gap=5,left=12,top=74;
 const bw=(W-left*2-gap*(cols-1))/cols,bh=17;
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
  let hp=(stage>=4&&Math.random()<.18)?2:1;
  bricks.push({x:left+c*(bw+gap),y:top+r*(bh+gap),w:bw,h:bh,hp,alive:true,color:palette[(r+stage-1)%palette.length]});
 }
}
function makePaddle(){paddle={x:W/2,y:H-38,w:72,h:10}}
function resetBall(){balls=[{x:W/2,y:H-64,vx:rand(-1.5,1.5),vy:-3.4,r:5.5}]}
function setup(){makePaddle();makeBricks();items=[];particles=[];resetBall();hud()}
function show(kind,sub,msg,button){
 overlay.style.display='flex';title.textContent=kind;subtitle.textContent=sub;message.innerHTML=msg;mainBtn.textContent=button;mainBtn.style.display=button?'block':'none';
}
function hide(){overlay.style.display='none'}
function startGame(){clearTimeout(countTimer);cancelAnimationFrame(raf);score=0;stage=1;life=3;paused=false;clearing=false;gameEnded=false;setup();hide();running=true;last=performance.now();raf=requestAnimationFrame(loop)}
function finishGame(win){running=false;gameEnded=true;show(win?'ALL CLEAR!':'GAME OVER',win?'FINAL RESULT ✦':'TRY AGAIN ✦','SCORE：'+score,win?'↻ PLAY AGAIN':'↻ RETRY')}
function nextStage(){
 stage++;
 if(stage>5){finishGame(true);return}
 setup();clearing=false;paused=false;overlay.style.display='none';running=true;last=performance.now();raf=requestAnimationFrame(loop);
}
function clearStage(){
 if(clearing)return;clearing=true;running=false;let n=3;
 show('STAGE CLEAR!','NEXT STAGE','次のステージまで <b id="countNo" style="color:#6ceaff;font-size:30px">3</b>','');
 const tick=()=>{n--;if(n>0){const el=$('countNo');if(el)el.textContent=n;countTimer=setTimeout(tick,1000)}
 else{overlay.style.display='none';nextStage()}};
 countTimer=setTimeout(tick,1000);
}
function loseLife(){life--;hud();if(life<=0)finishGame(false);else resetBall()}
function dropItem(x,y){if(Math.random()>.17)return;const kinds=['WIDE','MULTI','SLOW'];items.push({x,y,vy:1.5,type:kinds[Math.floor(Math.random()*3)]})}
function takeItem(it){
 if(it.type==='WIDE')paddle.w=Math.min(W*.48,paddle.w*1.45);
 if(it.type==='MULTI'){const b=balls[0];if(b){balls.push({x:b.x,y:b.y,vx:-2.7,vy:-2.7,r:5.5},{x:b.x,y:b.y,vx:2.7,vy:-2.7,r:5.5})}}
 if(it.type==='SLOW')balls.forEach(b=>{b.vx*=.72;b.vy*=.72});
}
function burst(x,y,color){for(let i=0;i<7;i++)particles.push({x,y,vx:rand(-2,2),vy:rand(-2,2),life:22,color})}
function update(dt){
 const f=Math.min(dt/16.67,2);
 for(const b of balls){
  b.x+=b.vx*f;b.y+=b.vy*f;
  if(b.x<b.r){b.x=b.r;b.vx=Math.abs(b.vx)}if(b.x>W-b.r){b.x=W-b.r;b.vx=-Math.abs(b.vx)}
  if(b.y<b.r){b.y=b.r;b.vy=Math.abs(b.vy)}
  if(b.vy>0&&b.y+b.r>=paddle.y&&b.y-b.r<=paddle.y+paddle.h&&b.x>=paddle.x-paddle.w/2&&b.x<=paddle.x+paddle.w/2){
   const a=((b.x-paddle.x)/(paddle.w/2))*.92;b.vx=a*3.2;b.vy=-Math.sqrt(Math.max(.5,3.8*3.8-b.vx*b.vx));b.y=paddle.y-b.r;
  }
  for(const br of bricks)if(br.alive&&b.x+b.r>br.x&&b.x-b.r<br.x+br.w&&b.y+b.r>br.y&&b.y-b.r<br.y+br.h){
   br.hp--;if(br.hp<=0){br.alive=false;score+=10*stage;dropItem(br.x+br.w/2,br.y);burst(br.x+br.w/2,br.y+br.h/2,br.color)}else br.color='#fff';
   b.vy*=-1;break;
  }
 }
 balls=balls.filter(b=>b.y<H+15);if(!balls.length){loseLife();if(!running)return}
 for(const it of items){it.y+=it.vy*f;if(it.y>paddle.y-8&&it.y<paddle.y+15&&Math.abs(it.x-paddle.x)<paddle.w/2)takeItem(it)}
 items=items.filter(it=>it.y<H+20);
 particles.forEach(p=>{p.x+=p.vx*f;p.y+=p.vy*f;p.life-=f});particles=particles.filter(p=>p.life>0);
 if(bricks.length&&bricks.every(b=>!b.alive))clearStage();
 hud();
}
function draw(){
 ctx.clearRect(0,0,W,H);
 // subtle game field glow and decorative header
 const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#0b1530');g.addColorStop(1,'#080e21');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 ctx.textAlign='center';ctx.fillStyle='#1c3559';ctx.font='bold 10px Arial';ctx.fillText('NEON ARCADE  •  STAGE '+stage,W/2,28);
 for(let x=0;x<W;x+=30){ctx.strokeStyle='#10203b';ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
 bricks.forEach(b=>{if(!b.alive)return;ctx.save();ctx.shadowBlur=10;ctx.shadowColor=b.color;ctx.fillStyle=b.color;ctx.globalAlpha=b.hp===2?.65:.95;ctx.beginPath();ctx.roundRect(b.x,b.y,b.w,b.h,5);ctx.fill();ctx.globalAlpha=.18;ctx.fillStyle='#fff';ctx.fillRect(b.x+5,b.y+3,b.w-10,2);ctx.restore()});
 if(paddle){ctx.save();ctx.shadowBlur=16;ctx.shadowColor='#25dfff';ctx.fillStyle='#23cce8';ctx.beginPath();ctx.roundRect(paddle.x-paddle.w/2,paddle.y,paddle.w,paddle.h,7);ctx.fill();ctx.restore()}
 balls.forEach(b=>{ctx.save();ctx.shadowBlur=15;ctx.shadowColor='#fff';ctx.fillStyle='#f4fbff';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();ctx.restore()});
 items.forEach(it=>{const col=it.type==='WIDE'?'#42eaff':it.type==='MULTI'?'#ff59dc':'#ffe16b';ctx.save();ctx.shadowBlur=10;ctx.shadowColor=col;ctx.fillStyle=col;ctx.beginPath();ctx.roundRect(it.x-22,it.y-8,44,16,7);ctx.fill();ctx.fillStyle='#091329';ctx.font='bold 9px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(it.type,it.x,it.y);ctx.restore()});
 particles.forEach(p=>{ctx.globalAlpha=p.life/22;ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,3,3)});ctx.globalAlpha=1;
}
function loop(t){if(!running||paused)return;const dt=t-last;last=t;update(dt);draw();if(running)raf=requestAnimationFrame(loop)}
function move(clientX){const r=canvas.getBoundingClientRect();paddle.x=Math.max(paddle.w/2,Math.min(W-paddle.w/2,clientX-r.left))}
canvas.addEventListener('pointermove',e=>{if(paddle)move(e.clientX)});
canvas.addEventListener('pointerdown',e=>{if(paddle)move(e.clientX)});
mainBtn.addEventListener('click',()=>{if(paused){paused=false;hide();last=performance.now();running=true;raf=requestAnimationFrame(loop)}else startGame()});
$('pauseBtn').addEventListener('click',()=>{
 if(clearing||gameEnded||!running&&!paused)return;
 if(!paused){paused=true;running=false;cancelAnimationFrame(raf);show('PAUSED','TAKE A BREAK','いつでも再開できるよ','▶ RESUME')}
 else{paused=false;hide();running=true;last=performance.now();raf=requestAnimationFrame(loop)}
});
$('restartBtn').addEventListener('click',startGame);
setup();resize();draw();
})();
