import React, { useState } from "react";
import { ArrowDown, ArrowUp, Copy, Trash2 } from "lucide-react";
import type {
  BaseCalculo,
  Convenio,
  GrupoCosto,
  MetodoCalculo,
  ReglaConcepto,
  TipoConcepto,
  UnidadBasico,
} from "../types/bono";
import { BASES_PERMITIDAS, NOMBRE_BASE, NOMBRE_GRUPO } from "../utils/calculadora";
import { normalizarRegla } from "../data/convenios";

interface Props {
  convenios: Convenio[];
  setConvenios: React.Dispatch<React.SetStateAction<Convenio[]>>;
}

const SECCIONES: { tipo: TipoConcepto; titulo: string; ayuda: string }[] = [
  { tipo: "REMUNERATIVO", titulo: "Remunerativos", ayuda: "Se suman al sueldo básico y forman la base de aportes y descuentos (ej: presentismo, adicionales)." },
  { tipo: "NO_REMUNERATIVO", titulo: "No remunerativos", ayuda: "Se suman al bruto pero no pagan aportes." },
  { tipo: "DESCUENTO", titulo: "Descuentos al trabajador", ayuda: "Se restan del bruto (jubilación, obra social, sindicato...)." },
  { tipo: "APORTE_PATRONAL", titulo: "Contribuciones del empleador", ayuda: "No se restan al trabajador; suman al costo total del empleador (SIPA, ART, seguros...)." },
];

