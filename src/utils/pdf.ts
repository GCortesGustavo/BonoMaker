import { jsPDF } from "jspdf";
import type {
  DatosFormulario,
  LineaLiquidacion,
  ResultadoLiquidacion,
  Convenio,
} from "../types/bono";
import { NOMBRE_GRUPO } from "./calculadora";
import {
  formatearFecha,
  formatearFechaLarga,
  formatearNumero,
  formatearPeriodo,
} from "./formato";
import { montoALetras } from "./numeroALetras";

/* ------------------------------------------------------------------ */
/*  Recibo de haberes en PDF vectorial (A4 vertical), replicando la    */
/*  planilla "Bono_..._.xlsx". No depende del DOM: sirve para vista    */
/*  previa, descarga individual y generación en lote.                  */
/* ------------------------------------------------------------------ */

const COL_W = [6.6, 29.2, 18.2, 14.6, 27.1, 26.4, 18.4, 23.1, 26.4]; // A..I (mm) = 190 mm
const X0 = 10;
const Y0 = 10;
const ANCHO = COL_W.reduce((a, b) => a + b, 0);
const ALTO_DISPONIBLE = 297 - 2 * Y0;

const AZUL_OSCURO = "#1F3864";
const AZUL = "#2E5090";
const GRIS_OSCURO = "#595959";
const CELESTE = "#D6E4F0";
const GRIS_CLARO = "#F2F2F2";
const AZUL_INPUT = "#0070C0";
const PALETA = [
  "#4F81BD",
  "#C0504D",
  "#9BBB59",
  "#8064A2",
  "#4BACC6",
  "#F79646",
  "#7F7F7F",
];

const colX = (i: number) => X0 + COL_W.slice(0, i).reduce((a, b) => a + b, 0);
const span = (a: number, b: number) => ({
  x: colX(a),
  w: COL_W.slice(a, b + 1).reduce((s, v) => s + v, 0),
});

const rgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

interface OpcionesTexto {
  size?: number;
  bold?: boolean;
  italic?: boolean;
  color?: string;
  align?: "left" | "center" | "right";
}

interface OpcionesCelda extends OpcionesTexto {
  fill?: string;
  borde?: string | null;
  pad?: number;
}

const PT_A_MM = 0.3528;

