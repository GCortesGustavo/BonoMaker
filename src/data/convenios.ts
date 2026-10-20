import type { Convenio } from '../types/bono';

export const conveniosData: Convenio[] = [
  {
    id: 'comercio-2026',
    nombre: 'Empleados de Comercio (Régimen 2026)',
    reglas: [
      { nombre: 'Jubilación (Nuevo Régimen)', tipo: 'DESCUENTO', porcentaje: 0.11 },
      { nombre: 'Obra Social', tipo: 'DESCUENTO', porcentaje: 0.03 },
      { nombre: 'Sindicato (SEC)', tipo: 'DESCUENTO', porcentaje: 0.02 },
      { nombre: 'Fondo de Cese Laboral (Aporte Empleador)', tipo: 'APORTE_PATRONAL', porcentaje: 0.08 },
    ]
  },
  {
    id: 'construccion-2026',
    nombre: 'UOCRA - Construcción (Régimen 2026)',
    reglas: [
      { nombre: 'Jubilación', tipo: 'DESCUENTO', porcentaje: 0.11 },
      { nombre: 'Obra Social (Construir)', tipo: 'DESCUENTO', porcentaje: 0.03 },
      { nombre: 'Cuota Sindical UOCRA', tipo: 'DESCUENTO', porcentaje: 0.025 },
      { nombre: 'Fondo de Desempleo (Empleador)', tipo: 'APORTE_PATRONAL', porcentaje: 0.12 },
    ]
  },
  {
    id: 'tecnologia-2026',
    nombre: 'Sector IT / Software (Régimen 2026)',
    reglas: [
      { nombre: 'Jubilación', tipo: 'DESCUENTO', porcentaje: 0.11 },
      { nombre: 'Obra Social / Prepaga', tipo: 'DESCUENTO', porcentaje: 0.03 },
      { nombre: 'Aporte Solidario IT', tipo: 'DESCUENTO', porcentaje: 0.01 },
      { nombre: 'Seguro de Vida (Empleador)', tipo: 'APORTE_PATRONAL', porcentaje: 0.02 },
    ]
  }
];