
const DEFAULT_ADMIN_PASSWORD = "admin123";
const STORAGE_KEY = "resident-data-v5-r1-r7-39";
const ADMIN_SESSION_KEY = "admin-session-v1";

const state = {
  activeTab: "junior",
  mode: "presentasi",
  order: [],
  residentData: {},
  editingResident: null
};

const $ = id => document.getElementById(id);
const groupsByTab = {
  junior: ["R1","R2","R3","R4"],
  senior: ["R5","R6","R7"]
};

function cloneData(data){
  return JSON.parse(JSON.stringify(data));
}

function loadResidentData(){
  const saved = localStorage.getItem(STORAGE_KEY);
  state.residentData = saved ? JSON.parse(saved) : cloneData(RESIDENT_DATA);
}

function saveResidentData(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.residentData));
  renderResidents();
  renderAdminTable();
}

function esc(value){
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  })[c]);
}

function todayISO(){
  return new Date().toISOString().slice(0,10);
}

function formatDate(value){
  if(!value) return "";
  const d = new Date(value + "T00:00:00");
  return d.toLocaleDateString("id-ID", {
    day:"2-digit", month:"long", year:"numeric"
  });
}

function slug(text){
  return String(text || "urutan")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/^-|-$/g,"");
}

function renderResidents(){
  const container = $("residentGroups");
  const query = $("searchInput").value.toLowerCase().trim();
  container.innerHTML = "";

  groupsByTab[state.activeTab].forEach(groupName => {
    const people = (state.residentData[groupName] || []).filter(person =>
      `${groupName} ${person.initial} ${person.name}`.toLowerCase().includes(query)
    );
    if(!people.length) return;

    const section = document.createElement("div");
    section.className = "group";

    const header = document.createElement("div");
    header.className = "group-header";
    header.innerHTML = `<span>Residen ${esc(groupName)}</span>`;
    const addAll = document.createElement("button");
    addAll.className = "add-all";
    addAll.textContent = "Add All";
    addAll.onclick = () => people.forEach(person => addPerson(groupName, person));
    header.appendChild(addAll);

    const list = document.createElement("div");
    list.className = "resident-list";
    people.forEach(person => {
      const button = document.createElement("button");
      button.className = "resident-btn";
      button.title = person.name;
      button.innerHTML = `<span class="badge">${esc(person.initial)}</span>${esc(person.name)}`;
      button.onclick = () => addPerson(groupName, person);
      list.appendChild(button);
    });

    section.append(header, list);
    container.appendChild(section);
  });

  if(!container.children.length){
    container.innerHTML = `<div class="empty-state">Nama tidak ditemukan.</div>`;
  }
}

function addPerson(group, person){
  const duplicate = state.order.some(item =>
    item.group === group && item.name === person.name
  );
  if(duplicate) return;
  state.order.push({
    group,
    initial: person.initial,
    name: person.name,
    role: "",
    rowColor: "light",
    note: ""
  });
  renderOrder();
}

function updateItem(index, field, value){
  if(state.order[index]) state.order[index][field] = value;
}

function removeItem(index){
  state.order.splice(index,1);
  renderOrder();
}

