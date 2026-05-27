const rupiah = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
const today = () => new Date().toISOString().slice(0,10);
let settings, draft = {produk:[], extra:[], minuman:[], stok:[], kurang:[]};

if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js').catch(()=>{}); }

async function startHome(){
  settings = await getSettings();
  brandTitle.textContent = settings.brand.replace('Bubur Ayam Bandung ', '') || 'Akang Hamzah';
  const all = await getAllReports();
  const now = today();
  const todayData = all.find(x=>x.tanggal===now);
  todayTotal.textContent = rupiah(todayData?.total || 0);
  todayItems.textContent = totalQty(todayData || {});
  latestList.innerHTML = all.slice(0,5).map(r=>rowHTML(r)).join('') || '<p class="small">Belum ada laporan.</p>';
}

async function startInput(){
  settings = await getSettings();
  tanggal.value = today();
  buildInput();
  await loadReportToForm();
  tanggal.addEventListener('change', loadReportToForm);
  document.querySelectorAll('.segmented button').forEach(btn=>btn.onclick=()=>switchTab(btn.dataset.tab));
}

function switchTab(id){
  document.querySelectorAll('.segmented button').forEach(b=>b.classList.toggle('active', b.dataset.tab===id));
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('hidden', p.id!==id));
}

function buildInput(){
  ['produk','extra','minuman'].forEach(cat=>{
    document.getElementById(cat).innerHTML = settings.menu[cat].map((item,i)=>itemHTML(cat,item,i)).join('');
  });
  stok.innerHTML = `<div class="card"><h2>Stok Perlengkapan</h2>${settings.menu.stok.map((nama,i)=>stockHTML(nama,i)).join('')}</div>`;
  kurangBox.innerHTML = settings.menu.kurang.map((nama,i)=>`<label class="chip"><input type="checkbox" id="kurang_${i}">${nama}</label>`).join('');
}

