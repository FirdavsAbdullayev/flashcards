/* =========================================================
   Flashcards — to'liq funksional ilova
   ========================================================= */

const STORAGE_WORDS = "flashcards_words_v2";
const STORAGE_SETTINGS = "flashcards_settings_v1";
const THEME_KEY = "flashcards_theme";
const LEGACY_WORDS = "flashcards_words_v1";

/* ---------- state ---------- */
let words = [];            // { id, front, back, learned }
let settings = { reverse: false, autoplay: false };
let order = [];            // array of word ids
let index = 0;
let flipped = false;

let filter = "all";
let query = "";

let quiz = null;

const $ = (id) => document.getElementById(id);

/* ---------- icons ---------- */
const svg = (paths, sw = 2) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
const ICONS = {
  arrow: svg('<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>'),
  star: svg('<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>'),
  edit: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>'),
  trash: svg('<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>'),
  check: svg('<path d="M20 6L9 17l-5-5"/>'),
  close: svg('<path d="M18 6L6 18M6 6l12 12"/>'),
};

/* ---------- element refs ---------- */
const els = {
  themeToggle: $("themeToggle"),
  addToggle: $("addToggle"),
  addPanel: $("addPanel"),
  form: $("wordForm"),
  front: $("front"),
  back: $("back"),
  bulkToggle: $("bulkToggle"),
  bulkArea: $("bulkArea"),
  bulkInput: $("bulkInput"),
  bulkAdd: $("bulkAdd"),
  exportBtn: $("exportBtn"),
  importFile: $("importFile"),

  tabs: $("tabs"),
  viewStudy: $("view-study"),
  viewQuiz: $("view-quiz"),
  viewManage: $("view-manage"),

  card: $("card"),
  cardScene: $("cardScene"),
  cardFront: $("cardFront"),
  cardBack: $("cardBack"),
  speakBtn: $("speakBtn"),
  counter: $("counter"),
  learnedStat: $("learnedStat"),
  remainingStat: $("remainingStat"),
  progressFill: $("progressFill"),
  prevBtn: $("prevBtn"),
  nextBtn: $("nextBtn"),
  flipBtn: $("flipBtn"),
  knownBtn: $("knownBtn"),
  unknownBtn: $("unknownBtn"),
  shuffleBtn: $("shuffleBtn"),
  resetBtn: $("resetBtn"),
  reverseToggle: $("reverseToggle"),
  autoplayToggle: $("autoplayToggle"),
  studyEmpty: $("studyEmpty"),

  quizSetup: $("quizSetup"),
  quizPlay: $("quizPlay"),
  quizResult: $("quizResult"),
  quizCount: $("quizCount"),
  quizDir: $("quizDir"),
  startQuiz: $("startQuiz"),
  quizWarn: $("quizWarn"),
  quizCounter: $("quizCounter"),
  quizScore: $("quizScore"),
  quizProgress: $("quizProgress"),
  quizQuestion: $("quizQuestion"),
  quizOptions: $("quizOptions"),
  resultRing: $("resultRing"),
  resultPercent: $("resultPercent"),
  resultTitle: $("resultTitle"),
  resultText: $("resultText"),
  retryQuiz: $("retryQuiz"),
  backToSetup: $("backToSetup"),

  searchInput: $("searchInput"),
  filters: $("filters"),
  list: $("wordList"),
  emptyList: $("emptyList"),
  clearAllBtn: $("clearAllBtn"),

  helpBtn: $("helpBtn"),
  helpModal: $("helpModal"),
  closeHelp: $("closeHelp"),
  toast: $("toast"),
  confetti: $("confettiLayer"),
};

/* =========================================================
   Storage
   ========================================================= */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function normalizeWord(w) {
  return {
    id: w.id || uid(),
    front: String(w.front ?? "").trim(),
    back: String(w.back ?? "").trim(),
    learned: !!w.learned,
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_WORDS);
    words = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(words)) words = [];
  } catch {
    words = [];
  }
  words = words.filter((w) => w && w.front && w.back).map(normalizeWord);

  if (words.length === 0) {
    try {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_WORDS) || "[]");
      if (Array.isArray(legacy) && legacy.length) {
        words = legacy.filter((w) => w && w.front && w.back).map(normalizeWord);
        save();
      }
    } catch {}
  }

  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_SETTINGS) || "{}");
    settings.reverse = !!s.reverse;
    settings.autoplay = !!s.autoplay;
  } catch {}
}

