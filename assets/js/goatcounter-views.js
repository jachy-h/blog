// Show GoatCounter page-view numbers on the page:
//   - elements with [data-gc-count] (value: "TOTAL" or a path) get the number
//   - single post pages get "阅读 N 次" appended to .post-meta
// Everything fails silently: markup stays hidden when the counter API says no
// (e.g. "allow using the visitor counter" is off, offline, blocked).
// The /counter API only reports pageviews; its count_unique field is the same
// number, so don't present it as a visitor count.
;(function () {
  'use strict'

  var script = document.querySelector('script[data-goatcounter]')
  var endpoint = (script && script.getAttribute('data-goatcounter')) ||
    (window.goatcounter && window.goatcounter.endpoint)
  if (!endpoint) return

  var api = String(endpoint).replace(/\/count\/?$/, '')
  if (!api) return

  var cache = {}

  // Same path resolution as count.js: prefer the canonical link when it points
  // at this host, so counts line up with what was recorded.
  function currentPath() {
    var loc = location
    var c = document.querySelector('link[rel="canonical"][href]')
    if (c) {
      var a = document.createElement('a')
      a.href = c.href
      if (a.hostname.replace(/^www\./, '') === loc.hostname.replace(/^www\./, '')) loc = a
    }
    return loc.pathname || '/'
  }

  function toNumber(v) {
    if (v === null || v === undefined) return null
    var n = parseInt(String(v).replace(/[^\d]/g, ''), 10)
    return isNaN(n) ? null : n
  }

  function format(n) {
    try { return n.toLocaleString('zh-CN') } catch (e) { return String(n) }
  }

  function load(path, done) {
    if (cache[path]) return done(cache[path])
    var url = api + '/counter/' + encodeURIComponent(path) + '.json'
    fetch(url, { credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null })
      .then(function (data) {
        if (!data) return done(null)
        cache[path] = data
        done(data)
      })
      .catch(function () { done(null) })
  }

  function reveal(el) {
    var box = el.closest && el.closest('[data-gc-item]')
    if (box) box.hidden = false
  }

  // Group elements per requested path so we only hit the API once per path.
  var groups = {}
  Array.prototype.forEach.call(document.querySelectorAll('[data-gc-count]'), function (el) {
    var path = el.getAttribute('data-gc-count') || currentPath()
    ;(groups[path] = groups[path] || []).push(el)
  })
  Object.keys(groups).forEach(function (path) {
    load(path, function (data) {
      if (!data) return
      groups[path].forEach(function (el) {
        var n = toNumber(data.count)
        if (n === null) return
        el.textContent = format(n)
        reveal(el)
      })
    })
  })

  // Per-post view count, only on single pages (the theme only marks those with
  // .post-single), so list/archive pages don't fan out into dozens of requests.
  var meta = document.querySelector('.post-single .post-meta')
  if (!meta) return
  load(currentPath(), function (data) {
    var n = data ? toNumber(data.count) : null
    if (n === null || n < 1) return
    var span = document.createElement('span')
    span.className = 'gc-views'
    span.title = '本文浏览量（GoatCounter）'
    span.textContent = '阅读 ' + format(n) + ' 次'
    meta.appendChild(document.createTextNode('\u00a0·\u00a0'))
    meta.appendChild(span)
  })
})()
