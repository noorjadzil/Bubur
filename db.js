const DB_NAME = 'akang_hamzah_premium_db';
const DB_VERSION = 1;
const STORE_REPORTS = 'reports';
const STORE_SETTINGS = 'settings';

const DEFAULT_SETTINGS = {
  brand: 'Bubur Ayam Bandung Akang Hamzah',
  wa: '',
  menu: {
    produk: [
      { nama: 'Bubur Ori', harga: 7000 },
      { nama: 'Bubur Cakwe', harga: 12000 },
      { nama: 'Bubur Telur', harga: 12000 },
      { nama: 'Bubur Ayam Suwir', harga: 15000 },
      { nama: 'Bubur Abon', harga: 17000 },
      { nama: 'Bubur Spesial', harga: 13000 },
      { nama: 'Bubur Istimewa', harga: 17000 }
    ],
    extra: [
      { nama: 'Cakwe', harga: 2000 },
      { nama: 'Ayam Suwir', harga: 3000 },
      { nama: 'Abon', harga: 5000 },
      { nama: 'Irisan Telur Dadar', harga: 1000 },
      { nama: 'Telur Rebus', harga: 1000 },
      { nama: 'Kuah', harga: 500 },
      { nama: 'Krupuk', harga: 500 }
    ],
    minuman: [
      { nama: 'Puyuh', harga: 3000 },
      { nama: 'Cleo', harga: 1000 },
      { nama: 'Teh Anget', harga: 3000 },
      { nama: 'Es Teh', harga: 3000 }
    ],
    stok: ['Paper Bowl','Tali Segel','Sendok','Krupuk','Kripik Pangsit','Bawang Goreng','Kacang Kedelai'],
    kurang: ['Cleo','Tisu','Plastik Kecap','Plastik Kuah','Plastik Sambal','Kecap Asin','Kecap Manis','Lada','Kresek Kecil','Kresek Tanggung','Kresek Besar']
  }
};

function openDB(){
  return new Promise((resolve,reject)=>{
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if(!db.objectStoreNames.contains(STORE_REPORTS)) db.createObjectStore(STORE_REPORTS,{keyPath:'tanggal'});
      if(!db.objectStoreNames.contains(STORE_SETTINGS)) db.createObjectStore(STORE_SETTINGS,{keyPath:'key'});
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(store, mode, cb){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const result = cb(s);
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
  });
}

async function getSettings(){
  const db = await openDB();
  return new Promise((resolve)=>{
    const t = db.transaction(STORE_SETTINGS,'readonly');
    const req = t.objectStore(STORE_SETTINGS).get('main');
    req.onsuccess = () => resolve(req.result ? req.result.value : structuredClone(DEFAULT_SETTINGS));
    req.onerror = () => resolve(structuredClone(DEFAULT_SETTINGS));
  });
}

async function saveSettings(settings){
  return tx(STORE_SETTINGS,'readwrite',s=>s.put({key:'main', value: settings}));
}

async function saveReportData(data){
  return tx(STORE_REPORTS,'readwrite',s=>s.put(data));
}

async function getReportData(tanggal){
  const db = await openDB();
  return new Promise((resolve)=>{
    const req = db.transaction(STORE_REPORTS,'readonly').objectStore(STORE_REPORTS).get(tanggal);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
}

async function getAllReports(){
  const db = await openDB();
  return new Promise((resolve)=>{
    const req = db.transaction(STORE_REPORTS,'readonly').objectStore(STORE_REPORTS).getAll();
    req.onsuccess = () => resolve((req.result || []).sort((a,b)=>b.tanggal.localeCompare(a.tanggal)));
    req.onerror = () => resolve([]);
  });
}

async function deleteReport(tanggal){
  return tx(STORE_REPORTS,'readwrite',s=>s.delete(tanggal));
}