function save() {
  localStorage.setItem(STORAGE_WORDS, JSON.stringify(words));
}
function saveSettings() {
  localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(settings));
}

/* =========================================================
   Theme
   ========================================================= */
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
}
function initTheme() {
  els.themeToggle.addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.classList.add("theme-anim");
    applyTheme(next);
    setTimeout(() => document.documentElement.classList.remove("theme-anim"), 550);
  });
}

/* =========================================================
   Toast & helpers
   ========================================================= */
let toastTimer;
function toast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2200);
}

function wordById(id) {
  return words.find((w) => w.id === id);
}

function speak(text) {
  if (!("speechSynthesis" in window)) {
    toast("Talaffuz qo'llab-quvvatlanmaydi");
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = /[а-яА-ЯёЁ]/.test(text) ? "ru-RU" : "en-US";
  u.rate = 0.7;
  u.pitch = 1.05;
  u.volume = 1;
  u.onstart = () => els.speakBtn.classList.add("playing");
  u.onend = u.onerror = () => els.speakBtn.classList.remove("playing");
  window.speechSynthesis.speak(u);
}

/* =========================================================
   Study — order, render, navigation
   ========================================================= */
function buildOrder(shuffle = false, onlyUnlearned = false) {
  let pool = words;
  if (onlyUnlearned) pool = words.filter((w) => !w.learned);
  const ids = pool.map((w) => w.id);
  if (shuffle) {
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
  }
  order = ids;
  index = 0;
  flipped = false;
  els.card.classList.remove("flipped");
}

function currentWord() {
  if (order.length === 0) return null;
  return wordById(order[index]) || null;
}

function updateStats() {
  const total = words.length;
  const learned = words.filter((w) => w.learned).length;
  els.counter.textContent = order.length ? `${index + 1} / ${order.length}` : "0 / 0";
  els.learnedStat.textContent = `O'rganildi: ${learned}`;
  els.remainingStat.textContent = `Qoldi: ${total - learned}`;
  const pct = total ? Math.round((learned / total) * 100) : 0;
  els.progressFill.style.width = pct + "%";
}

function renderCard(autoplay = true) {
  const w = currentWord();

  if (!w) {
    els.cardFront.textContent = "So'z qo'shing";
    els.cardBack.textContent = "Tarjima";
    els.studyEmpty.classList.remove("hidden");
    els.cardScene.style.visibility = "hidden";
    [els.prevBtn, els.nextBtn, els.flipBtn, els.knownBtn, els.unknownBtn, els.speakBtn].forEach(
      (b) => (b.disabled = true)
    );
    updateStats();
    return;
  }

  els.studyEmpty.classList.add("hidden");
  els.cardScene.style.visibility = "visible";
  [els.prevBtn, els.nextBtn, els.flipBtn, els.knownBtn, els.unknownBtn, els.speakBtn].forEach(
    (b) => (b.disabled = false)
  );

  const q = settings.reverse ? w.back : w.front;
  const a = settings.reverse ? w.front : w.back;
  els.cardFront.textContent = q;
  els.cardBack.textContent = a;

  els.cardFront.style.animation = "none";
  els.cardBack.style.animation = "none";
  void els.cardFront.offsetWidth;
  els.cardFront.style.animation = "";
  els.cardBack.style.animation = "";

  updateStats();

  if (settings.autoplay && autoplay) {
    setTimeout(() => speak(q), 260);
  }
}

function flip() {
  if (order.length === 0) return;
  flipped = !flipped;
  els.card.classList.toggle("flipped", flipped);
}

function go(delta) {
  if (order.length === 0) return;
  index = (index + delta + order.length) % order.length;
  flipped = false;
  els.card.classList.remove("flipped");
  renderCard();
}

function mark(known) {
  const w = currentWord();
  if (!w) return;
  const wasLearned = w.learned;
  w.learned = known;
  save();

  if (known && !wasLearned) {
    toast("Ajoyib! " + w.front + " o'rganildi");
  } else if (!known && wasLearned) {
    toast("Yana takrorlash kerak");
  }

  const allLearned = words.length > 0 && words.every((x) => x.learned);
  updateStats();

  if (allLearned) {
    confetti(120);
    toast("Tabriklaymiz! Barcha so'zlar o'rganildi");
  }

  setTimeout(() => go(1), 180);
}

/* =========================================================
   Quiz
   ========================================================= */
function shuffleArr(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function startQuiz() {
  if (words.length < 2) {
    els.quizWarn.classList.remove("hidden");
    return;
  }
  els.quizWarn.classList.add("hidden");

  const dir = els.quizDir.value; // f2b | b2f
  const count = Number(els.quizCount.value);
  let pool = shuffleArr(words);
  if (count > 0) pool = pool.slice(0, Math.min(count, pool.length));

  const questions = pool.map((w) => {
    const prompt = dir === "f2b" ? w.front : w.back;
    const correct = dir === "f2b" ? w.back : w.front;
    const others = shuffleArr(words.filter((x) => x.id !== w.id))
      .map((x) => (dir === "f2b" ? x.back : x.front))
      .filter((t) => t !== correct);
    const opts = shuffleArr([correct, ...others.slice(0, 3)]);
    return { prompt, correct, opts, word: w };
  });

  quiz = { questions, i: 0, score: 0, dir };
  els.quizSetup.classList.add("hidden");
  els.quizResult.classList.add("hidden");
  els.quizPlay.classList.remove("hidden");
  renderQuestion();
}

function renderQuestion() {
  const q = quiz.questions[quiz.i];
  const total = quiz.questions.length;
  els.quizCounter.textContent = `${quiz.i + 1} / ${total}`;
  els.quizScore.textContent = `Ball: ${quiz.score}`;
  els.quizProgress.style.width = Math.round((quiz.i / total) * 100) + "%";
  els.quizQuestion.textContent = q.prompt;

  els.quizOptions.innerHTML = "";
  q.opts.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.className = "option";
    btn.style.animationDelay = i * 0.05 + "s";
    btn.innerHTML = `<span class="key">${i + 1}</span><span>${escapeHtml(opt)}</span>`;
    btn.addEventListener("click", () => answer(btn, opt));
    els.quizOptions.appendChild(btn);
  });
}

