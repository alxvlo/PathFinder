// Admin dashboard
const $ = (s)=>document.querySelector(s);

// ==== Form Import helpers ====
const FI = {
  // live suggestion sets (grow as admin types/imports)
  sugg: { classification:new Set(), role:new Set(), sport:new Set(), country:new Set(), era:new Set(), universe:new Set() },

  // render datalists from FI.sugg
  renderLists(){
    const fill = (id, set) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = Array.from(set).sort().map(v=>`<option value="${v}">`).join('');
    };
    fill('dl_classification', FI.sugg.classification);
    fill('dl_role',          FI.sugg.role);
    fill('dl_sport',         FI.sugg.sport);
    fill('dl_country',       FI.sugg.country);
    fill('dl_era',           FI.sugg.era);
    fill('dl_universe',      FI.sugg.universe);
  },

  ensureSuggestionsFromDataset(ds){
    // pull existing values from dataset into suggestion sets
    const dom = ds.categories.find(c=>c.key==='domain');
    if(dom?.values) dom.values.forEach(v=>FI.sugg.classification.add(v));
    ds.people.forEach(p=>{
      const a = p.attrs||{};
      if(a.role)     FI.sugg.role.add(String(a.role));
      if(a.sport)    FI.sugg.sport.add(String(a.sport));
      if(a.country)  FI.sugg.country.add(String(a.country));
      if(a.era)      FI.sugg.era.add(String(a.era));
      if(a.universe) FI.sugg.universe.add(String(a.universe));
      if(a.domain)   FI.sugg.classification.add(String(a.domain));
    });
  },

  newRow(){
    // returns a <tr> element with inputs wired to datalists
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" class="fi_name form-input" placeholder="e.g., Michael Jordan"></td>
      <td><input list="dl_classification" class="fi_classification form-input" placeholder="e.g., sports"></td>
      <td><input list="dl_role" class="fi_role form-input" placeholder="e.g., athlete"></td>
      <td><input list="dl_country" class="fi_country form-input" placeholder="e.g., USA"></td>
      <td>
        <select class="fi_fictional form-input">
          <option value="false" selected>Non-fictional</option>
          <option value="true">Fictional</option>
        </select>
      </td>
      <td><input list="dl_sport" class="fi_sport form-input" placeholder="e.g., basketball"></td>
      <td><input class="fi_topics form-input" placeholder="comma-separated"></td>
      <td><input class="fi_aliases form-input" placeholder="comma-separated"></td>
      <td><button type="button" class="btn secondary fi_delRow">Remove</button></td>
    `;
    tr.querySelector('.fi_delRow').addEventListener('click', ()=> tr.remove());
    // when admin types a new value, add to suggestions immediately
    const hook = (sel,setName)=> {
      const el = tr.querySelector(sel);
      if (!el) return;
      el.addEventListener('change', e=>{
        const v = (e.target.value||'').trim();
        if(v) { FI.sugg[setName].add(v); FI.renderLists(); }
      });
    };
    hook('.fi_classification','classification');
    hook('.fi_role','role');
    hook('.fi_sport','sport');
    hook('.fi_country','country');
    hook('.fi_era','era');
    hook('.fi_universe','universe');
    return tr;
  },

  collectRows(){
    const rows = Array.from(document.querySelectorAll('#fi_tbody tr'));
    return rows.map((tr, idx)=>{
      const val = s => (tr.querySelector(s)?.value||'').trim();
      return {
        idx,
        name:           val('.fi_name'),
        classification: val('.fi_classification'),
        role:           val('.fi_role'),
        country:        val('.fi_country'),
        fictional:      val('.fi_fictional'), // "true"/"false"
        sport:          val('.fi_sport'),
        topics:         val('.fi_topics'),
        aliases:        val('.fi_aliases')
      };
    });
  },

  validateRow(r){
    const errs = [];
    if(!r.name) errs.push('Name is required');
    if(!r.classification) errs.push('Classification is required');
    return errs;
  },

  slugId(name){
    return 'p_' + String(name||'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
  }
};
// ==== /Form Import helpers ====


function renderCategories(ds){
  const box = $('#catList');
  if (!box) return;
  box.innerHTML = '';
  ds.categories.forEach(c=>{
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `<strong>${c.label}</strong> <small>(${c.key})</small><div>Type: ${c.type}${c.values?` · Values: ${c.values.join(', ')}`:''}</div>`;
    box.appendChild(div);
  });
}

function renderPeople(ds){
  const counter = $('#peopleCount');
  if (counter) counter.textContent = `(${ds.people.length})`;
  const box = $('#peopleList'); if (!box) return;
  box.innerHTML = '';
  ds.people.forEach(p=>{
    const div = document.createElement('div');
    div.className = 'card';
    const tags = Object.entries(p.attrs||{}).slice(0,6).map(([k,v])=>{
      if(Array.isArray(v)) v = v.join('|');
      return `<span class="badge">${k}:${v}</span>`;
    }).join(' ');
    div.innerHTML = `<div><strong>${p.name}</strong><br/><small>${p.id}</small></div><div>${tags}</div>`;
    box.appendChild(div);
  });
}

function renderQuestions(ds){
  const counter = $('#questionCount');
  if (counter) counter.textContent = `(${ds.questions.length})`;
  const box = $('#questionList'); if (!box) return;
  box.innerHTML = '';
  ds.questions.forEach(q=>{
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `<div><strong>${q.text}</strong></div><div><small>${q.id}</small></div><div>key=<code>${q.key}</code>, value=<code>${q.value}</code>, weight=${q.weight??1}</div>`;
    box.appendChild(div);
  });
}

async function doImport(){
  const files = $('#fileInput')?.files;
  if(!files || !files.length){ alert('Choose one or more JSON files.'); return; }
  const ds = PF.load();
  const report = [];

  for(const file of files){
    const text = await file.text();
    let obj;
    try{ obj = JSON.parse(text); }
    catch(e){ report.push(`❌ ${file.name}: invalid JSON`); continue; }

    if(obj.categories){
      for(const c of obj.categories){
        const existing = ds.categories.find(x=>x.key===c.key);
        if(existing){ Object.assign(existing, c); }
        else { ds.categories.push(c); }
      }
    }

    if(obj.people){
      for(const p of obj.people){
        const idx = ds.people.findIndex(x=>x.id===p.id);
        if(idx>=0){
          ds.people[idx] = p;
          report.push(`⚠️  ${file.name}: replaced person ${p.id}`);
        }else{
          ds.people.push(p);
          report.push(`✅ ${file.name}: added person ${p.id}`);
        }
      }
    }

    if(obj.questions){
      for(const q of obj.questions){
        const idx = ds.questions.findIndex(x=>x.id===q.id);
        if(idx>=0){
          ds.questions[idx] = q;
          report.push(`⚠️  ${file.name}: replaced question ${q.id}`);
        }else{
          ds.questions.push(q);
          report.push(`✅ ${file.name}: added question ${q.id}`);
        }
      }
    }
  }

  PF.save(ds);
  const rep = $('#importReport'); if (rep) rep.textContent = report.join('\n');
  renderCategories(ds); renderPeople(ds); renderQuestions(ds);
}

// ---- Paste Text Import ----
function slugIdFromName(name){ return 'p_' + String(name||'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,''); }
function parseBool(v){ const s=String(v).trim().toLowerCase(); if(s==='true') return true; if(s==='false') return false; return undefined; }
function parseList(v){ return String(v).split(/[,|]/).map(s=>s.trim()).filter(Boolean); }

function parseLineToPerson(line){
  const segments = line.split('|').map(s=>s.trim()).filter(Boolean);
  if(!segments.length) return null;
  let name=null, aliases=[], attrs={};
  for(const seg of segments){
    const eq = seg.indexOf('=');
    if(eq===-1){
      if(!name) name = seg;
      else if(aliases.length===0) aliases = parseList(seg);
      else attrs.topics = [...(attrs.topics||[]), ...parseList(seg)];
      continue;
    }
    const key = seg.slice(0,eq).trim();
    const value = seg.slice(eq+1).trim();
    if(key==='name'){ name=value; continue; }
    if(key==='aliases'){ aliases = parseList(value); continue; }
    if(key==='is_fictional'){ const b=parseBool(value); if(b!==undefined) attrs.is_fictional=b; continue; }
    if(key==='topics'){ attrs.topics = parseList(value); continue; }
    attrs[key] = value;
  }
  if(!name) return null;
  const id = slugIdFromName(name);
  return { id, name, aliases, attrs };
}

async function doParsePaste(){
  const raw = ($('#pasteBox')?.value||'').trim();
  if(!raw){ alert('Paste one or more lines first.'); return; }
  const lines = raw.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const people = [];
  const report = [];
  lines.forEach((line, idx)=>{
    const p = parseLineToPerson(line);
    if(p){ people.push(p); report.push(`✅ Line ${idx+1}: ${p.name} (${p.id})`); }
    else { report.push(`❌ Line ${idx+1}: could not parse`); }
  });
  if(!people.length){
    const pr = $('#pasteReport'); if (pr) pr.textContent = report.join('\n');
    return;
  }
  const ds = PF.load();
  people.forEach(p=>{
    const i = ds.people.findIndex(x=>x.id===p.id);
    if(i>=0){ ds.people[i] = p; report.push(`⚠️ Replaced existing ${p.id}`); }
    else { ds.people.push(p); }
  });
  PF.save(ds);
  const pr = $('#pasteReport'); if (pr) pr.textContent = report.join('\n') + `\n\nDone. Imported ${people.length} people.`;
  renderPeople(ds);
}

document.addEventListener('DOMContentLoaded', ()=>{
  const ds = PF.load();
  renderCategories(ds); renderPeople(ds); renderQuestions(ds);
  const imp = $('#btnImport'); if (imp) imp.addEventListener('click', doImport);
  const exp = $('#btnExport'); if (exp) exp.addEventListener('click', ()=>{
    const d = PF.load();
    const blob = new Blob([JSON.stringify(d,null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'pathfinder_dataset.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  // ----- Form Import (Friendly) -----
  if(document.getElementById('formImport')){
    // bootstrap lists
    FI.ensureSuggestionsFromDataset(ds);
    FI.renderLists();

    // render 1 initial row
    const tbody = document.getElementById('fi_tbody');
    const addOne = ()=> tbody.appendChild(FI.newRow());
    addOne();

    // buttons
    document.getElementById('fi_addRow').addEventListener('click', addOne);

    document.getElementById('fi_import').addEventListener('click', ()=>{
      const report = [];
      const rows = FI.collectRows();

      // validate & highlight
      let anyInvalid = false;
      rows.forEach(r=>{
        const errs = FI.validateRow(r);
        const rowEl = document.querySelectorAll('#fi_tbody tr')[r.idx];
        rowEl.style.outline = errs.length ? '2px solid #ef4444' : '';
        if(errs.length){ anyInvalid = true; report.push(`❌ Row ${r.idx+1}: ${errs.join(', ')}`); }
      });
      if(anyInvalid){
        document.getElementById('fi_report').textContent = report.join('\n') + '\nPlease fix highlighted rows.';
        return;
      }

      // build people; grow classification list if new
      const newPeople = [];
      rows.forEach(r=>{
        const domCat = ds.categories.find(c=>c.key==='domain');
        if(domCat){
          domCat.values ||= [];
          if(r.classification && !domCat.values.includes(r.classification)){
            domCat.values.push(r.classification);
            FI.sugg.classification.add(r.classification);
          }
        }

        if(r.role)     FI.sugg.role.add(r.role);
        if(r.sport)    FI.sugg.sport.add(r.sport);
        if(r.country)  FI.sugg.country.add(r.country);

        const attrs = {
          is_fictional: (r.fictional === 'true'),
          domain:       r.classification
        };
        if(r.role)     attrs.role     = r.role;
        if(r.country)  attrs.country  = r.country;
        if(r.sport && r.classification.toLowerCase()==='sports') attrs.sport = r.sport;
        if(r.topics)   attrs.topics   = r.topics.split(',').map(s=>s.trim()).filter(Boolean);

        const aliases = r.aliases ? r.aliases.split(',').map(s=>s.trim()).filter(Boolean) : [];
        const id = FI.slugId(r.name);

        // duplicate check — skip and report
        if(ds.people.find(p=>p.id===id)){
          report.push(`⚠️ Skipped: "${r.name}" — this person already exists`);
          return;
        }
        newPeople.push({ id, name:r.name, aliases, attrs });
      });

      // append to dataset
      newPeople.forEach(p=>ds.people.push(p));

      // optional auto-generate basic questions
      const autogen = document.getElementById('fi_autogen')?.checked;
      if(autogen){
        const ensureQ = (id, text, key, value, weight=2)=>{
          if(!ds.questions.find(q=>q.id===id)){
            ds.questions.push({ id, text, key, value, weight });
          }
        };
        ensureQ('q_fiction', 'Is the person fictional?', 'is_fictional', true, 3);

        newPeople.forEach(p=>{
          const a = p.attrs||{};
          if(a.domain){
            const id = `q_domain_${String(a.domain).toLowerCase().replace(/[^a-z0-9]+/g,'_')}`;
            ensureQ(id, `Is the person in ${a.domain}?`, 'domain', a.domain, 3);
          }
          if(a.sport){
            const id = `q_sport_${String(a.sport).toLowerCase().replace(/[^a-z0-9]+/g,'_')}`;
            ensureQ(id, `Is the person known for ${a.sport}?`, 'sport', a.sport, 3);
          }
          if(a.role){
            const id = `q_role_${String(a.role).toLowerCase().replace(/[^a-z0-9]+/g,'_')}`;
            ensureQ(id, `Is the person a ${a.role}?`, 'role', a.role, 2);
          }
          if(a.country){
            const id = `q_country_${String(a.country).toLowerCase().replace(/[^a-z0-9]+/g,'_')}`;
            ensureQ(id, `Is the person from ${a.country}?`, 'country', a.country, 2);
          }
          if(a.universe){
            const id = `q_universe_${String(a.universe).toLowerCase().replace(/[^a-z0-9]+/g,'_')}`;
            ensureQ(id, `Is the person from the ${a.universe} universe?`, 'universe', a.universe, 3);
          }
          if(a.era){
            const id = `q_era_${String(a.era).toLowerCase().replace(/[^a-z0-9]+/g,'_')}`;
            ensureQ(id, `Is the person from the ${a.era} era?`, 'era', a.era, 2);
          }
        });
      }

      PF.save(ds);
      renderCategories(ds); renderPeople(ds); renderQuestions(ds);
      FI.renderLists();

      const added = newPeople.length;
      if(added===0 && report.length===0) report.push('No new people to import.');
      document.getElementById('fi_report').textContent = (report.join('\n') + (added? `\n✅ Imported ${added} new people.`:'' )).trim();
    });
  }

  // ----- Paste Text Import -----
  const parseBtn = document.getElementById('btnParsePaste');
  const clearBtn = document.getElementById('btnClearPaste');
  if(parseBtn) parseBtn.addEventListener('click', doParsePaste);
  if(clearBtn) clearBtn.addEventListener('click', ()=>{
    const pb = document.getElementById('pasteBox');
    const pr = document.getElementById('pasteReport');
    if (pb) pb.value=''; if (pr) pr.textContent='';
  });
});
