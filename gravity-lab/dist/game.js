import * as THREE from './vendor/three.module.js';

const $ = id => document.getElementById(id);
const canvas = $('game');
const touch = matchMedia('(pointer: coarse)').matches;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const V = (x=0,y=0,z=0) => new THREE.Vector3(x,y,z);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101c26);
scene.fog = new THREE.FogExp2(0x142531,.016);
const camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, .06, 130);
let renderer;
try {
  renderer = new THREE.WebGLRenderer({canvas,antialias:true, powerPreference:'high-performance'});
} catch(error) {
  $('start').textContent='3D-графика недоступна';
  $('menu-copy').textContent='Для игры нужен браузер с WebGL. Попробуйте открыть её в Chrome или Edge с включённым аппаратным ускорением.';
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio,touch?1.5:1.8));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=!touch;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.18;
scene.add(new THREE.HemisphereLight(0xc6e6ff,0x4a5f62,2.0));
const sun=new THREE.DirectionalLight(0xd0efff,2.8);
sun.position.set(-4,10,8); sun.castShadow=!touch;
sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-19;sun.shadow.camera.right=19;
sun.shadow.camera.top=20;sun.shadow.camera.bottom=-20;sun.shadow.normalBias=.035;
scene.add(sun);
const materials={
  floor:new THREE.MeshStandardMaterial({color:0x354950,roughness:.66,metalness:.3}),
  wall:new THREE.MeshStandardMaterial({color:0x829897,roughness:.76,metalness:.18}),
  dark:new THREE.MeshStandardMaterial({color:0x182c37,roughness:.49,metalness:.6}),
  white:new THREE.MeshStandardMaterial({color:0xb6c3bc,roughness:.5,metalness:.23}),
  cyan:new THREE.MeshStandardMaterial({color:0x67dfc6,emissive:0x54dcbb,emissiveIntensity:2.3,roughness:.3}),
  orange:new THREE.MeshStandardMaterial({color:0xffb86a,emissive:0xde7733,emissiveIntensity:.55,metalness:.45,roughness:.28}),
};
const solids=[],rayTargets=[],moving=[],cells=[];
function box(w,h,d,x,y,z,material,solid=false){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
  mesh.position.set(x,y,z);mesh.receiveShadow=true;mesh.castShadow=solid;scene.add(mesh);
  if(solid){solids.push({min:V(x-w/2,y-h/2,z-d/2),max:V(x+w/2,y+h/2,z+d/2)});rayTargets.push(mesh);}
  return mesh;
}
// All playable geometry lives in world space; gravity changes the reference frame.
const surfaces=[
  box(24,1,28,0,-.5,0,materials.floor,true),
  box(24,1,28,0,12.5,0,materials.dark,true),
  box(1,12,28,-12.5,6,0,materials.wall,true),
  box(1,12,28,12.5,6,0,materials.wall,true),
  box(24,12,1,0,6,-14.5,materials.wall,true),
  box(24,12,1,0,6,14.5,materials.dark,true)
];
surfaces.forEach(m=>m.userData.gravity=true);
// Panel seams, structural ribs and recessed light strips establish the room scale.
for(let x=-12;x<=12;x+=3){
  box(.025,.014,28,x,.008,0,materials.dark);
  box(.028,.015,28,x,11.988,0,materials.floor);
}
for(let z=-14;z<=14;z+=3.5){
  box(24,.015,.025,0,.009,z,materials.dark);
  box(24,.015,.035,0,11.987,z,materials.floor);
  for(const x of [-11.965,11.965]) box(.045,12,.045,x,6,z,materials.dark);
}
for(let y=3;y<12;y+=3){
  box(.045,.035,28,-11.96,y,0,materials.dark);box(.045,.035,28,11.96,y,0,materials.dark);
  box(24,.035,.045,0,y,-13.96,materials.dark);
}
for(const x of [-11.85,11.85]){
  box(.085,.04,27,x,.028,0,materials.cyan);
  box(.08,.035,27,x,11.97,0,materials.cyan);
}
for(const z of [-13.85,13.85]) box(23.6,.025,.075,0,.028,z,materials.cyan);
for(const z of [-10.5,0,10.5]){
  box(23.8,.17,.24,0,11.8,z,materials.dark);
  for(const x of [-7,7]) box(5,.06,.16,x,11.69,z,materials.cyan);
}
function textPanel(text,x,y,z,w,h,normal,color='#b4cfca',bg='#223c48'){
  const c=document.createElement('canvas');c.width=1024;c.height=512;
  const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,1024,512);
  ctx.fillStyle=color;ctx.font='bold 260px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,264);
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture}));
  mesh.position.set(x,y,z);mesh.quaternion.setFromUnitVectors(V(0,0,1),normal);scene.add(mesh);return mesh;
}
const tutorialSceneStart=scene.children.length;
textPanel('01',11.91,7,-5,7,3.5,V(-1,0,0));
textPanel('02',-5,11.91,-6,5,2.5,V(0,-1,0));
textPanel('03',6,8,-13.91,6,3,V(0,0,1));
textPanel('GRAVITY / LAB',0,8,13.9,12,6,V(0,0,-1),'#647f89','#152b37');
// Central instrument block and smaller benches create parallax and real occlusion.
box(4.4,3.4,3.4,0,1.7,-1.5,materials.dark,true);
box(4.7,.24,3.7,0,3.5,-1.5,materials.white,true);
box(4.75,.065,3.75,0,3.67,-1.5,materials.cyan);
for(const x of [-1.9,1.9]) box(.08,3,.08,x,1.65,.22,materials.cyan);
textPanel('G / 01',0,1.8,.215,3.5,1.75,V(0,0,1));
box(2.8,.8,1.3,-8,.4,6,materials.dark,true);
box(3,.13,1.5,-8,.86,6,materials.white,true);
box(2.8,.035,.055,-8,.95,6.6,materials.cyan);
// The suspended reactor is scenery, clear of every objective route.
const reactor=new THREE.Group();reactor.position.set(0,6.2,-1.5);scene.add(reactor);
const core=new THREE.Mesh(new THREE.IcosahedronGeometry(.7,1),materials.cyan);reactor.add(core);
const rings=[];
for(let i=0;i<3;i++){
  const r=new THREE.Mesh(new THREE.TorusGeometry(1.15+i*.18,.028,8,64),i===1?materials.cyan:materials.white);
  r.rotation.set(i*.9,.4+i*.7,i*.5);reactor.add(r);rings.push(r);
}
const glow=new THREE.PointLight(0x79ffd6,28,15,2);glow.position.copy(reactor.position);scene.add(glow);
const tutorialObjects=scene.children.slice(tutorialSceneStart);
const tutorialSolids=solids.slice(6),tutorialTargets=rayTargets.slice(6);
const cellDefs=[{p:V(11.2,5,-5),n:V(-1,0,0)},{p:V(-5,11.2,-6),n:V(0,-1,0)},{p:V(6,7,-13.2),n:V(0,0,1)}];
cellDefs.forEach((def,i)=>{
  const g=new THREE.Group();g.position.copy(def.p);g.quaternion.setFromUnitVectors(V(0,1,0),def.n);scene.add(g);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.7,.045,10,48),materials.white);ring.rotation.x=Math.PI/2;ring.position.y=-.45;g.add(ring);
  const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.39),materials.cyan);g.add(gem);
  const pillar=new THREE.Mesh(new THREE.CylinderGeometry(.54,.65,.12,24),materials.dark);pillar.position.y=-.66;g.add(pillar);
  const light=new THREE.PointLight(0x78ffd4,8,5,2);g.add(light);
  cells.push({group:g,gem,ring,position:def.p.clone(),collected:false,active:true,id:i});
});
// Exit frame is on the far wall, accessible in the original floor orientation.
const exitPos=V(0,1.5,-12.7);
box(.28,3.5,.38,-1.35,1.75,-13.65,materials.dark);
box(.28,3.5,.38,1.35,1.75,-13.65,materials.dark);
box(3,.28,.38,0,3.55,-13.65,materials.dark);
const gateMaterial=new THREE.MeshStandardMaterial({color:0x223d49,emissive:0x18343b,emissiveIntensity:.35,transparent:true,opacity:.9,metalness:.4,roughness:.35});
const gate=box(2.5,3.35,.1,0,1.68,-13.72,gateMaterial);
const exitStrips=[];
for(const x of [-1.2,1.2]) exitStrips.push(box(.045,3.1,.08,x,1.7,-13.43,materials.orange.clone()));
textPanel('EXIT',0,4.2,-13.9,3.3,1.3,V(0,0,1));
const exitLight=new THREE.PointLight(0x72ffcf,0,6,2);exitLight.position.set(0,2,-12.5);scene.add(exitLight);
// Free cubes obey the same six-direction gravity as the player.
for(const p of [V(-5,1,2),V(7,1,5)]){
  const g=new THREE.Group();g.position.copy(p);scene.add(g);
  const body=new THREE.Mesh(new THREE.BoxGeometry(.85,.85,.85),materials.orange);body.castShadow=true;g.add(body);
  const lines=new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry),new THREE.LineBasicMaterial({color:0xffe1af}));lines.scale.setScalar(1.015);g.add(lines);
  moving.push({group:g,p:p.clone(),start:p.clone(),v:V(),radius:.43,grounded:false});
}
const particlesGeom=new THREE.BufferGeometry();const dots=[];
let seed=714;
function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
for(let i=0;i<100;i++)dots.push((random()-.5)*23,.5+random()*11,(random()-.5)*27);
particlesGeom.setAttribute('position',new THREE.Float32BufferAttribute(dots,3));
scene.add(new THREE.Points(particlesGeom,new THREE.PointsMaterial({color:0x9cd4d4,size:.027,transparent:true,opacity:.38})));