const nuevoId = () => `r-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const celda = "w-full p-1.5 border border-gray-300 rounded text-sm outline-none focus:border-blue-500";

export default function GestorConvenios({ convenios, setConvenios }: Props) {
  const [convenioActivo, setConvenioActivo] = useState(convenios[0]?.id || "");
  const convenio = convenios.find((c) => c.id === convenioActivo) ?? convenios[0];

  const actualizarConvenio = (cambios: Partial<Convenio>) =>
    setConvenios((prev) => prev.map((c) => (c.id === convenio.id ? { ...c, ...cambios } : c)));

  const actualizarRegla = (id: string, cambios: Partial<ReglaConcepto>) =>
    actualizarConvenio({ reglas: convenio.reglas.map((r) => (r.id === id ? { ...r, ...cambios } : r)) });

  const crearConvenio = () => {
    const nuevo: Convenio = {
      id: `conv-${Date.now()}`,
      nombre: "Nuevo convenio",
      unidadBasico: "DIAS",
      nombreBasico: "Sueldo básico",
      reglas: [
        normalizarRegla({ id: nuevoId(), nombre: "Jubilación", tipo: "DESCUENTO", porcentaje: 0.11, grupo: "SEGURIDAD_SOCIAL" }),
        normalizarRegla({ id: nuevoId(), nombre: "Ley 19.032", tipo: "DESCUENTO", porcentaje: 0.03, grupo: "INSSJP" }),
        normalizarRegla({ id: nuevoId(), nombre: "Obra Social", tipo: "DESCUENTO", porcentaje: 0.03, grupo: "OBRA_SOCIAL" }),
      ],
    };
    setConvenios((prev) => [...prev, nuevo]);
    setConvenioActivo(nuevo.id);
  };

  const duplicarConvenio = () => {
    const copia: Convenio = {
      ...convenio,
      id: `conv-${Date.now()}`,
      nombre: `${convenio.nombre} (copia)`,
      reglas: convenio.reglas.map((r) => ({ ...r, id: nuevoId() })),
    };
    setConvenios((prev) => [...prev, copia]);
    setConvenioActivo(copia.id);
  };

  const eliminarConvenio = () => {
    if (convenios.length <= 1) {
      alert("Tiene que quedar al menos un convenio.");
      return;
    }
    if (!confirm(`¿Eliminar el convenio "${convenio.nombre}"?`)) return;
    const restantes = convenios.filter((c) => c.id !== convenio.id);
    setConvenios(restantes);
    setConvenioActivo(restantes[0].id);
  };

  const agregarConcepto = (tipo: TipoConcepto) =>
    actualizarConvenio({
      reglas: [
        ...convenio.reglas,
        normalizarRegla({ id: nuevoId(), nombre: "Nuevo concepto", tipo, porcentaje: 0.01 }),
      ],
    });

  const eliminarConcepto = (id: string) =>
    actualizarConvenio({ reglas: convenio.reglas.filter((r) => r.id !== id) });

  /** Mueve un concepto dentro de su sección (el orden importa en los remunerativos acumulados). */
  const mover = (id: string, delta: -1 | 1) => {
    const reglas = [...convenio.reglas];
    const i = reglas.findIndex((r) => r.id === id);
    let j = i + delta;
    while (j >= 0 && j < reglas.length && reglas[j].tipo !== reglas[i].tipo) j += delta;
    if (j < 0 || j >= reglas.length) return;
    [reglas[i], reglas[j]] = [reglas[j], reglas[i]];
    actualizarConvenio({ reglas });
  };

  const cambiarTipo = (r: ReglaConcepto, tipo: TipoConcepto) =>
    actualizarRegla(r.id, {
      tipo,
      base: BASES_PERMITIDAS[tipo].includes(r.base) ? r.base : BASES_PERMITIDAS[tipo][0],
    });

  if (!convenio) {
    return (
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md text-center">
        <p className="mb-4">No hay convenios.</p>
        <button onClick={crearConvenio} className="bg-gray-800 text-white px-4 py-2 rounded">+ Crear convenio</button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Editor de convenios</h2>
        <div className="flex gap-2">
          <button onClick={crearConvenio} className="bg-gray-800 hover:bg-black text-white px-4 py-2 rounded text-sm">+ Nuevo convenio</button>
          <button onClick={duplicarConvenio} className="border border-gray-300 hover:bg-gray-50 px-3 py-2 rounded text-sm flex items-center gap-1"><Copy size={15} /> Duplicar</button>
          <button onClick={eliminarConvenio} className="border border-red-300 text-red-700 hover:bg-red-50 px-3 py-2 rounded text-sm flex items-center gap-1"><Trash2 size={15} /> Eliminar</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-gray-50 p-4 rounded border border-gray-200">
        <label className="block md:col-span-2">
          <span className="block text-xs font-medium text-gray-600 mb-1">Convenio seleccionado</span>
          <select className={celda} value={convenio.id} onChange={(e) => setConvenioActivo(e.target.value)}>
            {convenios.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </label>
        <label className="block md:col-span-2">
          <span className="block text-xs font-medium text-gray-600 mb-1">Nombre del convenio</span>
          <input className={`${celda} font-semibold text-blue-800`} value={convenio.nombre} onChange={(e) => actualizarConvenio({ nombre: e.target.value })} />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-gray-600 mb-1">Cómo se liquida el básico</span>
          <select className={celda} value={convenio.unidadBasico} onChange={(e) => actualizarConvenio({ unidadBasico: e.target.value as UnidadBasico })}>
            <option value="DIAS">Mensual (valor ÷ 30 × días)</option>
            <option value="HORAS">Por hora (valor hora × horas)</option>
          </select>
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-gray-600 mb-1">Código del básico (opcional)</span>
          <input className={celda} value={convenio.codigoBasico ?? ""} onChange={(e) => actualizarConvenio({ codigoBasico: e.target.value || undefined })} placeholder="Ej: 1000" />
        </label>
        <label className="block md:col-span-2">
          <span className="block text-xs font-medium text-gray-600 mb-1">Nombre del concepto básico en el recibo</span>
          <input className={celda} value={convenio.nombreBasico} onChange={(e) => actualizarConvenio({ nombreBasico: e.target.value })} />
        </label>
        <label className="block md:col-span-4">
          <span className="block text-xs font-medium text-gray-600 mb-1">Nota al pie del recibo (opcional)</span>
          <input className={celda} value={convenio.nota ?? ""} onChange={(e) => actualizarConvenio({ nota: e.target.value || undefined })} />
        </label>
      </div>

      {SECCIONES.map(({ tipo, titulo, ayuda }) => {
        const reglas = convenio.reglas.filter((r) => r.tipo === tipo);
        const conGrupo = tipo === "DESCUENTO" || tipo === "APORTE_PATRONAL";
        return (
          <section key={tipo} className="mb-8">
            <div className="flex items-baseline justify-between border-b pb-1 mb-2">
              <h3 className="font-semibold text-gray-800">{titulo}</h3>
              <button onClick={() => agregarConcepto(tipo)} className="text-blue-600 text-sm font-medium hover:underline">+ Agregar concepto</button>
            </div>
            <p className="text-xs text-gray-500 mb-3">{ayuda}</p>

            {reglas.length === 0 && <p className="text-sm text-gray-400 italic">Sin conceptos.</p>}
            {reglas.map((r, idx) => (
              <div key={r.id} className="grid grid-cols-[64px_minmax(150px,3fr)_130px_84px_110px_minmax(150px,2fr)_150px_88px] gap-2 items-center mb-2 bg-gray-50 p-2 rounded border border-gray-200 overflow-x-auto">
                <input className={`${celda}`} value={r.codigo ?? ""} placeholder="Cód." onChange={(e) => actualizarRegla(r.id, { codigo: e.target.value || undefined })} />
                <input className={`${celda}`} value={r.nombre} placeholder="Nombre del concepto" onChange={(e) => actualizarRegla(r.id, { nombre: e.target.value })} />
                <select className={`${celda}`} value={r.tipo} onChange={(e) => cambiarTipo(r, e.target.value as TipoConcepto)}>
                  <option value="REMUNERATIVO">Remunerativo</option>
                  <option value="NO_REMUNERATIVO">No remunerativo</option>
                  <option value="DESCUENTO">Descuento</option>
                  <option value="APORTE_PATRONAL">Aporte patronal</option>
                </select>
                <select className={`${celda}`} value={r.metodo} onChange={(e) => actualizarRegla(r.id, { metodo: e.target.value as MetodoCalculo })}>
                  <option value="PORCENTAJE">%</option>
                  <option value="MONTO_FIJO">$ fijo</option>
                </select>
                {r.metodo === "PORCENTAJE" ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="any"
                      className={`${celda} text-right`}
                      value={parseFloat((r.porcentaje * 100).toFixed(4))}
                      onChange={(e) => actualizarRegla(r.id, { porcentaje: Number(e.target.value) / 100 })}
                    />
                    <span className="text-gray-500 text-sm">%</span>
                  </div>
                ) : (
                  <input
                    type="number"
                    step="any"
                    className={`${celda} text-right`}
                    value={r.montoFijo}
                    onChange={(e) => actualizarRegla(r.id, { montoFijo: Number(e.target.value) })}
                  />
                )}
                {r.metodo === "PORCENTAJE" ? (
                  <select className={`${celda}`} title="Sobre qué monto se calcula" value={r.base} onChange={(e) => actualizarRegla(r.id, { base: e.target.value as BaseCalculo })}>
                    {BASES_PERMITIDAS[r.tipo].map((b) => <option key={b} value={b}>sobre: {NOMBRE_BASE[b]}</option>)}
                  </select>
                ) : (
                  <div className="text-xs text-gray-400">monto fijo</div>
                )}
                {conGrupo ? (
                  <select className={`${celda}`} title="Grupo en el detalle y gráfico del recibo" value={r.grupo} onChange={(e) => actualizarRegla(r.id, { grupo: e.target.value as GrupoCosto })}>
                    {(Object.keys(NOMBRE_GRUPO) as GrupoCosto[]).map((g) => <option key={g} value={g}>{NOMBRE_GRUPO[g]}</option>)}
                  </select>
                ) : (
                  <div />
                )}
                <div className="flex justify-end gap-0.5">
                  <button title="Subir" disabled={idx === 0} onClick={() => mover(r.id, -1)} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"><ArrowUp size={15} /></button>
                  <button title="Bajar" disabled={idx === reglas.length - 1} onClick={() => mover(r.id, 1)} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"><ArrowDown size={15} /></button>
                  <button title="Eliminar" onClick={() => eliminarConcepto(r.id)} className="p-1 rounded text-red-600 hover:bg-red-100"><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </section>
        );
      })}

      <p className="text-sm text-green-700">Los cambios se guardan automáticamente en este navegador.</p>
    </div>
  );
}
