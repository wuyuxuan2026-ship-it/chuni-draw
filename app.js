'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const library = window.CHUNI_LIBRARY;
  const colors = {BASIC:'#75d58b',ADVANCED:'#ffb85a',EXPERT:'#ff8f94',MASTER:'#c895ff',ULTIMA:'#ff7676',ALL:'#ffd34e'};
  const state = {difficulty:'MASTER',level:'13',pool:[],busy:false};
  const levelValue = level => Number(level.replace('+','')) + (level.endsWith('+') ? 0.5 : 0);
  const levels = [...new Set(library.songs.flatMap(song => Object.values(song.charts)))].sort((a,b)=>levelValue(a)-levelValue(b));
  function matches(song) { return Object.entries(song.charts).filter(([difficulty,level]) => (state.difficulty==='ALL' || difficulty===state.difficulty) && level===state.level); }
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
    $('selection-summary').textContent=(state.difficulty==='ALL'?'ALL CHARTS':state.difficulty)+' / LEVEL '+state.level;
    $('candidate-label').textContent='Lv. '+state.level+' · '+state.pool.length+' 首';
    $('candidate-list').replaceChildren();
    for(const song of state.pool.slice(0,6)) {
      const item=document.createElement('article');item.className='candidate';
      const img=document.createElement('img');img.className='candidate-cover';img.src=song.cover;img.alt=song.title+' 的封面';img.loading='lazy';
      img.addEventListener('error',()=>{img.removeAttribute('src');img.alt='♪';},{once:true});
      const info=document.createElement('div');info.className='candidate-info';
      const title=document.createElement('p');title.textContent=song.title;title.title=song.title;
      const label=document.createElement('small');label.textContent=matches(song).map(chart=>chart[0]).join(' / ')+' · '+state.level;
      info.append(title,label);item.append(img,info);$('candidate-list').append(item);
    }
    for(const input of $('levels').querySelectorAll('input')) {
      input.disabled=!library.songs.some(song=>Object.entries(song.charts).some(([difficulty,level])=>(state.difficulty==='ALL'||difficulty===state.difficulty)&&level===input.value));
      input.parentElement.hidden=input.disabled;
      input.checked=input.value===state.level;
    }
    if(state.pool.length) {
      $('result-stage').hidden=false; $('empty-state').hidden=true;
      $('result-stage').classList.add('awaiting');
      $('mystery-cover').hidden=false;
      $('result-cover').hidden=true; $('result-cover').removeAttribute('src');
      $('result-cover').alt=''; $('cover-fallback').hidden=true;
      for(const id of ['result-title','result-artist','result-category','result-level','result-difficulty']) $(id).textContent='';
      $('cover-label').textContent='等待抽取';
      $('result-status').textContent='等待抽取'; $('result-status').classList.remove('drawn');
      $('announcement').textContent='已选择等级 '+state.level+'，点击随机抽一首开始。';
    }
    else {
      $('result-stage').hidden=true; $('empty-state').hidden=false;
      $('result-status').textContent='曲池为空';$('result-status').classList.remove('drawn');
      $('announcement').textContent='当前等级没有匹配的曲目，请更换等级。';
    }
  }
  async function draw() {
    if(state.busy) throw new Error('正在抽取，请稍候。');
    if(!state.pool.length) throw new Error('当前等级没有曲目。');
    state.busy=true;$('draw').disabled=true;$('difficulty').disabled=true;
    for(const input of $('levels').querySelectorAll('input')) input.disabled=true;
    $('draw-label').textContent='正在抽取…';$('result-status').textContent='抽取中';
    $('result-stage').classList.add('drawing');
    const song=state.pool[randomIndex(state.pool.length)];const charts=matches(song),chart=charts[randomIndex(charts.length)];
    await new Promise(resolve=>setTimeout(resolve,matchMedia('(prefers-reduced-motion: reduce)').matches?0:800));
    showSong(song,chart,true);$('result-stage').classList.remove('drawing');
    state.busy=false;$('difficulty').disabled=false;$('draw').disabled=false;$('draw-label').textContent='再抽一首';
    for(const input of $('levels').querySelectorAll('input')) input.disabled=!library.songs.some(song=>Object.entries(song.charts).some(([difficulty,level])=>(state.difficulty==='ALL'||difficulty===state.difficulty)&&level===input.value));
    return {title:song.title,artist:song.artist,cover:song.cover,difficulty:chart[0],level:chart[1]};
  }
  for(const level of levels) {
    const label=document.createElement('label');label.className='level-option';
    const input=document.createElement('input');input.type='radio';input.name='level';input.value=level;input.setAttribute('aria-label','等级 '+level);
    const text=document.createElement('span');text.textContent=level;
    input.addEventListener('change',()=>{state.level=level;$('draw-label').textContent='随机抽一首';refresh();});
    label.append(input,text);$('levels').append(label);
  }
  $('total-count').textContent=library.songs.length.toLocaleString('zh-CN');
  $('difficulty').addEventListener('change',()=>{
    state.difficulty=$('difficulty').value;
    if(!library.songs.some(song=>matches(song).length)) {
      state.level=levels.find(level=>library.songs.some(song=>Object.entries(song.charts).some(([difficulty,chartLevel])=>(state.difficulty==='ALL'||difficulty===state.difficulty)&&chartLevel===level)));
    }
    $('draw-label').textContent='随机抽一首';refresh();
  });
  $('draw').addEventListener('click',()=>draw().catch(error=>{$('announcement').textContent=error.message;}));
  $('result-cover').addEventListener('error',()=>{if(!$('result-cover').hidden) $('cover-fallback').hidden=false;});
  refresh();
  if(document.modelContext?.registerTool) {
    const lifecycle=new AbortController();
    try {
      Promise.resolve(document.modelContext.registerTool({name:'draw_chunithm_song',title:'按等级随机抽歌',description:'选择谱面难度与精确等级，并抽取一首歌曲；完成后更新页面中的封面、名称和等级。',inputSchema:{type:'object',properties:{difficulty:{type:'string',enum:Object.keys(colors)},level:{type:'string',enum:levels}},required:['difficulty','level'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},async execute(input){
        if(!input||!Object.keys(colors).includes(input.difficulty)||!levels.includes(input.level)||Object.keys(input).some(key=>!['difficulty','level'].includes(key))) throw new Error('谱面难度或等级无效。');
        if(state.busy) throw new Error('正在抽取，请稍候。');
        const valid=library.songs.some(song=>Object.entries(song.charts).some(([difficulty,level])=>(input.difficulty==='ALL'||input.difficulty===difficulty)&&level===input.level));
        if(!valid) throw new Error('该难度与等级没有匹配曲目。');
        state.difficulty=input.difficulty;state.level=input.level;$('difficulty').value=input.difficulty;refresh();return draw();
      }},{signal:lifecycle.signal})).catch(()=>{});
      window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
    } catch { /* Browsers without WebMCP still support the complete visible interface. */ }
  }
})();
