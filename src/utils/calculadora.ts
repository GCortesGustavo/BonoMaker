import type {
  BaseCalculo,
  Convenio,
  DetalleGrupo,
  EntradaLiquidacion,
  GrupoCosto,
  LineaLiquidacion,
  ReglaConcepto,
  ResultadoLiquidacion,
  TipoConcepto,
} from "../types/bono";
import { formatearPorcentaje } from "./formato";

export { formatearMoneda } from "./formato";

// Todo el cálculo se hace en centavos enteros para evitar errores de coma flotante.
const aCentavos = (monto: number): number => Math.round(monto * 100 + 1e-9);
const aDecimal = (centavos: number): number => centavos / 100;
/** Redondea a centavos un valor ya expresado en centavos. */
const redondear = (c: number): number => Math.round(Number(c.toPrecision(14)));

export const GRUPOS_ORDEN: GrupoCosto[] = [
  "SINDICAL",
  "SEGURIDAD_SOCIAL",
  "OBRA_SOCIAL",
  "INSSJP",
  "ART",
  "SCVO",
  "OTROS",
];

export const NOMBRE_GRUPO: Record<GrupoCosto, string> = {
  SEGURIDAD_SOCIAL: "Seguridad Social",
  SINDICAL: "Costo Sindical",
  OBRA_SOCIAL: "Obra Social",
  INSSJP: "INSSJP (PAMI)",
  ART: "ART",
  SCVO: "SCVO",
  OTROS: "Otros",
};

/** Bases permitidas según el tipo de concepto. La primera es la que se usa por defecto. */
export const BASES_PERMITIDAS: Record<TipoConcepto, BaseCalculo[]> = {
  REMUNERATIVO: ["BASICO", "BASE_ADICIONALES", "REMUNERATIVO"],
  NO_REMUNERATIVO: ["BASICO", "BASE_ADICIONALES", "REMUNERATIVO", "BRUTO"],
  DESCUENTO: ["REMUNERATIVO", "BRUTO", "BASICO", "BASE_ADICIONALES"],
  APORTE_PATRONAL: ["REMUNERATIVO", "BRUTO", "BASICO", "BASE_ADICIONALES"],
};

export const NOMBRE_BASE: Record<BaseCalculo, string> = {
  BASICO: "Sueldo básico",
  BASE_ADICIONALES: "Base de adicionales",
  REMUNERATIVO: "Total remunerativo",
  BRUTO: "Bruto (rem. + no rem.)",
};

const baseValida = (regla: ReglaConcepto): BaseCalculo =>
  BASES_PERMITIDAS[regla.tipo].includes(regla.base)
    ? regla.base
    : BASES_PERMITIDAS[regla.tipo][0];

const liquidacionVacia = (): ResultadoLiquidacion => ({
  valido: false,
  basico: null,
  remunerativos: [],
  noRemunerativos: [],
  descuentos: [],
  aportes: [],
  totalRemunerativo: 0,
  totalNoRemunerativo: 0,
  bruto: 0,
  totalDescuentos: 0,
  neto: 0,
  totalAportes: 0,
  costoTotalEmpleador: 0,
  grupos: [],
});

