import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { calcularLiquidacion } from "../utils/calculadora";
import { crearPDF, nombreArchivoBono } from "../utils/pdf";
import { formatearMoneda, MESES_ANIO } from "../utils/formato";
import type { Convenio, DatosFormulario } from "../types/bono";

interface Props {
  convenios: Convenio[];
}

const CLAVE_EMPRESA = "rrhh_empresa";

const hoyISO = () => new Date().toISOString().slice(0, 10);

const datosIniciales = (): DatosFormulario => {
  const base: DatosFormulario = {
    empresa: "BURGUEROS SAS",
    domicilio: "Bolulogme Sur Mer 241, Mendoza.",
    cuit: "30-71868079-0",
    lugar: "Mendoza",
    mes: "SEPTIEMBRE",
    anio: "2026",
    q: "S",
    fechaPagoAportes: "2026-10-10",
    fechaEmision: hoyISO(),
    empleado: "DENARO MARIA PAZ",
    legajo: "196",
    antiguedad: "",
    fechaIngreso: "2026-06-16",
    categoria: "COCINERO",
    cuil: "27-46662606-1",
    banco: "MACRO",
    valorBasico: 645000,
    unidades: 30,
    baseAdicionales: 495000,
    montosFijos: {},
  };
  try {
    const guardado = localStorage.getItem(CLAVE_EMPRESA);
    if (guardado) return { ...base, ...JSON.parse(guardado) };
  } catch {
    /* sin datos guardados */
  }
  return base;
};

const claseInput = "w-full p-2 border border-gray-300 rounded text-sm outline-none focus:border-blue-500";

function Campo({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-medium text-gray-600 mb-1">{label}</span>
      {children}
    </label>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 border-b pb-1 mb-3">{titulo}</h3>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </section>
  );
}

