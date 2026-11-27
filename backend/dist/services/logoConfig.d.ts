import { Response } from 'express';
export interface LogoConfigData {
    tipo_encabezado: 'banner' | 'logos_individuales';
    usar_predeterminado: boolean;
    texto_linea1: string;
    texto_linea2: string;
    texto_linea3: string;
    banner_altura: number;
    banner_modo_ajuste: 'fit' | 'stretch';
    distribucion_logos: 'auto' | 'esquinas_y_centro' | 'todos_al_centro';
    tiene_banner_personalizado?: boolean;
    tiene_logo_izquierdo?: boolean;
    tiene_logo_derecho?: boolean;
    tiene_logo_central?: boolean;
    tiene_logo_central2?: boolean;
    banner_url?: string;
    logo_izquierdo_url?: string | null;
    logo_derecho_url?: string | null;
    logo_central_url?: string | null;
    logo_central2_url?: string | null;
    default_banner_url?: string;
    total_logos_activos?: number;
    updated_at?: string;
    updated_by_nombre?: string;
}
export declare class LogoConfigService {
    private static config;
    private static cachedBannerBuffer;
    private static cachedLogoIzqBuffer;
    private static cachedLogoDerBuffer;
    private static cachedLogoCentralBuffer;
    private static cachedLogoCentral2Buffer;
    private static isInitialized;
    private static initPromise;
    static isReady(): boolean;
    static ensureInitialized(): Promise<void>;
    /**
     * Directorio persistente para almacenar los archivos de imagen cargados
     */
    static getUploadsDir(): string;
    /**
     * Resuelve la ruta del banner oficial predeterminado ISEM
     */
    static getDefaultBannerPath(): string | null;
    /**
     * Resuelve la ruta del logotipo oficial IMSS Bienestar (alta resolución, sin recorte)
     */
    static getOfficialLogoPath(): string | null;
    /**
     * Resuelve la ruta del logotipo oficial de Gobierno de México (Escudo Nacional)
     */
    static getLogoGobiernoMexicoPath(): string | null;
    /**
     * Resuelve la ruta del logotipo oficial IMSS Bienestar
     */
    static getLogoImssBienestarPath(): string | null;
    /**
     * Inicializa la configuración desde la base de datos y carga buffers en memoria
     */
    static init(): Promise<void>;
    /**
     * Helper para convertir Data URI o base64 a Buffer
     */
    private static parseBase64ToBuffer;
    /**
     * Guarda un valor en la tabla configuracion_sistema
     */
    private static setDbValue;
    /**
     * Retorna la configuración activa formateada para la API y UI
     */
    static getConfig(): LogoConfigData;
    /**
     * Obtiene el nombre de la unidad médica activa
     */
    static getUnidadMedica(): string;
    /**
     * Actualiza la configuración y almacena archivos en disco y BD
     */
    static updateConfig(params: {
        tipo_encabezado?: 'banner' | 'logos_individuales';
        usar_predeterminado?: boolean;
        texto_linea1?: string;
        texto_linea2?: string;
        texto_linea3?: string;
        banner_altura?: number;
        banner_modo_ajuste?: 'fit' | 'stretch';
        distribucion_logos?: 'auto' | 'esquinas_y_centro' | 'todos_al_centro';
        banner_base64?: string;
        logo_izquierdo_base64?: string;
        logo_derecho_base64?: string;
        logo_central_base64?: string;
        logo_central2_base64?: string;
        eliminar_logo_izquierdo?: boolean;
        eliminar_logo_derecho?: boolean;
        eliminar_logo_central?: boolean;
        eliminar_logo_central2?: boolean;
    }, userId?: number): Promise<LogoConfigData>;
    /**
     * Restablece la configuración al membrete oficial predeterminado
     */
    static resetDefault(userId?: number): Promise<LogoConfigData>;
    /**
     * Obtiene el buffer de imagen activo según el tipo solicitado
     */
    static getActiveBuffer(tipo: 'banner' | 'izquierdo' | 'derecho' | 'central' | 'central2' | 'default-banner'): Buffer | null;
    /**
     * Dibuja el encabezado oficial en un documento PDFKit
     * Reemplaza de forma unificada y configurable la cabecera en los 15 formatos
     * Garantiza que los logos mantengan su relación de aspecto natural, sin recortes ni distorsiones
     *
     * Regla de distribución:
     * - Si son exactamente 2 logos: se colocan exclusivamente en cada esquina (izquierda y derecha), y los textos institucionales en el centro.
     * - Si se cargan 3 o más logos: esquinas izquierda y derecha fijas, y los logos adicionales se ubican en el centro.
     * - Si se elige 'todos_al_centro': todos los logos se alinean horizontalmente al centro.
     */
    static dibujarEncabezado(doc: PDFKit.PDFDocument, titulo: string, options?: {
        extraHeaderRight?: string;
        bannerWidth?: number;
        soloLogos?: boolean;
        startX?: number;
    }): void;
    /**
     * Genera un PDF de muestra oficial para que el usuario pueda verificar
     * cómo se visualiza el membrete y encabezado en un documento real
     */
    static generarPdfPrueba(res: Response): void;
}
//# sourceMappingURL=logoConfig.d.ts.map