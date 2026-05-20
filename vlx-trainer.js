(function () {
  if (window.__VLX_VISUAL_TRAINER_MVP_V1__) return;
  window.__VLX_VISUAL_TRAINER_MVP_V1__ = true;

  var SAVED_KEY = "vlx_saved_words_v1";
  var USE_ATTEMPTS_KEY = "vlx_word_use_attempts_v1";
  var TRAINER_ATTEMPTS_KEY = "vlx_trainer_attempts_v1";
  var REVIEW_KEY = "vlx_review_queue_v1";
  var SPEAKING_ATTEMPTS_KEY = "vlx_word_speaking_attempts_v1";

/*
  Backend 연결 전에는 빈 문자열로 둔다.
  나중에 Cloudflare Worker endpoint가 준비되면 아래처럼 바꾼다:
  var SPEAKING_CHECK_ENDPOINT = "https://api.visuallexicon.org/ai/speaking-check";
*/
  var SPEAKING_CHECK_ENDPOINT = "";
  var WORD_BANK = [
    {
      slug: "absolute-advantage",
      title: "Absolute Advantage",
      partOfSpeech: "noun phrase",
      definition: "A situation where one person, company, or country can produce more of something with the same resources than another.",
      example: "The island has an absolute advantage in coffee because its climate lets farmers produce more beans with less effort.",
      related: ["efficiency", "productivity", "comparative advantage", "specialization"],
      visual: {
        emoji: "📈",
        label: "More output from the same input"
      }
    },
    {
      slug: "translucent",
      title: "Translucent",
      partOfSpeech: "adjective",
      definition: "Allowing light to pass through, but not clear enough to see detailed shapes on the other side.",
      example: "The translucent curtain softened the sunlight and made the room feel calm.",
      related: ["semi-transparent", "frosted", "diffused", "clear"],
      visual: {
        emoji: "🪟",
        label: "Light passes through, details stay blurred"
      }
    },
    {
      slug: "meritocracy",
      title: "Meritocracy",
      partOfSpeech: "noun",
      definition: "A system where people rise based on ability, effort, and achievement rather than wealth or status.",
      example: "The scholarship program was designed as a meritocracy, rewarding students for skill and persistence.",
      related: ["achievement", "fairness", "competition", "mobility"],
      visual: {
        emoji: "🏛️",
        label: "A ladder built from skill and effort"
      }
    },
    {
      slug: "ambiguity",
      title: "Ambiguity",
      partOfSpeech: "noun",
      definition: "The quality of having more than one possible meaning, making something unclear or open to interpretation.",
      example: "The ambiguity of the message made both teams think they had won the agreement.",
      related: ["uncertainty", "vagueness", "double meaning", "unclear"],
      visual: {
        emoji: "🌓",
        label: "One sign, two possible meanings"
      }
    },
    {
      slug: "resilience",
      title: "Resilience",
      partOfSpeech: "noun",
      definition: "The ability to recover, adapt, and keep going after stress, difficulty, or failure.",
      example: "Her resilience showed when she returned to the project with a better plan after the first failure.",
      related: ["recovery", "adaptability", "endurance", "grit"],
      visual: {
        emoji: "🌱",
        label: "A new shoot growing after pressure"
      }
    },
    {
      slug: "confluence",
      title: "Confluence",
      partOfSpeech: "noun",
      definition: "A place or moment where two or more things flow together and become connected.",
      example: "The city grew at the confluence of two rivers and several trade routes.",
      related: ["merging", "intersection", "meeting point", "fusion"],
      visual: {
        emoji: "🌊",
        label: "Separate streams becoming one current"
      }
    },
    {
      slug: "discrepancy",
      title: "Discrepancy",
      partOfSpeech: "noun",
      definition: "A difference between two things that should match, often suggesting an error or inconsistency.",
      example: "The discrepancy between the receipt and the report forced the team to check the numbers again.",
      related: ["mismatch", "inconsistency", "gap", "difference"],
      visual: {
        emoji: "⚖️",
        label: "Two numbers that should match but do not"
      }
    },
    {
      slug: "aggressive",
      title: "Aggressive",
      partOfSpeech: "adjective",
      definition: "Forceful, assertive, or ready to attack, compete, or push forward strongly.",
      example: "The company took an aggressive approach by entering three new markets at once.",
      related: ["forceful", "assertive", "combative", "intense"],
      visual: {
        emoji: "⚡",
        label: "Strong forward pressure"
      }
    }
  ];

  var STARTER_DECKS = [
    {
      icon: "🎓",
      title: "GRE / Academic",
      desc: "Advanced words for essays, reading passages, and abstract reasoning.",
      word: "meritocracy"
    },
    {
      icon: "🧠",
      title: "Abstract Words",
      desc: "Practice words that are hard to picture but easy to remember visually.",
      word: "ambiguity"
    },
    {
      icon: "📈",
      title: "Business & Economics",
      desc: "Train high-value vocabulary for markets, strategy, and productivity.",
      word: "absolute-advantage"
    },
    {
      icon: "✍️",
      title: "Use It in Writing",
      desc: "Move beyond recognition and write one clean sentence with the word.",
      word: "resilience"
    }
  ];

  var state = {
  root: null,
  mode: "home",
  word: null,
  cards: [],
  index: 0,
  answers: [],
  useMode: "write",
  speaking: {
    recorder: null,
    stream: null,
    chunks: [],
    blob: null,
    url: "",
    status: "idle",
    result: null,
    error: ""
  },
  cardStartedAt: Date.now(),
  sessionId: "vlx_" + Date.now() + "_" + Math.random().toString(16).slice(2),
  hasStoredResult: false
};

  function ensureMount() {
    var existing = document.getElementById("vlx-trainer");
    if (existing) {
      existing.classList.add("vlx-trainer");
      return existing;
    }

    var mount = document.createElement("main");
    mount.id = "vlx-trainer";
    mount.className = "vlx-trainer";

    var nav = document.querySelector(".w-nav, nav, .navbar, .nav");
    if (nav && nav.parentNode) {
      nav.insertAdjacentElement("afterend", mount);
    } else {
      document.body.insertBefore(mount, document.body.firstChild);
    }

    return mount;
  }

  function safeParse(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function normalizeSlug(input) {
    var value = decodeURIComponent(String(input || "").trim());

    try {
      if (/^https?:\/\//i.test(value)) {
        var url = new URL(value);
        value = url.pathname.split("/").filter(Boolean).pop() || "";
      }
    } catch (e) {}

    return value
      .toLowerCase()
      .replace(/^\/+|\/+$/g, "")
      .split("/")
      .pop()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function slugToTitle(slug) {
    var cleaned = normalizeSlug(slug)
      .replace(/^what-is-/, "")
      .replace(/^definition-of-/, "")
      .replace(/^meaning-of-/, "")
      .replace(/^the-concept-of-/, "");

    return cleaned
      .split("-")
      .filter(Boolean)
      .map(function (part) {
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(" ");
  }

  function findBankWord(slugOrTitle) {
    var slug = normalizeSlug(slugOrTitle);
    var titleSlug = normalizeSlug(slugToTitle(slug));

    return WORD_BANK.find(function (item) {
      return item.slug === slug ||
        slug.indexOf(item.slug) !== -1 ||
        item.slug.indexOf(slug) !== -1 ||
        normalizeSlug(item.title) === titleSlug ||
        slug.indexOf(normalizeSlug(item.title)) !== -1;
    }) || null;
  }

  function readSavedWords() {
    var parsed = safeParse(localStorage.getItem(SAVED_KEY), []);

    if (Array.isArray(parsed)) {
      return parsed.map(normalizeSavedItem).filter(Boolean);
    }

    if (parsed && typeof parsed === "object") {
      return Object.keys(parsed).map(function (key) {
        var item = parsed[key];
        if (item && typeof item === "object") {
          item.slug = item.slug || key;
        }
        return normalizeSavedItem(item);
      }).filter(Boolean);
    }

    return [];
  }

  function normalizeSavedItem(item) {
    if (!item) return null;

    if (typeof item === "string") {
      return {
        slug: normalizeSlug(item),
        title: slugToTitle(item),
        definition: "",
        example: "",
        image: "",
        url: "/photos/" + normalizeSlug(item)
      };
    }

    var title = item.title || item.word || item.name || item.display || item.wordDisplay || item.label || "";
    var url = item.url || item.href || item.path || "";
    var slug = normalizeSlug(item.slug || item.wordSlug || item.cmsSlug || url || title);

    if (!slug && !title) return null;

    return {
      slug: slug || normalizeSlug(title),
      title: title || slugToTitle(slug),
      partOfSpeech: item.partOfSpeech || item.pos || item.word_type || "",
      definition: item.definition || item.def || item.meaning || item.shortDefinition || item.definition_short || "",
      example: item.example || item.example_1 || item.sentence || "",
      image: item.image || item.img || item.imageUrl || item.image_url || item.ogImage || "",
      related: Array.isArray(item.related) ? item.related : parseCsv(item.related_words_display || item.relatedWords || item.related),
      url: url || "/photos/" + (slug || normalizeSlug(title)),
      savedAt: item.savedAt || item.created_at || item.createdAt || ""
    };
  }

  function parseCsv(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    return String(value).split(",").map(function (x) { return x.trim(); }).filter(Boolean);
  }

  function saveWord(word) {
    var item = {
      slug: word.slug,
      title: word.title,
      word: word.title,
      definition: word.definition,
      example: word.example,
      image: word.image || "",
      url: word.url || "/photos/" + word.slug,
      savedAt: new Date().toISOString(),
      source: "visual-trainer"
    };

    var raw = localStorage.getItem(SAVED_KEY);
    var parsed = safeParse(raw, null);

    if (Array.isArray(parsed)) {
      var filtered = parsed.filter(function (x) {
        var normalized = normalizeSavedItem(x);
        return normalized && normalized.slug !== word.slug;
      });
      filtered.unshift(item);
      localStorage.setItem(SAVED_KEY, JSON.stringify(filtered));
    } else if (parsed && typeof parsed === "object") {
      parsed[word.slug] = item;
      localStorage.setItem(SAVED_KEY, JSON.stringify(parsed));
    } else {
      localStorage.setItem(SAVED_KEY, JSON.stringify([item]));
    }

    toast("Saved to your Visual Lexicon list.");
  }

  function appendLocalStorageArray(key, item, maxItems) {
    var arr = safeParse(localStorage.getItem(key), []);
    if (!Array.isArray(arr)) arr = [];
    arr.unshift(item);
    if (maxItems && arr.length > maxItems) arr = arr.slice(0, maxItems);
    localStorage.setItem(key, JSON.stringify(arr));
  }

  function updateReviewQueue(word, score, total) {
    var queue = safeParse(localStorage.getItem(REVIEW_KEY), {});
    if (!queue || typeof queue !== "object" || Array.isArray(queue)) queue = {};

    var current = queue[word.slug] || {};
    var ratio = total ? score / total : 0;
    var currentBox = Number(current.box || 0);
    var nextBox = ratio >= 0.8 ? Math.min(5, currentBox + 1) : 0;
    var days = [0, 1, 3, 7, 14, 30][nextBox] || 1;
    var due = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    queue[word.slug] = {
      slug: word.slug,
      title: word.title,
      definition: word.definition,
      image: word.image || "",
      box: nextBox,
      lastScore: score,
      total: total,
      dueAt: due.toISOString(),
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(REVIEW_KEY, JSON.stringify(queue));
  }

  async function fetchWordPage(slug) {
    var path = "/photos/" + encodeURIComponent(slug);
    var controller = null;
    var timeout = null;

    try {
      if ("AbortController" in window) {
        controller = new AbortController();
        timeout = setTimeout(function () { controller.abort(); }, 3500);
      }

      var res = await fetch(path, {
        method: "GET",
        credentials: "same-origin",
        signal: controller ? controller.signal : undefined
      });

      if (timeout) clearTimeout(timeout);
      if (!res.ok) return null;

      var html = await res.text();
      var doc = new DOMParser().parseFromString(html, "text/html");

      function meta(name) {
        var el = doc.querySelector('meta[property="' + name + '"], meta[name="' + name + '"]');
        return el ? (el.getAttribute("content") || "").trim() : "";
      }

      var rawTitle =
        (doc.querySelector("h1") && doc.querySelector("h1").textContent) ||
        meta("og:title") ||
        doc.title ||
        "";

      var title = cleanTitle(rawTitle, slug);
      var definition = meta("description") || meta("og:description") || "";
      definition = cleanDefinition(definition, title);

      var image =
        meta("og:image") ||
        meta("twitter:image") ||
        getFirstContentImage(doc);

      var canonical = "";
      var canonicalEl = doc.querySelector('link[rel="canonical"]');
      if (canonicalEl) canonical = canonicalEl.getAttribute("href") || "";

      return {
        slug: slug,
        title: title || slugToTitle(slug),
        definition: definition,
        image: image,
        url: canonical || path,
        source: "word-page"
      };
    } catch (e) {
      if (timeout) clearTimeout(timeout);
      return null;
    }
  }

  function getFirstContentImage(doc) {
    var imgs = Array.prototype.slice.call(doc.querySelectorAll("img"));
    var found = imgs.find(function (img) {
      var src = img.getAttribute("src") || "";
      var alt = img.getAttribute("alt") || "";
      return src && !/logo|icon|avatar/i.test(src + " " + alt);
    });
    return found ? found.getAttribute("src") : "";
  }

  function cleanTitle(raw, slug) {
    var title = String(raw || "").trim();

    title = title
      .replace(/\s*\|\s*Visual Lexicon.*$/i, "")
      .replace(/\s*-\s*Visual Lexicon.*$/i, "")
      .replace(/^What is\s+/i, "")
      .replace(/^What Is\s+/i, "")
      .replace(/\?\s*Definition.*$/i, "")
      .replace(/\?\s*Meaning.*$/i, "")
      .replace(/\?.*$/i, "")
      .trim();

    if (!title || title.length > 80) return slugToTitle(slug);
    return title;
  }

  function cleanDefinition(raw, title) {
    var def = String(raw || "").trim();
    def = def.replace(/\s+/g, " ");

    if (!def) return "";
    if (def.length > 230) def = def.slice(0, 227).replace(/\s+\S*$/, "") + "...";

    return def;
  }

  function mergeWordData() {
    var sources = Array.prototype.slice.call(arguments).filter(Boolean);
    var out = {};
    var related = [];

    sources.forEach(function (src) {
      Object.keys(src).forEach(function (key) {
        var value = src[key];
        if (key === "related") {
          related = related.concat(parseCsv(value));
          return;
        }
        if (value == null) return;
        if (typeof value === "string" && !value.trim()) return;
        if (Array.isArray(value) && !value.length) return;
        out[key] = value;
      });
    });

    out.related = unique(related).slice(0, 6);
    return out;
  }

  async function resolveWord(slug) {
    var bank = findBankWord(slug);
    var saved = readSavedWords().find(function (item) {
      return item.slug === slug ||
        slug.indexOf(item.slug) !== -1 ||
        item.slug.indexOf(slug) !== -1;
    });

    var fallback = {
      slug: slug,
      title: bank ? bank.title : slugToTitle(slug),
      partOfSpeech: bank ? bank.partOfSpeech : "",
      definition: bank ? bank.definition : "A Visual Lexicon word selected for focused practice. Full CMS data can replace this fallback when the word API is connected.",
      example: bank ? bank.example : "Use this word in a clear sentence that shows its meaning.",
      related: bank ? bank.related : ["meaning", "context", "usage", "example"],
      visual: bank ? bank.visual : {
        emoji: "✨",
        label: "A focused word practice card"
      },
      url: "/photos/" + slug
    };

    var fetched = await fetchWordPage(slug);

    var merged = mergeWordData(fallback, bank, saved, fetched);
    merged.slug = slug;
    merged.title = merged.title || slugToTitle(slug);
    merged.definition = merged.definition || fallback.definition;
    merged.example = merged.example || fallback.example;
    merged.related = merged.related && merged.related.length ? merged.related : fallback.related;
    merged.visual = merged.visual || fallback.visual;
    merged.url = merged.url || "/photos/" + slug;

    return merged;
  }

  function buildCards(word) {
    var pool = WORD_BANK.filter(function (item) {
      return item.slug !== word.slug && normalizeSlug(item.title) !== normalizeSlug(word.title);
    });

    if (pool.length < 4) pool = WORD_BANK.slice();

    var meaning = makeChoices(
      word.definition,
      pool.map(function (x) { return x.definition; }),
      4
    );

    var example = makeChoices(
      word.example || ("The speaker used " + word.title + " in a precise and meaningful sentence."),
      pool.map(function (x) { return x.example; }),
      4
    );

    var image = makeImageChoices(word, pool);

    var closestCorrect = word.related && word.related[0] ? word.related[0] : "related meaning";
    var closest = makeChoices(
      closestCorrect,
      pool.map(function (x) {
        return x.related && x.related[0] ? x.related[0] : x.title;
      }),
      4
    );

    return [
      {
        id: "meaning",
        type: "choice",
        label: "Card 1 / Meaning",
        prompt: "What does this word mean?",
        helper: "Choose the meaning that best matches the Visual Lexicon entry.",
        choices: meaning.choices,
        correctIndex: meaning.correctIndex,
        explanation: word.title + " means: " + word.definition
      },
      {
        id: "example",
        type: "choice",
        label: "Card 2 / Example",
        prompt: "Choose the best example.",
        helper: "Pick the sentence where the word is used in the clearest context.",
        choices: example.choices,
        correctIndex: example.correctIndex,
        explanation: "The best example shows the word in action: “" + (word.example || example.choices[example.correctIndex]) + "”"
      },
      {
        id: "image",
        type: "image-choice",
        label: "Card 3 / Image",
        prompt: "Which image matches the meaning?",
        helper: "Choose the visual that most directly represents the idea.",
        choices: image.choices,
        correctIndex: image.correctIndex,
        explanation: "The correct visual should make the meaning easier to remember, not just decorate the page."
      },
      {
        id: "closest",
        type: "choice",
        label: "Card 4 / Closest word",
        prompt: "Which word is closest?",
        helper: "Choose the nearest related idea. It does not have to be a perfect synonym.",
        choices: closest.choices,
        correctIndex: closest.correctIndex,
        explanation: "A close related idea for " + word.title + " is “" + closestCorrect + ".”"
      },
      {
  id: "use",
  type: "use",
  label: "Card 5 / Use",
  prompt: "Use this word.",
  helper: "Write one sentence, or record yourself saying one sentence with this word.",
  explanation: "A strong answer uses the word naturally, includes context, and can be produced in writing or speaking."
}
    ];
  }

  function makeChoices(correct, distractors, total) {
    var cleanCorrect = String(correct || "").trim();
    var all = [cleanCorrect].concat(distractors || [])
      .map(function (x) { return String(x || "").trim(); })
      .filter(function (x) { return x && x.length > 2; });

    all = unique(all);

    while (all.length < total) {
      all.push([
        "A general idea that needs clearer context.",
        "A surface-level association, but not the central meaning.",
        "A different concept that may appear in academic writing.",
        "A related-looking option that does not fit this word."
      ][all.length % 4]);
      all = unique(all);
    }

    var choices = shuffle([cleanCorrect].concat(all.filter(function (x) {
      return x !== cleanCorrect;
    })).slice(0, total));

    return {
      choices: choices,
      correctIndex: choices.indexOf(cleanCorrect)
    };
  }

  function makeImageChoices(word, pool) {
    var correct = {
      title: word.title,
      label: word.visual && word.visual.label ? word.visual.label : word.title,
      image: word.image || "",
      visual: word.visual || { emoji: "✨", label: word.title },
      correct: true
    };

    var distractors = pool.slice(0, 5).map(function (item) {
      return {
        title: item.title,
        label: item.visual && item.visual.label ? item.visual.label : item.title,
        image: item.image || "",
        visual: item.visual || { emoji: "✨", label: item.title },
        correct: false
      };
    });

    var choices = shuffle([correct].concat(distractors)).slice(0, 3);

    if (!choices.some(function (x) { return x.correct; })) {
      choices[0] = correct;
      choices = shuffle(choices);
    }

    return {
      choices: choices,
      correctIndex: choices.findIndex(function (x) { return x.correct; })
    };
  }

  function unique(arr) {
    var seen = {};
    return arr.filter(function (item) {
      var key = String(item || "").toLowerCase();
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function shuffle(arr) {
    var copy = arr.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }

  function renderLoading(slug) {
    state.root.innerHTML =
      '<div class="vlx-loading">' +
        '<div>' +
          '<div class="vlx-loader-dot">✦</div>' +
          '<p class="vlx-eyebrow">Visual Trainer</p>' +
          '<h1 class="vlx-section-title">Preparing practice for ' + escapeHtml(slugToTitle(slug)) + '</h1>' +
          '<p class="vlx-section-desc">Loading saved data, word page metadata, and fallback practice cards.</p>' +
        '</div>' +
      '</div>';
  }

  function renderHome() {
    state.mode = "home";
    state.word = null;
    state.cards = [];
    state.index = 0;
    state.answers = [];

    var saved = readSavedWords().slice(0, 6);

    state.root.innerHTML =
      '<div class="vlx-trainer-shell">' +
        '<section class="vlx-hero">' +
          '<div class="vlx-hero-grid">' +
            '<div>' +
              '<div class="vlx-kicker">Visual Trainer · MVP</div>' +
              '<h1 class="vlx-title">Remember it. <span>Use it.</span></h1>' +
              '<p class="vlx-subtitle">Practice vocabulary with short visual cards. Start from a word page, a saved word, or a starter deck.</p>' +
              '<div class="vlx-search-row">' +
                '<input class="vlx-input" id="vlx-word-input" type="text" placeholder="Enter a word or slug, e.g. absolute-advantage">' +
                '<button class="vlx-button vlx-button-primary" data-action="start-input">Start practice</button>' +
              '</div>' +
              '<div class="vlx-hero-actions">' +
                '<button class="vlx-button vlx-button-secondary" data-action="start-word" data-word="absolute-advantage">Try demo quiz</button>' +
                '<button class="vlx-button vlx-button-ghost" data-action="scroll-decks">Browse starter decks</button>' +
              '</div>' +
            '</div>' +
            '<div class="vlx-visual-card">' +
              '<div class="vlx-visual-orb">🧠</div>' +
              '<p class="vlx-visual-caption">A clean 5-card loop: meaning, example, image, closest word, and one sentence.</p>' +
            '</div>' +
          '</div>' +
        '</section>' +

        '<section class="vlx-panel" id="vlx-starter-decks">' +
          '<div class="vlx-panel-header">' +
            '<div>' +
              '<p class="vlx-eyebrow">Starter decks</p>' +
              '<h2 class="vlx-section-title">Choose a practice path</h2>' +
              '<p class="vlx-section-desc">When a word page sends <code>?word=slug</code>, this page automatically switches into single-word practice mode.</p>' +
            '</div>' +
          '</div>' +
          '<div class="vlx-grid">' +
            STARTER_DECKS.map(renderDeckCard).join("") +
          '</div>' +
        '</section>' +

        '<section class="vlx-panel">' +
          '<div class="vlx-panel-header">' +
            '<div>' +
              '<p class="vlx-eyebrow">Your words</p>' +
              '<h2 class="vlx-section-title">Saved words</h2>' +
              '<p class="vlx-section-desc">' + (saved.length ? "Practice words already saved in this browser." : "No saved words in this browser yet. Save a word from a word page first.") + '</p>' +
            '</div>' +
          '</div>' +
          '<div class="vlx-grid">' +
            (saved.length ? saved.map(renderSavedCard).join("") : renderEmptySavedCard()) +
          '</div>' +
        '</section>' +
      '</div>';
  }

  function renderDeckCard(deck) {
    return '' +
      '<article class="vlx-deck-card">' +
        '<div>' +
          '<div class="vlx-card-icon">' + escapeHtml(deck.icon) + '</div>' +
          '<h3 class="vlx-card-title">' + escapeHtml(deck.title) + '</h3>' +
          '<p class="vlx-card-desc">' + escapeHtml(deck.desc) + '</p>' +
        '</div>' +
        '<button class="vlx-button vlx-button-secondary vlx-button-small" data-action="start-word" data-word="' + escapeAttr(deck.word) + '">Start 5-card practice</button>' +
      '</article>';
  }

  function renderSavedCard(word) {
    return '' +
      '<article class="vlx-saved-card">' +
        '<div>' +
          '<div class="vlx-card-icon">★</div>' +
          '<h3 class="vlx-card-title">' + escapeHtml(word.title) + '</h3>' +
          '<p class="vlx-card-desc">' + escapeHtml(word.definition || "Saved word ready for practice.") + '</p>' +
        '</div>' +
        '<button class="vlx-button vlx-button-secondary vlx-button-small" data-action="start-word" data-word="' + escapeAttr(word.slug) + '">Practice this word</button>' +
      '</article>';
  }

  function renderEmptySavedCard() {
    return '' +
      '<article class="vlx-saved-card">' +
        '<div>' +
          '<div class="vlx-card-icon">＋</div>' +
          '<h3 class="vlx-card-title">Build your list</h3>' +
          '<p class="vlx-card-desc">Use the Save button on a word page, then return here for review.</p>' +
        '</div>' +
        '<button class="vlx-button vlx-button-secondary vlx-button-small" data-action="start-word" data-word="translucent">Practice sample word</button>' +
      '</article>';
  }

  function renderPractice() {
    var word = state.word;
    var card = state.cards[state.index];
    var answer = state.answers[state.index] || null;
    var progress = Math.round(((state.index + 1) / state.cards.length) * 100);

    state.root.innerHTML =
      '<div class="vlx-trainer-shell">' +
        '<section class="vlx-practice-layout">' +
          '<article class="vlx-practice-card">' +
            '<div class="vlx-practice-top">' +
              '<div class="vlx-word-row">' +
                '<div>' +
                  '<div class="vlx-kicker">Single-word practice</div>' +
                  '<h1 class="vlx-word-title">Practice: ' + escapeHtml(word.title) + '</h1>' +
                  '<div class="vlx-word-meta">' +
                    '<span class="vlx-chip vlx-chip-strong">5-card quiz</span>' +
                    (word.partOfSpeech ? '<span class="vlx-chip">' + escapeHtml(word.partOfSpeech) + '</span>' : '') +
                    '<span class="vlx-chip">local MVP</span>' +
                  '</div>' +
                '</div>' +
                '<button class="vlx-button vlx-button-ghost vlx-button-small" data-action="go-home">Trainer home</button>' +
              '</div>' +
              '<div class="vlx-progress-wrap">' +
                '<div class="vlx-progress-label">' +
                  '<span>' + escapeHtml(card.label) + '</span>' +
                  '<span>' + (state.index + 1) + ' / ' + state.cards.length + '</span>' +
                '</div>' +
                '<div class="vlx-progress-track">' +
                  '<div class="vlx-progress-bar" style="width:' + progress + '%"></div>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="vlx-question-body">' +
              '<p class="vlx-question-label">' + escapeHtml(card.label) + '</p>' +
              '<h2 class="vlx-question-title">' + escapeHtml(card.prompt) + '</h2>' +
              '<p class="vlx-question-helper">' + escapeHtml(card.helper) + '</p>' +
              renderCardInteraction(card, answer) +
            '</div>' +
          '</article>' +
          renderSideCard(word) +
        '</section>' +
      '</div>';
  }

  function renderCardInteraction(card, answer) {
  if (card.type === "use") {
    return renderUseCard(card, answer);
  }

  if (card.type === "writing") {
    return renderWritingCard(card, answer);
  }

  if (card.type === "image-choice") {
    return renderImageOptions(card, answer);
  }

  return renderTextOptions(card, answer);
}

  function renderTextOptions(card, answer) {
    return '' +
      '<div class="vlx-options">' +
        card.choices.map(function (choice, index) {
          var cls = "vlx-option";
          if (answer) {
            if (index === card.correctIndex) cls += " is-correct";
            else if (index === answer.selectedIndex) cls += " is-wrong";
          }

          return '<button class="' + cls + '" ' +
            'data-action="choose" data-choice="' + index + '" ' +
            (answer ? "disabled" : "") + '>' +
              escapeHtml(choice) +
            '</button>';
        }).join("") +
      '</div>' +
      renderFeedback(card, answer);
  }

  function renderImageOptions(card, answer) {
    return '' +
      '<div class="vlx-options vlx-image-options">' +
        card.choices.map(function (choice, index) {
          var cls = "vlx-option vlx-image-option";
          if (answer) {
            if (index === card.correctIndex) cls += " is-correct";
            else if (index === answer.selectedIndex) cls += " is-wrong";
          }

          var src = choice.image || makeTileImage(choice.visual || { emoji: "✨", label: choice.label || choice.title });

          return '<button class="' + cls + '" ' +
            'data-action="choose" data-choice="' + index + '" ' +
            (answer ? "disabled" : "") + '>' +
              '<div class="vlx-image-option-media">' +
                '<img alt="' + escapeAttr(choice.label || choice.title) + '" src="' + escapeAttr(src) + '">' +
              '</div>' +
              '<div class="vlx-image-option-text">' + escapeHtml(choice.label || choice.title) + '</div>' +
            '</button>';
        }).join("") +
      '</div>' +
      renderFeedback(card, answer);
  }
function renderUseCard(card, answer) {
  var active = state.useMode || "write";
  var writingAnswer = answer && answer.type === "writing" ? answer : null;
  var speakingAnswer = answer && answer.type === "speaking" ? answer : null;

  return '' +
    '<div class="vlx-use-tabs" role="tablist" aria-label="Use this word mode">' +
      '<button class="vlx-use-tab ' + (active === "write" ? "is-active" : "") + '" type="button" data-action="set-use-mode" data-mode="write">Write</button>' +
      '<button class="vlx-use-tab ' + (active === "speak" ? "is-active" : "") + '" type="button" data-action="set-use-mode" data-mode="speak">Speak</button>' +
    '</div>' +
    (active === "speak"
      ? renderSpeakingCard(card, speakingAnswer)
      : renderWritingCard(card, writingAnswer));
}
function renderWritingCard(card, answer) {
  return '' +
    '<textarea class="vlx-textarea" id="vlx-writing-input" placeholder="Write one sentence with ' + escapeAttr(state.word.title) + '...">' + escapeHtml(answer && answer.sentence ? answer.sentence : "") + '</textarea>' +
    (answer ? renderWritingFeedback(answer) : '') +
    '<div class="vlx-card-actions">' +
      '<button class="vlx-button vlx-button-primary" data-action="check-writing">' + (answer ? "Check again" : "Check writing") + '</button>' +
      (answer ? '<button class="vlx-button vlx-button-secondary" data-action="next-card">' + nextButtonText() + '</button>' : '') +
    '</div>';
}

  function renderWritingFeedback(answer) {
    var good = answer.correct;
    return '' +
      '<div class="vlx-feedback ' + (good ? "is-good" : "is-bad") + '">' +
        '<p class="vlx-feedback-title">' + (good ? "Good sentence · " : "Needs a clearer use · ") + answer.score + '/100</p>' +
        '<p class="vlx-feedback-text">' + escapeHtml(answer.feedback) + '</p>' +
      '</div>';
  }
  function renderSpeakingCard(card, answer) {
  var sp = state.speaking || {};
  var isRecording = sp.status === "recording";
  var isRecorded = !!sp.blob;
  var result = answer || sp.result || null;

  return '' +
    '<div class="vlx-speak-box">' +
      '<p class="vlx-speak-prompt">Say one clear sentence using <strong>' + escapeHtml(state.word.title) + '</strong>.</p>' +
      '<p class="vlx-speak-note">MVP goal: check target-word use, meaning, grammar, and naturalness. This is not a full pronunciation score yet.</p>' +

      '<div class="vlx-record-row">' +
        '<button class="vlx-button vlx-button-primary" type="button" data-action="start-speaking" ' + (isRecording ? "disabled" : "") + '>Record</button>' +
        '<button class="vlx-button vlx-button-secondary" type="button" data-action="stop-speaking" ' + (!isRecording ? "disabled" : "") + '>Stop</button>' +
        '<button class="vlx-button vlx-button-secondary" type="button" data-action="check-speaking" ' + (!isRecorded ? "disabled" : "") + '>Check speaking</button>' +
      '</div>' +

      '<div class="vlx-record-status">' +
        '<span class="vlx-record-dot ' + (isRecording ? "is-on" : "") + '"></span>' +
        '<span>' + escapeHtml(speakingStatusText(sp)) + '</span>' +
      '</div>' +

      (sp.url ? '<audio class="vlx-audio-player" controls src="' + escapeAttr(sp.url) + '"></audio>' : '') +

      (result ? renderSpeakingFeedback(result) : '') +

      (sp.error ? '<p class="vlx-speaking-error">' + escapeHtml(sp.error) + '</p>' : '') +

      '<div class="vlx-card-actions">' +
        (result ? '<button class="vlx-button vlx-button-primary" data-action="next-card">' + nextButtonText() + '</button>' : '') +
      '</div>' +
    '</div>';
}

function speakingStatusText(sp) {
  if (!sp || !sp.status || sp.status === "idle") return "Ready to record.";
  if (sp.status === "recording") return "Recording... speak one complete sentence.";
  if (sp.status === "recorded") return "Recording captured. You can play it back or check speaking.";
  if (sp.status === "checking") return "Checking speaking...";
  if (sp.status === "checked") return "Speaking feedback ready.";
  if (sp.status === "error") return "Recording failed.";
  return "Ready.";
}

function renderSpeakingFeedback(result) {
  return '' +
    '<div class="vlx-speaking-result">' +
      '<p class="vlx-speaking-result-title">Speaking usage · ' + escapeHtml(result.score || 0) + '/100</p>' +
      (result.transcript ? '<div class="vlx-transcript-box"><strong>Transcript:</strong><br>' + escapeHtml(result.transcript) + '</div>' : '') +
      '<p class="vlx-speaking-result-text">' + escapeHtml(result.feedback || "Speaking checked.") + '</p>' +
      (result.better_version ? '<p class="vlx-speaking-result-text"><strong>Better version:</strong><br>' + escapeHtml(result.better_version) + '</p>' : '') +
    '</div>';
}

  function renderFeedback(card, answer) {
    if (!answer) return "";

    return '' +
      '<div class="vlx-feedback ' + (answer.correct ? "is-good" : "is-bad") + '">' +
        '<p class="vlx-feedback-title">' + (answer.correct ? "Correct" : "Not quite") + '</p>' +
        '<p class="vlx-feedback-text">' + escapeHtml(card.explanation) + '</p>' +
      '</div>' +
      '<div class="vlx-card-actions">' +
        '<button class="vlx-button vlx-button-primary" data-action="next-card">' + nextButtonText() + '</button>' +
      '</div>';
  }

  function nextButtonText() {
    return state.index >= state.cards.length - 1 ? "See result" : "Next card";
  }

  function renderSideCard(word) {
    var img = word.image || makeTileImage(word.visual || { emoji: "✨", label: word.title });

    return '' +
      '<aside class="vlx-side-card">' +
        '<div class="vlx-side-image">' +
          '<img alt="' + escapeAttr(word.title) + '" src="' + escapeAttr(img) + '">' +
        '</div>' +
        '<h2 class="vlx-side-title">' + escapeHtml(word.title) + '</h2>' +
        '<p class="vlx-side-definition">' + escapeHtml(word.definition) + '</p>' +
        '<div class="vlx-mini-list">' +
          '<div class="vlx-mini-item"><span>Goal</span><span>Know → Remember → Use</span></div>' +
          '<div class="vlx-mini-item"><span>Cards</span><span>5</span></div>' +
          '<div class="vlx-mini-item"><span>Mode</span><span>Single word</span></div>' +
        '</div>' +
        '<div class="vlx-card-actions">' +
          '<button class="vlx-button vlx-button-secondary vlx-button-small" data-action="save-word">Save word</button>' +
          '<button class="vlx-button vlx-button-ghost vlx-button-small" data-action="back-word">Back to word page</button>' +
        '</div>' +
      '</aside>';
  }

  function makeTileImage(visual) {
    var emoji = visual && visual.emoji ? visual.emoji : "✨";
    var label = visual && visual.label ? visual.label : "Visual practice card";

    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="700" viewBox="0 0 900 700">' +
        '<defs>' +
          '<linearGradient id="g" x1="0" x2="1" y1="0" y2="1">' +
            '<stop offset="0%" stop-color="#fffaf6"/>' +
            '<stop offset="100%" stop-color="#ffe8dd"/>' +
          '</linearGradient>' +
          '<filter id="s" x="-20%" y="-20%" width="140%" height="140%">' +
            '<feDropShadow dx="0" dy="22" stdDeviation="22" flood-color="#1f2528" flood-opacity="0.15"/>' +
          '</filter>' +
        '</defs>' +
        '<rect width="900" height="700" rx="54" fill="url(#g)"/>' +
        '<circle cx="710" cy="120" r="150" fill="#f36f5d" opacity="0.13"/>' +
        '<rect x="310" y="150" width="280" height="280" rx="70" fill="#ffffff" filter="url(#s)"/>' +
        '<text x="450" y="326" text-anchor="middle" dominant-baseline="middle" font-size="112">' + escapeSvg(emoji) + '</text>' +
        '<text x="450" y="510" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="700" fill="#6f777c">' + escapeSvg(label).slice(0, 80) + '</text>' +
      '</svg>';

    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }

  function escapeSvg(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
function resetSpeakingState() {
  try {
    if (state.speaking && state.speaking.url) {
      URL.revokeObjectURL(state.speaking.url);
    }
  } catch (e) {}

  stopSpeakingStream();

  state.speaking = {
    recorder: null,
    stream: null,
    chunks: [],
    blob: null,
    url: "",
    status: "idle",
    result: null,
    error: ""
  };
}

function stopSpeakingStream() {
  var stream = state.speaking && state.speaking.stream;
  if (stream && stream.getTracks) {
    stream.getTracks().forEach(function (track) {
      try { track.stop(); } catch (e) {}
    });
  }
}

function preferredAudioMimeType() {
  var types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/mpeg"
  ];

  if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return "";

  for (var i = 0; i < types.length; i++) {
    if (MediaRecorder.isTypeSupported(types[i])) return types[i];
  }

  return "";
}

async function startSpeaking() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
    state.speaking.error = "This browser does not support microphone recording here.";
    state.speaking.status = "error";
    renderPractice();
    return;
  }

  resetSpeakingState();

  try {
    var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    var mimeType = preferredAudioMimeType();
    var recorder = mimeType
      ? new MediaRecorder(stream, { mimeType: mimeType })
      : new MediaRecorder(stream);

    state.speaking.stream = stream;
    state.speaking.recorder = recorder;
    state.speaking.chunks = [];
    state.speaking.status = "recording";
    state.speaking.error = "";

    recorder.ondataavailable = function (event) {
      if (event.data && event.data.size > 0) {
        state.speaking.chunks.push(event.data);
      }
    };

    recorder.onstop = function () {
      var type = recorder.mimeType || "audio/webm";
      var blob = new Blob(state.speaking.chunks, { type: type });

      state.speaking.blob = blob;
      state.speaking.url = URL.createObjectURL(blob);
      state.speaking.status = "recorded";
      state.speaking.error = "";

      stopSpeakingStream();
      renderPractice();
    };

    recorder.start();
    renderPractice();
  } catch (error) {
    state.speaking.status = "error";
    state.speaking.error = "Microphone permission was blocked or unavailable.";
    stopSpeakingStream();
    renderPractice();
  }
}

function stopSpeaking() {
  var recorder = state.speaking && state.speaking.recorder;

  if (recorder && recorder.state === "recording") {
    recorder.stop();
  } else {
    stopSpeakingStream();
    state.speaking.status = "recorded";
    renderPractice();
  }
}

async function checkSpeaking() {
  var sp = state.speaking || {};

  if (!sp.blob) {
    toast("Record one sentence first.");
    return;
  }

  state.speaking.status = "checking";
  state.speaking.error = "";
  renderPractice();

  var result;

  try {
    if (SPEAKING_CHECK_ENDPOINT) {
      result = await submitSpeakingToEndpoint(sp.blob, state.word);
    } else {
      result = localSpeakingFallback(state.word, sp.blob);
    }

    state.speaking.status = "checked";
    state.speaking.result = result;

    state.answers[state.index] = {
      cardId: "use",
      type: "speaking",
      score: result.score,
      transcript: result.transcript || "",
      feedback: result.feedback || "",
      better_version: result.better_version || "",
      correct: Number(result.score || 0) >= 65,
      responseMs: Date.now() - state.cardStartedAt,
      createdAt: new Date().toISOString()
    };

    appendLocalStorageArray(SPEAKING_ATTEMPTS_KEY, {
      word_slug: state.word.slug,
      word: state.word.title,
      score: result.score,
      transcript: result.transcript || "",
      feedback: result.feedback || "",
      better_version: result.better_version || "",
      source: "visual-trainer-speaking",
      created_at: new Date().toISOString()
    }, 200);

    renderPractice();
  } catch (error) {
    state.speaking.status = "error";
    state.speaking.error = "Speaking check failed. The recording was captured, but the AI endpoint is not connected or returned an error.";
    renderPractice();
  }
}

async function submitSpeakingToEndpoint(blob, word) {
  var form = new FormData();
  form.append("audio", blob, word.slug + "-speaking.webm");
  form.append("slug", word.slug);
  form.append("word", word.title);
  form.append("mode", "single_sentence");

  var res = await fetch(SPEAKING_CHECK_ENDPOINT, {
    method: "POST",
    body: form
  });

  if (!res.ok) {
    throw new Error("Speaking endpoint failed");
  }

  return await res.json();
}

function localSpeakingFallback(word, blob) {
  return {
    ok: true,
    score: 70,
    transcript: "",
    target_word_used: null,
    meaning_clear: null,
    grammar_quality: "not checked",
    naturalness: "not checked",
    feedback: "Recording captured. AI transcription is not connected yet, so this is a local MVP placeholder. Once the speaking endpoint is connected, this card will show transcript, target-word use, grammar, and naturalness feedback.",
    better_version: "Say one clear sentence using “" + word.title + "” in a real context."
  };
}
  function choose(index) {
    var card = state.cards[state.index];
    if (!card || state.answers[state.index]) return;

    var selected = Number(index);
    var correct = selected === card.correctIndex;

    state.answers[state.index] = {
      cardId: card.id,
      type: card.type,
      selectedIndex: selected,
      correctIndex: card.correctIndex,
      correct: correct,
      responseMs: Date.now() - state.cardStartedAt,
      createdAt: new Date().toISOString()
    };

    renderPractice();
  }

  function checkWriting() {
    var input = document.getElementById("vlx-writing-input");
    if (!input) return;

    var sentence = input.value.trim();
    var result = scoreSentence(sentence, state.word);

    state.answers[state.index] = {
      cardId: "use",
      type: "writing",
      sentence: sentence,
      score: result.score,
      feedback: result.feedback,
      correct: result.score >= 65,
      responseMs: Date.now() - state.cardStartedAt,
      createdAt: new Date().toISOString()
    };

    appendLocalStorageArray(USE_ATTEMPTS_KEY, {
      word_slug: state.word.slug,
      word: state.word.title,
      sentence: sentence,
      score: result.score,
      feedback: result.feedback,
      source: "visual-trainer",
      created_at: new Date().toISOString()
    }, 200);

    renderPractice();
  }

  function scoreSentence(sentence, word) {
    var clean = sentence.trim();
    var lower = clean.toLowerCase();
    var tokens = String(word.title || "")
      .toLowerCase()
      .split(/\s+/)
      .map(function (x) { return x.replace(/[^a-z0-9]/g, ""); })
      .filter(function (x) { return x.length > 2; });

    var containsWord = tokens.length
      ? tokens.every(function (token) {
          return new RegExp("\\b" + escapeRegExp(token) + "\\b", "i").test(lower);
        })
      : false;

    var wordCount = clean.split(/\s+/).filter(Boolean).length;
    var hasSentenceShape = /[.!?]$/.test(clean);
    var hasContext = wordCount >= 8;
    var notTooShort = wordCount >= 6;

    var score = 0;
    if (containsWord) score += 42;
    if (notTooShort) score += 18;
    if (hasContext) score += 22;
    if (hasSentenceShape) score += 8;
    if (wordCount >= 12) score += 10;

    score = Math.max(0, Math.min(100, score));

    var feedback = "";
    if (!clean) {
      feedback = "Write one full sentence first.";
    } else if (!containsWord) {
      feedback = "Use the target word or phrase directly in your sentence.";
    } else if (!hasContext) {
      feedback = "Good start. Add more context so the meaning is clear from the sentence itself.";
    } else if (!hasSentenceShape) {
      feedback = "Nice use. Add final punctuation to make it feel complete.";
    } else {
      feedback = "Strong MVP answer. The sentence uses the word with enough context.";
    }

    return {
      score: score,
      feedback: feedback
    };
  }

  function nextCard() {
    if (state.index >= state.cards.length - 1) {
      renderResult();
      return;
    }

    state.index += 1;
    state.cardStartedAt = Date.now();
    renderPractice();

    try {
      state.root.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {}
  }

  function renderResult() {
    var total = state.cards.length;
    var score = state.answers.filter(function (a) { return a && a.correct; }).length;

    if (!state.hasStoredResult) {
      state.hasStoredResult = true;

      appendLocalStorageArray(TRAINER_ATTEMPTS_KEY, {
        session_id: state.sessionId,
        word_slug: state.word.slug,
        word: state.word.title,
        score: score,
        total: total,
        answers: state.answers,
        source: "visual-trainer",
        created_at: new Date().toISOString()
      }, 150);

      updateReviewQueue(state.word, score, total);
    }

    state.root.innerHTML =
      '<div class="vlx-trainer-shell">' +
        '<section class="vlx-result-grid">' +
          '<article class="vlx-score-card">' +
            '<div class="vlx-kicker">Practice complete</div>' +
            '<h1 class="vlx-section-title">' + escapeHtml(state.word.title) + '</h1>' +
            '<div class="vlx-score">' + score + '/' + total + '</div>' +
            '<p class="vlx-section-desc">' + resultMessage(score, total) + '</p>' +
            '<div class="vlx-card-actions">' +
              '<button class="vlx-button vlx-button-primary" data-action="restart">Practice again</button>' +
              '<button class="vlx-button vlx-button-secondary" data-action="save-word">Save word</button>' +
              '<button class="vlx-button vlx-button-secondary" data-action="jump-use">Use this word</button>' +
              '<button class="vlx-button vlx-button-ghost" data-action="back-word">Back to word page</button>' +
            '</div>' +
          '</article>' +
          '<aside class="vlx-panel">' +
            '<p class="vlx-eyebrow">Card summary</p>' +
            '<h2 class="vlx-section-title">What happened</h2>' +
            '<div class="vlx-result-list">' +
              state.cards.map(function (card, i) {
                var answer = state.answers[i];
                var good = answer && answer.correct;
                return '' +
                  '<div class="vlx-result-item">' +
                    '<div class="vlx-result-mark ' + (good ? "good" : "bad") + '">' + (good ? "✓" : "×") + '</div>' +
                    '<div class="vlx-result-copy">' +
                      '<strong>' + escapeHtml(card.label.replace(/Card\s\d\s\/\s/i, "")) + '</strong>' +
                      '<span>' + escapeHtml(good ? "Passed" : "Review this once more") + '</span>' +
                    '</div>' +
                  '</div>';
              }).join("") +
            '</div>' +
          '</aside>' +
        '</section>' +
      '</div>';
  }

  function resultMessage(score, total) {
    var ratio = total ? score / total : 0;
    if (ratio >= 0.9) return "Excellent. This word is ready for a longer review interval.";
    if (ratio >= 0.7) return "Good session. Save it and review again later to make it stick.";
    if (ratio >= 0.45) return "Useful first pass. The word should stay near the top of your review queue.";
    return "This is still new. Repeat the 5-card loop once more.";
  }

  function restartPractice() {
    state.cards = buildCards(state.word);
    state.index = 0;
    state.answers = [];
    state.useMode = "write";
resetSpeakingState();
    state.cardStartedAt = Date.now();
    state.hasStoredResult = false;
    state.sessionId = "vlx_" + Date.now() + "_" + Math.random().toString(16).slice(2);
    renderPractice();
  }

  function jumpToUseCard() {
    state.index = 4;
    state.cardStartedAt = Date.now();
    renderPractice();
  }

  function backToWordPage() {
    var url = state.word && state.word.url ? state.word.url : "/photos/" + (state.word ? state.word.slug : "");
    window.location.href = url;
  }

  function toast(message) {
    var existing = document.querySelector(".vlx-toast");
    if (!existing) {
      existing = document.createElement("div");
      existing.className = "vlx-toast";
      document.body.appendChild(existing);
    }

    existing.textContent = message;
    existing.classList.add("is-visible");

    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () {
      existing.classList.remove("is-visible");
    }, 2200);
  }

  function bindEvents() {
    state.root.addEventListener("click", async function (event) {
      var target = event.target.closest("[data-action]");
      if (!target) return;

      var action = target.getAttribute("data-action");

      if (action === "choose") {
        choose(target.getAttribute("data-choice"));
      }

      if (action === "check-writing") {
        checkWriting();
      }

      if (action === "next-card") {
        nextCard();
      }

      if (action === "set-use-mode") {
  state.useMode = target.getAttribute("data-mode") || "write";
  renderPractice();
}

if (action === "start-speaking") {
  await startSpeaking();
}

if (action === "stop-speaking") {
  stopSpeaking();
}

if (action === "check-speaking") {
  await checkSpeaking();
}
      
      if (action === "save-word") {
        if (state.word) saveWord(state.word);
      }

      if (action === "back-word") {
        backToWordPage();
      }

      if (action === "go-home") {
        history.pushState({}, "", "/visual-trainer");
        renderHome();
      }

      if (action === "restart") {
        restartPractice();
      }

      if (action === "jump-use") {
        jumpToUseCard();
      }

      if (action === "start-word") {
        var word = normalizeSlug(target.getAttribute("data-word"));
        startWord(word, true);
      }

      if (action === "start-input") {
        var input = document.getElementById("vlx-word-input");
        var raw = input ? input.value : "";
        var slug = normalizeSlug(raw);
        if (!slug) {
          toast("Enter a word or slug first.");
          return;
        }
        startWord(slug, true);
      }

      if (action === "scroll-decks") {
        var decks = document.getElementById("vlx-starter-decks");
        if (decks) decks.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });

    state.root.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && event.target && event.target.id === "vlx-word-input") {
        event.preventDefault();
        var slug = normalizeSlug(event.target.value);
        if (slug) startWord(slug, true);
      }
    });
  }

  async function startWord(slug, updateUrl) {
    if (!slug) return;

    if (updateUrl) {
      var nextUrl = "/visual-trainer?word=" + encodeURIComponent(slug) + "#demo-quiz";
      history.pushState({}, "", nextUrl);
    }

    renderLoading(slug);

    var word = await resolveWord(slug);

    state.mode = "single";
    state.word = word;
    state.cards = buildCards(word);
    state.index = 0;
    state.answers = [];
    state.useMode = "write";
resetSpeakingState();
    state.cardStartedAt = Date.now();
    state.hasStoredResult = false;
    state.sessionId = "vlx_" + Date.now() + "_" + Math.random().toString(16).slice(2);

    renderPractice();
  }

  function getInitialWordParam() {
    var params = new URLSearchParams(window.location.search);
    return normalizeSlug(params.get("word") || "");
  }

  function init() {
    state.root = ensureMount();
    bindEvents();

    var word = getInitialWordParam();

    if (word) {
      startWord(word, false);
    } else {
      renderHome();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();