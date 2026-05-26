const DB_NAME = 'akang_hamzah_idb_1input';
const DB_VERSION = 1;
const STORE = { settings:'settings', reports:'reports' };

const DEFAULT_SETTINGS = {
  brand: 'Bubur Ayam Bandung Akang Hamzah',
  wa: '',
  produk: [
    { nama: 'Bubur Ori', harga: 7000, aktif: true },
    { nama: 'Bubur Cakwe', harga: 12000, aktif: true },
    { nama: 'Bubur Telur', harga: 12000, aktif: true },
    { nama: 'Bubur Ayam Suwir', harga: 15000, aktif: true },
    { nama: 'Bubur Abon', harga: 17000, aktif: true },
    { nama: 'Bubur Spesial', harga: 13000, aktif: true },
    { nama: 'Bubur Istimewa', harga: 17000, aktif: true }
  ],
  extra: [
    { nama: 'Cakwe', harga: 2000, aktif: true },
    { nama: 'Ayam Suwir', harga: 3000, aktif: true },
    { nama: 'Abon', harga: 5000, aktif: true },
    { nama: 'Irisan Telur Dadar', harga: 1000, aktif: true },
    { nama: 'Telur Rebus', harga: 1000, aktif: true },
    { nama: 'Kuah', harga: 500, aktif: true },
    { nama: 'Krupuk', harga: 500, aktif: true }
  ],
  minuman: [
    { nama: 'Puyuh', harga: 3000, aktif: true },
    { nama: 'Cleo', harga: 1000, aktif: true },
    { nama: 'Teh Anget', harga: 3000, aktif: true },
    { nama: 'Es Teh', harga: 3000, aktif: true }
  ],
  stok: ['Paper Bowl','Tali Segel','Sendok','Krupuk','Kripik Pangsit','Bawang Goreng','Kacang Kedelai']
};

function clone(x){ return JSON.parse(JSON.stringify(x)); }
function openDB(){
  return new Promise((resolve,reject)=>{
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if(!db.objectStoreNames.contains(STORE.settings)) db.createObjectStore(STORE.settings,{keyPath:'id'});
      if(!db.objectStoreNames.contains(STORE.reports)) db.createObjectStore(STORE.reports,{keyPath:'id'});
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function tx(store, mode, fn){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let result;
    try { result = fn(s); } catch(e){ reject(e); return; }
    t.oncomplete=()=>resolve(result);
    t.onerror=()=>reject(t.error);
  });
}
async function getSettings(){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const r = db.transaction(STORE.settings,'readonly').objectStore(STORE.settings).get('main');
    r.onsuccess=()=>resolve(r.result || {id:'main', ...clone(DEFAULT_SETTINGS)});
    r.onerror=()=>reject(r.error);
  });
}
async function saveSettings(data){ data.id='main'; await tx(STORE.settings,'readwrite',s=>s.put(data)); return data; }
async function resetSettings(){ return saveSettings({id:'main', ...clone(DEFAULT_SETTINGS)}); }
async function saveReport(data){ data.id = data.id || (data.tanggal + '_' + Date.now()); data.updatedAt = new Date().toISOString(); await tx(STORE.reports,'readwrite',s=>s.put(data)); return data; }
async function getAllReports(){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const r = db.transaction(STORE.reports,'readonly').objectStore(STORE.reports).getAll();
    r.onsuccess=()=>resolve((r.result||[]).sort((a,b)=>(b.tanggal||'').localeCompare(a.tanggal||'')));
    r.onerror=()=>reject(r.error);
  });
}
async function deleteReport(id){ await tx(STORE.reports,'readwrite',s=>s.delete(id)); }
async function clearAllReports(){ await tx(STORE.reports,'readwrite',s=>s.clear()); }
function rupiah(n){ return 'Rp ' + Number(n||0).toLocaleString('id-ID'); }
function today(){ return new Date().toISOString().slice(0,10); }
function activeItems(settings, key){ return (settings[key]||[]).filter(x=>x.aktif!==false); }
function calcReport(data){
  data.total = ['produk','extra','minuman'].reduce((sum,k)=>sum+(data[k]||[]).reduce((a,b)=>a + Number(b.jumlah||0)*Number(b.harga||0),0),0);
  return data;
}
function waText(report, settings){
  let t = `*${settings.brand}*\nLaporan: ${report.tanggal}\n\n`;
  ['produk','extra','minuman'].forEach(k=>{
    const title = k==='produk'?'BUBUR':k==='extra'?'EXTRA':'MINUMAN';
    t += `*${title}*\n`;
    const rows=(report[k]||[]).filter(x=>Number(x.jumlah)>0);
    t += rows.length ? rows.map(x=>`${x.nama} x${x.jumlah} = ${rupiah(x.jumlah*x.harga)}`).join('\n')+'\n' : '-\n';
    t+='\n';
  });
  if((report.stok||[]).some(x=>x.sisa>0)){
    t += '*STOK SISA*\n' + report.stok.filter(x=>x.sisa>0).map(x=>`${x.nama}: ${x.sisa}`).join('\n') + '\n\n';
  }
  t += `*TOTAL: ${rupiah(report.total)}*\n`;
  if(report.catatan) t += `\nCatatan: ${report.catatan}`;
  return t;
}
function openWA(report, settings){ const no=(settings.wa||'').replace(/\D/g,''); const url=no?`https://wa.me/${no}?text=`:'https://wa.me/?text='; window.open(url+encodeURIComponent(waText(report, settings)),'_blank'); }
function nav(active){ return `<div class="nav"><a class="${active==='input'?'on':''}" href="index.html">Input</a><a class="${active==='laporan'?'on':''}" href="laporan.html">Laporan</a><a class="${active==='setting'?'on':''}" href="setting.html">Setting</a><a href="index.html">Menu</a></div>`; }
