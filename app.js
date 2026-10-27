/* Pontaj Bazin 311 — aplicația instalabilă (antrenori și manager) */
var API = window.API_URL;
var CHEIE = 'pontaj311_cheie';
var CHEIE_MGR = 'pontaj311_manager';
var $ = function (id) { return document.getElementById(id); };
function citeste(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
function scrie(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) {} }
function arata(id) { ['incarcare', 'ecranCod', 'ecranAlegere', 'ecranPontaj', 'ecranManager'].forEach(function (x) { $(x).hidden = x !== id; }); }
function eroare(msg) { $('eroare').textContent = msg || ''; $('eroare').hidden = !msg; }
function el(tag, text, cls) { var n = document.createElement(tag); if (text != null) n.textContent = text; if (cls) n.className = cls; return n; }
function ore(v) { return String(Math.round(v * 100) / 100).replace('.', ','); }
function blocheaza(da) { ['btnSosire', 'btnPlecare'].forEach(function (id) { $(id).disabled = da; }); }

var instalata = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
var esteIphone = /iphone|ipad|ipod/i.test(navigator.userAgent);

function server(date, ok) {
  eroare('');
  fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(date) })
    .then(function (r) { return r.json(); })
    .then(function (rez) {
      if (rez.ok) { ok(rez); return; }
      if (rez.cod === 'TELEFON_NEINREGISTRAT') { scrie(CHEIE, ''); porneste(); return; }
      if (MOD === 'manager' && /managerului/.test(rez.eroare || '')) { scrie(CHEIE_MGR, ''); arata('ecranCod'); }
      eroare(rez.eroare || 'A apărut o eroare.'); blocheaza(false);
    })
    .catch(function () {
      eroare('Nu există conexiune la internet. Verificați datele mobile sau Wi-Fi și încercați din nou.');
      blocheaza(false);
      if (!$('incarcare').hidden) $('incarcare').textContent = 'Fără conexiune.';
    });
}

