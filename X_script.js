let db=null, auth=null, ensureAuth=null;
let ref=null,set=null,get=null,update=null,onValue=null,remove=null,onDisconnect=null;
let firebaseLoaded=false;
async function loadFirebase(){
  if(firebaseLoaded) return;
  const appMod=await import("./firebase-init.js");
  const dbMod=await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js");
  db=appMod.db; auth=appMod.auth; ensureAuth=appMod.ensureAuth;
  ({ref,set,get,update,onValue,remove,onDisconnect}=dbMod);
  firebaseLoaded=true;
}

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const P={wK:"♔",wQ:"♕",wR:"♖",wB:"♗",wN:"♘",wP:"♙",bK:"♚",bQ:"♛",bR:"♜",bB:"♝",bN:"♞",bP:"♟"};
let mode="ai",level=2,board=[],turn="w",selected=null,moves=[],history=[],orientation="w",locked=false;
let room=null,myUid=null,myColor=null,roomUnsub=null,hostId=null,players={};
let castle={wK:true,wQ:true,bK:true,bQ:true}, ep=null, half=0, sound=true;

function initial(){return ["bR","bN","bB","bQ","bK","bB","bN","bR",...Array(8).fill("bP"),...Array(32).fill(null),...Array(8).fill("wP"),"wR","wN","wB","wQ","wK","wB","wN","wR"]}
function show(id){$$(".screen").forEach(x=>x.classList.remove("active"));$("#"+id).classList.add("active")}
function toast(t){let e=$("#toast");e.textContent=t;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),1800)}
function tone(freq=350,d=.08){if(!sound)return;try{let a=new AudioContext(),o=a.createOscillator(),g=a.createGain();o.frequency.value=freq;g.gain.value=.05;o.connect(g);g.connect(a.destination);o.start();g.gain.exponentialRampToValueAtTime(.001,a.currentTime+d);o.stop(a.currentTime+d)}catch{}}
function rc(i){return [Math.floor(i/8),i%8]} function idx(r,c){return r*8+c} function inside(r,c){return r>=0&&r<8&&c>=0&&c<8}
function color(p){return p?.[0]} function type(p){return p?.[1]}

