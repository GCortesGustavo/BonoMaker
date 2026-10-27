import { useMemo, useState } from "react";
import { Archive, FileText } from "lucide-react";
import type { Convenio, DatosFormulario } from "../types/bono";
import { formatearMoneda } from "../utils/formato";
import {
  COLUMNAS_LOTE,
  construirRecibos,
  descargarPDFUnico,
  descargarZip,
  parsearLote,
  validarFila,
} from "../utils/lote";

interface Props {
  datos: DatosFormulario;
  convenio: Convenio;
}

export default function PanelLote({ datos, convenio }: Props) {
  const [texto, setTexto] = useState("");
  const [trabajando, setTrabajando] = useState(false);

  const filas = useMemo(() => parsearLote(texto), [texto]);
  const recibos = useMemo(() => construirRecibos(datos, convenio, filas), [datos, convenio, filas]);

  const errores = recibos.map((r) => validarFila(r.fila) ?? (r.liq.valido ? null : "Falta sueldo o días/horas"));
  const cantErrores = errores.filter(Boolean).length;
  const listo = recibos.length > 0 && cantErrores === 0;
  const totalNeto = recibos.reduce((s, r) => s + r.liq.neto, 0);
  const totalCosto = recibos.reduce((s, r) => s + r.liq.costoTotalEmpleador, 0);

  const zip = async () => {
    setTrabajando(true);
    try {
      await descargarZip(recibos, convenio);
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <details className="bg-white rounded-lg shadow-md border border-gray-200" open>
      <summary className="cursor-pointer px-4 py-3 font-semibold text-gray-800">
        Descarga múltiple (varios empleados)
      </summary>
      <div className="px-4 pb-4 text-sm">
        <p className="text-gray-600 mb-2">
          Todos usan el <b>convenio</b>, el <b>sueldo</b>, los <b>días/horas</b> y el resto de los datos de arriba.
          Pegá un empleado por línea (desde Excel o escribiendo). Solo el nombre es obligatorio; si una persona
          tiene otro sueldo o días, agregá esas columnas en su línea.
        </p>
        <p className="text-xs text-gray-500 mb-2">
          Columnas (separadas por TAB o <code>;</code>): {COLUMNAS_LOTE.join(" | ")}. La categoría vacía usa la del formulario;
          legajo, CUIL y fecha de ingreso vacíos quedan en blanco.
        </p>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={8}
          spellCheck={false}
          placeholder={"PEREZ JUAN CARLOS\t101\t20-12345678-9\nGOMEZ LUIS\t102\t20-23456789-0\nRAMIREZ ANA;103;27-34567890-1;Ayudante;01/03/2024;64;5502"}
          className="w-full p-2 border border-gray-300 rounded font-mono text-xs outline-none focus:border-blue-500"
        />

        {recibos.length > 0 && (
          <>
            <div className="flex flex-wrap gap-x-6 gap-y-1 my-3">
              <span><b>{recibos.length}</b> empleados</span>
              <span>Neto total: <b>{formatearMoneda(totalNeto)}</b></span>
              <span>Costo empleador total: <b>{formatearMoneda(totalCosto)}</b></span>
              {cantErrores > 0 && <span className="text-red-600 font-semibold">{cantErrores} con errores</span>}
            </div>
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded">
              <table className="w-full text-xs">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="text-left p-1.5">#</th>
                    <th className="text-left p-1.5">Nombre</th>
                    <th className="text-left p-1.5">Legajo</th>
                    <th className="text-right p-1.5">Días/Hs</th>
                    <th className="text-right p-1.5">Neto</th>
                    <th className="text-left p-1.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {recibos.map((r, i) => (
                    <tr key={i} className={errores[i] ? "bg-red-50" : i % 2 ? "bg-gray-50" : ""}>
                      <td className="p-1.5">{i + 1}</td>
                      <td className="p-1.5">{r.fila.nombre}</td>
                      <td className="p-1.5">{r.fila.legajo}</td>
                      <td className="p-1.5 text-right">{r.datos.unidades}</td>
                      <td className="p-1.5 text-right">{formatearMoneda(r.liq.neto)}</td>
                      <td className="p-1.5 text-red-600">{errores[i]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="flex flex-wrap gap-3 mt-3">
          <button
            onClick={zip}
            disabled={!listo || trabajando}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-2 px-4 rounded-md flex items-center gap-2"
          >
            <Archive size={17} /> {trabajando ? "Generando..." : `Descargar ZIP (${recibos.length} PDF)`}
          </button>
          <button
            onClick={() => descargarPDFUnico(recibos, convenio)}
            disabled={!listo || trabajando}
            className="border border-gray-300 hover:bg-gray-50 disabled:opacity-40 font-semibold py-2 px-4 rounded-md flex items-center gap-2"
          >
            <FileText size={17} /> Un solo PDF (una hoja por persona)
          </button>
        </div>
      </div>
    </details>
  );
}
