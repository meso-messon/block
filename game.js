(() => {
  "use strict";
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const $ = id => document.getElementById(id);
  const scoreEl = $("score"), stageEl = $("stage"), lifeEl = $("life");
  const startScreen = $("startScreen"), countScreen = $("countScreen"), pauseScreen = $("pauseScreen");
  const countNum = $("countNum");
  const COLORS = ["#20dcff", "#4f83ff", "#bd5cff", "#ff4db8", "#ff9b4a"];
  let score = 0, stage = 1, lives = 3, running = false, paused = false, counting = false;
  let paddle, ball, bricks = [], drops = [], particles = [];
  let wideTimer = 0, slowTimer = 0, multiTimer = 0, keys = {};
  let lastTime = 0, raf = 0, audioCtx = null;

  function sound(freq=440, duration=.09, type="sine", volume=.035) {
    try {
      audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(volume, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(.001, audioCtx.currentTime + duration);
      o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + duration);
    } catch (_) {}
  }
  function gameOverSound() {
    sound(330,.18,"triangle",.055);
    setTimeout(() => sound(247,.22,"triangle",.05), 150);
    setTimeout(() => sound(165,.42,"sawtooth",.035), 330);
  }
  function updateHud() {
    scoreEl.textContent = String(score).padStart(6,"0");
    stageEl.textContent = `${stage} / 5`; lifeEl.textContent = lives;
  }
  function resetBall() {
    ball = { x: W/2, y: H-76, r: 6, vx: (Math.random() < .5 ? -1 : 1)*2.5, vy: -3.7, stuck: false };
  }
  function resetPaddle() { paddle = { x: W/2-42, y: H-42, w: 84, h: 10, speed: 6.4 }; }
  function makeBricks() {
    bricks = []; drops = [];
    const rows = Math.min(3 + stage, 7), cols = 8, gap = 5, bw = 37, bh = 16;
    const left = (W - (cols*bw + (cols-1)*gap))/2;
    for (let r=0;r<rows;r++) for (let c=0;c<cols;c++) {
      const tough = stage >= 3 && r < Math.floor(rows/3) && (c+r)%3===0;
      bricks.push({x:left+c*(bw+gap), y:62+r*(bh+8), w:bw, h:bh, hp:tough?2:1, color:COLORS[(r+c+stage-1)%COLORS.length], alive:true});
    }
  }
  function resetGame() {
    score=0; stage=1; lives=3; wideTimer=slowTimer=multiTimer=0; particles=[];
    resetPaddle(); resetBall(); makeBricks(); updateHud();
    running=false; paused=false; counting=false;
    startScreen.classList.remove("hidden"); countScreen.classList.add("hidden"); pauseScreen.classList.add("hidden");
    $("pauseBtn").textContent="Ⅱ PAUSE";
    draw();
  }
  function startGame() {
    if (running && !paused) return;
    startScreen.classList.add("hidden"); pauseScreen.classList.add("hidden");
    paused=false; running=true; lastTime=performance.now();
    cancelAnimationFrame(raf); raf=requestAnimationFrame(loop);
  }
  function nextStage() {
    stage++;
    if (stage > 5) { stage=5; running=false; counting=false; startScreen.classList.remove("hidden");
      startScreen.querySelector(".logo").innerHTML="ALL<br>CLEAR"; startScreen.querySelector(".sub").textContent="CONGRATULATIONS";
      $("startBtn").textContent="PLAY AGAIN"; return; }
    wideTimer=slowTimer=multiTimer=0; resetPaddle(); resetBall(); makeBricks(); updateHud();
    counting=true; let n=3; countNum.textContent=n; countScreen.classList.remove("hidden");
    const tick=() => { n--; if(n>0){countNum.textContent=n; sound(600,.07,"sine",.025); setTimeout(tick,700);}
      else {countScreen.classList.add("hidden"); counting=false; sound(880,.12); startGame();} };
    setTimeout(tick,700);
  }
  function spawnDrop(x,y) {
    if (Math.random()>.19) return;
    const types=["WIDE","MULTI","SLOW"], type=types[Math.floor(Math.random()*types.length)];
    drops.push({x:x-8,y:y-5,w:16,h:12,vy:2.1,type, color:type==="WIDE"?"#20dcff":type==="MULTI"?"#c66bff":"#8cff9b"});
  }
  function burst(x,y,color) {
    for(let i=0;i<7;i++) particles.push({x,y,vx:(Math.random()-.5)*3.5,vy:(Math.random()-.5)*3.5,life:24,color});
  }
  function applyDrop(type) {
    if(type==="WIDE") wideTimer=600;
    if(type==="SLOW") slowTimer=600;
    if(type==="MULTI") {
      multiTimer=600;
      const speed=Math.hypot(ball.vx,ball.vy);
      ball.vx*=1.12; ball.vy*=1.12;
      if(speed>0) { /* power-up feedback */ }
    }
    sound(720,.13,"sine",.04);
  }
  function loseLife() {
    lives--; updateHud(); sound(190,.2,"triangle",.045);
    if(lives<=0) {
      running=false; gameOverSound();
      // Deliberately no GAME OVER banner: the end is signalled by sound.
      setTimeout(()=>{startScreen.classList.remove("hidden"); startScreen.querySelector(".logo").innerHTML="NEON<br>BREAKER"; startScreen.querySelector(".sub").textContent="TRY AGAIN"; $("startBtn").textContent="PLAY AGAIN";},650);
    } else { resetPaddle(); resetBall(); }
  }
  function collideBallRect(b) {
    const nx=Math.max(b.x,Math.min(ball.x,b.x+b.w)), ny=Math.max(b.y,Math.min(ball.y,b.y+b.h));
    const dx=ball.x-nx, dy=ball.y-ny;
    if(dx*dx+dy*dy<ball.r*ball.r) {
      if(Math.abs(dx)>Math.abs(dy)) ball.vx=dx>0?Math.abs(ball.vx):-Math.abs(ball.vx);
      else ball.vy=dy>0?Math.abs(ball.vy):-Math.abs(ball.vy);
      return true;
    }
    return false;
  }
  function update(dt) {
    const f=dt/16.67;
    if(keys.ArrowLeft||keys.a) paddle.x-=paddle.speed*f;
    if(keys.ArrowRight||keys.d) paddle.x+=paddle.speed*f;
    paddle.x=Math.max(4,Math.min(W-paddle.w-4,paddle.x));
    if(wideTimer>0) wideTimer-=f; if(slowTimer>0) slowTimer-=f; if(multiTimer>0) multiTimer-=f;
    const slow=slowTimer>0?.72:1;
    ball.x+=ball.vx*f*slow; ball.y+=ball.vy*f*slow;
    if(ball.x<ball.r){ball.x=ball.r;ball.vx=Math.abs(ball.vx);sound(300,.035);}
    if(ball.x>W-ball.r){ball.x=W-ball.r;ball.vx=-Math.abs(ball.vx);sound(300,.035);}
    if(ball.y<ball.r){ball.y=ball.r;ball.vy=Math.abs(ball.vy);sound(300,.035);}
    if(ball.y>H+12){loseLife();return;}
    if(ball.vy>0 && ball.y+ball.r>=paddle.y && ball.y-ball.r<=paddle.y+paddle.h && ball.x>=paddle.x && ball.x<=paddle.x+paddle.w) {
      const hit=(ball.x-(paddle.x+paddle.w/2))/(paddle.w/2);
      const speed=Math.min(7.2,Math.hypot(ball.vx,ball.vy)*1.015);
      ball.vx=hit*speed*.88; ball.vy=-Math.sqrt(Math.max(5,speed*speed-ball.vx*ball.vx));
      ball.y=paddle.y-ball.r-1; sound(520,.055);
    }
    for(const b of bricks) if(b.alive && collideBallRect(b)) {
      b.hp--; if(b.hp<=0){b.alive=false;score+=100;spawnDrop(b.x+b.w/2,b.y+b.h/2);burst(b.x+b.w/2,b.y+b.h/2,b.color);}
      else {score+=35; b.color="#ffffff";}
      sound(430,.045,"square",.022); updateHud(); break;
    }
    for(let i=drops.length-1;i>=0;i--) {
      const d=drops[i]; d.y+=d.vy*f;
      if(d.y+d.h>=paddle.y && d.x+d.w>=paddle.x && d.x<=paddle.x+paddle.w){applyDrop(d.type);drops.splice(i,1);}
      else if(d.y>H) drops.splice(i,1);
    }
    particles=particles.filter(p=>p.life-->0);
    for(const p of particles){p.x+=p.vx*f;p.y+=p.vy*f;}
    if(bricks.every(b=>!b.alive)){running=false;nextStage();}
  }
  function drawBackground() {
    const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,"#0a1537");g.addColorStop(1,"#05091b");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    ctx.strokeStyle="rgba(55,130,220,.09)";ctx.lineWidth=1;
    for(let x=0;x<W;x+=30){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=0;y<H;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    for(let i=0;i<35;i++){const x=(i*79)%W,y=(i*137)%H;ctx.fillStyle="rgba(120,190,255,.28)";ctx.fillRect(x,y,1.5,1.5);}
  }
  function draw() {
    drawBackground();
    bricks.forEach(b=>{if(!b.alive)return;ctx.save();ctx.shadowBlur= b.hp>1?15:10;ctx.shadowColor=b.color;ctx.fillStyle=b.color;ctx.globalAlpha=b.hp>1?.98:.82;roundRect(b.x,b.y,b.w,b.h,4);ctx.fill();ctx.globalAlpha=.35;ctx.fillStyle="#fff";roundRect(b.x+3,b.y+2,b.w-6,3,2);ctx.fill();ctx.restore();});
    drops.forEach(d=>{ctx.save();ctx.shadowBlur=12;ctx.shadowColor=d.color;ctx.fillStyle=d.color;roundRect(d.x,d.y,d.w,d.h,4);ctx.fill();ctx.fillStyle="#071027";ctx.font="bold 7px sans-serif";ctx.textAlign="center";ctx.fillText(d.type==="MULTI"?"M":d.type==="WIDE"?"W":"S",d.x+8,d.y+9);ctx.restore();});
    particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life/24);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,3,3);});ctx.globalAlpha=1;
    const pw=wideTimer>0?116:84;paddle.w=pw;paddle.x=Math.max(4,Math.min(W-pw-4,paddle.x));
    ctx.save();ctx.shadowBlur=18;ctx.shadowColor="#23dfff";const pg=ctx.createLinearGradient(paddle.x,0,paddle.x+paddle.w,0);pg.addColorStop(0,"#168cff");pg.addColorStop(.5,"#a5faff");pg.addColorStop(1,"#367aff");ctx.fillStyle=pg;roundRect(paddle.x,paddle.y,paddle.w,paddle.h,6);ctx.fill();ctx.restore();
    ctx.save();ctx.shadowBlur=18;ctx.shadowColor="#fff";ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2);ctx.fill();ctx.restore();
    if(wideTimer>0||slowTimer>0||multiTimer>0){ctx.font="bold 9px sans-serif";ctx.fillStyle="#9db9e9";ctx.textAlign="left";let y=H-12;if(wideTimer>0){ctx.fillText("WIDE",10,y);y-=12;}if(multiTimer>0){ctx.fillText("MULTI",10,y);y-=12;}if(slowTimer>0)ctx.fillText("SLOW",10,y);}
  }
  function roundRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
  function loop(now) {
    if(!running||paused||counting)return;
    const dt=Math.min(32,now-lastTime||16.67);lastTime=now;
    update(dt);draw();
    if(running&&!paused&&!counting)raf=requestAnimationFrame(loop);
  }
  function pointerMove(e) {
    const rect=canvas.getBoundingClientRect(), x=(e.clientX-rect.left)/rect.width*W;
    paddle.x=Math.max(4,Math.min(W-paddle.w-4,x-paddle.w/2));
  }
  canvas.addEventListener("pointermove",pointerMove);
  canvas.addEventListener("pointerdown",e=>{pointerMove(e);if(!running&&!paused&&!counting&&startScreen.classList.contains("hidden"))startGame();});
  document.addEventListener("keydown",e=>{if(["ArrowLeft","ArrowRight"," "].includes(e.key))e.preventDefault();keys[e.key]=true;if(e.key===" "&&running)togglePause();});
  document.addEventListener("keyup",e=>keys[e.key]=false);
  function togglePause(){
    if(!running&&!paused)return;
    paused=!paused;
    if(paused){cancelAnimationFrame(raf);pauseScreen.classList.remove("hidden");$("pauseBtn").textContent="▶ RESUME";}
    else{pauseScreen.classList.add("hidden");$("pauseBtn").textContent="Ⅱ PAUSE";lastTime=performance.now();raf=requestAnimationFrame(loop);}
  }
  $("startBtn").addEventListener("click",()=>{if(stage===5&&score>0&&bricks.every(b=>!b.alive))resetGame();startGame();});
  $("pauseBtn").addEventListener("click",togglePause);
  $("resumeBtn").addEventListener("click",togglePause);
  $("restartBtn").addEventListener("click",()=>{cancelAnimationFrame(raf);resetGame();});
  resetGame();
})();