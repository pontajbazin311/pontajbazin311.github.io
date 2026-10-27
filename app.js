/* Pontaj Bazin 311 — antrenori și instructori (index.html) și manager (manager.html) */
var API = window.API_URL;
var CHEIE = 'pontaj311_cheie';
var CHEIE_MGR = 'pontaj311_manager';
var QR_VALABIL_MIN = 10; // după scanare, pontajul trebuie făcut în 10 minute
var $ = function (id) { return document.getElementById(id); };
function citeste(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
function scrie(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) {} }
function arata(id) { ['incarcare', 'ecranCod', 'ecranAlegere', 'ecranPontaj', 'ecranManager'].forEach(function (x) { if ($(x)) $(x).hidden = x !== id; }); }
function eroare(msg) { $('eroare').textContent = msg || ''; $('eroare').hidden = !msg; if (msg) $('eroare').scrollIntoView({ block: 'nearest' }); }
function el(tag, text, cls) { var n = document.createElement(tag); if (text != null) n.textContent = text; if (cls) n.className = cls; return n; }
function ore(v) { return String(Math.round(v * 100) / 100).replace('.', ','); }

var instalata = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
var esteIphone = /iphone|ipad|ipod/i.test(navigator.userAgent);

/* Codul din QR-ul de la bazin vine în adresă (?q=...). Se ține doar în memorie,
   nu se salvează pe telefon și dispare din adresă, deci fiecare pontaj cere o scanare nouă. */
var qr = '', qrLa = 0;
(function () {
  var p = new URLSearchParams(location.search);
  if (p.get('q')) { qr = p.get('q'); qrLa = Date.now(); }
  if (p.get('m')) scrie(CHEIE_MGR, p.get('m'));
  if (p.get('q') || p.get('m')) { try { history.replaceState(null, '', location.pathname); } catch (e) {} }
})();
function qrValabil() { return !!qr && Date.now() - qrLa < QR_VALABIL_MIN * 60000; }

var ocupat = false;
function server(date, ok, laEroare) {
  eroare('');
  ocupat = true;
  fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(date) })
    .then(function (r) { return r.json(); })
    .then(function (rez) {
      ocupat = false;
      if (rez.ok) { ok(rez); return; }
      if (rez.cod === 'TELEFON_NEINREGISTRAT') { scrie(CHEIE, ''); porneste(); return; }
      if (rez.cod === 'QR_NECESAR') qr = '';
      if (MOD === 'manager' && /managerului/.test(rez.eroare || '')) { scrie(CHEIE_MGR, ''); arata('ecranCod'); }
      eroare(rez.eroare || 'A apărut o eroare.');
      if (laEroare) laEroare(rez);
    })
    .catch(function () {
      ocupat = false;
      eroare('Pontajul NU a fost trimis: nu există conexiune la internet. Verificați datele mobile sau Wi-Fi și încercați din nou.');
      if (laEroare) laEroare({});
      if (!$('incarcare').hidden) $('incarcare').textContent = 'Fără conexiune.';
    });
}

/* ---------------- Antrenori și instructori ---------------- */
var stareCurenta = null;

function butoane() {
  var poate = qrValabil() && !ocupat;
  $('btnSosire').disabled = !poate;
  $('btnPlecare').disabled = !poate;
  $('scaneaza').hidden = qrValabil();
}

