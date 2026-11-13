// ============================================================
// SERVICIO DE GESTIÓN Y PERSISTENCIA DE LOGOS Y MEMBRETE INSTITUCIONAL
// Permite cargar, previsualizar y aplicar logotipos personalizados
// en la exportación oficial de los 15 formatos PDF (NOM-004 / SINBA)
// ============================================================

import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { Response } from 'express';
import pool from '../config/database';

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

export class LogoConfigService {
  private static config: {
    tipo_encabezado: 'banner' | 'logos_individuales';
    usar_predeterminado: boolean;
    texto_linea1: string;
    texto_linea2: string;
    texto_linea3: string;
    banner_altura: number;
    banner_modo_ajuste: 'fit' | 'stretch';
    distribucion_logos: 'auto' | 'esquinas_y_centro' | 'todos_al_centro';
    updated_at?: string;
    updated_by?: number;
  } = {
    tipo_encabezado: 'banner',
    usar_predeterminado: true,
    texto_linea1: 'GOBIERNO DE MÉXICO',
    texto_linea2: 'SERVICIOS DE SALUD IMSS-BIENESTAR',
    texto_linea3: 'HOSPITAL GENERAL SAN FELIPE DEL PROGRESO',
    banner_altura: 38,
    banner_modo_ajuste: 'fit',
    distribucion_logos: 'auto',
  };

  private static cachedBannerBuffer: Buffer | null = null;
  private static cachedLogoIzqBuffer: Buffer | null = null;
  private static cachedLogoDerBuffer: Buffer | null = null;
  private static cachedLogoCentralBuffer: Buffer | null = null;
  private static cachedLogoCentral2Buffer: Buffer | null = null;
  private static isInitialized = false;

  public static isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Directorio persistente para almacenar los archivos de imagen cargados
   */
  public static getUploadsDir(): string {
    const candidates = [
      path.resolve(__dirname, '../../uploads/logos'),
      path.resolve(__dirname, '../uploads/logos'),
      path.resolve(process.cwd(), 'backend/uploads/logos'),
      path.resolve(process.cwd(), 'uploads/logos'),
    ];
    for (const d of candidates) {
      if (fs.existsSync(d)) return d;
    }
    const defaultDir = path.resolve(process.cwd(), 'backend/uploads/logos');
    fs.mkdirSync(defaultDir, { recursive: true });
    return defaultDir;
  }

