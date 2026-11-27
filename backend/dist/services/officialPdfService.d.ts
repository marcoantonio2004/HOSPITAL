import { Response } from 'express';
export declare class OfficialPdfService {
    private static getTemplatePath;
    private static formatFecha;
    private static dibujarHeaderLogos;
    private static drawText;
    private static sendDoc;
    static generarHojaFrontal(res: Response, datos: any, paciente: any): Promise<void>;
    static generarAvisoPrivacidad(res: Response, datos: any, paciente: any): Promise<void>;
    static generarConsentimiento(res: Response, datos: any, paciente: any): Promise<void>;
    static generarNotaEgreso(res: Response, datos: any, paciente: any): Promise<void>;
    static generarLaboratorio(res: Response, datos: any, paciente: any): Promise<void>;
    static generarGabinete(res: Response, datos: any, paciente: any): Promise<void>;
    static generarInterconsulta(res: Response, datos: any, paciente: any): Promise<void>;
    static generarHCGeneral(res: Response, datos: any, paciente: any): Promise<void>;
    static generarHCPediatrica(res: Response, datos: any, paciente: any): Promise<void>;
    static generarConsultaUrgencias(res: Response, datos: any, paciente: any): Promise<void>;
    static generarIndicaciones(res: Response, datos: any, paciente: any): Promise<void>;
    static generarNotasEvolucion(res: Response, notas: any[], paciente: any): Promise<void>;
    static generarPartograma(res: Response, datos: any, paciente: any): Promise<void>;
    private static drawAt;
    private static drawBoxes;
    private static drawX;
    private static parseFechaParts;
    private static parseHoraParts;
    private static splitNombre;
    static generarSINBA16(res: Response, datos: any, paciente: any): Promise<void>;
    static generarSINBA14(res: Response, datos: any, paciente: any): Promise<void>;
}
//# sourceMappingURL=officialPdfService.d.ts.map