function renderOrder(){
  const body = $("orderBody");
  body.innerHTML = "";

  state.order.forEach((item,index) => {
    const tr = document.createElement("tr");
    tr.dataset.index = index;
    tr.className = `row-color-${item.rowColor || "light"}`;
    tr.innerHTML = `
      <td style="text-align:center">${index+1}</td>
      <td style="text-align:center;font-weight:700">${esc(item.initial)}</td>
      <td>${esc(item.name)}</td>
      <td>
        <select class="cell-input role-input" aria-label="Peran">
          <option value=""></option>
          <option value="Moderator">Moderator</option>
          <option value="Operator">Operator</option>
          <option value="Presenter">Presenter</option>
          <option value="Asisten">Asisten</option>
          <option value="Frozen">Frozen</option>
          <option value="Jaga">Jaga</option>
          <option value="Tindakan">Tindakan</option>
        </select>
      </td>
      <td>
        <div class="row-color-controls" aria-label="Pilihan warna baris">
          <button class="color-choice light-choice" type="button" title="Biru terang" aria-label="Biru terang"></button>
          <button class="color-choice dark-choice" type="button" title="Biru gelap" aria-label="Biru gelap"></button>
          <button class="row-delete-btn" type="button" title="Hapus residen dari daftar" aria-label="Hapus">×</button>
        </div>
      </td>
      <td>
        <input class="cell-input note-input" value="${esc(item.note)}" placeholder="Keterangan">
      </td>
    `;
    tr.querySelector(".role-input").value = item.role || "";
    tr.querySelector(".role-input").onchange = e => updateItem(index,"role",e.target.value);

    const currentColor = item.rowColor || "light";
    tr.querySelector(".light-choice").classList.toggle("selected", currentColor === "light");
    tr.querySelector(".dark-choice").classList.toggle("selected", currentColor === "dark");

    tr.querySelector(".light-choice").onclick = e => {
      e.stopPropagation();
      state.order[index].rowColor = "light";
      renderOrder();
    };
    tr.querySelector(".dark-choice").onclick = e => {
      e.stopPropagation();
      state.order[index].rowColor = "dark";
      renderOrder();
    };
    tr.querySelector(".row-delete-btn").onclick = e => {
      e.stopPropagation();
      removeItem(index);
    };
    tr.querySelector(".note-input").oninput = e => updateItem(index,"note",e.target.value);
    tr.ondblclick = e => {
      if(e.target.matches("input,select,option")) return;
      removeItem(index);
    };
    body.appendChild(tr);
  });

  $("emptyState").style.display = state.order.length ? "none" : "block";
}

function syncHeader(){
  const title = $("titleInput").value || "Urutan";
  $("outputTitle").textContent = title;
  $("exportTitle").textContent = title;
  $("exportDate").textContent = formatDate($("dateInput").value);
}

function saveProject(){
  const payload = {
    app: "urutan-presentasi-operan",
    version: 2,
    mode: state.mode,
    title: $("titleInput").value,
    date: $("dateInput").value,
    order: state.order
  };
  const blob = new Blob([JSON.stringify(payload,null,2)], {type:"application/json"});
  downloadBlob(blob, `${slug(payload.title)}.urutan`);
}

async function loadProject(file){
  try{
    const text = await file.text();
    const payload = JSON.parse(text);
    if(!Array.isArray(payload.order)) throw new Error("Format file tidak sesuai.");
    state.order = payload.order;
    state.mode = payload.mode || "presentasi";
    $("modeSelect").value = state.mode;
    $("titleInput").value = payload.title || "Presentasi Urutan Lapag dan Operan";
    $("dateInput").value = payload.date || todayISO();
    syncHeader();
    renderOrder();
  }catch(err){
    alert("File gagal dimuat: " + err.message);
  }
}

function clearOrder(){
  if(confirm("Hapus seluruh daftar urutan?")){
    state.order = [];
    renderOrder();
  }
}

function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function captureCanvas(){
  const area = $("exportArea");
  area.classList.add("exporting");
  try{
    return await html2canvas(area, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true
    });
  }finally{
    area.classList.remove("exporting");
  }
}

async function exportJPG(){
  if(!state.order.length) return alert("Daftar masih kosong.");
  const canvas = await captureCanvas();
  canvas.toBlob(blob => {
    downloadBlob(blob, `${slug($("titleInput").value)}.jpg`);
  }, "image/jpeg", 0.95);
}

