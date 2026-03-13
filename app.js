// ===========================
// State
// ===========================
const state = {
  currentPage: 'today',
  // Flashcard
  flashcardWords: [],
  flashcardIndex: 0,
  flashcardFlipped: false,
  flashcardFilter: 'all',
  flashcardShuffle: false,
  // Quiz
  quizWords: [],
  quizIndex: 0,
  quizScore: 0,
  quizAnswered: false,
  quizTotal: 10,
  quizLevel: 'all',
  quizType: 'en-to-kr',
  // Word List
  searchQuery: '',
  listFilter: 'all',
  // Modal
  modalWord: null,
  // Memory Game
  gameLevel: 'all',
  gamePairs: 8,
  gameCards: [],
  gameFirst: null,
  gameSecond: null,
  gameChecking: false,
  gameMoves: 0,
  gameMatched: 0,
  gameTotal: 0,
  gameStartTime: null,
  gameTimerInterval: null,
};

// ===========================
// Storage Helpers
// ===========================
function getStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Storage error:', e);
  }
}

function getFavorites() {
  return getStorage('vocab_favorites') || [];
}

function toggleFavorite(id) {
  const favs = getFavorites();
  const idx = favs.indexOf(id);
  if (idx === -1) {
    favs.push(id);
    showToast('즐겨찾기에 추가되었어요 ⭐');
  } else {
    favs.splice(idx, 1);
    showToast('즐겨찾기에서 제거되었어요');
  }
  setStorage('vocab_favorites', favs);
  return favs.indexOf(id) !== -1;
}

function isFavorite(id) {
  return getFavorites().includes(id);
}

function getStudied() {
  return getStorage('vocab_studied') || {};
}

function markStudied(wordId) {
  const studied = getStudied();
  const today = getTodayKey();
  if (!studied[today]) studied[today] = [];
  if (!studied[today].includes(wordId)) {
    const prevCount = studied[today].length;
    studied[today].push(wordId);
    setStorage('vocab_studied', studied);
    updateStreak();
    // Check if daily goal just achieved
    const goal = getDailyGoal();
    if (prevCount < goal && studied[today].length >= goal) {
      setTimeout(() => showToast('🎉 오늘의 학습 목표를 달성했어요!'), 500);
    }
    // Update goal progress bar if on today page
    if (state.currentPage === 'today') renderGoalProgress();
  }
}

function getTotalStudied() {
  const studied = getStudied();
  const allIds = new Set();
  Object.values(studied).forEach(arr => arr.forEach(id => allIds.add(id)));
  return allIds.size;
}

function getQuizHistory() {
  return getStorage('vocab_quiz_history') || [];
}

function saveQuizResult(score, total) {
  const history = getQuizHistory();
  history.unshift({ date: getTodayKey(), score, total, pct: Math.round(score / total * 100) });
  if (history.length > 20) history.pop();
  setStorage('vocab_quiz_history', history);
}

function getStreak() {
  return getStorage('vocab_streak') || { lastDate: null, count: 0 };
}

function updateStreak() {
  const streak = getStreak();
  const today = getTodayKey();
  if (streak.lastDate === today) return;
  const yesterday = getDateKey(new Date(Date.now() - 86400000));
  if (streak.lastDate === yesterday) {
    streak.count += 1;
  } else if (streak.lastDate !== today) {
    streak.count = 1;
  }
  streak.lastDate = today;
  setStorage('vocab_streak', streak);
  return streak;
}

// ===========================
// Daily Goal
// ===========================
function getDailyGoal() {
  return getStorage('vocab_daily_goal') || 5;
}

function setDailyGoal(goal) {
  setStorage('vocab_daily_goal', Math.max(1, Math.min(30, goal)));
}

function getTodayStudiedCount() {
  const studied = getStudied();
  const today = getTodayKey();
  return (studied[today] || []).length;
}

function adjustGoal(delta) {
  setDailyGoal(getDailyGoal() + delta);
  renderGoalProgress();
}

