const DB_NAME='bubur_kasir_v2';
const DB_VER=1;
const DEFAULT_SETTINGS={
  namaUsaha:'Bubur Ayam Bandung Akang Hamzah',
  wa:'',
  produk:[
    {nama:'Bubur Ori',harga:10000,kategori:'produk'},
    {nama:'Bubur Cakwe',harga:12000,kategori:'produk'},
    {nama:'Bubur Telur',harga:14000,kategori:'produk'},
    {nama:'Bubur Komplit',harga:17000,kategori:'produk'}
  ],
  extra:[
    {nama:'Extra Ayam',harga:4000,kategori:'extra'},
    {nama:'Extra Cakwe',harga:2000,kategori:'extra'},
    {nama:'Extra Telur',harga:5000,kategori:'extra'},
    {nama:'Extra Kerupuk',harga:1000,kategori:'extra'}
  ],
  minuman:[
    {nama:'Es Teh',harga:4000,kategori:'minuman'},
    {nama:'Teh Hangat',harga:4000,kategori:'minuman'},
    {nama:'Air Mineral',harga:3000,kategori:'minuman'},
    {nama:'Es Jeruk',harga:6000,kategori:'minuman'}
  ],
  stok:['Bubur','Ayam','Cakwe','Telur','Kerupuk']
};
function openDB(){
 return new Promise((resolve,reject)=>{
  const req=indexedDB.open(DB_NAME,DB_VER);
  req.onupgradeneeded=e=>{
   const db=e.target.result;
   if(!db.objectStoreNames.contains('settings')) db.createObjectStore('settings',{keyPath:'id'});
   if(!db.objectStoreNames.contains('reports')) db.createObjectStore('reports',{keyPath:'id'});
  };
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error);
 });
}
async function put(store,val){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(val);tx.oncomplete=()=>res(val);tx.onerror=()=>rej(tx.error);});}
async function get(store,id){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(store,'readonly');const r=tx.objectStore(store).get(id);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
async function all(store){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(store,'readonly');const r=tx.objectStore(store).getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error);});}
async function del(store,id){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).delete(id);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);});}
async function clearStore(store){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).clear();tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);});}
async function getSettings(){let s=await get('settings','main');if(!s){s={id:'main',...DEFAULT_SETTINGS};await put('settings',s)}return s}
async function saveSettings(s){s.id='main';return put('settings',s)}
function today(){return new Date().toISOString().slice(0,10)}
function pad(n){return String(n).padStart(2,'0')}
function nowFull(){
 const d=new Date();
 return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function rupiah(n){return 'Rp '+Number(n||0).toLocaleString('id-ID')}
function activeItems(S,k){return (S && S[k]) ? S[k] : []}
function nav(active){
 return `<nav class="bottom-nav">
  <a class="${active==='input'?'active':''}" href="index.html">Input</a>
  <a class="${active==='laporan'?'active':''}" href="laporan.html">Laporan</a>
  <a class="${active==='setting'?'active':''}" href="setting.html">Setting</a>
 </nav>`;
}
function calcReport(data){
 let total=0, semua=[];
 ['produk','extra','minuman'].forEach(k=>{
  (data[k]||[]).forEach(x=>{
   const jumlah=Number(x.jumlah||0);
   const sub=jumlah*Number(x.harga||0);
   total+=sub;
   if(jumlah>0) semua.push({kategori:k,nama:x.nama,harga:Number(x.harga||0),jumlah,subtotal:sub});
  });
 });
 return {...data,semua,total};
}
async function saveReport(r){
 const waktu=nowFull();
 const id=Date.now().toString();
 return put('reports',{...r,id,waktuLengkap:waktu,createdAt:new Date().toISOString()});
}
async function getReports(){let r=await all('reports');return r.sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));}
function openWA(report,S){
 const lines=[];
 lines.push(`*${S.namaUsaha||'Laporan Transaksi'}*`);
 lines.push(`Waktu: ${report.waktuLengkap || nowFull()}`);
 lines.push(`Tanggal input: ${report.tanggal||today()}`);
 lines.push('');
 (report.semua||[]).forEach(x=>lines.push(`- ${x.nama} x${x.jumlah} = ${rupiah(x.subtotal)}`));
 if(report.stok && report.stok.length){
  lines.push('');
  lines.push('*Stok/Sisa:*');
  report.stok.filter(x=>Number(x.sisa||0)>0).forEach(x=>lines.push(`- ${x.nama}: ${x.sisa}`));
 }
 lines.push('');
 lines.push(`*Total: ${rupiah(report.total)}*`);
 if(report.catatan) lines.push(`Catatan: ${report.catatan}`);
 const url='https://wa.me/'+(S.wa||'')+'?text='+encodeURIComponent(lines.join('\n'));
 window.open(url,'_blank');
}
function formatWaktu(s){
 if(!s) return '-';
 return s.replace('T',' ').slice(0,19);
}
