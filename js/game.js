// Game UI logic
let session = null;
const $ = (s)=>document.querySelector(s);
const flowList = $('#flowList');
const flowPanel = $('#flowPanel');
const questionText = $('#questionText');
const qCountEl = $('#qCount');
const guessCard = $('#guessCard');
const guessName = $('#guessName');
const guessNo = $('#guessNo');

function renderFlowItem(q, ans){
  const li = document.createElement('li');
  li.textContent = `${q.text} — ${ans ? 'Yes' : 'No'}`;
  flowList.appendChild(li);
}

function askNext(){
  const q = session.pickNextQuestion();
  if(!q){
    return showGuess();
  }
  questionText.dataset.qid = q.id;
  questionText.textContent = q.text;
}

function showGuess(){
  const { topId, topScore, secondScore } = session.topCandidates();
  if(topId && (topScore - secondScore) < (session.state.dataset.meta.threshold ?? 10)){
    const tq = session.tiebreaker();
    if(tq){
      questionText.dataset.qid = tq.id;
      questionText.textContent = tq.text + " (tie-breaker)";
      return;
    }
  }
  const best = session.state.dataset.people.find(p=>p.id===session.topCandidates().topId);
  if(!best){
    questionText.textContent = "I'm out of questions. Please teach me.";
    guessCard.classList.remove('hidden');
    guessName.textContent = "Unknown";
    return;
  }
  guessName.textContent = best.name;
  guessNo.href = "teach.html?failFor=" + encodeURIComponent(best.id);
  guessCard.classList.remove('hidden');
}

function onAnswer(isYes){
  const qid = questionText.dataset.qid;
  const q = session.state.dataset.questions.find(x=>x.id===qid);
  if(!q) return;
  session.applyAnswer(qid, isYes);
  qCountEl.textContent = session.state.qCount;
  renderFlowItem(q, isYes);

  if(session.shouldGuess()){
    showGuess();
  }else{
    askNext();
  }
}

function init(){
  const ds = PF.load();
  if(!ds?.people?.length || !ds?.questions?.length){
    questionText.textContent = "Dataset is empty. Go to Admin to import data.";
    return;
  }
  session = PF.createSession(ds);
  askNext();

  $('#btnYes').addEventListener('click', ()=>onAnswer(true));
  $('#btnNo').addEventListener('click', ()=>onAnswer(false));

  $('#toggleFlow').addEventListener('click', ()=>{
    flowPanel.classList.toggle('hidden');
    $('#toggleFlow').textContent = flowPanel.classList.contains('hidden') ? 'Show Flow' : 'Hide Flow';
  });

  $('#guessYes').addEventListener('click', ()=>{
    alert("Nice! Play again.");
    window.location.href = 'play.html';
  });
}

document.addEventListener('DOMContentLoaded', init);
