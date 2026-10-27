import type {
  Convenio,
  GrupoCosto,
  ReglaConcepto,
  TipoConcepto,
} from "../types/bono";
import { BASES_PERMITIDAS } from "../utils/calculadora";

type Parcial = Partial<ReglaConcepto> &
  Pick<ReglaConcepto, "id" | "nombre" | "tipo">;

/** Completa una regla con valores por defecto (sirve también para datos guardados con el formato viejo). */
export const normalizarRegla = (r: Parcial): ReglaConcepto => ({
  id: r.id,
  codigo: r.codigo,
  nombre: r.nombre,
  tipo: r.tipo,
  metodo: r.metodo ?? "PORCENTAJE",
  porcentaje: r.porcentaje ?? 0,
  montoFijo: r.montoFijo ?? 0,
  base: r.base ?? BASES_PERMITIDAS[r.tipo][0],
  grupo: r.grupo ?? "OTROS",
});

export const normalizarConvenio = (
  c: Partial<Convenio> & Pick<Convenio, "id" | "nombre">,
): Convenio => ({
  id: c.id,
  nombre: c.nombre,
  unidadBasico: c.unidadBasico ?? "DIAS",
  nombreBasico: c.nombreBasico ?? "Sueldo básico",
  codigoBasico: c.codigoBasico,
  nota: c.nota,
  reglas: (c.reglas ?? []).map((r, i) =>
    normalizarRegla({
      ...(r as Parcial),
      id: (r as Partial<ReglaConcepto>).id ?? `${c.id}-r${i}`,
    }),
  ),
});

// Atajos para escribir los convenios de forma compacta.
const pct = (
  id: string,
  nombre: string,
  tipo: TipoConcepto,
  porcentaje: number,
  grupo: GrupoCosto = "OTROS",
  extra: Partial<ReglaConcepto> = {},
): ReglaConcepto =>
  normalizarRegla({
    id,
    nombre,
    tipo,
    metodo: "PORCENTAJE",
    porcentaje,
    grupo,
    ...extra,
  });

const fijo = (
  id: string,
  nombre: string,
  tipo: TipoConcepto,
  montoFijo: number,
  grupo: GrupoCosto = "OTROS",
  extra: Partial<ReglaConcepto> = {},
): ReglaConcepto =>
  normalizarRegla({
    id,
    nombre,
    tipo,
    metodo: "MONTO_FIJO",
    montoFijo,
    grupo,
    ...extra,
  });

