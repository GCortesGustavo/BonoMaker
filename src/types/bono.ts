export type TipoConcepto =
  | "REMUNERATIVO"
  | "NO_REMUNERATIVO"
  | "DESCUENTO"
  | "APORTE_PATRONAL";

/** Cómo se obtiene el monto de un concepto. */
export type MetodoCalculo = "PORCENTAJE" | "MONTO_FIJO";

/**
 * Sobre qué monto se calcula un concepto porcentual:
 * - BASICO: sueldo básico liquidado (ej. 80 hs × valor hora).
 * - BASE_ADICIONALES: "básico de convenio" sobre el que se calculan adicionales
 *   (si no se carga, es igual al sueldo básico).
 * - REMUNERATIVO: total remunerativo (en un concepto remunerativo, lo acumulado
 *   hasta ese momento).
 * - BRUTO: remunerativo + no remunerativo.
 */
export type BaseCalculo =
  | "BASICO"
  | "BASE_ADICIONALES"
  | "REMUNERATIVO"
  | "BRUTO";

/** Agrupación para el bloque "Detalle de la composición salarial" y el gráfico. */
export type GrupoCosto =
  | "SEGURIDAD_SOCIAL"
  | "SINDICAL"
  | "OBRA_SOCIAL"
  | "INSSJP"
  | "ART"
  | "SCVO"
  | "OTROS";

/** DIAS: valor mensual / 30 × días. HORAS: valor hora × horas. */
export type UnidadBasico = "DIAS" | "HORAS";

export interface ReglaConcepto {
  id: string;
  codigo?: string;
  nombre: string;
  tipo: TipoConcepto;
  metodo: MetodoCalculo;
  /** Fracción: 0.11 = 11%. Se usa si metodo === "PORCENTAJE". */
  porcentaje: number;
  /** Se usa si metodo === "MONTO_FIJO". */
  montoFijo: number;
  base: BaseCalculo;
  grupo: GrupoCosto;
}

export interface Convenio {
  id: string;
  nombre: string;
  unidadBasico: UnidadBasico;
  nombreBasico: string;
  codigoBasico?: string;
  /** Texto opcional al pie del recibo. */
  nota?: string;
  reglas: ReglaConcepto[];
}

export interface LineaLiquidacion {
  reglaId: string;
  codigo?: string;
  nombre: string;
  tipo: TipoConcepto;
  grupo: GrupoCosto;
  /** Texto de la columna UNIDAD (ej. "30", "80", "11%"). */
  unidad: string;
  /** Valor de la columna BASE (null si no aplica). */
  base: number | null;
  monto: number;
}

export interface DetalleGrupo {
  grupo: GrupoCosto;
  empleador: number;
  trabajador: number;
  total: number;
}

export interface ResultadoLiquidacion {
  valido: boolean;
  basico: LineaLiquidacion | null;
  remunerativos: LineaLiquidacion[]; // incluye el básico en primer lugar
  noRemunerativos: LineaLiquidacion[];
  descuentos: LineaLiquidacion[];
  aportes: LineaLiquidacion[];
  totalRemunerativo: number;
  totalNoRemunerativo: number;
  /** Remunerativo + no remunerativo. */
  bruto: number;
  totalDescuentos: number;
  neto: number;
  totalAportes: number;
  costoTotalEmpleador: number;
  grupos: DetalleGrupo[];
}

export interface EntradaLiquidacion {
  /** Valor mensual (DIAS) o valor hora (HORAS). */
  valorBasico: number;
  /** Días u horas trabajadas. */
  unidades: number;
  /** Opcional: mensual/hora sobre el que se calculan los adicionales. */
  baseAdicionales?: number;
  /** Montos que reemplazan al monto fijo del convenio, por id de regla. */
  montosFijos?: Record<string, number>;
}

export interface DatosFormulario {
  // Empresa
  empresa: string;
  domicilio: string;
  cuit: string;
  lugar: string;
  // Período
  mes: string; // "SEPTIEMBRE"
  anio: string;
  q: string;
  fechaPagoAportes: string; // ISO yyyy-mm-dd
  fechaEmision: string; // ISO yyyy-mm-dd
  // Empleado
  empleado: string;
  legajo: string;
  antiguedad: string;
  fechaIngreso: string; // ISO
  categoria: string;
  cuil: string;
  banco: string;
  // Salario
  valorBasico: number | "";
  unidades: number | "";
  baseAdicionales: number | "";
  montosFijos: Record<string, number | "">;
}