function answer(btn, opt) {
  if (quiz.locked) return;
  quiz.locked = true;
  const q = quiz.questions[quiz.i];
  const correct = opt === q.correct;

  const buttons = [...els.quizOptions.children];
  buttons.forEach((b, i) => {
    b.disabled = true;
    const val = q.opts[i];
    if (val === q.correct) b.classList.add("correct");
    else if (b === btn) b.classList.add("wrong");
  });

  if (correct) {
    quiz.score++;
    q.word.learned = true;
    save();
  }
  els.quizScore.textContent = `Ball: ${quiz.score}`;

  setTimeout(() => {
    quiz.locked = false;
    quiz.i++;
    if (quiz.i >= quiz.questions.length) showResult();
    else renderQuestion();
  }, correct ? 650 : 1000);
}

function showResult() {
  els.quizPlay.classList.add("hidden");
  els.quizResult.classList.remove("hidden");
  const total = quiz.questions.length;
  const pct = total ? Math.round((quiz.score / total) * 100) : 0;

  els.resultRing.style.setProperty("--pct", pct + "%");
  els.resultPercent.textContent = pct + "%";
  els.resultText.textContent = `${total} savoldan ${quiz.score} ta to'g'ri.`;

  let title = "Yana urinib ko'ring!";
  if (pct === 100) title = "Mukammal natija!";
  else if (pct >= 80) title = "Ajoyib natija!";
  else if (pct >= 50) title = "Yaxshi natija!";
  els.resultTitle.textContent = title;

  updateStats();
  if (pct >= 80) confetti(100);
}

