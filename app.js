// SHUBAGO Pharmacy Management — lightweight SPA (no backend) using localStorage
const TEMPLATES = {
  dashboard: document.getElementById('dashboard-tpl').content,
  sales: document.getElementById('sales-tpl').content,
  purchases: document.getElementById('purchases-tpl').content,
  inventory: document.getElementById('inventory-tpl').content,
  accounts: document.getElementById('accounts-tpl').content,
  reports: document.getElementById('reports-tpl').content,
  settings: document.getElementById('settings-tpl').content
};

const stateKey = 'shubago_pharma_v1';
let db = {
  products: [],
  invoices: [],
  purchases: [],
  settings: { bizName: 'SHUBAGO Pharmacy', currency: '₹' }
};

function loadState(){
  const raw = localStorage.getItem(stateKey);
  if(raw) {
    try{ db = JSON.parse(raw); }catch(e){ console.error('corrupt state'); }
  } else {
    // seed sample product
    db.products.push({ id: uid(), sku: 'PARA500', name:'Paracetamol 500mg', price:25, cost:12, stock:50, low:10 });
    saveState();
  }
}
function saveState(){ localStorage.setItem(stateKey, JSON.stringify(db)); }

function uid(){ return 'id-'+Math.random().toString(36).slice(2,9); }

// Router
const navBtns = document.querySelectorAll('.nav-btn');
navBtns.forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.route)));
function navigate(route){
  navBtns.forEach(n=>n.classList.toggle('active', n.dataset.route===route));
  const container = document.getElementById('page-content');
  container.innerHTML = '';
  const tpl = TEMPLATES[route];
  container.appendChild(document.importNode(tpl, true));
  if(route==='inventory') initInventory();
  if(route==='sales') initSales();
  if(route==='dashboard') renderDashboard();
  if(route==='purchases') initPurchases();
  if(route==='accounts') renderLedger();
  if(route==='reports') initReports();
  if(route==='settings') initSettings();
}

// Dashboard
function renderDashboard(){
  const totalSalesEl = document.getElementById('totalSales');
  const stockValueEl = document.getElementById('stockValue');
  const lowStockEl = document.getElementById('lowStockCount');
  const recentSales = document.getElementById('recentSales');

  const todaySales = db.invoices.reduce((s,inv)=> s + inv.total, 0);
  const stockValue = db.products.reduce((s,p)=> s + (p.stock * (p.cost||0)), 0);
  const lowCount = db.products.filter(p=>p.stock <= (p.low||5)).length;

  totalSalesEl.textContent = db.settings.currency + todaySales;
  stockValueEl.textContent = db.settings.currency + stockValue;
  lowStockEl.textContent = lowCount;

  recentSales.innerHTML = '';
  db.invoices.slice().reverse().slice(0,8).forEach(inv=>{
    const li = document.createElement('li');
    li.textContent = `${inv.id} • ${inv.customer||'Walk-in'} • ${db.settings.currency}${inv.total}`;
    recentSales.appendChild(li);
  });
}

// Inventory page
function initInventory(){
  const productList = document.getElementById('productList');
  const editor = {
    sku: document.getElementById('p_sku'),
    name: document.getElementById('p_name'),
    price: document.getElementById('p_price'),
    cost: document.getElementById('p_cost'),
    stock: document.getElementById('p_stock'),
    low: document.getElementById('p_low')
  };
  let editingId = null;

  function refreshList(filter=''){
    productList.innerHTML = '';
    db.products.filter(p=> (p.name+''+p.sku).toLowerCase().includes(filter.toLowerCase())).forEach(p=>{
      const li = document.createElement('li');
      li.innerHTML = `<strong>${p.name}</strong> <small>${p.sku}</small> • ${db.settings.currency}${p.price} • stock: ${p.stock}`;
      li.addEventListener('click', ()=> loadProduct(p.id));
      productList.appendChild(li);
    });
  }
  function loadProduct(id){
    const p = db.products.find(x=>x.id===id);
    if(!p) return;
    editingId = p.id;
    editor.sku.value = p.sku; editor.name.value = p.name; editor.price.value = p.price;
    editor.cost.value = p.cost; editor.stock.value = p.stock; editor.low.value = p.low;
  }
  function clearEditor(){ editingId = null; editor.sku.value=''; editor.name.value=''; editor.price.value=''; editor.cost.value=''; editor.stock.value=''; editor.low.value=''; }

  document.getElementById('newProductBtn').addEventListener('click', ()=>{ clearEditor(); });
  document.getElementById('filterProduct').addEventListener('input', (e)=> refreshList(e.target.value));
  document.getElementById('saveProductBtn').addEventListener('click', ()=>{
    const p = {
      id: editingId || uid(),
      sku: editor.sku.value || 'SKU-'+Math.random().toString(36).slice(2,6),
      name: editor.name.value || 'Unnamed',
      price: Number(editor.price.value)||0,
      cost: Number(editor.cost.value)||0,
      stock: Number(editor.stock.value)||0,
      low: Number(editor.low.value)||5
    };
    if(editingId){
      const idx = db.products.findIndex(x=>x.id===editingId);
      db.products[idx]=p;
    } else {
      db.products.push(p);
    }
    saveState(); refreshList(); alert('Saved product');
  });
  document.getElementById('deleteProductBtn').addEventListener('click', ()=>{
    if(!editingId) return alert('No product selected');
    if(!confirm('Delete product?')) return;
    db.products = db.products.filter(x=>x.id!==editingId);
    saveState(); clearEditor(); refreshList();
  });

  refreshList();
}