const player={p:V(0,.56,10),v:V(),radius:.55,grounded:false};
const gravity=V(0,-1,0),up=V(0,1,0);
const frame=new THREE.Quaternion(),targetFrame=new THREE.Quaternion();
const look=new THREE.Quaternion(),worldLook=new THREE.Quaternion();
const keys=new Set();const raycaster=new THREE.Raycaster();
let yaw=0,pitch=0,mode='menu',elapsed=0,shifts=0,count=0,lastShift=-1,toastUntil=0,started=false;
let soundOn=false,audioCtx=null,stick={x:0,y:0},lastTarget=null;
let accumulator=0,lastTime=performance.now(),targetTick=0,gravityName='ПОЛ',fallbackLook=false;
let level=0,receivers=[],hazards=[],chamberObjects=[],fieldCage=null,exitPowered=false,hintStep=0,recoveries=0,recoveryCooldown=0;
let simulationTime=0,commsUntil=0,chapterIntroduced=false,endingScene=null,endingClock=0,endingPlanet=null;
const completed=new Set();
const chambers=[
  {name:'Перспектива',caption:'СМЕНА СИСТЕМЫ ОТСЧЁТА',mission:'Соберите три энергоячейки на стенах и потолке. Вернитесь к выходу.',hints:['Светящиеся ромбы — энергоячейки. К ним нужно подойти.','Наведитесь на правую стену и измените гравитацию. Идите к ячейке 01.','Следующие ячейки — на потолке и дальней стене. После сбора верните гравитацию на пол.']},
  {name:'Масса',caption:'ВЕС ИМЕЕТ ЗНАЧЕНИЕ',mission:'Доставьте куб по магнитной направляющей на платформу A. Заберите открывшуюся ячейку на потолке.',hints:['Куб скользит только вдоль своей направляющей. На него действует та же гравитация, что и на вас.','Платформа A находится на правом конце пути. Сделайте правую стену полом.','Подождите фиксации куба. Затем перейдите на потолок: защита ячейки в дальней левой части камеры снята.']},
  {name:'Цепная реакция',caption:'ДВА КОНТУРА / ОДИН ВЫХОД',mission:'Активируйте платформу A, затем B. Обойдите лазерные поля, заберите ячейку и вернитесь к выходу.',hints:['Красные поля опасны, но не доходят до потолка. Переходите над ними.','Сначала направьте гравитацию к дальней стене: куб A попадёт на платформу и освободит куб B.','После A направьте гравитацию вправо. Когда куб B зафиксируется, заберите ячейку на потолке спереди справа.']}
];
chambers.push(
  {name:'Импульс',caption:'НЕ СПЕШИТЕ / СЧИТАЙТЕ',mission:'Пройдите два импульсных шлюза в зелёные интервалы. Соберите два модуля синхронизации.',hints:['Импульсные лазеры перекрывают всю высоту камеры. Стены здесь не спасут — дождитесь отключения.','Таймер слева показывает состояние каждого шлюза. Зелёный означает безопасный проход.','Первый модуль — между шлюзами, второй — за дальним. Собранные модули сохраняются при возврате.']},
  {name:'Сжатие',caption:'МАШИНА НЕ ЖДЁТ',mission:'Пересеките два пресса через центральные проходы. Заберите модули охлаждения между ними и за ними.',hints:['Прессы сходятся с двух сторон. Безопасный путь проходит посередине камеры, когда створки расходятся.','Остановитесь перед оранжевой линией, дождитесь широкого прохода и идите прямо.','Не стойте в створе пресса. Заберите модули между механизмами и за вторым прессом.']},
  {name:'Сканирование',caption:'ПОЛ ПОД НАПРЯЖЕНИЕМ',mission:'Обойдите электрический пол и подвижные лучи. Соберите модули на обеих боковых стенах.',hints:['Задняя часть пола под напряжением. Используйте стены или потолок.','Луч сканирует вверх и вниз. Пересекайте его плоскость, когда он на другой высоте.','Один модуль — на правой стене, второй — на левой. Пол перед выходом безопасен.']},
  {name:'Последний вектор',caption:'ВОССТАНОВИТЬ / ЭВАКУИРОВАТЬСЯ',mission:'Замкните контуры A и B. Пройдите импульсный шлюз и пресс, затем заберите ядро ЛИРЫ на потолке.',hints:['Передняя грань пилона тоже принимает гравитацию. Она удержит вас перед шлюзом, пока куб A движется к дальней стене.','После A направьте гравитацию вправо для B. По потолку обойдите пилон сбоку; перед шлюзом и прессом ждите безопасного окна.','Ядро находится за прессом, на потолке справа. Его извлечение отключит ловушки и откроет эвакуационный шлюз.']}
);
const story=[
 'ЛИРА: Если вы меня слышите — не снимайте гравипривод. После аварии на «Векторе» он ваш единственный путь к эвакуации.',
 'ЛИРА: Это не учебный полигон. Лаборатория питала станцию. Верните массу в контур — и я смогу открыть технический отсек.',
 'ЛИРА: Экипаж уже в спасательных капсулах. Их пусковые замки без питания. Первый контур освободит второй.',
 'ЛИРА: Защитные шлюзы зациклились. Я вижу интервалы отключения. Следите за таймером — я проведу вас между импульсами.',
 'ЛИРА: Охлаждение отказало. Прессы продолжают аварийный цикл. Заберите модули — без них реактор не остановить.',
 'ЛИРА: Пусковые замки открыты. Осталось вернуть навигацию. Мой сигнал слабеет, но ваш аварийный якорь ещё работает.',
 'ЛИРА: Последний отсек. Заберите моё ядро и выходите. Я рассчитала траекторию для всех капсул. В том числе для вашей.'
];
const storyAfter=[
 'ЛИРА: Резервное питание восстановлено. Идём дальше — к массовому контуру.',
 'ЛИРА: Технический отсек открыт. Каждая активированная платформа приближает запуск капсул.',
 'ЛИРА: Капсулы получили питание. Теперь нужно синхронизировать шлюзы.',
 'ЛИРА: Синхронизация есть. Вы слышите? Капсулы экипажа готовятся к старту.',
 'ЛИРА: Реактор больше не перегревается. Ещё два отсека — и мы уйдём отсюда.',
 'ЛИРА: Экипаж в пути. Я осталась в главном ядре. Не задерживайтесь из-за меня… хотя я была бы рада увидеть рассвет.'
];
try{const saved=JSON.parse(localStorage.getItem('gravity-lab-campaign-v2')||'{}');if(Number.isInteger(saved.level)&&saved.level>=0&&saved.level<chambers.length)level=saved.level;for(const n of saved.completed||[])if(Number.isInteger(n)&&n>=0&&n<chambers.length)completed.add(n);}catch{}
document.body.classList.add('menu-open');
$('start').disabled=false;$('start').innerHTML='Начать эксперимент <span>↗</span>';
$('touch-controls').hidden=!touch;
if(touch)$('menu-note').textContent='Стик слева — движение · Свайп справа — обзор';

