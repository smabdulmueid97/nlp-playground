/* NLP Playground — all analysis runs in the browser.
   Sentiment and keywords are rule based (word lists + counting).
   Nothing here is a trained model, and no text leaves the page. */
(function () {
  'use strict';

  /* ---------- Lexicons (small, transparent word lists) ---------- */
  var POSITIVE = {
    en: ['love', 'great', 'wonderful', 'amazing', 'excellent', 'happy', 'joy', 'beautiful', 'fantastic', 'brilliant', 'good', 'best', 'enjoy', 'delight', 'peaceful', 'bright', 'warm', 'kind', 'helpful', 'success', 'win', 'proud', 'calm', 'fresh', 'lovely', 'perfect', 'awesome', 'glad', 'hope', 'smile'],
    ar: ['جميل', 'جميلة', 'رائع', 'رائعة', 'ممتاز', 'ممتازة', 'سعيد', 'سعيدا', 'سعيدة', 'حب', 'أحب', 'مدهش', 'ممتع', 'سعادة', 'خير', 'طيب', 'مبهج', 'ناجح', 'هادئ', 'مشرق', 'لطيف'],
    bn: ['ভালো', 'ভাল', 'সুন্দর', 'খুশি', 'আনন্দ', 'চমৎকার', 'দারুণ', 'প্রিয়', 'শান্ত', 'সুখ', 'ভালোবাসা', 'আলো', 'হাসি'],
    hi: ['अच्छा', 'सुंदर', 'खुश', 'खुशी', 'प्यार', 'शानदार', 'बढ़िया', 'शांत', 'सुख', 'मुस्कान', 'उज्ज्वल'],
    ur: ['خوبصورت', 'اچھا', 'خوش', 'خوشی', 'محبت', 'شاندار', 'پرسکون', 'کامیاب', 'پیارا', 'مسکراہٹ']
  };
  var NEGATIVE = {
    en: ['hate', 'bad', 'terrible', 'awful', 'sad', 'angry', 'horrible', 'worst', 'fail', 'failure', 'pain', 'fear', 'angry', 'upset', 'boring', 'difficult', 'hard', 'broken', 'lost', 'ugly', 'annoying', 'stress', 'worried', 'tired', 'disappoint', 'wrong', 'problem', 'slow'],
    ar: ['سيء', 'سيئ', 'حزين', 'غضب', 'فظيع', 'مشكلة', 'صعب', 'خوف', 'ألم', 'كره', 'تعيس', 'ممل', 'خسارة', 'فشل'],
    bn: ['খারাপ', 'দুঃখ', 'কষ্ট', 'ভয়', 'রাগ', 'সমস্যা', 'কঠিন', 'বিরক্ত', 'ব্যর্থ', 'অন্ধকার', 'ক্লান্ত'],
    hi: ['बुरा', 'दुख', 'गुस्सा', 'डर', 'समस्या', 'कठिन', 'परेशान', 'थका', 'असफल', 'दर्द', 'निराश'],
    ur: ['برا', 'دکھ', 'غصہ', 'ڈر', 'مسئلہ', 'مشکل', 'پریشان', 'تھکا', 'ناکام', 'درد']
  };
  var STOPWORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'for', 'with', 'is', 'are', 'was', 'were', 'be', 'been', 'it', 'its', 'this', 'that', 'i', 'you', 'he', 'she', 'we', 'they', 'my', 'your', 'his', 'her', 'our', 'their', 'at', 'by', 'from', 'as', 'not', 'no', 'so', 'if', 'then', 'than', 'too', 'very', 'just', 'about', 'into', 'over', 'after', 'before', 'when', 'while', 'who', 'what', 'where', 'how', 'why', 'am', 'do', 'does', 'did', 'have', 'has', 'had', 'will', 'would', 'can', 'could', 'should',
    'في', 'من', 'إلى', 'على', 'أن', 'هو', 'هي', 'كان', 'ما', 'لا', 'هذا', 'هذه', 'مع', 'بعد', 'قبل',
    'আমি', 'তুমি', 'সে', 'এটা', 'এই', 'যে', 'আর', 'কিন্তু', 'না', 'হয়', 'ছিল', 'আছে',
    'में', 'से', 'को', 'है', 'था', 'यह', 'वह', 'और', 'नहीं', 'पर',
    'میں', 'سے', 'کو', 'ہے', 'تھا', 'یہ', 'وہ', 'اور', 'نہیں', 'پر'
  ]);

  var SAMPLES = {
    english: 'I love sunny mornings. The garden looks beautiful today, the birds are singing, and everything feels calm and bright. A wonderful start to a great day.',
    arabic: 'أحب قراءة الكتب في الصباح. الكتاب جميل وممتع، والقصص رائعة تجعلني سعيدا. القراءة تفتح لي عالما جديدا كل يوم.',
    bengali: 'বৃষ্টির সকালে জানালার পাশে বসে চা খেতে ভালো লাগে। বৃষ্টির শব্দ শান্ত, আকাশ সুন্দর, আর পুরো শহরটা যেন ধীরে ধীরে জেগে উঠছে।'
  };

  /* ---------- Helpers ---------- */
  function tokenize(text) {
    // Keep letters from Latin, Arabic, Bengali and Devanagari scripts.
    var matches = text.toLowerCase().match(/[a-z\u00c0-\u024f\u0600-\u06d3\u06d5-\u06ff\u0980-\u09ff\u0900-\u0963\u0966-\u097f]+/g);
    return matches || [];
  }

  function countScript(text, test) {
    var n = 0;
    for (var i = 0; i < text.length; i++) {
      if (test(text.charCodeAt(i))) n++;
    }
    return n;
  }

  /* ---------- Language detection ---------- */
  function detectLanguage(text) {
    var counts = {
      latin: countScript(text, function (c) { return (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 192 && c <= 383); }),
      arabicScript: countScript(text, function (c) { return c >= 0x0600 && c <= 0x06FF; }),
      bengali: countScript(text, function (c) { return c >= 0x0980 && c <= 0x09FF; }),
      devanagari: countScript(text, function (c) { return c >= 0x0900 && c <= 0x097F && c !== 0x0964 && c !== 0x0965; })
    };
    var total = counts.latin + counts.arabicScript + counts.bengali + counts.devanagari;
    if (total === 0) return { name: 'Unknown', detail: 'no letters detected', shares: [] };

    var shares = [];
    var push = function (key, label) {
      if (counts[key] > 0) shares.push({ label: label, pct: Math.round(counts[key] / total * 100) });
    };

    var name, detail;
    if (counts.bengali > 0 && counts.bengali >= counts.latin && counts.bengali >= counts.devanagari && counts.bengali >= counts.arabicScript) {
      name = 'Bengali'; detail = 'Bengali script detected';
      push('bengali', 'Bengali'); push('latin', 'Latin'); push('arabicScript', 'Arabic script'); push('devanagari', 'Devanagari');
    } else if (counts.devanagari > 0 && counts.devanagari >= counts.latin && counts.devanagari >= counts.arabicScript) {
      name = 'Hindi'; detail = 'Devanagari script detected';
      push('devanagari', 'Devanagari'); push('latin', 'Latin'); push('arabicScript', 'Arabic script'); push('bengali', 'Bengali');
    } else if (counts.arabicScript > 0 && counts.arabicScript >= counts.latin) {
      // Urdu-only letters: ے ٹ ڈ ڑ ں ھ ے, also ے (U+06D2), ٹ (U+0679), ڈ (U+0688), ڑ (U+0691), ں (U+06BA), ھ (U+06BE)
      var urduOnly = /[\u06D2\u0679\u0688\u0691\u06BA\u06BE\u06C1\u06CC]/.test(text);
      if (urduOnly) { name = 'Urdu'; detail = 'Arabic script with Urdu-only letters detected'; }
      else { name = 'Arabic'; detail = 'Arabic script detected'; }
      push('arabicScript', 'Arabic script'); push('latin', 'Latin'); push('bengali', 'Bengali'); push('devanagari', 'Devanagari');
    } else if (counts.latin > 0) {
      name = 'English'; detail = 'Latin script detected';
      push('latin', 'Latin'); push('arabicScript', 'Arabic script'); push('bengali', 'Bengali'); push('devanagari', 'Devanagari');
    } else {
      name = 'Unknown'; detail = 'script not covered yet';
    }
    return { name: name, detail: detail, shares: shares };
  }

  /* ---------- Sentiment (lexicon based) ---------- */
  function analyzeSentiment(tokens) {
    var pos = [], neg = [];
    var allPos = [], allNeg = [];
    Object.keys(POSITIVE).forEach(function (k) { allPos = allPos.concat(POSITIVE[k]); });
    Object.keys(NEGATIVE).forEach(function (k) { allNeg = allNeg.concat(NEGATIVE[k]); });
    var posSet = new Set(allPos), negSet = new Set(allNeg);
    tokens.forEach(function (t) {
      if (posSet.has(t) && pos.indexOf(t) === -1) pos.push(t);
      if (negSet.has(t) && neg.indexOf(t) === -1) neg.push(t);
    });
    // Count occurrences, not just unique words.
    var posCount = 0, negCount = 0;
    tokens.forEach(function (t) { if (posSet.has(t)) posCount++; if (negSet.has(t)) negCount++; });
    var score = posCount - negCount;
    var label = score > 0 ? 'Positive' : (score < 0 ? 'Negative' : 'Neutral');
    return { label: label, score: score, posCount: posCount, negCount: negCount, posWords: pos, negWords: neg };
  }

  /* ---------- Keywords (frequency based) ---------- */
  function extractKeywords(tokens, topN) {
    var freq = {};
    tokens.forEach(function (t) {
      if (STOPWORDS.has(t) || t.length < 2) return;
      freq[t] = (freq[t] || 0) + 1;
    });
    var list = Object.keys(freq).map(function (w) { return { word: w, count: freq[w] }; });
    list.sort(function (a, b) { return b.count - a.count || a.word.localeCompare(b.word); });
    return list.slice(0, topN || 10);
  }

  /* ---------- Stats ---------- */
  function textStats(text, tokens) {
    var sentences = text.split(/[.!?।؟۔\n]+/).map(function (s) { return s.trim(); }).filter(Boolean);
    var words = tokens.length;
    var chars = text.length;
    var readingMin = Math.max(1, Math.ceil(words / 200));
    var avg = sentences.length ? (words / sentences.length) : 0;
    return {
      words: words,
      sentences: sentences.length,
      chars: chars,
      reading: readingMin + (readingMin === 1 ? ' min' : ' min'),
      avg: sentences.length ? avg.toFixed(1) + ' words' : '0 words'
    };
  }

  /* ---------- Full analysis ---------- */
  function analyze(text) {
    var tokens = tokenize(text);
    return {
      language: detectLanguage(text),
      sentiment: analyzeSentiment(tokens),
      keywords: extractKeywords(tokens, 10),
      stats: textStats(text, tokens)
    };
  }

  /* ---------- Rendering (browser only) ---------- */
  function el(id) { return document.getElementById(id); }

  function chipsHtml(words, cls, emptyText) {
    if (!words.length) return '<span class="chip none">' + emptyText + '</span>';
    return words.map(function (w) { return '<span class="chip ' + cls + '">' + escapeHtml(w) + '</span>'; }).join('');
  }
  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function render(text) {
    var empty = el('emptyState'), results = el('results');
    if (!text.trim()) { empty.hidden = false; results.hidden = true; return; }
    var r = analyze(text);
    empty.hidden = true; results.hidden = false;

    el('langName').textContent = r.language.name;
    el('langDetail').textContent = r.language.detail;
    el('langBars').innerHTML = r.language.shares.map(function (s) {
      return '<div class="lang-bar-row"><span>' + escapeHtml(s.label) + '</span>' +
        '<span class="lang-bar-track"><span class="lang-bar-fill" style="width:' + s.pct + '%"></span></span>' +
        '<span>' + s.pct + '%</span></div>';
    }).join('');

    var sLab = el('sentimentLabel');
    sLab.textContent = r.sentiment.label;
    sLab.className = 'sentiment-label ' + r.sentiment.label.toLowerCase();
    el('sentimentScore').textContent = 'Score ' + (r.sentiment.score > 0 ? '+' : '') + r.sentiment.score +
      ' (' + r.sentiment.posCount + ' positive, ' + r.sentiment.negCount + ' negative)';
    el('posWords').innerHTML = chipsHtml(r.sentiment.posWords, 'pos', 'No positive words matched.');
    el('negWords').innerHTML = chipsHtml(r.sentiment.negWords, 'neg', 'No negative words matched.');

    var max = r.keywords.length ? r.keywords[0].count : 1;
    el('keywordList').innerHTML = r.keywords.length ? r.keywords.map(function (k) {
      var pct = Math.round(k.count / max * 100);
      return '<li><span class="kw-row"><span class="kw-word">' + escapeHtml(k.word) + '</span>' +
        '<span class="kw-bar"><i style="width:' + pct + '%"></i></span></span>' +
        '<span class="kw-count">' + k.count + '×</span></li>';
    }).join('') : '<li>No keywords found. Try longer text.</li>';

    el('statWords').textContent = r.stats.words;
    el('statSentences').textContent = r.stats.sentences;
    el('statChars').textContent = r.stats.chars;
    el('statReading').textContent = r.stats.reading;
    el('statAvg').textContent = r.stats.avg;
  }

  if (typeof document !== 'undefined') {
    var input = el('inputText');
    input.addEventListener('input', function () { render(input.value); });
    el('analyzeBtn').addEventListener('click', function () { render(input.value); });
    el('clearBtn').addEventListener('click', function () { input.value = ''; render(''); input.focus(); });
    document.querySelectorAll('[data-sample]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        input.value = SAMPLES[btn.getAttribute('data-sample')];
        render(input.value);
      });
    });
  }

  /* Export for Node verification */
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { analyze: analyze, detectLanguage: detectLanguage, analyzeSentiment: analyzeSentiment, extractKeywords: extractKeywords, textStats: textStats, tokenize: tokenize, SAMPLES: SAMPLES };
  }
})();
