import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { conveniosData } from '../data/convenios';
import { calcularLiquidacion, formatearMoneda } from '../utils/calculadora';
import type { DatosFormulario } from '../types/bono';
import { generarPDF } from '../utils/pdf';

const COLORES = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#E74C3C', '#2ECC71'];

export default function NuevoBono() {
  const [convenioId, setConvenioId] = useState(conveniosData[0].id);
  const [datos, setDatos] = useState<DatosFormulario>({
    empresa: 'Constructora del Sur S.A.',
    cuit: '30-12345678-0',
    mes: 'Octubre',
    anio: '2026',
    empleado: 'Juan Pérez',
    legajo: '1045',
    bruto: 800000,
    antiguedad: '3 años',
    fechaIngreso: '15/03/2023',
    categoria: 'Oficial Especializado',
    cuil: '20-35123456-8'
  });

  const convenioSeleccionado = conveniosData.find(c => c.id === convenioId) || conveniosData[0];
  
  const liquidacion = useMemo(() => {
    return calcularLiquidacion(Number(datos.bruto) || 0, convenioSeleccionado);
  }, [datos.bruto, convenioSeleccionado]);

  const datosGrafico = useMemo(() => {
    if (!liquidacion.valido) return [];
    // Distribución del costo total del empleador (Neto + Descuentos/Aportes Trabajador + Aportes Patronales)
    return [
      { name: 'Sueldo Neto (Trabajador)', value: liquidacion.netoTotal },
      ...liquidacion.items.filter(i => i.tipo !== 'REMUNERATIVO').map(i => ({ name: i.nombre, value: i.montoDecimal }))
    ];
  }, [liquidacion]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDatos(prev => ({ ...prev, [name]: name === 'bruto' ? (Number(value) || '') : value }));
  };

  const handleDescargar = async () => {
    if (datos.empleado && liquidacion.valido) {
      await generarPDF('recibo-imprimible', `Bono_${datos.empleado.replace(/\s+/g, '_')}`);
    } else {
      alert("Comprueba que ingresaste el nombre del empleado y un sueldo bruto válido.");
    }
  };

  const aportesPatronales = liquidacion.items.filter(i => i.tipo === 'APORTE_PATRONAL');
  const descuentos = liquidacion.items.filter(i => i.tipo === 'DESCUENTO');

  return (
    <div className="max-w-[1400px] mx-auto p-4 grid grid-cols-1 xl:grid-cols-12 gap-6 font-sans">
      
      {/* --- FORMULARIO LATERAL --- */}
      <div className="xl:col-span-3 bg-white p-6 rounded-lg shadow-md border border-gray-200 overflow-y-auto max-h-[90vh]">
        <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">Datos del Recibo</h2>
        
        <div className="space-y-3 text-sm">
          <div>
            <label className="block font-medium text-gray-700">Convenio</label>
            <select className="w-full p-2 border rounded" value={convenioId} onChange={(e) => setConvenioId(e.target.value)}>
              {conveniosData.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="block font-medium">Empresa</label><input type="text" name="empresa" value={datos.empresa} onChange={handleChange} className="w-full p-2 border rounded"/></div>
            <div><label className="block font-medium">CUIT</label><input type="text" name="cuit" value={datos.cuit} onChange={handleChange} className="w-full p-2 border rounded"/></div>
            <div><label className="block font-medium">Mes</label><input type="text" name="mes" value={datos.mes} onChange={handleChange} className="w-full p-2 border rounded"/></div>
            <div><label className="block font-medium">Año</label><input type="text" name="anio" value={datos.anio} onChange={handleChange} className="w-full p-2 border rounded"/></div>
          </div>
          <div><label className="block font-medium">Empleado</label><input type="text" name="empleado" value={datos.empleado} onChange={handleChange} className="w-full p-2 border rounded"/></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="block font-medium">Legajo</label><input type="text" name="legajo" value={datos.legajo} onChange={handleChange} className="w-full p-2 border rounded"/></div>
            <div><label className="block font-medium">CUIL</label><input type="text" name="cuil" value={datos.cuil} onChange={handleChange} className="w-full p-2 border rounded"/></div>
            <div><label className="block font-medium">Fecha Ing.</label><input type="text" name="fechaIngreso" value={datos.fechaIngreso} onChange={handleChange} className="w-full p-2 border rounded"/></div>
            <div><label className="block font-medium">Antigüedad</label><input type="text" name="antiguedad" value={datos.antiguedad} onChange={handleChange} className="w-full p-2 border rounded"/></div>
          </div>
          <div><label className="block font-medium">Categoría</label><input type="text" name="categoria" value={datos.categoria} onChange={handleChange} className="w-full p-2 border rounded"/></div>
          <div><label className="block font-medium font-bold text-blue-700">Sueldo Bruto ($)</label><input type="number" name="bruto" value={datos.bruto} onChange={handleChange} className="w-full p-2 border-2 border-blue-400 rounded bg-blue-50"/></div>
        </div>

        <button onClick={handleDescargar} disabled={!liquidacion.valido || !datos.empleado} className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-md flex items-center justify-center gap-2">
          <Download size={20} /> Generar PDF
        </button>
      </div>

      {/* --- VISTA PREVIA DEL RECIBO (EXACTAMENTE COMO LA IMAGEN) --- */}
      <div className="xl:col-span-9 bg-gray-50 p-4 flex justify-center overflow-x-auto">
        <div id="recibo-imprimible" className="bg-white w-[900px] min-w-[900px] shadow-xl p-6 border border-gray-300 text-xs text-black" style={{ fontFamily: 'Arial, sans-serif' }}>
          
          {/* Encabezado Empresa */}
          <div className="border border-black p-2 font-bold uppercase mb-2">
            <div>EMPRESA: {datos.empresa}</div>
            <div>C.U.I.T. EMPRESA: {datos.cuit}</div>
          </div>

          {/* Tabla de Datos del Empleado */}
          <table className="w-full border-collapse border border-black text-center mb-4">
            <thead>
              <tr className="bg-gray-200 text-[11px]">
                <th className="border border-black p-1">MES</th>
                <th className="border border-black p-1">AÑO</th>
                <th className="border border-black p-1">APELLIDO Y NOMBRE</th>
                <th className="border border-black p-1">Nº LEGAJO</th>
                <th className="border border-black p-1">SUELDO BRUTO</th>
                <th className="border border-black p-1">ANTIGÜEDAD</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-1">{datos.mes}</td>
                <td className="border border-black p-1">{datos.anio}</td>
                <td className="border border-black p-1 font-bold">{datos.empleado}</td>
                <td className="border border-black p-1">{datos.legajo}</td>
                <td className="border border-black p-1 font-bold">{formatearMoneda(Number(datos.bruto))}</td>
                <td className="border border-black p-1">{datos.antiguedad}</td>
              </tr>
              <tr className="bg-gray-200 text-[11px] font-bold">
                <td className="border border-black p-1" colSpan={2}>FECHA INGRESO</td>
                <td className="border border-black p-1" colSpan={2}>CATEGORÍA LABORAL</td>
                <td className="border border-black p-1" colSpan={2}>C.U.I.L.</td>
              </tr>
              <tr>
                <td className="border border-black p-1" colSpan={2}>{datos.fechaIngreso}</td>
                <td className="border border-black p-1" colSpan={2}>{datos.categoria}</td>
                <td className="border border-black p-1" colSpan={2}>{datos.cuil}</td>
              </tr>
            </tbody>
          </table>

          {/* Sección 1: Costo Empleador */}
          <table className="w-full border-collapse border border-black mb-1">
            <thead>
              <tr className="bg-gray-300 font-bold">
                <th colSpan={4} className="border border-black p-1 text-center text-sm">COSTO TOTAL EMPLEADOR <span className="float-right mr-2">{formatearMoneda(liquidacion.costoTotalEmpleador)}</span></th>
              </tr>
              <tr className="bg-gray-200 text-[11px]">
                <th className="border border-black p-1 w-1/2">CONCEPTO</th>
                <th className="border border-black p-1 w-1/6">UNIDAD</th>
                <th className="border border-black p-1 w-1/6">BASE</th>
                <th className="border border-black p-1 w-1/6">MONTO</th>
              </tr>
            </thead>
            <tbody>
              {aportesPatronales.map((item, idx) => (
                <tr key={idx}>
                  <td className="border-l border-r border-black p-1 pl-2">{item.nombre}</td>
                  <td className="border-l border-r border-black p-1 text-center">{item.porcentaje}%</td>
                  <td className="border-l border-r border-black p-1 text-right"></td>
                  <td className="border-l border-r border-black p-1 text-right">{formatearMoneda(item.montoDecimal)}</td>
                </tr>
              ))}
              {/* Filas de relleno para estética */}
              <tr><td className="border-l border-r border-black p-4"></td><td className="border-l border-r border-black"></td><td className="border-l border-r border-black"></td><td className="border-l border-r border-black"></td></tr>
            </tbody>
            <tfoot>
              <tr className="bg-gray-200 font-bold border-t border-black">
                <td colSpan={3} className="border border-black p-1 text-center">SUB TOTAL CONTRIBUCIONES EMPLEADOR</td>
                <td className="border border-black p-1 text-right">{formatearMoneda(liquidacion.totalAportesPatronales)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Sección 2: Sueldo Bruto y Descuentos */}
          <table className="w-full border-collapse border border-black mb-1">
            <thead>
              <tr className="bg-gray-300 font-bold">
                <th colSpan={3} className="border border-black p-1 text-center text-sm">SUELDO BRUTO</th>
                <th className="border border-black p-1 text-right text-sm">{formatearMoneda(liquidacion.brutoTotal)}</th>
              </tr>
              <tr className="bg-gray-200 text-[11px]">
                <th className="border border-black p-1 w-1/2">CONCEPTO</th>
                <th className="border border-black p-1 w-1/6">UNIDAD</th>
                <th className="border border-black p-1 w-1/6">BASE</th>
                <th className="border border-black p-1 w-1/6">MONTO</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border-l border-r border-black p-1 pl-2 font-bold">Sueldo Básico</td>
                <td className="border-l border-r border-black p-1 text-center">30 d</td>
                <td className="border-l border-r border-black p-1 text-right"></td>
                <td className="border-l border-r border-black p-1 text-right">{formatearMoneda(liquidacion.brutoTotal)}</td>
              </tr>
              {descuentos.map((item, idx) => (
                <tr key={idx}>
                  <td className="border-l border-r border-black p-1 pl-2 text-gray-700">{item.nombre}</td>
                  <td className="border-l border-r border-black p-1 text-center">{item.porcentaje}%</td>
                  <td className="border-l border-r border-black p-1 text-right"></td>
                  <td className="border-l border-r border-black p-1 text-right">{formatearMoneda(item.montoDecimal)}</td>
                </tr>
              ))}
              <tr><td className="border-l border-r border-black p-6"></td><td className="border-l border-r border-black"></td><td className="border-l border-r border-black"></td><td className="border-l border-r border-black"></td></tr>
            </tbody>
            <tfoot>
              <tr className="bg-gray-200 font-bold border-t border-black">
                <td colSpan={2} className="border border-black p-1">COMPOSICIÓN SALARIAL:</td>
                <td className="border border-black p-1 text-center">Descuentos:</td>
                <td className="border border-black p-1 text-right text-red-600">{formatearMoneda(liquidacion.totalDescuentos)}</td>
              </tr>
              <tr className="bg-gray-300 font-bold text-sm">
                <td colSpan={3} className="border border-black p-2 text-center uppercase">Sueldo Neto $</td>
                <td className="border border-black p-2 text-right text-blue-900">{formatearMoneda(liquidacion.netoTotal)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Sección 3: Detalles y Gráfico */}
          <div className="grid grid-cols-2 gap-4 mt-4 h-64 border border-black p-2">
            <div className="text-[11px]">
              <h3 className="font-bold text-center underline mb-4 text-sm">Detalle de la composición salarial</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-4">
                <div><span className="font-bold">Total Costo Empleador:</span></div> <div className="text-right">{formatearMoneda(liquidacion.costoTotalEmpleador)}</div>
                <div>Sueldo Bruto:</div> <div className="text-right">{formatearMoneda(liquidacion.brutoTotal)}</div>
                <div>Contribuciones Patronales:</div> <div className="text-right">{formatearMoneda(liquidacion.totalAportesPatronales)}</div>
                <div className="col-span-2 border-b border-gray-400 my-1"></div>
                <div><span className="font-bold">Sueldo Neto Trabajador:</span></div> <div className="text-right font-bold text-blue-700">{formatearMoneda(liquidacion.netoTotal)}</div>
                <div>Total Descuentos:</div> <div className="text-right text-red-600">{formatearMoneda(liquidacion.totalDescuentos)}</div>
              </div>
            </div>
            
            <div className="flex flex-col items-center">
              <h3 className="font-bold text-sm">Costo total empleador</h3>
              {/* Importante: isAnimationActive={false} para que html2canvas pueda tomar la foto del gráfico */}
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={datosGrafico} cx="50%" cy="50%" outerRadius={70} dataKey="value" isAnimationActive={false}>
                    {datosGrafico.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORES[index % COLORES.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatearMoneda(value)} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}