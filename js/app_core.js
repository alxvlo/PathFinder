// PathFinder core — dataset, scoring, utilities

const PF_STORAGE_KEY = 'pf_dataset_v1';

// dataset = { meta:{}, categories: [{key,label,values?:string[], type:'enum'|'bool'|'text'|'textlist'}], people: [{id,name,aliases:[], attrs:{key:value,...}}], questions:[{id,text,key,value,weight}] }

const PF = (()=>{
  const clone = (o)=>JSON.parse(JSON.stringify(o));

  const defaultCategories = [
    { key:'is_fictional', label:'Fictional', type:'bool' },
    { key:'domain', label:'Domain', type:'enum', values:['sports','science','arts','politics','business','entertainment','myth','history','tech','internet'] },
    { key:'role', label:'Role', type:'text' },
    { key:'sport', label:'Sport', type:'text' },
    { key:'country', label:'Country', type:'text' },
    { key:'era', label:'Era', type:'text' },
    { key:'universe', label:'Fictional Universe', type:'text' },
    { key:'topics', label:'Topics', type:'textlist' }
  ];

  const defaultDataset = {
    meta: { version: 1, threshold: 10, lockedSeeds: true },
    categories: defaultCategories,
    people: [
      { id:'p_einstein', name:'Albert Einstein', aliases:['Einstein'], attrs:{ is_fictional:false, domain:'science', role:'physicist', country:'Germany', era:'modern', topics:['Scientists','Physicists'] } },
      { id:'p_mjordan', name:'Michael Jordan', aliases:['MJ','His Airness'], attrs:{ is_fictional:false, domain:'sports', role:'athlete', sport:'basketball', country:'USA', era:'modern', topics:['Basketball Players','NBA'] } },
      { id:'p_ironman', name:'Tony Stark', aliases:['Iron Man'], attrs:{ is_fictional:true, domain:'entertainment', role:'superhero', universe:'Marvel', era:'modern', topics:['Marvel Universe','Superheroes'] } }
    ],
    questions: [
      { id:'q_fiction', text:'Is the person fictional?', key:'is_fictional', value:true, weight:3 },
      { id:'q_science', text:'Is the person a scientist?', key:'domain', value:'science', weight:2 },
      { id:'q_basketball', text:'Is the person known for basketball?', key:'sport', value:'basketball', weight:3 },
      { id:'q_marvel', text:'Is the person from the Marvel universe?', key:'universe', value:'Marvel', weight:3 },
      { id:'q_politics', text:'Is the person a politician?', key:'domain', value:'politics', weight:2 }
    ]
  };

  const load = () => {
    const raw = localStorage.getItem(PF_STORAGE_KEY);
    if (!raw) return clone(defaultDataset);
    try { return JSON.parse(raw); } catch { return clone(defaultDataset); }
  };

  const save = (dataset) => {
    localStorage.setItem(PF_STORAGE_KEY, JSON.stringify(dataset));
  };

  const reset = () => save(clone(defaultDataset));

  async function loadTopicsFromTxt(url){
    try {
      const res = await fetch(url);
      if(!res.ok) return;
      const text = await res.text();
      const lines = text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
      const topics = lines.filter(s=>!s.startsWith('---') && !s.startsWith('—'));
      const ds = load();
      if(!ds.categories.find(c=>c.key==='topics')){
        ds.categories.push({ key:'topics', label:'Topics', type:'textlist' });
      }
      ds.meta.topics_suggestions = Array.from(new Set([...(ds.meta.topics_suggestions||[]), ...topics]));
      save(ds);
    } catch(e){
      console.warn('Topic load failed', e);
    }
  }

  function attrMatches(personAttrs, key, value){
    const v = personAttrs?.[key];
    if (v == null) return false;
    if (Array.isArray(v)) return v.includes(value);
    if (typeof v === 'boolean') return v === value;
    return String(v).toLowerCase() === String(value).toLowerCase();
  }

  function createSession(dataset){
    const state = {
      dataset,
      asked: [],
      scores: Object.fromEntries(dataset.people.map(p=>[p.id,0])),
      remainingQIds: new Set(dataset.questions.map(q=>q.id)),
      qCount: 0
    };

    function applyAnswer(qId, isYes){
      const q = dataset.questions.find(x=>x.id===qId);
      if(!q) return;
      state.asked.push({ id: qId, answer: isYes });
      state.qCount += 1;
      state.remainingQIds.delete(qId);
      if(isYes){
        for(const p of dataset.people){
          if(attrMatches(p.attrs, q.key, q.value)){
            state.scores[p.id] += (q.weight ?? 1);
          }
        }
      }
    }

    function topCandidates(){
      const entries = Object.entries(state.scores).sort((a,b)=>b[1]-a[1]);
      const top = entries[0] ?? [null, -Infinity];
      const second = entries[1] ?? [null, -Infinity];
      return { topId: top[0], topScore: top[1], secondScore: second[1] };
    }

    function shouldGuess(){
      const thr = dataset.meta.threshold ?? 10;
      const { topScore, secondScore } = topCandidates();
      return (topScore - secondScore) >= thr || state.qCount >= 25;
    }

    function pickNextQuestion(){
      const scoresArr = Object.entries(state.scores);
      const maxScore = Math.max(...scoresArr.map(([_,s])=>s));
      const cutoff = Math.max(maxScore - 5, 0);
      const focusIds = new Set(scoresArr.filter(([_,s])=>s>=cutoff).map(([id])=>id));

      let best = null;
      for(const q of dataset.questions){
        if(!state.remainingQIds.has(q.id)) continue;
        let yes = 0, no = 0;
        for(const p of dataset.people){
          if(!focusIds.has(p.id)) continue;
          if(attrMatches(p.attrs, q.key, q.value)) yes++; else no++;
        }
        const total = yes + no;
        if(total === 0) continue;
        const balance = Math.abs(yes - no);
        const score = (total - balance) + (q.weight ?? 1);
        if(!best || score > best.score) best = { q, score, yes, no };
      }
      return best?.q ?? null;
    }

    function tiebreaker(){
      const { topId } = topCandidates();
      const topPerson = dataset.people.find(p=>p.id===topId);
      if(!topPerson) return null;
      for(const q of dataset.questions){
        if(!state.remainingQIds.has(q.id)) continue;
        const matchesTop = attrMatches(topPerson.attrs, q.key, q.value);
        if(matchesTop) return q;
      }
      return null;
    }

    return { state, applyAnswer, pickNextQuestion, shouldGuess, topCandidates, tiebreaker };
  }

  return { load, save, reset, createSession, loadTopicsFromTxt };
})();