const dibujarRecibo = (
  doc: jsPDF,
  datos: DatosFormulario,
  liq: ResultadoLiquidacion,
  convenio: Convenio | undefined,
  k: number,
): number => {
  let y = Y0;

  /* ---------- primitivas ---------- */
  const fuente = (o: OpcionesTexto) => {
    const estilo =
      o.bold && o.italic
        ? "bolditalic"
        : o.bold
          ? "bold"
          : o.italic
            ? "italic"
            : "normal";
    doc.setFont("helvetica", estilo);
    doc.setFontSize((o.size ?? 7) * k);
    doc.setTextColor(...rgb(o.color ?? "#000000"));
  };

  /** Escribe texto en una caja, reduciendo la letra si no entra. */
  const texto = (
    t: string,
    x: number,
    w: number,
    yy: number,
    h: number,
    o: OpcionesTexto & { pad?: number } = {},
  ) => {
    if (!t) return;
    const pad = o.pad ?? 1;
    fuente(o);
    let size = (o.size ?? 7) * k;
    while (size > 4 && doc.getTextWidth(t) > w - 2 * pad) {
      size -= 0.25;
      doc.setFontSize(size);
    }
    const base = yy + h / 2 + size * PT_A_MM * 0.35;
    const align = o.align ?? "left";
    const tx =
      align === "left" ? x + pad : align === "right" ? x + w - pad : x + w / 2;
    doc.text(t, tx, base, { align });
  };

  const celda = (
    a: number,
    b: number,
    h: number,
    t: string,
    o: OpcionesCelda = {},
  ) => {
    const { x, w } = span(a, b);
    if (o.fill) {
      doc.setFillColor(...rgb(o.fill));
      doc.rect(x, y, w, h, "F");
    }
    if (o.borde !== null && o.borde !== undefined) {
      doc.setDrawColor(...rgb(o.borde));
      doc.setLineWidth(0.12);
      doc.rect(x, y, w, h);
    }
    texto(t, x, w, y, h, o);
  };

  /** Importe estilo contable de Excel: "$" a la izquierda y el número a la derecha. */
  const importe = (
    a: number,
    b: number,
    h: number,
    valor: number,
    o: OpcionesCelda = {},
  ) => {
    celda(a, b, h, "", o);
    const { x, w } = span(a, b);
    texto("$", x, w, y, h, { ...o, align: "left" });
    texto(formatearNumero(valor), x, w, y, h, { ...o, align: "right" });
  };

  const linea = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color = "#808080",
    grosor = 0.1,
  ) => {
    doc.setDrawColor(...rgb(color));
    doc.setLineWidth(grosor);
    doc.line(x1, y1, x2, y2);
  };

  const h = (mm: number) => mm * k;

  /* ---------- recuadro de encabezado ---------- */
  const yInicio = y;
  celda(0, 8, h(4.8), "Recibo de Haberes Ley 20.744", {
    bold: true,
    size: 9,
    align: "center",
    borde: "#000000",
  });
  y += h(4.8);
  const filaEmpresa = (t: string) => {
    celda(0, 8, h(4.2), t, { bold: true, size: 7.5, borde: null });
    y += h(4.2);
  };
  filaEmpresa(datos.empresa);
  filaEmpresa(datos.domicilio);
  filaEmpresa(`C.U.I.T: ${datos.cuit}`);
  y += h(1.8);

  /* ---------- datos del empleado ---------- */
  const hFila = h(4.6);
  const cab = (a: number, b: number, t: string) =>
    celda(a, b, hFila, t, {
      fill: AZUL_OSCURO,
      color: "#FFFFFF",
      bold: true,
      size: 7.5,
      align: "center",
      borde: "#FFFFFF",
    });
  const val = (a: number, b: number, t: string, o: OpcionesCelda = {}) =>
    celda(a, b, hFila, t, {
      align: "center",
      size: 7.5,
      borde: "#A6A6A6",
      ...o,
    });

  cab(0, 0, "Q.");
  cab(1, 2, "MES / AÑO");
  cab(3, 5, "APELLIDO Y NOMBRE");
  cab(6, 6, "N°LEGAJO");
  cab(7, 7, "SUELDO BRUTO");
  cab(8, 8, "ANTIGÜEDAD");
  y += hFila;
  val(0, 0, datos.q);
  val(1, 1, datos.mes);
  val(2, 2, datos.anio);
  val(3, 5, datos.empleado);
  val(6, 6, datos.legajo);
  importe(7, 7, hFila, liq.totalRemunerativo, { size: 7.5, borde: "#A6A6A6" });
  val(8, 8, datos.antiguedad);
  y += hFila;

  cab(0, 1, "FECHA INGRESO");
  cab(2, 4, "CATEGORÍA LABORAL");
  cab(5, 5, "C.U.I.L.");
  cab(6, 6, "Banco");
  cab(7, 7, "Período");
  cab(8, 8, "F.PAGO APORTES");
  y += hFila;
  val(0, 1, formatearFecha(datos.fechaIngreso));
  val(2, 4, datos.categoria);
  val(5, 5, datos.cuil);
  val(6, 6, datos.banco);
  val(7, 7, formatearPeriodo(datos.mes, datos.anio));
  val(8, 8, formatearFecha(datos.fechaPagoAportes));
  y += hFila;

  /* ---------- costo total empleador ---------- */
  const hSec = h(4.8);
  celda(0, 7, hSec, "COSTO TOTAL EMPLEADOR", {
    fill: AZUL,
    color: "#FFFFFF",
    bold: true,
    size: 8,
    align: "center",
    borde: "#FFFFFF",
  });
  celda(8, 8, hSec, formatearNumero(liq.costoTotalEmpleador), {
    fill: AZUL,
    color: "#FFFFFF",
    bold: true,
    size: 8,
    align: "right",
    borde: "#FFFFFF",
  });
  y += hSec;

  const encabezadoColumnas = () => {
    const o: OpcionesCelda = {
      fill: GRIS_OSCURO,
      color: "#FFFFFF",
      bold: true,
      size: 7.5,
      align: "center",
      borde: "#FFFFFF",
    };
    celda(0, 4, hSec, "CONCEPTO", o);
    celda(5, 5, hSec, "UNIDAD", o);
    celda(6, 7, hSec, "BASE", o);
    celda(8, 8, hSec, "MONTO", o);
    y += hSec;
  };

  /** Fila de concepto: UNIDAD | BASE (sombreada) | MONTO, con separadores verticales. */
  const hItem = h(4.1);
  const filaConcepto = (
    l: LineaLiquidacion,
    opciones: { negativo?: boolean } = {},
  ) => {
    const nombre = l.codigo ? `${l.codigo}  ${l.nombre}` : l.nombre;
    const { x: xb, w: wb } = span(6, 7);
    doc.setFillColor(...rgb(GRIS_CLARO));
    doc.rect(xb, y, wb, hItem, "F");
    texto(nombre, colX(0), span(0, 4).w, y, hItem, { size: 7, pad: 1 });
    texto(l.unidad, colX(5), COL_W[5], y, hItem, {
      size: 7,
      align: "center",
      color: l.unidad.endsWith("%") ? "#000000" : AZUL_INPUT,
    });
    const base = l.base ?? l.monto;
    texto(formatearNumero(base), xb, wb, y, hItem, {
      size: 7,
      align: "center",
      color: AZUL_INPUT,
    });
    texto(
      formatearNumero(opciones.negativo ? -l.monto : l.monto),
      colX(8),
      COL_W[8],
      y,
      hItem,
      { size: 7, align: "right" },
    );
    [5, 6, 8].forEach((i) => linea(colX(i), y, colX(i), y + hItem, "#BFBFBF"));
    y += hItem;
  };

  if (liq.aportes.length > 0) {
    encabezadoColumnas();
    liq.aportes.forEach((l) => filaConcepto(l));
    celda(0, 7, hSec, "SUB TOTAL CONTRIBUCIONES EMPLEADOR", {
      fill: CELESTE,
      bold: true,
      size: 7.5,
      align: "center",
      borde: "#7F7F7F",
    });
    celda(8, 8, hSec, formatearNumero(liq.totalAportes), {
      fill: CELESTE,
      bold: true,
      size: 7.5,
      align: "right",
      borde: "#7F7F7F",
    });
    y += hSec;
  }

  /* ---------- sueldo bruto y conceptos ---------- */
  celda(0, 7, hSec, "SUELDO BRUTO", {
    fill: AZUL,
    color: "#FFFFFF",
    bold: true,
    size: 8,
    align: "center",
    borde: "#FFFFFF",
  });
  celda(8, 8, hSec, formatearNumero(liq.bruto), {
    fill: AZUL,
    color: "#FFFFFF",
    bold: true,
    size: 8,
    align: "right",
    borde: "#FFFFFF",
  });
  y += hSec;
  encabezadoColumnas();

  const seccion = (
    titulo: string,
    lineas: LineaLiquidacion[],
    negativo = false,
  ) => {
    if (lineas.length === 0) return;
    celda(0, 8, hItem, titulo, {
      fill: GRIS_CLARO,
      size: 7,
      align: "center",
      borde: null,
    });
    y += hItem;
    lineas.forEach((l) => filaConcepto(l, { negativo }));
  };
  seccion("REMUNERATIVO", liq.remunerativos);
  seccion("NO REMUNERATIVO", liq.noRemunerativos);
  seccion("DESCUENTOS", liq.descuentos);
  y += h(1.2);

  /* ---------- composición salarial y neto ---------- */
  const hComp = h(5.4);
  const bordeComp = "#000000";
  const etiqueta = (a: number, b: number, t: string, bold = false) =>
    celda(a, b, hComp, t, {
      bold,
      size: 7,
      align: bold ? "left" : "center",
      borde: bordeComp,
    });
  etiqueta(0, 1, "COMPOSICION SALARIAL:", true);
  etiqueta(2, 3, "Remunerativo:");
  importe(4, 4, hComp, liq.totalRemunerativo, { size: 7, borde: bordeComp });
  etiqueta(5, 5, "No Remunerativo:");
  importe(6, 6, hComp, liq.totalNoRemunerativo, { size: 7, borde: bordeComp });
  etiqueta(7, 7, "Descuentos:");
  importe(8, 8, hComp, liq.totalDescuentos, { size: 7, borde: bordeComp });
  y += hComp;

  celda(0, 7, hSec, "SUELDO NETO $", {
    fill: AZUL_OSCURO,
    color: "#FFFFFF",
    bold: true,
    size: 8,
    align: "center",
    borde: "#FFFFFF",
  });
  importe(8, 8, hSec, liq.neto, {
    fill: AZUL_OSCURO,
    color: "#FFFFFF",
    bold: true,
    size: 8,
    borde: "#FFFFFF",
  });
  y += hSec;

  /* ---------- recibí / firma ---------- */
  y += h(1.5);
  celda(0, 8, h(6), `Recibí la suma de: ${montoALetras(liq.neto)}`, {
    size: 8.5,
    align: "center",
    borde: null,
  });
  y += h(7);
  celda(0, 4, h(4.6), `Depositado en: ${datos.banco}`, {
    size: 8,
    borde: null,
    pad: 1,
  });
  y += h(4.6);
  const yFirma = y;
  celda(
    0,
    5,
    h(4.6),
    `${datos.lugar}, ${formatearFechaLarga(datos.fechaEmision)}.`,
    { size: 8, italic: true, borde: null, pad: 1 },
  );
  // Línea de firma punteada y rótulo
  const sx = colX(6) + 3;
  const sw = span(6, 8).w - 6;
  doc.setLineDashPattern([0.4, 0.7], 0);
  linea(
    sx,
    yFirma + h(4.6) * 0.55,
    sx + sw,
    yFirma + h(4.6) * 0.55,
    "#000000",
    0.2,
  );
  doc.setLineDashPattern([], 0);
  y += h(4.6);
  texto("Firma del Empleado", colX(6), span(6, 8).w, y, h(4.6), {
    size: 8,
    bold: true,
    align: "center",
  });
  y += h(5.6);

  /* ---------- detalle de la composición salarial + gráfico ---------- */
  celda(0, 4, hSec, "Detalle de la composición salarial", {
    fill: CELESTE,
    bold: true,
    size: 7.5,
    align: "center",
    borde: "#7F7F7F",
  });
  celda(5, 8, hSec, "Costo total empleador", {
    fill: CELESTE,
    bold: true,
    size: 7.5,
    align: "center",
    borde: "#7F7F7F",
  });
  y += hSec;

  const filaDet = h(3.7);
  const mitad = Math.ceil(liq.grupos.length / 2);
  const columnas = [liq.grupos.slice(0, mitad), liq.grupos.slice(mitad)];
  const filasDe = (g: (typeof liq.grupos)[number]) =>
    1 + (g.empleador !== 0 ? 1 : 0) + (g.trabajador !== 0 ? 1 : 0) + 1;
  const filasMax = Math.max(
    0,
    ...columnas.map((c) => c.reduce((s, g) => s + filasDe(g), 0)),
  );
  const altoDetalle = Math.max(filasMax * filaDet, h(44));
  const yDetalle = y;

  columnas.forEach((grupos, idx) => {
    const xEtq = idx === 0 ? colX(0) : colX(4);
    const anchoEtq = idx === 0 ? span(0, 3).w : span(4, 5).w;
    const xMonto = idx === 0 ? colX(4) : colX(6);
    let yy = yDetalle + h(1);
    grupos.forEach((g) => {
      const fila = (t: string, v: number, negrita: boolean) => {
        texto(t, xEtq, anchoEtq, yy, filaDet, { size: 7, bold: negrita });
        texto(formatearNumero(v), xEtq, xMonto - xEtq - 1, yy, filaDet, {
          size: 7,
          bold: negrita,
          align: "right",
        });
        yy += filaDet;
      };
      fila(`Total ${NOMBRE_GRUPO[g.grupo]}:`, g.total, true);
      if (g.empleador !== 0) fila("Empleador", g.empleador, false);
      if (g.trabajador !== 0) fila("Trabajador", g.trabajador, false);
      yy += filaDet;
    });
  });

  // Gráfico de torta (vectorial)
  const partes = [
    { nombre: "Sueldo Neto", valor: liq.neto },
    ...liq.grupos.map((g) => ({
      nombre: NOMBRE_GRUPO[g.grupo],
      valor: g.total,
    })),
  ].filter((p) => p.valor > 0);
  const total = partes.reduce((s, p) => s + p.valor, 0);
  const { x: xp, w: wp } = span(6, 8);

  // Leyenda (con salto de línea)
  fuente({ size: 6.5 });
  let lx = xp + 2;
  let ly = yDetalle + h(2.2);
  const hLeyenda = h(3.3);
  partes.forEach((p, i) => {
    const ancho = doc.getTextWidth(p.nombre) + 6;
    if (lx + ancho > xp + wp - 1 && lx > xp + 2) {
      lx = xp + 2;
      ly += hLeyenda;
    }
    doc.setFillColor(...rgb(PALETA[i % PALETA.length]));
    doc.rect(lx, ly - 1.1, 1.8, 1.8, "F");
    fuente({ size: 6.5, color: "#404040" });
    doc.text(p.nombre, lx + 2.6, ly + 0.35);
    lx += ancho + 1.5;
  });

  const yTortaMin = ly + hLeyenda * 0.9;
  const radio = Math.max(
    8,
    Math.min(wp / 2 - 6, (yDetalle + altoDetalle - yTortaMin - 2) / 2),
  );
  const cx = xp + wp / 2;
  const cy = yTortaMin + radio + 1;
  if (total > 0) {
    if (partes.length === 1) {
      doc.setFillColor(...rgb(PALETA[0]));
      doc.circle(cx, cy, radio, "F");
    } else {
      let ang = -Math.PI / 2;
      partes.forEach((p, i) => {
        const fin = ang + (p.valor / total) * 2 * Math.PI;
        const pasos = Math.max(2, Math.ceil((fin - ang) / (Math.PI / 90)));
        const pts: [number, number][] = [[cx, cy]];
        for (let s = 0; s <= pasos; s++) {
          const a = ang + ((fin - ang) * s) / pasos;
          pts.push([cx + radio * Math.cos(a), cy + radio * Math.sin(a)]);
        }
        const rel = pts
          .slice(1)
          .map((pt, j) => [pt[0] - pts[j][0], pt[1] - pts[j][1]]);
        doc.setFillColor(...rgb(PALETA[i % PALETA.length]));
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.25);
        doc.lines(rel, cx, cy, [1, 1], "FD", true);
        ang = fin;
      });
    }
  }
  y = yDetalle + altoDetalle;

  /* ---------- nota ---------- */
  if (convenio?.nota) {
    celda(0, 8, h(4.4), convenio.nota, { size: 6.5, borde: null, pad: 1 });
    y += h(4.4);
  }

  /* ---------- marco exterior ---------- */
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(X0, yInicio, ANCHO, y - yInicio);

  return y - Y0;
};

export const crearPDF = (
  datos: DatosFormulario,
  liq: ResultadoLiquidacion,
  convenio: Convenio | undefined,
): jsPDF => {
  // Primera pasada (en un documento descartable) para medir el alto y ajustar la escala.
  const medidor = new jsPDF({ unit: "mm", format: "a4" });
  const altoNatural = dibujarRecibo(medidor, datos, liq, convenio, 1);
  const k =
    altoNatural > ALTO_DISPONIBLE
      ? Math.max(0.55, ALTO_DISPONIBLE / altoNatural)
      : 1;

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  doc.setProperties({
    title: `Recibo de haberes - ${datos.empleado}`,
    subject: `${datos.mes} ${datos.anio}`,
    author: datos.empresa,
  });
  dibujarRecibo(doc, datos, liq, convenio, k);
  return doc;
};

export const nombreArchivoBono = (datos: DatosFormulario): string => {
  const limpio = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "_");
  return `Bono_${limpio(datos.empleado) || "Empleado"}_${limpio(datos.mes)}_${datos.anio}.pdf`;
};
