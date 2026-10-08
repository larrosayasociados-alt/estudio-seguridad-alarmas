const STORAGE = "rnm_facturas_v1";
const LOGO_SRC = "data:image/jpeg;base64," + window.LOGO_B64;

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

function generatePdf(inv) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, H = 297;
  const navy = [11, 31, 74];
  const gold = [240, 180, 41];
  const goldSoft = [247, 212, 138];
  const ink = [26, 35, 50];
  const muted = [91, 101, 117];
  const soft = [238, 243, 250];
  const line = [216, 222, 232];

  doc.setFillColor(...navy);
  doc.rect(0, 0, W, 38, "F");
  doc.setFillColor(...gold);
  doc.rect(0, 38, W, 1.4, "F");

  try {
    doc.addImage(LOGO_SRC, "JPEG", 16, 8, 22, 22);
  } catch (e) { /* logo opcional */ }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(inv.settings.emNombre || "RADIO NUEVA MODA", 42, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...goldSoft);
  doc.text("100.4 FM  ·  99.5 FM", 42, 22);
  doc.setTextColor(201, 212, 232);
  doc.setFontSize(8);
  doc.text(`${inv.settings.emDir || ""}  ·  NIT ${inv.settings.emNif || ""}`, 42, 27);
  doc.text(`${inv.settings.emWeb || ""}  ·  ${inv.settings.emEmail || ""}`, 42, 32);

  doc.setFillColor(19, 40, 79);
  doc.roundedRect(148, 9, 46, 22, 3, 3, "F");
  doc.setTextColor(...gold);
  doc.setFontSize(8);
  doc.text("FACTURA", 152, 16);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("N.º " + inv.number, 152, 24);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...goldSoft);
  doc.text(fmtDate(inv.fecha), 176, 24);

  const cardY = 46;
  doc.setFillColor(...soft);
  doc.roundedRect(16, cardY, 86, 28, 3, 3, "F");
  doc.roundedRect(108, cardY, 86, 28, 3, 3, "F");
  doc.setFillColor(...gold);
  doc.roundedRect(16, cardY, 18, 2.2, 1, 1, "F");
  doc.roundedRect(108, cardY, 18, 2.2, 1, 1, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...navy);
  doc.text("EMITIDA POR", 20, cardY + 8);
  doc.text("FACTURAR A", 112, cardY + 8);
  doc.setFontSize(11);
  doc.setTextColor(...ink);
  doc.text(inv.settings.emPersona || "", 20, cardY + 14);
  doc.text(inv.cliNombre || "", 112, cardY + 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...muted);
  doc.text(inv.settings.emNombre || "", 20, cardY + 19);
  doc.text(inv.settings.emDir || "", 20, cardY + 23);
  doc.text("Tel. " + (inv.settings.emTel || "—"), 20, cardY + 27);
  doc.text(inv.cliDir || "—", 112, cardY + 19);
  doc.text(`${inv.cliCp || ""}  ·  CIF ${inv.cliCif || "—"}`, 112, cardY + 23);
  doc.text("Tel. " + (inv.cliTel || "—"), 112, cardY + 27);

  doc.setFontSize(8);
  doc.setTextColor(...muted);
  doc.text("PERIODO DE SERVICIO", 16, 82);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...navy);
  const per = (inv.periodoDesde && inv.periodoHasta)
    ? `${fmtDate(inv.periodoDesde)}  —  ${fmtDate(inv.periodoHasta)}`
    : "—";
  doc.text(per, 58, 82);

  const tableTop = 88;
  doc.setFillColor(...navy);
  doc.roundedRect(16, tableTop, 178, 9, 2, 2, "F");
  doc.rect(16, tableTop + 6, 178, 3, "F");
  doc.setTextColor(...gold);
  doc.setFontSize(8);
  doc.text("FECHA", 20, tableTop + 6);
  doc.text("DESCRIPCIÓN", 48, tableTop + 6);
  doc.text("IMPORTE", 176, tableTop + 6, { align: "right" });

  const rows = (inv.items && inv.items.length) ? inv.items : [{ desc: "", amount: 0 }];
  const empty = Math.max(0, 5 - rows.length);
  const rowH = 10;
  const bodyH = (rows.length + empty) * rowH;
  doc.setFillColor(250, 251, 254);
  doc.rect(16, tableTop + 9, 178, bodyH, "F");

  let y = tableTop + 9;
  rows.forEach((it, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(246, 248, 252);
      doc.rect(16, y, 178, rowH, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...ink);
    doc.text(fmtDate(inv.fecha), 20, y + 6.4);
    doc.text(it.desc || "", 48, y + 6.4, { maxWidth: 110 });
    doc.setFont("helvetica", "bold");
    doc.text(euro(it.amount), 190, y + 6.4, { align: "right" });
    y += rowH;
    doc.setDrawColor(...line);
    doc.setLineWidth(0.2);
    doc.line(16, y, 194, y);
  });
  for (let i = 0; i < empty; i++) {
    if ((rows.length + i) % 2 === 0) {
      doc.setFillColor(246, 248, 252);
      doc.rect(16, y, 178, rowH, "F");
    }
    y += rowH;
    doc.setDrawColor(...line);
    doc.line(16, y, 194, y);
  }
  doc.setDrawColor(...line);
  doc.setLineWidth(0.4);
  doc.rect(16, tableTop, 178, 9 + bodyH);

  const totY = y + 6;
  doc.setFillColor(...navy);
  doc.roundedRect(16, totY, 92, 32, 3, 3, "F");
  doc.setTextColor(...gold);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("DATOS DE PAGO", 21, totY + 8);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text(inv.settings.emBanco || "BBVA", 21, totY + 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...goldSoft);
  doc.text("Transferencia bancaria", 42, totY + 15);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(inv.settings.emIban || "", 21, totY + 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(201, 212, 232);
  doc.text(`Concepto: Factura ${inv.number}  ·  ${inv.cliNombre || ""}`, 21, totY + 28);

  doc.setFillColor(...soft);
  doc.roundedRect(114, totY, 80, 32, 3, 3, "F");
  doc.setFontSize(9);
  doc.setTextColor(...muted);
  doc.text("Subtotal", 119, totY + 8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...ink);
  doc.text(euro(inv.sub), 188, totY + 8, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...muted);
  doc.text(inv.exento ? "IGIC repercutido (0 % exento)" : `IGIC (${inv.pct}%)`, 119, totY + 16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...ink);
  doc.text(euro(inv.igic), 188, totY + 16, { align: "right" });
  doc.setFillColor(...navy);
  doc.roundedRect(117, totY + 20, 74, 9, 2, 2, "F");
  doc.setTextColor(...gold);
  doc.setFontSize(9);
  doc.text("TOTAL", 121, totY + 26);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text(euro(inv.total), 186, totY + 26.2, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...navy);
  doc.text("NOTAS", 16, totY + 42);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...muted);
  const note = inv.exento
    ? "Operación exenta de IGIC. Importe correspondiente al servicio de publicidad radiofónica contratado."
    : "Importe correspondiente al servicio de publicidad radiofónica contratado.";
  doc.text(note, 16, totY + 47);
  doc.text("Documento emitido por Radio Nueva Moda. Conserve esta factura para su contabilidad.", 16, totY + 52);

  doc.setFillColor(...gold);
  doc.rect(0, H - 17.2, W, 1.2, "F");
  doc.setFillColor(...navy);
  doc.rect(0, H - 16, W, 16, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("¡Gracias por utilizar nuestros servicios!", W / 2, H - 8.5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...goldSoft);
  doc.text(`${inv.settings.emNombre}  ·  100.4 y 99.5 FM  ·  ${inv.settings.emTel}  ·  ${inv.settings.emEmail}`, W / 2, H - 4, { align: "center" });

  const name = `Factura_${inv.number}_${(inv.cliNombre || "cliente").replace(/\s+/g, "_")}.pdf`;
  doc.save(name);
  toast("PDF descargado: " + name);
  return name;
}

function boot() {
  $("logoImg").src = LOGO_SRC;
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