function renderGoalProgress() {
  const container = document.getElementById('goal-progress');
  if (!container) return;
  const goal = getDailyGoal();
  const count = getTodayStudiedCount();
  const pct = Math.min(100, Math.round((count / goal) * 100));
  const achieved = count >= goal;
  const remaining = Math.max(0, goal - count);

  container.innerHTML = `
    <div class="goal-header">
      <span class="goal-title">🎯 오늘의 목표</span>
      <span class="goal-count${achieved ? ' achieved' : ''}">${count} / ${goal}단어</span>
    </div>
    <div class="goal-bar-wrap">
      <div class="goal-bar-fill${achieved ? ' achieved' : ''}" style="width:${pct}%"></div>
    </div>
    <div class="goal-controls">
      <span class="goal-status">${achieved ? '🎉 목표 달성!' : `${remaining}단어 더 학습하면 달성!`}</span>
      <div class="goal-adjust">
        <button class="goal-btn" onclick="adjustGoal(-1)">−</button>
        <span class="goal-value">${goal}</span>
        <button class="goal-btn" onclick="adjustGoal(1)">+</button>
      </div>
    </div>
  `;
}

// ===========================
// Date Utilities
// ===========================
function getTodayKey() {
  return getDateKey(new Date());
}

function getDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDateKorean(dateStr) {
  const [y, m, d] = dateStr.split('-');
  const months = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  const days = ['일','월','화','수','목','금','토'];
  const date = new Date(dateStr);
  return `${y}년 ${months[parseInt(m)-1]} ${parseInt(d)}일 (${days[date.getDay()]})`;
}

function getWordOfDay() {
  const today = getTodayKey();
  // Use date as seed for deterministic daily word
  const seed = parseInt(today.replace(/-/g, ''));
  const idx = seed % WORDS.length;
  return WORDS[idx];
}

