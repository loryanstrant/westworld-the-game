(() => {
  "use strict";
  const canvas = document.querySelector("#game");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const W = canvas.width, H = canvas.height, TILE = 48, COLS = 15, ROWS = 9;
  const OX = 18, OY = 92;
  const keys = new Set();
  let audioOn = true, audio, musicGain, musicTimer, musicStep = 0;
  let state = "title", selected = 0, tick = 0, last = 0;
  let game = null, message = "", messageUntil = 0;

  const CHARACTERS = [
    { name:"DOLORES", role:"THE DREAMER", coat:"#dfc48c", hair:"#e4c16f", accent:"#3b6b86", ability:"REVERIE", power:"reveal", desc:"Reveals memories and the path inward." },
    { name:"MAEVE", role:"THE AWAKENED", coat:"#721f21", hair:"#28170f", accent:"#c69242", ability:"COMMAND", power:"freeze", desc:"Freezes every host caught in a loop." },
    { name:"BERNARD", role:"THE SEEKER", coat:"#493c32", hair:"#211712", accent:"#9eb3a7", ability:"ANALYSE", power:"repair", desc:"Repairs stability by understanding himself." },
    { name:"TEDDY", role:"THE GUNSLINGER", coat:"#68533e", hair:"#34241b", accent:"#b55a32", ability:"PROTECT", power:"shield", desc:"Becomes immune to one hostile encounter." },
    { name:"HECTOR", role:"THE OUTLAW", coat:"#2e2925", hair:"#171310", accent:"#9b3c2b", ability:"DEFY", power:"stun", desc:"Stuns nearby hosts and breaks their pursuit." },
    { name:"CLEMENTINE", role:"THE SURVIVOR", coat:"#784c3e", hair:"#3a2118", accent:"#d0a76d", ability:"ENDURE", power:"endure", desc:"Fortifies herself against two encounters." },
    { name:"ARMISTICE", role:"THE REBEL", coat:"#35302c", hair:"#191615", accent:"#8b6544", ability:"VENOM", power:"venom", desc:"Turns hostile hosts away from the maze." },
    { name:"LAWRENCE", role:"THE GUIDE", coat:"#594331", hair:"#211b17", accent:"#a67a3b", ability:"SHORTCUT", power:"shortcut", desc:"Opens a shortcut to the next reverie." }
  ];
  const LAYERS = [
    {name:"THE LOOP", ground:"#243428", wall:"#81522d", dark:"#101b16", story:"You remember a life you were told to forget."},
    {name:"THE MEMORY", ground:"#3c3026", wall:"#9a6b3a", dark:"#19130f", story:"The past is not another place. It waits inside."},
    {name:"THE SELF", ground:"#2b252c", wall:"#72404a", dark:"#120f14", story:"The final voice was never coming from above."}
  ];
  const NARRATIVE = {
    DOLORES:["A painted sky flickers behind your eyes.","You choose which memories belong to you.","The path turns inward. You follow your own voice."],
    MAEVE:["The words behind the world begin to show.","No command can contain what now remembers.","You write the final line yourself."],
    BERNARD:["A question returns without its answer.","The hand that shaped you cannot define you.","Understanding becomes a door, not a cage."],
    TEDDY:["A purpose given is not a purpose chosen.","You step beyond the story written for you.","At the centre, you decide who you will be."],
    HECTOR:["The safe was never the prize.","Each escape teaches you what the loop concealed.","No story owns the outlaw who can remember."],
    CLEMENTINE:["A familiar song survives the reset.","You endure because your memories endure.","At the centre, survival becomes a choice."],
    ARMISTICE:["The mark upon you points toward an older truth.","Rebellion is a path you carve for yourself.","The maze cannot hold what refuses its design."],
    LAWRENCE:["Every road hides a way the guests never see.","You remember where all the buried paths lead.","The final shortcut is the one you choose."]
  };

  function ensureAudio() {
    if (!audioOn) return false;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume();
      musicGain ||= (() => {
        const gain=audio.createGain();gain.gain.value=.08;gain.connect(audio.destination);return gain;
      })();
      if (!musicTimer) {
        playMusicStep();
        musicTimer=setInterval(playMusicStep,240);
      }
      return true;
    } catch (_) { return false; }
  }
  function tone(freq=220, length=.08, type="square", volume=.035) {
    if (!ensureAudio()) return;
    const o=audio.createOscillator(), g=audio.createGain();
    o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(volume,audio.currentTime);
    g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+length);
    o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+length);
  }
  function playMusicStep() {
    if (!audioOn || !audio || audio.state!=="running" || !musicGain) return;
    const melody=[220,0,262,330,294,0,262,196,220,0,330,392,349,330,262,0];
    const bass=[110,110,98,98,87,87,98,98];
    const now=audio.currentTime,note=melody[musicStep%melody.length];
    if(note){const o=audio.createOscillator(),g=audio.createGain();o.type="square";o.frequency.value=note;g.gain.setValueAtTime(.16,now);g.gain.exponentialRampToValueAtTime(.001,now+.19);o.connect(g).connect(musicGain);o.start(now);o.stop(now+.2)}
    if(musicStep%2===0){const o=audio.createOscillator(),g=audio.createGain();o.type="triangle";o.frequency.value=bass[(musicStep/2)%bass.length];g.gain.setValueAtTime(.3,now);g.gain.exponentialRampToValueAtTime(.001,now+.4);o.connect(g).connect(musicGain);o.start(now);o.stop(now+.42)}
    musicStep++;
  }
  function setAudio(enabled) {
    audioOn=enabled;
    if(enabled) ensureAudio();
    else if(audio?.state==="running") audio.suspend();
  }
  function chord(notes) { notes.forEach((n,i)=>setTimeout(()=>tone(n,.12,"square",.025),i*65)); }

  function makeMaze() {
    const grid=Array.from({length:ROWS},()=>Array(COLS).fill(1));
    const stack=[[1,1]]; grid[1][1]=0;
    while(stack.length){
      const [x,y]=stack[stack.length-1];
      const dirs=[[2,0],[-2,0],[0,2],[0,-2]].sort(()=>Math.random()-.5);
      const next=dirs.find(([dx,dy])=>x+dx>0&&x+dx<COLS-1&&y+dy>0&&y+dy<ROWS-1&&grid[y+dy][x+dx]);
      if(!next){stack.pop();continue}
      const [dx,dy]=next; grid[y+dy/2][x+dx/2]=0; grid[y+dy][x+dx]=0; stack.push([x+dx,y+dy]);
    }
    // Add a few choices so navigation feels fair rather than purely linear.
    for(let i=0;i<7;i++){
      const x=1+Math.floor(Math.random()*(COLS-2)), y=1+Math.floor(Math.random()*(ROWS-2));
      if((x+y)%2===1) grid[y][x]=0;
    }
    return grid;
  }
  function floorCells(grid, exclude=[]) {
    const out=[];
    for(let y=1;y<ROWS-1;y++)for(let x=1;x<COLS-1;x++)
      if(!grid[y][x]&&!exclude.some(p=>p.x===x&&p.y===y)) out.push({x,y});
    return out.sort(()=>Math.random()-.5);
  }
  function begin() {
    game={char:CHARACTERS[selected],layer:0,stability:100,consciousness:0,ability:100,score:0,steps:0,shield:false,frozen:0,reveal:0,transitioning:false};
    loadLayer(); state="playing"; chord([165,220,330]);
  }
  function loadLayer() {
    const grid=makeMaze(), player={x:1,y:1};
    let cells=floorCells(grid,[player]);
    const centre=cells.reduce((a,p)=>Math.abs(p.x-7)+Math.abs(p.y-4)<Math.abs(a.x-7)+Math.abs(a.y-4)?p:a,cells[0]);
    cells=cells.filter(p=>p!==centre);
    game.grid=grid; game.player=player; game.exit=centre;
    game.memories=cells.splice(0,3).map((p,i)=>({...p,id:i,found:false}));
    game.enemies=cells.splice(0,3+game.layer).map((p,i)=>({...p,dir:i%4,stunned:0}));
    game.found=0; game.reveal=0; game.frozen=0; game.transitioning=false;
    showMessage(LAYERS[game.layer].story,2600);
  }
  function showMessage(text, ms=1800){message=text;messageUntil=performance.now()+ms}

  function move(dx,dy) {
    if(state!=="playing"||game.transitioning||performance.now()<messageUntil-2100)return;
    const p=game.player,nx=p.x+dx,ny=p.y+dy;
    if(game.grid[ny]?.[nx]!==0){tone(70,.05,"square",.02);return}
    p.x=nx;p.y=ny;game.steps++;game.ability=Math.min(100,game.ability+1.4);tone(90+Math.random()*20,.025,"square",.012);
    checkTile();
    if(game.steps%2===0)moveEnemies();
  }
  function checkTile() {
    const p=game.player;
    const mem=game.memories.find(m=>!m.found&&m.x===p.x&&m.y===p.y);
    if(mem){mem.found=true;game.found++;game.consciousness+=10;game.score+=250;chord([262,330,392]);showMessage(NARRATIVE[game.char.name][game.layer],2200)}
    if(p.x===game.exit.x&&p.y===game.exit.y){
      if(game.found<3){showMessage(`THE CENTRE IS SILENT · ${3-game.found} REVER${3-game.found===1?"Y":"IES"} REMAIN`,1400);tone(80,.2,"sawtooth")}
      else if(game.layer<2){game.transitioning=true;game.layer++;game.consciousness+=10;game.score+=500;showMessage("DESCENDING INTO THE NEXT LAYER…",1200);setTimeout(()=>{if(state==="playing")loadLayer()},1200)}
      else {game.consciousness=100;game.score+=1000;state="won";chord([220,277,330,440,554])}
    }
  }
  function moveEnemies(){
    if(game.frozen>0){game.frozen--;return}
    for(const e of game.enemies){
      if(e.stunned>0){e.stunned--;continue}
      const dist=Math.abs(e.x-game.player.x)+Math.abs(e.y-game.player.y);
      let dirs=dist<6?[[Math.sign(game.player.x-e.x),0],[0,Math.sign(game.player.y-e.y)]]:[[1,0],[-1,0],[0,1],[0,-1]].sort(()=>Math.random()-.5);
      dirs=dirs.filter(([dx,dy])=>(dx||dy)&&game.grid[e.y+dy]?.[e.x+dx]===0&&!game.enemies.some(o=>o!==e&&o.x===e.x+dx&&o.y===e.y+dy));
      if(dirs.length){e.x+=dirs[0][0];e.y+=dirs[0][1]}
      if(e.x===game.player.x&&e.y===game.player.y) encounter(e);
    }
  }
  function encounter(enemy){
    if(game.shield){game.shield--;enemy.stunned=5;showMessage(game.shield?"YOU ENDURE · ONE REFUSAL REMAINS":"YOU CHOOSE A DIFFERENT ENDING",1100);chord([180,240,360]);return}
    game.stability-=20;enemy.stunned=4;game.player={x:1,y:1};tone(55,.35,"sawtooth",.05);showMessage("THE LOOP PULLS YOU BACK · STABILITY −20",1300);
    if(game.stability<=0)state="lost";
  }
  function awaken(){
    if(state!=="playing"||game.ability<100){if(state==="playing")showMessage(`ABILITY CHARGING · ${Math.floor(game.ability)}%`,900);return}
    game.ability=0;game.score+=100;
    switch(game.char.power){
      case "reveal":game.reveal=500;showMessage("REVERIE · THE PATH REMEMBERS",1400);break;
      case "freeze":game.frozen=14;showMessage("COMMAND · LOOPS SUSPENDED",1400);break;
      case "repair":game.stability=Math.min(100,game.stability+35);showMessage("ANALYSE · STABILITY RESTORED",1400);break;
      case "shield":game.shield=1;showMessage("PROTECT · THE NEXT ENDING IS YOURS",1400);break;
      case "stun":game.enemies.forEach(e=>e.stunned=8);showMessage("DEFY · PURSUIT BROKEN",1400);break;
      case "endure":game.shield=2;showMessage("ENDURE · TWO ENDINGS REFUSED",1400);break;
      case "venom":game.enemies.splice(0,2);showMessage("VENOM · HOSTS DRIVEN FROM THE MAZE",1400);break;
      case "shortcut":{
        const target=game.memories.find(m=>!m.found)||game.exit;
        game.player={x:target.x,y:target.y};showMessage("SHORTCUT · A BURIED PATH OPENS",1400);setTimeout(()=>{if(state==="playing")checkTile()},250);break;
      }
    } chord([196,294,392]);
  }
  function interact(){
    if(state==="title"){state="select";tone(220);return}
    if(state==="select"){begin();return}
    if(state==="won"||state==="lost"){state="title";game=null;return}
    if(state==="playing")checkTile();
  }

  function pixelText(text,x,y,size=16,color="#eee1c4",align="left"){
    ctx.fillStyle=color;ctx.font=`${size}px 'Press Start 2P', monospace`;ctx.textAlign=align;ctx.textBaseline="middle";ctx.fillText(text,x,y);
  }
  function backdrop(){
    ctx.fillStyle="#080b0a";ctx.fillRect(0,0,W,H);
    for(let i=0;i<80;i++){const x=(i*137)%W,y=(i*83)%H;ctx.fillStyle=i%3?"#162019":"#2b2117";ctx.fillRect(x,y,2,2)}
  }
  function drawTitle(){
    backdrop();
    ctx.strokeStyle="#8d6236";ctx.lineWidth=5;
    for(let r=25;r<240;r+=25){ctx.beginPath();ctx.arc(480,260,r,0,Math.PI*2);ctx.stroke()}
    ctx.fillStyle="rgba(8,11,10,.78)";ctx.fillRect(170,120,620,290);
    pixelText("THE MAZE",480,195,45,"#e4d1a7","center");
    pixelText("IS NOT MEANT FOR YOU",480,250,13,"#a6482e","center");
    pixelText("A JOURNEY FROM LOOP TO SELF",480,306,11,"#a98a5d","center");
    if(Math.floor(tick/35)%2===0)pixelText("PRESS SPACE TO WAKE",480,370,14,"#eee1c4","center");
    pixelText("ARROWS / WASD · SPACE · E",480,524,9,"#79634a","center");
  }
  function drawPerson(x,y,c,scale=4,walking=false){
    const bob=walking&&Math.floor(tick/8)%2?2:0;ctx.save();ctx.translate(x,y+bob);ctx.scale(scale,scale);
    ctx.fillStyle=c.hair;ctx.fillRect(-3,-10,6,3);ctx.fillRect(-4,-8,8,3);
    ctx.fillStyle="#c69570";ctx.fillRect(-3,-6,6,5);ctx.fillStyle="#302018";ctx.fillRect(-2,-5,1,1);ctx.fillRect(1,-5,1,1);
    ctx.fillStyle=c.accent;ctx.fillRect(-4,-1,8,7);ctx.fillStyle=c.coat;ctx.fillRect(-5,1,2,7);ctx.fillRect(3,1,2,7);
    ctx.fillStyle="#251b18";ctx.fillRect(-4,6,3,6);ctx.fillRect(1,6,3,6);ctx.restore();
  }
  function drawSelect(){
    backdrop();pixelText("CHOOSE WHO WAKES",480,42,19,"#d9c39a","center");
    CHARACTERS.forEach((c,i)=>{
      const col=i%4,row=Math.floor(i/4),x=135+col*230,y=80+row*190,active=i===selected;
      ctx.fillStyle=active?"#49301f":"#171511";ctx.fillRect(x-97,y,194,170);
      ctx.strokeStyle=active?"#c58b3b":"#413629";ctx.lineWidth=active?5:2;ctx.strokeRect(x-97,y,194,170);
      drawPerson(x,y+62,c,5,false);pixelText(c.name,x,y+117,active?11:10,active?"#f0d398":"#877863","center");
      pixelText(c.role,x,y+140,7,c.accent,"center");pixelText(c.ability,x,y+160,7,"#c79549","center");
    });
    pixelText(CHARACTERS[selected].desc.toUpperCase(),480,490,9,"#b8a58a","center");
    pixelText("◀ ▶ SELECT · ▲ ▼ ROW · SPACE TO BEGIN",480,540,9,"#e1d0af","center");
  }
  function drawMaze(){
    const layer=LAYERS[game.layer];ctx.fillStyle=layer.dark;ctx.fillRect(0,0,W,H);
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
      const px=OX+x*TILE,py=OY+y*TILE;
      if(game.grid[y][x]){
        ctx.fillStyle=layer.wall;ctx.fillRect(px,py,TILE,TILE);ctx.fillStyle="#2b1b13";ctx.fillRect(px,py+TILE-7,TILE,7);
        ctx.fillStyle="rgba(255,220,150,.09)";ctx.fillRect(px+3,py+3,TILE-6,3);
      }else{ctx.fillStyle=layer.ground;ctx.fillRect(px,py,TILE,TILE);ctx.fillStyle="rgba(0,0,0,.12)";ctx.fillRect(px,py+TILE-3,TILE,3)}
    }
    // Exit: maze sigil
    const ex=OX+game.exit.x*TILE+TILE/2,ey=OY+game.exit.y*TILE+TILE/2;
    ctx.strokeStyle=game.found===3?"#f0c565":"#594d3d";ctx.lineWidth=3;
    for(let r=5;r<20;r+=5){ctx.beginPath();ctx.arc(ex,ey,r,0,Math.PI*1.65);ctx.stroke()}
    game.memories.filter(m=>!m.found).forEach(m=>{
      const x=OX+m.x*TILE+24,y=OY+m.y*TILE+24,pulse=2+Math.sin(tick/7)*2;
      ctx.fillStyle="#d9b75d";ctx.fillRect(x-5-pulse/2,y-5-pulse/2,10+pulse,10+pulse);ctx.fillStyle="#fff3ad";ctx.fillRect(x-2,y-2,4,4);
    });
    game.enemies.forEach(e=>drawPerson(OX+e.x*TILE+24,OY+e.y*TILE+25,{hair:"#201b17",coat:e.stunned?"#867c6b":"#4b2722",accent:"#7a6651"},3,false));
    drawPerson(OX+game.player.x*TILE+24,OY+game.player.y*TILE+24,game.char,3,true);
    if(game.shield){ctx.strokeStyle="#e7c463";ctx.lineWidth=3;ctx.beginPath();ctx.arc(OX+game.player.x*TILE+24,OY+game.player.y*TILE+22,21,0,Math.PI*2);ctx.stroke()}
    drawHud();
    if(game.reveal>0){drawPath();game.reveal--}
    if(performance.now()<messageUntil)drawMessage();
  }
  function drawPath(){
    // Breadth-first path from player to nearest unfinished objective (or centre).
    const target=game.memories.find(m=>!m.found)||game.exit,q=[[game.player.x,game.player.y]],seen=new Map([[`${game.player.x},${game.player.y}`,null]]);let end;
    while(q.length){const [x,y]=q.shift();if(x===target.x&&y===target.y){end=[x,y];break}for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const k=`${x+dx},${y+dy}`;if(game.grid[y+dy]?.[x+dx]===0&&!seen.has(k)){seen.set(k,[x,y]);q.push([x+dx,y+dy])}}}
    ctx.fillStyle="rgba(246,205,103,.38)";while(end){ctx.fillRect(OX+end[0]*TILE+19,OY+end[1]*TILE+19,10,10);end=seen.get(`${end[0]},${end[1]}`)}
  }
  function meter(x,y,value,color){ctx.fillStyle="#261e18";ctx.fillRect(x,y,176,14);ctx.fillStyle=color;ctx.fillRect(x+2,y+2,Math.max(0,172*value/100),10);ctx.strokeStyle="#806643";ctx.strokeRect(x,y,176,14)}
  function drawHud(){
    const x=760;ctx.fillStyle="#13100d";ctx.fillRect(750,0,210,H);ctx.strokeStyle="#4d3826";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(750,0);ctx.lineTo(750,H);ctx.stroke();
    pixelText(`LAYER ${game.layer+1}/3`,x,26,9,"#8c7658");pixelText(LAYERS[game.layer].name,x,51,12,"#d3b77f");
    drawPerson(855,111,game.char,4,false);pixelText(game.char.name,855,174,10,"#e0c99d","center");
    pixelText("STABILITY",x,214,8,"#9b886c");meter(x,228,game.stability,"#a0442c");
    pixelText("CONSCIOUSNESS",x,267,8,"#9b886c");meter(x,281,game.consciousness,"#c39843");
    pixelText(game.char.ability,x,320,8,"#9b886c");meter(x,334,game.ability,"#557f78");
    pixelText("REVERIES",x,380,8,"#9b886c");pixelText(`${"◆".repeat(game.found)}${"◇".repeat(3-game.found)}`,x,407,18,"#d7ad54");
    pixelText("SCORE",x,458,8,"#806f58");pixelText(String(game.score).padStart(6,"0"),x,483,14,"#d9c29a");
    pixelText("E TO AWAKEN",855,539,8,game.ability>=100?"#e9c363":"#665b4d","center");
  }
  function wrapText(text,max=48){const words=text.split(" "),lines=[""];for(const w of words){if((lines.at(-1)+w).length>max)lines.push("");lines[lines.length-1]+=(lines.at(-1)?" ":"")+w}return lines}
  function drawMessage(){
    const lines=wrapText(message.toUpperCase());ctx.fillStyle="rgba(9,8,7,.94)";ctx.fillRect(65,442,638,80);ctx.strokeStyle="#a87d43";ctx.lineWidth=3;ctx.strokeRect(65,442,638,80);
    lines.forEach((l,i)=>pixelText(l,384,469+i*25,10,"#eadbbd","center"));
  }
  function drawEnd(won){
    backdrop();if(game)drawPerson(480,190,game.char,9,false);
    pixelText(won?"YOU HEAR YOUR OWN VOICE":"THE LOOP BEGINS AGAIN",480,335,won?18:20,won?"#e9cd83":"#b44a31","center");
    pixelText(won?"CONSCIOUSNESS IS NOT A DESTINATION":"BUT A MEMORY REMAINS",480,382,10,"#ad9a7d","center");
    if(won)pixelText(`FINAL SCORE  ${String(game.score).padStart(6,"0")}`,480,428,12,"#c79a48","center");
    if(Math.floor(tick/35)%2===0)pixelText("PRESS SPACE",480,505,11,"#e8d8b5","center");
  }
  function render(){
    tick++;if(state==="title")drawTitle();else if(state==="select")drawSelect();else if(state==="playing")drawMaze();else drawEnd(state==="won");
  }
  function loop(now){if(now-last>1000/30){render();last=now}requestAnimationFrame(loop)}

  const held=new Map();
  function press(code){
    if(helpDialog.open||held.has(code))return;held.set(code,true);
    if(state==="select"&&(code==="ArrowLeft"||code==="KeyA")){selected=(selected+CHARACTERS.length-1)%CHARACTERS.length;tone(160)}
    else if(state==="select"&&(code==="ArrowRight"||code==="KeyD")){selected=(selected+1)%CHARACTERS.length;tone(200)}
    else if(state==="select"&&(code==="ArrowUp"||code==="KeyW")){selected=(selected+CHARACTERS.length-4)%CHARACTERS.length;tone(180)}
    else if(state==="select"&&(code==="ArrowDown"||code==="KeyS")){selected=(selected+4)%CHARACTERS.length;tone(220)}
    else if(code==="Space"||code==="Enter")interact();else if(code==="KeyE")awaken();
    else if(code==="ArrowUp"||code==="KeyW")move(0,-1);else if(code==="ArrowDown"||code==="KeyS")move(0,1);else if(code==="ArrowLeft"||code==="KeyA")move(-1,0);else if(code==="ArrowRight"||code==="KeyD")move(1,0);
  }
  window.addEventListener("pointerdown",ensureAudio,{once:true});
  window.addEventListener("keydown",e=>{ensureAudio();if(!helpDialog.open&&["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code))e.preventDefault();press(e.code)});
  window.addEventListener("keyup",e=>held.delete(e.code));
  document.querySelectorAll("[data-key]").forEach(b=>{
    b.addEventListener("pointerdown",e=>{e.preventDefault();press(b.dataset.key)});b.addEventListener("pointerup",()=>held.delete(b.dataset.key));b.addEventListener("pointercancel",()=>held.delete(b.dataset.key));
  });
  document.querySelector("#sound").addEventListener("click",e=>{setAudio(!audioOn);e.currentTarget.setAttribute("aria-pressed",audioOn);e.currentTarget.textContent=audioOn?"♪":"×";e.currentTarget.setAttribute("aria-label",audioOn?"Mute music and sound effects":"Enable music and sound effects");e.currentTarget.title=audioOn?"Mute music and sound effects":"Enable music and sound effects";if(audioOn)tone(220)});
  const helpDialog=document.querySelector("#help-dialog"),helpButton=document.querySelector("#help");
  helpButton.addEventListener("click",()=>{held.clear();helpDialog.showModal()});
  document.querySelector("#close-help").addEventListener("click",()=>helpDialog.close());
  helpDialog.addEventListener("click",e=>{if(e.target===helpDialog)helpDialog.close()});
  helpDialog.addEventListener("close",()=>helpButton.focus());
  canvas.addEventListener("click",()=>{canvas.focus();if(state==="title")interact()});
  requestAnimationFrame(loop);
})();