export default function NuevoBono({ convenios }: Props) {
  const [convenioId, setConvenioId] = useState(convenios[0]?.id || "");
  const [datos, setDatos] = useState<DatosFormulario>(datosIniciales);

  const convenio = convenios.find((c) => c.id === convenioId) ?? convenios[0];
  const porHora = convenio?.unidadBasico === "HORAS";

  const fijosEditables = useMemo(
    () =>
      (convenio?.reglas ?? []).filter(
        (r) => r.metodo === "MONTO_FIJO" && r.tipo !== "APORTE_PATRONAL",
      ),
    [convenio],
  );

  const liquidacion = useMemo(() => {
    const montosFijos: Record<string, number> = {};
    for (const [id, v] of Object.entries(datos.montosFijos)) if (v !== "") montosFijos[id] = Number(v);
    return calcularLiquidacion(
      {
        valorBasico: Number(datos.valorBasico) || 0,
        unidades: Number(datos.unidades) || 0,
        baseAdicionales: Number(datos.baseAdicionales) || undefined,
        montosFijos,
      },
      convenio,
    );
  }, [datos, convenio]);

  const [urlPDF, setUrlPDF] = useState<{
    url: string;
    datos: DatosFormulario;
    liquidacion: typeof liquidacion;
    convenio: Convenio | undefined;
  } | null>(null);
  const vistaPreviaPDF = liquidacion.valido && urlPDF?.datos === datos &&
    urlPDF.liquidacion === liquidacion && urlPDF.convenio === convenio
    ? urlPDF.url
    : null;

  // Recuerda los datos de la empresa para la próxima vez.
  useEffect(() => {
    const { empresa, domicilio, cuit, lugar, banco } = datos;
    localStorage.setItem(CLAVE_EMPRESA, JSON.stringify({ empresa, domicilio, cuit, lugar, banco }));
  }, [datos.empresa, datos.domicilio, datos.cuit, datos.lugar, datos.banco]); // eslint-disable-line react-hooks/exhaustive-deps

  // Vista previa: es el mismo PDF que se descarga.
  useEffect(() => {
    if (!liquidacion.valido) return;
    let url: string | null = null;
    const t = setTimeout(() => {
      url = URL.createObjectURL(crearPDF(datos, liquidacion, convenio).output("blob"));
      setUrlPDF({ url, datos, liquidacion, convenio });
    }, 250);
    return () => {
      clearTimeout(t);
      if (url) URL.revokeObjectURL(url);
    };
  }, [datos, liquidacion, convenio]);

  const set = <K extends keyof DatosFormulario>(campo: K, valor: DatosFormulario[K]) =>
    setDatos((prev) => ({ ...prev, [campo]: valor }));

  const texto = (campo: keyof DatosFormulario) => ({
    value: String(datos[campo] ?? ""),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(campo, e.target.value as never),
    className: claseInput,
  });

  const numero = (campo: "valorBasico" | "unidades" | "baseAdicionales") => ({
    type: "number" as const,
    min: 0,
    step: "any",
    value: datos[campo],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      set(campo, e.target.value === "" ? "" : Number(e.target.value)),
    className: claseInput,
  });

  const descargar = () => {
    if (!liquidacion.valido || !datos.empleado) return;
    crearPDF(datos, liquidacion, convenio).save(nombreArchivoBono(datos));
  };

  if (convenios.length === 0 || !convenio) {
    return <div className="text-center p-10">No hay convenios cargados. Andá a "Configurar Convenios".</div>;
  }

  return (
    <div className="mx-auto grid grid-cols-1 xl:grid-cols-12 gap-6">
      {/* FORMULARIO */}
      <div className="xl:col-span-4 bg-white p-6 rounded-lg shadow-md border border-gray-200 overflow-y-auto xl:max-h-[88vh]">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Datos del recibo</h2>

        <Seccion titulo="Convenio">
          <Campo label="Convenio aplicado" className="col-span-2">
            <select className={claseInput} value={convenio.id} onChange={(e) => setConvenioId(e.target.value)}>
              {convenios.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </Campo>
        </Seccion>

        <Seccion titulo="Sueldo">
          <Campo label={porHora ? "Valor hora ($)" : "Sueldo básico mensual ($)"}>
            <input {...numero("valorBasico")} />
          </Campo>
          <Campo label={porHora ? "Horas trabajadas" : "Días trabajados (de 30)"}>
            <input {...numero("unidades")} />
          </Campo>
          <Campo
            label={`Base de adicionales ${porHora ? "(valor hora)" : "(mensual)"} — opcional`}
            className="col-span-2"
          >
            <input {...numero("baseAdicionales")} placeholder="Vacío = se usa el sueldo básico" />
          </Campo>
          {fijosEditables.map((r) => (
            <Campo key={r.id} label={`${r.nombre} ($ fijo)`} className="col-span-2">
              <input
                type="number"
                min={0}
                step="any"
                className={claseInput}
                placeholder={String(r.montoFijo)}
                value={datos.montosFijos[r.id] ?? ""}
                onChange={(e) =>
                  setDatos((prev) => ({
                    ...prev,
                    montosFijos: {
                      ...prev.montosFijos,
                      [r.id]: e.target.value === "" ? "" : Number(e.target.value),
                    },
                  }))
                }
              />
            </Campo>
          ))}
        </Seccion>

        <Seccion titulo="Empleado">
          <Campo label="Apellido y nombre" className="col-span-2"><input {...texto("empleado")} /></Campo>
          <Campo label="N° legajo"><input {...texto("legajo")} /></Campo>
          <Campo label="C.U.I.L."><input {...texto("cuil")} /></Campo>
          <Campo label="Fecha de ingreso">
            <input type="date" value={datos.fechaIngreso} onChange={(e) => set("fechaIngreso", e.target.value)} className={claseInput} />
          </Campo>
          <Campo label="Antigüedad"><input {...texto("antiguedad")} /></Campo>
          <Campo label="Categoría laboral" className="col-span-2"><input {...texto("categoria")} /></Campo>
        </Seccion>

        <Seccion titulo="Período y pago">
          <Campo label="Mes">
            <select className={claseInput} value={datos.mes} onChange={(e) => set("mes", e.target.value)}>
              {MESES_ANIO.map((m) => <option key={m}>{m}</option>)}
            </select>
          </Campo>
          <Campo label="Año"><input {...texto("anio")} /></Campo>
          <Campo label="Q."><input {...texto("q")} /></Campo>
          <Campo label="Banco"><input {...texto("banco")} /></Campo>
          <Campo label="Fecha pago de aportes">
            <input type="date" value={datos.fechaPagoAportes} onChange={(e) => set("fechaPagoAportes", e.target.value)} className={claseInput} />
          </Campo>
          <Campo label="Fecha del recibo">
            <input type="date" value={datos.fechaEmision} onChange={(e) => set("fechaEmision", e.target.value)} className={claseInput} />
          </Campo>
        </Seccion>

        <Seccion titulo="Empresa">
          <Campo label="Razón social" className="col-span-2"><input {...texto("empresa")} /></Campo>
          <Campo label="Domicilio" className="col-span-2"><input {...texto("domicilio")} /></Campo>
          <Campo label="C.U.I.T."><input {...texto("cuit")} /></Campo>
          <Campo label="Lugar de emisión"><input {...texto("lugar")} /></Campo>
        </Seccion>
      </div>

      {/* VISTA PREVIA + DESCARGA */}
      <div className="xl:col-span-8 flex flex-col gap-4">
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 flex flex-wrap items-center gap-6">
          {liquidacion.valido ? (
            <>
              <Dato titulo="Bruto" valor={formatearMoneda(liquidacion.bruto)} />
              <Dato titulo="Descuentos" valor={formatearMoneda(liquidacion.totalDescuentos)} />
              <Dato titulo="Neto" valor={formatearMoneda(liquidacion.neto)} destacado />
              <Dato titulo="Costo empleador" valor={formatearMoneda(liquidacion.costoTotalEmpleador)} />
            </>
          ) : (
            <span className="text-sm text-gray-500">Cargá el sueldo y las {porHora ? "horas" : "días"} trabajados para ver el recibo.</span>
          )}
          <button
            onClick={descargar}
            disabled={!liquidacion.valido || !datos.empleado}
            className="ml-auto bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-2.5 px-5 rounded-md flex items-center gap-2"
          >
            <Download size={18} /> Descargar PDF
          </button>
        </div>

        {vistaPreviaPDF && (
          <a href={vistaPreviaPDF} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline -mb-2">
            ¿No ves la vista previa? Abrir el PDF en una pestaña nueva
          </a>
        )}
        <div className="bg-gray-200 rounded-lg border border-gray-300 overflow-hidden h-[80vh]">
          {vistaPreviaPDF ? (
            <iframe title="Vista previa del recibo" src={`${vistaPreviaPDF}#view=FitH`} className="w-full h-full bg-white" />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm">Sin vista previa</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Dato({ titulo, valor, destacado = false }: { titulo: string; valor: string; destacado?: boolean }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{titulo}</div>
      <div className={destacado ? "text-lg font-bold text-blue-800" : "text-base font-semibold text-gray-800"}>{valor}</div>
    </div>
  );
}