function afiseaza(s) {
  stareCurenta = s;
  if (!s.inregistrat) {
    var box = $('listaNume'); box.innerHTML = '';
    if (!qrValabil()) {
      box.appendChild(el('p', 'Pentru a începe, scanați cu Camera telefonului codul QR afișat la bazin.', 'nota'));
      arata('ecranAlegere');
      return;
    }
    if (!s.nume.length) box.appendChild(el('p', 'Toate numele sunt deja înregistrate. Adresați-vă managerului.', 'muted'));
    s.nume.forEach(function (n) {
      var b = el('button', n, 'nume');
      b.addEventListener('click', function () {
        if (!confirm('Confirmați: sunteți ' + n + '?\n\nAcest telefon va ponta doar pe acest nume.')) return;
        server({ actiune: 'inregistreaza', nume: n, q: qr }, afiseaza);
      });
      box.appendChild(b);
    });
    arata('ecranAlegere');
    return;
  }
  if (s.cheie) scrie(CHEIE, s.cheie);
  $('txtNume').textContent = s.nume;
  $('txtData').textContent = s.data;
  var ultim = s.evenimente[s.evenimente.length - 1], st = $('txtStare');
  if (ultim && ultim.tip === 'SOSIRE') { st.className = 'status in'; st.textContent = 'Prezent la bazin din ora ' + ultim.ora + '.'; }
  else if (ultim) { st.className = 'status out'; st.textContent = 'Ați plecat la ora ' + ultim.ora + '.'; }
  else { st.className = 'status out'; st.textContent = 'Nu v-ați pontat încă astăzi.'; }
  $('btnSosire').classList.toggle('suggest', s.urmator === 'SOSIRE');
  $('btnPlecare').classList.toggle('suggest', s.urmator === 'PLECARE');
  var ul = $('lista'); ul.innerHTML = '';
  s.evenimente.forEach(function (e) {
    var li = el('li'); li.appendChild(el('span', e.tip === 'SOSIRE' ? 'Sosire' : 'Plecare')); li.appendChild(el('b', e.ora)); ul.appendChild(li);
  });
  $('gol').hidden = s.evenimente.length > 0;
  var c = $('confirmare');
  if (s.confirmare) {
    // pontaj salvat și confirmat de server; pentru următorul pontaj trebuie scanat din nou codul
    qr = '';
    c.textContent = '✓ ' + s.confirmare; c.hidden = false;
    c.scrollIntoView({ block: 'nearest' });
  } else c.hidden = true;
  butoane();
  arata('ecranPontaj');
}

function ponteaza(tip) {
  if (!qrValabil()) { qr = ''; butoane(); eroare('Pentru pontaj, scanați cu telefonul codul QR afișat la bazin.'); return; }
  $('confirmare').hidden = true;
  ocupat = true; butoane();
  server({ actiune: 'ponteaza', cheie: citeste(CHEIE), tip: tip, q: qr }, afiseaza, function () { butoane(); });
}