async function exportPDF(){
  if(!state.order.length) return alert("Daftar masih kosong.");
  const canvas = await captureCanvas();
  const img = canvas.toDataURL("image/png");
  const { jsPDF } = window.jspdf;
  const orientation = canvas.width > canvas.height ? "landscape" : "portrait";
  const pdf = new jsPDF({orientation, unit:"mm", format:"a4"});
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const printW = pageW - margin*2;
  const printH = canvas.height * printW / canvas.width;
  let y = margin;
  let remaining = printH;
  pdf.addImage(img, "PNG", margin, y, printW, printH, undefined, "FAST");
  remaining -= (pageH - margin*2);
  while(remaining > 0){
    pdf.addPage();
    y = margin - (printH - remaining);
    pdf.addImage(img, "PNG", margin, y, printW, printH, undefined, "FAST");
    remaining -= (pageH - margin*2);
  }
  pdf.save(`${slug($("titleInput").value)}.pdf`);
}

function exportExcel(){
  if(!state.order.length) return alert("Daftar masih kosong.");
  const rows = state.order.map((item,index) => ({
    No: index+1,
    Inisial: item.initial,
    Nama: item.name,
    Kelompok: item.group,
    Opt: item.role,
    Warna: item.rowColor === "dark" ? "Biru Gelap" : "Biru Terang",
    Keterangan: item.note
  }));
  const ws = XLSX.utils.json_to_sheet(rows, {header:["No","Inisial","Nama","Kelompok","Opt","Warna","Keterangan"]});
  ws["!cols"] = [
    {wch:6},{wch:10},{wch:28},{wch:12},{wch:14},{wch:14},{wch:35}
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, state.mode === "operan" ? "Operan" : "Presentasi");
  XLSX.writeFile(wb, `${slug($("titleInput").value)}.xlsx`);
}

function openModal(id){
  $(id).classList.remove("hidden");
}

function closeModal(id){
  $(id).classList.add("hidden");
}

function isAdminLoggedIn(){
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === "true";
}

function openAdmin(){
  if(isAdminLoggedIn()){
    renderAdminTable();
    openModal("adminModal");
  }else{
    $("adminPasswordInput").value = "";
    $("loginError").textContent = "";
    openModal("loginModal");
  }
}

function loginAdmin(){
  const password = $("adminPasswordInput").value;
  if(password !== DEFAULT_ADMIN_PASSWORD){
    $("loginError").textContent = "Password salah.";
    return;
  }
  sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
  closeModal("loginModal");
  renderAdminTable();
  openModal("adminModal");
}