function beep(freq=440,duration=.13,type='sine',volume=.065){
  if(!soundOn)return;
  try{
    audioCtx??=new(window.AudioContext||window.webkitAudioContext)();audioCtx.resume();
    const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq*.7,audioCtx.currentTime+duration);
    gain.gain.setValueAtTime(volume,audioCtx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);
    osc.connect(gain).connect(audioCtx.destination);osc.start();osc.stop(audioCtx.currentTime+duration);
  }catch{}
}
function toast(text){$('toast').textContent=text;$('toast').style.opacity='1';toastUntil=performance.now()+3200;}
function radio(text){$('comms-text').textContent=text;$('comms').style.opacity='1';commsUntil=performance.now()+10500;}
function nameFor(g){if(g.y<-.5)return 'ПОЛ';if(g.y>.5)return 'ПОТОЛОК';if(g.x>.5)return 'ПРАВАЯ СТЕНА';if(g.x<-.5)return 'ЛЕВАЯ СТЕНА';if(g.z<-.5)return 'ДАЛЬНЯЯ СТЕНА';return 'ВХОДНАЯ СТЕНА';}
function saveProgress(){try{localStorage.setItem('gravity-lab-campaign-v2',JSON.stringify({level,completed:[...completed]}));}catch{}}
function allReceivers(){return receivers.every(r=>r.latched);}
function activeCells(){return cells.filter(c=>c.active);}
function resetPlayer(){
  player.p.set(0,.56,10);player.v.set(0,0,0);player.grounded=false;gravity.set(0,-1,0);up.set(0,1,0);frame.identity();targetFrame.identity();yaw=0;pitch=0;keys.clear();stick.x=stick.y=0;$('joystick').firstElementChild.style.transform='';
}
function disposeChamber(){
  const shared=new Set(Object.values(materials));
  for(const o of chamberObjects){scene.remove(o);o.traverse(n=>{n.geometry?.dispose();const ms=Array.isArray(n.material)?n.material:[n.material];for(const m of ms)if(m&&!shared.has(m)){m.map?.dispose();m.dispose();}});}
  chamberObjects=[];receivers=[];hazards=[];fieldCage=null;
}
function addRail(cube,axis,start,end,fixed,label,dependsOn=null){
  const length=Math.abs(end-start),middle=(start+end)/2;
  const pos=V(...fixed);pos[axis]=middle;
  box(axis==='x'?length+1.6:1.5,.22,axis==='z'?length+1.6:1.5,pos.x,pos.y-.65,pos.z,materials.dark);
  for(const side of [-.55,.55]){
    box(axis==='x'?length+1.2:.05,.07,axis==='z'?length+1.2:.05,pos.x+(axis==='z'?side:0),pos.y-.48,pos.z+(axis==='x'?side:0),materials.orange);
  }
  const target=V(...fixed);target[axis]=end;
  const plateMat=materials.orange.clone();plateMat.emissiveIntensity=.7;
  const plate=box(1.4,.08,1.4,target.x,target.y-.46,target.z,plateMat);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.76,.045,8,40),plateMat);ring.rotation.x=Math.PI/2;ring.position.copy(target).add(V(0,-.39,0));scene.add(ring);
  textPanel(label,target.x,target.y+1.3,target.z+.05,1.3,.65,V(0,0,1),'#ffd298','#293f46');
  const light=new THREE.PointLight(0xffae66,5,4,2);light.position.copy(target).add(V(0,1,0));scene.add(light);
  cube.start.set(...fixed);cube.start[axis]=start;cube.p.copy(cube.start);cube.group.position.copy(cube.p);cube.v.set(0,0,0);cube.group.visible=true;
  const receiver={label,target,latched:false,charge:0,material:plateMat,light,dependsOn,cube};
  cube.track={axis,start,end,receiver};receivers.push(receiver);
  for(const endpoint of [start,end]){const p=V(...fixed);p[axis]=endpoint;box(axis==='x'?.1:1.6,.5,axis==='z'?.1:1.6,p.x,p.y-.38,p.z,materials.white);}
}
function addField(z,height,disabledByPower=false){
  const group=new THREE.Group();group.position.z=z;scene.add(group);
  const mat=new THREE.MeshBasicMaterial({color:0xff694f,transparent:true,opacity:.075,side:THREE.DoubleSide,depthWrite:false});
  const panel=new THREE.Mesh(new THREE.PlaneGeometry(23.6,height),mat);panel.position.y=height/2;group.add(panel);
  const lineMat=new THREE.MeshBasicMaterial({color:0xff7156});
  for(let y=.3;y<height;y+=.65){const beam=new THREE.Mesh(new THREE.BoxGeometry(23.5,.045,.055),lineMat);beam.position.y=y;group.add(beam);}
  for(const x of [-11.8,11.8]){const post=new THREE.Mesh(new THREE.BoxGeometry(.15,height,.25),materials.dark);post.position.set(x,height/2,0);group.add(post);}
  hazards.push({kind:'field',label:'ЛАЗЕРНОЕ ПОЛЕ',group,z,height,disabledByPower,mat,active:true});
}
function addPulse(z,offset,label){
  addField(z,12);const h=hazards.at(-1);Object.assign(h,{kind:'pulse',period:7,on:3.4,offset,label,remaining:0});
  for(const x of [-11.75,11.75])box(.16,12,.26,x,6,z,materials.orange);
  box(23.5,.07,.12,0,.04,z,materials.orange);
}
function addPress(z,offset,label){
  const group=new THREE.Group();scene.add(group);
  const plates=[];
  for(const side of [-1,1]){
    const plate=new THREE.Mesh(new THREE.BoxGeometry(1,12,1.6),materials.dark);plate.position.z=z;plate.position.y=6;plate.castShadow=true;plate.receiveShadow=true;group.add(plate);rayTargets.push(plate);
    const edge=new THREE.Mesh(new THREE.BoxGeometry(.12,11.7,1.68),materials.orange);edge.position.set(0,6,z);group.add(edge);plates.push({plate,edge,side});
  }
  for(const dz of [-1.05,1.05])box(24,.045,.12,0,.03,z+dz,materials.orange);
  hazards.push({kind:'press',label,group,z,offset,period:8,plates,gap:0,active:true});
}
function addSweep(z,offset,label){
  const group=new THREE.Group();group.position.z=z;scene.add(group);
  const beam=new THREE.Mesh(new THREE.BoxGeometry(23.7,.12,.12),new THREE.MeshBasicMaterial({color:0xff725c}));group.add(beam);
  const aura=new THREE.Mesh(new THREE.BoxGeometry(23.7,.4,.2),new THREE.MeshBasicMaterial({color:0xff755b,transparent:true,opacity:.15,depthWrite:false}));group.add(aura);
  for(const x of [-11.8,11.8])box(.14,12,.2,x,6,z,materials.dark);
  hazards.push({kind:'sweep',label,group,z,offset,period:6,y:6,active:true});
}
function addElectricFloor(){
  const group=new THREE.Group();scene.add(group);
  const m=new THREE.MeshBasicMaterial({color:0xff7054,transparent:true,opacity:.19,depthWrite:false});
  const panel=new THREE.Mesh(new THREE.BoxGeometry(23.8,.03,11),m);panel.position.set(0,.027,-4.5);group.add(panel);
  const wire=new THREE.MeshBasicMaterial({color:0xff9069});
  for(let x=-11;x<=11;x+=1.5){const line=new THREE.Mesh(new THREE.BoxGeometry(.035,.035,11),wire);line.position.set(x,.06,-4.5);group.add(line);}
  hazards.push({kind:'floor',label:'ПОЛ ПОД НАПРЯЖЕНИЕМ',group,minZ:-10,maxZ:1,active:true});
}
function setCellLayout(defs){
  cells.forEach((c,i)=>{c.active=i<defs.length;c.group.visible=c.active;if(c.active){c.position.set(...defs[i].p);c.group.position.copy(c.position);c.group.quaternion.setFromUnitVectors(V(0,1,0),V(...defs[i].n));}});
}
function buildNewChamber(){
  textPanel(`0${level+1}`,11.9,8,-9,7,3.5,V(-1,0,0));
  if(level===3){
    setCellLayout([{p:[-5,.9,0],n:[0,1,0]},{p:[5,.9,-9],n:[0,1,0]}]);
    addPulse(4,0,'ШЛЮЗ 1');addPulse(-3,2.5,'ШЛЮЗ 2');
    textPanel('SYNC',0,7,-13.9,7,3.5,V(0,0,1));
  }else if(level===4){
    setCellLayout([{p:[0,.9,-.5],n:[0,1,0]},{p:[0,.9,-10],n:[0,1,0]}]);
    addPress(3,0,'ПРЕСС 1');addPress(-5,2.4,'ПРЕСС 2');
    textPanel('COOLANT',0,8,-13.9,9,4.5,V(0,0,1));
  }else if(level===5){
    setCellLayout([{p:[11.2,8,-8],n:[-1,0,0]},{p:[-11.2,4,-8],n:[1,0,0]}]);
    addSweep(3,0,'СКАНЕР 1');addSweep(-3,2.4,'СКАНЕР 2');addElectricFloor();
    textPanel('NAV',0,8,-13.9,7,3.5,V(0,0,1));
  }else{
    setCellLayout([{p:[8,11.2,-9],n:[0,-1,0]}]);
    const anchor=box(5,12,1,0,6,7,materials.dark,true);anchor.userData.gravity=true;
    for(const x of [-2.4,2.4])box(.045,11.8,.04,x,6,7.52,materials.cyan);
    textPanel('ANCHOR',0,6,7.53,4,2,V(0,0,1));
    addRail(moving[0],'z',8,-8,[-7,.92,0],'A');addRail(moving[1],'x',-8,8,[0,7.1,-8],'B',receivers[0]);
    addPulse(3,0,'АВАРИЙНЫЙ ШЛЮЗ');addPress(-4,1.5,'ЗАЩИТА ЯДРА');
    textPanel('LYRA',0,7,-13.9,8,4,V(0,0,1),'#a5ffde','#173344');
    for(const x of [-1.8,1.8])box(.08,5,.08,x,2.5,-13.6,materials.cyan);
  }
  if(fieldCage){fieldCage.position.copy(cells[0].position);fieldCage.visible=receivers.length>0;}
}
function updateHazards(dt){
  simulationTime+=dt;
  for(const h of hazards){
    const disabled=(h.disabledByPower&&allReceivers())||(level===6&&exitPowered);
    h.active=!disabled;
    if(h.kind==='pulse'){
      const phase=(simulationTime+h.offset)%h.period;
      h.active=!disabled&&phase<h.on;h.remaining=disabled?0:(h.active?h.on-phase:h.period-phase);
    }else if(h.kind==='press'){
      const wave=(Math.sin((simulationTime+h.offset)/h.period*Math.PI*2)+1)/2;
      h.gap=disabled?23:Math.max(.08,9*wave);
      const width=12-h.gap/2;
      for(const p of h.plates){p.plate.scale.x=width;p.plate.position.x=p.side*(12-width/2);p.edge.position.x=p.side*h.gap/2;}
    }else if(h.kind==='sweep'){
      h.y=1+10*(Math.sin((simulationTime+h.offset)/h.period*Math.PI*2)+1)/2;h.group.position.y=h.y;
    }
    h.group.visible=h.kind==='press'||h.active;
  }
}
function hazardHit(h){
  if(!h.active)return false;
  if(h.kind==='floor')return player.p.y<.9&&player.p.z>h.minZ-.3&&player.p.z<h.maxZ+.3;
  if(h.kind==='press')return Math.abs(player.p.z-h.z)<1.25&&Math.abs(player.p.x)+player.radius>h.gap/2;
  if(h.kind==='sweep')return Math.abs(player.p.z-h.z)<.65&&Math.abs(player.p.y-h.y)<.68;
  return Math.abs(player.p.z-h.z)<.6&&player.p.y<h.height+.4;
}
function updateHazardHud(){
  $('hazard-status').innerHTML=hazards.filter(h=>h.kind!=='field').map(h=>{
    const safe=!h.active||(h.kind==='press'&&h.gap>2.5);
    const detail=h.kind==='pulse'?(h.active?'ОПАСНО':'ПРОХОД')+` · ${h.remaining.toFixed(1)} c`:h.kind==='press'?(safe?'ПРОХОД ОТКРЫТ':'СТВОРКИ СХОДЯТСЯ'):h.kind==='sweep'?`ЛУЧ НА ВЫСОТЕ ${h.y.toFixed(1)} м`:'ИСПОЛЬЗУЙТЕ СТЕНЫ';
    return `<span class="${safe?'safe':''}">${h.label} · ${detail}</span>`;
  }).join('');
}
function loadLevel(index){
  if(!Number.isInteger(index)||index<0||index>=chambers.length)return;
  disposeChamber();level=index;solids.splice(6);rayTargets.splice(6);
  document.body.classList.remove('ending-view','final-screen');$('ending-caption').hidden=true;$('comms').style.opacity='0';
  tutorialObjects.forEach(o=>o.visible=level===0);
  if(level===0){solids.push(...tutorialSolids);rayTargets.push(...tutorialTargets);}
  resetPlayer();count=0;elapsed=0;shifts=0;recoveries=0;recoveryCooldown=0;lastShift=-1;accumulator=0;exitPowered=false;hintStep=0;
  simulationTime=0;chapterIntroduced=false;endingClock=0;
  for(const c of cells){c.active=level===0||c.id===0;c.collected=false;c.group.visible=c.active;const d=cellDefs[c.id];c.position.copy(d.p);c.group.position.copy(d.p);c.group.quaternion.setFromUnitVectors(V(0,1,0),d.n);}
  for(const [i,c]of moving.entries()){c.track=null;c.start.copy(i===0?V(-5,1,2):V(7,1,5));c.p.copy(c.start);c.v.set(0,0,0);c.group.position.copy(c.p);c.group.visible=level===0;}
  const before=new Set(scene.children);
  if(level>0){
    const cell=cells[0];cell.position.copy(level===1?V(-6,11.2,-8):V(8,11.2,5));cell.group.position.copy(cell.position);cell.group.quaternion.setFromUnitVectors(V(0,1,0),V(0,-1,0));
    const cageMaterial=new THREE.MeshBasicMaterial({color:0xffaa65,wireframe:true,transparent:true,opacity:.45});
    fieldCage=new THREE.Mesh(new THREE.IcosahedronGeometry(.92,1),cageMaterial);fieldCage.position.copy(cell.position);scene.add(fieldCage);
    textPanel(level===1?'M / 02':level===2?'C / 03':`V / 0${level+1}`,-11.9,7,-5,8,4,V(1,0,0));
    textPanel('GRAVITY / LAB',0,8,13.9,12,6,V(0,0,-1),'#647f89','#152b37');
    if(level===1){
      addRail(moving[0],'x',-8,8,[0,.92,-4],'A');
      box(5,3,1.5,0,1.5,4,materials.dark,true);box(5.1,.14,1.6,0,3.07,4,materials.white);
      addField(0,3.4,true);
      textPanel('A  →',0,3,-4.8,6,3,V(0,0,1),'#edbf85','#203641');
    }else if(level===2){
      addRail(moving[0],'z',8,-8,[-7,.92,0],'A');
      addRail(moving[1],'x',-8,8,[0,7.1,-8],'B',receivers[0]);
      for(const x of [-9,9])box(.35,6.2,.35,x,3.1,-8,materials.dark,true);
      box(18,.18,1.5,0,6.45,-8,materials.dark);
      textPanel('A → B',0,4.6,-13.9,7,3.5,V(0,0,1),'#edbf85','#203641');
      addField(1.5,4.3);addField(-5,6.8);
      box(5,2.3,2,-1,1.15,-9.8,materials.dark,true);
      box(5.1,.12,2.1,-1,2.35,-9.8,materials.white);
    }else buildNewChamber();
  }
  chamberObjects=scene.children.filter(o=>!before.has(o));
  gate.visible=true;gateMaterial.opacity=.9;exitLight.intensity=0;exitStrips.forEach(s=>{s.material.color.set(0xffb86a);s.material.emissive.set(0xde7733);});
  const labels=[...receivers.map(r=>r.label),...activeCells().map((c,i)=>level===6?'ЯДРО':receivers.length?'КЛЮЧ':String(i+1).padStart(2,'0'))];
  $('cells').innerHTML=labels.map((label,i)=>`<span data-cell="${i}">${label}</span>`).join('')+`<span class="cell-label">${level===0?'ЭНЕРГОЯЧЕЙКИ':'КОНТУР ПИТАНИЯ'}</span>`;
  $('chamber-label').textContent=`КАМЕРА 0${level+1} / 0${chambers.length}`;$('scene-number').textContent=`G / 0${level+1}`;$('scene-caption').textContent=chambers[level].caption;
  document.querySelector('#objective .eyebrow').textContent=`ПРОТОКОЛ «${chambers[level].name.toUpperCase()}»`;
  document.querySelector('.mission p').textContent=chambers[level].mission;
  document.querySelector('.mission>span').textContent='ЗАДАЧА';$('menu-eyebrow').textContent='ПОСЛЕДНИЙ ВЕКТОР / СЕМЬ ГЛАВ';
  $('menu-copy').textContent=story[level];
  document.querySelectorAll('[data-level]').forEach((b,i)=>{b.setAttribute('aria-pressed',String(level===i));b.classList.toggle('done',completed.has(i));});
  $('menu-progress').textContent=`${completed.size} / ${chambers.length} ГЛАВ ПРОЙДЕНО`;
  saveProgress();updateHazards(0);updateHazardHud();updateHud();
}
function powerExit(){
  if(exitPowered)return;exitPowered=true;exitLight.intensity=12;
  exitStrips.forEach(s=>{s.material.color.set(0x8af2d2);s.material.emissive.set(0x54dcbb);});
  toast(level===6?'Ядро извлечено. Защита отключена. К эвакуационному шлюзу!':'Питание восстановлено. Выход открыт.');
  if(level===6)radio('ЛИРА: Я здесь. Совсем маленькая, но здесь. Капсула ждёт вас у выхода.');
  beep(880,.35);updateHazards(0);updateHud();
}
function showHint(){if(mode==='playing'||mode==='paused'){toast(chambers[level].hints[Math.min(hintStep++,chambers[level].hints.length-1)]);toastUntil=performance.now()+10000;}}
function updateHud(){
  gravityName=nameFor(gravity);$('gravity-name').textContent=gravityName;
  $('gravity-arrow').textContent=gravity.y<0?'↓':gravity.y>0?'↑':gravity.x>0?'→':gravity.x<0?'←':gravity.z<0?'↗':'↙';
  const checks=[...receivers.map(r=>r.latched),...activeCells().map(c=>c.collected)];
  document.querySelectorAll('[data-cell]').forEach((el,i)=>el.classList.toggle('collected',!!checks[i]));
  if(exitPowered){$('objective-title').textContent=level===6?'Доберитесь до капсулы':'Вернитесь к выходу';$('objective-text').textContent='Дверь открыта. Верните гравитацию на исходный пол и войдите в EXIT.';return;}
  if(level===0){
    $('objective-title').textContent=count===0?'Найдите новый пол':`Энергоячейки: ${count} / 3`;
    $('objective-text').textContent=touch?'Наведите взгляд на стену и нажмите «Гравитация». Приблизьтесь к ячейкам.':'Наведитесь на стену или потолок и нажмите ЛКМ. Приблизьтесь к светящимся ячейкам.';
  }else if(level===1||level===2||level===6){
    const next=receivers.find(r=>!r.latched);
    $('objective-title').textContent=next?`Доставьте куб на платформу ${next.label}`:'Заберите энергоячейку';
    $('objective-text').textContent=next?(level===1?'Наклоните мир: куб скользит по магнитной направляющей. Платформа зафиксирует его.':next.label==='A'?'Контур A освобождает куб B. Доставьте первый куб к дальней стене.':'Куб B освобождён. Измените направление гравитации, чтобы замкнуть второй контур.'):level===6?'Ядро ЛИРЫ — на потолке за прессом. Следите за безопасными интервалами.':'Защита снята. Светящаяся ячейка ждёт на потолке.';
  }else{
    $('objective-title').textContent=`Модули: ${count} / ${activeCells().length}`;$('objective-text').textContent=chambers[level].mission;
  }
}
function restart(){
  loadLevel(level);
}
function start(){
  if(mode==='between')loadLevel(level+1);else if(mode==='won')loadLevel(0);
  started=true;mode='playing';$('overlay').hidden=true;document.body.classList.remove('menu-open');keys.clear();
  if(!chapterIntroduced){chapterIntroduced=true;radio(story[level]);}
  if(!touch){
    try{const p=canvas.requestPointerLock();if(p?.catch)p.catch(()=>{fallbackLook=true;toast('Для обзора удерживайте правую кнопку мыши.');});}
    catch{fallbackLook=true;}
  }
  beep(350,.2);
}
function pause(){
  if(mode!=='playing')return;mode='paused';keys.clear();stick.x=stick.y=0;
  $('overlay').hidden=false;document.body.classList.add('menu-open');
  $('menu-title').innerHTML='ПАУЗА<span>.</span>';$('menu-copy').innerHTML='Комната подождёт.<br>Продолжите с того же места.';
  $('start').innerHTML='Продолжить <span>↗</span>';
  if(document.pointerLockElement)document.exitPointerLock();
}
function win(){
  completed.add(level);saveProgress();keys.clear();
  if(level===chambers.length-1){beginEnding();return;}
  mode='between';$('overlay').hidden=false;document.body.classList.add('menu-open');
  if(document.pointerLockElement)document.exitPointerLock();
  $('menu-title').innerHTML='ОТСЕК<br><span>ПРОЙДЕН.</span>';
  $('menu-copy').textContent=storyAfter[level];
  document.querySelector('.mission p').textContent=`Дальше — «${chambers[level+1].name}». ${chambers[level+1].mission}`;
  $('start').innerHTML='Следующая глава <span>↗</span>';
  $('menu-progress').textContent=`${completed.size} / ${chambers.length} ГЛАВ ПРОЙДЕНО`;document.querySelector(`[data-level="${level}"]`).classList.add('done');beep(880,.5);
}
function beginEnding(){
  mode='ending';endingClock=0;$('overlay').hidden=true;document.body.classList.remove('menu-open');document.body.classList.add('ending-view');$('ending-caption').hidden=false;$('toast').style.opacity='0';
  if(document.pointerLockElement)document.exitPointerLock();
  if(!endingScene){
    endingScene=new THREE.Scene();endingScene.background=new THREE.Color(0x030b1b);
    endingScene.add(new THREE.AmbientLight(0x8bbedb,1.6));
    const dawn=new THREE.DirectionalLight(0xffd4a3,4.5);dawn.position.set(20,8,-16);endingScene.add(dawn);
    endingPlanet=new THREE.Mesh(new THREE.SphereGeometry(17,64,48),new THREE.MeshStandardMaterial({color:0x29789b,roughness:.78,metalness:.08}));endingPlanet.position.set(8,-12,-38);endingPlanet.rotation.z=.25;endingScene.add(endingPlanet);
    const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(17.3,64,48),new THREE.MeshBasicMaterial({color:0x61ddeb,transparent:true,opacity:.14,side:THREE.BackSide,blending:THREE.AdditiveBlending}));atmosphere.position.copy(endingPlanet.position);endingScene.add(atmosphere);
    const starData=[];for(let i=0;i<450;i++)starData.push((random()-.5)*190,(random()-.5)*110,-50-random()*55);
    const skyGeometry=new THREE.BufferGeometry();skyGeometry.setAttribute('position',new THREE.Float32BufferAttribute(starData,3));endingScene.add(new THREE.Points(skyGeometry,new THREE.PointsMaterial({color:0xd5e8ff,size:.1})));
    const sunDisc=new THREE.Mesh(new THREE.SphereGeometry(3,24,24),new THREE.MeshBasicMaterial({color:0xffdfb7}));sunDisc.position.set(23,9,-65);endingScene.add(sunDisc);
    function hull(w,h,d,x,y,z,mat){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);endingScene.add(m);return m;}
    hull(18,.8,22,0,-3.4,0,materials.dark);hull(.5,12,20,-8,2,0,materials.dark);hull(.5,12,20,8,2,0,materials.dark);
    for(const x of [-6.8,6.8]){hull(.2,10,.3,x,1,-8,materials.white);hull(.065,.05,17,x,-2.94,0,materials.cyan);}
    hull(14,.22,.3,0,6,-8,materials.white);hull(14,.22,.3,0,-2.8,-8,materials.white);
    for(let i=0;i<5;i++){const capsule=new THREE.Mesh(new THREE.CapsuleGeometry(.15,.6,4,8),materials.white);capsule.rotation.x=Math.PI/2;capsule.position.set(-5+i*2,1.5+i*.5,-18-i*4);endingScene.add(capsule);}
  }
  beep(350,1.5,'sine',.045);
}
function finishEnding(){
  if(mode!=='ending')return;mode='won';$('ending-caption').hidden=true;$('overlay').hidden=false;document.body.classList.add('menu-open','final-screen');
  $('menu-eyebrow').textContent='ПОСЛЕДНИЙ ВЕКТОР / КОНЕЦ';$('menu-title').innerHTML='КУРС<br><span>ДОМОЙ.</span>';
  $('menu-copy').textContent='Капсулы экипажа ушли с аварийной станции. Реактор остановлен. Ядро ЛИРЫ подключено к вашей капсуле.';
  document.querySelector('.mission>span').textContent='ЛИРА';document.querySelector('.mission p').textContent='«Рассвет оказался красивее расчётов. Спасибо, что не оставили меня там». Курс на Землю установлен.';
  $('start').innerHTML='Пройти историю заново <span>↗</span>';$('menu-progress').textContent=`${completed.size} / ${chambers.length} ГЛАВ ПРОЙДЕНО`;
  $('scene-number').textContent='HOME';$('scene-caption').textContent='ВСЕ КАПСУЛЫ НА СВЯЗИ';
}
function getTarget(){
  raycaster.setFromCamera(new THREE.Vector2(0,0),camera);
  const hits=raycaster.intersectObjects(rayTargets,false);
  if(!hits.length||!hits[0].object.userData.gravity)return null;
  const h=hits[0],n=h.face.normal.clone().transformDirection(h.object.matrixWorld);
  return {normal:n,point:h.point,valid:n.dot(up)<.95};
}
function shift(){
  if(mode!=='playing'||elapsed-lastShift<.45)return;
  const target=getTarget();
  if(!target){toast('Наведитесь на стену, пол или потолок.');return;}
  if(!target.valid){toast('Эта поверхность уже служит полом.');return;}
  const next=target.normal.clone();
  const rotate=new THREE.Quaternion().setFromUnitVectors(up,next);
  targetFrame.premultiply(rotate);up.copy(next);gravity.copy(next).negate();
  player.v.multiplyScalar(.25);player.grounded=false;shifts++;lastShift=elapsed;
  if(reducedMotion)frame.copy(targetFrame);
  $('flash').style.opacity='.10';setTimeout(()=>$('flash').style.opacity='0',90);
  beep(130,.3,'sine',.09);updateHud();
}
// Sphere/AABB contact supports every gravity axis and avoids frame-dependent tunnelling.
function collide(body,dt,bounce=0){
  body.v.addScaledVector(gravity,17*dt);body.v.clampLength(0,22);body.p.addScaledVector(body.v,dt);body.grounded=false;
  for(let pass=0;pass<3;pass++)for(const b of solids){
    const closest=body.p.clone().clamp(b.min,b.max),delta=body.p.clone().sub(closest),d2=delta.lengthSq();
    if(d2>=body.radius*body.radius)continue;
    let distance=Math.sqrt(d2),normal;
    if(distance>1e-7)normal=delta.divideScalar(distance);
    else {
      const ds=[body.p.x-b.min.x,b.max.x-body.p.x,body.p.y-b.min.y,b.max.y-body.p.y,body.p.z-b.min.z,b.max.z-body.p.z];
      const nearest=Math.min(...ds),axis=ds.indexOf(nearest);normal=[V(-1,0,0),V(1,0,0),V(0,-1,0),V(0,1,0),V(0,0,-1),V(0,0,1)][axis];distance=-nearest;
    }
    body.p.addScaledVector(normal,body.radius-distance+.00001);
    const speed=body.v.dot(normal);if(speed<0)body.v.addScaledVector(normal,-(1+bounce)*speed);
    if(normal.dot(up)>.6)body.grounded=true;
  }
}
const forward=V(),right=V();
function simulate(dt){
  updateHazards(dt);
  recoveryCooldown=Math.max(0,recoveryCooldown-dt);
  look.setFromEuler(new THREE.Euler(pitch,yaw,0,'YXZ'));worldLook.copy(targetFrame).multiply(look);
  forward.set(0,0,-1).applyQuaternion(worldLook).projectOnPlane(up);
  if(forward.lengthSq()<.001)forward.set(0,0,-1).applyQuaternion(targetFrame).projectOnPlane(up);
  forward.normalize();right.crossVectors(forward,up).normalize();
  const x=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+stick.x;
  const y=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-stick.y;
  const intent=forward.clone().multiplyScalar(y).addScaledVector(right,x);if(intent.lengthSq()>1)intent.normalize();
  const speed=keys.has('ShiftLeft')?7:4.8;
  const vertical=up.clone().multiplyScalar(player.v.dot(up));
  const tangent=player.v.clone().sub(vertical).lerp(intent.multiplyScalar(speed),1-Math.exp(-(player.grounded?13:4)*dt));
  player.v.copy(tangent.add(vertical));
  collide(player,dt);
  for(const c of moving){
    if(!c.group.visible)continue;
    if(c.track){
      const track=c.track,r=track.receiver,a=track.axis;
      if(!r.latched&&(!r.dependsOn||r.dependsOn.latched)){
        c.v[a]=THREE.MathUtils.clamp((c.v[a]+gravity[a]*9*dt)*Math.exp(-.35*dt),-7,7);
        const lo=Math.min(track.start,track.end),hi=Math.max(track.start,track.end);
        c.p[a]=THREE.MathUtils.clamp(c.p[a]+c.v[a]*dt,lo,hi);
        if(c.p[a]===lo||c.p[a]===hi)c.v[a]=0;
        if(Math.abs(c.p[a]-track.end)<.18)r.charge+=dt;else r.charge=0;
        r.material.emissiveIntensity=.7+r.charge*2;
        if(r.charge>=.65){
          r.latched=true;c.p.copy(r.target);c.v.set(0,0,0);r.material.color.set(0x8af2d2);r.material.emissive.set(0x54dcbb);r.light.color.set(0x8af2d2);
          beep(480+receivers.indexOf(r)*220,.3);toast(allReceivers()?'Контур замкнут. Защита энергоячейки снята.':`Платформа ${r.label} активирована. Куб B освобождён.`);updateHud();
        }
      }
    }else{
      collide(c,dt,.08);if(c.grounded){const normalVelocity=up.clone().multiplyScalar(c.v.dot(up));c.v.sub(normalVelocity).multiplyScalar(Math.exp(-4*dt)).add(normalVelocity);}
    }
    c.group.position.copy(c.p);
  }
  if(fieldCage)fieldCage.visible=!allReceivers();
  for(const h of hazards){
    if(recoveryCooldown===0&&hazardHit(h)){
      recoveries++;resetPlayer();recoveryCooldown=1.5;lastShift=-1;
      $('flash').style.background='#ff755d';$('flash').style.opacity='.19';setTimeout(()=>{$('flash').style.opacity='0';$('flash').style.background='';},160);
      toast(`${h.label}: аварийный якорь вернул вас ко входу. Модули и решённые механизмы сохранены.`);beep(90,.4,'triangle');updateHud();return;
    }
  }
  for(const c of cells)if(c.active&&!c.collected&&allReceivers()&&player.p.distanceTo(c.position)<1.2){
    c.collected=true;c.group.visible=false;count++;beep(460+count*170,.26,'sine',.08);updateHud();toast(`Энергоячейка ${count} / ${activeCells().length} получена`);
  }
  if(count===activeCells().length&&allReceivers())powerExit();
  if(exitPowered&&gravity.y<-.9&&Math.abs(player.p.x)<1.2&&player.p.z<-12.1&&player.p.y<2.2)win();
  if(!Number.isFinite(player.p.lengthSq())||player.p.length()>90){restart();toast('Позиция восстановлена.');}
}
function jump(){if(mode==='playing'&&player.grounded){player.v.addScaledVector(up,6.2);player.grounded=false;beep(180,.07,'sine',.025);}}
function formatTime(t){return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;}
$('start').addEventListener('click',start);$('pause').addEventListener('click',pause);
$('hint').addEventListener('click',showHint);
$('skip-ending').addEventListener('click',finishEnding);
document.querySelectorAll('[data-level]').forEach(button=>button.addEventListener('click',()=>{
  loadLevel(Number(button.dataset.level));mode='menu';started=false;
  $('menu-title').innerHTML='GRAVITY<br><span>LAB.</span>';$('menu-copy').textContent=story[level];
  $('start').innerHTML=`Войти в камеру 0${level+1} <span>↗</span>`;
}));
$('sound').addEventListener('click',()=>{soundOn=!soundOn;$('sound').textContent=`Звук: ${soundOn?'вкл.':'выкл.'}`;$('sound').setAttribute('aria-label',soundOn?'Выключить звук':'Включить звук');beep(520);});
document.addEventListener('keydown',e=>{
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  if(mode==='ending'&&(e.code==='Space'||e.code==='Escape')){finishEnding();return;}
  if(e.code==='Escape'){pause();return;}if(mode!=='playing')return;
  keys.add(e.code);if(e.code==='Space'&&!e.repeat)jump();if(e.code==='KeyE'&&!e.repeat)shift();
  if(e.code==='KeyR'&&!e.repeat){restart();toast('Эксперимент начат заново.');}
  if(e.code==='KeyH'&&!e.repeat)showHint();
});
document.addEventListener('keyup',e=>keys.delete(e.code));
document.addEventListener('mousemove',e=>{if(mode==='playing'&&(document.pointerLockElement===canvas||(fallbackLook&&(e.buttons&2)))){yaw-=e.movementX*.0022;pitch=THREE.MathUtils.clamp(pitch-e.movementY*.0022,-1.48,1.48);}});
canvas.addEventListener('click',()=>{if(!touch&&mode==='playing')shift();});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement&&!fallbackLook)pause();});
document.addEventListener('pointerlockerror',()=>{fallbackLook=true;});
window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();pause();$('menu-copy').textContent='3D-графика была прервана. Обновите страницу, чтобы перезапустить эксперимент.';$('start').disabled=true;});
// Touch uses the same movement and gravity actions as the keyboard interface.
let stickPointer=null,lookPointer=null,lookPrev=null;
$('joystick').addEventListener('pointerdown',e=>{stickPointer=e.pointerId;$('joystick').setPointerCapture(e.pointerId);moveStick(e);});
function moveStick(e){if(stickPointer!==e.pointerId)return;const rect=$('joystick').getBoundingClientRect();stick.x=(e.clientX-rect.left-rect.width/2)/40;stick.y=(e.clientY-rect.top-rect.height/2)/40;const l=Math.hypot(stick.x,stick.y);if(l>1){stick.x/=l;stick.y/=l;}$('joystick').firstElementChild.style.transform=`translate(${stick.x*35}px,${stick.y*35}px)`;}
$('joystick').addEventListener('pointermove',moveStick);
for(const type of ['pointerup','pointercancel'])$('joystick').addEventListener(type,()=>{stickPointer=null;stick.x=stick.y=0;$('joystick').firstElementChild.style.transform='';});
canvas.addEventListener('pointerdown',e=>{if(touch&&mode==='playing'){lookPointer=e.pointerId;lookPrev={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);}});
canvas.addEventListener('pointermove',e=>{if(e.pointerId===lookPointer&&lookPrev){yaw-=(e.clientX-lookPrev.x)*.005;pitch=THREE.MathUtils.clamp(pitch-(e.clientY-lookPrev.y)*.005,-1.48,1.48);lookPrev={x:e.clientX,y:e.clientY};}});
for(const type of ['pointerup','pointercancel'])canvas.addEventListener(type,()=>{lookPointer=null;lookPrev=null;});
$('touch-shift').addEventListener('click',shift);$('touch-jump').addEventListener('click',jump);

