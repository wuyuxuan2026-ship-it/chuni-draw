'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const library = window.CHUNI_LIBRARY;
  const colors = {BASIC:'#75d58b',ADVANCED:'#ffb85a',EXPERT:'#ff8f94',MASTER:'#c895ff',ULTIMA:'#ff7676',ALL:'#ffd34e'};
  const state = {difficulty:'MASTER',levels:new Set(['13']),pool:[],busy:false};
  const levelValue = level => Number(level.replace('+','')) + (level.endsWith('+') ? 0.5 : 0);
  const levels = [...new Set(library.songs.flatMap(song => Object.values(song.charts)))].sort((a,b)=>levelValue(a)-levelValue(b));
  const selectedLevels = () => levels.filter(level=>state.levels.has(level));
  const levelText = () => selectedLevels().join(' / ');
  const available = value => library.songs.some(song=>Object.entries(song.charts).some(([difficulty,level])=>(state.difficulty==='ALL'||difficulty===state.difficulty)&&level===value));
  function matches(song) { return Object.entries(song.charts).filter(([difficulty,level]) => (state.difficulty==='ALL' || difficulty===state.difficulty) && state.levels.has(level)); }
  function randomIndex(length) {
    if (!Number.isInteger(length) || length < 1) throw new Error('曲池为空，无法抽取。');
    const value = new Uint32Array(1), limit = Math.floor(4294967296 / length) * length;
    do { crypto.getRandomValues(value); } while (value[0] >= limit);
    return value[0] % length;
  }
  function showSong(song, chart, drawn) {
    $('result-stage').classList.remove('awaiting');
    $('mystery-cover').hidden=true;
    $('result-cover').hidden=false;
    $('result-stage').hidden=false; $('empty-state').hidden=true;
    $('result-title').textContent=song.title;
    $('result-artist').textContent=song.artist;
    $('result-category').textContent=song.category;
    $('result-difficulty').textContent=chart[0];
    $('result-difficulty').style.setProperty('--difficulty',colors[chart[0]]);
    $('result-level').textContent=chart[1];
    $('result-cover').alt=song.title+' 的歌曲封面';
    $('cover-fallback').hidden=true;
    $('result-cover').src=song.cover;
    $('cover-label').textContent=drawn?'YOUR NEXT TRACK / 本次抽取':'曲目预览 · 尚未抽取';
    $('result-status').textContent=drawn?'抽取完成':'等待抽取';
    $('result-status').classList.toggle('drawn',drawn);
    $('result-note').textContent=drawn?'就是这首了。准备好迎接下一次挑战。':'准备好了吗？点击抽歌按钮开始。';
    if(drawn) $('announcement').textContent='抽到 '+song.title+'，'+chart[0]+'，等级 '+chart[1]+'。';
  }
  function refresh() {
    state.pool=library.songs.filter(song=>matches(song).length);
    document.documentElement.style.setProperty('--difficulty',colors[state.difficulty]);
    $('pool-count').textContent=state.pool.length;
    $('draw').disabled=!state.pool.length;
    $('level-selection').textContent=state.levels.size?'已选 '+state.levels.size+' 个':'可多选';
    $('selection-summary').textContent=(state.difficulty==='ALL'?'ALL CHARTS':state.difficulty)+' / '+(state.levels.size?'Lv. '+levelText():'未选择等级');
    $('candidate-label').textContent=(state.levels.size?'Lv. '+levelText():'未选择等级')+' · '+state.pool.length+' 首';
    $('reel').hidden=true;$('reel-track').replaceChildren();
    $('candidate-list').replaceChildren();
    for(const song of state.pool.slice(0,6)) {
      const item=document.createElement('article');item.className='candidate';
      const img=document.createElement('img');img.className='candidate-cover';img.src=song.cover;img.alt=song.title+' 的封面';img.loading='lazy';
      img.addEventListener('error',()=>{img.removeAttribute('src');img.alt='♪';},{once:true});
      const info=document.createElement('div');info.className='candidate-info';
      const title=document.createElement('p');title.textContent=song.title;title.title=song.title;
      const label=document.createElement('small');label.textContent=matches(song).map(([difficulty,level])=>difficulty+' · '+level).join(' / ');
      info.append(title,label);item.append(img,info);$('candidate-list').append(item);
    }
    for(const input of $('levels').querySelectorAll('input')) {
      input.disabled=!library.songs.some(song=>Object.entries(song.charts).some(([difficulty,level])=>(state.difficulty==='ALL'||difficulty===state.difficulty)&&level===input.value));
      input.parentElement.hidden=input.disabled;
      input.checked=state.levels.has(input.value);
    }
    {
      $('result-stage').hidden=false; $('empty-state').hidden=true;
      $('result-stage').classList.add('awaiting');
      $('mystery-cover').hidden=false;
      $('result-cover').hidden=true; $('result-cover').removeAttribute('src');
      $('result-cover').alt=''; $('cover-fallback').hidden=true;
      for(const id of ['result-title','result-artist','result-category','result-level','result-difficulty']) $(id).textContent='';
      $('cover-label').textContent=state.levels.size?'等待抽取':'选择至少一个等级';
      $('result-status').textContent='等待抽取'; $('result-status').classList.remove('drawn');
      $('announcement').textContent=state.levels.size?'已选择等级 '+levelText()+'，点击随机抽一首开始。':'请选择至少一个歌曲等级。';
    }
  }
  function makeReelCard(song,chart) {
    const card=document.createElement('div');card.className='reel-card';
    const cover=document.createElement('div');cover.className='reel-cover';
    const fallback=document.createElement('span');fallback.textContent='♪';
    const image=document.createElement('img');image.src=song.cover;image.alt='';image.decoding='async';
    image.addEventListener('error',()=>{image.hidden=true;},{once:true});cover.append(fallback,image);
    const title=document.createElement('p');title.textContent=song.title;title.title=song.title;
    const detail=document.createElement('small');detail.textContent=chart[0]+' · '+chart[1];detail.style.color=colors[chart[0]];
    card.append(cover,title,detail);return card;
  }
  async function spin(song,chart) {
    const reel=$('reel'),track=$('reel-track'),windowEl=$('reel-window');
    track.getAnimations().forEach(animation=>animation.cancel());track.replaceChildren();
    reel.classList.remove('settled');reel.hidden=false;$('result-stage').hidden=true;
    $('reel-hint').textContent='等待指针落定…';
    const winnerIndex=5,startIndex=32,cards=[];
    for(let i=0;i<40;i++) {
      const candidate=i===winnerIndex?song:state.pool[randomIndex(state.pool.length)];
      const charts=matches(candidate),candidateChart=i===winnerIndex?chart:charts[randomIndex(charts.length)];
      const card=makeReelCard(candidate,candidateChart);cards.push(card);track.append(card);
    }
    const offset=index=>windowEl.clientWidth/2-cards[index].offsetLeft-cards[index].offsetWidth/2;
    track.style.transform='translateX('+offset(startIndex)+'px)';
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const animation=track.animate([{transform:'translateX('+offset(startIndex)+'px)'},{transform:'translateX('+offset(winnerIndex)+'px)'}],{duration:6500,easing:'cubic-bezier(.08,.65,.12,1)',fill:'forwards'});
      await animation.finished;animation.cancel();
    }
    track.style.transform='translateX('+offset(winnerIndex)+'px)';cards[winnerIndex].classList.add('winner');
    reel.classList.add('settled');$('reel-hint').textContent='已锁定 · '+song.title;
  }
  async function draw() {
    if(state.busy) throw new Error('正在抽取，请稍候。');
    if(!state.pool.length) throw new Error('当前等级没有曲目。');
    state.busy=true;$('draw').disabled=true;$('difficulty').disabled=true;
    for(const input of $('levels').querySelectorAll('input')) input.disabled=true;
    $('draw-label').textContent='正在抽取…';$('result-status').textContent='抽取中';
    const song=state.pool[randomIndex(state.pool.length)];const charts=matches(song),chart=charts[randomIndex(charts.length)];
    try { await spin(song,chart);showSong(song,chart,true); }
    finally { state.busy=false;$('difficulty').disabled=false;$('draw').disabled=!state.pool.length;$('draw-label').textContent='再抽一首';
      for(const input of $('levels').querySelectorAll('input'))input.disabled=!available(input.value);
    }
    return {title:song.title,artist:song.artist,cover:song.cover,difficulty:chart[0],level:chart[1]};
  }
  for(const level of levels) {
    const label=document.createElement('label');label.className='level-option';
    const input=document.createElement('input');input.type='checkbox';input.name='level';input.value=level;input.setAttribute('aria-label','等级 '+level);
    const text=document.createElement('span');text.textContent=level;
    input.addEventListener('change',()=>{if(input.checked)state.levels.add(level);else state.levels.delete(level);$('draw-label').textContent='随机抽一首';refresh();});
    label.append(input,text);$('levels').append(label);
  }
  $('total-count').textContent=library.songs.length.toLocaleString('zh-CN');
  $('difficulty').addEventListener('change',()=>{
    const hadSelection=state.levels.size>0;state.difficulty=$('difficulty').value;
    state.levels=new Set(selectedLevels().filter(available));
    if(hadSelection&&!state.levels.size)state.levels.add(levels.find(available));
    $('draw-label').textContent='随机抽一首';refresh();
  });
  $('draw').addEventListener('click',()=>draw().catch(error=>{$('announcement').textContent=error.message;}));
  $('result-cover').addEventListener('error',()=>{if(!$('result-cover').hidden) $('cover-fallback').hidden=false;});
  new ResizeObserver(()=>{
    const winner=$('reel-track').querySelector('.winner');
    if(!state.busy&&!$('reel').hidden&&winner)$('reel-track').style.transform='translateX('+($('reel-window').clientWidth/2-winner.offsetLeft-winner.offsetWidth/2)+'px)';
  }).observe($('reel-window'));
  refresh();
  if(document.modelContext?.registerTool) {
    const lifecycle=new AbortController();
    try {
      Promise.resolve(document.modelContext.registerTool({name:'draw_chunithm_song',title:'按多个等级随机抽歌',description:'选择谱面难度与一个或多个精确等级，通过横向滚动抽取一首歌曲并展示结果。',inputSchema:{type:'object',properties:{difficulty:{type:'string',enum:Object.keys(colors)},levels:{type:'array',items:{type:'string',enum:levels},minItems:1,uniqueItems:true}},required:['difficulty','levels'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},async execute(input){
        if(!input||!Object.keys(colors).includes(input.difficulty)||!Array.isArray(input.levels)||!input.levels.length||input.levels.some(level=>!levels.includes(level))||new Set(input.levels).size!==input.levels.length||Object.keys(input).some(key=>!['difficulty','levels'].includes(key))) throw new Error('谱面难度或等级无效。');
        if(state.busy) throw new Error('正在抽取，请稍候。');
        const valid=input.levels.every(value=>library.songs.some(song=>Object.entries(song.charts).some(([difficulty,level])=>(input.difficulty==='ALL'||input.difficulty===difficulty)&&level===value)));
        if(!valid) throw new Error('该难度与等级没有匹配曲目。');
        state.difficulty=input.difficulty;state.levels=new Set(input.levels);$('difficulty').value=input.difficulty;refresh();return draw();
      }},{signal:lifecycle.signal})).catch(()=>{});
      window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
    } catch { /* Browsers without WebMCP still support the complete visible interface. */ }
  }
})();