function itemHTML(cat,item,i){
  return `<div class="item-card"><div><div class="item-name">${item.nama}</div><div class="item-price">${rupiah(item.harga)}</div></div><div class="counter"><button onclick="changeQty('${cat}',${i},-1)">−</button><input id="${cat}_${i}" type="number" min="0" value="0" oninput="calcTotal()"><button onclick="changeQty('${cat}',${i},1)">+</button></div></div>`;
}
function stockHTML(nama,i){
  return `<div class="item-card"><div><div class="item-name">${nama}</div><div class="item-price">Awal - Laku = Sisa</div></div><div class="counter"><input id="stokA_${i}" type="number" min="0" value="0" oninput="calcStock(${i})"><input id="stokL_${i}" type="number" min="0" value="0" oninput="calcStock(${i})"><strong id="stokS_${i}">0</strong></div></div>`;
}
function changeQty(cat,i,step){
  const el = document.getElementById(`${cat}_${i}`);
  el.value = Math.max(0, Number(el.value || 0) + step);
  if(navigator.vibrate) navigator.vibrate(18);
  calcTotal();
}
function calcStock(i){
  stokS_${i}.textContent = Number(document.getElementById(`stokA_${i}`).value||0) - Number(document.getElementById(`stokL_${i}`).value||0);
}
function collectCat(cat){
  return settings.menu[cat].map((item,i)=>{
    const jumlah = Number(document.getElementById(`${cat}_${i}`).value || 0);
    return {...item, jumlah, total: jumlah * item.harga};
  });
}
function collectData(){
  const produk = collectCat('produk'), extra = collectCat('extra'), minuman = collectCat('minuman');
  const stokData = settings.menu.stok.map((nama,i)=>{
    const awal = Number(document.getElementById(`stokA_${i}`).value||0);
    const laku = Number(document.getElementById(`stokL_${i}`).value||0);
    return {nama, awal, laku, sisa: awal-laku};
  });
  const kurangData = settings.menu.kurang.map((nama,i)=>({nama, kurang: document.getElementById(`kurang_${i}`).checked}));
  const total = [...produk,...extra,...minuman].reduce((a,b)=>a+b.total,0);
  return {tanggal:tanggal.value, catatan:catatan.value, produk, extra, minuman, stok:stokData, kurang:kurangData, total, updatedAt:new Date().toISOString()};
}
function calcTotal(){ grandTotal.textContent = rupiah(collectData().total); }
async function saveReport(sendWa){
  const data = collectData();
  await saveReportData(data);
  if(sendWa) kirimWA(data); else alert('Laporan berhasil disimpan');
  resetForm(false);
}
function kirimWA(data){
  let text = `*LAPORAN PENJUALAN HARIAN*\n${settings.brand}\nTanggal: ${data.tanggal}\n\n`;
  ['produk','extra','minuman'].forEach(cat=>{
    text += `*${cat.toUpperCase()}*\n`;
    const rows = data[cat].filter(x=>x.jumlah>0);
    text += rows.length ? rows.map(x=>`${x.nama} x${x.jumlah} = ${rupiah(x.total)}`).join('\n')+'\n\n' : '-\n\n';
  });
  text += `*STOK*\n` + data.stok.filter(x=>x.awal||x.laku).map(x=>`${x.nama}: awal ${x.awal}, laku ${x.laku}, sisa ${x.sisa}`).join('\n');
  text += `\n\n*BARANG KURANG*\n` + (data.kurang.filter(x=>x.kurang).map(x=>'- '+x.nama).join('\n') || '-');
  text += `\n\n*TOTAL: ${rupiah(data.total)}*`;
  if(data.catatan) text += `\nCatatan: ${data.catatan}`;
  const phone = (settings.wa || '').replace(/\D/g,'');
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`,'_blank');
}
async function loadReportToForm(){
  const data = await getReportData(tanggal.value);
  document.querySelectorAll('input[type="number"]').forEach(i=>i.value=0);
  document.querySelectorAll('input[type="checkbox"]').forEach(i=>i.checked=false);
  catatan.value = data?.catatan || '';
  if(data){
    ['produk','extra','minuman'].forEach(cat=>data[cat]?.forEach((x,i)=>{const el=document.getElementById(`${cat}_${i}`); if(el) el.value=x.jumlah||0;}));
    data.stok?.forEach((x,i)=>{ if(document.getElementById(`stokA_${i}`)){ document.getElementById(`stokA_${i}`).value=x.awal||0; document.getElementById(`stokL_${i}`).value=x.laku||0; document.getElementById(`stokS_${i}`).textContent=x.sisa||0; }});
    data.kurang?.forEach((x,i)=>{ if(document.getElementById(`kurang_${i}`)) document.getElementById(`kurang_${i}`).checked=!!x.kurang; });
  }
  calcTotal();
}
function resetForm(keepDate=true){
  const d = tanggal.value;
  document.querySelectorAll('input[type="number"]').forEach(i=>i.value=0);
  document.querySelectorAll('input[type="checkbox"]').forEach(i=>i.checked=false);
  catatan.value=''; if(keepDate) tanggal.value=d; calcTotal();
}

async function startReports(){
  fromDate.value = today().slice(0,8)+'01'; toDate.value = today(); renderReports();
}
async function renderReports(){
  const all = (await getAllReports()).filter(r=>r.tanggal>=fromDate.value && r.tanggal<=toDate.value);
  sumTotal.textContent = rupiah(all.reduce((a,b)=>a+b.total,0));
  sumQty.textContent = all.reduce((a,b)=>a+totalQty(b),0);
  sumDays.textContent = all.length;
  reportList.innerHTML = all.map(r=>`<div class="report-row">${rowHTML(r)}<div class="report-items">${itemsText(r)}</div><button class="btn danger full" onclick="removeReport('${r.tanggal}')">Hapus</button></div>`).join('') || '<p class="small">Belum ada data.</p>';
}
function rowHTML(r){ return `<div class="soft-row"><div class="row-head"><span>${r.tanggal}</span><span>${rupiah(r.total)}</span></div><div class="small">${totalQty(r)} item terjual ${r.catatan ? '• '+r.catatan : ''}</div></div>`; }
function totalQty(r){ return ['produk','extra','minuman'].flatMap(c=>r[c]||[]).reduce((a,b)=>a+Number(b.jumlah||0),0); }
function itemsText(r){ return ['produk','extra','minuman'].flatMap(c=>r[c]||[]).filter(x=>x.jumlah>0).map(x=>`${x.nama} x${x.jumlah} = ${rupiah(x.total)}`).join('<br>') || '-'; }
async function removeReport(tgl){ if(confirm('Hapus laporan tanggal ini?')){ await deleteReport(tgl); renderReports(); } }
async function exportCSV(){
  const all = await getAllReports();
  let csv = 'Tanggal,Kategori,Nama,Harga,Jumlah,Total\n';
  all.forEach(r=>['produk','extra','minuman'].forEach(c=>(r[c]||[]).filter(x=>x.jumlah>0).forEach(x=>csv+=`${r.tanggal},${c},${x.nama},${x.harga},${x.jumlah},${x.total}\n`)));
  const url = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  const a = document.createElement('a'); a.href=url; a.download='laporan-akang-hamzah.csv'; a.click(); URL.revokeObjectURL(url);
}

async function startSettings(){
  settings = await getSettings(); brandInput.value=settings.brand; waInput.value=settings.wa||''; renderMenuEditor();
}
async function saveBrandSettings(){ settings.brand=brandInput.value; settings.wa=waInput.value; await saveSettings(settings); alert('Setting tersimpan'); }
function renderMenuEditor(){
  menuEditor.innerHTML = ['produk','extra','minuman'].map(cat=>`<h2>${cat.toUpperCase()}</h2>` + settings.menu[cat].map((x,i)=>`<div class="edit-row"><input value="${x.nama}" onchange="settings.menu.${cat}[${i}].nama=this.value"><input type="number" value="${x.harga}" onchange="settings.menu.${cat}[${i}].harga=Number(this.value)"><span class="small">${cat}</span><button class="btn danger" onclick="deleteMenuItem('${cat}',${i})">Hapus</button></div>`).join('')).join('') + '<button class="btn primary full" onclick="saveSettings(settings).then(()=>alert(\'Menu tersimpan\'))">Simpan Semua Menu</button>';
}
async function addMenuItem(){
  const nama = newName.value.trim(); const harga = Number(newPrice.value||0); const cat = newCat.value;
  if(!nama || !harga) return alert('Nama dan harga wajib diisi');
  settings.menu[cat].push({nama,harga}); await saveSettings(settings); newName.value=''; newPrice.value=''; renderMenuEditor();
}
async function deleteMenuItem(cat,i){ settings.menu[cat].splice(i,1); await saveSettings(settings); renderMenuEditor(); }
async function resetDefaultSettings(){ if(confirm('Kembalikan setting default?')){ settings = structuredClone(DEFAULT_SETTINGS); await saveSettings(settings); location.reload(); } }