function animate(now){
  requestAnimationFrame(animate);const dt=Math.min((now-lastTime)/1000,.05);lastTime=now;
  if(endingScene&&level===6&&(mode==='ending'||mode==='won')){
    if(mode==='ending')endingClock+=dt;
    const f=THREE.MathUtils.smoothstep(endingClock,0,6);
    camera.position.set(-f,1+f*.6,4-f*8);camera.up.set(0,1,0);camera.lookAt(7,-1,-38);endingPlanet.rotation.y+=dt*.006;
    renderer.render(endingScene,camera);if(endingClock>6.5&&mode==='ending')finishEnding();return;
  }
  const t=now/1000;
  core.rotation.y=t*.25;core.rotation.z=t*.18;rings.forEach((r,i)=>{r.rotation.z=t*(i===1?-.16:.12)+i*.5;});
  cells.forEach((c,i)=>{c.gem.rotation.y=t*.7;c.gem.position.y=Math.sin(t*2+i)*.09;c.ring.rotation.z=t*.1;});
  if(mode==='playing'){
    elapsed+=dt;accumulator+=dt;while(accumulator>=1/120&&mode==='playing'){simulate(1/120);accumulator-=1/120;}
    frame.slerp(targetFrame,1-Math.exp(-8*dt));
    look.setFromEuler(new THREE.Euler(pitch,yaw,0,'YXZ'));camera.quaternion.copy(frame).multiply(look);
    const cameraUp=V(0,1,0).applyQuaternion(frame);camera.position.copy(player.p).addScaledVector(cameraUp,.78);
    // Keep the camera inside the current room while its orientation is changing.
    camera.position.clamp(V(-11.87,.13,-13.87),V(11.87,11.87,13.87));
    targetTick+=dt;if(targetTick>.08){lastTarget=getTarget();$('crosshair').classList.toggle('active',!!lastTarget?.valid);$('target-hint').textContent=lastTarget?.valid?(touch?'ГРАВИТАЦИЯ → ЭТА ПОВЕРХНОСТЬ':'ЛКМ — СДЕЛАТЬ ЭТУ ПОВЕРХНОСТЬ ПОЛОМ'):'';updateHazardHud();targetTick=0;}
    $('timer').textContent=formatTime(elapsed);
  }else if(!started){camera.position.set(8.8,6.2,11.8);camera.lookAt(-.2,4,-3.7);}
  if(fieldCage)fieldCage.rotation.y=t*.25;
  for(const h of hazards)if(h.mat)h.mat.opacity=.06+Math.sin(t*2)*.025;
  if(exitPowered){gateMaterial.opacity=Math.max(0,gateMaterial.opacity-dt*.5);if(gateMaterial.opacity===0)gate.visible=false;}
  if(now>toastUntil)$('toast').style.opacity='0';
  if(now>commsUntil)$('comms').style.opacity='0';
  renderer.render(scene,camera);
}
loadLevel(level);requestAnimationFrame(animate);

