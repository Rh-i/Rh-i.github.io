---
title: 搜索
layout: page
comments: false
---

<div id="local-search" data-search-url="/search.json">
  <div class="field">
    <div class="control">
      <input id="local-search-input" class="input is-medium" type="search"
             placeholder="搜索标题或关键字，空格分隔多个词" autocomplete="off" autocapitalize="off" spellcheck="false">
    </div>
  </div>
  <p id="local-search-status" class="is-size-7 has-text-grey mt-3"></p>
  <div id="local-search-results" class="mt-4"></div>
</div>

<script>
(function () {
  var box = document.getElementById('local-search');
  if (!box || box.dataset.init === '1') return;
  box.dataset.init = '1';

  var input = document.getElementById('local-search-input');
  var statusEl = document.getElementById('local-search-status');
  var listEl = document.getElementById('local-search-results');
  var url = box.dataset.searchUrl || '/search.json';
  var data = null;
  var pending = null;
  var timer = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function tokens(q) {
    return String(q || '').toLowerCase().split(/[\s,，、;；|/]+/).filter(Boolean);
  }

  function mark(text, ts) {
    var out = esc(text);
    for (var i = 0; i < ts.length; i++) {
      var t = ts[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      out = out.replace(new RegExp('(' + t + ')', 'gi'), '<mark>$1</mark>');
    }
    return out;
  }

  function load() {
    if (data) return Promise.resolve(data);
    if (window.__icarusLocalSearch) {
      data = window.__icarusLocalSearch;
      return Promise.resolve(data);
    }
    if (pending) return pending;
    pending = fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (json) {
        data = Array.isArray(json) ? json : [];
        window.__icarusLocalSearch = data;
        return data;
      });
    return pending;
  }

  function card(item, ts) {
    var kw = (item.keywords || []).map(function (k) {
      return '<span class="tag is-light mr-1 mb-1">' + mark(k, ts) + '</span>';
    }).join('');
    return '<article class="card mb-3"><div class="card-content">'
      + '<p class="is-size-7 has-text-grey">' + esc(item.date) + '</p>'
      + '<p class="is-size-5 mb-0"><a href="' + esc(item.url) + '">' + mark(item.title, ts) + '</a></p>'
      + (kw ? '<div class="tags mt-2">' + kw + '</div>' : '')
      + '</div></article>';
  }

  function search(query) {
    var ts = tokens(query);
    if (!ts.length) {
      listEl.innerHTML = '';
      load().then(function (all) {
        statusEl.textContent = '共索引 ' + all.length + ' 篇文章（标题 + 关键字）';
      });
      return;
    }
    load().then(function (all) {
      var hits = [];
      for (var i = 0; i < all.length; i++) {
        var item = all[i];
        var title = String(item.title || '').toLowerCase();
        var kws = (item.keywords || []).join(' ').toLowerCase();
        var score = 0;
        var ok = true;
        for (var j = 0; j < ts.length; j++) {
          if (title.indexOf(ts[j]) >= 0) {
            score += 3;
          } else if (kws.indexOf(ts[j]) >= 0) {
            score += 1;
          } else {
            ok = false;
            break;
          }
        }
        if (ok) hits.push({ item: item, score: score });
      }
      hits.sort(function (a, b) { return b.score - a.score; });
      statusEl.textContent = '命中 ' + hits.length + ' 篇 / 共 ' + all.length + ' 篇';
      if (!hits.length) {
        listEl.innerHTML = '<p class="has-text-grey">没有匹配的标题或关键字</p>';
        return;
      }
      listEl.innerHTML = hits.map(function (h) { return card(h.item, ts); }).join('');
    }).catch(function (err) {
      statusEl.textContent = '索引加载失败：' + err.message;
    });
  }

  input.addEventListener('input', function () {
    var q = input.value;
    clearTimeout(timer);
    timer = setTimeout(function () { search(q); }, 150);
  });

  load().then(function (all) {
    statusEl.textContent = '共索引 ' + all.length + ' 篇文章（标题 + 关键字）';
  }).catch(function (err) {
    statusEl.textContent = '索引加载失败：' + err.message;
  });

  input.focus();
})();
</script>
