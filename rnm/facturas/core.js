const STORAGE = "rnm_facturas_v1";
const LOGO_SRC = window.LOGO_B64 ? ("data:image/jpeg;base64," + window.LOGO_B64) : "";

const DEFAULTS = {
  emNombre: "RADIO NUEVA MODA",
  emPersona: "Juan Carlos Torres Bahamon",
  emNif: "78848822S",
  emTel: "625 36 17 79",
  emDir: "Centro Comercial Buganvillas",
  emEmail: "pachanquita01@gmail.com",
  emWeb: "www.radionuevamoda.com",
  emIban: "ES61 0182 0779 6502 0163 9932",
  emBanco: "BBVA",
  nextNum: 8,
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return { settings: { ...DEFAULTS }, invoices: [] };
    const data = JSON.parse(raw);
    return {
      settings: { ...DEFAULTS, ...(data.settings || {}) },
      invoices: data.invoices || [],
    };
  } catch {
    return { settings: { ...DEFAULTS }, invoices: [] };
  }
}

function saveState() {
  localStorage.setItem(STORAGE, JSON.stringify({ settings: getSettingsFromForm(), invoices: state.invoices }));
}

let state = loadState();

function $(id) { return document.getElementById(id); }

function euro(n) {
  return (Number(n) || 0).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function parseMoney(v) {
  if (typeof v === "number") return v;
  return Number(String(v).replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")) || 0;
}

function todayISO() {
  const d = new Date();
  const z = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

function fmtDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.style.display = "block";
  setTimeout(() => { el.style.display = "none"; }, 2400);
}

function fillSettings() {
  const s = state.settings;
  $("emNombre").value = s.emNombre || "";
  $("emPersona").value = s.emPersona || "";
  $("emNif").value = s.emNif || "";
  $("emTel").value = s.emTel || "";
  $("emDir").value = s.emDir || "";
  $("emEmail").value = s.emEmail || "";
  $("emWeb").value = s.emWeb || "";
  $("emIban").value = s.emIban || "";
  $("emBanco").value = s.emBanco || "";
  $("nextNum").value = s.nextNum || 8;
  $("nextLabel").textContent = "n.º " + (s.nextNum || 8);
}

function getSettingsFromForm() {
  return {
    emNombre: $("emNombre").value.trim(),
    emPersona: $("emPersona").value.trim(),
    emNif: $("emNif").value.trim(),
    emTel: $("emTel").value.trim(),
    emDir: $("emDir").value.trim(),
    emEmail: $("emEmail").value.trim(),
    emWeb: $("emWeb").value.trim(),
    emIban: $("emIban").value.trim(),
    emBanco: $("emBanco").value.trim(),
    nextNum: Math.max(1, parseInt($("nextNum").value, 10) || 1),
  };
}

function addItem(desc = "Publicidad radiofónica", amount = "") {
  const tr = document.createElement("tr");
  tr.className = "item-row";
  tr.innerHTML = `
    <td><input class="desc" placeholder="Descripción del servicio" value="${desc.replace(/"/g, "&quot;")}" /></td>
    <td><input class="imp" type="text" inputmode="decimal" placeholder="0,00" value="${amount}" /></td>
    <td><button type="button" class="btn-danger" style="padding:8px 10px">✕</button></td>
  `;
  tr.querySelector(".btn-danger").onclick = () => {
    if (document.querySelectorAll(".item-row").length === 1) return;
    tr.remove();
    recalc();
  };
  tr.querySelector(".imp").addEventListener("input", recalc);
  $("itemsBody").appendChild(tr);
}

function getItems() {
  return [...document.querySelectorAll(".item-row")].map((tr) => ({
    desc: tr.querySelector(".desc").value.trim(),
    amount: parseMoney(tr.querySelector(".imp").value),
  })).filter((x) => x.desc || x.amount);
}

function recalc() {
  const items = getItems();
  const sub = items.reduce((a, b) => a + b.amount, 0);
  const exento = $("exento").value === "si";
  const pct = exento ? 0 : parseMoney($("igic").value);
  const igic = sub * (pct / 100);
  const total = sub + igic;
  $("subtotalTxt").textContent = euro(sub);
  $("igicLabel").textContent = exento ? "IGIC (0% exento)" : `IGIC (${pct}%)`;
  $("igicTxt").textContent = euro(igic);
  $("totalTxt").textContent = euro(total);
  return { sub, pct, igic, total, exento };
}

function collectInvoice(consumeNumber) {
  const settings = getSettingsFromForm();
  const totals = recalc();
  if (consumeNumber) {
    const last = state.invoices[0];
    const recent = last && (Date.now() - new Date(last.createdAt).getTime() < 3 * 60 * 1000);
    const same =
      recent &&
      last.cliNombre === $("cliNombre").value.trim() &&
      last.fecha === ($("fecha").value || todayISO()) &&
      Math.abs((last.total || 0) - (totals.total || 0)) < 0.001;
    if (same) return last;
  }
  const num = settings.nextNum;
  const inv = {
    number: num,
    fecha: $("fecha").value || todayISO(),
    periodoDesde: $("periodoDesde").value,
    periodoHasta: $("periodoHasta").value,
    cliNombre: $("cliNombre").value.trim(),
    cliCif: $("cliCif").value.trim(),
    cliCp: $("cliCp").value.trim(),
    cliDir: $("cliDir").value.trim(),
    cliEmail: $("cliEmail").value.trim(),
    cliTel: $("cliTel").value.trim(),
    items: getItems(),
    mensaje: $("mensaje").value.trim(),
    ...totals,
    settings,
    createdAt: new Date().toISOString(),
  };
  if (consumeNumber) {
    const exists = state.invoices.some((x) => x.number === num);
    if (!exists) {
      state.invoices.unshift(inv);
      settings.nextNum = num + 1;
      $("nextNum").value = settings.nextNum;
      $("nextLabel").textContent = "n.º " + settings.nextNum;
      state.settings = settings;
      saveState();
      renderHistory();
      renderClients();
    }
  }
  return inv;
}

function loadInvoice(inv) {
  $("fecha").value = inv.fecha || "";
  $("periodoDesde").value = inv.periodoDesde || "";
  $("periodoHasta").value = inv.periodoHasta || "";
  $("cliNombre").value = inv.cliNombre || "";
  $("cliCif").value = inv.cliCif || "";
  $("cliCp").value = inv.cliCp || "";
  $("cliDir").value = inv.cliDir || "";
  $("cliEmail").value = inv.cliEmail || "";
  $("cliTel").value = inv.cliTel || "";
  $("mensaje").value = inv.mensaje || $("mensaje").value;
  $("exento").value = inv.exento ? "si" : "no";
  $("igic").value = inv.pct || 0;
  $("itemsBody").innerHTML = "";
  (inv.items && inv.items.length ? inv.items : [{ desc: "Publicidad radiofónica", amount: 0 }]).forEach((it) => {
    addItem(it.desc, it.amount ? String(it.amount).replace(".", ",") : "");
  });
  recalc();
}

function renderHistory() {
  const box = $("historial");
  if (!state.invoices.length) {
    box.innerHTML = "<p class='hint'>Aún no hay facturas en este navegador.</p>";
    return;
  }
  box.innerHTML = state.invoices.map((inv) => `
    <div class="hist-item" data-n="${inv.number}">
      <b>N.º ${inv.number}</b>
      <div>
        ${inv.cliNombre || "Sin cliente"}
        <small>${fmtDate(inv.fecha)} · ${euro(inv.total)}</small>
      </div>
      <button class="btn-ghost" type="button" data-pdf="${inv.number}">PDF</button>
    </div>
  `).join("");
  box.querySelectorAll(".hist-item").forEach((el) => {
    el.addEventListener("click", (ev) => {
      if (ev.target.dataset.pdf) {
        const inv = state.invoices.find((x) => String(x.number) === ev.target.dataset.pdf);
        if (inv) generatePdf(inv);
        return;
      }
      const inv = state.invoices.find((x) => String(x.number) === el.dataset.n);
      if (inv) loadInvoice(inv);
    });
  });
}

function renderClients() {
  const names = [...new Set(state.invoices.map((x) => x.cliNombre).filter(Boolean))];
  $("clientesPrevios").innerHTML = names.map((n) => `<option value="${n}"></option>`).join("");
}

function cleanPhone(raw) {
  let p = String(raw || "").replace(/[^\d+]/g, "");
  if (p.startsWith("00")) p = "+" + p.slice(2);
  if (/^[67]\d{8}$/.test(p)) p = "34" + p;
  return p.replace(/^\+/, "");
}

function messageText(inv) {
  const periodo = inv.periodoDesde && inv.periodoHasta
    ? ` del ${fmtDate(inv.periodoDesde)} al ${fmtDate(inv.periodoHasta)}`
    : "";
  return `${inv.mensaje || "Hola, le enviamos su factura."}

Factura n.º ${inv.number} · ${fmtDate(inv.fecha)}
${inv.settings.emNombre}
Total: ${euro(inv.total)}${periodo}

IBAN ${inv.settings.emIban}
${inv.settings.emBanco || ""}`.trim();
}

function boot() {
  if (LOGO_SRC) $("logoImg").src = LOGO_SRC;
  fillSettings();
  $("fecha").value = todayISO();
  const d = new Date();
  const from = todayISO();
  const toDate = new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const z = (n) => String(n).padStart(2, "0");
  $("periodoDesde").value = from;
  $("periodoHasta").value = `${toDate.getFullYear()}-${z(toDate.getMonth() + 1)}-${z(toDate.getDate())}`;
  addItem("Publicidad radiofónica", "");
  $("addItem").onclick = () => addItem("", "");
  $("igic").oninput = recalc;
  $("exento").onchange = recalc;
  $("saveSettings").onclick = () => {
    state.settings = getSettingsFromForm();
    $("nextLabel").textContent = "n.º " + state.settings.nextNum;
    saveState();
    toast("Datos de la emisora guardados");
  };
  $("nextNum").oninput = () => {
    $("nextLabel").textContent = "n.º " + (parseInt($("nextNum").value, 10) || 1);
  };
  $("btnPdf").onclick = () => {
    if (!$("cliNombre").value.trim()) { toast("Escribe el nombre del cliente"); return; }
    const inv = collectInvoice(true);
    generatePdf(inv);
  };
  $("btnWa").onclick = () => {
    if (!$("cliNombre").value.trim()) { toast("Escribe el nombre del cliente"); return; }
    const inv = collectInvoice(true);
    generatePdf(inv);
    const phone = cleanPhone(inv.cliTel);
    if (!phone) { toast("Falta el teléfono del cliente"); return; }
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(messageText(inv) + "\n\nAdjunto el PDF descargado.")}`;
    window.open(url, "_blank");
  };
  $("btnMail").onclick = () => {
    if (!$("cliNombre").value.trim()) { toast("Escribe el nombre del cliente"); return; }
    const inv = collectInvoice(true);
    generatePdf(inv);
    const email = inv.cliEmail;
    if (!email) { toast("Falta el email del cliente"); return; }
    const subject = `Factura ${inv.number} · ${inv.settings.emNombre}`;
    const url = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(messageText(inv) + "\n\nAdjunte el PDF descargado a este correo.")}`;
    window.location.href = url;
  };
  $("exportJson").onclick = () => {
    const blob = new Blob([JSON.stringify({ settings: getSettingsFromForm(), invoices: state.invoices }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "facturas-radio-nueva-moda.json";
    a.click();
  };
  $("importJson").onclick = () => $("importFile").click();
  $("importFile").onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        state = {
          settings: { ...DEFAULTS, ...(data.settings || {}) },
          invoices: data.invoices || [],
        };
        fillSettings();
        saveState();
        renderHistory();
        renderClients();
        toast("Copia importada");
      } catch {
        toast("Archivo no válido");
      }
    };
    reader.readAsText(file);
  };
  renderHistory();
  renderClients();
  recalc();
}

document.addEventListener("DOMContentLoaded", boot);
