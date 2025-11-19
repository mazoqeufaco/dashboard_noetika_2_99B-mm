// entrada.js — triângulo PNG com clique/arraste + auto-balance + modal Ok/Redefinir
export const DEFAULTS = {
  canvasId: 'tri',
  imgSrc: 'public/triangulo2.png',
  vertexToChannel: ['B','R','G'], // [top,left,right] -> B,R,G (Prazo, Custo, Qualidade)
  ui: {
    rSel: '#r', gSel: '#g', bSel: '#b',
    confirmBtnSel: '#confirm',
    confirmDlgSel: '#confirmDlg', confirmDlgTextSel: '#dlgText',
    confirmOkSel: '#dlgOk', confirmResetSel: '#dlgReset'
  }
};

const area=(ax,ay,bx,by,cx,cy)=>(bx-ax)*(cy-ay)-(cx-ax)*(by-ay);
function barycentric(px,py,A,B,C){ const d=area(A.x,A.y,B.x,B.y,C.x,C.y);
  const w1=area(px,py,B.x,B.y,C.x,C.y)/d, w2=area(px,py,C.x,C.y,A.x,A.y)/d, w3=1-w1-w2; return [w1,w2,w3]; }
const inside=(w,t=1e-6)=>w[0]>=t&&w[1]>=t&&w[2]>=t;
const norm3p=(r,g,b)=>{const s=Math.max(r+g+b,1e-12);return [r/s*100,g/s*100,b/s*100];};
const clamp01p=v=>Math.max(0,Math.min(100,v));
function baryToRGB([wt,wl,wr], map){ const idx={'R':0,'G':1,'B':2}, out=[0,0,0], w=[wt,wl,wr];
  map.forEach((lab,i)=>out[idx[lab]]=w[i]); const s=Math.max(out[0]+out[1]+out[2],1e-12);
  return [out[0]/s,out[1]/s,out[2]/s]; }
function rgbToBary([r,g,b], map){ const val={'R':r,'G':g,'B':b}; return [val[map[0]],val[map[1]],val[map[2]]]; }

function detectVerticesByAlpha(img,w,h){
  const off=document.createElement('canvas'); off.width=w; off.height=h;
  const octx=off.getContext('2d'); 
  octx.drawImage(img,0,0,w,h);
  
  let data, pts=[], TH=30;
  
  try {
    // Tenta obter dados da imagem
    const imageData = octx.getImageData(0,0,w,h);
    if(!imageData || !imageData.data || imageData.data.length === 0) {
      throw new Error('getImageData retornou dados inválidos');
    }
    data = imageData.data;
    
    // Verifica se o tamanho dos dados está correto
    const expectedLength = w * h * 4;
    if(data.length !== expectedLength) {
      throw new Error(`Tamanho de dados incorreto: esperado ${expectedLength}, obtido ${data.length}`);
    }
    
    // Procura em toda a área da imagem
    for(let y=0;y<h;y++) {
      for(let x=0;x<w;x++){
        const idx = (y*w+x)*4+3;
        if(idx >= data.length) break;
        const alpha = data[idx];
        if(!isNaN(alpha) && alpha>=TH) pts.push({x,y});
      }
    }
  } catch(err) {
    // Se getImageData falhar (CORS/tainted canvas no Chrome), usa fallback geométrico
    console.warn('getImageData falhou, usando detecção geométrica:', err.message || err);
    // Retorna vértices baseados na geometria esperada do triângulo
    return {top:{x:Math.floor(w/2),y:0},left:{x:0,y:h-1},right:{x:w-1,y:h-1}};
  }
  
  if(!pts.length) return {top:{x:Math.floor(w/2),y:0},left:{x:0,y:h-1},right:{x:w-1,y:h-1}};
  
  const extreme=(key,min=true,band=3)=>{
    // Fallback seguro se não houver pontos
    const fallback = key==='y' 
      ? {x:Math.floor(w/2),y:0}
      : (min ? {x:0,y:h-1} : {x:w-1,y:h-1});
    
    if(!pts || pts.length === 0) return fallback;
    
    // Filtra pontos válidos
    const validPts = pts.filter(p=>p && typeof p === 'object' && !isNaN(p[key]) && p[key] !== null && p[key] !== undefined);
    if(validPts.length === 0) return fallback;
    
    // Encontra o valor extremo
    let ex = validPts[0][key];
    for(let i=1; i<validPts.length; i++) {
      const val = validPts[i][key];
      if(min ? val < ex : val > ex) ex = val;
    }
    
    if(isNaN(ex)) return fallback;
    
    // Filtra pontos próximos ao extremo
    const sel = validPts.filter(p=>Math.abs(p[key]-ex)<=band);
    
    if(sel.length === 0) {
      // Se nenhum ponto na banda, retorna o mais próximo do extremo
      let closest = validPts[0];
      let minDist = Math.abs(closest[key]-ex);
      for(let i=1; i<validPts.length; i++) {
        const dist = Math.abs(validPts[i][key]-ex);
        if(dist < minDist) {
          minDist = dist;
          closest = validPts[i];
        }
      }
      return closest;
    }
    
    // Para o topo (y), encontra o ponto mais central em x
    if(key==='y'){ 
      let sumX = 0;
      for(let i=0; i<sel.length; i++) sumX += sel[i].x;
      const cx = sumX / sel.length;
      if(isNaN(cx)) return fallback;
      
      let closest = sel[0];
      let minDist = Math.abs(closest.x-cx);
      for(let i=1; i<sel.length; i++) {
        const dist = Math.abs(sel[i].x-cx);
        if(dist < minDist) {
          minDist = dist;
          closest = sel[i];
        }
      }
      return closest;
    }
    
    // Para esquerda/direita (x), encontra o ponto mais baixo em y
    let lowest = sel[0];
    for(let i=1; i<sel.length; i++) {
      if(sel[i].y > lowest.y) lowest = sel[i];
    }
    return lowest;
  };
  
  try {
    return { top:extreme('y',true), left:extreme('x',true), right:extreme('x',false) };
  } catch(err) {
    console.warn('Erro ao detectar vértices, usando fallback geométrico:', err);
    return {top:{x:Math.floor(w/2),y:0},left:{x:0,y:h-1},right:{x:w-1,y:h-1}};
  }
}