// Sales page
function initSales(){
  const productSelect = document.getElementById('productSelect');
  const invoiceItems = document.getElementById('invoiceItems');
  const subtotalEl = document.getElementById('subtotal');
  const taxEl = document.getElementById('tax');
  const totalEl = document.getElementById('total');

  function populateProducts(){
    productSelect.innerHTML = '';
    db.products.forEach(p=>{
      const opt = document.createElement('option');
      opt.value = p.id; opt.textContent = `${p.name} • ${p.sku} • ${db.settings.currency}${p.price}`;
      productSelect.appendChild(opt);
    });
  }
  let items = [];

  function renderItems(){
    invoiceItems.innerHTML = '';
    let subtotal = 0;
    items.forEach((it,idx)=>{
      const li = document.createElement('li');
      li.innerHTML = `${it.name} x ${it.qty} • ${db.settings.currency}${it.price*it.qty}
        <div class="row" style="margin-top:6px">
          <button data-idx="${idx}" class="small btn-decrease">-</button>
          <button data-idx="${idx}" class="small btn-increase">+</button>
          <button data-idx="${idx}" class="small btn-remove">Remove</button>
        </div>`;
      invoiceItems.appendChild(li);
      subtotal += it.price*it.qty;
    });
    const tax = Math.round(subtotal * 0.12); // fixed 12% tax for demo
    subtotalEl.textContent = db.settings.currency + subtotal;
    taxEl.textContent = db.settings.currency + tax;
    totalEl.textContent = db.settings.currency + (subtotal + tax);
  }

  document.getElementById('addProductBtn').addEventListener('click', ()=>{
    const pid = productSelect.value;
    const p = db.products.find(x=>x.id===pid);
    if(!p) return alert('No product');
    const existing = items.find(i=>i.id===p.id);
    if(existing){ existing.qty += 1; } else { items.push({ id:p.id, name:p.name, price:p.price, qty:1 }); }
    renderItems();
  });

  invoiceItems.addEventListener('click', (e)=>{
    if(e.target.matches('.btn-increase')){
      const i = Number(e.target.dataset.idx); items[i].qty++; renderItems();
    } else if(e.target.matches('.btn-decrease')){
      const i = Number(e.target.dataset.idx); items[i].qty = Math.max(1, items[i].qty-1); renderItems();
    } else if(e.target.matches('.btn-remove')){
      const i = Number(e.target.dataset.idx); items.splice(i,1); renderItems();
    }
  });

  document.getElementById('saveInvoiceBtn').addEventListener('click', ()=>{
    if(items.length===0) return alert('No items in invoice');
    const subtotal = items.reduce((s,it)=> s + it.price*it.qty, 0);
    const tax = Math.round(subtotal * 0.12);
    const total = subtotal + tax;
    const inv = { id: 'INV-'+(db.invoices.length+1), customer: document.getElementById('saleCustomer').value, items: items.slice(), subtotal, tax, total, ts: Date.now() };
    db.invoices.push(inv);
    // deduct stock
    items.forEach(it=>{
      const p = db.products.find(x=>x.id===it.id);
      if(p) p.stock = Math.max(0, (p.stock || 0) - it.qty);
    });
    items = []; renderItems(); saveState(); alert('Invoice saved: ' + inv.id);
    renderDashboard();
  });

  populateProducts();
  renderItems();

  // invoice list
  const invoiceList = document.getElementById('invoiceList');
  document.getElementById('searchInvoice').addEventListener('input', (e)=>{
    const q = e.target.value.toLowerCase();
    invoiceList.innerHTML = '';
    db.invoices.filter(inv => (inv.id + (inv.customer||'')).toLowerCase().includes(q)).forEach(inv=>{
      const li = document.createElement('li');
      li.textContent = `${inv.id} • ${inv.customer||'Walk-in'} • ${db.settings.currency}${inv.total}`;
      invoiceList.appendChild(li);
    });
  });
}

