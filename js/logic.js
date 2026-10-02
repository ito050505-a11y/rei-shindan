/* =========================================================
 * 結果の組み立てルール（ランダム・AI・採点なし）
 * ========================================================= */
(function (root) {
  function findOption(question, id) {
    return question.options.find(function (o) { return o.id === id; }) || null;
  }

  function fill(text, values) {
    return text.replace(/\{(\w+)\}/g, function (m, key) {
      return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : m;
    });
  }

  // 全問回答済みなら結果オブジェクトを返す。未回答があれば null。
  function buildResult(answers, content) {
    var qs = content.questions;
    var picked = qs.map(function (q) { return findOption(q, answers[q.id]); });
    if (picked.some(function (o) { return !o; })) return null;

    var R = content.results;
    var a = answers;
    var a3set = R.action3[a.q5];
    var a3 = (a3set.byStage && a3set.byStage[a.q3]) || a3set.default;

    return {
      picked: picked,
      future: R.futureStart[a.q1] + R.futureEnd[a.q2],
      stage: R.stages[a.q3],
      actions: [R.action1[a.q3], R.action2[a.q4], a3]
    };
  }

  // profile = {age, job}（id） / form = {name, date1, date2, date3}（入力文字）
  function buildApplicationText(result, content, profile, form) {
    var p = result.picked;
    profile = profile || {}; form = form || {};
    var groupLabel = function (gid) {
      var g = content.profile.groups.find(function (x) { return x.id === gid; });
      var o = g && profile[gid] ? findOption(g, profile[gid]) : null;
      return o ? o.label : "";
    };
    var t = function (v) { return String(v || "").trim(); };
    var und = content.benefit.dateUndecided;
    return fill(content.applicationTemplate, {
      name: t(form.name), age: groupLabel("age"), job: groupLabel("job"),
      q1: p[0].label, q2: p[1].label, q3: p[2].label, q4: p[3].label, q5: p[4].label,
      date1: t(form.date1), date2: t(form.date2) || und, date3: t(form.date3) || und
    });
  }

  var api = { buildResult: buildResult, buildApplicationText: buildApplicationText };
  root.REI_LOGIC = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