/* =========================================================
   Manage list
   ========================================================= */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function visibleWords() {
  const q = query.trim().toLowerCase();
  return words.filter((w) => {
    if (filter === "learned" && !w.learned) return false;
    if (filter === "unlearned" && w.learned) return false;
    if (!q) return true;
    return w.front.toLowerCase().includes(q) || w.back.toLowerCase().includes(q);
  });
}

function renderList() {
  const list = visibleWords();
  els.list.innerHTML = "";
  els.emptyList.classList.toggle("hidden", list.length > 0);

  list.forEach((w, i) => {
    const li = document.createElement("li");
    li.style.animationDelay = Math.min(i * 0.03, 0.5) + "s";
    if (w.learned) li.classList.add("learned");

    const star = document.createElement("button");
    star.className = "star-btn" + (w.learned ? " on" : "");
    star.innerHTML = ICONS.star;
    star.title = w.learned ? "O'rganilgan" : "O'rganilmagan";
    star.style.color = w.learned ? "" : "";
    star.addEventListener("click", () => toggleLearned(w.id));

    const pair = document.createElement("div");
    pair.className = "pair";
    const front = document.createElement("span");
    front.className = "front";
    front.textContent = w.front;
    const sep = document.createElement("span");
    sep.className = "sep";
    sep.innerHTML = ICONS.arrow;
    const back = document.createElement("span");
    back.className = "back";
    back.textContent = w.back;
    pair.append(front, sep, back);

    const actions = document.createElement("div");
    actions.className = "row-actions";
    const editBtn = document.createElement("button");
    editBtn.className = "row-btn edit";
    editBtn.innerHTML = ICONS.edit;
    editBtn.title = "Tahrirlash";
    editBtn.addEventListener("click", () => startEdit(li, w));
    const delBtn = document.createElement("button");
    delBtn.className = "row-btn del";
    delBtn.innerHTML = ICONS.trash;
    delBtn.title = "O'chirish";
    delBtn.addEventListener("click", () => removeWord(w.id));
    actions.append(editBtn, delBtn);

    li.append(star, pair, actions);
    els.list.appendChild(li);
  });
}

function startEdit(li, w) {
  li.classList.add("editing");
  li.innerHTML = "";

  const frontIn = document.createElement("input");
  frontIn.type = "text";
  frontIn.className = "edit-input";
  frontIn.value = w.front;
  const backIn = document.createElement("input");
  backIn.type = "text";
  backIn.className = "edit-input";
  backIn.value = w.back;

  const saveBtn = document.createElement("button");
  saveBtn.className = "row-btn edit";
  saveBtn.innerHTML = ICONS.check;
  saveBtn.title = "Saqlash";
  const cancelBtn = document.createElement("button");
  cancelBtn.className = "row-btn del";
  cancelBtn.innerHTML = ICONS.close;
  cancelBtn.title = "Bekor qilish";

  const commit = () => {
    const f = frontIn.value.trim();
    const b = backIn.value.trim();
    if (f && b) {
      w.front = f;
      w.back = b;
      save();
      renderList();
      renderCard(false);
      toast("Saqlandi");
    } else {
      toast("Ikkala maydon ham to'ldirilishi kerak");
    }
  };
  saveBtn.addEventListener("click", commit);
  cancelBtn.addEventListener("click", renderList);
  frontIn.addEventListener("keydown", (e) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") renderList();
  });
  backIn.addEventListener("keydown", (e) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") renderList();
  });

  li.append(frontIn, backIn, saveBtn, cancelBtn);
  frontIn.focus();
}

function toggleLearned(id) {
  const w = wordById(id);
  if (!w) return;
  w.learned = !w.learned;
  save();
  renderList();
  updateStats();
  if (w.learned) toast("O'rganilgan deb belgilandi");
}

function removeWord(id) {
  words = words.filter((w) => w.id !== id);
  save();
  buildOrder(false);
  renderCard(false);
  renderList();
  toast("So'z o'chirildi");
}

function addWord(front, back) {
  front = String(front).trim();
  back = String(back).trim();
  if (!front || !back) return false;
  words.push({ id: uid(), front, back, learned: false });
  return true;
}

