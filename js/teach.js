// Teach flow
const $ = (s)=>document.querySelector(s);

function fillCategories(){
  const ds = PF.load();
  const fields = $('#attrFields');
  fields.innerHTML = '';
  for(const c of ds.categories){
    const wrap = document.createElement('div');
    wrap.className = 'card';
    const label = document.createElement('div');
    label.innerHTML = `<strong>${c.label}</strong> <small>(${c.key})</small>`;
    wrap.appendChild(label);
    let input;
    if(c.type === 'bool'){
      wrap.innerHTML += `<label><input type="checkbox" data-key="${c.key}" class="attr-bool"> True</label>`;
    }else if(c.type === 'enum'){
      input = document.createElement('select');
      input.dataset.key = c.key;
      (c.values||[]).forEach(v=>{
        const opt = document.createElement('option');
        opt.value = v; opt.textContent = v;
        input.appendChild(opt);
      });
      wrap.appendChild(input);
    }else if(c.type === 'textlist'){
      input = document.createElement('input');
      input.placeholder = 'comma, separated, values';
      input.dataset.key = c.key;
      input.dataset.type = 'textlist';
      wrap.appendChild(input);
    }else{
      input = document.createElement('input');
      input.placeholder = 'value';
      input.dataset.key = c.key;
      wrap.appendChild(input);
    }
    fields.appendChild(wrap);
  }

  const qkey = $('#t_qkey');
  qkey.innerHTML = '';
  for(const c of ds.categories){
    const opt = document.createElement('option');
    opt.value = c.key; opt.textContent = `${c.label} (${c.key})`;
    qkey.appendChild(opt);
  }
}

function collectAttrs(){
  const ds = PF.load();
  const attrs = {};
  for(const c of ds.categories){
    if(c.type === 'bool'){
      const el = document.querySelector(`.attr-bool[data-key="${c.key}"]`);
      if(el && el.checked) attrs[c.key] = true;
    }else{
      const el = document.querySelector(`[data-key="${c.key}"]`);
      if(!el) continue;
      let val = el.value.trim();
      if(!val) continue;
      if(el.dataset.type === 'textlist'){
        attrs[c.key] = val.split(',').map(s=>s.trim()).filter(Boolean);
      }else{
        attrs[c.key] = val;
      }
    }
  }
  return attrs;
}

function onSubmit(e){
  e.preventDefault();
  const name = $('#t_name').value.trim();
  const aliases = $('#t_aliases').value.split(',').map(s=>s.trim()).filter(Boolean);
  if(!name){ alert('Name required'); return; }
  const attrs = collectAttrs();
  const ds = PF.load();
  const id = 'p_' + name.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
  let finalId = id, k=1;
  while(ds.people.find(p=>p.id===finalId)){ finalId = id + '_' + (k++); }
  ds.people.push({ id: finalId, name, aliases, attrs });

  const qtext = $('#t_qtext').value.trim();
  const qkey = $('#t_qkey').value;
  const qval = $('#t_qval').value.trim();
  if(qtext && qkey && qval){
    const qid = 'q_' + qkey + '_' + qval.toLowerCase().replace(/[^a-z0-9]+/g,'_');
    if(!ds.questions.find(q=>q.id===qid)){
      ds.questions.push({ id: qid, text:qtext, key:qkey, value:qval, weight:2 });
    }
  }
  PF.save(ds);
  alert('Thanks! I learned a new person.');
  window.location.href = 'play.html';
}

document.addEventListener('DOMContentLoaded', ()=>{
  fillCategories();
  $('#teachForm').addEventListener('submit', onSubmit);
});
