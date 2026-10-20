export type TipoConcepto = 'REMUNERATIVO' | 'NO_REMUNERATIVO' | 'DESCUENTO' | 'APORTE_PATRONAL';

export interface ReglaConcepto {
  nombre: string;
  tipo: TipoConcepto;
  porcentaje: number;
}

export interface Convenio {
  id: string;
  nombre: string;
  reglas: ReglaConcepto[];
}

export interface ItemCalculado {
  nombre: string;
  tipo: TipoConcepto;
  porcentaje: number;
  montoDecimal: number;
}

export interface ResultadoLiquidacion {
  brutoTotal: number;
  netoTotal: number;
  totalDescuentos: number;
  totalAportesPatronales: number;
  costoTotalEmpleador: number;
  items: ItemCalculado[];
  valido: boolean;
}

export interface DatosFormulario {
  empresa: string;
  cuit: string;
  mes: string;
  anio: string;
  empleado: string;
  legajo: string;
  bruto: number | '';
  antiguedad: string;
  fechaIngreso: string;
  categoria: string;
  cuil: string;
}