function refreshAfterAdd() {
  save();
  renderList();
  renderCard(false);
  updateStats();
}

/* =========================================================
   Confetti
   ========================================================= */
function confetti(amount = 80) {
  const colors = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b", "#10b981", "#06b6d4", "#0ea5e9"];
  for (let i = 0; i < amount; i++) {
    const p = document.createElement("span");
    p.className = "confetti-piece";
    p.style.left = Math.random() * 100 + "vw";
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.animationDuration = 2 + Math.random() * 2 + "s";
    p.style.animationDelay = Math.random() * 0.4 + "s";
    p.style.width = 6 + Math.random() * 8 + "px";
    p.style.height = 8 + Math.random() * 10 + "px";
    els.confetti.appendChild(p);
    setTimeout(() => p.remove(), 4600);
  }
}

/* =========================================================
   View switching (tabs)
   ========================================================= */
function switchView(view) {
  [...els.tabs.children].forEach((t) => t.classList.toggle("active", t.dataset.view === view));
  els.viewStudy.classList.toggle("active", view === "study");
  els.viewQuiz.classList.toggle("active", view === "quiz");
  els.viewManage.classList.toggle("active", view === "manage");
  if (view === "study") renderCard(false);
  if (view === "manage") renderList();
}

/* =========================================================
   Event wiring
   ========================================================= */
