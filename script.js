
// — Much better euphonic name generator with weighting, syllable smoothing, and scoring —
const weightedOnsets = [
  ["", 5], ["b", 8], ["d", 8], ["m", 9], ["n", 9], ["r", 8], ["s", 9], ["t", 9], ["l", 7], ["v", 6],
  ["p", 6], ["f", 5], ["g", 5], ["h", 4], ["k", 4], ["w", 3], ["z", 2], ["ch", 3], ["sh", 4], ["th", 3],
  ["br", 3], ["cr", 2], ["dr", 2], ["pl", 2], ["pr", 3], ["tr", 3], ["sl", 2], ["gl", 1], ["kl", 1], ["fl", 1]
];
const weightedCodas = [
  ["", 6], ["n", 9], ["m", 8], ["r", 8], ["l", 7], ["s", 5], ["t", 6], ["d", 4],
  ["nd", 3], ["rt", 2], ["ld", 2], ["ng", 4], ["st", 3], ["sk", 1]
];
const weightedNuclei = [
  ["a", 10], ["e", 10], ["i", 9], ["o", 9], ["u", 6], ["y", 4],
  ["ae", 3], ["ai", 3], ["ea", 2], ["io", 2], ["ia", 2], ["oa", 2], ["ou", 2], ["ue", 1]
];
const suffixesBetter = ["ian","elle","ara","ion","ius","or","en","is","os","a","ix","on","eus","al"];
const bannedClusters = ["bk","dt","gh","kp","qg","zx","xz"];

// Weighted random selection
function weightedRandom(pairs){
  const total = pairs.reduce((sum,p) => sum + p[1], 0);
  let r = Math.random() * total;
  for(const [item, weight] of pairs){
    if(r < weight) return item;
    r -= weight;
  }
  return pairs[0][0];
}

function isVowel(ch){
  return /[aeiouy]/i.test(ch);
}

function sanitizeName(name){
  name = name.replace(/(.)\1{2,}/gi, "$1$1");
  bannedClusters.forEach(b => {
    const regex = new RegExp(b, "gi");
    if(regex.test(name)){
      name = name.replace(regex, b[0]);
    }
  });
  name = name.replace(/([^aeiouy]){3,}/gi, m => m.slice(0,2));
  return name;
}

function scoreName(name){
  let score = 0;
  if(name.length >= 4 && name.length <= 10) score += 5;
  else score -= 3;
  for(let i=0;i<name.length-1;i++){
    const a = name[i];
    const b = name[i+1];
    if(isVowel(a) !== isVowel(b)) score += 0.5;
    else score -= 0.1;
  }
  const triples = name.match(/([aeiouy]{3,})|(([^aeiouy]){3,})/gi);
  if(triples) score -= triples.length * 1;
  if(/[aeiouy]$/.test(name) || /[nmlr]$/.test(name)) score += 2;
  if(/^[bcdfghjklmnpqrstvwxyz]/i.test(name)) score += 1;
  score += Math.random() * 0.5;
  return score;
}

function buildSyllable(prevLastChar){
  let onset = weightedRandom(weightedOnsets);
  if(prevLastChar && isVowel(prevLastChar) && onset === "") {
    onset = weightedOnsets.find(p => p[0] !== "" && !isVowel(p[0][0]))?.[0] || "";
  }
  const nucleus = weightedRandom(weightedNuclei);
  let coda = weightedRandom(weightedCodas);
  let syl = onset + nucleus + coda;
  if(prevLastChar && syl[0] && prevLastChar.toLowerCase() === syl[0].toLowerCase()){
    syl = syl.slice(1);
  }
  return syl;
}

function generateNickname(){
  const syllableCount = Math.random() < 0.7 ? 2 : 3;
  let best = "";
  let bestScore = -Infinity;
  for(let attempt=0; attempt<12; attempt++){
    let name = "";
    let prevLast = "";
    for(let i=0;i<syllableCount;i++){
      const syl = buildSyllable(prevLast);
      name += syl;
      prevLast = syl.slice(-1);
    }
    if(Math.random() < 0.4){
      name += weightedRandom(suffixesBetter.map(s=>[s,1]));
    }
    name = sanitizeName(name);
    if(name.length === 0) name = "Nex";
    name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    const sc = scoreName(name);
    if(sc > bestScore){
      bestScore = sc;
      best = name;
    }
  }
  return best;
}