// Purchases page
function initPurchases(){
  const productSelect = document.getElementById('purchaseProductSelect');
  const purchaseItems = document.getElementById('purchaseItems');
  function populate(){
    productSelect.innerHTML = '';
    db.products.forEach(p=> {
      const opt = document.createElement('option');
      opt.value = p.id; opt.textContent = `${p.name} • ${db.settings.currency}${p.cost}`;
      productSelect.appendChild(opt);
    })
  }
  let items = [];
  document.getElementById('addPurchaseProductBtn').addEventListener('click', ()=>{
    const pid = productSelect.value;
    const p = db.products.find(x=>x.id===pid);
    if(!p) return;
    const ex = items.find(i=>i.id===pid);
    if(ex) ex.qty++; else items.push({ id:p.id, name:p.name, cost:p.cost, qty:1});
    render();
  });
  function render(){
    purchaseItems.innerHTML = '';
    items.forEach((it,idx)=>{
      const li = document.createElement('li');
      li.textContent = `${it.name} x ${it.qty} • ${db.settings.currency}${it.cost*it.qty}`;
      const btn = document.createElement('button'); btn.textContent='Remove'; btn.addEventListener('click', ()=>{ items.splice(idx,1); render(); });
      li.appendChild(btn); purchaseItems.appendChild(li);
    });
  }
  document.getElementById('savePurchaseBtn').addEventListener('click', ()=>{
    if(items.length===0) return alert('No items');
    const purchase = { id:'PUR-'+(db.purchases.length+1), supplier: document.getElementById('purchaseSupplier').value, items: items.slice(), ts: Date.now() };
    db.purchases.push(purchase);
    // add stock
    items.forEach(it=>{
      const p = db.products.find(x=>x.id===it.id);
      if(p) p.stock = (p.stock||0) + it.qty;
    });
    items = []; render(); saveState(); alert('Purchase saved');
    renderDashboard();
  });
  populate();
  render();
}

// Accounts / ledger
function renderLedger(){
  const ledger = document.getElementById('ledgerList');
  ledger.innerHTML = '';
  db.invoices.forEach(inv=> {
    const li = document.createElement('li');
    li.textContent = `${inv.id} • ${inv.customer||'Walk-in'} • ${db.settings.currency}${inv.total}`;
    ledger.appendChild(li);
  });
  db.purchases.forEach(pur=>{
    const li = document.createElement('li');
    li.textContent = `${pur.id} • ${pur.supplier||'Supplier'} • ${pur.items.length} items`;
    ledger.appendChild(li);
  });
}

// Reports
function initReports(){
  document.getElementById('reportSalesBtn').addEventListener('click', ()=>{
    const out = db.invoices.map(i=> `${i.id} • ${new Date(i.ts).toLocaleDateString()} • ${db.settings.currency}${i.total}`).join('\n');
    document.getElementById('reportOutput').textContent = out;
  });
  document.getElementById('reportStockBtn').addEventListener('click', ()=>{
    const out = db.products.map(p=> `${p.name} • stock: ${p.stock} • ${db.settings.currency}${p.price}`).join('\n');
    document.getElementById('reportOutput').textContent = out;
  });
}

// Settings
function initSettings(){
  document.getElementById('bizName').value = db.settings.bizName || '';
  document.getElementById('currency').value = db.settings.currency || '₹';
  document.getElementById('saveSettingsBtn').addEventListener('click', ()=>{
    db.settings.bizName = document.getElementById('bizName').value || 'SHUBAGO Pharmacy';
    db.settings.currency = document.getElementById('currency').value || '₹';
    saveState(); alert('Settings saved');
  });
}

// Import / Export
document.getElementById('exportBtn').addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(db, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='shubago_pharma_export.json'; a.click(); URL.revokeObjectURL(url);
});
document.getElementById('importBtn').addEventListener('click', ()=>{
  const input = document.createElement('input'); input.type='file'; input.accept='application/json';
  input.onchange = e => {
    const f = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      try{
        db = JSON.parse(reader.result);
        saveState();
        alert('Imported data');
        navigate('dashboard');
      }catch(err){ alert('Invalid file'); }
    }
    reader.readAsText(f);
  }
  input.click();
});

// install prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e)=>{ e.preventDefault(); deferredPrompt=e; const b=document.getElementById('installBtn'); b.style.display='inline-block'; b.addEventListener('click', async ()=>{ deferredPrompt.prompt(); const choice = await deferredPrompt.userChoice; console.log(choice); }); });

// service worker
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').then(()=>console.log('sw registered'));
}

// initial boot
loadState();
navigate('dashboard');
