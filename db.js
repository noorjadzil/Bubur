const DB_NAME='akang_hamzah_idb_v3';
const DB_VERSION=1;
const STORE={settings:'settings',reports:'reports'};
const DEFAULT_SETTINGS={
  brand:'Bubur Ayam Bandung Akang Hamzah',
  wa:'',
  categories:[
    {id:'produk',name:'Menu Bubur',type:'sale',items:[['Bubur Ori',7000],['Bubur Cakwe',12000],['Bubur Telur',12000],['Bubur Ayam Suwir',15000],['Bubur Abon',17000],['Bubur Spesial',13000],['Bubur Istimewa',17000]]},
    {id:'extra',name:'Extra Topping',type:'sale',items:[['Cakwe',2000],['Ayam Suwir',3000],['Abon',5000],['Irisan Telur Dadar',1000],['Telur Rebus',1000],['Kuah',500],['Krupuk',500]]},
    {id:'minuman',name:'Minuman / Lainnya',type:'sale',items:[['Puyuh',3000],['Cleo',1000],['Teh Anget',3000],['Es Teh',3000]]},
    {id:'stok',name:'Stok Perlengkapan',type:'stock',items:[['Paper Bowl',0],['Tali Segel',0],['Sendok',0],['Krupuk',0],['Kripik Pangsit',0],['Bawang Goreng',0],['Kacang Kedelai',0]]},
    {id:'kurang',name:'Kekurangan / Catatan Barang',type:'check',items:[['Cleo',0],['Tisu',0],['Plastik Kecap',0],['Plastik Kuah',0],['Plastik Sambal',0],['Kecap Asin',0],['Kecap Manis',0],['Lada',0],['Kresek Kecil',0],['Kresek Tanggung',0],['Kresek Besar',0]]}
  ]
};
function clone(x){return JSON.parse(JSON.stringify(x))}
function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains(STORE.settings))db.createObjectStore(STORE.settings,{keyPath:'id'});if(!db.objectStoreNames.contains(STORE.reports))db.createObjectStore(STORE.reports,{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function tx(store,mode,fn){const db=await openDB();return new Promise((resolve,reject)=>{const t=db.transaction(store,mode);const s=t.objectStore(store);let out;try{out=fn(s)}catch(e){reject(e);return}t.oncomplete=()=>resolve(out);t.onerror=()=>reject(t.error);});}
async function getSettings(){const db=await openDB();return new Promise((resolve,reject)=>{const r=db.transaction(STORE.settings).objectStore(STORE.settings).get('main');r.onsuccess=()=>resolve(r.result||{id:'main',...clone(DEFAULT_SETTINGS)});r.onerror=()=>reject(r.error);});}
async function saveSettings(data){data.id='main';await tx(STORE.settings,'readwrite',s=>s.put(data));return data}
async function resetSettings(){return saveSettings({id:'main',...clone(DEFAULT_SETTINGS)})}
async function saveReport(data){data.id=data.id||(data.tanggal+'_'+Date.now());data.updatedAt=new Date().toISOString();await tx(STORE.reports,'readwrite',s=>s.put(data));return data}
async function getAllReports(){const db=await openDB();return new Promise((resolve,reject)=>{const r=db.transaction(STORE.reports).objectStore(STORE.reports).getAll();r.onsuccess=()=>resolve((r.result||[]).sort((a,b)=>(b.tanggal||'').localeCompare(a.tanggal||'')));r.onerror=()=>reject(r.error);});}
async function deleteReport(id){await tx(STORE.reports,'readwrite',s=>s.delete(id))}
async function clearAllReports(){await tx(STORE.reports,'readwrite',s=>s.clear())}
const rupiah=n=>'Rp '+Number(n||0).toLocaleString('id-ID');
const today=()=>new Date().toISOString().slice(0,10);
function nav(active,no){return `<div class="nav"><a class="${active==='input'?'on':''}" href="Input${no}.html">Input</a><a class="${active==='laporan'?'on':''}" href="laporan${no}.html">Laporan</a><a class="${active==='setting'?'on':''}" href="setting${no}.html">Setting</a><a href="index.html">Menu</a></div>`}
function header(title,sub=''){return `<header class="hero"><b class="eyebrow">Akang Hamzah</b><h1>${title}</h1><p>${sub}</p></header>`}
function num(v){return Number(v||0)}