// Read-only game state is shared by accessibility/agent tools and QA.
function snapshot(){return{mode,chamber:level+1,chambers:chambers.length,collected:count,total:activeCells().length,exitPowered,simulationTime,endingReady:!!endingScene,receivers:receivers.map(r=>({label:r.label,latched:r.latched,charge:Math.round(r.charge*100)/100,cube:r.cube.p.toArray()})),hazards:hazards.map(h=>({kind:h.kind,z:h.z,active:h.active,gap:h.gap,y:h.y,remaining:h.remaining})),recoveries,completed:[...completed].map(n=>n+1),gravity:gravityName,elapsedSeconds:Math.floor(elapsed),shifts,grounded:player.grounded,position:player.p.toArray().map(n=>Math.round(n*100)/100)};}
if(document.modelContext?.registerTool){
  const life=new AbortController();
  Promise.resolve(document.modelContext.registerTool({name:'read_gravity_lab_state',description:'Read the current chamber progress, gravity direction and game status.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute(input){if(!input||Object.keys(input).length)throw new Error('Expected an empty object');return snapshot();}},{signal:life.signal})).catch(()=>{});
  window.addEventListener('pagehide',()=>life.abort(),{once:true});
}
// Explicit local QA mode; never activates during a normal play session.
if(location.hostname==='127.0.0.1'&&new URLSearchParams(location.search).has('qa')){
  window.gravityLabQA={snapshot,simulate,player,gravity,up,frame,targetFrame,cells,moving,loadLevel,restart,shift,start,pause,solids,renderer,camera,lookAt(x,y,z){const direction=V(x,y,z).sub(camera.position).normalize().applyQuaternion(targetFrame.clone().invert());yaw=Math.atan2(-direction.x,-direction.z);pitch=Math.asin(direction.y);},setLook(y,p){yaw=y;pitch=p;},setMode(v){mode=v;},step(seconds){for(let i=0;i<seconds*120;i++)simulate(1/120);},setGravity(x,y,z){const next=V(-x,-y,-z);targetFrame.premultiply(new THREE.Quaternion().setFromUnitVectors(up,next));gravity.set(x,y,z);up.copy(next);frame.copy(targetFrame);updateHud();}};
}