// Clipboard support detection & copy abstraction
function supportsExecCopy(){
  try{ return typeof document.queryCommandSupported === 'function' && document.queryCommandSupported('copy'); }
  catch{return false;}
}
function copyTextToClipboard(text){
  if(navigator.clipboard && typeof navigator.clipboard.writeText === 'function'){
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve,reject)=>{
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly','');
    ta.style.position='absolute'; ta.style.left='-9999px';
    document.body.appendChild(ta); ta.select();
    try{ const ok = document.execCommand('copy'); document.body.removeChild(ta); if(ok) resolve(); else reject(new Error('execCommand fallback failed')); }
    catch(e){ document.body.removeChild(ta); reject(e); }
  });
}

// Elements
const outputEl = document.getElementById('output');
const nicknameEl = document.getElementById('nickname');
const generateBtn = document.getElementById('generate');
const autoCopyToggle = document.getElementById('autoCopyToggle');
const toggleLabel = document.getElementById('toggle-label');
const statusEl = document.getElementById('support-status');

// Feature detection
const hasClipboardAPI = !!(navigator.clipboard && typeof navigator.clipboard.writeText === 'function');
const hasExecCommand = supportsExecCopy();
const canCopy = hasClipboardAPI || hasExecCommand;

// Persistence
const STORAGE_KEY = 'nickname_auto_copy_enabled';
let autoCopyEnabled = true;
try{ const stored = localStorage.getItem(STORAGE_KEY); if(stored !== null) autoCopyEnabled = stored === 'true'; }catch{}
autoCopyToggle.checked = autoCopyEnabled;

// UI sync
function updateToggleUI(){
  toggleLabel.textContent = `Auto-copy: ${autoCopyEnabled? 'On':'Off'}`;
  autoCopyToggle.setAttribute('aria-checked', autoCopyEnabled);
  if(!canCopy){
    statusEl.textContent = 'Clipboard unsupported; manual copy via selection or Ctrl+C';
  } else {
    statusEl.textContent = autoCopyEnabled ? 'Auto-copy enabled' : 'Auto-copy disabled';
  }
}
updateToggleUI();
autoCopyToggle.addEventListener('change', ()=>{
  autoCopyEnabled = autoCopyToggle.checked;
  try{ localStorage.setItem(STORAGE_KEY, autoCopyEnabled); }catch{}
  updateToggleUI();
});

// Animation constants
const OUT_DURATION = 140;
const LETTER_DELAY = 18;
const GLOW_DURATION = 300;

async function showNickname(nick){
  if(window.getSelection) window.getSelection().removeAllRanges();
  const oldLetters = Array.from(nicknameEl.querySelectorAll('.letter'));
  if(oldLetters.length){
    oldLetters.forEach(l => l.classList.add('fade-out'));
    await new Promise(r => setTimeout(r, OUT_DURATION));
  }
  nicknameEl.textContent = '';
  const frag = document.createDocumentFragment();
  for(let i=0;i<nick.length;i++){
    const span = document.createElement('span');
    span.textContent = nick[i];
    span.classList.add('letter');
    span.style.animationDelay = `${i * LETTER_DELAY}ms`;
    frag.appendChild(span);
  }
  nicknameEl.appendChild(frag);
  requestAnimationFrame(()=>{
    nicknameEl.querySelectorAll('.letter').forEach(l => l.classList.add('pop-in'));
  });
  outputEl.classList.add('glow');
  setTimeout(()=> outputEl.classList.remove('glow'), GLOW_DURATION);
}

function selectOutput(){
  const range = document.createRange();
  range.selectNodeContents(nicknameEl);
  const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
}

async function handleGenerate(){
  const nick = generateNickname();
  if(autoCopyEnabled && canCopy){
    try{
      await copyTextToClipboard(nick);
      statusEl.textContent = 'Auto-copied';
    } catch(e){
      console.warn('Auto-copy failed', e);
      selectOutput();
      statusEl.textContent = 'Auto-copy failed; press Ctrl+C';
    }
  }
  await showNickname(nick);
}

generateBtn.addEventListener('click', handleGenerate);
outputEl.addEventListener('click', ()=>{ selectOutput(); statusEl.textContent='Selected for manual copy'; });
outputEl.addEventListener('keydown', e=>{ if(e.key==='Enter') generateBtn.click(); });

// Initial render & tests
(async ()=>{
  try{
    const initial = generateNickname();
    await showNickname(initial);
    console.assert(typeof initial === 'string' && initial.length>0, 'generateNickname should return non-empty string');
    const samples = new Set();
    for(let i=0;i<10;i++){ const n=generateNickname(); console.assert(typeof n==='string'&&n.length>0); samples.add(n); }
    console.assert(samples.size>1,'Nicknames should vary');
    console.log('Clipboard support', {hasClipboardAPI, hasExecCommand});
  } catch(e){ console.warn('Self-test error', e); }
})();
