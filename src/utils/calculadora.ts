import type { Convenio, ResultadoLiquidacion, ItemCalculado } from '../types/bono';

const aCentavos = (monto: number): number => Math.round(monto * 100);
const aDecimal = (centavos: number): number => centavos / 100;

export const calcularLiquidacion = (brutoIngresado: number, convenio: Convenio): ResultadoLiquidacion => {
  if (!brutoIngresado || brutoIngresado <= 0 || !convenio) {
    return { brutoTotal: 0, netoTotal: 0, totalDescuentos: 0, totalAportesPatronales: 0, costoTotalEmpleador: 0, items: [], valido: false };
  }

  const brutoCentavos = aCentavos(brutoIngresado);
  let totalDescuentosCentavos = 0;
  let totalAportesPatronalesCentavos = 0;
  const items: ItemCalculado[] = [];

  // Sueldo Básico
  items.push({ nombre: 'Sueldo Básico', tipo: 'REMUNERATIVO', porcentaje: 100, montoDecimal: brutoIngresado });

  convenio.reglas.forEach(regla => {
    const montoReglaCentavos = Math.round(brutoCentavos * regla.porcentaje);
    
    if (regla.tipo === 'DESCUENTO') {
      totalDescuentosCentavos += montoReglaCentavos;
    } else if (regla.tipo === 'APORTE_PATRONAL') {
      totalAportesPatronalesCentavos += montoReglaCentavos;
    }

    items.push({
      nombre: regla.nombre,
      tipo: regla.tipo,
      porcentaje: regla.porcentaje * 100, // Convertir a formato 11%
      montoDecimal: aDecimal(montoReglaCentavos)
    });
  });

  const netoCentavos = brutoCentavos - totalDescuentosCentavos;
  const costoTotalEmpleadorCentavos = brutoCentavos + totalAportesPatronalesCentavos;

  const sumaComprobacion = netoCentavos + totalDescuentosCentavos;
  const valido = sumaComprobacion === brutoCentavos;

  return {
    brutoTotal: aDecimal(brutoCentavos),
    netoTotal: aDecimal(netoCentavos),
    totalDescuentos: aDecimal(totalDescuentosCentavos),
    totalAportesPatronales: aDecimal(totalAportesPatronalesCentavos),
    costoTotalEmpleador: aDecimal(costoTotalEmpleadorCentavos),
    items,
    valido
  };
};

export const formatearMoneda = (monto: number) => 
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(monto);