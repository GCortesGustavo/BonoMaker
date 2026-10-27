/** Formato numérico argentino (1.234.567,89), siempre con separador de miles. */
export const formatearNumero = (n: number, decimales = 2): string => {
  const negativo = n < 0;
  const fijo = Math.abs(n).toFixed(decimales);
  const [entero, dec] = fijo.split(".");
  const conMiles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const texto = dec ? `${conMiles},${dec}` : conMiles;
  return negativo ? `-${texto}` : texto;
};

export const formatearMoneda = (n: number): string => `$ ${formatearNumero(n)}`;

/** 0.1077 -> "10,77%", 0.11 -> "11%", 0.025 -> "2,5%". */
export const formatearPorcentaje = (fraccion: number): string => {
  const valor = parseFloat((fraccion * 100).toFixed(4));
  return `${String(valor).replace(".", ",")}%`;
};

const MESES = [
  "ENERO",
  "FEBRERO",
  "MARZO",
  "ABRIL",
  "MAYO",
  "JUNIO",
  "JULIO",
  "AGOSTO",
  "SEPTIEMBRE",
  "OCTUBRE",
  "NOVIEMBRE",
  "DICIEMBRE",
];
export const MESES_ANIO = MESES;

const capitalizar = (s: string) =>
  s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

/** "2026-10-10" -> "10/10/2026" */
export const formatearFecha = (iso: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso || "";
};

/** "2026-10-10" -> "10 de Octubre 2026" */
export const formatearFechaLarga = (iso: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  if (!m) return iso || "";
  return `${Number(m[3])} de ${capitalizar(MESES[Number(m[2]) - 1] ?? "")} ${m[1]}`;
};

/** ("SEPTIEMBRE","2026") -> "Sep-26" */
export const formatearPeriodo = (mes: string, anio: string): string => {
  const abrev = capitalizar(mes.slice(0, 3));
  return `${abrev}-${String(anio).slice(-2)}`;
};