function renderAdminTable(){
  const body = $("adminResidentBody");
  body.innerHTML = "";
  let no = 1;
  Object.keys(state.residentData).sort().forEach(group => {
    (state.residentData[group] || []).forEach((person,index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${no++}</td>
        <td>${esc(group)}</td>
        <td>${esc(person.initial)}</td>
        <td>${esc(person.name)}</td>
        <td><button class="icon-btn edit-btn">✏️</button></td>
        <td><button class="icon-btn delete-btn">🗑</button></td>
      `;
      tr.querySelector(".edit-btn").onclick = () => openResidentForm(group,index);
      tr.querySelector(".delete-btn").onclick = () => deleteResident(group,index);
      body.appendChild(tr);
    });
  });
}

function openResidentForm(group=null,index=null){
  state.editingResident = group !== null ? {group,index} : null;
  $("residentFormTitle").textContent = state.editingResident ? "Edit Residen" : "Tambah Residen";
  $("residentFormError").textContent = "";
  if(state.editingResident){
    const person = state.residentData[group][index];
    $("residentGroupInput").value = group;
    $("residentInitialInput").value = person.initial;
    $("residentNameInput").value = person.name;
  }else{
    $("residentGroupInput").value = "R1";
    $("residentInitialInput").value = "";
    $("residentNameInput").value = "";
  }
  openModal("residentFormModal");
}

function saveResidentForm(){
  const group = $("residentGroupInput").value;
  const initial = $("residentInitialInput").value.trim().toUpperCase();
  const name = $("residentNameInput").value.trim();
  if(!initial || !name){
    $("residentFormError").textContent = "Inisial dan nama wajib diisi.";
    return;
  }

  if(state.editingResident){
    const old = state.editingResident;
    state.residentData[old.group].splice(old.index,1);
  }
  if(!state.residentData[group]) state.residentData[group] = [];
  state.residentData[group].push({initial,name});
  state.residentData[group].sort((a,b) => a.name.localeCompare(b.name,"id"));
  closeModal("residentFormModal");
  renderAdminTable();
}

function deleteResident(group,index){
  const person = state.residentData[group][index];
  if(confirm(`Hapus ${person.name}?`)){
    state.residentData[group].splice(index,1);
    renderAdminTable();
  }
}

function exportResidentData(){
  const blob = new Blob([JSON.stringify(state.residentData,null,2)], {type:"application/json"});
  downloadBlob(blob, "data-residen.json");
}

async function importResidentData(file){
  try{
    const data = JSON.parse(await file.text());
    for(const group of ["R1","R2","R3","R4","R5","R6","R7"]){
      if(!Array.isArray(data[group])) throw new Error(`Data ${group} tidak valid.`);
    }
    state.residentData = data;
    saveResidentData();
    alert("Data residen berhasil diimpor.");
  }catch(err){
    alert("Import gagal: " + err.message);
  }
}

function resetResidentData(){
  if(confirm("Kembalikan seluruh data ke daftar awal?")){
    state.residentData = cloneData(RESIDENT_DATA);
    saveResidentData();
  }
}

new Sortable($("orderBody"), {
  animation: 150,
  handle: "tr",
  onEnd(event){
    const [moved] = state.order.splice(event.oldIndex,1);
    state.order.splice(event.newIndex,0,moved);
    renderOrder();
  }
});

document.querySelectorAll(".tab").forEach(button => {
  button.onclick = () => {
    document.querySelectorAll(".tab").forEach(tab => tab.classList.remove("active"));
    button.classList.add("active");
    state.activeTab = button.dataset.tab;
    renderResidents();
  };
});

document.querySelectorAll("[data-close]").forEach(button => {
  button.onclick = () => closeModal(button.dataset.close);
});

$("searchInput").oninput = renderResidents;
$("titleInput").oninput = syncHeader;
$("dateInput").onchange = syncHeader;
$("modeSelect").onchange = event => {
  state.mode = event.target.value;
  const defaultTitle = "Presentasi Urutan Lapag dan Operan";
  $("titleInput").value = defaultTitle;
  syncHeader();
};
$("saveFileBtn").onclick = saveProject;
$("loadFileBtn").onclick = () => $("loadFileInput").click();
$("loadFileInput").onchange = event => {
  const file = event.target.files[0];
  if(file) loadProject(file);
  event.target.value = "";
};
$("clearBtn").onclick = clearOrder;
$("jpgBtn").onclick = exportJPG;
$("pdfBtn").onclick = exportPDF;
$("excelBtn").onclick = exportExcel;

$("adminOpenBtn").onclick = openAdmin;
$("loginBtn").onclick = loginAdmin;
$("adminPasswordInput").onkeydown = e => {
  if(e.key === "Enter") loginAdmin();
};
$("addResidentBtn").onclick = () => openResidentForm();
$("residentFormSaveBtn").onclick = saveResidentForm;
$("saveResidentBtn").onclick = () => {
  saveResidentData();
  closeModal("adminModal");
  alert("Data residen tersimpan di browser ini.");
};
$("exportResidentBtn").onclick = exportResidentData;
$("importResidentBtn").onclick = () => $("importResidentInput").click();
$("importResidentInput").onchange = e => {
  const file = e.target.files[0];
  if(file) importResidentData(file);
  e.target.value = "";
};
$("resetResidentBtn").onclick = resetResidentData;

loadResidentData();
$("dateInput").value = todayISO();
syncHeader();
renderResidents();
renderOrder();