function ceas() {
  if (!$('ceas')) return;
  try { $('ceas').textContent = new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bucharest' }); }
  catch (e) { $('ceas').textContent = new Date().toTimeString().slice(0, 5); }
  if (MOD !== 'manager' && stareCurenta && stareCurenta.inregistrat) butoane(); // QR-ul expiră după 10 minute
}

/* ---------------- Manager ---------------- */
function aziIso() {
  try { return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Bucharest' }); }
  catch (e) { return new Date().toISOString().slice(0, 10); }
}
function cerereManager(extra) {
  var c = { km: citeste(CHEIE_MGR), luna: $('inLuna').value, zi: $('inZi').value };
  for (var k in extra) c[k] = extra[k];
  return c;
}
function incarcaManager() { server(cerereManager({ actiune: 'manager' }), afiseazaManager); }
function editeaza(op, date) {
  var c = cerereManager({ actiune: 'editeaza', op: op });
  for (var k in date) c[k] = date[k];
  server(c, afiseazaManager);
}
function dataRo(iso) { var p = String(iso || '').split('-'); return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : iso; }
var editDeschis = false;

function afiseazaManager(r) {
  editDeschis = false;
  var km = citeste(CHEIE_MGR);
  var p = $('prezenti'); p.innerHTML = '';
  if (!r.prezenti.length) p.appendChild(el('span', 'Nimeni nu este pontat ca prezent în acest moment.', 'muted small'));
  r.prezenti.forEach(function (x) { p.appendChild(el('span', x.nume + ' · din ' + x.ora, 'chip')); });
  $('actualizat').textContent = 'Actualizat la ' + new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });

  // pontajele zilei alese, cu editare
  $('inZi').value = r.zi;
  $('titluZi').textContent = r.zi === r.dataIso ? 'azi, ' + dataRo(r.zi) : dataRo(r.zi);
  var lz = $('listaZi'); lz.innerHTML = '';
  if (!r.pontajeZi.length) lz.appendChild(el('li', 'Nu există pontaje în această zi.', 'muted'));
  r.pontajeZi.forEach(function (x) {
    var li = el('li', null, 'rand-edit');
    var txt = el('span'); txt.appendChild(el('b', x.ora + '  ')); txt.appendChild(document.createTextNode(x.nume + ' '));
    txt.appendChild(el('span', x.tip === 'SOSIRE' ? 'Sosire' : 'Plecare', x.tip === 'SOSIRE' ? 'tag-in' : 'tag-out'));
    var act = el('span', null, 'act-mici');
    var bMod = el('button', 'Modifică', 'mic2'), bSterge = el('button', 'Șterge', 'mic');
    bSterge.addEventListener('click', function () {
      if (!confirm('Ștergeți pontajul: ' + x.nume + ', ' + (x.tip === 'SOSIRE' ? 'SOSIRE' : 'PLECARE') + ' la ora ' + x.ora + ' (' + dataRo(r.zi) + ')?')) return;
      editeaza('sterge', { id: x.id });
    });
    bMod.addEventListener('click', function () {
      editDeschis = true;
      li.innerHTML = '';
      var f = el('div', null, 'form-edit');
      f.appendChild(el('b', x.nume));
      var ora = el('input'); ora.type = 'time'; ora.value = x.ora;
      var tip = selectTip(x.tip);
      var bS = el('button', 'Salvează'), bA = el('button', 'Anulează', 'btn2');
      bS.addEventListener('click', function () { editeaza('modifica', { id: x.id, data: r.zi, ora: ora.value, tip: tip.value }); });
      bA.addEventListener('click', function () { afiseazaManager(r); });
      var rand = el('div', null, 'rand2'); rand.appendChild(ora); rand.appendChild(tip);
      f.appendChild(rand); var rb = el('div', null, 'rand2'); rb.appendChild(bS); rb.appendChild(bA); f.appendChild(rb);
      li.appendChild(f);
    });
    act.appendChild(bMod); act.appendChild(bSterge);
    li.appendChild(txt); li.appendChild(act); lz.appendChild(li);
  });
  var sn = $('adNume'), alesAnterior = sn.value; sn.innerHTML = '';
  r.nume.forEach(function (n) { var o = el('option', n); o.value = n; sn.appendChild(o); });
  if (alesAnterior) sn.value = alesAnterior;
  $('btnStergeZiua').hidden = !r.pontajeZi.length;
  $('btnStergeZiua').textContent = 'Șterge toate pontajele din ' + dataRo(r.zi) + ' (' + r.pontajeZi.length + ')';

  // luna
  var tb = $('tabelLuna'); tb.innerHTML = '';
  r.matrice.forEach(function (x) {
    var tr = el('tr'); tr.appendChild(el('td', x[0])); tr.appendChild(el('td', x[x.length - 1], 'n')); tr.appendChild(el('td', ore(x[x.length - 2]), 'n')); tb.appendChild(tr);
  });
  var inc = r.detalii.filter(function (d) { return d[5] && d[5].indexOf('În curs') !== 0; });
  var bi = $('incomplete'); bi.innerHTML = '';
  if (inc.length) {
    bi.appendChild(el('b', 'Pontaje incomplete (de corectat mai sus, alegând ziua):'));
    inc.forEach(function (d) { bi.appendChild(el('div', dataRo(d[1]) + ' · ' + d[0] + ' · ' + d[5] + (d[2] || d[3] ? ' (' + (d[2] || d[3]) + ')' : ''))); });
  }
  bi.hidden = !inc.length;
  $('lnkDescarca').href = API + '?m=' + encodeURIComponent(km) + '&descarca=' + encodeURIComponent(r.luna);
  $('lnkDescarca').target = '_blank';

  // personal
  var lp = $('listaPersonal'); lp.innerHTML = '';
  r.personal.forEach(function (x) {
    var li = el('li'), st = el('span');
    st.appendChild(el('b', x.nume)); st.appendChild(el('br'));
    st.appendChild(el('span', !x.activ ? 'inactiv' : x.telefon ? 'telefon înregistrat ' + x.din : 'încă nu și-a ales numele', 'muted small'));
    li.appendChild(st);
    if (x.telefon) {
      var b = el('button', 'Deblochează', 'mic');
      b.addEventListener('click', function () {
        if (!confirm('Deblocați telefonul lui ' + x.nume + '? La următoarea scanare a codului QR își va alege din nou numele.')) return;
        server(cerereManager({ actiune: 'deblocheaza', nume: x.nume }), afiseazaManager);
      });
      li.appendChild(b);
    }
    lp.appendChild(li);
  });
  arata('ecranManager');
}
function selectTip(val) {
  var s = el('select');
  ['SOSIRE', 'PLECARE'].forEach(function (t) { var o = el('option', t); o.value = t; s.appendChild(o); });
  s.value = val || 'SOSIRE';
  return s;
}

