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