function pseudo(b,i,attacks=false){
 let p=b[i]; if(!p)return[]; let [r,c]=rc(i),co=color(p),t=type(p),out=[],dir=co==="w"?-1:1;
 const add=(rr,cc)=>{if(!inside(rr,cc))return false;let q=b[idx(rr,cc)];if(!q){out.push(idx(rr,cc));return true}if(color(q)!==co)out.push(idx(rr,cc));return false}
 if(t==="P"){let rr=r+dir;if(attacks){for(let dc of[-1,1])if(inside(rr,c+dc))out.push(idx(rr,c+dc));return out}
   if(inside(rr,c)&&!b[idx(rr,c)]){out.push(idx(rr,c));let sr=co==="w"?6:1;if(r===sr&&!b[idx(r+2*dir,c)])out.push(idx(r+2*dir,c))}
   for(let dc of[-1,1])if(inside(rr,c+dc)){let j=idx(rr,c+dc);if((b[j]&&color(b[j])!==co)||j===ep)out.push(j)}
 } else if(t==="N"){for(let [dr,dc] of [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]])add(r+dr,c+dc)}
 else if(t==="K"){for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)if(dr||dc)add(r+dr,c+dc);
   if(!attacks&&!inCheck(b,co)){let base=co==="w"?60:4;if(i===base){
    if(castle[co+"K"]&&!b[base+1]&&!b[base+2]&&!attacked(b,base+1,co)&&!attacked(b,base+2,co)&&b[base+3]===co+"R")out.push(base+2);
    if(castle[co+"Q"]&&!b[base-1]&&!b[base-2]&&!b[base-3]&&!attacked(b,base-1,co)&&!attacked(b,base-2,co)&&b[base-4]===co+"R")out.push(base-2);
   }}}
 else {let dirs=t==="B"?[[1,1],[1,-1],[-1,1],[-1,-1]]:t==="R"?[[1,0],[-1,0],[0,1],[0,-1]]:[[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
   for(let[d1,d2]of dirs){let rr=r+d1,cc=c+d2;while(inside(rr,cc)){if(!add(rr,cc))break;rr+=d1;cc+=d2}}
 } return out
}
function attacked(b,sq,def){for(let i=0;i<64;i++)if(b[i]&&color(b[i])!==def&&pseudo(b,i,true).includes(sq))return true;return false}
function inCheck(b,co){let k=b.indexOf(co+"K");return k>=0&&attacked(b,k,co)}
function sim(b,a,z){let n=b.slice(),p=n[a];n[z]=p;n[a]=null;return n}
function legalFor(b,i){let co=color(b[i]);return pseudo(b,i).filter(z=>!inCheck(simSpecial(b,i,z),co))}
function simSpecial(b,a,z){let n=sim(b,a,z),p=b[a];if(type(p)==="P"&&z===ep&&!b[z])n[z+(color(p)==="w"?8:-8)]=null;if(type(p)==="K"&&Math.abs(z-a)===2){let rookFrom=z>a?a+3:a-4,rookTo=z>a?a+1:a-1;n[rookTo]=n[rookFrom];n[rookFrom]=null}return n}
function allLegal(b,co){let a=[];for(let i=0;i<64;i++)if(color(b[i])===co)for(let z of legalFor(b,i))a.push([i,z]);return a}

function render(){
 $("#board").innerHTML="";let order=[...Array(64).keys()];if(orientation==="b")order.reverse();
 for(let i of order){let [r,c]=rc(i),s=document.createElement("div");s.className="square "+((r+c)%2?"dark":"light");s.dataset.i=i;
  if(i===selected)s.classList.add("selected");if(moves.includes(i))s.classList.add(board[i]?"capture":"move");
  if(board[i]){let q=document.createElement("span");q.className="piece "+(color(board[i])==="w"?"whitePiece":"blackPiece");q.textContent=P[board[i]];s.append(q)}
  s.onclick=()=>clickSquare(i);$("#board").append(s)}
 let who=turn==="w"?"Blancs":"Noirs",check=inCheck(board,turn)?" — Échec !":"";$("#status").textContent=`${who} jouent${check}`;
 $("#history").textContent=history.map((x,i)=>`${i+1}. ${x}`).join("  ");
 let whiteName=players.white?.name||"Blancs",blackName=players.black?.name||(mode==="ai"?"IA":"Noirs");
 $("#bottomPlayer").textContent=orientation==="w"?whiteName:blackName;$("#topPlayer").textContent=orientation==="w"?blackName:whiteName;
 $("#undoBtn").style.display=mode==="online"?"none":"block";
}
function clickSquare(i){
 if(locked)return;if(mode==="online"&&myColor!==turn)return;if(mode==="ai"&&turn==="b")return;
 if(selected!==null&&moves.includes(i)){makeMove(selected,i,true);return}
 if(color(board[i])===turn){selected=i;moves=legalFor(board,i);render()}else{selected=null;moves=[];render()}
}
function notation(a,z,p,capture){let files="abcdefgh",[r,c]=rc(z);return (type(p)==="P"?"":type(p))+(capture?"x":"")+files[c]+(8-r)}
async function makeMove(a,z,publish=false){
 let p=board[a],capt=board[z],oldEp=ep; let n=simSpecial(board,a,z); let isCapture=!!capt||(type(p)==="P"&&z===oldEp&&!board[z]);
 if(type(p)==="K"){castle[color(p)+"K"]=castle[color(p)+"Q"]=false}
 if(type(p)==="R"){if(a===63)castle.wK=false;if(a===56)castle.wQ=false;if(a===7)castle.bK=false;if(a===0)castle.bQ=false}
 ep=null;if(type(p)==="P"&&Math.abs(z-a)===16)ep=(a+z)/2;
 let [zr]=rc(z);if(type(p)==="P"&&(zr===0||zr===7))n[z]=color(p)+"Q";
 board=n;history.push(notation(a,z,p,isCapture));turn=turn==="w"?"b":"w";selected=null;moves=[];tone(isCapture?180:420,.1);render();
 let result=endState();if(result){finish(result);if(mode==="online"&&publish)await syncState(result);return}
 if(mode==="online"&&publish)await syncState(null);
 if(mode==="ai"&&turn==="b"){locked=true;setTimeout(aiMove,450)}
}
function endState(){let legal=allLegal(board,turn);if(legal.length)return null;if(inCheck(board,turn))return turn==="w"?"Noirs gagnent par échec et mat":"Blancs gagnent par échec et mat";return"Partie nulle — pat"}
function finish(t){locked=true;$("#winnerText").textContent=t;$("#winner").classList.remove("hidden");if(!t.includes("nulle"))confetti()}
function newGame(){board=initial();turn="w";selected=null;moves=[];history=[];castle={wK:true,wQ:true,bK:true,bQ:true};ep=null;locked=false;$("#winner").classList.add("hidden");render();show("game")}

function score(b){let v={P:100,N:320,B:330,R:500,Q:900,K:20000},s=0;for(let p of b)if(p)s+=(color(p)==="b"?1:-1)*v[type(p)];return s}
function aiMove(){let ms=allLegal(board,"b");if(!ms.length)return;let choice;
 if(level==1)choice=ms[Math.floor(Math.random()*ms.length)];
 else{let ranked=ms.map(m=>[m,score(simSpecial(board,...m))+Math.random()*25]).sort((a,b)=>b[1]-a[1]);choice=ranked[0][0];
  if(level>=3){let best=-1e9;for(let m of ms){let b1=simSpecial(board,...m),worst=1e9;for(let wm of allLegal(b1,"w"))worst=Math.min(worst,score(simSpecial(b1,...wm)));if(worst>best){best=worst;choice=m}}}
 }
 locked=false;makeMove(...choice,false)
}

$$("[data-mode]").forEach(b=>b.onclick=()=>{mode=b.dataset.mode;if(mode==="online")show("online");else{$("#setupTitle").textContent=mode==="ai"?"Contre l’IA":"2 joueurs local";$("#aiSetup").style.display=mode==="ai"?"block":"none";show("setup")}});
$$(".back").forEach(b=>b.onclick=()=>show("home"));
$("#startBtn").onclick=()=>{level=+$("#level").value;players={white:{name:$("#playerName").value||"Joueur 1"},black:{name:mode==="ai"?"IA":"Joueur 2"}};orientation="w";newGame()};
$("#flipBtn").onclick=()=>{orientation=orientation==="w"?"b":"w";render()};
$("#undoBtn").onclick=()=>toast("Annulation disponible avant le prochain coup dans une prochaine partie.");
$("#resignBtn").onclick=()=>finish(turn==="w"?"Blancs abandonnent — Noirs gagnent":"Noirs abandonnent — Blancs gagnent");
$("#gameHome").onclick=$("#winnerHome").onclick=()=>{if(confirm("Quitter la partie ?")){leaveRoom();show("home")}};
$("#rematch").onclick=async()=>{if(mode==="online"){if(myUid!==hostId)return toast("L’hôte lance la revanche.");newGame();await syncState(null)}else newGame()};
$("#menuBtn").onclick=()=>$("#drawer").classList.add("open");$("#closeMenu").onclick=()=>$("#drawer").classList.remove("open");
$("#soundBtn").onclick=()=>{sound=!sound;$("#soundBtn").textContent=sound?"🔊":"🔇"};
$("#rulesBtn").onclick=()=>modal(`<h2>Règles des échecs</h2><p>Les Blancs commencent. Chaque pièce se déplace selon ses règles classiques. Le but est de mettre le roi adverse en échec et mat.</p><h3>Règles spéciales</h3><p><b>Roque :</b> roi et tour n’ayant pas bougé, cases libres et non attaquées. <b>Prise en passant :</b> autorisée immédiatement après l’avance initiale de deux cases d’un pion. <b>Promotion :</b> un pion atteignant la dernière rangée est promu en dame. <b>Pat :</b> partie nulle si le joueur n’a aucun coup légal sans être en échec.</p>`);
$("#settingsBtn").onclick=()=>modal(`<h2>Paramètres</h2><p>Son : ${sound?"activé":"désactivé"}</p><p>L’échiquier peut être retourné avec ↻ pendant une partie.</p>`);
function modal(x){$("#modalContent").innerHTML=x;$("#modal").classList.remove("hidden");$("#drawer").classList.remove("open")}$("#closeModal").onclick=()=>$("#modal").classList.add("hidden");

function code(){return Math.random().toString(36).slice(2,8).toUpperCase()}
$("#createBtn").onclick=async()=>{try{await loadFirebase();let u=await ensureAuth();myUid=u.uid;room=code();hostId=myUid;myColor="w";let name=$("#onlineName").value||"Joueur";
 await set(ref(db,"chessRooms/"+room),{hostId,phase:"lobby",createdAt:Date.now(),players:{[myUid]:{name,color:"w",connected:true}}});await onDisconnect(ref(db,`chessRooms/${room}/players/${myUid}/connected`)).set(false);listenRoom();show("lobby")}catch(e){$("#onlineMsg").textContent="Connexion Firebase impossible : "+e.message}}
$("#joinBtn").onclick=async()=>{try{await loadFirebase();let u=await ensureAuth();myUid=u.uid;room=$("#roomInput").value.trim().toUpperCase();let snap=await get(ref(db,"chessRooms/"+room));if(!snap.exists())return toast("Salon introuvable");let d=snap.val(),ps=d.players||{};if(Object.keys(ps).length>=2&&!ps[myUid])return toast("Salon complet");hostId=d.hostId;myColor=myUid===hostId?"w":"b";let name=$("#onlineName").value||"Joueur";
 await update(ref(db,`chessRooms/${room}/players/${myUid}`),{name,color:myColor,connected:true});await onDisconnect(ref(db,`chessRooms/${room}/players/${myUid}/connected`)).set(false);listenRoom();show("lobby")}catch(e){toast(e.message)}}
function listenRoom(){if(roomUnsub)roomUnsub();roomUnsub=onValue(ref(db,"chessRooms/"+room),s=>{if(!s.exists()){toast("Salon fermé");show("home");return}let d=s.val();hostId=d.hostId;$("#roomCode").textContent=room;let ps=d.players||{},arr=Object.entries(ps);$("#players").innerHTML=arr.map(([u,p])=>`<p>${p.color==="w"?"♔":"♚"} ${p.name} ${p.connected===false?"(déconnecté)":""}</p>`).join("");$("#launchOnline").disabled=!(myUid===hostId&&arr.length>=2);$("#lobbyMsg").textContent=arr.length>=2?"Les deux joueurs sont prêts.":"En attente d’un adversaire…";
 players={};for(let[u,p]of arr)players[p.color==="w"?"white":"black"]=p;
 if(d.phase==="playing"&&d.game){applyRemote(d.game);if(!$("#game").classList.contains("active"))show("game")}
 if(d.result&&$("#winner").classList.contains("hidden"))finish(d.result)
 })}

$("#launchOnline").onclick=async()=>{
 if(myUid!==hostId)return;
 board=initial();turn="w";selected=null;moves=[];history=[];
 castle={wK:true,wQ:true,bK:true,bQ:true};ep=null;locked=false;
 orientation=myColor||"w";
 $("#winner").classList.add("hidden");
 render();
 try{
   await update(ref(db,"chessRooms/"+room),{
     phase:"playing",
     game:stateObj(),
     result:""
   });
   show("game");
 }catch(e){toast("Impossible de lancer : "+e.message)}
};
function stateObj(){
 return{
  board:board.map(x=>x||"--"),
  turn,
  history:history||[],
  castle:{...castle},
  ep:ep===null?-1:ep,
  version:Date.now()
 }
}
async function syncState(result){
 if(!room)return;
 await update(ref(db,"chessRooms/"+room),{
  game:stateObj(),
  result:result||""
 });
}
function applyRemote(g){if(!g||!g.board)return;board=g.board.map(x=>x==="--"?null:x);turn=g.turn;history=g.history||[];castle=g.castle||castle;ep=g.ep===-1?null:g.ep;orientation=myColor;locked=false;selected=null;moves=[];render();let e=endState();if(e)finish(e)}
async function leaveRoom(){if(room&&myUid){try{if(myUid===hostId)await remove(ref(db,"chessRooms/"+room));else await remove(ref(db,`chessRooms/${room}/players/${myUid}`))}catch{} }room=null;if(roomUnsub){roomUnsub();roomUnsub=null}}
$("#leaveLobby").onclick=async()=>{await leaveRoom();show("home")};
$("#shareBtn").onclick=async()=>{let url=location.href.split("?")[0]+"?room="+room;try{if(navigator.share)await navigator.share({title:"Partie d’échecs",text:`Rejoins mon salon ${room}`,url});else{await navigator.clipboard.writeText(url);toast("Lien copié")}}catch{}};

function confetti(){let c=$("#confetti"),x=c.getContext("2d");c.width=innerWidth;c.height=innerHeight;let a=Array.from({length:90},()=>({x:Math.random()*c.width,y:-20-Math.random()*c.height/2,v:2+Math.random()*5,s:3+Math.random()*6,r:Math.random()*6.28})),n=0;function f(){x.clearRect(0,0,c.width,c.height);for(let p of a){p.y+=p.v;p.x+=Math.sin(p.y/25);x.save();x.translate(p.x,p.y);x.rotate(p.r+p.y/50);x.fillStyle=`hsl(${(p.x+p.y)%360} 70% 55%)`;x.fillRect(-p.s,-p.s,p.s*2,p.s);x.restore()}if(n++<180)requestAnimationFrame(f);else x.clearRect(0,0,c.width,c.height)}f()}
let qp=new URLSearchParams(location.search).get("room");if(qp){$("#roomInput").value=qp.toUpperCase();show("online")}
board=initial();render();