/* ---------------- Pornire ---------------- */
function porneste() {
  $('incarcare').textContent = 'Se încarcă…';
  arata('incarcare');
  if (MOD === 'manager') {
    $('subtitlu').textContent = 'Panoul managerului';
    if (!citeste(CHEIE_MGR)) { arata('ecranCod'); return; }
    if (!$('inLuna').value) $('inLuna').value = aziIso().slice(0, 7);
    if (!$('inZi').value) $('inZi').value = aziIso();
    incarcaManager();
  } else {
    server({ actiune: 'stare', cheie: citeste(CHEIE) }, afiseaza);
  }
}

if (MOD === 'manager') {
  $('inLuna').addEventListener('change', incarcaManager);
  $('inZi').addEventListener('change', incarcaManager);
  $('btnReimprospatare').addEventListener('click', incarcaManager);
  $('btnCod').addEventListener('click', function () {
    var v = $('inCod').value.trim(); if (!v) return;
    scrie(CHEIE_MGR, v); $('inCod').value = ''; porneste();
  });
  $('btnAdauga').addEventListener('click', function () {
    if (!$('adOra').value) { eroare('Alegeți ora pontajului.'); return; }
    editeaza('adauga', { nume: $('adNume').value, data: $('inZi').value, ora: $('adOra').value, tip: $('adTip').value });
    $('adOra').value = '';
  });
  $('btnStergeZiua').addEventListener('click', function () {
    var zi = $('inZi').value;
    if (!confirm('Ștergeți TOATE pontajele din ' + dataRo(zi) + '? Operațiunea nu poate fi anulată din aplicație.')) return;
    editeaza('stergeZiua', { data: zi });
  });
  // actualizare automată la fiecare minut, cât timp panoul este deschis
  setInterval(function () {
    if (document.visibilityState === 'visible' && !ocupat && !editDeschis && !$('ecranManager').hidden) incarcaManager();
  }, 60000);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && !ocupat && !editDeschis && !$('ecranManager').hidden) incarcaManager();
  });
} else {
  ['btnSosire', 'btnPlecare'].forEach(function (id) {
    $(id).addEventListener('click', function () { ponteaza(this.getAttribute('data-tip')); });
  });
  if (instalata) $('notaInstalata').hidden = false;
}

/* ---------------- Instalarea pe ecran (doar aplicația managerului) ---------------- */
var cerereInstalare = null;
if (MOD === 'manager' && !instalata) {
  $('instalare').hidden = false;
  if (esteIphone) {
    $('instText').innerHTML = 'Apăsați butonul <b>Partajare</b> (pătratul cu săgeată, jos), apoi <b>Adăugați pe ecranul principal</b>. Aplicația apare pe ecran cu sigla bazinului.';
  } else {
    $('instText').textContent = 'Apăsați „Instalează aplicația”. Dacă butonul nu apare, deschideți meniul browserului (⋮) și alegeți „Instalați aplicația”.';
  }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); cerereInstalare = e; $('btnInstal').hidden = false; });
  $('btnInstal').addEventListener('click', function () {
    if (!cerereInstalare) return;
    cerereInstalare.prompt();
    cerereInstalare.userChoice.then(function () { cerereInstalare = null; $('btnInstal').hidden = true; });
  });
  window.addEventListener('appinstalled', function () { $('instalare').hidden = true; });
}
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});

ceas(); setInterval(ceas, 15000);
porneste();
