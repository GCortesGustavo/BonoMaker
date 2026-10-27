import JSZip from "jszip";
import type { Convenio, DatosFormulario, ResultadoLiquidacion } from "../types/bono";
import { calcularLiquidacion } from "./calculadora";
import { crearPDFMultiple, nombreArchivoBono } from "./pdf";

/** Una persona del lote. Los campos vacíos usan el valor del formulario. */
export interface FilaLote {
  nombre: string;
  legajo: string;
  cuil: string;
  categoria: string;
  fechaIngreso: string; // ISO o ""
  unidades?: number;
  valorBasico?: number;
}

export interface ReciboLote {
  fila: FilaLote;
  datos: DatosFormulario;
  liq: ResultadoLiquidacion;
}

/** "5.502,50" -> 5502.5 ; "645000" -> 645000 ; "" -> undefined */
const parseNumero = (t: string): number | undefined => {
  const limpio = t.trim().replace(/[$\s]/g, "");
  if (!limpio) return undefined;
  const normal = limpio.includes(",") ? limpio.replace(/\./g, "").replace(",", ".") : limpio;
  const n = Number(normal);
  return Number.isFinite(n) ? n : NaN;
};

/** "16/06/2026" -> "2026-06-16" */
const parseFecha = (t: string): string => {
  const m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(t.trim());
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : t.trim() ? "INVALIDA" : "";
};

export const COLUMNAS_LOTE = ["Apellido y nombre", "Legajo", "CUIL", "Categoría", "Fecha ingreso", "Días/Horas", "Sueldo/Valor hora"];

/**
 * Cada línea es una persona. Columnas separadas por TAB (pegado desde Excel) o por ";".
 * Sólo el nombre es obligatorio. Se ignora una primera línea de encabezados.
 */
export const parsearLote = (texto: string): FilaLote[] => {
  const lineas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const filas = lineas.map((linea) => {
    const c = (linea.includes("\t") ? linea.split("\t") : linea.split(";")).map((x) => x.trim());
    return {
      nombre: c[0] ?? "",
      legajo: c[1] ?? "",
      cuil: c[2] ?? "",
      categoria: c[3] ?? "",
      fechaIngreso: parseFecha(c[4] ?? ""),
      unidades: parseNumero(c[5] ?? ""),
      valorBasico: parseNumero(c[6] ?? ""),
    } satisfies FilaLote;
  });
  if (filas[0] && /^apellido y nombre$/i.test(filas[0].nombre)) filas.shift();
  return filas;
};

/** Devuelve el error de una fila, o null si está bien. */
export const validarFila = (f: FilaLote): string | null => {
  if (!f.nombre) return "Falta el nombre";
  if (f.fechaIngreso === "INVALIDA") return "Fecha de ingreso inválida (usar dd/mm/aaaa)";
  if (Number.isNaN(f.unidades) || Number.isNaN(f.valorBasico)) return "Número inválido";
  return null;
};

/**
 * Arma los recibos: todo sale del formulario (mismo monto, mismo convenio) salvo lo
 * que cada fila traiga. Los datos personales NO se copian del formulario.
 */
export const construirRecibos = (base: DatosFormulario, convenio: Convenio, filas: FilaLote[]): ReciboLote[] =>
  filas.map((fila) => {
    const valorBasico = fila.valorBasico ?? (Number(base.valorBasico) || 0);
    const unidades = fila.unidades ?? (Number(base.unidades) || 0);
    const datos: DatosFormulario = {
      ...base,
      empleado: fila.nombre,
      legajo: fila.legajo,
      cuil: fila.cuil,
      antiguedad: "",
      fechaIngreso: fila.fechaIngreso,
      categoria: fila.categoria || base.categoria,
      valorBasico,
      unidades,
    };
    const montosFijos: Record<string, number> = {};
    for (const [id, v] of Object.entries(base.montosFijos)) if (v !== "") montosFijos[id] = Number(v);
    const liq = calcularLiquidacion(
      { valorBasico, unidades, baseAdicionales: Number(base.baseAdicionales) || undefined, montosFijos },
      convenio,
    );
    return { fila, datos, liq };
  });

const bajar = (blob: Blob, nombre: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};

/** Un PDF por persona dentro de un ZIP (nombres repetidos se numeran). */
export const crearZip = async (recibos: ReciboLote[], convenio: Convenio): Promise<Blob> => {
  const zip = new JSZip();
  const usados = new Map<string, number>();
  for (const r of recibos) {
    let nombre = nombreArchivoBono(r.datos);
    const n = (usados.get(nombre) ?? 0) + 1;
    usados.set(nombre, n);
    if (n > 1) nombre = nombre.replace(/\.pdf$/, `_${n}.pdf`);
    zip.file(nombre, crearPDFMultiple([{ datos: r.datos, liq: r.liq }], convenio).output("arraybuffer"));
  }
  return zip.generateAsync({ type: "blob" });
};

export const descargarZip = async (recibos: ReciboLote[], convenio: Convenio) => {
  const d = recibos[0].datos;
  bajar(await crearZip(recibos, convenio), `Bonos_${d.mes}_${d.anio}.zip`);
};

export const descargarPDFUnico = (recibos: ReciboLote[], convenio: Convenio) => {
  const d = recibos[0].datos;
  crearPDFMultiple(recibos.map((r) => ({ datos: r.datos, liq: r.liq })), convenio).save(`Bonos_${d.mes}_${d.anio}.pdf`);
};