/* ---------------- Antrenori și instructori ---------------- */
function afiseaza(s) {
  blocheaza(false);
  if (!s.inregistrat) {
    var box = $('listaNume'); box.innerHTML = '';
    if (esteIphone && !instalata) {
      box.appendChild(el('p', 'Pe iPhone, instalați mai întâi aplicația (instrucțiunile de mai sus), apoi deschideți-o de pe ecran și alegeți-vă numele acolo.', 'muted'));
      arata('ecranAlegere');
      return;
    }
    if (!s.nume.length) box.appendChild(el('p', 'Toate numele sunt deja înregistrate. Adresați-vă managerului.', 'muted'));
    s.nume.forEach(function (n) {
      var b = el('button', n, 'nume');
      b.addEventListener('click', function () {
        if (!confirm('Confirmați: sunteți ' + n + '?\n\nAcest telefon va ponta doar pe acest nume.')) return;
        server({ actiune: 'inregistreaza', nume: n }, afiseaza);
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
  if (s.confirmare) { c.textContent = '✓ ' + s.confirmare; c.hidden = false; } else c.hidden = true;
  arata('ecranPontaj');
}
['btnSosire', 'btnPlecare'].forEach(function (id) {
  $(id).addEventListener('click', function () {
    blocheaza(true); $('confirmare').hidden = true;
    server({ actiune: 'ponteaza', cheie: citeste(CHEIE), tip: this.getAttribute('data-tip') }, afiseaza);
  });
});
function ceas() {
  try { $('ceas').textContent = new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bucharest' }); }
  catch (e) { $('ceas').textContent = new Date().toTimeString().slice(0, 5); }
}

/* ---------------- Manager ---------------- */
function lunaCurenta() {
  try { return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Bucharest' }).slice(0, 7); }
  catch (e) { return new Date().toISOString().slice(0, 7); }
}
function incarcaManager() { server({ actiune: 'manager', km: citeste(CHEIE_MGR), luna: $('inLuna').value }, afiseazaManager); }
function afiseazaManager(r) {
  var km = citeste(CHEIE_MGR);
  var p = $('prezenti'); p.innerHTML = '';
  if (!r.prezenti.length) p.appendChild(el('span', 'Nimeni nu este pontat ca prezent în acest moment.', 'muted small'));
  r.prezenti.forEach(function (x) { p.appendChild(el('span', x.nume + ' · din ' + x.ora, 'chip')); });
  $('dataAzi').textContent = r.data;
  var la = $('listaAzi'); la.innerHTML = '';
  if (!r.azi.length) la.appendChild(el('li', 'Nu există pontaje astăzi.', 'muted'));
  r.azi.forEach(function (x) {
    var li = el('li'); li.appendChild(el('span', x.ora + '  ' + x.nume));
    li.appendChild(el('span', x.tip === 'SOSIRE' ? 'Sosire' : 'Plecare', x.tip === 'SOSIRE' ? 'tag-in' : 'tag-out')); la.appendChild(li);
  });
  var tb = $('tabelLuna'); tb.innerHTML = '';
  r.matrice.forEach(function (x) {
    var tr = el('tr'); tr.appendChild(el('td', x[0])); tr.appendChild(el('td', x[x.length - 1], 'n')); tr.appendChild(el('td', ore(x[x.length - 2]), 'n')); tb.appendChild(tr);
  });
  var inc = r.detalii.filter(function (d) { return d[5]; }).length;
  $('incomplete').textContent = inc ? 'Atenție: ' + inc + ' pontaje incomplete (sosire fără plecare sau invers). Apar în fișierul descărcat.' : '';
  $('lnkDescarca').href = API + '?m=' + encodeURIComponent(km) + '&descarca=' + encodeURIComponent(r.luna);
  $('lnkDescarca').target = '_blank';
  var lp = $('listaPersonal'); lp.innerHTML = '';
  r.personal.forEach(function (x) {
    var li = el('li'), st = el('span');
    st.appendChild(el('b', x.nume)); st.appendChild(el('br'));
    st.appendChild(el('span', !x.activ ? 'inactiv' : x.telefon ? 'telefon înregistrat ' + x.din : 'încă nu și-a ales numele', 'muted small'));
    li.appendChild(st);
    if (x.telefon) {
      var b = el('button', 'Deblochează', 'mic');
      b.addEventListener('click', function () {
        if (!confirm('Deblocați telefonul lui ' + x.nume + '? Va trebui să își aleagă din nou numele.')) return;
        server({ actiune: 'deblocheaza', km: km, nume: x.nume }, afiseazaManager);
      });
      li.appendChild(b);
    }
    lp.appendChild(li);
  });
  arata('ecranManager');
}
$('inLuna').addEventListener('change', incarcaManager);
$('btnReimprospatare').addEventListener('click', incarcaManager);
$('btnCod').addEventListener('click', function () {
  var v = $('inCod').value.trim(); if (!v) return;
  scrie(CHEIE_MGR, v); $('inCod').value = ''; porneste();
});

/* ---------------- Pornire ---------------- */
function porneste() {
  $('incarcare').textContent = 'Se încarcă…';
  arata('incarcare');
  if (MOD === 'manager') {
    $('subtitlu').textContent = 'Panoul managerului';
    if (!citeste(CHEIE_MGR)) { arata('ecranCod'); return; }
    if (!$('inLuna').value) $('inLuna').value = lunaCurenta();
    incarcaManager();
  } else {
    server({ actiune: 'stare', cheie: citeste(CHEIE) }, afiseaza);
  }
}

// cheia managerului vine din codul QR (manager.html?m=...); se păstrează pe telefon și dispare din adresă
(function () {
  var m = new URLSearchParams(location.search).get('m');
  if (m) { scrie(CHEIE_MGR, m); try { history.replaceState(null, '', location.pathname); } catch (e) {} }
})();

/* ---------------- Instalarea pe ecranul telefonului ---------------- */
var cerereInstalare = null;
if (!instalata) {
  $('instalare').hidden = false;
  if (esteIphone) {
    $('instText').innerHTML = 'Apăsați butonul <b>Partajare</b> (pătratul cu săgeată, jos), apoi <b>Adăugați pe ecranul principal</b>. Aplicația apare pe ecran cu sigla bazinului.';
  } else {
    $('instText').textContent = 'Apăsați „Instalează aplicația”. Dacă butonul nu apare, deschideți meniul browserului (⋮) și alegeți „Instalați aplicația”.';
  }
}
window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); cerereInstalare = e; $('btnInstal').hidden = false; });
$('btnInstal').addEventListener('click', function () {
  if (!cerereInstalare) return;
  cerereInstalare.prompt();
  cerereInstalare.userChoice.then(function () { cerereInstalare = null; $('btnInstal').hidden = true; });
});
window.addEventListener('appinstalled', function () { $('instalare').hidden = true; });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});

ceas(); setInterval(ceas, 15000);
porneste();