export const conveniosData: Convenio[] = [
  // Réplica del recibo "Bono_Burgueros_Septiembre_2026.xlsx"
  {
    id: "uthgra-2026",
    nombre: "UTHGRA - Hotelería y Gastronomía",
    unidadBasico: "DIAS",
    nombreBasico: "Sueldo básico",
    nota: "Nota: Seguridad social del empleador incluye SIPA, Fondo Nacional de Empleo y Asignaciones Familiares",
    reglas: [
      // Remunerativos (adicionales calculados sobre la "base de adicionales")
      pct("uthgra-presentismo", "Presentismo", "REMUNERATIVO", 0.1, "OTROS", {
        base: "BASE_ADICIONALES",
      }),
      pct(
        "uthgra-adic-ctoss",
        "Adicional Cto Ss",
        "REMUNERATIVO",
        0.12,
        "OTROS",
        { base: "BASE_ADICIONALES" },
      ),
      // No remunerativo
      fijo("uthgra-norem", "No Remunerativo", "NO_REMUNERATIVO", 44000),
      // Descuentos al trabajador
      pct("uthgra-jub", "Jubilación", "DESCUENTO", 0.11, "SEGURIDAD_SOCIAL"),
      pct("uthgra-19032", "Ley 19.032", "DESCUENTO", 0.03, "INSSJP"),
      pct(
        "uthgra-os",
        "Obra Social - UTHGRA 3%",
        "DESCUENTO",
        0.03,
        "OBRA_SOCIAL",
      ),
      pct("uthgra-sind", "Cuota Sindical 2,5%", "DESCUENTO", 0.025, "SINDICAL"),
      pct("uthgra-sepelio", "Seguro Sepelio 1%", "DESCUENTO", 0.01, "SINDICAL"),
      pct("uthgra-difos", "Dif Obra Social", "DESCUENTO", 0.03, "OBRA_SOCIAL"),
      // Contribuciones del empleador
      pct(
        "uthgra-e-sipa",
        "SIPA",
        "APORTE_PATRONAL",
        0.1077,
        "SEGURIDAD_SOCIAL",
      ),
      pct("uthgra-e-pami", "PAMI", "APORTE_PATRONAL", 0.0159, "INSSJP"),
      pct(
        "uthgra-e-fne",
        "FONDO NAC DE EMPLEO",
        "APORTE_PATRONAL",
        0.0094,
        "SEGURIDAD_SOCIAL",
      ),
      pct(
        "uthgra-e-anssal",
        "ANSSAL/FSR",
        "APORTE_PATRONAL",
        0.009,
        "OBRA_SOCIAL",
      ),
      pct(
        "uthgra-e-asig",
        "ASIGNACIONES FAMILIARES",
        "APORTE_PATRONAL",
        0.047,
        "SEGURIDAD_SOCIAL",
      ),
      pct(
        "uthgra-e-os",
        "CONTRIBUCIONES OBRA SOCIAL",
        "APORTE_PATRONAL",
        0.051,
        "OBRA_SOCIAL",
      ),
      pct("uthgra-e-art", "ART", "APORTE_PATRONAL", 0.05022, "ART"),
      fijo("uthgra-e-feep", "FEEP", "APORTE_PATRONAL", 1765, "SINDICAL"),
      fijo("uthgra-e-scvo", "SCVO", "APORTE_PATRONAL", 1765, "SCVO"),
      pct(
        "uthgra-e-svs-emps",
        "SEGURO DE VIDA Y SEPELIO EMPLEADOS",
        "APORTE_PATRONAL",
        0.01,
        "SINDICAL",
      ),
      pct(
        "uthgra-e-fondo",
        "FONDO CONVENIO",
        "APORTE_PATRONAL",
        0.02,
        "SINDICAL",
      ),
      pct(
        "uthgra-e-svs-empr",
        "SEGURO DE VIDA Y SEPELIO EMPLEADOR",
        "APORTE_PATRONAL",
        0.01,
        "SINDICAL",
      ),
    ],
  },
  // Réplica de la liquidación de ejemplo (80 hs, presentismo 20%)
  {
    id: "construccion-2026",
    nombre: "UOCRA - Construcción",
    unidadBasico: "HORAS",
    nombreBasico: "HS. NORMALES CONSTRUCCION",
    codigoBasico: "1000",
    reglas: [
      pct(
        "uocra-presentismo",
        "PRESENTISMO CONSTRUCCION",
        "REMUNERATIVO",
        0.2,
        "OTROS",
        {
          codigo: "1004",
          base: "BASICO",
        },
      ),
      pct(
        "uocra-jub",
        "JUBILACION 11%",
        "DESCUENTO",
        0.11,
        "SEGURIDAD_SOCIAL",
        { codigo: "2000" },
      ),
      pct(
        "uocra-19032",
        "LEY 19.032 / INSSJP 3%",
        "DESCUENTO",
        0.03,
        "INSSJP",
        { codigo: "2001" },
      ),
      pct("uocra-os", "OBRA SOCIAL 3%", "DESCUENTO", 0.03, "OBRA_SOCIAL", {
        codigo: "2002",
      }),
      pct("uocra-sind", "SINDICATO UOCRA", "DESCUENTO", 0.025, "SINDICAL", {
        codigo: "2003",
      }),
      pct(
        "uocra-svida",
        "SEGURO VIDA CONSTRUCCION",
        "DESCUENTO",
        0.02,
        "SINDICAL",
        { codigo: "2004" },
      ),
      pct(
        "uocra-fcl",
        "Fondo de Desempleo (Empleador)",
        "APORTE_PATRONAL",
        0.12,
      ),
    ],
  },
  {
    id: "comercio-2026",
    nombre: "Empleados de Comercio",
    unidadBasico: "DIAS",
    nombreBasico: "Sueldo básico",
    reglas: [
      pct("com-presentismo", "Presentismo", "REMUNERATIVO", 0.0833, "OTROS", {
        base: "BASICO",
      }),
      pct("com-jub", "Jubilación", "DESCUENTO", 0.11, "SEGURIDAD_SOCIAL"),
      pct("com-19032", "Ley 19.032", "DESCUENTO", 0.03, "INSSJP"),
      pct("com-os", "Obra Social", "DESCUENTO", 0.03, "OBRA_SOCIAL"),
      pct("com-sec", "Sindicato (SEC)", "DESCUENTO", 0.02, "SINDICAL"),
      pct(
        "com-fcl",
        "Fondo de Cese Laboral (Aporte Empleador)",
        "APORTE_PATRONAL",
        0.08,
      ),
    ],
  },
  {
    id: "tecnologia-2026",
    nombre: "Sector IT / Software",
    unidadBasico: "DIAS",
    nombreBasico: "Sueldo básico",
    reglas: [
      pct("it-jub", "Jubilación", "DESCUENTO", 0.11, "SEGURIDAD_SOCIAL"),
      pct("it-19032", "Ley 19.032", "DESCUENTO", 0.03, "INSSJP"),
      pct("it-os", "Obra Social / Prepaga", "DESCUENTO", 0.03, "OBRA_SOCIAL"),
      pct("it-soli", "Aporte Solidario IT", "DESCUENTO", 0.01, "SINDICAL"),
      pct("it-seguro", "Seguro de Vida (Empleador)", "APORTE_PATRONAL", 0.02),
    ],
  },
];