  /**
   * Resuelve la ruta del banner oficial predeterminado ISEM
   */
  public static getDefaultBannerPath(): string | null {
    const candidates = [
      path.resolve(__dirname, '../assets/imss_bienestar_banner.png'),
      path.resolve(__dirname, '../../src/assets/imss_bienestar_banner.png'),
      path.resolve(process.cwd(), 'backend/src/assets/imss_bienestar_banner.png'),
      path.resolve(process.cwd(), 'src/assets/imss_bienestar_banner.png'),
      path.resolve(process.cwd(), 'backend/dist/assets/imss_bienestar_banner.png'),
      path.resolve(process.cwd(), 'dist/assets/imss_bienestar_banner.png'),
      path.resolve(__dirname, '../assets/isem_header_banner.png'),
      path.resolve(__dirname, '../../src/assets/isem_header_banner.png'),
      path.resolve(process.cwd(), 'backend/src/assets/isem_header_banner.png'),
      path.resolve(process.cwd(), 'src/assets/isem_header_banner.png'),
      path.resolve(process.cwd(), 'backend/dist/assets/isem_header_banner.png'),
      path.resolve(process.cwd(), 'dist/assets/isem_header_banner.png'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  }

  /**
   * Resuelve la ruta del logotipo oficial IMSS Bienestar (alta resolución, sin recorte)
   */
  public static getOfficialLogoPath(): string | null {
    return this.getLogoImssBienestarPath();
  }

  /**
   * Resuelve la ruta del logotipo oficial de Gobierno de México (Escudo Nacional)
   */
  public static getLogoGobiernoMexicoPath(): string | null {
    const candidates = [
      path.resolve(__dirname, '../assets/logo_gobierno_mexico.png'),
      path.resolve(__dirname, '../../src/assets/logo_gobierno_mexico.png'),
      path.resolve(process.cwd(), 'backend/src/assets/logo_gobierno_mexico.png'),
      path.resolve(process.cwd(), 'src/assets/logo_gobierno_mexico.png'),
      path.resolve(process.cwd(), 'backend/dist/assets/logo_gobierno_mexico.png'),
      path.resolve(process.cwd(), 'dist/assets/logo_gobierno_mexico.png'),
      path.resolve(process.cwd(), 'frontend/public/logo_gobierno_mexico.png'),
      path.resolve(__dirname, '../../../frontend/public/logo_gobierno_mexico.png'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  }

  /**
   * Resuelve la ruta del logotipo oficial IMSS Bienestar
   */
  public static getLogoImssBienestarPath(): string | null {
    const candidates = [
      path.resolve(__dirname, '../assets/logo_imss_bienestar.png'),
      path.resolve(__dirname, '../../src/assets/logo_imss_bienestar.png'),
      path.resolve(process.cwd(), 'backend/src/assets/logo_imss_bienestar.png'),
      path.resolve(process.cwd(), 'src/assets/logo_imss_bienestar.png'),
      path.resolve(process.cwd(), 'backend/dist/assets/logo_imss_bienestar.png'),
      path.resolve(process.cwd(), 'dist/assets/logo_imss_bienestar.png'),
      path.resolve(process.cwd(), 'frontend/public/logo_imss_bienestar.png'),
      path.resolve(__dirname, '../../../frontend/public/logo_imss_bienestar.png'),
      path.resolve(__dirname, '../assets/imss-bienestar-logo.png'),
      path.resolve(__dirname, '../../src/assets/imss-bienestar-logo.png'),
      path.resolve(process.cwd(), 'backend/src/assets/imss-bienestar-logo.png'),
      path.resolve(process.cwd(), 'src/assets/imss-bienestar-logo.png'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  }

  /**
   * Inicializa la configuración desde la base de datos y carga buffers en memoria
   */
  public static async init() {
    try {
      // 1. Asegurar tabla en la base de datos
      await pool.query(`
        CREATE TABLE IF NOT EXISTS configuracion_sistema (
          clave VARCHAR(100) PRIMARY KEY,
          valor TEXT,
          descripcion VARCHAR(255),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          updated_by INT REFERENCES usuarios(id_usuario)
        );
      `);

      // 2. Leer registros de configuración
      const res = await pool.query('SELECT clave, valor, updated_at, updated_by FROM configuracion_sistema');
      const rows = res.rows;
      const configMap: Record<string, string> = {};
      let lastUpdated: string | undefined;

      for (const r of rows) {
        configMap[r.clave] = r.valor;
        if (r.updated_at) lastUpdated = r.updated_at;
      }

      if (configMap.tipo_encabezado) {
        this.config.tipo_encabezado = configMap.tipo_encabezado as any;
      }
      if (configMap.usar_predeterminado !== undefined) {
        this.config.usar_predeterminado = configMap.usar_predeterminado === 'true';
      }
      if (configMap.texto_linea1) this.config.texto_linea1 = configMap.texto_linea1;
      if (configMap.texto_linea2) this.config.texto_linea2 = configMap.texto_linea2;
      if (configMap.texto_linea3) this.config.texto_linea3 = configMap.texto_linea3;
      if (configMap.banner_altura) this.config.banner_altura = parseInt(configMap.banner_altura, 10) || 38;
      if (configMap.banner_modo_ajuste) this.config.banner_modo_ajuste = configMap.banner_modo_ajuste as any;
      if (configMap.distribucion_logos) this.config.distribucion_logos = configMap.distribucion_logos as any;
      if (lastUpdated) this.config.updated_at = lastUpdated;

      // 3. Cargar imágenes a buffer de memoria desde disco o BD
      const uploadsDir = this.getUploadsDir();

      // Banner personalizado
      const bannerPath = path.join(uploadsDir, 'banner_custom.png');
      if (fs.existsSync(bannerPath)) {
        this.cachedBannerBuffer = fs.readFileSync(bannerPath);
      } else if (configMap.banner_base64) {
        this.cachedBannerBuffer = this.parseBase64ToBuffer(configMap.banner_base64);
        if (this.cachedBannerBuffer) {
          fs.writeFileSync(bannerPath, this.cachedBannerBuffer);
        }
      }

      // Logo izquierdo
      const logoIzqPath = path.join(uploadsDir, 'logo_izquierdo.png');
      if (fs.existsSync(logoIzqPath)) {
        this.cachedLogoIzqBuffer = fs.readFileSync(logoIzqPath);
      } else if (configMap.logo_izquierdo_base64) {
        this.cachedLogoIzqBuffer = this.parseBase64ToBuffer(configMap.logo_izquierdo_base64);
        if (this.cachedLogoIzqBuffer) {
          fs.writeFileSync(logoIzqPath, this.cachedLogoIzqBuffer);
        }
      }

      // Logo derecho
      const logoDerPath = path.join(uploadsDir, 'logo_derecho.png');
      if (fs.existsSync(logoDerPath)) {
        this.cachedLogoDerBuffer = fs.readFileSync(logoDerPath);
      } else if (configMap.logo_derecho_base64) {
        this.cachedLogoDerBuffer = this.parseBase64ToBuffer(configMap.logo_derecho_base64);
        if (this.cachedLogoDerBuffer) {
          fs.writeFileSync(logoDerPath, this.cachedLogoDerBuffer);
        }
      }

      // Logo central 1
      const logoCentralPath = path.join(uploadsDir, 'logo_central.png');
      if (fs.existsSync(logoCentralPath)) {
        this.cachedLogoCentralBuffer = fs.readFileSync(logoCentralPath);
      } else if (configMap.logo_central_base64) {
        this.cachedLogoCentralBuffer = this.parseBase64ToBuffer(configMap.logo_central_base64);
        if (this.cachedLogoCentralBuffer) {
          fs.writeFileSync(logoCentralPath, this.cachedLogoCentralBuffer);
        }
      }

      // Logo central 2
      const logoCentral2Path = path.join(uploadsDir, 'logo_central2.png');
      if (fs.existsSync(logoCentral2Path)) {
        this.cachedLogoCentral2Buffer = fs.readFileSync(logoCentral2Path);
      } else if (configMap.logo_central2_base64) {
        this.cachedLogoCentral2Buffer = this.parseBase64ToBuffer(configMap.logo_central2_base64);
        if (this.cachedLogoCentral2Buffer) {
          fs.writeFileSync(logoCentral2Path, this.cachedLogoCentral2Buffer);
        }
      }

      this.isInitialized = true;
      console.log('🏛️  Configuración de membrete y logos inicializada (predeterminado:', this.config.usar_predeterminado, ')');
    } catch (err) {
      console.error('⚠️  Error al inicializar LogoConfigService:', err);
    }
  }

  /**
   * Helper para convertir Data URI o base64 a Buffer
   */
  private static parseBase64ToBuffer(data: string): Buffer | null {
    if (!data) return null;
    try {
      const match = data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      const raw = match ? match[2] : data;
      return Buffer.from(raw, 'base64');
    } catch (e) {
      console.error('Error parseando base64:', e);
      return null;
    }
  }

  /**
   * Guarda un valor en la tabla configuracion_sistema
   */
  private static async setDbValue(clave: string, valor: string, descripcion: string, userId?: number) {
    await pool.query(
      `INSERT INTO configuracion_sistema (clave, valor, descripcion, updated_at, updated_by)
       VALUES ($1, $2, $3, NOW(), $4)
       ON CONFLICT (clave) DO UPDATE
       SET valor = EXCLUDED.valor, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
      [clave, valor, descripcion, userId || null]
    );
  }

  /**
   * Retorna la configuración activa formateada para la API y UI
   */
  public static getConfig(): LogoConfigData {
    const isDefault = this.config.usar_predeterminado;
    const tieneIzq = isDefault
      ? !!this.getLogoGobiernoMexicoPath()
      : (!!this.cachedLogoIzqBuffer || !!this.getLogoGobiernoMexicoPath());
    const tieneDer = isDefault
      ? !!this.getLogoImssBienestarPath()
      : (!!this.cachedLogoDerBuffer || !!this.getLogoImssBienestarPath());
    const tieneCent = isDefault ? false : !!this.cachedLogoCentralBuffer;
    const tieneCent2 = isDefault ? false : !!this.cachedLogoCentral2Buffer;
    const totalLogos = (tieneIzq ? 1 : 0) + (tieneDer ? 1 : 0) + (tieneCent ? 1 : 0) + (tieneCent2 ? 1 : 0);

    return {
      tipo_encabezado: this.config.tipo_encabezado,
      usar_predeterminado: this.config.usar_predeterminado,
      texto_linea1: this.config.texto_linea1,
      texto_linea2: this.config.texto_linea2,
      texto_linea3: this.config.texto_linea3,
      banner_altura: this.config.banner_altura,
      banner_modo_ajuste: this.config.banner_modo_ajuste,
      distribucion_logos: this.config.distribucion_logos,
      tiene_banner_personalizado: !isDefault && !!this.cachedBannerBuffer,
      tiene_logo_izquierdo: tieneIzq,
      tiene_logo_derecho: tieneDer,
      tiene_logo_central: tieneCent,
      tiene_logo_central2: tieneCent2,
      banner_url: (!isDefault && this.cachedBannerBuffer) ? '/api/configuracion/logo/archivo/banner' : '/api/configuracion/logo/archivo/default-banner',
      logo_izquierdo_url: tieneIzq ? '/api/configuracion/logo/archivo/izquierdo' : null,
      logo_derecho_url: tieneDer ? '/api/configuracion/logo/archivo/derecho' : null,
      logo_central_url: tieneCent ? '/api/configuracion/logo/archivo/central' : null,
      logo_central2_url: tieneCent2 ? '/api/configuracion/logo/archivo/central2' : null,
      default_banner_url: '/api/configuracion/logo/archivo/default-banner',
      total_logos_activos: totalLogos,
      updated_at: this.config.updated_at,
    };
  }

  /**
   * Obtiene el nombre de la unidad médica activa
   */
  public static getUnidadMedica(): string {
    return this.config.texto_linea3 || 'Hospital General San Felipe del Progreso';
  }

  /**
   * Actualiza la configuración y almacena archivos en disco y BD
   */
  public static async updateConfig(
    params: {
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
    },
    userId?: number
  ): Promise<LogoConfigData> {
    const uploadsDir = this.getUploadsDir();

    if (params.tipo_encabezado !== undefined) {
      this.config.tipo_encabezado = params.tipo_encabezado;
      await this.setDbValue('tipo_encabezado', params.tipo_encabezado, 'Tipo de encabezado (banner o logos_individuales)', userId);
    }

    if (params.usar_predeterminado !== undefined) {
      this.config.usar_predeterminado = Boolean(params.usar_predeterminado);
      await this.setDbValue('usar_predeterminado', String(this.config.usar_predeterminado), 'Usa banner oficial por defecto', userId);
    }

    if (params.distribucion_logos !== undefined) {
      this.config.distribucion_logos = params.distribucion_logos;
      await this.setDbValue('distribucion_logos', params.distribucion_logos, 'Distribución de logos', userId);
    }

    if (params.texto_linea1 !== undefined) {
      this.config.texto_linea1 = params.texto_linea1;
      await this.setDbValue('texto_linea1', params.texto_linea1, 'Línea 1 del membrete', userId);
    }

    if (params.texto_linea2 !== undefined) {
      this.config.texto_linea2 = params.texto_linea2;
      await this.setDbValue('texto_linea2', params.texto_linea2, 'Línea 2 del membrete', userId);
    }

    if (params.texto_linea3 !== undefined) {
      this.config.texto_linea3 = params.texto_linea3;
      await this.setDbValue('texto_linea3', params.texto_linea3, 'Línea 3 del membrete', userId);
    }

    if (params.banner_altura !== undefined) {
      this.config.banner_altura = Number(params.banner_altura) || 38;
      await this.setDbValue('banner_altura', String(this.config.banner_altura), 'Altura del banner en pt', userId);
    }

    if (params.banner_modo_ajuste !== undefined) {
      this.config.banner_modo_ajuste = params.banner_modo_ajuste;
      await this.setDbValue('banner_modo_ajuste', params.banner_modo_ajuste, 'Modo de ajuste (fit o stretch)', userId);
    }

    // Eliminaciones explícitas de logos
    if (params.eliminar_logo_central) {
      this.cachedLogoCentralBuffer = null;
      const f = path.join(uploadsDir, 'logo_central.png');
      if (fs.existsSync(f)) fs.unlinkSync(f);
      await pool.query("DELETE FROM configuracion_sistema WHERE clave = 'logo_central_base64'");
    }
    if (params.eliminar_logo_central2) {
      this.cachedLogoCentral2Buffer = null;
      const f = path.join(uploadsDir, 'logo_central2.png');
      if (fs.existsSync(f)) fs.unlinkSync(f);
      await pool.query("DELETE FROM configuracion_sistema WHERE clave = 'logo_central2_base64'");
    }
    if (params.eliminar_logo_izquierdo) {
      this.cachedLogoIzqBuffer = null;
      const f = path.join(uploadsDir, 'logo_izquierdo.png');
      if (fs.existsSync(f)) fs.unlinkSync(f);
      await pool.query("DELETE FROM configuracion_sistema WHERE clave = 'logo_izquierdo_base64'");
    }
    if (params.eliminar_logo_derecho) {
      this.cachedLogoDerBuffer = null;
      const f = path.join(uploadsDir, 'logo_derecho.png');
      if (fs.existsSync(f)) fs.unlinkSync(f);
      await pool.query("DELETE FROM configuracion_sistema WHERE clave = 'logo_derecho_base64'");
    }

    // Procesar carga de banner
    if (params.banner_base64) {
      const buffer = this.parseBase64ToBuffer(params.banner_base64);
      if (buffer) {
        this.cachedBannerBuffer = buffer;
        const filePath = path.join(uploadsDir, 'banner_custom.png');
        fs.writeFileSync(filePath, buffer);
        await this.setDbValue('banner_base64', params.banner_base64, 'Banner institucional personalizado (base64)', userId);
        this.config.usar_predeterminado = false;
        await this.setDbValue('usar_predeterminado', 'false', 'Usa banner oficial por defecto', userId);
      }
    }

    // Procesar carga de logo izquierdo
    if (params.logo_izquierdo_base64) {
      const buffer = this.parseBase64ToBuffer(params.logo_izquierdo_base64);
      if (buffer) {
        this.cachedLogoIzqBuffer = buffer;
        const filePath = path.join(uploadsDir, 'logo_izquierdo.png');
        fs.writeFileSync(filePath, buffer);
        await this.setDbValue('logo_izquierdo_base64', params.logo_izquierdo_base64, 'Logo izquierdo (base64)', userId);
        this.config.usar_predeterminado = false;
        await this.setDbValue('usar_predeterminado', 'false', 'Usa banner oficial por defecto', userId);
      }
    }

    // Procesar carga de logo derecho
    if (params.logo_derecho_base64) {
      const buffer = this.parseBase64ToBuffer(params.logo_derecho_base64);
      if (buffer) {
        this.cachedLogoDerBuffer = buffer;
        const filePath = path.join(uploadsDir, 'logo_derecho.png');
        fs.writeFileSync(filePath, buffer);
        await this.setDbValue('logo_derecho_base64', params.logo_derecho_base64, 'Logo derecho (base64)', userId);
        this.config.usar_predeterminado = false;
        await this.setDbValue('usar_predeterminado', 'false', 'Usa banner oficial por defecto', userId);
      }
    }

    // Procesar carga de logo central 1
    if (params.logo_central_base64) {
      const buffer = this.parseBase64ToBuffer(params.logo_central_base64);
      if (buffer) {
        this.cachedLogoCentralBuffer = buffer;
        const filePath = path.join(uploadsDir, 'logo_central.png');
        fs.writeFileSync(filePath, buffer);
        await this.setDbValue('logo_central_base64', params.logo_central_base64, 'Logo central 1 (base64)', userId);
        this.config.usar_predeterminado = false;
        await this.setDbValue('usar_predeterminado', 'false', 'Usa banner oficial por defecto', userId);
      }
    }

    // Procesar carga de logo central 2
    if (params.logo_central2_base64) {
      const buffer = this.parseBase64ToBuffer(params.logo_central2_base64);
      if (buffer) {
        this.cachedLogoCentral2Buffer = buffer;
        const filePath = path.join(uploadsDir, 'logo_central2.png');
        fs.writeFileSync(filePath, buffer);
        await this.setDbValue('logo_central2_base64', params.logo_central2_base64, 'Logo central 2 (base64)', userId);
        this.config.usar_predeterminado = false;
        await this.setDbValue('usar_predeterminado', 'false', 'Usa banner oficial por defecto', userId);
      }
    }

    this.config.updated_at = new Date().toISOString();
    return this.getConfig();
  }

  /**
   * Restablece la configuración al membrete oficial predeterminado
   */
  public static async resetDefault(userId?: number) {
    this.config.usar_predeterminado = true;
    this.config.tipo_encabezado = 'logos_individuales';
    this.config.distribucion_logos = 'auto';
    this.config.texto_linea1 = 'GOBIERNO DE MÉXICO';
    this.config.texto_linea2 = 'SERVICIOS DE SALUD IMSS-BIENESTAR';
    this.config.texto_linea3 = 'HOSPITAL GENERAL SAN FELIPE DEL PROGRESO';
    this.config.banner_altura = 38;
    this.config.banner_modo_ajuste = 'fit';

    this.cachedBannerBuffer = null;
    this.cachedLogoIzqBuffer = null;
    this.cachedLogoDerBuffer = null;
    this.cachedLogoCentralBuffer = null;
    this.cachedLogoCentral2Buffer = null;

    // Eliminar archivos físicos cargados previamente
    const uploadsDir = this.getUploadsDir();
    const filesToDelete = [
      'banner_custom.png',
      'logo_izquierdo.png',
      'logo_derecho.png',
      'logo_central.png',
      'logo_central2.png',
    ];
    for (const f of filesToDelete) {
      const p = path.join(uploadsDir, f);
      if (fs.existsSync(p)) {
        try {
          fs.unlinkSync(p);
        } catch (e) {
          console.error('Error al eliminar archivo en reset:', f, e);
        }
      }
    }

    // Eliminar valores base64 cargados previamente en la base de datos
    await pool.query(
      `DELETE FROM configuracion_sistema WHERE clave IN (
        'banner_base64', 'logo_izquierdo_base64', 'logo_derecho_base64',
        'logo_central_base64', 'logo_central2_base64'
      )`
    );

    // Persistir configuración oficial predeterminada
    await this.setDbValue('usar_predeterminado', 'true', 'Usa banner oficial por defecto', userId);
    await this.setDbValue('tipo_encabezado', 'logos_individuales', 'Tipo de encabezado', userId);
    await this.setDbValue('distribucion_logos', 'auto', 'Distribución de logos', userId);
    await this.setDbValue('texto_linea1', 'GOBIERNO DE MÉXICO', 'Línea 1 del membrete', userId);
    await this.setDbValue('texto_linea2', 'SERVICIOS DE SALUD IMSS-BIENESTAR', 'Línea 2 del membrete', userId);
    await this.setDbValue('texto_linea3', 'HOSPITAL GENERAL SAN FELIPE DEL PROGRESO', 'Línea 3 del membrete', userId);
    await this.setDbValue('banner_altura', '38', 'Altura del banner en pt', userId);
    await this.setDbValue('banner_modo_ajuste', 'fit', 'Modo de ajuste (fit o stretch)', userId);

    this.config.updated_at = new Date().toISOString();
    return this.getConfig();
  }

  /**
   * Obtiene el buffer de imagen activo según el tipo solicitado
   */
  public static getActiveBuffer(
    tipo: 'banner' | 'izquierdo' | 'derecho' | 'central' | 'central2' | 'default-banner'
  ): Buffer | null {
    if (this.config.usar_predeterminado) {
      if (tipo === 'banner' || tipo === 'default-banner') {
        const defPath = this.getDefaultBannerPath();
        if (defPath && fs.existsSync(defPath)) return fs.readFileSync(defPath);
        return null;
      }
      if (tipo === 'izquierdo') {
        const gob = this.getLogoGobiernoMexicoPath();
        if (gob && fs.existsSync(gob)) return fs.readFileSync(gob);
        const off = this.getOfficialLogoPath();
        if (off && fs.existsSync(off)) return fs.readFileSync(off);
        return null;
      }
      if (tipo === 'derecho') {
        const imss = this.getLogoImssBienestarPath();
        if (imss && fs.existsSync(imss)) return fs.readFileSync(imss);
        return null;
      }
      return null;
    }

    if (tipo === 'banner') {
      if (this.cachedBannerBuffer) return this.cachedBannerBuffer;
      const defPath = this.getDefaultBannerPath();
      if (defPath && fs.existsSync(defPath)) return fs.readFileSync(defPath);
      return null;
    }
    if (tipo === 'izquierdo') {
      if (this.cachedLogoIzqBuffer) return this.cachedLogoIzqBuffer;
      const gob = this.getLogoGobiernoMexicoPath();
      if (gob && fs.existsSync(gob)) return fs.readFileSync(gob);
      const off = this.getOfficialLogoPath();
      if (off && fs.existsSync(off)) return fs.readFileSync(off);
      return null;
    }
    if (tipo === 'derecho') {
      if (this.cachedLogoDerBuffer) return this.cachedLogoDerBuffer;
      const imss = this.getLogoImssBienestarPath();
      if (imss && fs.existsSync(imss)) return fs.readFileSync(imss);
      return null;
    }
    if (tipo === 'central') {
      return this.cachedLogoCentralBuffer;
    }
    if (tipo === 'central2') {
      return this.cachedLogoCentral2Buffer;
    }
    if (tipo === 'default-banner') {
      const defPath = this.getDefaultBannerPath();
      if (defPath && fs.existsSync(defPath)) {
        return fs.readFileSync(defPath);
      }
    }
    return null;
  }

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
  public static dibujarEncabezado(
    doc: PDFKit.PDFDocument,
    titulo: string,
    options: { extraHeaderRight?: string; bannerWidth?: number; soloLogos?: boolean; startX?: number } = {}
  ) {
    const startX = options.startX !== undefined ? options.startX : 36;
    const w = options.bannerWidth || 540;
    const cfg = this.config;

    let bannerDrawn = false;

    if (!cfg.usar_predeterminado && cfg.tipo_encabezado === 'banner' && this.cachedBannerBuffer) {
      try {
        const h = cfg.banner_altura || 38;
        doc.image(this.cachedBannerBuffer, startX, 16, { fit: [w, h], align: 'center', valign: 'center' });
        bannerDrawn = true;
      } catch (err) {
        console.error('Error al dibujar banner personalizado en PDF:', err);
      }
    }

    if (!bannerDrawn) {
      try {
        const maxH = 38;
        const logoIzq = (!cfg.usar_predeterminado && this.cachedLogoIzqBuffer)
          ? this.cachedLogoIzqBuffer
          : this.getLogoGobiernoMexicoPath();
        const logoDer = (!cfg.usar_predeterminado && this.cachedLogoDerBuffer)
          ? this.cachedLogoDerBuffer
          : this.getLogoImssBienestarPath();
        const logoCent1 = !cfg.usar_predeterminado ? this.cachedLogoCentralBuffer : null;
        const logoCent2 = !cfg.usar_predeterminado ? this.cachedLogoCentral2Buffer : null;

        const logosCentrales: Buffer[] = [];
        if (logoCent1) logosCentrales.push(logoCent1);
        if (logoCent2) logosCentrales.push(logoCent2);

        const totalLogos = (logoIzq ? 1 : 0) + (logoDer ? 1 : 0) + logosCentrales.length;
        const modo = cfg.distribucion_logos || 'auto';

        if (modo === 'todos_al_centro' && totalLogos > 0) {
          const todosLogos: (string | Buffer)[] = [];
          if (logoIzq) todosLogos.push(logoIzq);
          logosCentrales.forEach((l) => todosLogos.push(l));
          if (logoDer) todosLogos.push(logoDer);

          const itemW = Math.min(80, Math.floor((w - 40) / todosLogos.length));
          const totalWidth = todosLogos.length * itemW + (todosLogos.length - 1) * 12;
          let currentX = startX + (w - totalWidth) / 2;

          todosLogos.forEach((lg) => {
            doc.image(lg, currentX, 14, { fit: [itemW, maxH], align: 'center', valign: 'center' });
            currentX += itemW + 12;
          });

          bannerDrawn = true;
        } else {
          if (logoIzq) {
            const maxIzqW = logosCentrales.length > 0 ? 105 : 120;
            doc.image(logoIzq, startX, 14, { fit: [maxIzqW, maxH], valign: 'center' });
          }

          if (logoDer) {
            const maxDerW = logosCentrales.length > 0 ? 105 : 120;
            doc.image(logoDer, startX + w - maxDerW, 14, { fit: [maxDerW, maxH], align: 'right', valign: 'center' });
          }

          if (logosCentrales.length === 1) {
            const centW = 95;
            const centX = startX + (w - centW) / 2;
            doc.image(logosCentrales[0], centX, 14, { fit: [centW, maxH], align: 'center', valign: 'center' });
          } else if (logosCentrales.length >= 2) {
            const centItemW = 75;
            const centTotalW = centItemW * 2 + 10;
            const centStartX = startX + (w - centTotalW) / 2;

            doc.image(logosCentrales[0], centStartX, 14, { fit: [centItemW, maxH], align: 'center', valign: 'center' });
            doc.image(logosCentrales[1], centStartX + centItemW + 10, 14, { fit: [centItemW, maxH], align: 'center', valign: 'center' });
          }

          bannerDrawn = true;
        }
      } catch (err) {
        console.error('Error al dibujar encabezado oficial en PDF:', err);
        const bannerPath = this.getDefaultBannerPath();
        if (bannerPath) {
          doc.image(bannerPath, startX, 14, { fit: [w, 38], align: 'center', valign: 'center' });
        }
      }
    }

    if (options.soloLogos) {
      return;
    }

    doc.lineWidth(1.2).moveTo(startX, 58).lineTo(startX + w, 58).stroke('#000000');
    doc.lineWidth(0.4).moveTo(startX, 60).lineTo(startX + w, 60).stroke('#000000');

    const titleFont = (doc as any)._registeredFonts?.['Montserrat-Bold'] ? 'Montserrat-Bold' : 'Helvetica-Bold';
    if (options.extraHeaderRight) {
      const rightW = 150;
      doc.fillColor('#000000').fontSize(8).font(titleFont)
        .text(options.extraHeaderRight, startX + w - rightW, 67, { align: 'right', width: rightW });

      doc.fillColor('#000000').fontSize(10).font(titleFont)
        .text(titulo, startX + 20, 66, { align: 'center', width: w - rightW - 20 });
    } else {
      doc.fillColor('#000000').fontSize(10.5).font(titleFont)
        .text(titulo, startX, 66, { align: 'center', width: w });
    }

    doc.lineWidth(0.6).moveTo(startX, 81).lineTo(startX + w, 81).stroke('#000000');
  }

  /**
   * Genera un PDF de muestra oficial para que el usuario pueda verificar
   * cómo se visualiza el membrete y encabezado en un documento real
   */
  public static generarPdfPrueba(res: Response) {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 24, bottom: 24, left: 36, right: 36 },
      info: {
        Title: 'Documento de Muestra - Membrete Oficial',
        Author: 'Sistema de Expediente Clínico Digital',
      },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="Muestra_Membrete_Oficial.pdf"');
    doc.pipe(res);

    this.dibujarEncabezado(doc, 'DOCUMENTO OFICIAL DE PRUEBA / FORMATO MODELO NOM-004-SSA3', {
      extraHeaderRight: 'HOJA No. 1 / EJEMPLO',
    });

    let y = 92;
    doc.lineWidth(0.5).rect(36, y, 540, 48).stroke('#000000');
    doc.fillColor('#0f3f2f').fontSize(7).font('Helvetica-Bold')
      .text('ESTE DOCUMENTO ES UNA VISTA PREVIA GENERADA POR EL SISTEMA', 40, y + 5);
    doc.fillColor('#000000').fontSize(8.5).font('Helvetica-Bold')
      .text('Verificación de membrete, logos institucionales y márgenes de impresión oficial.', 40, y + 18, { width: 532 });
    doc.fontSize(7.5).font('Helvetica')
      .text('Los 15 formatos del expediente clínico utilizarán este encabezado con las dimensiones, sellos y proporciones configuradas.', 40, y + 31, { width: 532 });

    y += 56;

    const cellH = 26;
    doc.lineWidth(0.5).rect(36, y, 270, cellH).stroke('#000000');
    doc.fontSize(6).font('Helvetica').fillColor('#1e293b').text('1/ UNIDAD MÉDICA', 39, y + 2);
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000').text(this.getUnidadMedica(), 39, y + 12);

    doc.lineWidth(0.5).rect(306, y, 130, cellH).stroke('#000000');
    doc.fontSize(6).font('Helvetica').fillColor('#1e293b').text('2/ NO. DE EXPEDIENTE', 309, y + 2);
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000').text('EXP-2026-DEMO', 309, y + 12);

    doc.lineWidth(0.5).rect(436, y, 140, cellH).stroke('#000000');
    doc.fontSize(6).font('Helvetica').fillColor('#1e293b').text('3/ FECHA Y HORA', 439, y + 2);
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000').text(new Date().toLocaleDateString('es-MX'), 439, y + 12);

    y += cellH;

    doc.lineWidth(0.5).rect(36, y, 360, cellH).stroke('#000000');
    doc.fontSize(6).font('Helvetica').fillColor('#1e293b').text('4/ PACIENTE DE PRUEBA', 39, y + 2);
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000').text('GARCÍA LÓPEZ MARÍA GUADALUPE', 39, y + 12);

    doc.lineWidth(0.5).rect(396, y, 180, cellH).stroke('#000000');
    doc.fontSize(6).font('Helvetica').fillColor('#1e293b').text('5/ CURP', 399, y + 2);
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#000000').text('GALM850412MDFRPR01', 399, y + 12);

    y += cellH + 12;

    doc.lineWidth(0.5).rect(36, y, 540, 160).stroke('#000000');
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0f3f2f')
      .text('DOCUMENTOS OFICIALES DEL EXPEDIENTE QUE ADOPTAN ESTE ENCABEZADO:', 42, y + 8);

    const docs = [
      '1. Hoja Frontal del Expediente Clínico',
      '2. Aviso de Privacidad Integral (LGPDPPSO)',
      '3. Carta de Consentimiento Informado',
      '4. Historia Clínica General de Adultos',
      '5. Historia Clínica Pediátrica',
      '6. Consulta de Urgencias y Triage',
      '7. Hoja Diaria del Servicio de Urgencias (SINBA-16)',
      '8. Hoja de Hospitalización (SINBA-14)',
      '9. Hoja de Indicaciones Médicas',
      '10. Notas de Evolución Médica',
      '11. Nota de Egreso y Contrarreferencia',
      '12. Partograma y Curvas de Vigilancia',
      '13. Solicitud de Exámenes de Laboratorio Clínico',
      '14. Solicitud de Examen de Gabinete y Radiología',
      '15. Solicitud-Recepción de Interconsulta Médica',
    ];

    let listY = y + 26;
    for (let i = 0; i < docs.length; i++) {
      const col = i < 8 ? 44 : 300;
      const rowY = i < 8 ? listY + i * 15 : listY + (i - 8) * 15;
      doc.fontSize(7).font('Helvetica').fillColor('#334155').text(docs[i], col, rowY);
    }

    // Pie de página oficial
    doc.lineWidth(0.5).moveTo(36, 730).lineTo(576, 730).stroke('#000000');
    doc.fontSize(6).font('Helvetica').fillColor('#64748b')
      .text('Expediente Clínico Digital — Cumplimiento estricto NOM-004-SSA3-2012 / DGIS-SINBA — Validación de Cabecera Oficial', 36, 734, { align: 'center', width: 540 });

    doc.end();
  }
}