// ===========================
// Toast Notification
// ===========================
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ===========================
// Navigation / Router
// ===========================
function navigate(page) {
  state.currentPage = page;
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  // Show target page
  document.getElementById(`page-${page}`).classList.add('active');
  document.querySelector(`[data-page="${page}"]`).classList.add('active');
  // Initialize page
  switch (page) {
    case 'today': renderToday(); break;
    case 'flashcard': renderFlashcard(); break;
    case 'quiz': renderQuizSetup(); break;
    case 'words': renderWordList(); break;
    case 'favorites': renderFavorites(); break;
    case 'progress': renderProgress(); break;
    case 'game': renderGameSetup(); break;
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===========================
// Page: Today (Word of Day)
// ===========================
function renderToday() {
  const word = getWordOfDay();
  const today = getTodayKey();
  const streak = getStreak();

  // Date display
  document.getElementById('date-display').textContent = formatDateKorean(today);

  // Streak badge
  const streakBadge = document.getElementById('streak-badge');
  streakBadge.textContent = `🔥 ${streak.count}일 연속`;

  // Word of Day card
  document.getElementById('wod-level').textContent = { beginner: '기초', intermediate: '중급', advanced: '고급' }[word.level];
  document.getElementById('wod-word').textContent = word.word;
  document.getElementById('wod-phonetic').textContent = word.phonetic;
  document.getElementById('wod-pos').textContent = word.partOfSpeech;
  document.getElementById('wod-definition').textContent = word.definition;
  document.getElementById('wod-korean').textContent = word.korean;
  document.getElementById('wod-example').textContent = `"${word.example}"`;
  document.getElementById('wod-example-kr').textContent = word.exampleKorean;

  // Synonyms
  const synContainer = document.getElementById('wod-synonyms');
  synContainer.innerHTML = word.synonyms.map(s => `<span class="synonym-tag">${s}</span>`).join('');

  // Favorite button
  const favBtn = document.getElementById('wod-fav-btn');
  updateFavBtn(favBtn, word.id);

  // Mark as studied
  markStudied(word.id);

  // Mini stats
  const streak2 = getStreak();
  document.getElementById('stat-streak').textContent = streak2.count;
  document.getElementById('stat-studied').textContent = getTotalStudied();
  const history = getQuizHistory();
  if (history.length > 0) {
    const avgPct = Math.round(history.reduce((s, h) => s + h.pct, 0) / history.length);
    document.getElementById('stat-quiz').textContent = `${avgPct}%`;
  } else {
    document.getElementById('stat-quiz').textContent = '-';
  }

  // Goal progress
  renderGoalProgress();

  // Quick study - show 5 random words (excluding today's)
  const otherWords = WORDS.filter(w => w.id !== word.id);
  const shuffled = [...otherWords].sort(() => Math.random() - 0.5).slice(0, 5);
  const quickList = document.getElementById('quick-word-list');
  quickList.innerHTML = shuffled.map(w => `
    <button class="quick-word-item" onclick="openWordModal(${w.id})">
      <span class="level-dot ${w.level}"></span>
      <span class="quick-word-text">${w.word}</span>
      <span class="quick-word-kr">${w.korean}</span>
    </button>
  `).join('');
}

function updateFavBtn(btn, wordId) {
  if (isFavorite(wordId)) {
    btn.textContent = '★ 즐겨찾기';
    btn.classList.remove('btn-ghost');
    btn.classList.add('btn-white');
  } else {
    btn.textContent = '☆ 즐겨찾기';
    btn.classList.remove('btn-white');
    btn.classList.add('btn-ghost');
  }
}

function wodFavoriteToggle() {
  const word = getWordOfDay();
  toggleFavorite(word.id);
  const btn = document.getElementById('wod-fav-btn');
  updateFavBtn(btn, word.id);
  if (state.currentPage === 'favorites') renderFavorites();
}

function wodSpeak() {
  const word = getWordOfDay();
  speak(word.word);
}

function speak(text) {
  if (!window.speechSynthesis) {
    showToast('이 브라우저는 발음 기능을 지원하지 않아요');
    return;
  }
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'en-US';
  utt.rate = 0.85;
  window.speechSynthesis.speak(utt);
}

// ===========================
// Page: Flashcard
// ===========================
function getFlashcardWords() {
  let words = [...WORDS];
  if (state.flashcardFilter !== 'all') {
    words = words.filter(w => w.level === state.flashcardFilter);
  }
  if (state.flashcardShuffle) {
    words = words.sort(() => Math.random() - 0.5);
  }
  return words;
}

function renderFlashcard() {
  state.flashcardWords = getFlashcardWords();
  if (state.flashcardIndex >= state.flashcardWords.length) {
    state.flashcardIndex = 0;
  }
  renderFlashcardCard();
  renderFlashcardMeta();
}

function renderFlashcardMeta() {
  const total = state.flashcardWords.length;
  const current = state.flashcardIndex + 1;
  document.getElementById('fc-counter').textContent = `${current} / ${total}`;
  const pct = (state.flashcardIndex / Math.max(1, total - 1)) * 100;
  document.getElementById('fc-progress-fill').style.width = `${pct}%`;
}

function renderFlashcardCard() {
  const word = state.flashcardWords[state.flashcardIndex];
  if (!word) return;

  // Reset flip
  state.flashcardFlipped = false;
  const scene = document.getElementById('fc-scene');
  scene.classList.remove('flipped');

  // Front
  document.getElementById('fc-front-word').textContent = word.word;
  document.getElementById('fc-front-phonetic').textContent = word.phonetic;
  document.getElementById('fc-front-pos').textContent = word.partOfSpeech;

  // Back
  document.getElementById('fc-back-korean').textContent = word.korean;
  document.getElementById('fc-back-definition').textContent = word.definition;
  document.getElementById('fc-back-example').textContent = word.example;

  // Favorite button
  const favBtn = document.getElementById('fc-fav-btn');
  favBtn.textContent = isFavorite(word.id) ? '❤️' : '🤍';
  favBtn.classList.toggle('active', isFavorite(word.id));

  // Mark studied
  markStudied(word.id);

  renderFlashcardMeta();
}

function flipCard() {
  state.flashcardFlipped = !state.flashcardFlipped;
  document.getElementById('fc-scene').classList.toggle('flipped', state.flashcardFlipped);
}

function fcPrev() {
  if (state.flashcardIndex > 0) {
    state.flashcardIndex--;
    renderFlashcardCard();
  }
}

function fcNext() {
  if (state.flashcardIndex < state.flashcardWords.length - 1) {
    state.flashcardIndex++;
    renderFlashcardCard();
  } else {
    showToast('마지막 카드예요! 처음으로 돌아갈게요 🎉');
    state.flashcardIndex = 0;
    renderFlashcardCard();
  }
}

function fcToggleFav() {
  const word = state.flashcardWords[state.flashcardIndex];
  if (!word) return;
  toggleFavorite(word.id);
  const btn = document.getElementById('fc-fav-btn');
  btn.textContent = isFavorite(word.id) ? '❤️' : '🤍';
  btn.classList.toggle('active', isFavorite(word.id));
}

function fcSpeak() {
  const word = state.flashcardWords[state.flashcardIndex];
  if (word) speak(word.word);
}

function fcToggleShuffle() {
  state.flashcardShuffle = !state.flashcardShuffle;
  const btn = document.getElementById('fc-shuffle-btn');
  btn.classList.toggle('active', state.flashcardShuffle);
  state.flashcardIndex = 0;
  renderFlashcard();
  showToast(state.flashcardShuffle ? '랜덤 순서로 학습해요 🔀' : '순서대로 학습해요');
}

function setFcFilter(level) {
  state.flashcardFilter = level;
  state.flashcardIndex = 0;
  document.querySelectorAll('#page-flashcard .filter-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.level === level);
  });
  renderFlashcard();
}

// Keyboard navigation for flashcard
document.addEventListener('keydown', (e) => {
  if (state.currentPage !== 'flashcard') return;
  if (e.key === 'ArrowLeft') fcPrev();
  else if (e.key === 'ArrowRight') fcNext();
  else if (e.key === ' ') { e.preventDefault(); flipCard(); }
});

// ===========================
// Page: Quiz
// ===========================
function renderQuizSetup() {
  document.getElementById('quiz-setup').classList.add('active');
  document.getElementById('quiz-active').classList.remove('active');
  document.getElementById('quiz-result').classList.remove('active');
}

function startQuiz() {
  // Read settings
  const levelRadios = document.querySelectorAll('input[name="quiz-level"]');
  const typeRadios = document.querySelectorAll('input[name="quiz-type"]');
  const countRadios = document.querySelectorAll('input[name="quiz-count"]');

  levelRadios.forEach(r => { if (r.checked) state.quizLevel = r.value; });
  typeRadios.forEach(r => { if (r.checked) state.quizType = r.value; });
  countRadios.forEach(r => { if (r.checked) state.quizTotal = parseInt(r.value); });

  // Filter words
  let pool = state.quizLevel === 'all' ? [...WORDS] : WORDS.filter(w => w.level === state.quizLevel);
  if (pool.length < 4) {
    showToast('단어가 너무 적어요. 다른 난이도를 선택해주세요.');
    return;
  }

  // Shuffle and pick
  pool = pool.sort(() => Math.random() - 0.5);
  state.quizWords = pool.slice(0, Math.min(state.quizTotal, pool.length));
  state.quizIndex = 0;
  state.quizScore = 0;

  document.getElementById('quiz-setup').classList.remove('active');
  document.getElementById('quiz-active').classList.add('active');
  document.getElementById('quiz-result').classList.remove('active');

  renderQuizQuestion();
}

function renderQuizQuestion() {
  if (state.quizIndex >= state.quizWords.length) {
    finishQuiz();
    return;
  }

  const word = state.quizWords[state.quizIndex];
  state.quizAnswered = false;

  // Progress bar
  const pct = (state.quizIndex / state.quizWords.length) * 100;
  document.getElementById('quiz-progress-fill').style.width = `${pct}%`;
  document.getElementById('quiz-score-display').textContent = `${state.quizScore}/${state.quizIndex}`;

  // Question
  document.getElementById('quiz-q-num').textContent = `문제 ${state.quizIndex + 1} / ${state.quizWords.length}`;

  if (state.quizType === 'en-to-kr') {
    document.getElementById('quiz-q-text').textContent = word.word;
    document.getElementById('quiz-q-sub').textContent = word.phonetic;
  } else {
    document.getElementById('quiz-q-text').textContent = word.korean;
    document.getElementById('quiz-q-sub').textContent = word.definition;
  }

  // Generate wrong options
  const otherWords = WORDS.filter(w => w.id !== word.id);
  const shuffledOthers = otherWords.sort(() => Math.random() - 0.5).slice(0, 3);
  const allOptions = [...shuffledOthers, word].sort(() => Math.random() - 0.5);

  const optionGrid = document.getElementById('quiz-option-grid');
  optionGrid.innerHTML = allOptions.map(opt => {
    const label = state.quizType === 'en-to-kr' ? opt.korean : opt.word;
    return `<button class="quiz-option-btn" onclick="answerQuiz(${opt.id}, ${word.id})">${label}</button>`;
  }).join('');

  // Clear feedback
  const feedback = document.getElementById('quiz-feedback');
  feedback.className = 'quiz-feedback';
  feedback.textContent = '';
}

function answerQuiz(selectedId, correctId) {
  if (state.quizAnswered) return;
  state.quizAnswered = true;

  const isCorrect = selectedId === correctId;
  if (isCorrect) state.quizScore++;

  // Highlight options
  const buttons = document.querySelectorAll('.quiz-option-btn');
  buttons.forEach(btn => {
    btn.disabled = true;
    const word = WORDS.find(w => {
      const label = state.quizType === 'en-to-kr' ? w.korean : w.word;
      return label === btn.textContent;
    });
    if (word) {
      if (word.id === correctId) btn.classList.add('correct');
      else if (word.id === selectedId && !isCorrect) btn.classList.add('wrong');
    }
  });

  // Feedback
  const feedback = document.getElementById('quiz-feedback');
  const correctWord = WORDS.find(w => w.id === correctId);
  if (isCorrect) {
    feedback.className = 'quiz-feedback correct';
    feedback.textContent = `✅ 정답이에요! "${correctWord.word}" = ${correctWord.korean}`;
  } else {
    feedback.className = 'quiz-feedback wrong';
    feedback.textContent = `❌ 틀렸어요. 정답: "${correctWord.word}" = ${correctWord.korean}`;
  }

  // Auto-advance after 1.5s
  setTimeout(() => {
    state.quizIndex++;
    renderQuizQuestion();
  }, 1800);
}

function finishQuiz() {
  document.getElementById('quiz-active').classList.remove('active');
  document.getElementById('quiz-result').classList.add('active');

  saveQuizResult(state.quizScore, state.quizWords.length);

  const pct = Math.round(state.quizScore / state.quizWords.length * 100);
  document.getElementById('result-score-num').textContent = `${state.quizScore}`;
  document.getElementById('result-score-total').textContent = `/ ${state.quizWords.length}`;

  let message, submessage;
  if (pct >= 90) { message = '완벽해요! 🏆'; submessage = '훌륭한 실력이에요!'; }
  else if (pct >= 70) { message = '잘 했어요! 🎉'; submessage = '조금만 더 연습하면 완벽해요!'; }
  else if (pct >= 50) { message = '괜찮아요! 💪'; submessage = '계속 노력하면 분명 늘어요!'; }
  else { message = '다시 도전해요! 📚'; submessage = '복습하고 다시 시도해보세요!'; }

  document.getElementById('result-message').textContent = message;
  document.getElementById('result-submessage').textContent = `${pct}점 - ${submessage}`;
}

function retryQuiz() {
  startQuiz();
}

function backToQuizSetup() {
  renderQuizSetup();
}

// ===========================
// Page: Word List
// ===========================
function renderWordList() {
  const query = state.searchQuery.toLowerCase().trim();
  const filter = state.listFilter;

  let words = WORDS;
  if (filter !== 'all') words = words.filter(w => w.level === filter);
  if (query) {
    words = words.filter(w =>
      w.word.toLowerCase().includes(query) ||
      w.korean.includes(query) ||
      w.definition.toLowerCase().includes(query)
    );
  }

  document.getElementById('word-count-info').textContent = `${words.length}개 단어`;

  const list = document.getElementById('word-list-grid');
  list.innerHTML = words.map(word => `
    <button class="word-list-item" onclick="openWordModal(${word.id})">
      <span class="level-dot ${word.level}"></span>
      <span class="word-list-item-main">
        <span class="word-list-word">${highlightText(word.word, query)}</span>
        <span class="word-list-phonetic">${word.phonetic}</span>
      </span>
      <span class="word-list-korean">${highlightText(word.korean, query)}</span>
      <button class="fav-btn" onclick="event.stopPropagation(); toggleFavFromList(${word.id}, this)">${isFavorite(word.id) ? '⭐' : '☆'}</button>
    </button>
  `).join('');
}

function highlightText(text, query) {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark style="background:var(--primary-light);color:var(--primary);border-radius:3px;padding:0 2px">$1</mark>');
}

function toggleFavFromList(wordId, btn) {
  const isFav = toggleFavorite(wordId);
  btn.textContent = isFav ? '⭐' : '☆';
  if (state.currentPage === 'favorites') renderFavorites();
}

function onSearchInput(value) {
  state.searchQuery = value;
  renderWordList();
}

function setListFilter(level) {
  state.listFilter = level;
  document.querySelectorAll('#page-words .filter-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.level === level);
  });
  renderWordList();
}