export const calcularLiquidacion = (
  entrada: EntradaLiquidacion,
  convenio: Convenio | undefined,
): ResultadoLiquidacion => {
  const { valorBasico, unidades, baseAdicionales, montosFijos = {} } = entrada;
  if (!convenio || !(valorBasico > 0) || !(unidades > 0))
    return liquidacionVacia();

  const porHora = convenio.unidadBasico === "HORAS";

  /** Valor mensual / valor hora -> monto proporcional a las unidades trabajadas. */
  const proporcional = (valor: number): number =>
    porHora
      ? redondear(aCentavos(valor) * unidades)
      : redondear((aCentavos(valor) / 30) * unidades);

  const basicoC = proporcional(valorBasico);
  const baseAdicionalesC =
    baseAdicionales && baseAdicionales > 0
      ? proporcional(baseAdicionales)
      : basicoC;

  const montoRegla = (regla: ReglaConcepto, baseC: number): number =>
    regla.metodo === "MONTO_FIJO"
      ? aCentavos(montosFijos[regla.id] ?? regla.montoFijo)
      : redondear(baseC * regla.porcentaje);

  const crearLinea = (
    regla: ReglaConcepto,
    baseC: number,
    montoC: number,
  ): LineaLiquidacion => ({
    reglaId: regla.id,
    codigo: regla.codigo,
    nombre: regla.nombre,
    tipo: regla.tipo,
    grupo: regla.grupo,
    unidad:
      regla.metodo === "PORCENTAJE"
        ? formatearPorcentaje(regla.porcentaje)
        : "",
    base: regla.metodo === "PORCENTAJE" ? aDecimal(baseC) : null,
    monto: aDecimal(montoC),
  });

  const reglasDe = (tipo: TipoConcepto) =>
    convenio.reglas.filter((r) => r.tipo === tipo);

  // 1) Sueldo básico
  const basico: LineaLiquidacion = {
    reglaId: "__basico__",
    codigo: convenio.codigoBasico,
    nombre: convenio.nombreBasico || "Sueldo básico",
    tipo: "REMUNERATIVO",
    grupo: "OTROS",
    unidad: String(unidades),
    base: valorBasico,
    monto: aDecimal(basicoC),
  };

  // 2) Remunerativos, en orden. "REMUNERATIVO" = acumulado hasta el concepto anterior.
  const remunerativos: LineaLiquidacion[] = [basico];
  let acumuladoRemC = basicoC;
  for (const regla of reglasDe("REMUNERATIVO")) {
    const base = baseValida(regla);
    const baseC =
      base === "BASICO"
        ? basicoC
        : base === "BASE_ADICIONALES"
          ? baseAdicionalesC
          : acumuladoRemC;
    const montoC = montoRegla(regla, baseC);
    remunerativos.push(crearLinea(regla, baseC, montoC));
    acumuladoRemC += montoC;
  }
  const totalRemC = acumuladoRemC;

  // 3) No remunerativos. "BRUTO" = lo acumulado (remunerativo + no rem. anteriores).
  const noRemunerativos: LineaLiquidacion[] = [];
  let acumuladoBrutoC = totalRemC;
  for (const regla of reglasDe("NO_REMUNERATIVO")) {
    const base = baseValida(regla);
    const baseC =
      base === "BASICO"
        ? basicoC
        : base === "BASE_ADICIONALES"
          ? baseAdicionalesC
          : base === "REMUNERATIVO"
            ? totalRemC
            : acumuladoBrutoC;
    const montoC = montoRegla(regla, baseC);
    noRemunerativos.push(crearLinea(regla, baseC, montoC));
    acumuladoBrutoC += montoC;
  }
  const totalNoRemC = acumuladoBrutoC - totalRemC;
  const brutoC = totalRemC + totalNoRemC;

  // 4) Descuentos del trabajador y contribuciones del empleador.
  const baseFinal = (base: BaseCalculo): number =>
    base === "BASICO"
      ? basicoC
      : base === "BASE_ADICIONALES"
        ? baseAdicionalesC
        : base === "REMUNERATIVO"
          ? totalRemC
          : brutoC;

  const calcularFinales = (tipo: "DESCUENTO" | "APORTE_PATRONAL") =>
    reglasDe(tipo).map((regla) => {
      const baseC = baseFinal(baseValida(regla));
      return crearLinea(regla, baseC, montoRegla(regla, baseC));
    });

  const descuentos = calcularFinales("DESCUENTO");
  const aportes = calcularFinales("APORTE_PATRONAL");

  const suma = (lineas: LineaLiquidacion[]) =>
    lineas.reduce((s, l) => s + aCentavos(l.monto), 0);
  const totalDescC = suma(descuentos);
  const totalAportesC = suma(aportes);

  // 5) Detalle por grupo (empleador = aportes patronales, trabajador = descuentos).
  const grupos: DetalleGrupo[] = GRUPOS_ORDEN.map((grupo) => {
    const emp = suma(aportes.filter((l) => l.grupo === grupo));
    const trab = suma(descuentos.filter((l) => l.grupo === grupo));
    return {
      grupo,
      empleador: aDecimal(emp),
      trabajador: aDecimal(trab),
      total: aDecimal(emp + trab),
    };
  }).filter((g) => g.empleador !== 0 || g.trabajador !== 0);

  return {
    valido: true,
    basico,
    remunerativos,
    noRemunerativos,
    descuentos,
    aportes,
    totalRemunerativo: aDecimal(totalRemC),
    totalNoRemunerativo: aDecimal(totalNoRemC),
    bruto: aDecimal(brutoC),
    totalDescuentos: aDecimal(totalDescC),
    neto: aDecimal(brutoC - totalDescC),
    totalAportes: aDecimal(totalAportesC),
    costoTotalEmpleador: aDecimal(brutoC + totalAportesC),
    grupos,
  };
};
