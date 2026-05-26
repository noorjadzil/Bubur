const DB_NAME='bubur_kasir_db_v1';
const DB_VERSION=1;
const STORE_SETTINGS='settings';
const STORE_REPORTS='reports';

const DEFAULT_SETTINGS={
  namaUsaha:'Bubur Ayam Bandung Akang Hamzah',
  wa:'',
  items:[
    {id:uid(),nama:'Bubur Ori',harga:10000,kategori:'produk',aktif:true},
    {id:uid(),nama:'Bubur Cakwe',harga:12000,kategori:'produk',aktif:true},
    {id:uid(),nama:'Bubur Ayam Telur',harga:15000,kategori:'produk',aktif:true},
    {id:uid(),nama:'Extra Cakwe',harga:3000,kategori:'extra',aktif:true},
    {id:uid(),nama:'Extra Ayam',harga:5000,kategori:'extra',aktif:true},
    {id:uid(),nama:'Telur',harga:4000,kategori:'extra',aktif:true},
    {id:uid(),nama:'Es Teh',harga:5000,kategori:'minuman',aktif:true},
    {id:uid(),nama:'Air Mineral',harga:4000,kategori:'minuman',aktif:true}
  ]
};

function uid(){return 'id_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8)}
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=e=>{const db=e.target.result;if(!db.objectStoreNames.contains(STORE_SETTINGS))db.createObjectStore(STORE_SETTINGS,{keyPath:'key'});if(!db.objectStoreNames.contains(STORE_REPORTS))db.createObjectStore(STORE_REPORTS,{keyPath:'id'});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);})}
async function tx(store,mode,fn){const db=await openDB();return new Promise((resolve,reject)=>{const t=db.transaction(store,mode);const s=t.objectStore(store);let result;try{result=fn(s)}catch(err){reject(err)}t.oncomplete=()=>resolve(result);t.onerror=()=>reject(t.error);})}
async function getSettings(){let res=await tx(STORE_SETTINGS,'readonly',s=>s.get('main'));return new Promise(resolve=>{res.onsuccess=async()=>{if(res.result){resolve(res.result.value)}else{await saveSettings(DEFAULT_SETTINGS);resolve(structuredClone(DEFAULT_SETTINGS))}}})}
async function saveSettings(value){return tx(STORE_SETTINGS,'readwrite',s=>s.put({key:'main',value}))}
async function saveReport(report){return tx(STORE_REPORTS,'readwrite',s=>s.put(report))}
async function getReports(){let req=await tx(STORE_REPORTS,'readonly',s=>s.getAll());return new Promise(resolve=>{req.onsuccess=()=>resolve((req.result||[]).sort((a,b)=>new Date(b.waktu)-new Date(a.waktu)))})}
async function deleteReport(id){return tx(STORE_REPORTS,'readwrite',s=>s.delete(id))}
async function clearReports(){return tx(STORE_REPORTS,'readwrite',s=>s.clear())}
function rupiah(n){return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n||0))}
function today(){return new Date().toISOString().slice(0,10)}
function pad(n){return String(n).padStart(2,'0')}
function waktuLengkap(d=new Date()){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`}
function formatDateTime(iso){const d=new Date(iso);return d.toLocaleString('id-ID',{weekday:'long',year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'})}
function bulanKey(iso){const d=new Date(iso);return `${d.getFullYear()}-${pad(d.getMonth()+1)}`}
function hariKey(iso){return new Date(iso).toISOString().slice(0,10)}
function bulanLabel(key){const [y,m]=key.split('-');return new Date(Number(y),Number(m)-1,1).toLocaleDateString('id-ID',{month:'long',year:'numeric'})}
function hariLabel(key){return new Date(key+'T00:00:00').toLocaleDateString('id-ID',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
function nav(active){const links=[['index','index.html','Home'],['input','input.html','Input'],['laporan','laporan.html','Laporan'],['setting','setting.html','Setting']];return `<nav class="nav">${links.map(([id,href,label])=>`<a class="${active===id?'active':''}" href="${href}">${label}</a>`).join('')}</nav>`}
function activeItems(S,kategori){return (S.items||[]).filter(x=>x.aktif!==false && x.kategori===kategori)}
function calcCart(items,qty){let selected=[];let total=0;items.forEach(x=>{const jumlah=Number(qty[x.id]||0);if(jumlah>0){const subtotal=jumlah*Number(x.harga||0);selected.push({...x,jumlah,subtotal});total+=subtotal;}});return {selected,total}}
function openWA(report,S){let no=(S.wa||'').replace(/[^0-9]/g,'');if(!no){alert('Nomor WA belum diatur di Setting');return}if(no.startsWith('0'))no='62'+no.slice(1);let teks=`${S.namaUsaha}\n${formatDateTime(report.waktu)}\n\n`;report.items.forEach(x=>teks+=`- ${x.nama} x${x.jumlah} = ${rupiah(x.subtotal)}\n`);teks+=`\nTotal: ${rupiah(report.total)}`;if(report.catatan)teks+=`\nCatatan: ${report.catatan}`;window.open(`https://wa.me/${no}?text=${encodeURIComponent(teks)}`,'_blank')}
