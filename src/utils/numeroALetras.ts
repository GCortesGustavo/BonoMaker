const UNIDADES = [
  "cero",
  "uno",
  "dos",
  "tres",
  "cuatro",
  "cinco",
  "seis",
  "siete",
  "ocho",
  "nueve",
  "diez",
  "once",
  "doce",
  "trece",
  "catorce",
  "quince",
  "dieciséis",
  "diecisiete",
  "dieciocho",
  "diecinueve",
  "veinte",
  "veintiuno",
  "veintidós",
  "veintitrés",
  "veinticuatro",
  "veinticinco",
  "veintiséis",
  "veintisiete",
  "veintiocho",
  "veintinueve",
];
const DECENAS = [
  "",
  "",
  "",
  "treinta",
  "cuarenta",
  "cincuenta",
  "sesenta",
  "setenta",
  "ochenta",
  "noventa",
];
const CENTENAS = [
  "",
  "ciento",
  "doscientos",
  "trescientos",
  "cuatrocientos",
  "quinientos",
  "seiscientos",
  "setecientos",
  "ochocientos",
  "novecientos",
];

/** 0..999. `apocope` convierte "uno" en "un" (ej: "veintiún mil"). */
const menorAMil = (n: number, apocope: boolean): string => {
  if (n === 0) return "";
  if (n === 100) return "cien";
  const c = Math.floor(n / 100);
  const r = n % 100;
  const partes: string[] = [];
  if (c > 0) partes.push(CENTENAS[c]);
  if (r > 0) {
    if (r < 30) {
      let t = UNIDADES[r];
      if (apocope) {
        if (r === 1) t = "un";
        else if (r === 21) t = "veintiún";
      }
      partes.push(t);
    } else {
      const d = Math.floor(r / 10);
      const u = r % 10;
      let t = DECENAS[d];
      if (u > 0) t += ` y ${apocope && u === 1 ? "un" : UNIDADES[u]}`;
      partes.push(t);
    }
  }
  return partes.join(" ");
};

const enteroALetras = (n: number): string => {
  if (n === 0) return "cero";
  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const partes: string[] = [];
  if (millones > 0) {
    partes.push(
      millones === 1 ? "un millón" : `${menorAMil(millones, true)} millones`,
    );
  }
  if (miles > 0) {
    partes.push(miles === 1 ? "mil" : `${menorAMil(miles, true)} mil`);
  }
  if (resto > 0) partes.push(menorAMil(resto, false));
  return partes.join(" ");
};

/** 620733.5 -> "Seiscientos veinte mil setecientos treinta y tres con 50/100" */
export const montoALetras = (monto: number): string => {
  const centavosTotales = Math.round(Math.abs(monto) * 100);
  const enteros = Math.floor(centavosTotales / 100);
  const centavos = centavosTotales % 100;
  const letras = enteroALetras(enteros);
  const texto = `${letras} con ${String(centavos).padStart(2, "0")}/100`;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};
