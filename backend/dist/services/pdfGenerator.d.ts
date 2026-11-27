import { Response } from 'express';
export declare class PDFGeneratorService {
    /**
     * Resuelve la ruta de cualquier activo de imagen institucional
     */
    private static getAssetPath;
    /**
     * Resuelve la ruta del banner oficial ISEM
     */
    static getBannerPath(): string | null;
    /**
     * Formatea una fecha al estándar oficial mexicano dd/mm/aaaa
     */
    private static formatFecha;
    private static fontReg;
    private static fontMed;
    private static fontSemi;
    private static fontBold;
    /**
     * Crea documento PDFKit tamaño CARTA con márgenes estándar de los formatos oficiales
     */
    private static crearDoc;
    private static dibujarEncabezadoOficial;
    /**
     * Calcula la altura óptima para una fila de celdas de modo que ningún texto se encime ni se corte
     */
    static calcularAlturaFila(doc: PDFKit.PDFDocument, celdas: Array<{
        w: number;
        label?: string;
        val?: any;
        value?: any;
        isBold?: boolean;
        fontSize?: number;
    }>, minH?: number, maxH?: number): number;
    /**
     * Ajusta y dibuja un bloque de texto dentro de un área (w x h) reduciendo la fuente si el texto es extenso
     */
    private static dibujarTextoAjustado;
    /**
     * Dibuja una celda de formulario oficial con etiqueta y valor auto-ajustables para evitar desbordes o texto encimado
     */
    private static dibujarCelda;
    /**
     * Dibuja una casilla de verificación [X]
     */
    private static dibujarCheckbox;
    /**
     * Dibuja el pie de página oficial con clave de formato
     */
    private static dibujarPie;
    static generarHojaFrontal(res: Response, datos: any, paciente: any): void;
    static generarAvisoPrivacidad(res: Response, datos: any, paciente: any): void;
    static generarConsentimiento(res: Response, datos: any, paciente: any): void;
    static generarHCGeneral(res: Response, datos: any, paciente: any): void;
    static generarHCPediatrica(res: Response, datos: any, paciente: any): void;
    static generarConsultaUrgencias(res: Response, datos: any, paciente: any): void;
    static generarIndicaciones(res: Response, datos: any, paciente: any): void;
    static generarNotasEvolucion(res: Response, notas: any[], paciente: any): void;
    static generarNotaEgreso(res: Response, datos: any, paciente: any): void;
    static generarPartograma(res: Response, datos: any, paciente: any): void;
    static generarLaboratorio(res: Response, datos: any, paciente: any): void;
    static generarGabinete(res: Response, datos: any, paciente: any): void;
    static generarInterconsulta(res: Response, datos: any, paciente: any): void;
    static generarSINBA14(res: Response, datos: any, paciente: any): Promise<void>;
    static generarSINBA16(res: Response, datos: any, paciente: any): Promise<void>;
}
//# sourceMappingURL=pdfGenerator.d.ts.map