function drawScene(ctx, canvas, img, rect, point){
  ctx.fillStyle='#000'; ctx.fillRect(0,0,canvas.width,canvas.height);
  let drewImage = false;
  if(img && img.complete && img.naturalWidth > 0){
    try{
      ctx.drawImage(img,rect.x,rect.y,rect.w,rect.h);
      drewImage = true;
    }catch(err){
      console.warn('drawImage falhou, usando fallback do triângulo:', err);
    }
  }
  if(!drewImage){
    ctx.save();
    ctx.translate(rect.x, rect.y);
    ctx.beginPath();
    ctx.moveTo(rect.w/2, 0);
    ctx.lineTo(0, rect.h);
    ctx.lineTo(rect.w, rect.h);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, rect.h, rect.w, 0);
    grad.addColorStop(0, '#ff6b6b');     // Custo (esquerda)
    grad.addColorStop(0.5, '#51cf66');   // Qualidade (direita)
    grad.addColorStop(1, '#4dabf7');     // Prazo (topo)
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
  if(point){
    ctx.fillStyle='#fff'; ctx.strokeStyle='#000'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(point[0],point[1],8,0,Math.PI*2); ctx.fill(); ctx.stroke();
  }
}

export async function initEntrada(opts={}){
  const cfg={...DEFAULTS,...opts, ui:{...DEFAULTS.ui, ...(opts.ui||{})}};
  const canvas=document.getElementById(cfg.canvasId);
  const ctx=canvas.getContext('2d');
  const rEl=document.querySelector(cfg.ui.rSel);
  const gEl=document.querySelector(cfg.ui.gSel);
  const bEl=document.querySelector(cfg.ui.bSel);
  const btn=document.querySelector(cfg.ui.confirmBtnSel);
  const dlg=document.querySelector(cfg.ui.confirmDlgSel);
  const dlgText=document.querySelector(cfg.ui.confirmDlgTextSel);
  const dlgOk=document.querySelector(cfg.ui.confirmOkSel);
  const dlgReset=document.querySelector(cfg.ui.confirmResetSel);

  let img=new Image();
  // Tenta carregar com CORS para permitir getImageData no Chrome
  // Se o servidor não suportar CORS, tenta sem CORS (fallback geométrico será usado se getImageData falhar)
  img.crossOrigin='anonymous';
  await new Promise((res,rej)=>{ 
    let triedWithoutCors = false;
    img.onload=res; 
    img.onerror=(e)=>{ 
      // Se falhar com CORS, tenta sem CORS (para servidores locais sem CORS)
      if(!triedWithoutCors) {
        triedWithoutCors = true;
        img = new Image(); // Nova instância sem CORS
        img.onload = res;
        img.onerror = (e2) => {
          console.error('Erro ao carregar imagem:', cfg.imgSrc, e2);
          rej(e2);
        };
        img.src = cfg.imgSrc;
      } else {
        console.error('Erro ao carregar imagem:', cfg.imgSrc, e);
        rej(e);
      }
    }; 
    img.src=cfg.imgSrc; 
  });

  const padTop=30,padBottom=30; // Padding equilibrado
  const maxW=canvas.width-40, maxH=canvas.height-padTop-padBottom;
  const scale=Math.min(maxW/img.width, maxH/img.height) * 0.7; // 70% do box inteiro
  const w=Math.round(img.width*scale), h=Math.round(img.height*scale);
  const x=Math.floor((canvas.width-w)/2);
  // Posiciona o triângulo um pouco mais para baixo para equilibrar espaçamentos
  const y=padTop + Math.floor((canvas.height - padTop - padBottom - h) * 0.5);
  const rect={x,y,w,h};

  // Tenta detectar vértices, com fallback seguro
  let v;
  try {
    v = detectVerticesByAlpha(img,w,h);
    // Valida os vértices retornados
    if(!v || !v.top || !v.left || !v.right || 
       isNaN(v.top.x) || isNaN(v.top.y) ||
       isNaN(v.left.x) || isNaN(v.left.y) ||
       isNaN(v.right.x) || isNaN(v.right.y)) {
      throw new Error('Vértices inválidos retornados');
    }
  } catch(err) {
    console.warn('Erro ao detectar vértices, usando fallback geométrico:', err.message || err);
    // Fallback geométrico seguro
    v = {
      top: {x: Math.floor(w/2), y: 0},
      left: {x: 0, y: h-1},
      right: {x: w-1, y: h-1}
    };
  }
  
  const Vtop={x:x+v.top.x,y:y+v.top.y};
  const Vleft={x:x+v.left.x,y:y+v.left.y};
  const Vright={x:x+v.right.x,y:y+v.right.y};

  let rgb=[1/3,1/3,1/3]; let dragging=false;

  const drawFromRGB=()=>{ const [wt,wl,wr]=rgbToBary(rgb,cfg.vertexToChannel);
    const px=wt*Vtop.x+wl*Vleft.x+wr*Vright.x, py=wt*Vtop.y+wl*Vleft.y+wr*Vright.y;
    drawScene(ctx,canvas,img,rect,[px,py]); };

  function setPerc(r,g,b,draw=true){
    rEl.value=r.toFixed(2); gEl.value=g.toFixed(2); bEl.value=b.toFixed(2);
    rgb=[r/100,g/100,b/100]; if(draw) drawFromRGB();
  }
  function rebalance(focus,newVal){
    let r=parseFloat(rEl.value)||0, g=parseFloat(gEl.value)||0, b=parseFloat(bEl.value)||0;
    [r,g,b]=norm3p(r,g,b); newVal=clamp01p(newVal);
    if(focus==='R'){ const rem=g+b, k=rem?(100-newVal)/rem:0.5; g*=k; b*=k; r=newVal; }
    else if(focus==='G'){ const rem=r+b, k=rem?(100-newVal)/rem:0.5; r*=k; b*=k; g=newVal; }
    else { const rem=r+g, k=rem?(100-newVal)/rem:0.5; r*=k; g*=k; b=newVal; }
    const tot=r+g+b; if(Math.abs(tot-100)>0.001){
      if(focus!=='R') r*=100/tot; if(focus!=='G') g*=100/tot; if(focus!=='B') b*=100/tot;
    }
    setPerc(r,g,b);
  }

  ['input','change'].forEach(evt=>{
    rEl.addEventListener(evt,()=>rebalance('R',parseFloat(rEl.value)||0));
    gEl.addEventListener(evt,()=>rebalance('G',parseFloat(gEl.value)||0));
    bEl.addEventListener(evt,()=>rebalance('B',parseFloat(bEl.value)||0));
  });

  const handlePoint=(mx,my)=>{
    const wts=barycentric(mx,my,Vtop,Vleft,Vright);
    if(!inside(wts)) return false;
    const [r,g,b]=baryToRGB(wts,cfg.vertexToChannel);
    setPerc(r*100,g*100,b*100);
    return true;
  };
  canvas.addEventListener('mousedown',e=>{
    const r=canvas.getBoundingClientRect();
    dragging=handlePoint(e.clientX-r.left,e.clientY-r.top);
  });
  canvas.addEventListener('mousemove',e=>{
    if(!dragging) return;
    const r=canvas.getBoundingClientRect();
    handlePoint(e.clientX-r.left,e.clientY-r.top);
  });
  window.addEventListener('mouseup',()=>{ dragging=false; });
  canvas.addEventListener('click',e=>{
    const r=canvas.getBoundingClientRect();
    handlePoint(e.clientX-r.left,e.clientY-r.top);
  });

  let onConfirm=null;
  btn.addEventListener('click',()=>{
    const [r,g,b]=rgb;
    dlgText.textContent =
`Suas prioridades de seleção da solução:

${(r*100).toFixed(2)}% de peso para custo anual,
${(g*100).toFixed(2)}% de qualidade (aderência a seus requisitos) e
${(b*100).toFixed(2)}% para prazo.`;
    dlg.showModal();
    const ok=()=>{ dlg.close(); onConfirm&&onConfirm({r,g,b}); cleanup(); };
    const re=()=>{ dlg.close(); cleanup(); };
    const cleanup=()=>{ dlgOk.removeEventListener('click',ok); dlgReset.removeEventListener('click',re); };
    dlgOk.addEventListener('click',ok); dlgReset.addEventListener('click',re);
  });

  setPerc(33.3333,33.3333,33.3333); drawFromRGB();
  return { getRGB:()=>({r:rgb[0],g:rgb[1],b:rgb[2]}), onConfirm:(fn)=>{onConfirm=fn;} };
}
