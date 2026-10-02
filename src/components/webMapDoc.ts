// Mapa do web: uma página mínima (sem biblioteca) com os blocos do OpenStreetMap, que fala com o app por postMessage.
// Motivo: o mapa embutido do OpenStreetMap não avisa onde a pessoa tocou, e criar evento é "segurar no endereço".
//
// App -> mapa:  { romy:1, type:'state', events:[{id,lat,lon,label}], me:{lat,lon}|null, draft:{lat,lon}|null, dark:boolean }
//               { romy:1, type:'center', lat, lon, z }
// Mapa -> app:  { romy:1, type:'longpress', lat, lon }  |  { romy:1, type:'select', id }

export const WEB_MAP_DOC = `<!doctype html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>
html,body{margin:0;height:100%;overflow:hidden;background:#e5e3df;font-family:system-ui,-apple-system,sans-serif}
#map{position:absolute;top:0;left:0;right:0;bottom:0;overflow:hidden;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none}
#tiles{position:absolute;top:0;left:0}
#tiles img{position:absolute;width:256px;height:256px;max-width:none;pointer-events:none;-webkit-user-drag:none}
.dark #tiles{filter:invert(90%) hue-rotate(180deg) brightness(95%) contrast(90%)}
.pin{position:absolute;width:0;height:0}
.pin>div{position:absolute;left:-17px;top:-38px;width:34px;height:34px;box-sizing:border-box;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#6338FA;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)}
.evt{cursor:pointer}
.evt>div{top:-17px;border-radius:50%;transform:none;background:#fff;border-color:#6338FA;display:flex;align-items:center;justify-content:center;font:800 13px system-ui;color:#6338FA}
.me>div{left:-9px;top:-9px;width:18px;height:18px;border-radius:50%;transform:none;background:#2563eb;border:3px solid #fff}
.zoom{position:absolute;right:10px;top:10px;display:flex;flex-direction:column;gap:6px}
.zoom button{width:42px;height:42px;border-radius:12px;border:0;background:#fff;box-shadow:0 1px 5px rgba(0,0,0,.35);font:600 24px system-ui;color:#111;cursor:pointer}
.attr{position:absolute;left:4px;bottom:2px;font:11px system-ui;color:#333;background:rgba(255,255,255,.75);padding:1px 6px;border-radius:4px}
</style></head>
<body>
<div id="map"><div id="tiles"></div><div id="layer"></div></div>
<div class="zoom"><button id="zi" aria-label="Aproximar">+</button><button id="zo" aria-label="Afastar">&minus;</button></div>
<div class="attr">&copy; OpenStreetMap</div>
<script>
(function () {
  var T = 256, map = document.getElementById('map'), tiles = document.getElementById('tiles'), layer = document.getElementById('layer');
  var S = { lat: -23.5505, lon: -46.6333, z: 14, events: [], me: null, draft: null };
  var cache = {};

  function wp(lat, lon, z) {
    var n = T * Math.pow(2, z), s = Math.sin(lat * Math.PI / 180);
    return { x: (lon + 180) / 360 * n, y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n };
  }
  function ll(x, y, z) {
    var n = T * Math.pow(2, z), k = Math.PI - 2 * Math.PI * y / n;
    return { lat: 180 / Math.PI * Math.atan(0.5 * (Math.exp(k) - Math.exp(-k))), lon: x / n * 360 - 180 };
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function send(m) { m.romy = 1; parent.postMessage(m, '*'); }

  function render() {
    var w = map.clientWidth, h = map.clientHeight, z = S.z, n = Math.pow(2, z);
    var c = wp(S.lat, S.lon, z), left = c.x - w / 2, top = c.y - h / 2;
    var x0 = Math.floor(left / T), x1 = Math.floor((left + w) / T), y0 = Math.floor(top / T), y1 = Math.floor((top + h) / T);
    var need = {};
    for (var x = x0; x <= x1; x++) for (var y = y0; y <= y1; y++) {
      if (y < 0 || y >= n) continue;
      var key = z + '/' + (((x % n) + n) % n) + '/' + y, id = key + '@' + x;
      need[id] = 1;
      var el = cache[id];
      if (!el) { el = document.createElement('img'); el.src = 'https://tile.openstreetmap.org/' + key + '.png'; el.alt = ''; tiles.appendChild(el); cache[id] = el; }
      el.style.left = (x * T - left) + 'px'; el.style.top = (y * T - top) + 'px';
    }
    for (var k in cache) if (!need[k]) { cache[k].remove(); delete cache[k]; }

    layer.innerHTML = '';
    function pin(cls, lat, lon, label, id) {
      var p = wp(lat, lon, z), e = document.createElement('div'), d = document.createElement('div');
      e.className = 'pin ' + cls; e.style.left = (p.x - left) + 'px'; e.style.top = (p.y - top) + 'px';
      if (label) d.textContent = label;
      e.appendChild(d); if (id != null) e.setAttribute('data-id', id);
      layer.appendChild(e);
    }
    S.events.forEach(function (ev) { pin('evt', ev.lat, ev.lon, ev.label || '', ev.id); });
    if (S.me) pin('me', S.me.lat, S.me.lon);
    if (S.draft) pin('', S.draft.lat, S.draft.lon);
  }

  function setZoom(z) { S.z = clamp(z, 3, 18); render(); }

  // ----- toque, arrasto, pinça e "segurar" -----
  var ptrs = {}, start = null, moved = false, long = false, timer = null, downPin = null, pinch = null;
  function count() { return Object.keys(ptrs).length; }
  function dist() { var a = Object.keys(ptrs).map(function (k) { return ptrs[k]; }); return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); }

  map.addEventListener('pointerdown', function (e) {
    ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
    try { map.setPointerCapture(e.pointerId); } catch (_) {}
    if (count() === 1) {
      moved = false; long = false;
      downPin = e.target.closest ? e.target.closest('.evt') : null;
      start = { x: e.clientX, y: e.clientY, c: wp(S.lat, S.lon, S.z) };
      var sx = e.clientX, sy = e.clientY;
      clearTimeout(timer);
      timer = setTimeout(function () {
        if (moved || count() !== 1) return;
        long = true;
        var r = map.getBoundingClientRect(), c = wp(S.lat, S.lon, S.z);
        var pt = ll(c.x + (sx - r.left - map.clientWidth / 2), c.y + (sy - r.top - map.clientHeight / 2), S.z);
        if (navigator.vibrate) try { navigator.vibrate(20); } catch (_) {}
        send({ type: 'longpress', lat: pt.lat, lon: pt.lon });
      }, 550);
    } else if (count() === 2) {
      clearTimeout(timer); moved = true; pinch = { d: dist(), z: S.z };
    }
  });

  map.addEventListener('pointermove', function (e) {
    if (!ptrs[e.pointerId]) return;
    ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (count() === 2 && pinch) {
      var ratio = dist() / pinch.d;
      if (ratio > 1.5) { pinch = { d: dist(), z: S.z + 1 }; setZoom(S.z + 1); }
      else if (ratio < 0.67) { pinch = { d: dist(), z: S.z - 1 }; setZoom(S.z - 1); }
      return;
    }
    if (!start || count() !== 1) return;
    var dx = e.clientX - start.x, dy = e.clientY - start.y;
    if (!moved && Math.hypot(dx, dy) < 8) return;
    moved = true; clearTimeout(timer); map.style.cursor = 'grabbing';
    var p = ll(start.c.x - dx, start.c.y - dy, S.z); S.lat = clamp(p.lat, -85, 85); S.lon = p.lon; render();
  });

  function up(e) {
    delete ptrs[e.pointerId]; clearTimeout(timer); map.style.cursor = 'grab';
    if (count() === 0) {
      if (!moved && !long && downPin) send({ type: 'select', id: downPin.getAttribute('data-id') });
      start = null; pinch = null;
    }
  }
  map.addEventListener('pointerup', up);
  map.addEventListener('pointercancel', up);
  map.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  var lastWheel = 0;
  map.addEventListener('wheel', function (e) {
    e.preventDefault();
    var now = Date.now(); if (now - lastWheel < 180) return; lastWheel = now;
    setZoom(S.z + (e.deltaY < 0 ? 1 : -1));
  }, { passive: false });
  map.addEventListener('dblclick', function () { setZoom(S.z + 1); });
  document.getElementById('zi').addEventListener('pointerdown', function (e) { e.stopPropagation(); });
  document.getElementById('zo').addEventListener('pointerdown', function (e) { e.stopPropagation(); });
  document.getElementById('zi').addEventListener('click', function () { setZoom(S.z + 1); });
  document.getElementById('zo').addEventListener('click', function () { setZoom(S.z - 1); });
  window.addEventListener('resize', render);

  window.addEventListener('message', function (e) {
    var d = e.data; if (!d || !d.romy) return;
    if (d.type === 'center') { S.lat = d.lat; S.lon = d.lon; if (d.z) S.z = clamp(d.z, 3, 18); }
    if (d.type === 'state') {
      S.events = d.events || []; S.me = d.me || null; S.draft = d.draft || null;
      document.documentElement.className = d.dark ? 'dark' : '';
    }
    render();
  });

  render();
  send({ type: 'ready' });
})();
</script></body></html>`;