function initEvents() {
  // add panel collapse
  els.addToggle.addEventListener("click", () => {
    els.addPanel.classList.toggle("collapsed");
    els.addToggle.setAttribute("aria-expanded", String(!els.addPanel.classList.contains("collapsed")));
  });

  // add form
  els.form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (addWord(els.front.value, els.back.value)) {
      els.front.value = "";
      els.back.value = "";
      els.front.focus();
      buildOrder(false, false);
      refreshAfterAdd();
      toast("So'z qo'shildi");
    }
  });

  // bulk
  els.bulkToggle.addEventListener("click", () => els.bulkArea.classList.toggle("hidden"));
  els.bulkAdd.addEventListener("click", () => {
    const lines = els.bulkInput.value.split("\n");
    let added = 0;
    lines.forEach((line) => {
      line = line.trim();
      if (!line) return;
      let front, back;
      if (line.includes("=")) {
        const p = line.split("=");
        front = p[0];
        back = p.slice(1).join("=");
      } else if (line.includes(",")) {
        const p = line.split(",");
        front = p[0];
        back = p.slice(1).join(",");
      } else return;
      if (addWord(front, back)) added++;
    });
    if (added) {
      els.bulkInput.value = "";
      buildOrder(false, false);
      refreshAfterAdd();
    }
    toast(added + " ta so'z qo'shildi");
  });

  // export / import
  els.exportBtn.addEventListener("click", () => {
    if (!words.length) return toast("Eksport uchun so'z yo'q");
    const data = words.map(({ front, back, learned }) => ({ front, back, learned }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "flashcards.json";
    a.click();
    URL.revokeObjectURL(url);
    toast("Eksport qilindi");
  });

  els.importFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let added = 0;
      try {
        const text = String(reader.result).trim();
        if (text.startsWith("[")) {
          const data = JSON.parse(text);
          if (Array.isArray(data)) {
            data.forEach((item) => {
              if (item && item.front && item.back) {
                const w = normalizeWord(item);
                words.push(w);
                added++;
              }
            });
          }
        } else {
          text.split(/\r?\n/).forEach((line) => {
            line = line.trim();
            if (!line) return;
            const parts = line.split(/[,;\t]|=/).map((s) => s.trim()).filter(Boolean);
            if (parts.length >= 2 && addWord(parts[0], parts.slice(1).join(" "))) added++;
          });
        }
      } catch {
        toast("Fayl o'qishda xatolik");
        e.target.value = "";
        return;
      }
      if (added) {
        save();
        buildOrder(false, false);
        refreshAfterAdd();
        toast("Import: " + added + " ta so'z qo'shildi");
      } else {
        toast("Mos so'z topilmadi");
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  });

  // tabs
  els.tabs.addEventListener("click", (e) => {
    const tab = e.target.closest(".tab");
    if (tab) switchView(tab.dataset.view);
  });

  // study controls
  els.card.addEventListener("click", flip);
  els.flipBtn.addEventListener("click", flip);
  els.prevBtn.addEventListener("click", () => go(-1));
  els.nextBtn.addEventListener("click", () => go(1));
  els.knownBtn.addEventListener("click", () => mark(true));
  els.unknownBtn.addEventListener("click", () => mark(false));
  els.speakBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const w = currentWord();
    if (!w) return;
    speak(settings.reverse ? w.back : w.front);
  });
  els.shuffleBtn.addEventListener("click", () => {
    buildOrder(true, false);
    renderCard();
    toast("Aralashtirildi");
  });
  els.resetBtn.addEventListener("click", () => {
    buildOrder(false, false);
    renderCard();
  });
  els.reverseToggle.addEventListener("change", () => {
    settings.reverse = els.reverseToggle.checked;
    saveSettings();
    flipped = false;
    els.card.classList.remove("flipped");
    renderCard();
  });
  els.autoplayToggle.addEventListener("change", () => {
    settings.autoplay = els.autoplayToggle.checked;
    saveSettings();
  });

  // quiz
  els.startQuiz.addEventListener("click", startQuiz);
  els.retryQuiz.addEventListener("click", () => {
    els.quizResult.classList.add("hidden");
    els.quizPlay.classList.remove("hidden");
    startQuiz();
  });
  els.backToSetup.addEventListener("click", () => {
    els.quizResult.classList.add("hidden");
    els.quizPlay.classList.add("hidden");
    els.quizSetup.classList.remove("hidden");
  });

  // manage tools
  els.searchInput.addEventListener("input", () => {
    query = els.searchInput.value;
    renderList();
  });
  els.filters.addEventListener("click", (e) => {
    const f = e.target.closest(".filter");
    if (!f) return;
    filter = f.dataset.filter;
    [...els.filters.children].forEach((b) => b.classList.toggle("active", b === f));
    renderList();
  });
  els.clearAllBtn.addEventListener("click", () => {
    if (!words.length) return;
    if (confirm("Barcha so'zlarni o'chirmoqchimisiz?")) {
      words = [];
      save();
      buildOrder(false, false);
      renderCard(false);
      renderList();
      toast("Hammasi o'chirildi");
    }
  });

  // help modal
  els.helpBtn.addEventListener("click", () => els.helpModal.classList.remove("hidden"));
  els.closeHelp.addEventListener("click", () => els.helpModal.classList.add("hidden"));
  els.helpModal.addEventListener("click", (e) => {
    if (e.target === els.helpModal) els.helpModal.classList.add("hidden");
  });

  // keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    const tag = (e.target.tagName || "").toLowerCase();
    const typing = tag === "input" || tag === "textarea" || tag === "select";

    if (e.key === "Escape") {
      els.helpModal.classList.add("hidden");
      return;
    }
    if (typing) return;

    const studyActive = els.viewStudy.classList.contains("active");
    const quizActive = els.viewQuiz.classList.contains("active") && !els.quizPlay.classList.contains("hidden");

    if (quizActive && !quiz.locked && /^[1-4]$/.test(e.key)) {
      const btns = [...els.quizOptions.children];
      const b = btns[Number(e.key) - 1];
      if (b && !b.disabled) b.click();
      return;
    }
    if (!studyActive) return;

    if (e.key === "ArrowRight") go(1);
    else if (e.key === "ArrowLeft") go(-1);
    else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      flip();
    } else if (e.key === "k" || e.key === "K") mark(true);
    else if (e.key === "j" || e.key === "J") mark(false);
    else if (e.key === "s" || e.key === "S") {
      const w = currentWord();
      if (w) speak(settings.reverse ? w.back : w.front);
    }
  });
}

/* =========================================================
   Init
   ========================================================= */
function init() {
  load();
  initTheme();
  els.reverseToggle.checked = settings.reverse;
  els.autoplayToggle.checked = settings.autoplay;
  buildOrder(false, false);
  initEvents();
  renderCard(false);
  renderList();
  updateStats();
}

init();