// ===========================
// Page: Favorites
// ===========================
function renderFavorites() {
  const favIds = getFavorites();
  const favWords = WORDS.filter(w => favIds.includes(w.id));

  const container = document.getElementById('favorites-content');
  if (favWords.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⭐</div>
        <div class="empty-state-title">즐겨찾기가 없어요</div>
        <div class="empty-state-sub">단어 목록에서 ☆를 눌러 즐겨찾기에 추가해보세요</div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="word-count-info">${favWords.length}개 단어 저장됨</div>
    <div class="word-list-grid">
      ${favWords.map(word => `
        <button class="word-list-item" onclick="openWordModal(${word.id})">
          <span class="level-dot ${word.level}"></span>
          <span class="word-list-item-main">
            <span class="word-list-word">${word.word}</span>
            <span class="word-list-phonetic">${word.phonetic}</span>
          </span>
          <span class="word-list-korean">${word.korean}</span>
          <button class="fav-btn" onclick="event.stopPropagation(); toggleFavFromList(${word.id}, this)">⭐</button>
        </button>
      `).join('')}
    </div>
  `;
}

// ===========================
// Page: Progress
// ===========================
function renderProgress() {
  const streak = getStreak();
  const totalStudied = getTotalStudied();
  const history = getQuizHistory();
  const totalQuizzes = history.length;
  const avgPct = history.length > 0
    ? Math.round(history.reduce((s, h) => s + h.pct, 0) / history.length)
    : 0;

  // Stats
  document.getElementById('p-streak').textContent = streak.count;
  document.getElementById('p-studied').textContent = totalStudied;
  document.getElementById('p-quizzes').textContent = totalQuizzes;
  document.getElementById('p-avg').textContent = history.length > 0 ? `${avgPct}%` : '-';

  // Level progress
  const studied = getStudied();
  const allStudiedIds = new Set();
  Object.values(studied).forEach(arr => arr.forEach(id => allStudiedIds.add(id)));

  const levels = ['beginner', 'intermediate', 'advanced'];
  const levelNames = { beginner: '기초 (40)', intermediate: '중급 (50)', advanced: '고급 (30)' };

  levels.forEach(level => {
    const total = WORDS.filter(w => w.level === level).length;
    const studiedCount = WORDS.filter(w => w.level === level && allStudiedIds.has(w.id)).length;
    const pct = Math.round((studiedCount / total) * 100);
    const bar = document.getElementById(`bar-${level}`);
    const countEl = document.getElementById(`count-${level}`);
    if (bar) bar.style.width = `${pct}%`;
    if (countEl) countEl.textContent = `${studiedCount}/${total}`;
  });

  // Quiz history
  const histList = document.getElementById('quiz-history-list');
  if (history.length === 0) {
    histList.innerHTML = `<div class="empty-state" style="padding:30px 20px">
      <div class="empty-state-icon" style="font-size:40px">📝</div>
      <div class="empty-state-sub">아직 퀴즈 기록이 없어요</div>
    </div>`;
    return;
  }

  histList.innerHTML = history.map(h => `
    <div class="quiz-history-item">
      <div class="quiz-history-score">${h.score}/${h.total}</div>
      <div class="quiz-history-date">${formatDateKorean(h.date)}</div>
      <div class="quiz-history-bar-wrap">
        <div class="quiz-history-bar" style="width:${h.pct}%;background:${h.pct>=70?'var(--accent)':h.pct>=50?'var(--primary)':'var(--secondary)'}"></div>
      </div>
      <div style="font-size:13px;font-weight:700;color:var(--text-muted)">${h.pct}%</div>
    </div>
  `).join('');

  // 학습 일지 렌더링
  renderStudyJournal();
}

function resetAllData() {
  if (!confirm('모든 학습 기록을 초기화할까요? 이 작업은 되돌릴 수 없어요.')) return;
  localStorage.removeItem('vocab_favorites');
  localStorage.removeItem('vocab_studied');
  localStorage.removeItem('vocab_quiz_history');
  localStorage.removeItem('vocab_streak');
  showToast('학습 기록이 초기화되었어요');
  renderProgress();
}

// ===========================
// 데이터 내보내기 / 가져오기
// ===========================
function exportData() {
  const data = {
    vocab_favorites: getStorage('vocab_favorites'),
    vocab_studied: getStorage('vocab_studied'),
    vocab_quiz_history: getStorage('vocab_quiz_history'),
    vocab_streak: getStorage('vocab_streak'),
    vocab_daily_goal: getStorage('vocab_daily_goal'),
    exportedAt: getTodayKey(),
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vocab-data-${getTodayKey()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('데이터를 내보냈어요 📤');
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!confirm('현재 데이터를 덮어쓰고 가져올까요?')) return;
      if (data.vocab_favorites) setStorage('vocab_favorites', data.vocab_favorites);
      if (data.vocab_studied) setStorage('vocab_studied', data.vocab_studied);
      if (data.vocab_quiz_history) setStorage('vocab_quiz_history', data.vocab_quiz_history);
      if (data.vocab_streak) setStorage('vocab_streak', data.vocab_streak);
      if (data.vocab_daily_goal) setStorage('vocab_daily_goal', data.vocab_daily_goal);
      showToast('데이터를 가져왔어요 📥');
      renderProgress();
      renderToday();
    } catch {
      showToast('파일을 읽을 수 없어요. 올바른 파일인지 확인해주세요.');
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

// ===========================
// 학습 일지
// ===========================
function renderStudyJournal() {
  const studied = getStudied();
  const container = document.getElementById('study-journal-list');
  if (!container) return;

  const dates = Object.keys(studied).sort((a, b) => b.localeCompare(a));

  if (dates.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:30px 20px">
      <div class="empty-state-icon" style="font-size:36px">📅</div>
      <div class="empty-state-sub">아직 학습 기록이 없어요. 오늘부터 시작해봐요!</div>
    </div>`;
    return;
  }

  container.innerHTML = dates.map(date => {
    const wordIds = studied[date];
    const words = wordIds.map(id => WORDS.find(w => w.id === id)).filter(Boolean);
    return `
      <div class="journal-entry">
        <div class="journal-date">
          <span class="journal-date-text">${formatDateKorean(date)}</span>
          <span class="journal-count">${words.length}단어</span>
        </div>
        <div class="journal-words">
          ${words.map(w => `
            <button class="journal-word-chip" onclick="openWordModal(${w.id})">
              <span class="level-dot ${w.level}" style="width:6px;height:6px;flex-shrink:0"></span>
              ${w.word}
              <span class="journal-word-kr">${w.korean}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// ===========================
// Word Detail Modal
// ===========================
function openWordModal(wordId) {
  const word = WORDS.find(w => w.id === wordId);
  if (!word) return;
  state.modalWord = word;

  document.getElementById('modal-word').textContent = word.word;
  document.getElementById('modal-phonetic').textContent = word.phonetic;
  document.getElementById('modal-pos').textContent = word.partOfSpeech;
  document.getElementById('modal-korean').textContent = word.korean;
  document.getElementById('modal-definition').textContent = word.definition;
  document.getElementById('modal-example').textContent = `"${word.example}"`;
  document.getElementById('modal-example-kr').textContent = word.exampleKorean;
  document.getElementById('modal-level').textContent = { beginner: '기초', intermediate: '중급', advanced: '고급' }[word.level];
  document.getElementById('modal-level').className = `level-badge ${word.level}`;

  const synContainer = document.getElementById('modal-synonyms');
  synContainer.innerHTML = word.synonyms.map(s => `<span class="modal-synonym-tag">${s}</span>`).join('');

  const favBtn = document.getElementById('modal-fav-btn');
  favBtn.textContent = isFavorite(word.id) ? '⭐ 즐겨찾기 해제' : '☆ 즐겨찾기 추가';

  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.body.style.overflow = '';
  state.modalWord = null;
}

function modalSpeak() {
  if (state.modalWord) speak(state.modalWord.word);
}

function modalToggleFav() {
  if (!state.modalWord) return;
  toggleFavorite(state.modalWord.id);
  const favBtn = document.getElementById('modal-fav-btn');
  favBtn.textContent = isFavorite(state.modalWord.id) ? '⭐ 즐겨찾기 해제' : '☆ 즐겨찾기 추가';
  // Refresh current page lists
  if (state.currentPage === 'words') renderWordList();
  if (state.currentPage === 'favorites') renderFavorites();
  if (state.currentPage === 'today') renderToday();
}

// ===========================
// Page: Memory Game
// ===========================
function renderGameSetup() {
  clearGameTimer();
  document.getElementById('game-setup').classList.add('active');
  document.getElementById('game-active').classList.remove('active');
  document.getElementById('game-result').classList.remove('active');
}

function startMemoryGame() {
  const levelRadios = document.querySelectorAll('input[name="game-level"]');
  const pairRadios = document.querySelectorAll('input[name="game-pairs"]');
  levelRadios.forEach(r => { if (r.checked) state.gameLevel = r.value; });
  pairRadios.forEach(r => { if (r.checked) state.gamePairs = parseInt(r.value); });

  let pool = state.gameLevel === 'all' ? [...WORDS] : WORDS.filter(w => w.level === state.gameLevel);
  if (pool.length < state.gamePairs) {
    showToast('단어가 부족해요. 난이도를 바꿔주세요.');
    return;
  }
  pool = pool.sort(() => Math.random() - 0.5).slice(0, state.gamePairs);

  const cards = [];
  pool.forEach(word => {
    cards.push({ id: `en-${word.id}`, type: 'en', wordId: word.id, text: word.word, isFlipped: false, isMatched: false });
    cards.push({ id: `kr-${word.id}`, type: 'kr', wordId: word.id, text: word.korean, isFlipped: false, isMatched: false });
  });
  state.gameCards = cards.sort(() => Math.random() - 0.5);
  state.gameFirst = null;
  state.gameSecond = null;
  state.gameChecking = false;
  state.gameMoves = 0;
  state.gameMatched = 0;
  state.gameTotal = pool.length;
  state.gameStartTime = Date.now();

  document.getElementById('game-setup').classList.remove('active');
  document.getElementById('game-active').classList.add('active');
  document.getElementById('game-result').classList.remove('active');
  renderGameBoard();
  startGameTimer();
}

function renderGameBoard() {
  document.getElementById('game-moves').textContent = state.gameMoves;
  document.getElementById('game-matched').textContent = `${state.gameMatched}/${state.gameTotal}`;

  const total = state.gameCards.length;
  const cols = total <= 12 ? 3 : 4;
  const grid = document.getElementById('game-grid');
  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  grid.innerHTML = state.gameCards.map((card, idx) => `
    <div class="memory-card${card.isFlipped ? ' flipped' : ''}${card.isMatched ? ' matched' : ''}"
         onclick="flipGameCard(${idx})" data-idx="${idx}">
      <div class="memory-card-inner">
        <div class="memory-card-back">📚</div>
        <div class="memory-card-front ${card.type}">${card.text}</div>
      </div>
    </div>
  `).join('');
}

function flipGameCard(idx) {
  if (state.gameChecking) return;
  const card = state.gameCards[idx];
  if (card.isFlipped || card.isMatched) return;

  card.isFlipped = true;

  if (state.gameFirst === null) {
    state.gameFirst = idx;
    renderGameBoard();
    return;
  }

  state.gameSecond = idx;
  state.gameMoves++;
  renderGameBoard();

  const first = state.gameCards[state.gameFirst];
  const second = state.gameCards[state.gameSecond];

  if (first.wordId === second.wordId && first.type !== second.type) {
    state.gameChecking = true;
    setTimeout(() => {
      first.isMatched = true;
      second.isMatched = true;
      state.gameMatched++;
      state.gameFirst = null;
      state.gameSecond = null;
      state.gameChecking = false;
      renderGameBoard();
      if (state.gameMatched === state.gameTotal) finishMemoryGame();
    }, 500);
  } else {
    state.gameChecking = true;
    setTimeout(() => {
      first.isFlipped = false;
      second.isFlipped = false;
      state.gameFirst = null;
      state.gameSecond = null;
      state.gameChecking = false;
      renderGameBoard();
    }, 1000);
  }
}

function startGameTimer() {
  clearGameTimer();
  state.gameTimerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - state.gameStartTime) / 1000);
    const el = document.getElementById('game-timer');
    if (el) el.textContent = formatGameTime(elapsed);
  }, 1000);
}

