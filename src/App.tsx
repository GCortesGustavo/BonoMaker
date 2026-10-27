import { useState, useEffect } from "react";
import NuevoBono from "./pages/NuevoBono";
import GestorConvenios from "./pages/GestorConvenios";
import { conveniosData, normalizarConvenio } from "./data/convenios";
import type { Convenio } from "./types/bono";

const CLAVE = "rrhh_convenios_v2";
const CLAVE_VIEJA = "rrhh_convenios";

/**
 * Carga los convenios guardados. Si existía el formato anterior, se migran los
 * convenios creados por el usuario (los de ejemplo se reemplazan por los nuevos,
 * que ya traen todos los conceptos).
 */
const cargarConvenios = (): Convenio[] => {
  try {
    const actuales = localStorage.getItem(CLAVE);
    if (actuales) return (JSON.parse(actuales) as Convenio[]).map(normalizarConvenio);

    const viejos = localStorage.getItem(CLAVE_VIEJA);
    if (viejos) {
      const idsBase = new Set(conveniosData.map((c) => c.id));
      const propios = (JSON.parse(viejos) as Convenio[])
        .filter((c) => !idsBase.has(c.id))
        .map(normalizarConvenio);
      return [...conveniosData, ...propios];
    }
  } catch {
    /* datos corruptos: se usan los de ejemplo */
  }
  return conveniosData;
};

export default function App() {
  const [pestaña, setPestaña] = useState<"generador" | "convenios">("generador");
  const [convenios, setConvenios] = useState<Convenio[]>(cargarConvenios);

  useEffect(() => {
    localStorage.setItem(CLAVE, JSON.stringify(convenios));
  }, [convenios]);

  return (
    <div className="min-h-screen bg-gray-100 font-sans flex flex-col">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex gap-4">
          <button
            onClick={() => setPestaña("generador")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${pestaña === "generador" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
          >
            Generador de Bonos
          </button>
          <button
            onClick={() => setPestaña("convenios")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${pestaña === "convenios" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
          >
            Configurar Convenios
          </button>
        </div>
      </nav>

      <main className="flex-1 p-6">
        {pestaña === "generador" ? (
          <NuevoBono convenios={convenios} />
        ) : (
          <GestorConvenios convenios={convenios} setConvenios={setConvenios} />
        )}
      </main>
    </div>
  );
}
