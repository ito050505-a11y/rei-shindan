/* =========================================================
 * 画面の表示と操作
 * 回答・入力内容はブラウザのメモリ内だけで扱います（送信・保存なし）
 * ========================================================= */
(function () {
  var C = window.REI_CONTENT;
  var CFG = window.REI_CONFIG || {};
  var L = window.REI_LOGIC;
  var app = document.getElementById("app");
  var TOTAL = C.questions.length;
  var GROUPS = C.profile.groups;

  function initialState() {
    return {
      screen: "intro",      // intro / profile / question / result
      q: 0,
      profile: {},          // { age, job }
      answers: {},          // { q1..q5 }
      form: { name: "", date1: "", date2: "", date3: "" },
      applyOpen: false,
      dateSlots: 1,
      triedCopy: false,     // 一度コピーを押したら、未入力の必須欄に案内を出し続ける         // 表示中の希望日時欄の数（1〜3）
      copiedText: null      // 最後にコピーした申込み文（変更検知用）
    };
  }
  var state = initialState();

  /* ---------- 線画アイコン（装飾用・読み上げなし） ---------- */
  var ICONS = {
    flag: '<path d="M5 21V4"/><path d="M5 4h11l-2.5 4L16 12H5"/>',
    book: '<path d="M3 5.5h5.5A3.5 3.5 0 0 1 12 9v11a3 3 0 0 0-3-3H3z"/><path d="M21 5.5h-5.5A3.5 3.5 0 0 0 12 9v11a3 3 0 0 1 3-3h6z"/>',
    message: '<path d="M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4 19.5l1.3-4.6A7.5 7.5 0 1 1 20 11.5z"/><path d="M9 11.5h.01M12.5 11.5h.01M16 11.5h.01"/>',
    sprout: '<path d="M12 21v-8"/><path d="M12 13C12 9 9.5 6 4.5 6c0 4 2.8 7 7.5 7z"/><path d="M12 15c0-3.3 2.3-6.5 7.5-6.5 0 3.6-2.8 6.5-7.5 6.5z"/>',
    bulb: '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    chat: '<path d="M14 9.5a5.5 5.5 0 0 1-8 4.9L3 15.5l.9-3A5.5 5.5 0 1 1 14 9.5z"/><path d="M10.5 18.3a5.5 5.5 0 0 0 7.5 1.2l3 1-.9-3a5.5 5.5 0 0 0-3-8.3"/>'
  };
  function icon(name) {
    return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (ICONS[name] || "") + '</svg>';
  }

  /* ---------- 小さな道具 ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function profileDone() { return GROUPS.every(function (g) { return !!state.profile[g.id]; }); }
  function answersDone() { return C.questions.every(function (q) { return !!state.answers[q.id]; }); }
  function allDone() { return profileDone() && answersDone(); }
  function lineUrl() {
    var u = (CFG.lineUrl || "").trim();
    return /^https:\/\/\S+$/.test(u) ? u : "";
  }
  function lines(arr) {
    return arr.map(function (t) { return '<span class="nb">' + esc(t) + '</span>'; }).join("");
  }
  function currentText() {
    return L.buildApplicationText(L.buildResult(state.answers, C), C, state.profile, state.form);
  }
  function missingFields() {
    var m = [];
    if (!state.form.name.trim()) m.push("name");
    if (!state.form.date1.trim()) m.push("date1");
    return m;
  }
  function optionsHTML(name, options, selected) {
    return options.map(function (o) {
      var checked = selected === o.id;
      return (
        '<label class="option' + (checked ? " is-selected" : "") + '">' +
          '<input type="radio" name="' + name + '" value="' + o.id + '"' + (checked ? " checked" : "") + '>' +
          '<span class="option-mark" aria-hidden="true"></span>' +
          '<span class="option-label">' + esc(o.label) + '</span>' +
        '</label>'
      );
    }).join("");
  }
  function backToResultHTML() {
    return allDone()
      ? '<p class="q-return"><button type="button" class="link-btn" data-action="toResult">' + esc(C.ui.backToResult) + '</button></p>'
      : "";
  }

  var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>';

  /* ---------- トップ ---------- */
  // トップのイラスト（スマホ＋吹き出し・装飾）
  var HERO_ART =
    '<svg class="hero-art" viewBox="0 0 120 110" aria-hidden="true" focusable="false">' +
      '<rect x="34" y="14" width="46" height="84" rx="10" fill="#FFFFFF" stroke="#6941C6" stroke-width="2.5"/>' +
      '<rect x="51" y="20" width="12" height="3" rx="1.5" fill="#D9CFF7"/>' +
      '<rect x="42" y="32" width="30" height="20" rx="5" fill="#EEE9FD"/>' +
      '<rect x="42" y="58" width="22" height="4" rx="2" fill="#D9CFF7"/>' +
      '<rect x="42" y="66" width="28" height="4" rx="2" fill="#D9CFF7"/>' +
      '<rect x="42" y="74" width="16" height="4" rx="2" fill="#D9CFF7"/>' +
      '<path d="M78 8h30a8 8 0 0 1 8 8v14a8 8 0 0 1-8 8H94l-7 7v-7h-9a8 8 0 0 1-8-8V16a8 8 0 0 1 8-8z" fill="#6941C6"/>' +
      '<circle cx="85" cy="23" r="2.4" fill="#fff"/><circle cx="93" cy="23" r="2.4" fill="#fff"/><circle cx="101" cy="23" r="2.4" fill="#fff"/>' +
      '<path d="M8 58h20a6 6 0 0 1 6 6v8a6 6 0 0 1-6 6h-6l-5 5v-5H8a6 6 0 0 1-6-6v-8a6 6 0 0 1 6-6z" fill="#FFF1A8"/>' +
      '<path d="M11 68l4 4 8-8" fill="none" stroke="#20243A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>';

  /* ---------- トップ ---------- */
  function introView() {
    var I = C.intro;
    return (
      '<section class="screen intro">' +
        '<div class="hero">' +
          HERO_ART +
          '<p class="hero-label">' + esc(I.label) + '</p>' +
          '<h1 class="intro-title" tabindex="-1" data-focus>' +
            '<span class="intro-main">' +
              '<span class="t1">' + esc(I.titleLines[0]) + '</span>' +
              '<span class="t2"><span class="t2-text">' + esc(I.titleLines[1]) + '</span></span>' +
            '</span>' +
            '<span class="intro-sub">' + esc(I.subtitle) + '</span>' +
          '</h1>' +
          '<p class="intro-lead">' + lines(I.leadLines || [I.lead]) + '</p>' +
          '<p class="intro-meta">' + esc(I.meta) + '</p>' +
        '</div>' +
        '<div class="start">' +
          '<p class="start-catch" aria-hidden="true"><span>＼</span>' + esc(I.buttonCatch) + '<span>／</span></p>' +
          '<button type="button" class="btn btn-start btn-block" data-action="start">' +
            '<span class="start-text">' + esc(I.startButton) + '</span>' +
            '<span class="start-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg></span>' +
          '</button>' +
        '</div>' +
        (I.giftNote ? '<p class="gift-note">' + esc(I.giftNote) + '</p>' : "") +
      '</section>'
    );
  }

  /* ---------- 年代・職業（質問１／５には含めない） ---------- */
  function profileView() {
    var P = C.profile;
    var groups = GROUPS.map(function (g) {
      return (
        '<fieldset class="p-group" aria-describedby="err-' + g.id + '">' +
          '<legend class="p-legend">' + esc(g.title) + '</legend>' +
          '<div class="options' + (g.id === "age" ? " options-2col" : "") + '">' + optionsHTML(g.id, g.options, state.profile[g.id]) + '</div>' +
          '<p class="q-error" id="err-' + g.id + '" role="alert"></p>' +
        '</fieldset>'
      );
    }).join("");
    return (
      '<section class="screen profile">' +
        '<p class="pre-label">' + esc(P.stepLabel) + '</p>' +
        '<h1 class="q-title p-title" tabindex="-1" data-focus>' + lines(P.titleLines || [P.title]) + '</h1>' +
        '<p class="p-note">' + esc(P.note) + '</p>' +
        groups +
        '<div class="q-nav">' +
          '<button type="button" class="btn btn-ghost" data-action="back">' + esc(C.ui.back) + '</button>' +
          '<button type="button" class="btn btn-primary" data-action="profileNext" aria-disabled="' + (profileDone() ? "false" : "true") + '">' + esc(P.button) + '</button>' +
        '</div>' +
        backToResultHTML() +
      '</section>'
    );
  }

  /* ---------- 質問 ---------- */
  function questionView() {
    var q = C.questions[state.q];
    var n = state.q + 1;
    var isLast = n === TOTAL;
    var selected = state.answers[q.id];
    var progress = C.ui.progress.replace("{n}", n).replace("{total}", TOTAL);
    return (
      '<section class="screen question">' +
        '<div class="progress">' +
          '<p class="progress-label" id="progress-label">' + esc(progress) + '</p>' +
          '<div class="progress-track" role="progressbar" aria-labelledby="progress-label" aria-valuemin="1" aria-valuemax="' + TOTAL + '" aria-valuenow="' + n + '">' +
            '<span class="progress-fill" style="width:' + (n / TOTAL * 100) + '%"></span>' +
          '</div>' +
        '</div>' +
        '<fieldset class="q-fieldset" aria-describedby="q-error' + (q.note ? " q-note" : "") + '">' +
          '<legend class="q-title" tabindex="-1" data-focus>' + esc(q.title) + '</legend>' +
          (q.note ? '<p class="q-note" id="q-note">' + esc(q.note) + '</p>' : "") +
          '<div class="options">' + optionsHTML(q.id, q.options, selected) + '</div>' +
        '</fieldset>' +
        '<p class="q-error" id="q-error" role="alert"></p>' +
        '<div class="q-nav">' +
          '<button type="button" class="btn btn-ghost" data-action="back">' + esc(C.ui.back) + '</button>' +
          '<button type="button" class="btn btn-primary" data-action="next" aria-disabled="' + (selected ? "false" : "true") + '">' +
            esc(isLast ? C.ui.finish : C.ui.next) + '</button>' +
        '</div>' +
        backToResultHTML() +
      '</section>'
    );
  }

  /* ---------- 結果 ---------- */
  function fieldHTML(id, label, required, placeholder, autocomplete) {
    var B = C.benefit;
    var errMsg = (state.triedCopy && required && !state.form[id].trim())
      ? (id === "name" ? B.nameError : B.date1Error) : "";
    return (
      '<div class="field">' +
        '<label class="field-label" for="f-' + id + '">' + esc(label) +
          '<span class="tag' + (required ? " tag-req" : "") + '">' + esc(required ? B.required : B.optional) + '</span></label>' +
        '<input class="field-input" id="f-' + id + '" type="text" data-field="' + id + '" value="' + esc(state.form[id]) + '"' +
          (placeholder ? ' placeholder="' + esc(placeholder) + '"' : "") +
          (autocomplete ? ' autocomplete="' + autocomplete + '"' : ' autocomplete="off"') +
          (required ? ' aria-required="true"' : "") +
          (errMsg ? ' aria-invalid="true"' : "") +
          ' aria-describedby="e-' + id + '">' +
        '<p class="field-error" id="e-' + id + '">' + esc(errMsg) + '</p>' +
      '</div>'
    );
  }

  // 開催情報：config.js で入力された項目だけ表示（未設定なら何も出さない）
  function sessionInfoHTML() {
    var info = CFG.sessionInfo || {};
    var labels = C.benefit.sessionLabels;
    var rows = Object.keys(labels).filter(function (k) {
      return String(info[k] || "").trim();
    }).map(function (k) {
      return '<div><dt>' + esc(labels[k]) + '</dt><dd>' + esc(String(info[k]).trim()) + '</dd></div>';
    });
    return rows.length ? '<dl class="session-info">' + rows.join("") + '</dl>' : "";
  }

  function resultView() {
    var r = L.buildResult(state.answers, C);
    var R = C.results, B = C.benefit, V = C.review;
    var text = currentText();
    var url = lineUrl();
    var ready = state.copiedText !== null && state.copiedText === text;
    var changed = state.copiedText !== null && state.copiedText !== text;

    var LINE_ICON = '<span class="line-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.5 3 2 6.6 2 11c0 2.5 1.4 4.7 3.7 6.2-.2.9-.7 2.6-.8 3-.1.5.2.5.4.4.2-.1 2.9-1.9 4-2.7.9.2 1.8.3 2.7.3 5.5 0 10-3.6 10-8.2S17.5 3 12 3z"/></svg></span>';
    var lineBtn = url
      ? '<a class="btn btn-block btn-line' + (ready ? " is-ready" : "") + '" id="line-btn" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' +
          LINE_ICON + '<span class="line-text">' + esc(B.lineButton) + '</span>' +
          '<span class="line-arrow" aria-hidden="true">' + ARROW + '</span>' +
          '<span class="sr-only">（新しいタブで開きます）</span></a>'
      : '<button type="button" class="btn btn-block btn-line" aria-disabled="true" aria-describedby="line-missing" data-action="lineMissing">' + esc(B.lineButton) + '</button>' +
        '<p class="line-missing" id="line-missing">' + esc(B.lineMissing) + '</p>';

    var slots = Math.max(state.dateSlots, state.form.date3.trim() ? 3 : state.form.date2.trim() ? 2 : 1);
    var dateFields = fieldHTML("date1", B.dateLabels[0], true, B.datePlaceholder) +
      (slots >= 2 ? fieldHTML("date2", B.dateLabels[1], false, B.datePlaceholder) : "") +
      (slots >= 3 ? fieldHTML("date3", B.dateLabels[2], false, B.datePlaceholder) : "") +
      (slots < 3 ? '<button type="button" class="add-date" data-action="addDate"><span aria-hidden="true">＋</span>' + esc(B.addDate) + '</button>' : "");

    var reviewItems = GROUPS.map(function (g) {
      var o = g.options.find(function (x) { return x.id === state.profile[g.id]; });
      return { q: g.title, a: o ? o.label : "", action: "editProfile", idx: "" };
    }).concat(C.questions.map(function (q, i) {
      return { q: q.title, a: r.picked[i].label, action: "edit", idx: i };
    }));
    var reviewList = reviewItems.map(function (it) {
      return (
        '<li><p class="review-q">' + esc(it.q) + '</p>' +
        '<div class="review-a"><span>' + esc(it.a) + '</span>' +
        '<button type="button" class="link-btn" data-action="' + it.action + '"' + (it.action === "edit" ? ' data-q="' + it.idx + '"' : "") + '>' +
          esc(V.edit) + '<span class="sr-only">：' + esc(it.q) + '</span></button></div></li>'
      );
    }).join("");

    return (
      '<section class="screen result">' +

        // ① 結果ドーン（Q3）＋ 今日やるなら、これ
        '<header class="reco">' +
          '<p class="reco-label">' + esc(R.recoLabel) + '</p>' +
          '<h1 class="reco-title" tabindex="-1" data-focus>' +
            '<span class="reco-l1">' + esc(r.stage.recoLines[0]) + '</span>' +
            '<span class="reco-l2"><span class="reco-l2-text">' + esc(r.stage.recoLines[1]) + '</span></span>' +
          '</h1>' +
          '<div class="today">' +
            '<p class="today-label"><span class="today-icon">' + icon("check") + '</span>' + esc(R.todayLabel) + '</p>' +
            '<p class="today-text">' + lines(r.stage.todayLines || [r.stage.today]) + '</p>' +
          '</div>' +
        '</header>' +

        // ② 詳細はプルダウンで（目標・時間・悩み）
        '<details class="more">' +
          '<summary><span class="more-title">' + esc(R.moreLabel) + '</span>' +
            '<span class="sr-only">（' + esc(R.moreSub) + '）</span>' +
            '<span class="chev" aria-hidden="true"></span></summary>' +
          '<div class="more-body">' +
            '<div class="detail-item goal"><p class="detail-label goal-label">' + esc(R.futureHeading) + '</p>' +
              '<p class="goal-text">' + esc(r.future) + '</p></div>' +
            [r.actions[1], r.actions[2]].map(function (a, k) {
              return '<div class="detail-item hint"><p class="detail-label hint-label">' + esc(R.hintLabels[k]) + '</p>' +
                '<p class="hint-title">' + esc(a.title) + '</p>' +
                '<p class="hint-text">' + esc(a.detail) + '</p></div>';
            }).join("") +
          '</div>' +
        '</details>' +

        // 結果 → 特典へのつながり
        '<div class="bridge-block">' +
          '<p class="bridge-label">' + esc(R.bridgeLabel) + '</p>' +
          '<p class="bridge">' + lines(r.stage.bridgeLines || [r.stage.bridge]) + '</p>' +
        '</div>' +

        // ④ 特典
        '<section class="benefit" id="benefit" aria-labelledby="h-benefit">' +
          '<p class="benefit-label">' + esc(B.label) + '</p>' +
          '<h2 class="benefit-title" id="h-benefit">' + lines(B.headingLines) + '</h2>' +
          '<p class="benefit-sub">' + lines(B.subLines || [B.sub]) + '</p>' +
          '<ol class="benefit-items">' + B.items.map(function (it, i) {
            return '<li class="b-item"><p class="b-title"><span class="b-icon">' + icon(it.icon) + '</span>' + esc(it.title) + '</p>' +
              '<p class="b-text">' + lines(it.textLines || [it.text]) + '</p></li>';
          }).join("") + '</ol>' +
          sessionInfoHTML() +
          '<p class="start-catch benefit-catch" aria-hidden="true"><span>＼</span>' + esc(B.buttonCatch) + '<span>／</span></p>' +
          '<button type="button" class="btn btn-accent btn-cta btn-block" data-action="openApply" aria-expanded="' + state.applyOpen + '" aria-controls="apply">' +
            '<span class="cta-text">' + lines(B.mainButtonLines || [B.mainButton]) + '</span>' +
            '<span class="cta-arrow" aria-hidden="true">' + ARROW + '</span></button>' +
          (B.note ? '<p class="benefit-note">' + lines(B.noteLines || [B.note]) + '</p>' : "") +
        '</section>' +

        // ⑤ 申込みフォーム
        '<section class="apply" id="apply" aria-labelledby="apply-title"' + (state.applyOpen ? "" : " hidden") + '>' +
          '<div class="form-card">' +
            '<h2 class="apply-title" id="apply-title" tabindex="-1"><span class="send-num" aria-hidden="true">1</span>' + esc(B.formHeading) + '</h2>' +
            fieldHTML("name", B.nameLabel, true, "", "name") +
            '<fieldset class="dates">' +
              '<legend class="field-label">' + esc(B.datesLabel) + '</legend>' +
              '<p class="dates-guide">' + esc(B.datesGuide) + '</p>' +
              dateFields +
            '</fieldset>' +
          '</div>' +

          '<ol class="send">' +
            '<li class="send-step">' +
              '<p class="apply-step"><span class="send-num" aria-hidden="true">2</span>' + esc(B.step1) + '</p>' +
              (B.privacyNote ? '<p class="privacy-note">' + lines(B.privacyNoteLines || [B.privacyNote]) + '</p>' : "") +
              '<button type="button" class="btn btn-block ' + copyBtnClass(ready) + '" id="copy-btn" data-action="copy">' + esc(B.copyButton) + '</button>' +
              '<div class="copy-status' + (changed ? " is-ng" : ready ? " is-ok" : "") + '" id="copy-status" role="status" aria-live="polite">' +
                (changed ? statusHTML("ng", B.copyChanged) : ready ? statusHTML("ok") : "") + '</div>' +
              '<details class="copy-text" id="copy-details">' +
                '<summary>' + esc(B.showText) + '</summary>' +
                '<label class="sr-only" for="copy-area">申込み文</label>' +
                '<textarea id="copy-area" readonly rows="18">' + esc(text) + '</textarea>' +
              '</details>' +
            '</li>' +
            '<li class="send-step">' +
              '<p class="apply-step"><span class="send-num" aria-hidden="true">3</span>' + esc(B.step2) + '</p>' +
              lineBtn +
              (B.scheduleNote ? '<p class="send-note">' + lines(B.scheduleNoteLines || [B.scheduleNote]) + '</p>' : "") +
            '</li>' +
          '</ol>' +
        '</section>' +

        // 回答の確認・修正
        '<section class="sec review">' +
          '<details class="review-box">' +
            '<summary>' + esc(V.heading) + '<span class="chev" aria-hidden="true"></span></summary>' +
            '<ol class="review-list">' + reviewList + '</ol>' +
          '</details>' +
          '<button type="button" class="btn btn-ghost btn-block" data-action="restart">' + esc(V.restart) + '</button>' +
          // 診断についての補足（ページの一番下）
          '<p class="disclaimer">' + lines(R.disclaimerLines || [R.disclaimer]) + '</p>' +
        '</section>' +
      '</section>' +
      // 結果を読んだ人を特典へ案内するフロートボタン（特典が見えたら隠れる）
      // ※ .screen のアニメーションの影響を受けないよう、画面の外側に置く
      '<div class="float-cta" id="float-cta" hidden>' +
        '<button type="button" class="btn btn-float btn-block" data-action="toBenefit">' + esc(R.floatButton) +
          '<span class="float-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="m6 13 6 6 6-6"/></svg></span>' +
        '</button>' +
      '</div>'
    );
  }

  /* ---------- 描画 ---------- */
  function render(moveFocus) {
    if (state.screen === "question" && !profileDone()) state.screen = "profile";
    if (state.screen === "result" && !allDone()) state.screen = profileDone() ? "question" : "profile";
    app.innerHTML =
      state.screen === "intro" ? introView() :
      state.screen === "profile" ? profileView() :
      state.screen === "question" ? questionView() : resultView();
    if (moveFocus) {
      window.scrollTo(0, 0);
      var f = app.querySelector("[data-focus]");
      if (f) f.focus({ preventScroll: true });
    }
    updateFloat();
  }
  // フロートボタン：結果の冒頭を読み終えたら表示、特典が画面に入ったら非表示
  function updateFloat() {
    var f = document.getElementById("float-cta");
    if (!f) return;
    var reco = app.querySelector(".reco");
    var benefit = document.getElementById("benefit");
    var vh = window.innerHeight;
    var show = reco && benefit &&
      reco.getBoundingClientRect().bottom < vh * 0.35 &&
      benefit.getBoundingClientRect().top > vh * 0.75;
    f.hidden = !show;
  }
  var floatTick = false;
  window.addEventListener("scroll", function () {
    if (floatTick) return;
    floatTick = true;
    requestAnimationFrame(function () { floatTick = false; updateFloat(); });
  }, { passive: true });
  window.addEventListener("resize", updateFloat);

  function go(screen, q) {
    state.screen = screen;
    if (typeof q === "number") state.q = q;
    render(true);
  }

  /* ---------- 申込み欄 ---------- */
  function showFieldError(id, msg) {
    var input = document.getElementById("f-" + id);
    var err = document.getElementById("e-" + id);
    if (!input || !err) return;
    err.textContent = msg || "";
    if (msg) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
  }
  function refreshText() {
    var ta = document.getElementById("copy-area");
    var status = document.getElementById("copy-status");
    if (!ta) return;
    var text = currentText();
    ta.value = text;
    if (state.copiedText !== null && state.copiedText !== text) {
      setStatus("ng", C.benefit.copyChanged);
    } else if (state.copiedText !== null && state.copiedText === text) {
      setStatus("ok");
    }
    setReady(state.copiedText !== null && state.copiedText === text);
  }
  // コピー結果の表示（成功は大きめの完了カード、注意は赤いカード）
  var CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  var ALERT_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 7v6"/><path d="M12 17h.01"/></svg>';
  function statusHTML(type, msg) {
    var B = C.benefit;
    if (type === "ok") {
      return '<span class="cs-icon">' + CHECK_SVG + '</span>' +
        '<span class="cs-body"><strong class="cs-title">' + esc(B.copySuccess) + '</strong>' +
        '<span class="cs-sub">' + lines(B.copySuccessLines || [B.copySuccessSub]) + '</span></span>';
    }
    return '<span class="cs-icon">' + ALERT_SVG + '</span><span class="cs-body"><span class="cs-msg">' + lines(String(msg).split(/(?<=。)/)) + '</span></span>';
  }
  function setStatus(type, msg) {
    var status = document.getElementById("copy-status");
    if (!status) return;
    if (!type) { status.className = "copy-status"; status.innerHTML = ""; return; }
    status.className = "copy-status " + (type === "ok" ? "is-ok" : "is-ng");
    status.innerHTML = statusHTML(type, msg);
  }

  // コピーボタンの見た目：未入力は控えめ → 入力済みで紫 → コピー済みで枠だけ
  function copyBtnClass(ready) {
    return ready ? "btn-outline" : (missingFields().length ? "btn-wait" : "btn-primary");
  }
  // コピー済みなら「公式LINEを開く」を主役に
  function setReady(ready) {
    var line = document.getElementById("line-btn");
    var copy = document.getElementById("copy-btn");
    if (line) line.classList.toggle("is-ready", ready);
    if (copy) copy.className = "btn btn-block " + copyBtnClass(ready);
  }

  function fallbackCopy(ta) {
    try {
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      return document.execCommand("copy");
    } catch (e) { return false; }
  }
  function copyText() {
    var B = C.benefit;
    var status = document.getElementById("copy-status");
    var missing = missingFields();
    state.triedCopy = true;
    showFieldError("name", missing.indexOf("name") > -1 ? B.nameError : "");
    showFieldError("date1", missing.indexOf("date1") > -1 ? B.date1Error : "");
    if (missing.length) {
      setStatus("ng", B.copyNeedInput);
      document.getElementById("f-" + missing[0]).focus();
      return;
    }
    var ta = document.getElementById("copy-area");
    var details = document.getElementById("copy-details");
    var text = currentText();
    ta.value = text;
    var ok = function () {
      state.copiedText = text;
      setStatus("ok");
      setReady(true);
    };
    var fail = function () {
      details.open = true;
      setStatus("ng", B.copyFailed);
      ta.focus();
      ta.select();
    };
    setStatus(null);
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(ok, function () { fallbackCopy(ta) ? ok() : fail(); });
    } else {
      fallbackCopy(ta) ? ok() : fail();
    }
  }

  /* ---------- 操作 ---------- */
  app.addEventListener("toggle", function () { updateFloat(); }, true);

  app.addEventListener("input", function (e) {
    var t = e.target;
    var key = t.getAttribute && t.getAttribute("data-field");
    if (!key) return;
    state.form[key] = t.value;
    if (t.value.trim()) showFieldError(key, "");
    refreshText();
  });

  app.addEventListener("change", function (e) {
    var t = e.target;
    if (t.type !== "radio") return;
    var isProfile = GROUPS.some(function (g) { return g.id === t.name; });
    if (isProfile) state.profile[t.name] = t.value; else state.answers[t.name] = t.value;
    app.querySelectorAll(".option").forEach(function (el) {
      el.classList.toggle("is-selected", el.querySelector("input").checked);
    });
    if (isProfile) {
      var pe = document.getElementById("err-" + t.name);
      if (pe) pe.textContent = "";
      var pn = app.querySelector('[data-action="profileNext"]');
      if (pn) pn.setAttribute("aria-disabled", profileDone() ? "false" : "true");
    } else {
      var next = app.querySelector('[data-action="next"]');
      if (next) next.setAttribute("aria-disabled", "false");
      var err = document.getElementById("q-error");
      if (err) err.textContent = "";
    }
  });

  app.addEventListener("click", function (e) {
    var el = e.target.closest("[data-action]");
    if (!el) return;
    switch (el.getAttribute("data-action")) {
      case "start":
        go("profile");
        break;
      case "profileNext":
        var firstMissing = null;
        GROUPS.forEach(function (g) {
          if (!state.profile[g.id]) {
            document.getElementById("err-" + g.id).textContent = g.error;
            if (!firstMissing) firstMissing = g.id;
          }
        });
        if (firstMissing) {
          var r0 = app.querySelector('input[name="' + firstMissing + '"]');
          if (r0) r0.focus();
          return;
        }
        go("question", 0);
        break;
      case "back":
        if (state.screen === "profile") go("intro");
        else if (state.q === 0) go("profile");
        else go("question", state.q - 1);
        break;
      case "next":
        var q = C.questions[state.q];
        if (!state.answers[q.id]) {
          document.getElementById("q-error").textContent = C.ui.selectError;
          var first = app.querySelector('input[type="radio"]');
          if (first) first.focus();
          return;
        }
        state.q + 1 < TOTAL ? go("question", state.q + 1) : go("result");
        break;
      case "toResult":
        go("result");
        break;
      case "edit":
        go("question", Number(el.getAttribute("data-q")));
        break;
      case "editProfile":
        go("profile");
        break;
      case "restart":
        if (window.confirm(C.review.restartConfirm)) {
          state = initialState();
          go("intro", 0);
        }
        break;
      case "openApply":
        state.applyOpen = true;
        el.setAttribute("aria-expanded", "true");
        document.getElementById("apply").hidden = false;
        var title = document.getElementById("apply-title");
        title.focus({ preventScroll: true });
        title.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
        break;
      case "toBenefit":
        var bt = document.getElementById("h-benefit");
        document.getElementById("benefit").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
        bt.setAttribute("tabindex", "-1");
        bt.focus({ preventScroll: true });
        break;
      case "addDate":
        state.dateSlots = Math.min(3, Math.max(state.dateSlots, state.form.date2.trim() ? 2 : 1) + 1);
        render(false);
        var nf = document.getElementById("f-date" + state.dateSlots);
        if (nf) nf.focus();
        break;
      case "copy":
        copyText();
        break;
      case "lineMissing":
        e.preventDefault();
        if (window.console) console.warn("[レイ診断] 公式LINEのURLが未設定です（js/config.js の lineUrl）");
        document.getElementById("line-missing").classList.add("is-flash");
        break;
    }
  });

  render(false);
})();