function clearGameTimer() {
  if (state.gameTimerInterval) {
    clearInterval(state.gameTimerInterval);
    state.gameTimerInterval = null;
  }
}

function formatGameTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function finishMemoryGame() {
  clearGameTimer();
  const elapsed = Math.floor((Date.now() - state.gameStartTime) / 1000);

  const bestKey = `game_best_${state.gameLevel}_${state.gameTotal}`;
  const prev = getStorage(bestKey);
  const isNew = !prev || elapsed < prev.time || (elapsed === prev.time && state.gameMoves < prev.moves);
  if (isNew) setStorage(bestKey, { time: elapsed, moves: state.gameMoves });

  document.getElementById('game-active').classList.remove('active');
  document.getElementById('game-result').classList.add('active');
  document.getElementById('game-result-time').textContent = formatGameTime(elapsed);
  document.getElementById('game-result-moves').textContent = state.gameMoves;
  document.getElementById('game-result-pairs').textContent = state.gameTotal;

  const best = getStorage(bestKey);
  document.getElementById('game-result-best').textContent =
    `최고기록: ${formatGameTime(best.time)} · ${best.moves}번`;

  setTimeout(() => showToast(isNew ? '🏆 새 최고기록이에요!' : '🎉 모든 짝을 찾았어요!'), 300);
}

function retryMemoryGame() {
  startMemoryGame();
}

function backToGameSetup() {
  clearGameTimer();
  renderGameSetup();
}

// ===========================
// Init
// ===========================
document.addEventListener('DOMContentLoaded', () => {
  // Nav tab click
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => navigate(tab.dataset.page));
  });

  // Modal overlay click to close
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });

  // Escape key closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Initial page
  navigate('today');
});
