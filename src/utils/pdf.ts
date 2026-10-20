import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';

export const generarPDF = async (elementoId: string, nombreArchivo: string) => {
  const elemento = document.getElementById(elementoId);
  if (!elemento) {
    alert("Error al encontrar el recibo para exportar.");
    return;
  }

  try {
    // toPng utiliza el motor nativo del navegador, soportando oklch() de Tailwind v4
    const dataUrl = await toPng(elemento, { 
      quality: 1, 
      pixelRatio: 2, // Mantiene la alta resolución
      backgroundColor: '#ffffff' // Asegura que el fondo sea blanco y no transparente
    });
    
    // Configuramos el PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    // Calculamos el alto proporcional para que no se deforme
    const pdfHeight = (elemento.offsetHeight * pdfWidth) / elemento.offsetWidth;
    
    pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${nombreArchivo}.pdf`);
  } catch (error) {
    console.error("Error generando PDF:", error);
    alert("Hubo un error al generar el PDF.");
  }
};