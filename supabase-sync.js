/* ElearnMath – lapisan sinkron Supabase.
 * Aplikasi tetap membaca/menulis localStorage; file ini:
 *  1. memuat data dari Supabase sebelum app.js jalan,
 *  2. mengirim perubahan ke Supabase (per bagian: users, classes, submissions, dst),
 *  3. mengecek perubahan dari pengguna lain secara berkala.
 * Jika config belum diisi / offline, aplikasi tetap jalan memakai localStorage. */
(function () {
  var STATE_KEY = "elearnmath_state_v1";
  var TABLE = "app_state";
  var cfg = window.ELEARNMATH_CONFIG || {};
  var enabled = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
    cfg.SUPABASE_URL.indexOf("GANTI") === -1 && cfg.SUPABASE_ANON_KEY.indexOf("GANTI") === -1;

  var nativeSet = Storage.prototype.setItem;
  var synced = {};      // key bagian -> JSON string terakhir yang sama dengan server
  var dirty = {};       // key bagian -> true jika belum terkirim
  var cursor = "";      // updated_at terbaru yang sudah diterima
  var timer = null, pushing = false;

  function startApp() {
    var s = document.createElement("script");
    s.src = "app.js";
    document.body.appendChild(s);
  }
  if (!enabled) {
    console.warn("[ElearnMath] Supabase belum dikonfigurasi – mode lokal (localStorage).");
    return startApp();
  }

  var base = cfg.SUPABASE_URL.replace(/\/+$/, "") + "/rest/v1/" + TABLE;
  function headers(extra) {
    var h = { apikey: cfg.SUPABASE_ANON_KEY, "Content-Type": "application/json" };
    if (/^eyJ/.test(cfg.SUPABASE_ANON_KEY)) h.Authorization = "Bearer " + cfg.SUPABASE_ANON_KEY;
    for (var k in extra || {}) h[k] = extra[k];
    return h;
  }
  function withTimeout(ms) {
    var c = new AbortController();
    setTimeout(function () { c.abort(); }, ms);
    return c.signal;
  }
  function fetchRows(since) {
    var url = base + "?select=key,data,updated_at&order=updated_at.asc";
    if (since) url += "&updated_at=gt." + encodeURIComponent(since);
    return fetch(url, { headers: headers(), signal: withTimeout(15000) }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }
  function readLocal() {
    try { return JSON.parse(localStorage.getItem(STATE_KEY)) || null; } catch (e) { return null; }
  }
  function applyRows(rows) {
    if (!rows.length) return false;
    var st = readLocal() || {};
    rows.forEach(function (r) {
      st[r.key] = r.data;
      synced[r.key] = JSON.stringify(r.data);
      delete dirty[r.key];
      if (!cursor || r.updated_at > cursor) cursor = r.updated_at;
    });
    var str = JSON.stringify(st);
    nativeSet.call(localStorage, STATE_KEY, str);
    return str;
  }

  function markDirty(stateObj) {
    Object.keys(stateObj).forEach(function (k) {
      if (JSON.stringify(stateObj[k]) !== synced[k]) dirty[k] = true;
    });
  }
  function schedulePush() {
    clearTimeout(timer);
    timer = setTimeout(push, 800);
  }
  function push() {
    if (pushing) return schedulePush();
    var st = readLocal();
    if (!st) return;
    var keys = Object.keys(dirty);
    if (!keys.length) return;
    var body = keys.map(function (k) { return { key: k, data: st[k] === undefined ? null : st[k] }; });
    var snap = {};
    keys.forEach(function (k) { snap[k] = JSON.stringify(st[k]); });
    pushing = true;
    fetch(base + "?on_conflict=key", {
      method: "POST",
      headers: headers({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify(body)
    }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      keys.forEach(function (k) {
        synced[k] = snap[k];
        if (JSON.stringify((readLocal() || {})[k]) === snap[k]) delete dirty[k];
      });
    }).catch(function (e) {
      console.warn("[ElearnMath] Gagal simpan ke Supabase, akan dicoba lagi:", e.message);
      setTimeout(schedulePush, 5000);
    }).then(function () {
      pushing = false;
      if (Object.keys(dirty).length) schedulePush();
    });
  }

  // Tangkap setiap penyimpanan state aplikasi
  Storage.prototype.setItem = function (k, v) {
    nativeSet.apply(this, arguments);
    if (this === window.localStorage && k === STATE_KEY) {
      try { markDirty(JSON.parse(v)); schedulePush(); } catch (e) {}
    }
  };

  function poll() {
    if (pushing || timer || Object.keys(dirty).length) return;   // utamakan kirim dulu
    fetchRows(cursor).then(function (rows) {
      var fresh = rows.filter(function (r) { return JSON.stringify(r.data) !== synced[r.key]; });
      var str = applyRows(rows);
      if (fresh.length && str) {
        try { window.dispatchEvent(new StorageEvent("storage", { key: STATE_KEY, newValue: str })); } catch (e) {}
      }
    }).catch(function () {});
  }

  // Bootstrap: muat dulu dari server, baru jalankan aplikasi
  fetchRows("").then(function (rows) {
    if (rows.length) {
      applyRows(rows);
    } else {
      var local = readLocal();            // tabel kosong -> unggah data lokal (jika ada)
      if (local) { markDirty(local); push(); }
    }
  }).catch(function (e) {
    console.warn("[ElearnMath] Supabase tidak terjangkau, memakai data lokal:", e.message);
  }).then(function () {
    startApp();
    setInterval(poll, cfg.POLL_MS || 8000);
  });
})();
