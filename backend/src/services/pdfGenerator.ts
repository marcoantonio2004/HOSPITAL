// ============================================================
// SERVICIO DE GENERACIÓN DE PDF OFICIAL (100% FIEL A FORMATOS FÍSICOS)
// Hospital General San Felipe del Progreso — ISEM / NOM-004-SSA3-2012
// Réplica exacta de los documentos oficiales en /docs
// ============================================================

import PDFDocument from 'pdfkit';
import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import { LogoConfigService } from './logoConfig';
import { OfficialPdfService } from './officialPdfService';

export class PDFGeneratorService {
  /**
   * Resuelve la ruta de cualquier activo de imagen institucional
   */
  private static getAssetPath(filename: string): string | null {
    const candidates = [
      path.resolve(__dirname, '../assets', filename),
      path.resolve(__dirname, '../../src/assets', filename),
      path.resolve(process.cwd(), 'backend/src/assets', filename),
      path.resolve(process.cwd(), 'src/assets', filename),
      path.resolve(process.cwd(), 'backend/dist/assets', filename),
      path.resolve(process.cwd(), 'dist/assets', filename),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  }

  /**
   * Resuelve la ruta del banner oficial ISEM
   */
  public static getBannerPath(): string | null {
    return this.getAssetPath('isem_header_banner.png');
  }

  /**
   * Formatea una fecha al estándar oficial mexicano dd/mm/aaaa
   */
  private static formatFecha(val: any): string {
    if (!val) return '--';
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
      const parts = val.substring(0, 10).split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return String(val).substring(0, 10);
      const day = String(d.getUTCDate()).padStart(2, '0');
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const year = d.getUTCFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return String(val);
    }
  }

  private static fontReg(doc: PDFKit.PDFDocument): string {
    return (doc as any)._registeredFonts?.['Montserrat-Regular'] ? 'Montserrat-Regular' : 'Helvetica';
  }

  private static fontMed(doc: PDFKit.PDFDocument): string {
    return (doc as any)._registeredFonts?.['Montserrat-Medium'] ? 'Montserrat-Medium' : 'Helvetica';
  }

  private static fontSemi(doc: PDFKit.PDFDocument): string {
    return (doc as any)._registeredFonts?.['Montserrat-SemiBold'] ? 'Montserrat-SemiBold' : 'Helvetica-Bold';
  }

  private static fontBold(doc: PDFKit.PDFDocument): string {
    return (doc as any)._registeredFonts?.['Montserrat-Bold'] ? 'Montserrat-Bold' : 'Helvetica-Bold';
  }

  /**
   * Crea documento PDFKit tamaño CARTA con márgenes estándar de los formatos oficiales
   */
  private static crearDoc(res: Response, filename: string, options: { landscape?: boolean; size?: string | [number, number]; margins?: any; bufferPages?: boolean } = {}): PDFKit.PDFDocument {
    const doc = new PDFDocument({
      size: (options.size as any) || 'LETTER',
      layout: options.landscape ? 'landscape' : 'portrait',
      margins: options.margins || { top: 24, bottom: 24, left: 36, right: 36 },
      bufferPages: options.bufferPages ?? false,
      info: {
        Title: filename,
        Author: 'Sistema de Expediente Clínico Digital — ISEM',
      },
    });

    const fontCandidates = [
      path.resolve(__dirname, '../assets/fonts'),
      path.resolve(__dirname, '../../src/assets/fonts'),
      path.resolve(process.cwd(), 'backend/src/assets/fonts'),
      path.resolve(process.cwd(), 'backend/dist/assets/fonts'),
      path.resolve(process.cwd(), 'src/assets/fonts'),
    ];
    for (const dir of fontCandidates) {
      const reg = path.join(dir, 'Montserrat-Regular.ttf');
      if (fs.existsSync(reg)) {
        doc.registerFont('Montserrat-Regular', reg);
        doc.registerFont('Montserrat-Medium', path.join(dir, 'Montserrat-Medium.ttf'));
        doc.registerFont('Montserrat-SemiBold', path.join(dir, 'Montserrat-SemiBold.ttf'));
        doc.registerFont('Montserrat-Bold', path.join(dir, 'Montserrat-Bold.ttf'));
        break;
      }
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}.pdf"`);

    doc.pipe(res);
    return doc;
  }

  private static dibujarEncabezadoOficial(doc: PDFKit.PDFDocument, titulo: string, options: { extraHeaderRight?: string; bannerWidth?: number; startX?: number } = {}) {
    LogoConfigService.dibujarEncabezado(doc, titulo, options);
  }

  /**
   * Calcula la altura óptima para una fila de celdas de modo que ningún texto se encime ni se corte
   */
  public static calcularAlturaFila(
    doc: PDFKit.PDFDocument,
    celdas: Array<{ w: number; label?: string; val?: any; value?: any; isBold?: boolean; fontSize?: number }>,
    minH: number = 23.5,
    maxH: number = 48
  ): number {
    let requiredH = minH;
    for (const c of celdas) {
      const rawVal = c.val !== undefined ? c.val : c.value;
      const valStr = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : '';
      if (!valStr) continue;
      const availW = Math.max(16, c.w - 6);
      const baseF = c.fontSize || 7.2;
      doc.font(c.isBold ? this.fontBold(doc) : this.fontSemi(doc)).fontSize(baseF);
      const singleLineW = doc.widthOfString(valStr);
      // Si no cabe ni reduciendo a 5.6pt en una sola línea, necesitará múltiples líneas
      doc.fontSize(5.6);
      const minSingleLineW = doc.widthOfString(valStr);
      if (singleLineW > availW && minSingleLineW > availW) {
        const wrapFontSize = Math.max(6.0, baseF - 0.6);
        doc.fontSize(wrapFontSize);
        const textH = doc.heightOfString(valStr, { width: availW, lineGap: 0.4 });
        const topOffset = c.label !== '' ? 10.5 : 4;
        const needed = topOffset + textH + 3.5;
        if (needed > requiredH) {
          requiredH = Math.min(maxH, needed);
        }
      }
    }
    return requiredH;
  }

  /**
   * Ajusta y dibuja un bloque de texto dentro de un área (w x h) reduciendo la fuente si el texto es extenso
   */
  private static dibujarTextoAjustado(
    doc: PDFKit.PDFDocument,
    text: string,
    x: number,
    y: number,
    w: number,
    h: number,
    options: {
      font?: string;
      baseFontSize?: number;
      maxFontSize?: number;
      minFontSize?: number;
      isBold?: boolean;
      lineGap?: number;
      align?: 'left' | 'center' | 'right' | 'justify';
      color?: string;
    } = {}
  ): number {
    const cleanText = String(text ?? '').trim();
    if (!cleanText) return 0;

    const fontName = options.font || (options.isBold ? this.fontBold(doc) : this.fontReg(doc));
    const baseSize = options.maxFontSize || options.baseFontSize || 7.0;
    const minSize = options.minFontSize || 4.8;
    const align = options.align || 'left';
    const color = options.color || '#000000';

    let chosenSize = baseSize;
    let chosenGap = options.lineGap !== undefined ? options.lineGap : 1.2;

    doc.font(fontName);
    for (let sz = baseSize; sz >= minSize; sz -= 0.25) {
      const gap = options.lineGap !== undefined
        ? Math.max(0, options.lineGap * (sz / baseSize))
        : Math.max(0.3, (sz / baseSize) * 1.2);
      doc.fontSize(sz);
      const measuredH = doc.heightOfString(cleanText, { width: w, align, lineGap: gap });
      chosenSize = sz;
      chosenGap = gap;
      if (measuredH <= h) break;
    }

    doc.font(fontName).fontSize(chosenSize).fillColor(color)
      .text(cleanText, x, y, {
        width: w,
        height: h,
        align,
        lineGap: chosenGap,
        ellipsis: true,
      });

    return doc.heightOfString(cleanText, { width: w, align, lineGap: chosenGap });
  }

  /**
   * Dibuja una celda de formulario oficial con etiqueta y valor auto-ajustables para evitar desbordes o texto encimado
   */
  private static dibujarCelda(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    value: string | number | undefined | null,
    options: { boldBorder?: boolean; alignRight?: boolean; fontSize?: number; isBold?: boolean } = {}
  ) {
    const border = options.boldBorder ? 1.0 : 0.5;
    doc.lineWidth(border).rect(x, y, w, h).stroke('#000000');

    const availW = Math.max(10, w - 6);
    let labelBottom = y + 2;

    if (label) {
      const labelFont = this.fontMed(doc);
      let lblSize = 5.8;
      doc.font(labelFont).fontSize(lblSize);
      while (lblSize > 4.2 && doc.widthOfString(label) > availW) {
        lblSize -= 0.2;
        doc.fontSize(lblSize);
      }
      doc.fillColor('#1e293b').font(labelFont).fontSize(lblSize)
        .text(label, x + 3, y + 2, { width: availW, height: 8.5, ellipsis: true });
      labelBottom = y + 9.8;
    }

    const valStr = value !== undefined && value !== null ? String(value).trim() : '';
    if (valStr) {
      const valFont = options.isBold ? this.fontBold(doc) : this.fontSemi(doc);
      const baseFSize = options.fontSize || 7.2;
      const availH = Math.max(8, (y + h) - labelBottom - 1.5);
      const align = options.alignRight ? 'right' : 'left';

      doc.font(valFont);
      // 1) Intentar que quepa en 1 sola línea reduciendo ligeramente la fuente (hasta 5.6pt)
      let fitSingleSize = baseFSize;
      let fitsSingleLine = false;
      for (let sz = baseFSize; sz >= 5.6; sz -= 0.2) {
        doc.fontSize(sz);
        if (doc.widthOfString(valStr) <= availW) {
          fitSingleSize = sz;
          fitsSingleLine = true;
          break;
        }
      }

      if (fitsSingleLine) {
        doc.fontSize(fitSingleSize);
        const lineH = doc.currentLineHeight();
        const yPos = label
          ? labelBottom + Math.max(0, (availH - lineH) / 2 - 0.5)
          : y + Math.max(2, (h - lineH) / 2);
        doc.fillColor('#000000').font(valFont).fontSize(fitSingleSize)
          .text(valStr, x + 3, yPos, { width: availW, height: availH, align, ellipsis: true });
      } else {
        // 2) Si el texto es más largo, permitir múltiples líneas ajustando fuente y altura al recuadro
        let multiSize = Math.min(baseFSize, 6.6);
        for (let sz = multiSize; sz >= 4.6; sz -= 0.2) {
          doc.fontSize(sz);
          const th = doc.heightOfString(valStr, { width: availW, lineGap: 0.2 });
          multiSize = sz;
          if (th <= availH) break;
        }
        doc.fontSize(multiSize);
        const th = Math.min(availH, doc.heightOfString(valStr, { width: availW, lineGap: 0.2 }));
        const yPos = labelBottom + Math.max(0, (availH - th) / 2 - 0.5);
        doc.fillColor('#000000').font(valFont).fontSize(multiSize)
          .text(valStr, x + 3, yPos, { width: availW, height: availH, align, lineGap: 0.2, ellipsis: true });
      }
    }
  }

  /**
   * Dibuja una casilla de verificación [X]
   */
  private static dibujarCheckbox(doc: PDFKit.PDFDocument, x: number, y: number, label: string, checked: boolean) {
    doc.lineWidth(0.5).rect(x, y, 7.5, 7.5).stroke('#000000');
    if (checked) {
      doc.fontSize(6.5).font(this.fontBold(doc)).fillColor('#000000').text('X', x + 1.2, y + 0.8);
    }
    if (label) {
      doc.fontSize(7).font(this.fontReg(doc)).fillColor('#000000').text(label, x + 11, y + 0.8);
    }
  }

  /**
   * Dibuja el pie de página oficial con clave de formato
   */
  private static dibujarPie(doc: PDFKit.PDFDocument, codigoFormato: string, textoAdicional?: string, options: { startX?: number; width?: number } = {}) {
    const startX = options.startX !== undefined ? options.startX : 36;
    const w = options.width || 540;
    const y = 756;
    const boldF = this.fontBold(doc);
    if (textoAdicional) {
      doc.fillColor('#000000').fontSize(6.5).font(boldF)
        .text(textoAdicional, startX, y - 10, { width: w });
    }
    doc.fillColor('#000000').fontSize(7.5).font(boldF)
      .text(codigoFormato, startX, y, { align: 'right', width: w });
  }

  // ============================================================
  // 1. HOJA FRONTAL (Formato 208C0101100000L-028-24)
  // ============================================================
  public static generarHojaFrontal(res: Response, datos: any, paciente: any) {
    const doc = this.crearDoc(res, `Hoja_Frontal_${paciente.expediente_clinico}`, {
      margins: { top: 15, bottom: 15, left: 18, right: 18 },
    });

    const left = 18;
    const totalW = 576;

    const regF = this.fontReg(doc);
    const semiF = this.fontSemi(doc);
    const boldF = this.fontBold(doc);

    LogoConfigService.dibujarEncabezado(doc, '', { startX: left, bannerWidth: totalW, soloLogos: true });

    // Encabezado con doble línea inferior (fiel al formato 208C0101100000L-028-24)
    doc.lineWidth(0.7).moveTo(left, 63.0).lineTo(left + totalW, 63.0).stroke('#000000');
    doc.fontSize(11.0).font(boldF).fillColor('#000000').text('HOJA FRONTAL', left, 67.5, { width: totalW, align: 'center' });
    doc.lineWidth(0.7).moveTo(left, 82.0).lineTo(left + totalW, 82.0).stroke('#000000');
    doc.lineWidth(0.7).moveTo(left, 85.5).lineTo(left + totalW, 85.5).stroke('#000000');

    const nombreComp = `${paciente.apellido_paterno || ''} ${paciente.apellido_materno || ''} ${paciente.nombre || ''}`.replace(/\s+/g, ' ').trim();
    const sexoUpper = String(paciente.sexo || '').toUpperCase();
    const esFem = sexoUpper.startsWith('F') || sexoUpper === 'MUJER';
    const esMasc = sexoUpper.startsWith('M') || sexoUpper.startsWith('H');

    // Fila 1: Unidad Médica | Núm. Expediente | Fecha
    const r1Top = 85.5;
    const r1Bot = 112.5;
    doc.fontSize(7.0).font(regF).fillColor('#000000').text('Unidad Médica', left + 4, r1Top + 2);
    this.dibujarTextoAjustado(doc, datos.unidad_medica || LogoConfigService.getUnidadMedica(), left + 4, r1Top + 12, 368, 12, { maxFontSize: 7.5, minFontSize: 5.5, isBold: true });

    doc.lineWidth(0.7).moveTo(left + 376, r1Top).lineTo(left + 376, r1Bot).stroke('#000000');
    doc.fontSize(7.0).font(regF).fillColor('#000000').text('Núm. Expediente', left + 380, r1Top + 2);
    this.dibujarTextoAjustado(doc, paciente.expediente_clinico || '--', left + 380, r1Top + 12, 92, 12, { maxFontSize: 7.5, minFontSize: 5.5, isBold: true });

    doc.lineWidth(0.7).moveTo(left + 476, r1Top).lineTo(left + 476, r1Bot).stroke('#000000');
    doc.fontSize(7.0).font(regF).fillColor('#000000').text('Fecha', left + 480, r1Top + 2);
    doc.fontSize(7.4).font(semiF).fillColor('#000000').text(this.formatFecha(datos.fecha || new Date()), left + 480, r1Top + 12.5);

    doc.lineWidth(1.3).moveTo(left, r1Bot).lineTo(left + totalW, r1Bot).stroke('#000000');

    // Fila 2: Nombre de la o del Paciente | Fecha de Nacimiento | Edad | Sexo
    const r2Top = r1Bot;
    const r2Bot = 143.0;
    doc.fontSize(7.0).font(regF).fillColor('#000000').text('Nombre de la o del Paciente', left + 4, r2Top + 2);
    this.dibujarTextoAjustado(doc, nombreComp, left + 4, r2Top + 13, 244, 13, { maxFontSize: 7.5, minFontSize: 5.5, isBold: true });

    doc.lineWidth(0.7).moveTo(left + 252, r2Top).lineTo(left + 252, r2Bot).stroke('#000000');
    doc.fontSize(7.0).font(regF).fillColor('#000000').text('Fecha de Nacimiento', left + 256, r2Top + 2);
    doc.fontSize(7.4).font(semiF).fillColor('#000000').text(this.formatFecha(paciente.fecha_nacimiento), left + 256, r2Top + 13.5);

    doc.lineWidth(0.7).moveTo(left + 376, r2Top).lineTo(left + 376, r2Bot).stroke('#000000');
    doc.fontSize(7.0).font(regF).fillColor('#000000').text('Edad', left + 380, r2Top + 2);
    this.dibujarTextoAjustado(doc, `${paciente.edad || '--'} años`, left + 380, r2Top + 13, 58, 12, { maxFontSize: 7.4, minFontSize: 5.5, font: semiF });

    doc.lineWidth(0.7).moveTo(left + 442, r2Top).lineTo(left + 442, r2Bot).stroke('#000000');
    doc.fontSize(7.0).font(regF).fillColor('#000000').text('Sexo', left + 446, r2Top + 2);
    const chkY = r2Top + 12.5;
    doc.lineWidth(0.6).rect(left + 447, chkY, 9.5, 8.5).stroke('#000000');
    if (esFem) doc.fontSize(7.0).font(boldF).fillColor('#000000').text('X', left + 449.5, chkY + 0.8);
    doc.fontSize(6.8).font(regF).fillColor('#000000').text('Femenino', left + 462, chkY + 2.5);

    doc.lineWidth(0.6).rect(left + 503, chkY, 9.5, 8.5).stroke('#000000');
    if (esMasc) doc.fontSize(7.0).font(boldF).fillColor('#000000').text('X', left + 505.5, chkY + 0.8);
    doc.fontSize(6.8).font(regF).fillColor('#000000').text('Masculino', left + 518, chkY + 2.5);

    doc.lineWidth(0.7).moveTo(left, r2Bot).lineTo(left + totalW, r2Bot).stroke('#000000');

    // Fila 3: Dirección | Teléfono
    const r3Top = r2Bot;
    const r3Bot = 168.5;
    const dir = datos.direccion || paciente.domicilio || `${paciente.domicilio_municipio || ''}, ${paciente.domicilio_entidad || ''}`.trim() || 'San Felipe del Progreso';
    doc.fontSize(7.0).font(regF).fillColor('#000000').text('Dirección', left + 4, r3Top + 2);
    this.dibujarTextoAjustado(doc, dir, left + 4, r3Top + 12, 368, 12, { maxFontSize: 7.4, minFontSize: 5.2, font: semiF });

    doc.lineWidth(0.7).moveTo(left + 376, r3Top).lineTo(left + 376, r3Bot).stroke('#000000');
    doc.fontSize(7.0).font(regF).fillColor('#000000').text('Teléfono', left + 380, r3Top + 2);
    this.dibujarTextoAjustado(doc, datos.telefono || paciente.telefono || 'Sin teléfono', left + 380, r3Top + 12, totalW - 384, 12, { maxFontSize: 7.4, minFontSize: 5.5, font: semiF });

    doc.lineWidth(1.3).moveTo(left, r3Bot).lineTo(left + totalW, r3Bot).stroke('#000000');

    // Fila 4: Personal Médico Tratante | Cédula del Personal Médico Tratante
    const r4Top = r3Bot;
    const r4Bot = 193.5;
    const med = datos.personal_medico_tratante || paciente.medico_tratante || 'Personal Médico Tratante';
    doc.fontSize(7.0).font(regF).fillColor('#000000').text('Personal Médico Tratante', left + 4, r4Top + 2);
    this.dibujarTextoAjustado(doc, med, left + 4, r4Top + 12, 368, 12, { maxFontSize: 7.5, minFontSize: 5.5, isBold: true });

    doc.lineWidth(0.7).moveTo(left + 376, r4Top).lineTo(left + 376, r4Bot).stroke('#000000');
    doc.fontSize(7.0).font(regF).fillColor('#000000').text('Cédula del Personal Médico Tratante', left + 380, r4Top + 2);
    this.dibujarTextoAjustado(doc, datos.cedula_profesional || 'En trámite', left + 380, r4Top + 12, totalW - 384, 12, { maxFontSize: 7.4, minFontSize: 5.5, font: semiF });

    doc.lineWidth(1.3).moveTo(left, r4Bot).lineTo(left + totalW, r4Bot).stroke('#000000');

    // Tabla de Diagnósticos (12/ Fecha de Atención | 13/ Diagnósticos | 14/ Fecha de Control Remisión)
    const col1 = 105;
    const col2 = 336;
    const col3 = 135;
    const tblHeaderBot = 217.0;
    const tblBot = 682.0;

    doc.fontSize(7.5).font(regF).fillColor('#000000')
      .text('Fecha de Atención', left, r4Bot + 7.5, { width: col1, align: 'center' })
      .text('Diagnósticos', left + col1, r4Bot + 7.5, { width: col2, align: 'center' })
      .text('Fecha de Control Remisión', left + col1 + col2, r4Bot + 7.5, { width: col3, align: 'center' });

    doc.lineWidth(0.7).moveTo(left, tblHeaderBot).lineTo(left + totalW, tblHeaderBot).stroke('#000000');
    doc.lineWidth(0.7).moveTo(left + col1, r4Bot).lineTo(left + col1, tblBot).stroke('#000000');
    doc.lineWidth(0.7).moveTo(left + col1 + col2, r4Bot).lineTo(left + col1 + col2, tblBot).stroke('#000000');

    const diags = Array.isArray(datos.diagnosticos_json) ? datos.diagnosticos_json : (datos.diagnostico ? [{ diagnostico: datos.diagnostico, fecha_atencion: this.formatFecha(new Date()) }] : []);
    let curY = tblHeaderBot;
    const rowH = (tblBot - tblHeaderBot) / 20;

    for (let r = 0; r < 20; r++) {
      const item = diags[r];
      if (item) {
        this.dibujarTextoAjustado(doc, this.formatFecha(item.fecha_atencion || datos.fecha), left + 4, curY + 5, col1 - 8, rowH - 8, { maxFontSize: 7.2, minFontSize: 5.2, font: regF, align: 'center' });
        this.dibujarTextoAjustado(doc, item.diagnostico || '', left + col1 + 6, curY + 4.5, col2 - 12, rowH - 7, { maxFontSize: 7.5, minFontSize: 5.0, font: semiF, lineGap: 0.5 });
        this.dibujarTextoAjustado(doc, this.formatFecha(item.fecha_control), left + col1 + col2 + 4, curY + 5, col3 - 8, rowH - 8, { maxFontSize: 7.2, minFontSize: 5.2, font: regF, align: 'center' });
      }
      curY += rowH;
      doc.lineWidth(0.7).moveTo(left, curY).lineTo(left + totalW, curY).stroke('#000000');
    }

    // Doble línea inferior de la tabla antes de Grupo Sanguíneo y Factor Rh
    const gsTop = 684.5;
    const gsBot = 705.5;
    doc.lineWidth(0.7).moveTo(left, gsTop).lineTo(left + totalW, gsTop).stroke('#000000');

    doc.fontSize(7.0).font(regF).fillColor('#000000').text('Grupo Sanguíneo', left + 4, gsTop + 2);
    this.dibujarTextoAjustado(doc, datos.grupo_sanguineo || paciente.grupo_sanguineo || 'O', left + 4, gsTop + 10.5, 288, 10, { maxFontSize: 7.5, minFontSize: 5.5, isBold: true });

    doc.lineWidth(0.7).moveTo(left + 296, gsTop).lineTo(left + 296, gsBot).stroke('#000000');
    doc.fontSize(7.0).font(regF).fillColor('#000000').text('Factor Rh', left + 300, gsTop + 2);
    this.dibujarTextoAjustado(doc, datos.factor_rh || paciente.rh || paciente.factor_rh || 'POSITIVO (+)', left + 300, gsTop + 10.5, totalW - 304, 10, { maxFontSize: 7.5, minFontSize: 5.5, isBold: true });

    doc.lineWidth(0.7).moveTo(left, gsBot).lineTo(left + totalW, gsBot).stroke('#000000');

    // 17/ Alérgico a (abierto en extremos laterales con línea horizontal de cierre)
    const alBot = 749.0;
    doc.fontSize(7.0).font(regF).fillColor('#000000').text('Alérgico a', left + 4, gsBot + 2);
    const alergiasVal = datos.alergias || paciente.alergias || 'NEGADAS';
    this.dibujarTextoAjustado(doc, alergiasVal, left + 4, gsBot + 12, totalW - 8, 28, { maxFontSize: 8.0, minFontSize: 5.5, isBold: true, lineGap: 1.0 });
    doc.lineWidth(0.7).moveTo(left, alBot).lineTo(left + totalW, alBot).stroke('#000000');

    doc.fontSize(8.0).font(boldF).fillColor('#000000').text('208C0101100000L-028-24', left, 756, { width: totalW, align: 'right' });
    doc.end();
  }

  // ============================================================
  // 2. AVISO DE PRIVACIDAD (Formato 208C0101100000L-082-24)
  // ============================================================
  public static generarAvisoPrivacidad(res: Response, datos: any, paciente: any) {
    const doc = this.crearDoc(res, `Aviso_Privacidad_${paciente.expediente_clinico}`, {
      margins: { top: 18, bottom: 18, left: 20.5, right: 20.5 },
    });

    const left = 20.5;
    const totalW = 571;
    const textLeft = 26.7;
    const textW = 557.1;
    const indentX = 40.9;
    const indentW = 542.9;

    const regF = this.fontReg(doc);
    const boldF = this.fontBold(doc);

    LogoConfigService.dibujarEncabezado(doc, '', { startX: left, bannerWidth: totalW, soloLogos: true });

    // Encabezado oficial con doble línea inferior idéntica al formato 208C0101100000L-082-24
    doc.lineWidth(0.7).moveTo(left, 63.0).lineTo(left + totalW, 63.0).stroke('#000000');
    doc.fontSize(11.0).font(boldF).fillColor('#000000').text('AVISO DE PRIVACIDAD', left, 67.5, { width: totalW, align: 'center' });
    doc.lineWidth(0.7).moveTo(left, 82.0).lineTo(left + totalW, 82.0).stroke('#000000');
    doc.lineWidth(0.7).moveTo(left, 88.5).lineTo(left + totalW, 88.5).stroke('#000000');

    const p1 = 'El Instituto de Salud del Estado de México, con domicilio en Avenida Independencia Oriente 1009, Col. Reforma y Ferrocarriles Nacionales, C.P. 50070, Toluca, Estado de México y conforme a lo dispuesto en el Decreto del Diario Oficial de la Federación, por el que se expide la Ley General de Protección de Datos Personales en Posesión de Sujetos Obligados, Título Primero, Artículo 3, Fracciones VIII, IX Y X, relacionados con el consentimiento, datos personales y sensibles; Al respecto hacemos de su conocimiento que sus datos personales como nombre completo, dirección, teléfonos de hogar, oficina, móviles y correo electrónico, los utilizaremos para las siguientes finalidades:';

    doc.fontSize(8.0).font(regF).fillColor('#000000')
      .text(p1, textLeft, 100.0, { width: textW, align: 'justify', lineGap: 1.8 });

    let yInc = 165.6;

    doc.fontSize(8.0).font(regF).text('a)', textLeft, yInc);
    doc.text(
      'Prestación de servicios médicos, hospitalización, cirugía, estudios diagnósticos, atención de enfermería, servicios farmacéuticos, servicios de banco de sangre, hemodiálisis, tratamientos oncológicos, análisis de laboratorio, radiología e imagen, estudios y análisis patológicos, terapia, rehabilitación, dieta, nutrición, odontología y demás servicios y prestaciones.',
      indentX, yInc, { width: indentW, align: 'justify', lineGap: 1.8 }
    );
    yInc = 207.2;

    doc.text('b)', textLeft, yInc);
    doc.text(
      'Creación, estudio, análisis, actualización y conservación del Expediente Clínico.',
      indentX, yInc, { width: indentW, align: 'justify', lineGap: 1.8 }
    );
    yInc = 229.4;

    doc.text('c)', textLeft, yInc);
    doc.text('Estudios, registros, análisis estadísticos y de ', indentX, yInc, { continued: true });
    doc.font(boldF).text('información de Salud.');
    doc.font(regF);
    yInc = 252.0;

    doc.text('d)', textLeft, yInc);
    doc.text(
      'Sus datos personales podrán ser transferidos a terceros (Comisión Nacional de Protección Social en Salud y Regímenes de Protección Social en Salud).',
      indentX, yInc, { width: indentW, align: 'justify', lineGap: 1.8 }
    );

    const p2 = 'De manera adicional, utilizaremos su información personal para las siguientes finalidades que no son necesarias, pero que nos permiten y facilitan brindarle una mejor atención:';
    doc.text(p2, textLeft, 283.8, { width: textW, align: 'justify', lineGap: 1.8 });

    doc.text('a)', textLeft, 315.5);
    doc.text('Mejora de procesos de atención, académicos o de investigación.', indentX, 315.5, { width: indentW, align: 'justify' });

    doc.lineWidth(0.7).moveTo(left, 336.8).lineTo(left + totalW, 336.8).stroke('#000000');

    doc.font(boldF).fontSize(8.0).text('Si usted ha leído y comprendido los términos anteriores le invitamos a marcar la casilla que considere pertinente', textLeft, 348.0, { width: textW });

    // Doble línea superior y tabla de casillas abierta en los extremos laterales (fiel al formato oficial)
    doc.lineWidth(0.7).moveTo(left, 372.0).lineTo(left + totalW, 372.0).stroke('#000000');
    doc.lineWidth(0.7).moveTo(left, 381.0).lineTo(left + totalW, 381.0).stroke('#000000');

    const boxTop = 381.0;
    const boxBot = 423.5;
    const midX = 301.5;

    doc.lineWidth(0.7).moveTo(midX, boxTop).lineTo(midX, boxBot).stroke('#000000');
    doc.lineWidth(0.7).moveTo(left, boxBot).lineTo(left + totalW, boxBot).stroke('#000000');

    const autoriza = datos.autoriza_transferencia !== false;

    doc.lineWidth(0.9).rect(36.1, 385.6, 11.6, 10.9).stroke('#000000');
    if (autoriza) {
      doc.font(boldF).fontSize(8.0).text('X', 39.0, 386.8);
    }
    doc.font(regF).fontSize(8.0).text(
      'Autorizo y consiento que mis datos personales sean transferidos en los términos que señala el presente aviso de privacidad.',
      52.9, 386.0, { width: midX - 52.9 - 8, align: 'justify', lineGap: 2.0 }
    );

    doc.lineWidth(0.9).rect(318.0, 385.6, 11.6, 10.9).stroke('#000000');
    if (!autoriza) {
      doc.font(boldF).fontSize(8.0).text('X', 320.9, 386.8);
    }
    doc.font(regF).fontSize(8.0).text(
      'No autorizo ni consiento que mis datos personales sean transferidos en los Términos que señala el presente aviso de privacidad.',
      334.8, 386.0, { width: left + totalW - 334.8 - 8, align: 'justify', lineGap: 2.0 }
    );

    // Línea superior del párrafo de confidencialidad
    doc.lineWidth(0.7).moveTo(left, 439.0).lineTo(left + totalW, 439.0).stroke('#000000');

    const p3 = 'El presente Aviso de Privacidad será confidencial y con base en la Normatividad Oficial Mexicana vigente, será resguardado en el Expediente Clínico, propiedad del Instituto de Salud del Estado de México.';
    doc.font(regF).fontSize(8.0).text(p3, textLeft, 444.5, { width: textW, align: 'justify', lineGap: 1.5 });

    // 2/ Unidad Médica (etiqueta debajo de la línea superior, valor en el renglón)
    doc.lineWidth(0.7).moveTo(left, 467.0).lineTo(left + totalW, 467.0).stroke('#000000');
    doc.fontSize(7.2).font(regF).fillColor('#000000').text('Unidad Médica', textLeft, 469.5);
    const umVal = datos.unidad_medica || 'Hospital General San Felipe del Progreso';
    this.dibujarTextoAjustado(doc, umVal, textLeft, 479.5, textW, 14, { maxFontSize: 8.5, minFontSize: 6.0, isBold: true });

    // 3/ Municipio (etiqueta debajo de la línea superior, valor en el renglón)
    doc.lineWidth(0.7).moveTo(left, 496.0).lineTo(left + totalW, 496.0).stroke('#000000');
    doc.fontSize(7.2).font(regF).fillColor('#000000').text('Municipio', textLeft, 498.5);
    const munVal = datos.municipio || paciente.domicilio_municipio || 'San Felipe del Progreso';
    this.dibujarTextoAjustado(doc, munVal, textLeft, 508.5, textW, 14, { maxFontSize: 8.5, minFontSize: 6.0, isBold: true });

    // 4/ Fecha extendida debajo de la línea de cierre de Municipio
    doc.lineWidth(0.7).moveTo(left, 525.0).lineTo(left + totalW, 525.0).stroke('#000000');

    let dia = '--';
    let mes = '----------';
    let anio = '--';
    try {
      const fObj = datos.fecha ? new Date(datos.fecha) : new Date();
      if (!isNaN(fObj.getTime())) {
        dia = String(fObj.getUTCDate()).padStart(2, '0');
        mes = fObj.toLocaleDateString('es-MX', { month: 'long', timeZone: 'UTC' });
        anio = String(fObj.getUTCFullYear()).slice(-2);
      }
    } catch {}

    doc.fontSize(7.8).font(regF).text('Estado de México, a los', textLeft, 540.0);
    doc.fontSize(8.2).font(boldF).text(dia, textLeft + 98, 539.5, { width: 28, align: 'center' });
    doc.fontSize(7.8).font(regF).text('días del mes de', textLeft + 130, 540.0);
    doc.fontSize(8.2).font(boldF).text(mes, textLeft + 196, 539.5, { width: 92, align: 'center' });
    doc.fontSize(7.8).font(regF).text('del año 20', textLeft + 292, 540.0);
    doc.fontSize(8.2).font(boldF).text(`${anio}.`, textLeft + 334, 539.5);

    // 5/ Firma centrada con amplio espacio libre para firma autógrafa
    const sigW = 374.4;
    const sigLineX0 = left + (totalW - sigW) / 2;
    const sigLineX1 = sigLineX0 + sigW;
    const sigY = 639.4;

    const nombreFirma = datos.firma_nombre || `${paciente.nombre || ''} ${paciente.apellido_paterno || ''} ${paciente.apellido_materno || ''}`.trim();
    this.dibujarTextoAjustado(doc, nombreFirma, sigLineX0, sigY - 13, sigW, 12, { maxFontSize: 8.5, minFontSize: 6.0, isBold: true, align: 'center' });

    doc.lineWidth(0.7).moveTo(sigLineX0, sigY).lineTo(sigLineX1, sigY).stroke('#000000');

    doc.font(regF).fontSize(7.5).text('Nombre y Firma del o la Paciente', sigLineX0, sigY + 3, { align: 'center', width: sigW });
    doc.fontSize(7.5).text('Padre, Madre o Tutor en Caso de Menores de Edad', sigLineX0, sigY + 12, { align: 'center', width: sigW });

    doc.font(boldF).fontSize(8.0).text('208C0101100000L-082-24', left, 750, { width: totalW, align: 'right' });

    doc.end();
  }

  // ============================================================
  // 3. CARTA DE CONSENTIMIENTO INFORMADO (Formato 208C0101100000L-393-25)
  // ============================================================
  public static generarConsentimiento(res: Response, datos: any, paciente: any) {
    const doc = this.crearDoc(res, `Consentimiento_Informado_${paciente.expediente_clinico}`, {
      margins: { top: 15, bottom: 15, left: 20, right: 20 },
    });

    const left = 20;
    const totalW = 572;

    const regF = this.fontReg(doc);
    const semiF = this.fontSemi(doc);
    const boldF = this.fontBold(doc);

    LogoConfigService.dibujarEncabezado(doc, '', { startX: left, bannerWidth: totalW, soloLogos: true });

    // Encabezado con doble línea inferior (fiel al formato 208C0101100000L-393-25)
    doc.lineWidth(0.7).moveTo(left, 63.0).lineTo(left + totalW, 63.0).stroke('#000000');
    doc.fontSize(11.0).font(boldF).fillColor('#000000').text('CARTA DE CONSENTIMIENTO INFORMADO', left, 67.5, { width: totalW, align: 'center' });
    doc.lineWidth(0.7).moveTo(left, 82.0).lineTo(left + totalW, 82.0).stroke('#000000');
    doc.lineWidth(0.7).moveTo(left, 86.0).lineTo(left + totalW, 86.0).stroke('#000000');

    const nombreComp = `${paciente.apellido_paterno || ''} ${paciente.apellido_materno || ''} ${paciente.nombre || ''}`.replace(/\s+/g, ' ').trim();
    const sexoUpper = String(paciente.sexo || '').toUpperCase();
    const esFem = sexoUpper.startsWith('F') || sexoUpper === 'MUJER';
    const esMasc = sexoUpper.startsWith('M') || sexoUpper.startsWith('H');

    const umVal = datos.unidad_medica || LogoConfigService.getUnidadMedica();
    const lugarVal = datos.lugar || 'San Felipe del Progreso';
    const fechaVal = this.formatFecha(datos.fecha || new Date());
    const horaVal = datos.hora ? String(datos.hora).substring(0, 5) + ' hrs' : '12:00 hrs';

    // Fila 1 (abierta en extremos laterales): Unidad Médica | Lugar | Fecha | Hora
    const r1Top = 86.0;
    const r1Bot = 112.5;
    doc.fontSize(7.0).font(regF).fillColor('#000000').text('Unidad Médica', left + 4, r1Top + 2);
    this.dibujarTextoAjustado(doc, umVal, left + 4, r1Top + 12, 248, 12, { maxFontSize: 7.5, minFontSize: 5.5, isBold: true });

    doc.lineWidth(0.7).moveTo(left + 256, r1Top).lineTo(left + 256, r1Bot).stroke('#000000');
    doc.fontSize(7.0).font(regF).fillColor('#000000').text('Lugar', left + 260, r1Top + 2);
    this.dibujarTextoAjustado(doc, lugarVal, left + 260, r1Top + 12, 102, 12, { maxFontSize: 7.2, minFontSize: 5.2, font: semiF });

    doc.lineWidth(0.7).moveTo(left + 365, r1Top).lineTo(left + 365, r1Bot).stroke('#000000');
    doc.fontSize(7.0).font(regF).fillColor('#000000').text('Fecha', left + 369, r1Top + 2);
    doc.fontSize(7.4).font(semiF).fillColor('#000000').text(fechaVal, left + 369, r1Top + 12.5);

    doc.lineWidth(0.7).moveTo(left + 468, r1Top).lineTo(left + 468, r1Bot).stroke('#000000');
    doc.fontSize(7.0).font(regF).fillColor('#000000').text('Hora', left + 472, r1Top + 2);
    doc.fontSize(7.4).font(semiF).fillColor('#000000').text(horaVal, left + 472, r1Top + 12.5);

    doc.lineWidth(0.7).moveTo(left, r1Bot).lineTo(left + totalW, r1Bot).stroke('#000000');

    // Doble línea separadora entre Fila 1 y Fila 2 (fiel al formato oficial)
    const r2Top = 116.0;
    const r2Bot = 142.5;
    doc.lineWidth(0.7).moveTo(left, r2Top).lineTo(left + totalW, r2Top).stroke('#000000');

    // Fila 2: Nombre de la o del Paciente | Fecha de Nacimiento | Núm. de Expediente
    const fnacVal = this.formatFecha(paciente.fecha_nacimiento);
    doc.fontSize(7.0).font(regF).fillColor('#000000').text('Nombre de la o del Paciente', left + 4, r2Top + 2);
    this.dibujarTextoAjustado(doc, nombreComp, left + 4, r2Top + 12, 248, 12, { maxFontSize: 7.5, minFontSize: 5.5, isBold: true });

    doc.lineWidth(0.7).moveTo(left + 256, r2Top).lineTo(left + 256, r2Bot).stroke('#000000');
    doc.fontSize(7.0).font(regF).fillColor('#000000').text('Fecha de Nacimiento', left + 260, r2Top + 2);
    doc.fontSize(7.4).font(semiF).fillColor('#000000').text(fnacVal, left + 260, r2Top + 12.5);

    doc.lineWidth(0.7).moveTo(left + 365, r2Top).lineTo(left + 365, r2Bot).stroke('#000000');
    doc.fontSize(7.0).font(regF).fillColor('#000000').text('Núm. de Expediente', left + 369, r2Top + 2);
    this.dibujarTextoAjustado(doc, paciente.expediente_clinico || '--', left + 369, r2Top + 12, totalW - 373, 12, { maxFontSize: 7.5, minFontSize: 5.5, isBold: true });

    doc.lineWidth(0.7).moveTo(left, r2Bot).lineTo(left + totalW, r2Bot).stroke('#000000');

    // Fila 3: Edad | Sexo | Ocupación | Estado Civil
    const r3Top = r2Bot;
    const r3Bot = 165.5;
    const ocupVal = datos.ocupacion || paciente.ocupacion || 'Hogar / Campo';
    const edoCivVal = paciente.estado_civil || 'Casada(o)';

    doc.fontSize(7.0).font(regF).fillColor('#000000').text('Edad', left + 4, r3Top + 2);
    this.dibujarTextoAjustado(doc, `${paciente.edad || '--'} años`, left + 4, r3Top + 11.5, 44, 10, { maxFontSize: 7.2, minFontSize: 5.5, font: semiF });

    doc.lineWidth(0.7).moveTo(left + 52, r3Top).lineTo(left + 52, r3Bot).stroke('#000000');
    doc.fontSize(7.0).font(regF).fillColor('#000000').text('Sexo', left + 56, r3Top + 2);
    const chkY = r3Top + 12.5;
    doc.lineWidth(0.5).rect(left + 70, chkY, 6.2, 6.2).stroke('#000000');
    if (esFem) doc.fontSize(6.0).font(boldF).fillColor('#000000').text('X', left + 71.1, chkY + 0.4);
    doc.fontSize(6.8).font(regF).fillColor('#000000').text('Femenino', left + 81, chkY - 0.5);

    doc.lineWidth(0.5).rect(left + 126, chkY, 6.2, 6.2).stroke('#000000');
    if (esMasc) doc.fontSize(6.0).font(boldF).fillColor('#000000').text('X', left + 127.1, chkY + 0.4);
    doc.fontSize(6.8).font(regF).fillColor('#000000').text('Masculino', left + 137, chkY - 0.5);

    doc.lineWidth(0.7).moveTo(left + 184, r3Top).lineTo(left + 184, r3Bot).stroke('#000000');
    doc.fontSize(7.0).font(regF).fillColor('#000000').text('Ocupación', left + 188, r3Top + 2);
    this.dibujarTextoAjustado(doc, ocupVal, left + 188, r3Top + 11.5, 173, 10, { maxFontSize: 7.2, minFontSize: 5.2, font: semiF });

    doc.lineWidth(0.7).moveTo(left + 365, r3Top).lineTo(left + 365, r3Bot).stroke('#000000');
    doc.fontSize(7.0).font(regF).fillColor('#000000').text('Estado Civil', left + 369, r3Top + 2);
    this.dibujarTextoAjustado(doc, edoCivVal, left + 369, r3Top + 11.5, totalW - 373, 10, { maxFontSize: 7.2, minFontSize: 5.2, font: semiF });

    doc.lineWidth(0.7).moveTo(left, r3Bot).lineTo(left + totalW, r3Bot).stroke('#000000');

    // Fila 4: Domicilio
    const r4Top = r3Bot;
    const r4Bot = 188.0;
    const dir = paciente.domicilio || `${paciente.domicilio_municipio || ''}, ${paciente.domicilio_entidad || ''}`.trim() || 'San Felipe del Progreso, México';
    doc.fontSize(7.0).font(regF).fillColor('#000000').text('Domicilio', left + 4, r4Top + 2);
    this.dibujarTextoAjustado(doc, dir, left + 4, r4Top + 11.5, totalW - 8, 10, { maxFontSize: 7.2, minFontSize: 5.2, font: semiF });
    doc.lineWidth(0.7).moveTo(left, r4Bot).lineTo(left + totalW, r4Bot).stroke('#000000');

    // 13/ Texto introductorio con línea subrayada para el servicio (fiel al formato oficial)
    const servicio = datos.servicio || 'Cirugía General';
    doc.fontSize(7.4).font(regF).fillColor('#000000').text('El personal médico tratante del servicio de', left + 4, 198.0);
    const servLineX0 = left + 178;
    const servLineX1 = left + totalW - 72;
    this.dibujarTextoAjustado(doc, servicio, servLineX0 + 4, 197.0, servLineX1 - servLineX0 - 8, 10, { maxFontSize: 7.6, minFontSize: 5.8, isBold: true, align: 'center' });
    doc.lineWidth(0.6).moveTo(servLineX0, 207.0).lineTo(servLineX1, 207.0).stroke('#000000');
    doc.fontSize(7.4).font(regF).fillColor('#000000').text(', me ha informado', servLineX1 + 2, 198.0, { width: 70, align: 'right' });

    doc.fontSize(7.4).font(regF).fillColor('#000000').text(
      'de mi padecimiento, por lo que necesito someterme a estudios de laboratorio, gabinete, histopatológicos y/o de procedimientos anestésicos, así como de tratamiento médico y/o quirúrgico considerados como indispensables para recuperar mi salud.',
      left + 4, 209.0, { width: totalW - 8, align: 'justify', lineGap: 1.2 }
    );

    doc.fontSize(7.4).font(regF).fillColor('#000000').text(
      'El personal médico me informo de los riesgos y de las posibles complicaciones de los medios de diagnóstico y tratamientos médicos y/o quirúrgicos, por lo que, por este medio, libremente y sin presión alguna acepto someterme a:',
      left + 4, 232.0, { width: totalW - 8, align: 'justify', lineGap: 1.2 }
    );

    // 14/ a 19/: Secciones clínicas con línea inline + segunda línea completa (fiel al formato oficial)
    let y = 262.0;

    const drawSectionTwoLines = (label: string, value?: string) => {
      doc.fontSize(7.2).font(regF).fillColor('#000000').text(label, left + 4, y);
      const labelW = doc.widthOfString(label) + 12;
      const line1X0 = left + labelW;
      const line1Y = y + 9.5;
      const line2Y = y + 26.0;

      doc.lineWidth(0.7).moveTo(line1X0, line1Y).lineTo(left + totalW, line1Y).stroke('#000000');
      doc.lineWidth(0.7).moveTo(left, line2Y).lineTo(left + totalW, line2Y).stroke('#000000');

      const valStr = (value || 'Sin observaciones adicionales').trim();
      if (valStr) {
        doc.fontSize(7.0).font(semiF).fillColor('#000000');
        const availW1 = totalW - labelW - 6;
        const words = valStr.split(/\s+/);
        let line1Text = '';
        let remWords: string[] = [];

        for (let i = 0; i < words.length; i++) {
          const test = line1Text ? `${line1Text} ${words[i]}` : words[i];
          if (doc.widthOfString(test) <= availW1) {
            line1Text = test;
          } else {
            remWords = words.slice(i);
            break;
          }
        }

        if (line1Text) {
          doc.text(line1Text, line1X0 + 3, y - 0.5, { lineBreak: false });
        }
        if (remWords.length > 0) {
          this.dibujarTextoAjustado(doc, remWords.join(' '), left + 4, line1Y + 4.5, totalW - 8, 11, {
            maxFontSize: 7.0,
            minFontSize: 5.0,
            font: semiF,
            lineGap: 0.5
          });
        }
      }

      y += 43.0;
    };

    drawSectionTwoLines('Diagnósticos Clínicos', datos.diagnosticos_clinicos);
    drawSectionTwoLines('Estudios de Laboratorio, Gabinete e Histopatológicos', datos.estudios_previos);
    drawSectionTwoLines('Actos Anestésicos', datos.actos_anestesicos);
    drawSectionTwoLines('Tratamiento Médico', datos.tratamiento_medico);
    drawSectionTwoLines('Tratamiento Quirúrgico', datos.tratamiento_quirurgico);
    drawSectionTwoLines('Riesgos y Complicaciones', datos.riesgos_complicaciones);

    // Párrafos legales inferiores
    y = 524.0;
    doc.fontSize(7.2).font(regF).fillColor('#000000')
      .text(
        'He sido informado de los riesgos que conlleva el procedimiento, por lo que acepto que se lleve a cabo el procedimiento o los procedimientos.',
        left + 4, y, { width: totalW - 8, align: 'justify', lineGap: 1.0 }
      );

    doc.text(
      'Autorizo al personal médico de esta Unidad Médica para que realicen los estudios y tratamientos convenientes, en igual sentido, autorizo ante cualquier complicación o efecto adverso durante el procedimiento o los procedimientos, especialmente ante una urgencia médica, que se practiquen las técnicas y procedimientos necesarios para mi tratamiento.',
      left + 4, y + 22, { width: totalW - 8, align: 'justify', lineGap: 1.0 }
    );

    doc.text(
      'Tengo la plena libertad de revocar la autorización de los estudios y tratamientos en cualquier momento, antes de realizarse.',
      left + 4, y + 55, { width: totalW - 8, align: 'justify', lineGap: 1.0 }
    );

    doc.text(
      'En caso de ser menor de edad o con capacidades diferentes, se informó y autoriza el responsable de la o del paciente.',
      left + 4, y + 71, { width: totalW - 8, align: 'justify', lineGap: 1.0 }
    );

    // 20/ a 23/: Firmas en cuadrícula 2x2 con amplio espacio para firma física autógrafa
    const sigW = 195;
    const leftSigX = left + 38;
    const rightSigX = left + totalW - sigW - 38;

    const sigY1 = 650.0;
    doc.lineWidth(0.8).moveTo(leftSigX, sigY1).lineTo(leftSigX + sigW, sigY1).stroke('#000000');
    if (datos.personal_medico_nombre) {
      this.dibujarTextoAjustado(doc, datos.personal_medico_nombre, leftSigX, sigY1 - 12, sigW, 11, { maxFontSize: 7.2, minFontSize: 5.5, isBold: true, align: 'center' });
    }
    doc.fontSize(7.0).font(regF).fillColor('#000000').text('Personal Médico Tratante', leftSigX, sigY1 + 4, { align: 'center', width: sigW });

    doc.lineWidth(0.8).moveTo(rightSigX, sigY1).lineTo(rightSigX + sigW, sigY1).stroke('#000000');
    this.dibujarTextoAjustado(doc, datos.familiar_nombre || nombreComp, rightSigX, sigY1 - 12, sigW, 11, { maxFontSize: 7.2, minFontSize: 5.5, isBold: true, align: 'center' });
    doc.fontSize(7.0).font(regF).fillColor('#000000').text('Paciente y/o Familiar', rightSigX, sigY1 + 4, { align: 'center', width: sigW });

    const sigY2 = 702.0;
    doc.lineWidth(0.8).moveTo(leftSigX, sigY2).lineTo(leftSigX + sigW, sigY2).stroke('#000000');
    if (datos.testigo1_nombre) {
      this.dibujarTextoAjustado(doc, datos.testigo1_nombre, leftSigX, sigY2 - 12, sigW, 11, { maxFontSize: 7.2, minFontSize: 5.5, isBold: true, align: 'center' });
    }
    doc.fontSize(7.0).font(regF).fillColor('#000000').text('Testigo 1', leftSigX, sigY2 + 4, { align: 'center', width: sigW });

    doc.lineWidth(0.8).moveTo(rightSigX, sigY2).lineTo(rightSigX + sigW, sigY2).stroke('#000000');
    if (datos.testigo2_nombre) {
      this.dibujarTextoAjustado(doc, datos.testigo2_nombre, rightSigX, sigY2 - 12, sigW, 11, { maxFontSize: 7.2, minFontSize: 5.5, isBold: true, align: 'center' });
    }
    doc.fontSize(7.0).font(regF).fillColor('#000000').text('Testigo 2', rightSigX, sigY2 + 4, { align: 'center', width: sigW });

    doc.fontSize(8.0).font(boldF).fillColor('#000000').text('208C0101100000L-393-25', left, 748, { width: totalW, align: 'right' });
    doc.end();
  }

  // ============================================================
  // 4. HISTORIA CLÍNICA GENERAL (Formato 208C0101100000L-015-25)
  // ============================================================
  public static generarHCGeneral(res: Response, datos: any, paciente: any) {
    const left = 15.7;
    const totalW = 571.2;
    const doc = this.crearDoc(res, `Historia_Clinica_${paciente.expediente_clinico}`, {
      margins: { top: 15, bottom: 15, left: 15.7, right: 15.7 }
    });

    const regF = this.fontReg(doc);
    const medF = this.fontMed(doc);
    const semiF = this.fontSemi(doc);
    const boldF = this.fontBold(doc);

    const nombreComp = `${paciente.apellido_paterno} ${paciente.apellido_materno || ''} ${paciente.nombre}`.replace(/\s+/g, ' ').trim();
    const s = String(paciente.sexo || '').trim().toUpperCase();
    const esFem = s === 'F' || s.startsWith('FEM') || s.startsWith('MUJ');
    const esMasc = s === 'M' || s === 'H' || s.startsWith('MASC') || s.startsWith('HOMB');

    const fechaStr = datos.fecha ? this.formatFecha(datos.fecha) : (datos.fecha_elaboracion ? this.formatFecha(datos.fecha_elaboracion) : (paciente.fecha_hora_ingreso ? this.formatFecha(paciente.fecha_hora_ingreso) : this.formatFecha(new Date())));
    let horaStr = datos.hora || datos.hora_elaboracion || (paciente.fecha_hora_ingreso ? String(paciente.fecha_hora_ingreso).substring(11, 16) : '10:00');
    if (horaStr && horaStr.includes(':')) {
      const parts = horaStr.split(':');
      horaStr = `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')} hrs`;
    }

    this.dibujarEncabezadoOficial(doc, 'HISTORIA CLÍNICA GENERAL', { startX: left, bannerWidth: totalW });

    const drawBoxCell = (x: number, y: number, w: number, h: number, label: string, val: any, isBold = false) => {
      this.dibujarCelda(doc, x, y, w, h, label, val, { isBold, fontSize: 7.2 });
    };

    drawBoxCell(left, 86, 428, 24, 'Unidad Médica', 'HOSPITAL GENERAL SAN FELIPE DEL PROGRESO', true);
    drawBoxCell(left + 428, 86, 143.2, 24, 'Expediente', paciente.expediente_clinico, true);

    drawBoxCell(left, 110, 232, 24, 'Fecha de Elaboración', fechaStr);
    drawBoxCell(left + 232, 110, 126, 24, 'Hora de Elaboración', horaStr);

    doc.lineWidth(0.5).rect(left + 358, 110, 213.2, 24).stroke('#000000');
    doc.fontSize(6).font(medF).fillColor('#333333').text('Tipo de Interrogatorio', left + 361, 112);
    this.dibujarCheckbox(doc, left + 375, 120, 'Directo', datos.tipo_interrogatorio !== 'Indirecto');
    this.dibujarCheckbox(doc, left + 445, 120, 'Indirecto', datos.tipo_interrogatorio === 'Indirecto');

    doc.lineWidth(0.5).rect(left, 134, totalW, 14).stroke('#000000');
    doc.fontSize(7).font(boldF).fillColor('#000000').text('I. Ficha de Identificación', left + 4, 138);

    drawBoxCell(left, 148, 358, 24, 'Nombre de la o del Paciente', nombreComp, true);
    drawBoxCell(left + 358, 148, 52, 24, 'Edad', `${paciente.edad || '--'} años`);

    doc.lineWidth(0.5).rect(left + 410, 148, 161.2, 24).stroke('#000000');
    doc.fontSize(6).font(medF).fillColor('#333333').text('Sexo', left + 413, 150);
    this.dibujarCheckbox(doc, left + 422, 158, 'Femenino', esFem);
    this.dibujarCheckbox(doc, left + 492, 158, 'Masculino', esMasc);

    drawBoxCell(left, 172, 150, 24, 'Fecha de Nacimiento', this.formatFecha(paciente.fecha_nacimiento));
    drawBoxCell(left + 150, 172, 208, 24, 'Ocupación de la o del Paciente', datos.ocupacion || paciente.ocupacion || 'No especificada');
    drawBoxCell(left + 358, 172, 213.2, 24, 'Grupo Étnico', datos.grupo_etnico || (paciente.es_indigena ? (paciente.lengua_indigena || 'Mazahua') : 'No especificado'));

    drawBoxCell(left, 196, 358, 24, 'Domicilio', paciente.domicilio || `${paciente.domicilio_municipio || ''}, ${paciente.domicilio_entidad || ''}`);
    drawBoxCell(left + 358, 196, 213.2, 24, 'Teléfono', paciente.telefono || 'Sin teléfono');

    drawBoxCell(left, 220, totalW, 24, 'Nombre del Padre o Tutor en caso de ser Menor de Edad o Persona con Capacidades Diferentes', paciente.tutor_nombre || 'N/A');

    drawBoxCell(left, 244, 358, 24, 'Parentesco con la o el Paciente', paciente.tutor_parentesco || 'N/A');
    drawBoxCell(left + 358, 244, 213.2, 24, 'Teléfono', paciente.tutor_telefono || 'N/A');

    let y = 274;

    const drawSectionRuled = (title: string, content: string, linesCount: number) => {
      doc.fontSize(7).font(boldF).fillColor('#000000').text(title, left, y);
      y += 10;
      const lineH = 13.5;
      const startY = y;
      if (content) {
        this.dibujarTextoAjustado(doc, content, left + 2, startY + 1, totalW - 4, linesCount * lineH - 2, {
          maxFontSize: 6.8,
          minFontSize: 5.0,
          font: regF,
          lineGap: 3.2
        });
      }
      for (let l = 1; l <= linesCount; l++) {
        doc.lineWidth(0.4).moveTo(left, startY + l * lineH).lineTo(left + totalW, startY + l * lineH).stroke('#000000');
      }
      y += linesCount * lineH + 5;
    };

    const drawSubsectionInline = (label: string, value: string, extraSpacing = 6.5) => {
      const lineH = 12.5;
      const labelW = doc.fontSize(6.6).font(semiF).widthOfString(label) + 6;
      doc.fontSize(6.6).font(semiF).fillColor('#000000').text(label, left + 2, y + 1);

      const valStr = value || 'Interrogado y negado.';
      doc.fontSize(6.6).font(regF).fillColor('#000000');

      const line1W = totalW - labelW - 6;
      const words = valStr.split(' ');
      let curText = '';
      let remainingWords: string[] = [];

      for (let i = 0; i < words.length; i++) {
        const testText = curText ? `${curText} ${words[i]}` : words[i];
        if (doc.widthOfString(testText) <= line1W) {
          curText = testText;
        } else {
          remainingWords = words.slice(i);
          break;
        }
      }

      if (curText) {
        doc.text(curText, left + labelW, y + 1, { lineBreak: false });
      }
      doc.lineWidth(0.4).moveTo(left, y + lineH).lineTo(left + totalW, y + lineH).stroke('#000000');

      if (remainingWords.length > 0) {
        const remStr = remainingWords.join(' ');
        this.dibujarTextoAjustado(doc, remStr, left + 2, y + lineH + 1.5, totalW - 4, lineH - 1.5, {
          maxFontSize: 6.6,
          minFontSize: 4.8,
          font: regF,
          lineGap: 0.4
        });
        doc.lineWidth(0.4).moveTo(left, y + lineH * 2).lineTo(left + totalW, y + lineH * 2).stroke('#000000');
        y += lineH * 2 + extraSpacing;
      } else {
        y += lineH + extraSpacing;
      }
    };

    const hfText = datos.antecedentes_heredofamiliares || paciente.antecedentes_heredofamiliares || 'Interrogados y negados por el paciente.';
    drawSectionRuled('II. Antecedentes Heredo Familiares', hfText, 3);

    const npArr: string[] = [];
    if (paciente.material_construccion) npArr.push(`Vivienda: ${paciente.material_construccion}`);
    const servs = [paciente.servicios_agua && 'Agua', paciente.servicios_luz && 'Luz', paciente.servicios_drenaje && 'Drenaje'].filter(Boolean).join(', ');
    if (servs) npArr.push(`Servicios: ${servs}`);
    if (paciente.zoonosis !== undefined && paciente.zoonosis !== null && paciente.zoonosis !== '') {
      const zVal = String(paciente.zoonosis).toLowerCase();
      if (zVal === 'false' || zVal === '0' || zVal === 'no') {
        npArr.push('Zoonosis negada');
      } else if (zVal === 'true' || zVal === '1' || zVal === 'si' || zVal === 'sí') {
        npArr.push('Zoonosis positiva');
      } else {
        npArr.push(`Zoonosis: ${paciente.zoonosis}`);
      }
    }
    const adic = [paciente.tabaquismo && 'Tabaquismo (+)', paciente.alcoholismo && 'Alcoholismo (+)', paciente.farmacodependencia && 'Farmacodependencia (+)'].filter(Boolean);
    npArr.push(adic.length > 0 ? `Toxicomanías: ${adic.join(', ')}` : 'Toxicomanías negadas');
    const npText = datos.antecedentes_no_patologicos || (npArr.length > 0 ? npArr.join('. ') + '.' : 'Interrogados y negados.');
    drawSectionRuled('III. Antecedentes Personales No Patológicos', npText, 3);

    const pArr: string[] = [];
    if (paciente.antecedentes_quirurgicos) pArr.push(`Quirúrgicos: ${paciente.antecedentes_quirurgicos}`);
    if (paciente.antecedentes_transfusionales) pArr.push(`Transfusionales: ${paciente.antecedentes_transfusionales}`);
    if (paciente.alergias) pArr.push(`Alergias: ${paciente.alergias}`);
    const pText = datos.antecedentes_patologicos || (pArr.length > 0 ? pArr.join('. ') + '.' : 'Enfermedades crónicas, quirúrgicos y alérgicos interrogados y negados.');
    drawSectionRuled('IV. Antecedentes Personales Patológicos', pText, 3);

    let goText = datos.antecedentes_gineco_obstetricos;
    if (!goText) {
      if (esFem) {
        goText = `Menarca: ${paciente.menarca || '--'}, Ritmo: ${paciente.ritmo_menstrual || '--'}, IVSA: ${paciente.ivsa || '--'}. Gesta: ${paciente.gesta || 0}, Para: ${paciente.para || 0}, Cesárea: ${paciente.cesarea || 0}, Aborto: ${paciente.aborto || 0}. FUM: ${paciente.fecha_ultima_menstruacion ? this.formatFecha(paciente.fecha_ultima_menstruacion) : '--'}.`;
      } else {
        goText = 'No aplica por sexo biológico masculino.';
      }
    }
    drawSectionRuled('V. Antecedentes Gineco-Obstétricos', goText, 3);

    drawSectionRuled('VI. Padecimiento Actual', datos.padecimiento_actual || 'Sin sintomatología específica registrada.', 4);

    doc.fontSize(7).font(boldF).fillColor('#000000').text('VII. Interrogatorio por Aparatos y Sistemas', left, y);
    y += 12;

    drawSubsectionInline('Cardiovascular', datos.int_aparato_cardiovascular_observaciones || (datos.int_aparato_cardiovascular_niega !== false ? 'Interrogado y negado.' : 'Sin sintomatología agregada.'), 10);
    drawSubsectionInline('Respiratorio', datos.int_aparato_respiratorio_observaciones || (datos.int_aparato_respiratorio_niega !== false ? 'Interrogado y negado.' : 'Sin sintomatología agregada.'), 10);
    drawSubsectionInline('Gastrointestinal', datos.int_aparato_digestivo_observaciones || (datos.int_aparato_digestivo_niega !== false ? 'Interrogado y negado.' : 'Sin sintomatología agregada.'), 10);
    drawSubsectionInline('Genitourinario', datos.int_aparato_genitourinario_observaciones || (datos.int_aparato_genitourinario_niega !== false ? 'Interrogado y negado.' : 'Sin sintomatología agregada.'), 10);
    drawSubsectionInline('Hemático y Linfático', datos.int_aparato_hematico_observaciones || (datos.int_aparato_hematico_niega !== false ? 'Interrogado y negado.' : 'Sin sintomatología agregada.'), 10);
    drawSubsectionInline('Endócrino', datos.int_aparato_endocrino_observaciones || (datos.int_aparato_endocrino_niega !== false ? 'Interrogado y negado.' : 'Sin sintomatología agregada.'), 10);

    doc.fontSize(7.5).font(boldF).fillColor('#000000').text('208C0101100000L-015-25', left, 755, { align: 'right', width: totalW });

    doc.addPage({ margins: { top: 18, bottom: 18, left: 15.7, right: 15.7 } });
    y = 22;

    drawSubsectionInline('Nervioso', datos.int_aparato_neurologico_observaciones || (datos.int_aparato_neurologico_niega !== false ? 'Interrogado y negado.' : 'Sin sintomatología agregada.'), 8);
    drawSubsectionInline('Musculoesquelético', datos.int_aparato_musculoesqueletico_observaciones || (datos.int_aparato_musculoesqueletico_niega !== false ? 'Interrogado y negado.' : 'Sin sintomatología agregada.'), 8);
    drawSubsectionInline('Piel, Mucosas y Anexos', datos.int_aparato_piel_anexos_observaciones || (datos.int_aparato_piel_anexos_niega !== false ? 'Interrogado y negado.' : 'Sin sintomatología agregada.'), 8);
    y += 4;

    doc.fontSize(7).font(boldF).fillColor('#000000').text('VIII. Signos Vitales / Antropometría', left, y);
    y += 10;

    const colW = totalW / 6;
    const svHeaders = ['Tensión Arterial', 'Temperatura', 'Frecuencia Cardiaca.', 'Frecuencia Respiratoria.', 'Peso', 'Talla'];
    const svValues = [
      datos.presion_arterial || (datos.presion_arterial_sistolica && datos.presion_arterial_diastolica ? `${datos.presion_arterial_sistolica}/${datos.presion_arterial_diastolica} mmHg` : '--'),
      datos.temperatura ? `${datos.temperatura} °C` : '--',
      datos.frecuencia_cardiaca ? `${datos.frecuencia_cardiaca} lpm` : '--',
      datos.frecuencia_respiratoria ? `${datos.frecuencia_respiratoria} rpm` : '--',
      datos.peso ? `${datos.peso} kg` : '--',
      datos.talla ? `${datos.talla} cm` : '--'
    ];

    doc.lineWidth(0.5).rect(left, y, totalW, 16).stroke('#000000');
    doc.lineWidth(0.5).rect(left, y + 16, totalW, 16).stroke('#000000');

    for (let c = 0; c < 6; c++) {
      const cX = left + c * colW;
      if (c > 0) {
        doc.lineWidth(0.5).moveTo(cX, y).lineTo(cX, y + 32).stroke('#000000');
      }
      doc.fontSize(6).font(boldF).fillColor('#000000').text(svHeaders[c], cX + 2, y + 4, { width: colW - 4, align: 'center' });
      doc.fontSize(7.2).font(semiF).fillColor('#000000').text(svValues[c], cX + 2, y + 20, { width: colW - 4, align: 'center' });
    }
    y += 38;

    doc.fontSize(7).font(boldF).fillColor('#000000').text('IX. Exploración Física', left, y);
    y += 12;

    const efList = [
      { name: 'Habitus Exterior', val: datos.habitus_exterior || 'Biotipo normolíneo, edad aparente concuerda con la cronológica, íntegro.' },
      { name: 'Cabeza', val: datos.ef_cabeza || 'Normocéfalo, sin hundimientos ni exostosis.' },
      { name: 'Cuello', val: datos.ef_cuello || 'Cilíndrico, simétrico, pulsos carotídeos normales, sin adenomegalias.' },
      { name: 'Tórax', val: datos.ef_torax || 'Normolíneo, simétrico, campos pulmonares bien ventilados, ruidos cardiacos rítmicos.' },
      { name: 'Abdomen', val: datos.ef_abdomen || 'Blando, depresible, no doloroso, peristalsis presente normoactiva.' },
      { name: 'Genitales', val: datos.ef_genitales || 'Genitales externos acordes a edad y sexo biológico.' },
      { name: 'Extremidades', val: datos.extremidades || 'Simétricas, eutróficas, arcos de movilidad completos, pulsos distales presentes.' },
      { name: 'Piel', val: datos.ef_piel || (datos.int_aparato_piel_anexos_observaciones || 'Hidratada, turgente, adecuada coloración tegumentaria.') },
    ];

    efList.forEach(ef => {
      drawSubsectionInline(ef.name, ef.val, 8);
    });
    y += 4;

    drawSectionRuled('X. Resultados Previos y Actuales de Laboratorio, Gabinete y otros', datos.estudios_previos || datos.resultados_laboratorio || 'Sin estudios previos reportados.', 1);
    y += 4;
    drawSectionRuled('XI. Diagnósticos o Problemas Clínicos', datos.diagnostico || datos.diagnosticos || 'Sin diagnósticos registrados.', 1);
    y += 4;

    doc.fontSize(7).font(boldF).fillColor('#000000').text('XII. TX Farmacológico', left, y);
    y += 12;

    drawSubsectionInline('Terapéutica Empleada y Resultados (Previos)', datos.tx_previo || 'Ninguna terapéutica previa referida.', 8);
    drawSubsectionInline('Terapéutica Actual', datos.tx_actual || datos.plan_tratamiento || 'Plan hospitalario en curso.', 8);
    y += 4;

    drawSectionRuled('XIII. Pronóstico', datos.pronostico || 'Reservado a evolución clínica.', 1);

    doc.fontSize(7).font(semiF).fillColor('#000000').text('Personal Médico Tratante', left, 678, { align: 'center', width: totalW });

    const sigW = 200;
    const sigX = left + (totalW - sigW) / 2;
    doc.lineWidth(0.5).moveTo(sigX, 730).lineTo(sigX + sigW, 730).stroke('#000000');
    if (datos.medico_nombre) {
      this.dibujarTextoAjustado(doc, datos.medico_nombre, sigX, 716, sigW, 11, { maxFontSize: 7.5, minFontSize: 5.5, isBold: true, align: 'center' });
    }
    doc.fontSize(6.5).font(regF).fillColor('#333333').text('Nombre y Firma', sigX, 733, { align: 'center', width: sigW });

    doc.fontSize(7.5).font(boldF).fillColor('#000000').text('208C0101100000L-015-25', left, 755, { align: 'right', width: totalW });

    doc.end();
  }

  // ============================================================
  // 5. HISTORIA CLÍNICA PEDIÁTRICA (Formato 208C0101100000L -040-19)
  // ============================================================
  public static generarHCPediatrica(res: Response, datos: any, paciente: any) {
    const left = 24;
    const totalW = 564;
    const doc = this.crearDoc(res, `HC_Pediatrica_${paciente.expediente_clinico}`, {
      margins: { top: 15, bottom: 15, left: 24, right: 24 }
    });

    const nombreComp = `${paciente.apellido_paterno} ${paciente.apellido_materno || ''} ${paciente.nombre}`.replace(/\s+/g, ' ').trim();
    const s = String(paciente.sexo || '').trim().toUpperCase();
    const esFem = s === 'F' || s.startsWith('FEM') || s.startsWith('MUJ');
    const esMasc = s === 'M' || s === 'H' || s.startsWith('MASC') || s.startsWith('HOMB');

    const fechaStr = datos.fecha ? this.formatFecha(datos.fecha) : (paciente.fecha_hora_ingreso ? this.formatFecha(paciente.fecha_hora_ingreso) : this.formatFecha(new Date()));
    let horaStr = datos.hora || (paciente.fecha_hora_ingreso ? String(paciente.fecha_hora_ingreso).substring(11, 16) : '10:00');
    if (horaStr && horaStr.includes(':')) {
      const parts = horaStr.split(':');
      horaStr = `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')} hrs`;
    }

    // PÁGINA 1
    this.dibujarEncabezadoOficial(doc, 'Historia Clínica Pediátrica', { startX: left, bannerWidth: totalW });

    // Top box
    this.dibujarCelda(doc, left, 82, 420, 20, 'UNIDAD MÉDICA', 'HOSPITAL GENERAL SAN FELIPE DEL PROGRESO', { fontSize: 7.2 });
    this.dibujarCelda(doc, left + 420, 82, 144, 20, 'EXPEDIENTE', paciente.expediente_clinico, { fontSize: 7.2 });

    this.dibujarCelda(doc, left, 102, 180, 20, 'FECHA DE ELABORACIÓN', fechaStr, { fontSize: 6.8 });
    this.dibujarCelda(doc, left + 180, 102, 140, 20, 'HORA DE ELABORACIÓN', horaStr, { fontSize: 6.8 });

    doc.lineWidth(0.5).rect(left + 320, 102, 244, 20).stroke('#000000');
    doc.fontSize(5.6).font(this.fontMed(doc)).fillColor('#333333').text('TIPO DE INTERROGATORIO', left + 323, 104);
    this.dibujarCheckbox(doc, left + 350, 110, 'DIRECTO', datos.tipo_interrogatorio === 'Directo');
    this.dibujarCheckbox(doc, left + 430, 110, 'INDIRECTO', datos.tipo_interrogatorio !== 'Directo');

    // I. FICHA DE IDENTIFICACIÓN
    let y = 125;
    doc.lineWidth(0.5).rect(left, y, totalW, 13).stroke('#000000');
    doc.fontSize(6.8).font(this.fontBold(doc)).fillColor('#000000').text('I. FICHA DE IDENTIFICACIÓN', left + 4, y + 2.5);
    y += 13;

    const edadStr = paciente.edad !== undefined && paciente.edad !== null ? `${paciente.edad} años` : (paciente.edad_meses ? `${paciente.edad_meses} meses` : '--');
    this.dibujarCelda(doc, left, y, 350, 20, 'NOMBRE DE LA O EL PACIENTE (APELLIDO PATERNO, APELLIDO MATERNO Y NOMBRE(S))', nombreComp, { fontSize: 7.2 });
    this.dibujarCelda(doc, left + 350, y, 50, 20, 'EDAD', edadStr, { fontSize: 6.8 });

    doc.lineWidth(0.5).rect(left + 400, y, 164, 20).stroke('#000000');
    doc.fontSize(5.6).font(this.fontMed(doc)).fillColor('#333333').text('GÉNERO', left + 403, y + 2);
    this.dibujarCheckbox(doc, left + 418, y + 9, 'MASCULINO', esMasc);
    this.dibujarCheckbox(doc, left + 490, y + 9, 'FEMENINO', esFem);
    y += 20;

    this.dibujarCelda(doc, left, y, 350, 20, 'DOMICILIO', paciente.domicilio || `${paciente.domicilio_municipio || ''}, ${paciente.domicilio_entidad || ''}`, { fontSize: 6.6 });
    this.dibujarCelda(doc, left + 350, y, 214, 20, 'OCUPACIÓN DE LA O EL PACIENTE', datos.ocupacion || paciente.ocupacion || 'Menor de edad / Estudiante', { fontSize: 6.8 });
    y += 20;

    const tutorNom = paciente.tutor_nombre || paciente.contacto_emergencia_nombre || 'Padre o Tutor';
    const tutorPar = paciente.tutor_parentesco || paciente.contacto_emergencia_parentesco || 'Tutor';
    this.dibujarCelda(doc, left, y, 350, 20, 'NOMBRE DEL PADRE O TUTOR', tutorNom, { fontSize: 6.8 });
    this.dibujarCelda(doc, left + 350, y, 214, 20, 'PARENTESCO CON LA O EL PACIENTE', tutorPar, { fontSize: 6.8 });
    y += 22;

    const drawRuledBlock = (title: string, content: string, linesCount: number) => {
      doc.fontSize(6.8).font(this.fontBold(doc)).fillColor('#000000').text(title, left, y);
      y += 9;
      const lineH = 12.5;
      const textH = linesCount * lineH;
      this.dibujarTextoAjustado(doc, content || 'Interrogados y negados.', left, y + 1, totalW, textH - 1.5, {
        maxFontSize: 6.5,
        minFontSize: 4.8,
        font: this.fontReg(doc),
        lineGap: 2.2
      });
      for (let l = 1; l <= linesCount; l++) {
        doc.lineWidth(0.4).moveTo(left, y + l * lineH).lineTo(left + totalW, y + l * lineH).stroke('#cbd5e1');
      }
      y += textH + 4;
    };

    const drawPedsInlineItem = (name: string, val: string, baseAdvance: number) => {
      const fullStr = `${name}: ${val}`;
      let fs = 6.4;
      for (let tryFs = 6.4; tryFs >= 5.0; tryFs -= 0.3) {
        doc.fontSize(tryFs).font(this.fontReg(doc));
        if (doc.heightOfString(fullStr, { width: totalW }) <= baseAdvance + 2) {
          fs = tryFs;
          break;
        }
        fs = tryFs;
      }
      doc.fontSize(fs).font(this.fontBold(doc)).fillColor('#000000').text(name + ': ', left, y, { width: totalW, continued: true })
         .font(this.fontReg(doc)).text(val, { width: totalW });
      const lineBottom = Math.max(y + 9, doc.y + 1);
      doc.lineWidth(0.4).moveTo(left, lineBottom).lineTo(left + totalW, lineBottom).stroke('#e2e8f0');
      y = Math.max(y + baseAdvance, lineBottom + 2);
    };

    const hfText = datos.antecedentes_heredofamiliares || paciente.antecedentes_heredofamiliares || 'Interrogados y negados.';
    drawRuledBlock('II. ANTECEDENTES HEREDO FAMILIARES', hfText, 3);

    const npArr: string[] = [];
    if (paciente.material_construccion) npArr.push(`Vivienda: ${paciente.material_construccion}`);
    const servs = [paciente.servicios_agua && 'Agua', paciente.servicios_luz && 'Luz', paciente.servicios_drenaje && 'Drenaje'].filter(Boolean).join(', ');
    if (servs) npArr.push(`Servicios: ${servs}`);
    if (paciente.zoonosis !== undefined && paciente.zoonosis !== null && paciente.zoonosis !== '') {
      const zVal = String(paciente.zoonosis).toLowerCase();
      if (zVal === 'false' || zVal === '0' || zVal === 'no') {
        npArr.push('Zoonosis negada');
      } else if (zVal === 'true' || zVal === '1' || zVal === 'si' || zVal === 'sí') {
        npArr.push('Zoonosis positiva');
      } else {
        npArr.push(`Zoonosis: ${paciente.zoonosis}`);
      }
    }
    const npText = datos.antecedentes_no_patologicos || (npArr.length > 0 ? npArr.join('. ') + '.' : 'Interrogados y negados.');
    drawRuledBlock('III. ANTECEDENTES PERSONALES NO PATOLÓGICOS', npText, 3);

    drawRuledBlock('IV. ANTECEDENTES PERINATALES', datos.antecedentes_perinatales || 'Obtenido de término por parto eutócico sin complicaciones perinatales referidas.', 3);
    drawRuledBlock('V. ALIMENTACIÓN', datos.alimentacion || 'Seno materno, ablactación e integración a la dieta familiar acorde a edad.', 2);
    drawRuledBlock('VI. INMUNIZACIONES', datos.inmunizaciones || 'Esquema de vacunación completo para la edad referido por el familiar.', 2);
    drawRuledBlock('VII. DESARROLLO PSICOMOTOR', datos.desarrollo_psicomotor || 'Hitos del desarrollo psicomotor alcanzados en tiempo y forma para la edad cronológica.', 2);

    const patArr: string[] = [];
    if (paciente.antecedentes_quirurgicos) patArr.push(`Quirúrgicos: ${paciente.antecedentes_quirurgicos}`);
    if (paciente.antecedentes_transfusionales) patArr.push(`Transfusionales: ${paciente.antecedentes_transfusionales}`);
    if (paciente.alergias) patArr.push(`Alergias: ${paciente.alergias}`);
    const patText = datos.antecedentes_patologicos || (patArr.length > 0 ? patArr.join('. ') + '.' : 'Enfermedades crónicas, quirúrgicos y alérgicos interrogados y negados.');
    drawRuledBlock('VIII. ANTECEDENTES PERSONALES PATOLÓGICOS', patText, 2);

    drawRuledBlock('IX. PADECIMIENTO ACTUAL', datos.padecimiento_actual || 'Padecimiento pediátrico referido por el familiar acompañante.', 3);

    doc.fontSize(6.8).font(this.fontBold(doc)).text('X. INTERROGATORIO POR APARATOS Y SISTEMAS', left, y);
    y += 9;

    const pedsAparatos1 = [
      { name: 'CARDIOVASCULAR', val: datos.int_cardiovascular || 'Sin alteraciones referidas.' },
      { name: 'RESPIRATORIO', val: datos.int_respiratorio || 'Sin alteraciones referidas.' },
      { name: 'GASTROINTESTINAL', val: datos.int_gastrointestinal || 'Sin alteraciones referidas.' },
      { name: 'GENITOURINARIO', val: datos.int_genitourinario || 'Sin alteraciones referidas.' },
      { name: 'HEMÁTICO Y LINFÁTICO', val: datos.int_hematico_linfatico || 'Sin alteraciones referidas.' },
      { name: 'ENDOCRINO', val: datos.int_endocrino || 'Sin alteraciones referidas.' },
    ];

    pedsAparatos1.forEach(ap => {
      drawPedsInlineItem(ap.name, ap.val, 11);
    });

    this.dibujarPie(doc, '208C0101100000L -040-19', undefined, { startX: left, width: totalW });

    // PÁGINA 2
    doc.addPage();
    this.dibujarEncabezadoOficial(doc, 'Historia Clínica Pediátrica', { startX: left, bannerWidth: totalW });

    y = 82;
    doc.fontSize(6.8).font(this.fontBold(doc)).text('X. INTERROGATORIO POR APARATOS Y SISTEMAS', left, y);
    y += 9;

    const pedsAparatos2 = [
      { name: 'NERVIOSO', val: datos.int_nervioso || 'Normal para la edad cronológica.' },
      { name: 'MUSCULO ESQUELÉTICO', val: datos.int_musculoesqueletico || 'Normal para la edad cronológica.' },
      { name: 'PIEL Y MUCOSAS', val: datos.int_piel_mucosas || 'Normal para la edad cronológica.' },
    ];

    pedsAparatos2.forEach(ap => {
      drawPedsInlineItem(ap.name, ap.val, 11);
    });
    y += 4;

    // XI. SIGNOS VITALES
    doc.fontSize(6.8).font(this.fontBold(doc)).text('XI. SIGNOS VITALES', left, y);
    y += 9;

    const colW = Math.floor(totalW / 6);
    const svHeaders = ['T/A', 'TEMP.', 'FREC. C.', 'FREC. R.', 'PESO', 'TALLA'];
    const svVals = [
      datos.presion_arterial || '--',
      datos.temperatura ? `${datos.temperatura} °C` : '--',
      datos.frecuencia_cardiaca ? `${datos.frecuencia_cardiaca} lpm` : '--',
      datos.frecuencia_respiratoria ? `${datos.frecuencia_respiratoria} rpm` : '--',
      datos.peso ? `${datos.peso} kg` : '--',
      datos.talla ? `${datos.talla} cm` : '--'
    ];

    doc.lineWidth(0.5).rect(left, y, totalW, 14).stroke('#000000');
    doc.lineWidth(0.5).rect(left, y + 14, totalW, 14).stroke('#000000');

    for (let c = 0; c < 6; c++) {
      const cX = left + c * colW;
      if (c > 0) {
        doc.lineWidth(0.5).moveTo(cX, y).lineTo(cX, y + 28).stroke('#000000');
      }
      doc.fontSize(5.8).font(this.fontBold(doc)).fillColor('#000000').text(svHeaders[c], cX + 2, y + 3.5, { width: colW - 4, align: 'center' });
      doc.fontSize(6.8).font(this.fontSemi(doc)).fillColor('#000000').text(svVals[c], cX + 2, y + 17.5, { width: colW - 4, align: 'center' });
    }
    y += 32;

    // XII. EXPLORACIÓN FÍSICA
    doc.fontSize(6.8).font(this.fontBold(doc)).text('XII. EXPLORACIÓN FÍSICA', left, y);
    y += 9;

    const efPedsList = [
      { name: 'HABITUS EXTERIOR Y ESTADO NEUROLÓGICO', val: datos.habitus_exterior_neurologico || 'Paciente pediátrico íntegro, reactivo a estímulos, llanto vigoroso.' },
      { name: 'CABEZA', val: datos.ef_cabeza || 'Normocéfalo, sin hundimientos ni exostosis.' },
      { name: 'CUELLO', val: datos.ef_cuello || 'Cilíndrico, simétrico, sin adenomegalias palpables.' },
      { name: 'TÓRAX', val: datos.ef_torax || 'Normolíneo, simétrico, campos pulmonares bien ventilados, ruidos cardiacos rítmicos.' },
      { name: 'ABDOMEN', val: datos.ef_abdomen || 'Blando, depresible, no doloroso, peristalsis presente y normoactiva.' },
      { name: 'GENITALES', val: datos.ef_genitales || 'Genitales externos íntegros acordes a edad y sexo biológico.' },
      { name: 'EXTREMIDADES', val: datos.ef_extremidades || 'Simétricas, funcionales, arcos de movilidad completos, pulsos distales presentes.' },
      { name: 'PIEL', val: datos.ef_piel || (datos.int_piel_mucosas || 'Turgente, adecuada coloración y elasticidad.') },
    ];

    efPedsList.forEach(ef => {
      drawPedsInlineItem(ef.name, ef.val, 12);
    });
    y += 4;

    drawRuledBlock('XIII. RESULTADOS PREVIOS Y ACTUALES DE LABORATORIO, GABINETE Y OTROS', datos.resultados_laboratorio || 'Sin estudios previos reportados.', 2);
    drawRuledBlock('XIV. DIAGNÓSTICOS Y PROBLEMAS CLÍNICOS', datos.diagnosticos || 'Sin diagnósticos registrados.', 2);
    drawRuledBlock('XV. TERAPÉUTICA EMPLEADA Y RESULTADOS', datos.terapeutica_empleada || 'Plan hospitalario pediátrico en curso.', 3);
    drawRuledBlock('XVI. PRONÓSTICO', datos.pronostico || 'Favorable para la vida y la función.', 2);

    // Firma Personal Médico
    y = 695;
    const sigW = 240;
    const sigX = left + (totalW - sigW) / 2;
    doc.fontSize(7).font(this.fontBold(doc)).text('PERSONAL MÉDICO', sigX, y - 22, { align: 'center', width: sigW });
    doc.lineWidth(0.6).moveTo(sigX, y).lineTo(sigX + sigW, y).stroke('#000000');
    this.dibujarTextoAjustado(doc, datos.medico_nombre || 'Personal Médico Pediatra', sigX, y - 12, sigW, 11, { maxFontSize: 7.5, minFontSize: 5.5, isBold: true, align: 'center' });
    doc.fontSize(6.2).font(this.fontReg(doc)).text('NOMBRE Y FIRMA', sigX, y + 4, { align: 'center', width: sigW });

    this.dibujarPie(doc, '208C0101100000L -040-19', undefined, { startX: left, width: totalW });
    doc.end();
  }

  // ============================================================
  // 6. HOJA DE CONSULTA DE URGENCIAS (Formato 208C0101100000L-088-24)
  // ============================================================
  public static generarConsultaUrgencias(res: Response, datos: any, paciente: any) {
    const doc = this.crearDoc(res, `Consulta_Urgencias_${paciente.expediente_clinico}`, {
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    });
    const left = 24;
    const totalW = 564;
    const right = left + totalW;

    const regF = this.fontReg(doc);
    const semiF = this.fontSemi(doc);
    const boldF = this.fontBold(doc);

    // 1. Logos oficiales superiores
    LogoConfigService.dibujarEncabezado(doc, '', { startX: left, bannerWidth: totalW, soloLogos: true });

    // 2. Franja de título con líneas horizontales superior e inferior (abierta a los lados)
    const hLine = (yPos: number, lw = 0.7) => {
      doc.lineWidth(lw).moveTo(left, yPos).lineTo(right, yPos).stroke('#000000');
    };
    const vLine = (xPos: number, y1: number, y2: number, lw = 0.7) => {
      doc.lineWidth(lw).moveTo(xPos, y1).lineTo(xPos, y2).stroke('#000000');
    };

    hLine(62, 0.8);
    doc.font(boldF).fontSize(10.5).fillColor('#000000').text('HOJA DE CONSULTA DE URGENCIAS', left, 66.5, {
      width: totalW,
      align: 'center',
      lineBreak: false,
    });
    hLine(81, 0.8);

    // Helper para celdas abiertas (etiqueta arriba a la izquierda, valor abajo)
    const drawOpenCell = (x: number, y: number, w: number, h: number, label: string, val: string) => {
      if (label) {
        doc.font(regF).fontSize(7.2).fillColor('#000000').text(label, x + 5, y + 3, {
          width: w - 10,
          lineBreak: false,
        });
      }
      if (val) {
        this.dibujarTextoAjustado(doc, val, x + 5, y + 13.5, w - 10, h - 15, {
          maxFontSize: 8.2,
          minFontSize: 6.0,
          font: semiF,
          align: 'left',
        });
      }
    };

    // Helper para casillas con recuadro a la derecha del texto ("Masculino [  ]", "Si [  ]")
    const drawRightBox = (x: number, y: number, label: string, checked: boolean, boxW = 18, boxH = 9) => {
      doc.font(regF).fontSize(7.2).fillColor('#000000').text(label, x, y + 1, { lineBreak: false });
      const labelW = doc.widthOfString(label);
      const bx = x + labelW + 5;
      doc.lineWidth(0.7).rect(bx, y, boxW, boxH).stroke('#000000');
      if (checked) {
        doc.font(boldF).fontSize(7.5).fillColor('#000000').text('X', bx, y + 0.5, {
          width: boxW,
          align: 'center',
          lineBreak: false,
        });
      }
    };

    const nombreComp = `${paciente.apellido_paterno || ''} ${paciente.apellido_materno || ''} ${paciente.nombre || ''}`.replace(/\s+/g, ' ').trim();
    const s = String(paciente.sexo || '').trim().toUpperCase();
    const esFem = s === 'F' || s.startsWith('FEM') || s.startsWith('MUJ');
    const esMasc = s === 'M' || s === 'H' || s.startsWith('MASC') || s.startsWith('HOMB');

    // Fila Núm. Folio (abierta, con línea subrayada a la derecha)
    doc.font(regF).fontSize(7.5).fillColor('#000000').text('Núm. Folio', left + 356, 89, { lineBreak: false });
    doc.lineWidth(0.7).moveTo(left + 402, 98.5).lineTo(right, 98.5).stroke('#000000');
    this.dibujarTextoAjustado(doc, String(datos.folio || 'URG-001'), left + 406, 87.5, totalW - 410, 10, {
      maxFontSize: 8.2,
      minFontSize: 6.5,
      font: semiF,
      align: 'center',
    });
    hLine(103, 0.7);

    // Fila Unidad Médica | Núm. de Expediente (y = 103..129)
    drawOpenCell(left, 103, 402, 26, 'Unidad Médica', datos.unidad_medica || 'Hospital General San Felipe del Progreso');
    vLine(left + 402, 103, 129);
    drawOpenCell(left + 402, 103, totalW - 402, 26, 'Núm. de Expediente', String(paciente.expediente_clinico || ''));
    hLine(129, 0.7);

    // Fila Fecha de Registro | Hora de Registro | Código de Triage (y = 129..156)
    const fReg = datos.fecha_registro ? this.formatFecha(datos.fecha_registro) : this.formatFecha(datos.fecha_hora_registro || new Date());
    const hReg = datos.hora_registro || (datos.fecha_hora_registro ? new Date(datos.fecha_hora_registro).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '12:00 hrs');
    const cTriage = datos.codigo_triage || (datos.triage_color ? `Triage ${String(datos.triage_color).toUpperCase()}` : 'Urgencia Calificada');
    drawOpenCell(left, 129, 178, 27, 'Fecha de Registro', fReg);
    vLine(left + 178, 129, 156);
    drawOpenCell(left + 178, 129, 188, 27, 'Hora de Registro', hReg);
    vLine(left + 366, 129, 156);
    drawOpenCell(left + 366, 129, totalW - 366, 27, 'Código de Triage', cTriage);
    hLine(156, 0.7);

    // Banda I. Ficha de Identificación (y = 156..170)
    doc.font(boldF).fontSize(8.2).fillColor('#000000').text('I.     Ficha de Identificación', left + 16, 159.5, { lineBreak: false });
    hLine(170, 0.7);

    // Sub-fila 1: Nombre de la o del Paciente | Estado Civil | Sexo (y = 170..197)
    drawOpenCell(left, 170, 298, 27, 'Nombre de la o del Paciente', nombreComp);
    vLine(left + 298, 170, 197);
    drawOpenCell(left + 298, 170, 104, 27, 'Estado Civil', paciente.estado_civil || 'Soltera(o)');
    vLine(left + 402, 170, 197);
    drawOpenCell(left + 402, 170, totalW - 402, 27, 'Sexo', '');
    drawRightBox(left + 410, 183.5, 'Masculino', esMasc, 18, 9);
    drawRightBox(left + 485, 183.5, 'Femenino', esFem, 18, 9);
    hLine(197, 0.7);

    // Sub-fila 2: Fecha de Nacimiento | Edad | Ocupación de la o del Paciente (y = 197..224)
    drawOpenCell(left, 197, 178, 27, 'Fecha de Nacimiento', this.formatFecha(paciente.fecha_nacimiento));
    vLine(left + 178, 197, 224);
    drawOpenCell(left + 178, 197, 188, 27, 'Edad', `${paciente.edad || '--'} años`);
    vLine(left + 366, 197, 224);
    drawOpenCell(left + 366, 197, totalW - 366, 27, 'Ocupación de la o del Paciente', paciente.ocupacion || 'Hogar');
    hLine(224, 0.7);

    // Sub-fila 3: Procedencia | Urgencia Calificada (y = 224..251)
    drawOpenCell(left, 224, 326, 27, 'Procedencia', datos.procedencia || paciente.domicilio_municipio || 'San Felipe del Progreso');
    vLine(left + 326, 224, 251);
    drawOpenCell(left + 326, 224, totalW - 326, 27, 'Urgencia Calificada', '');
    drawRightBox(left + 406, 237.5, 'Si', datos.urgencia_calificada_bool !== false, 16, 9);
    drawRightBox(left + 462, 237.5, 'No', datos.urgencia_calificada_bool === false, 16, 9);
    hLine(251, 0.7);

    // Sub-fila 4: Nombre de la o del Responsable | Parentesco (y = 251..278)
    drawOpenCell(left, 251, 326, 27, 'Nombre de la o del Responsable de la o del Paciente', datos.responsable_nombre || paciente.contacto_emergencia_nombre || 'Familiar Responsable');
    vLine(left + 326, 251, 278);
    drawOpenCell(left + 326, 251, totalW - 326, 27, 'Parentesco con la o el Paciente', datos.responsable_parentesco || paciente.contacto_emergencia_parentesco || 'Familiar');
    hLine(278, 0.7);

    // Sub-fila 5: Domicilio | Teléfono (y = 278..305)
    drawOpenCell(left, 278, 326, 27, 'Domicilio', datos.responsable_domicilio || paciente.domicilio || `${paciente.domicilio_municipio || ''}, ${paciente.domicilio_entidad || ''}`);
    vLine(left + 326, 278, 305);
    drawOpenCell(left + 326, 278, totalW - 326, 27, 'Teléfono', datos.responsable_telefono || paciente.telefono || 'Sin teléfono');
    hLine(305, 0.7);

    // Sub-fila 6: Fecha y Hora de Atención (y = 305..332)
    let fAtencion = '--';
    if (datos.fecha_hora_atencion) {
      const d = new Date(datos.fecha_hora_atencion);
      if (!isNaN(d.getTime())) {
        fAtencion = `${this.formatFecha(d)} ${d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} hrs`;
      } else {
        fAtencion = `${String(datos.fecha_hora_atencion)} hrs`;
      }
    } else {
      const d = new Date();
      fAtencion = `${this.formatFecha(d)} ${d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} hrs`;
    }
    drawOpenCell(left, 305, totalW, 27, 'Fecha y Hora de Atención', fAtencion);
    hLine(332, 0.7);

    // Banda II. Signos Vitales (y = 332..346)
    doc.font(boldF).fontSize(8.2).fillColor('#000000').text('II.     Signos Vitales', left + 16, 335.5, { lineBreak: false });
    hLine(346, 0.7);

    // Tabla de 6 columnas de Signos Vitales (y = 346..367 encabezados, 367..388 valores)
    const colW = totalW / 6;
    const sv = [
      { label: 'T/A', val: datos.ta || '--' },
      { label: 'Temperatura', val: `${datos.temp || '--'} °C` },
      { label: 'Frecuencia\nRespiratoria', val: `${datos.fr || '--'} rpm` },
      { label: 'Frecuencia\nCardiaca', val: `${datos.fc || '--'} lpm` },
      { label: 'Peso', val: `${datos.peso || '--'} kg` },
      { label: 'Talla', val: `${datos.talla || '--'} cm` },
    ];
    for (let c = 0; c < 6; c++) {
      const cx = left + c * colW;
      if (c > 0) {
        vLine(cx, 346, 388);
      }
      const isTwoLine = sv[c].label.includes('\n');
      doc.font(regF).fontSize(7.2).fillColor('#000000').text(sv[c].label, cx + 2, isTwoLine ? 348.5 : 353, {
        width: colW - 4,
        align: 'center',
        lineGap: 0.5,
      });
      this.dibujarTextoAjustado(doc, sv[c].val, cx + 3, 372.5, colW - 6, 12, {
        maxFontSize: 8.2,
        minFontSize: 6.5,
        font: semiF,
        align: 'center',
      });
    }
    hLine(367, 0.7);
    hLine(388, 0.7);

    // Helper para Secciones III a X con banda de título y 7 renglones rayados
    const drawRuledSection = (sec: string, title: string, text: string, topY: number, drawTopLine = false, lineSpacing = 14.0) => {
      if (drawTopLine) {
        hLine(topY, 0.7);
      }
      const titleBandH = 14;
      const numLines = 7;

      doc.font(boldF).fontSize(8.2).fillColor('#000000').text(`${sec}     ${title}`, left + 16, topY + 3.2, {
        lineBreak: false,
      });
      const firstRuleY = topY + titleBandH;
      hLine(firstRuleY, 0.7);

      for (let i = 1; i <= numLines; i++) {
        hLine(firstRuleY + i * lineSpacing, 0.7);
      }

      this.dibujarTextoAjustado(doc, text || 'Sin hallazgos clínicos referidos.', left + 6, firstRuleY + 2.5, totalW - 12, numLines * lineSpacing - 5, {
        maxFontSize: 8.0,
        minFontSize: 6.0,
        font: regF,
        lineGap: 3.6,
      });
    };

    // Secciones en Anverso (Página 1): cada sección ocupa 14 + 7*13.8 = 110.6pt + 13.8pt de espacio libre antes de la siguiente
    drawRuledSection('III.', 'Motivo de la Consulta', datos.motivo_consulta, 388, false, 13.8);
    drawRuledSection('IV.', 'Antecedentes', datos.antecedentes || paciente.antecedentes_patologicos, 512.5, true, 13.8);
    drawRuledSection('V.', 'Padecimiento Actual', datos.padecimiento_actual || datos.evolucion, 637, true, 13.5);

    // Pie de página Anverso
    doc.font(boldF).fontSize(8.5).fillColor('#000000').text('Anverso', left, 748, { width: totalW, align: 'right', lineBreak: false });
    doc.font(boldF).fontSize(8.5).fillColor('#000000').text('208C0101100000L-088-24', left, 758, { width: totalW, align: 'right', lineBreak: false });

    // ============================================================
    // PÁGINA 2 (REVERSO)
    // ============================================================
    doc.addPage({ size: 'LETTER', margins: { top: 0, bottom: 0, left: 0, right: 0 } });

    drawRuledSection('VI.', 'Exploración Física', datos.exploracion_fisica || datos.ef_urgencias, 36, true, 13.4);
    drawRuledSection('VII.', 'Diagnóstico(s) Presuncional(es) (Principal y Otros)', datos.diagnosticos_presuncionales || datos.diagnostico, 157, true, 13.4);
    drawRuledSection('VIII.', 'Análisis y Pronósticos', datos.analisis_pronosticos || datos.evolucion || 'Pronóstico reservado a evolución clínica.', 278, true, 13.4);
    drawRuledSection('IX.', 'Tratamiento y Plan', datos.tratamiento_plan || datos.plan, 399, true, 13.4);
    drawRuledSection('X.', 'Observaciones y Estudios', datos.observaciones_estudios || datos.resultados_estudios || datos.estudios_solicitados || datos.destino_paciente || 'En observación clínica y monitoreo en área de urgencias.', 520, true, 13.4);

    // Bloque de firmas inferior abierto a los lados con divisor central vertical
    const sigTopY = 641;
    const sigBotY = 731;
    const halfW = totalW / 2;
    const midX = left + halfW;

    hLine(sigTopY, 0.7);
    vLine(midX, sigTopY, sigBotY, 0.7);
    hLine(sigBotY, 0.7);

    doc.font(regF).fontSize(8).fillColor('#000000').text('Nombre y Firma de Enterado del Familiar', left, sigTopY + 6, {
      width: halfW,
      align: 'center',
      lineBreak: false,
    });
    doc.font(regF).fontSize(8).fillColor('#000000').text('Nombre y Firma del Personal Médico', midX, sigTopY + 6, {
      width: halfW,
      align: 'center',
      lineBreak: false,
    });

    // Líneas internas de firma centradas en cada mitad y nombres impresos
    const sigLineY = sigBotY - 14;
    doc.lineWidth(0.7).moveTo(left + 44, sigLineY).lineTo(left + halfW - 44, sigLineY).stroke('#000000');
    doc.lineWidth(0.7).moveTo(midX + 44, sigLineY).lineTo(right - 44, sigLineY).stroke('#000000');

    const famNombre = datos.familiar_nombre || datos.responsable_nombre || paciente.contacto_emergencia_nombre || nombreComp;
    this.dibujarTextoAjustado(doc, famNombre, left + 20, sigLineY - 12, halfW - 40, 11, {
      maxFontSize: 8.0,
      minFontSize: 6.0,
      font: boldF,
      align: 'center',
    });

    const medNombre = datos.medico_nombre || 'Médico de Urgencias';
    this.dibujarTextoAjustado(doc, medNombre, midX + 20, sigLineY - 12, halfW - 40, 11, {
      maxFontSize: 8.0,
      minFontSize: 6.0,
      font: boldF,
      align: 'center',
    });

    // Pie de página Reverso
    doc.font(boldF).fontSize(8.5).fillColor('#000000').text('Reverso', left, 748, { width: totalW, align: 'right', lineBreak: false });
    doc.font(boldF).fontSize(8.5).fillColor('#000000').text('208C0101100000L-088-24', left, 758, { width: totalW, align: 'right', lineBreak: false });

    doc.end();
  }

  // ============================================================
  // 7. HOJA DE INDICACIONES MÉDICAS (Formato 208C0101100000L-047-19)
  // ============================================================
  public static generarIndicaciones(res: Response, datos: any, paciente: any) {
    const doc = this.crearDoc(res, `Indicaciones_Medicas_${paciente.expediente_clinico}`, {
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    const left = 31.8;
    const right = 579.7;
    const totalW = right - left;

    const regF = this.fontReg(doc);
    const semiF = this.fontSemi(doc);
    const boldF = this.fontBold(doc);

    // Logos institucionales superiores
    LogoConfigService.dibujarEncabezado(doc, '', { startX: left, bannerWidth: totalW, soloLogos: true });

    const hLine = (yPos: number, lw = 0.6) => {
      doc.lineWidth(lw).moveTo(left, yPos).lineTo(right, yPos).stroke('#000000');
    };
    const vLine = (xPos: number, y1: number, y2: number, lw = 0.6) => {
      doc.lineWidth(lw).moveTo(xPos, y1).lineTo(xPos, y2).stroke('#000000');
    };

    const dy = -22.0;

    // Franja de título con líneas gruesas superior e inferior (abierta a los lados)
    hLine(84.5 + dy, 1.3);

    doc.font(boldF).fontSize(13.5).fillColor('#000000').text('Hoja de Indicaciones Médicas', 34.0, 88.0 + dy, {
      lineBreak: false,
    });

    doc.font(regF).fontSize(8.0).fillColor('#000000').text('HOJA No.', 485.1, 92.5 + dy, { lineBreak: false });
    const hojaNumVal = datos.hoja_num ? String(datos.hoja_num) : '1';
    doc.font(boldF).fontSize(9.0).text(hojaNumVal, 530.0, 91.5 + dy, { lineBreak: false });

    hLine(107.3 + dy, 1.3);

    // Fila 1: UNIDAD MÉDICA: | No. EXPEDIENTE: (abierta en bordes izquierdo y derecho)
    const hFila1 = 26.5;
    const yFila1 = 110.3 + dy;
    hLine(yFila1, 0.6);
    hLine(yFila1 + hFila1, 0.6);
    vLine(448.4, yFila1, yFila1 + hFila1, 0.6);

    doc.font(regF).fontSize(6.0).fillColor('#000000').text('UNIDAD MÉDICA:', 34.0, yFila1 + 3.5, { lineBreak: false });
    const umVal = datos.unidad_medica || 'Hospital General San Felipe del Progreso';
    this.dibujarTextoAjustado(doc, umVal, 34.0, yFila1 + 12.0, 448.4 - 38.0, 13.5, { maxFontSize: 8.2, minFontSize: 5.8, font: semiF });

    doc.font(regF).fontSize(6.0).text('No. EXPEDIENTE:', 452.2, yFila1 + 3.5, { lineBreak: false });
    this.dibujarTextoAjustado(doc, String(paciente.expediente_clinico || '--'), 452.2, yFila1 + 12.0, right - 456.2, 13.5, { maxFontSize: 8.5, minFontSize: 5.8, font: semiF });

    // Fila 2: NOMBRE DE LA O EL PACIENTE | EDAD: | GÉNERO: (abierta en bordes izquierdo y derecho)
    const yFila2 = 139.1 + dy;
    hLine(yFila2, 0.6);
    hLine(yFila2 + hFila1, 0.6);
    vLine(403.6, yFila2, yFila2 + hFila1, 0.6);
    vLine(493.4, yFila2, yFila2 + hFila1, 0.6);

    doc.font(regF).fontSize(6.0).text('NOMBRE DE LA O EL  PACIENTE (APELLIDO PATERNO, APELLIDO MATERNO Y NOMBRE(S))', 34.0, yFila2 + 3.5, { lineBreak: false });
    const nombreCompleto = `${paciente.apellido_paterno || ''} ${paciente.apellido_materno || ''} ${paciente.nombre || ''}`.replace(/\s+/g, ' ').trim();
    this.dibujarTextoAjustado(doc, nombreCompleto, 34.0, yFila2 + 12.0, 403.6 - 38.0, 13.5, { maxFontSize: 8.2, minFontSize: 5.8, font: semiF });

    doc.font(regF).fontSize(6.0).text('EDAD:', 407.4, yFila2 + 3.5, { lineBreak: false });
    const edadStr = paciente.edad ? `${paciente.edad} AÑOS` : '--';
    this.dibujarTextoAjustado(doc, edadStr, 407.4, yFila2 + 12.0, 493.4 - 411.4, 13.5, { maxFontSize: 8.2, minFontSize: 5.8, font: semiF });

    doc.font(regF).fontSize(6.0).text('GÉNERO:', 497.3, yFila2 + 3.5, { lineBreak: false });

    const sexoUpper = String(paciente.sexo || '').toUpperCase();
    const esMasc = sexoUpper === 'M' || sexoUpper.startsWith('H') || sexoUpper.startsWith('MASC');
    const esFem = sexoUpper === 'F' || sexoUpper.startsWith('FEM') || sexoUpper.startsWith('MUJ');

    doc.lineWidth(0.6).rect(499.0, yFila2 + 11.5, 8.5, 8.5).stroke('#000000');
    if (esMasc) {
      doc.font(boldF).fontSize(6.8).text('X', 499.0, yFila2 + 12.0, { width: 8.5, align: 'center', lineBreak: false });
    }
    doc.font(regF).fontSize(6.0).text('MASC', 510.0, yFila2 + 13.0, { lineBreak: false });

    doc.lineWidth(0.6).rect(534.0, yFila2 + 11.5, 8.5, 8.5).stroke('#000000');
    if (esFem) {
      doc.font(boldF).fontSize(6.8).text('X', 534.0, yFila2 + 12.0, { width: 8.5, align: 'center', lineBreak: false });
    }
    doc.font(regF).fontSize(6.0).text('FEM', 545.0, yFila2 + 13.0, { lineBreak: false });

    // Fila 3: SERVICIO: | FECHA: | HORA: (abierta en bordes izquierdo y derecho)
    const yFila3 = 167.9 + dy;
    hLine(yFila3, 0.6);
    hLine(yFila3 + hFila1, 0.6);
    vLine(385.6, yFila3, yFila3 + hFila1, 0.6);
    vLine(484.5, yFila3, yFila3 + hFila1, 0.6);

    doc.font(regF).fontSize(6.0).text('SERVICIO:', 34.0, yFila3 + 3.5, { lineBreak: false });
    const servVal = datos.servicio || 'HOSPITALIZACIÓN GENERAL';
    this.dibujarTextoAjustado(doc, servVal, 34.0, yFila3 + 12.0, 385.6 - 38.0, 13.5, { maxFontSize: 8.2, minFontSize: 5.8, font: semiF });

    let fStr = '--';
    let hStr = '--';
    try {
      const fObj = datos.fecha ? new Date(datos.fecha) : new Date();
      if (!isNaN(fObj.getTime())) {
        fStr = this.formatFecha(fObj);
      }
      if (datos.hora) {
        hStr = String(datos.hora).substring(0, 5);
      } else {
        hStr = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
      }
    } catch {}

    doc.font(regF).fontSize(6.0).text('FECHA:', 389.4, yFila3 + 3.5, { lineBreak: false });
    doc.font(semiF).fontSize(8.2).text(fStr, 389.4, yFila3 + 12.5, { lineBreak: false });

    doc.font(regF).fontSize(6.0).text('HORA:', 488.3, yFila3 + 3.5, { lineBreak: false });
    doc.font(semiF).fontSize(8.2).text(hStr, 488.3, yFila3 + 12.5, { lineBreak: false });

    // SIGNOS VITALES (abierta en bordes izquierdo y derecho)
    doc.font(regF).fontSize(8.0).text('SIGNOS VITALES', 34.0, 196.5 + dy, { lineBreak: false });

    const yFilaSV = 205.6 + dy;
    hLine(yFilaSV, 0.6);
    hLine(yFilaSV + hFila1, 0.6);
    vLine(120.9, yFilaSV, yFilaSV + hFila1, 0.6);
    vLine(209.7, yFilaSV, yFilaSV + hFila1, 0.6);
    vLine(298.5, yFilaSV, yFilaSV + hFila1, 0.6);
    vLine(387.3, yFilaSV, yFilaSV + hFila1, 0.6);
    vLine(476.1, yFilaSV, yFilaSV + hFila1, 0.6);

    doc.font(regF).fontSize(6.0).text('T/A:', 34.0, yFilaSV + 3.5, { lineBreak: false });
    doc.font(semiF).fontSize(8.0).text(String(datos.ta || datos.presion_arterial || '--'), 34.0, yFilaSV + 13.0, { lineBreak: false });

    doc.font(regF).fontSize(6.0).text('TEMP.', 124.6, yFilaSV + 3.5, { lineBreak: false });
    doc.font(semiF).fontSize(8.0).text(datos.temp ? `${datos.temp} °C` : (datos.temperatura ? `${datos.temperatura} °C` : '--'), 124.6, yFilaSV + 13.0, { lineBreak: false });

    doc.font(regF).fontSize(6.0).text('FREC. C.', 213.4, yFilaSV + 3.5, { lineBreak: false });
    doc.font(semiF).fontSize(8.0).text(datos.fc ? `${datos.fc} /min` : (datos.frecuencia_cardiaca ? `${datos.frecuencia_cardiaca} /min` : '--'), 213.4, yFilaSV + 13.0, { lineBreak: false });

    doc.font(regF).fontSize(6.0).text('FREC. R.', 302.2, yFilaSV + 3.5, { lineBreak: false });
    doc.font(semiF).fontSize(8.0).text(datos.fr ? `${datos.fr} /min` : (datos.frecuencia_respiratoria ? `${datos.frecuencia_respiratoria} /min` : '--'), 302.2, yFilaSV + 13.0, { lineBreak: false });

    doc.font(regF).fontSize(6.0).text('PESO:', 391.0, yFilaSV + 3.5, { lineBreak: false });
    doc.font(semiF).fontSize(8.0).text(datos.peso ? `${datos.peso} kg` : '--', 391.0, yFilaSV + 13.0, { lineBreak: false });

    doc.font(regF).fontSize(6.0).text('TALLA:', 479.9, yFilaSV + 3.5, { lineBreak: false });
    doc.font(semiF).fontSize(8.0).text(datos.talla ? `${datos.talla} cm` : '--', 479.9, yFilaSV + 13.0, { lineBreak: false });

    // Tabla principal abierta a los lados (solo líneas horizontales superior, divisor de encabezado e inferior, y 3 divisores verticales internos)
    const yTableTop = 236.7 + dy;
    const yTableBottom = 745.7;
    const hHeaderRow = 32.6;
    const yHeaderDivider = yTableTop + hHeaderRow;

    const colX0 = left;
    const colX1 = 89.8;
    const colX2 = 143.8;
    const colX3 = 458.9;
    const colX4 = right;

    hLine(yTableTop, 0.6);
    hLine(yHeaderDivider, 0.6);
    hLine(yTableBottom, 0.6);

    vLine(colX1, yTableTop, yTableBottom, 0.6);
    vLine(colX2, yTableTop, yTableBottom, 0.6);
    vLine(colX3, yTableTop, yTableBottom, 0.6);

    doc.font(regF).fontSize(8.0).fillColor('#000000');
    doc.text('FECHA', colX0, yTableTop + 12.0, { width: colX1 - colX0, align: 'center', lineBreak: false });
    doc.text('HORA', colX1, yTableTop + 12.0, { width: colX2 - colX1, align: 'center', lineBreak: false });
    doc.text('INDICACIONES MÉDICAS', colX2, yTableTop + 12.0, { width: colX3 - colX2, align: 'center', lineBreak: false });
    doc.fontSize(7.5).text('NOMBRE Y FIRMA DEL\nPERSONAL MÉDICO\nTRATANTE', colX3, yTableTop + 3.2, { width: colX4 - colX3, align: 'center', lineGap: 0.2 });

    const ordenes = Array.isArray(datos.ordenes) ? datos.ordenes : [];
    let curY = yHeaderDivider + 8;

    ordenes.forEach((ord: any) => {
      if (curY >= yTableBottom - 24) return;

      let ordFecha = '';
      try {
        if (ord.fecha) {
          ordFecha = this.formatFecha(ord.fecha);
        }
      } catch {}

      let ordHora = '';
      try {
        if (ord.hora) ordHora = String(ord.hora).substring(0, 5);
      } catch {}

      const indText = ord.indicacion || '';
      const medText = `${ord.medico_nombre || 'Médico tratante'}`;

      doc.font(regF).fontSize(8.0);
      const textH = doc.heightOfString(indText, { width: colX3 - colX2 - 14, lineGap: 2.0 });
      const signatureSpace = 38;
      const medH = doc.heightOfString(medText, { width: colX4 - colX3 - 10, lineGap: 1.2 }) + signatureSpace;
      const rowH = Math.max(48, Math.max(textH + 12, medH + 10));

      if (curY + rowH > yTableBottom) return;

      doc.font(regF).fontSize(7.8).fillColor('#000000').text(ordFecha, colX0 + 2, curY, { width: colX1 - colX0 - 4, align: 'center' });
      doc.font(regF).fontSize(7.8).text(ordHora, colX1 + 2, curY, { width: colX2 - colX1 - 4, align: 'center' });

      doc.font(regF).fontSize(8.0).text(indText, colX2 + 7, curY, { width: colX3 - colX2 - 14, align: 'left', lineGap: 2.0 });

      // Nombre del médico debajo del espacio en blanco reservado para su firma autógrafa
      const sigY = curY + Math.max(signatureSpace, textH - 6);
      doc.font(semiF).fontSize(7.2).text(medText, colX3 + 5, sigY, { width: colX4 - colX3 - 10, align: 'center', lineGap: 1.2 });

      curY += rowH + 8;
    });

    doc.font(boldF).fontSize(8.0).fillColor('#000000').text('NOTA:', 34.0, 750.4, { lineBreak: false });
    doc.font(regF).fontSize(8.0).text('TODAS LAS NOTAS MÉDICAS DEBERÁN ESTAR FIRMADAS POR EL PERSONAL MÉDICO ADSCRITO DEL SERVICIO', 63.0, 750.4, { lineBreak: false });

    doc.font(regF).fontSize(7.0).text('208C0101100000L-047-19', 420.0, 761.8, { width: right - 420.0, align: 'right', lineBreak: false });

    doc.end();
  }


  // ============================================================
  // 8. NOTAS DE EVOLUCIÓN (Formato 208C0101100000L-016-25)
  // ============================================================
  public static generarNotasEvolucion(res: Response, notas: any[], paciente: any) {
    const doc = this.crearDoc(res, `Notas_Evolucion_${paciente.expediente_clinico}`, {
      margins: { top: 15, bottom: 15, left: 20, right: 20 },
      bufferPages: true,
    });

    const left = 20;
    const totalW = 572;
    const colFH = 94;
    const colNota = totalW - colFH;
    const tableBottom = 725.0;
    const closingLineY = 736.0;

    const boldF = this.fontBold(doc);
    const regF = this.fontReg(doc);
    const semiF = this.fontSemi(doc);

    const nombreComp = `${paciente.apellido_paterno || ''} ${paciente.apellido_materno || ''} ${paciente.nombre || ''}`.replace(/\s+/g, ' ').trim();
    const s = String(paciente.sexo || '').trim().toUpperCase();
    const esFem = s === 'F' || s.startsWith('FEM') || s.startsWith('MUJ');
    const esMasc = s === 'M' || s === 'H' || s.startsWith('MASC') || s.startsWith('HOMB');

    const colW = totalW / 6;
    const ultNota = (notas && notas.length > 0) ? notas[notas.length - 1] : {};
    const svVals = [
      ultNota.presion_arterial ? `${ultNota.presion_arterial} mmHg` : '--',
      ultNota.temperatura ? `${ultNota.temperatura} °C` : '--',
      ultNota.frecuencia_cardiaca ? `${ultNota.frecuencia_cardiaca} lpm` : '--',
      ultNota.frecuencia_respiratoria ? `${ultNota.frecuencia_respiratoria} rpm` : '--',
      ultNota.peso ? `${ultNota.peso} kg` : '--',
      ultNota.talla ? `${ultNota.talla} cm` : '--'
    ];

    const dibujarSignosVitales = (svTop: number): number => {
      const hdrTop = svTop + 13;
      const valTop = hdrTop + 20;
      const svBot = valTop + 22;

      doc.fontSize(7.0).font(boldF).fillColor('#000000').text('Signos Vitales / Antropometría', left + 4, svTop + 2.5);
      doc.lineWidth(0.7).moveTo(left, hdrTop).lineTo(left + totalW, hdrTop).stroke('#000000');
      doc.lineWidth(0.7).moveTo(left, valTop).lineTo(left + totalW, valTop).stroke('#000000');
      doc.lineWidth(0.7).moveTo(left, svBot).lineTo(left + totalW, svBot).stroke('#000000');

      const labels = ['Tensión Arterial', 'Temperatura', 'Frecuencia Cardiaca', 'Frecuencia\nRespiratoria', 'Peso', 'Talla'];
      for (let c = 0; c < 6; c++) {
        const cx = left + c * colW;
        if (c > 0) {
          doc.lineWidth(0.7).moveTo(cx, hdrTop).lineTo(cx, svBot).stroke('#000000');
        }
        const lblY = c === 3 ? hdrTop + 2.5 : hdrTop + 6;
        doc.fontSize(6.8).font(regF).fillColor('#000000').text(labels[c], cx + 2, lblY, { align: 'center', width: colW - 4, lineGap: 0.5 });
        doc.fontSize(7.2).font(semiF).fillColor('#000000').text(svVals[c], cx + 2, valTop + 6.5, { align: 'center', width: colW - 4 });
      }
      doc.lineWidth(0.7).moveTo(left + totalW, hdrTop).lineTo(left + totalW, svBot).stroke('#000000');
      return svBot;
    };

    const dibujarTablaNotas = (tblTop: number, numRows: number): { bodyStartY: number; lineH: number } => {
      doc.lineWidth(0.7).moveTo(left, tblTop - 2).lineTo(left + totalW, tblTop - 2).stroke('#000000');
      doc.lineWidth(0.7).moveTo(left, tblTop).lineTo(left + totalW, tblTop).stroke('#000000');

      const bodyStartY = tblTop + 13.5;
      doc.fontSize(7.2).font(boldF).fillColor('#000000')
        .text('Fecha y Hora', left, tblTop + 2.5, { width: colFH, align: 'center' })
        .text('Nota de Evolución', left + colFH, tblTop + 2.5, { width: colNota, align: 'center' });

      doc.lineWidth(0.7).moveTo(left, bodyStartY).lineTo(left + totalW, bodyStartY).stroke('#000000');
      doc.lineWidth(0.7).moveTo(left + colFH, tblTop).lineTo(left + colFH, tableBottom).stroke('#000000');

      const lineH = (tableBottom - bodyStartY) / numRows;
      for (let r = 1; r <= numRows; r++) {
        const ly = bodyStartY + r * lineH;
        doc.lineWidth(0.6).moveTo(left, ly).lineTo(left + totalW, ly).stroke('#000000');
      }

      doc.lineWidth(0.7).moveTo(left, closingLineY).lineTo(left + totalW, closingLineY).stroke('#000000');

      doc.fontSize(7.0).font(boldF).fillColor('#000000')
        .text('Nota: ', left, closingLineY + 2.5, { continued: true })
        .font(regF)
        .text('Todas las notas médicas deberán estar firmadas por el personal médico que la elabora.', { continued: false });

      doc.fontSize(7.8).font(boldF).fillColor('#000000')
        .text('208C0101100000L-016-25', left, 754, { align: 'right', width: totalW });

      return { bodyStartY, lineH };
    };

    const dibujarPaginaInicial = () => {
      LogoConfigService.dibujarEncabezado(doc, '', { startX: left, bannerWidth: totalW, soloLogos: true });

      doc.lineWidth(0.7).moveTo(left, 63.0).lineTo(left + totalW, 63.0).stroke('#000000');
      doc.fontSize(11.0).font(boldF).fillColor('#000000').text('NOTAS DE EVOLUCIÓN', left, 67.5, { width: totalW, align: 'center' });
      doc.lineWidth(0.7).moveTo(left, 82.0).lineTo(left + totalW, 82.0).stroke('#000000');

      // 1/ Hoja Núm. ____ de ____
      doc.fontSize(7.0).font(regF).fillColor('#000000').text('Hoja Núm.', left + 344, 89.0);
      doc.lineWidth(0.6).moveTo(left + 392, 97.5).lineTo(left + 448, 97.5).stroke('#000000');
      doc.fontSize(7.0).font(regF).fillColor('#000000').text('de', left + 455, 89.0);
      doc.lineWidth(0.6).moveTo(left + 468, 97.5).lineTo(left + totalW, 97.5).stroke('#000000');
      doc.lineWidth(0.7).moveTo(left, 100.0).lineTo(left + totalW, 100.0).stroke('#000000');

      // 2/ Unidad Médica | 3/ Núm. de Expediente
      const r1Top = 100.0;
      const r1Bot = 117.5;
      doc.fontSize(6.8).font(regF).fillColor('#000000').text('Unidad Médica', left + 4, r1Top + 1.5);
      this.dibujarTextoAjustado(doc, 'Hospital General San Felipe del Progreso', left + 4, r1Top + 9, 326, 8.5, { maxFontSize: 7.2, minFontSize: 5.5, isBold: true });

      doc.lineWidth(0.7).moveTo(left + 334, r1Top).lineTo(left + 334, r1Bot).stroke('#000000');
      doc.fontSize(6.8).font(regF).fillColor('#000000').text('Núm. de Expediente', left + 338, r1Top + 1.5);
      this.dibujarTextoAjustado(doc, paciente.expediente_clinico || '--', left + 338, r1Top + 9, totalW - 342, 8.5, { maxFontSize: 7.2, minFontSize: 5.5, isBold: true });

      doc.lineWidth(0.7).moveTo(left, r1Bot).lineTo(left + totalW, r1Bot).stroke('#000000');
      doc.lineWidth(0.7).moveTo(left, r1Bot + 2).lineTo(left + totalW, r1Bot + 2).stroke('#000000');

      // 4/ Nombre de la o del Paciente | 5/ Fecha de Nacimiento | 6/ Edad | 7/ Sexo
      const r2Top = r1Bot + 2;
      const r2Bot = 145.5;
      doc.fontSize(6.8).font(regF).fillColor('#000000').text('Nombre de la o del Paciente', left + 4, r2Top + 2);
      this.dibujarTextoAjustado(doc, nombreComp, left + 4, r2Top + 12, 208, 11, { maxFontSize: 7.4, minFontSize: 5.5, isBold: true });

      doc.lineWidth(0.7).moveTo(left + 216, r2Top).lineTo(left + 216, r2Bot).stroke('#000000');
      doc.fontSize(6.8).font(regF).fillColor('#000000').text('Fecha de Nacimiento', left + 220, r2Top + 2);
      doc.fontSize(7.2).font(semiF).fillColor('#000000').text(this.formatFecha(paciente.fecha_nacimiento), left + 220, r2Top + 12.5);

      doc.lineWidth(0.7).moveTo(left + 334, r2Top).lineTo(left + 334, r2Bot).stroke('#000000');
      doc.fontSize(6.8).font(regF).fillColor('#000000').text('Edad', left + 338, r2Top + 2);
      this.dibujarTextoAjustado(doc, `${paciente.edad || '--'} años`, left + 338, r2Top + 12, 40, 11, { maxFontSize: 7.0, minFontSize: 5.2, font: semiF });

      doc.lineWidth(0.7).moveTo(left + 382, r2Top).lineTo(left + 382, r2Bot).stroke('#000000');
      doc.fontSize(6.8).font(regF).fillColor('#000000').text('Sexo', left + 386, r2Top + 2);
      const chkY = r2Top + 14.5;
      doc.lineWidth(0.5).rect(left + 402, chkY, 6.5, 6.5).stroke('#000000');
      if (esFem) doc.fontSize(6.2).font(boldF).fillColor('#000000').text('X', left + 403.2, chkY + 0.5);
      doc.fontSize(6.8).font(regF).fillColor('#000000').text('Femenino', left + 416, chkY);

      doc.lineWidth(0.5).rect(left + 492, chkY, 6.5, 6.5).stroke('#000000');
      if (esMasc) doc.fontSize(6.2).font(boldF).fillColor('#000000').text('X', left + 493.2, chkY + 0.5);
      doc.fontSize(6.8).font(regF).fillColor('#000000').text('Masculino', left + 506, chkY);

      doc.lineWidth(0.7).moveTo(left, r2Bot).lineTo(left + totalW, r2Bot).stroke('#000000');

      const svBot = dibujarSignosVitales(r2Bot);
      return dibujarTablaNotas(svBot + 5.5, 33);
    };

    const dibujarPaginaContinuacion = () => {
      LogoConfigService.dibujarEncabezado(doc, '', { startX: left, bannerWidth: totalW, soloLogos: true });

      doc.lineWidth(0.7).moveTo(left, 63.0).lineTo(left + totalW, 63.0).stroke('#000000');
      doc.fontSize(11.0).font(boldF).fillColor('#000000').text('NOTAS DE EVOLUCIÓN', left, 67.5, { width: totalW, align: 'center' });
      doc.lineWidth(0.7).moveTo(left, 82.0).lineTo(left + totalW, 82.0).stroke('#000000');
      doc.lineWidth(0.7).moveTo(left, 85.0).lineTo(left + totalW, 85.0).stroke('#000000');

      const svBot = dibujarSignosVitales(85.0);
      return dibujarTablaNotas(svBot + 5.5, 37);
    };

    const wrapTextToLines = (text: string, maxW: number): string[] => {
      doc.fontSize(6.8).font(regF);
      const paragraphs = text.split('\n');
      const lines: string[] = [];
      for (const p of paragraphs) {
        const words = p.trim().split(/\s+/).filter(Boolean);
        if (words.length === 0) continue;
        let cur = '';
        for (const w of words) {
          const test = cur ? `${cur} ${w}` : w;
          if (doc.widthOfString(test) <= maxW) {
            cur = test;
          } else {
            if (cur) lines.push(cur);
            cur = w;
          }
        }
        if (cur) lines.push(cur);
      }
      return lines;
    };

    let { bodyStartY, lineH } = dibujarPaginaInicial();
    let curRow = 0;
    let maxRows = 33;

    const listaNotas = Array.isArray(notas) && notas.length > 0 ? notas : [{ evolucion: 'Paciente en evolución clínica.' }];

    for (const n of listaNotas) {
      const fStr = n.fecha ? PDFGeneratorService.formatFecha(n.fecha) : '--';
      const hStr = n.hora ? `${String(n.hora).substring(0, 5)} hrs` : '';

      const bloques = [
        n.subjetivo ? `Subjetivo: ${n.subjetivo}` : '',
        n.objetivo ? `Objetivo: ${n.objetivo}` : '',
        n.analisis ? `Análisis: ${n.analisis}` : '',
        n.plan ? `Plan: ${n.plan}` : '',
        n.nota_evolucion_texto || n.evolucion || ''
      ].filter(Boolean);

      const textoNota = bloques.length > 0 ? bloques.join('\n') : 'Paciente en evolución clínica.';
      const wrappedLines = wrapTextToLines(textoNota, colNota - 12);
      const firmaLinea = `${n.medico_nombre || 'Médico tratante'}`;
      const neededRows = Math.max(2, wrappedLines.length + 1);

      if (curRow + neededRows > maxRows) {
        doc.addPage({ size: 'LETTER', layout: 'portrait', margins: { top: 15, bottom: 15, left: 20, right: 20 } });
        const nextLayout = dibujarPaginaContinuacion();
        bodyStartY = nextLayout.bodyStartY;
        lineH = nextLayout.lineH;
        curRow = 0;
        maxRows = 37;
      }

      // Fecha y Hora en los primeros dos renglones de la nota
      doc.fontSize(6.6).font(boldF).fillColor('#000000')
        .text(fStr, left + 2, bodyStartY + curRow * lineH + 3.5, { width: colFH - 4, align: 'center' });
      if (hStr) {
        doc.fontSize(6.4).font(regF).fillColor('#000000')
          .text(hStr, left + 2, bodyStartY + (curRow + 1) * lineH + 3.5, { width: colFH - 4, align: 'center' });
      }

      // Cada línea de la nota sobre su propio renglón oficial
      for (let i = 0; i < wrappedLines.length; i++) {
        const rowY = bodyStartY + (curRow + i) * lineH + 3.5;
        doc.fontSize(6.8).font(regF).fillColor('#000000')
          .text(wrappedLines[i], left + colFH + 6, rowY, { lineBreak: false });
      }

      // Nombre del médico en el siguiente renglón
      const firmaRowY = bodyStartY + (curRow + wrappedLines.length) * lineH + 3.5;
      doc.fontSize(6.8).font(boldF).fillColor('#000000')
        .text(firmaLinea, left + colFH + 6, firmaRowY, { lineBreak: false });

      curRow += neededRows + 1;
    }

    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      if (i === range.start) {
        doc.fontSize(7.2).font(boldF).fillColor('#000000')
          .text(`${i + 1}`, left + 392, 88.5, { width: 56, align: 'center' })
          .text(`${range.count}`, left + 468, 88.5, { width: totalW - 468, align: 'center' });
      }
    }

    doc.end();
  }

  // ============================================================
  // 9. NOTA DE EGRESO / CONTRARREFERENCIA (Formato 208C0101100000L-361-19)
  // ============================================================
  public static generarNotaEgreso(res: Response, datos: any, paciente: any) {
    const doc = this.crearDoc(res, `Nota_Egreso_${paciente.expediente_clinico || paciente.expediente_numero || ''}`, {
      margins: { top: 15, bottom: 15, left: 42, right: 42 },
    });

    const left = 42;
    const totalW = 528;

    LogoConfigService.dibujarEncabezado(doc, '', { startX: left, bannerWidth: totalW, soloLogos: true });

    const boldF = this.fontBold(doc);
    const medF = this.fontMed(doc);
    const regF = this.fontReg(doc);
    const semiF = this.fontSemi(doc);

    const nombreComp = `${paciente.apellido_paterno || ''} ${paciente.apellido_materno || ''} ${paciente.nombre || ''}`.replace(/\s+/g, ' ').trim();
    const sexoStr = String(paciente.sexo || '').toUpperCase();
    const esMasc = sexoStr === 'M' || sexoStr.startsWith('H') || sexoStr.startsWith('MASC');
    const esFem = sexoStr === 'F' || sexoStr.startsWith('FEM') || sexoStr.startsWith('MUJ');

    const tipoIngresoStr = String(datos.tipo_ingreso || '').toLowerCase();
    const tipoProg = tipoIngresoStr.includes('programado');
    const tipoUrg = tipoIngresoStr.includes('urgencias') && !tipoIngresoStr.includes('directo');
    const tipoDir = tipoIngresoStr.includes('directo') || (!tipoProg && !tipoUrg);

    const formatFecha = (d: any): string => {
      if (!d) return '--';
      return PDFGeneratorService.formatFecha(d);
    };

    const formatFechaHora = (d: any): string => {
      if (!d) return '--';
      const date = new Date(d);
      if (isNaN(date.getTime())) return String(d).substring(0, 16);
      const dia = String(date.getDate()).padStart(2, '0');
      const mes = String(date.getMonth() + 1).padStart(2, '0');
      const anio = date.getFullYear();
      const hrs = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      return `${dia}/${mes}/${anio} ${hrs}:${min}`;
    };

    // Barra superior de título y FECHA (fiel al formato oficial 208C0101100000L-361-19)
    doc.lineWidth(1.4).moveTo(left, 58).lineTo(left + totalW, 58).stroke('#000000');
    doc.fontSize(12).font(boldF).fillColor('#000000').text('Nota de Egreso/Contrarreferencia', left, 63, { width: 385 });
    doc.lineWidth(0.6).moveTo(left + 390, 58).lineTo(left + 390, 80).stroke('#000000');
    doc.fontSize(6.2).font(regF).fillColor('#000000').text('FECHA:', left + 394, 60);
    doc.fontSize(7.5).font(semiF).fillColor('#000000').text(formatFecha(datos.fecha_hora_egreso || datos.fecha || new Date()), left + 394, 69);
    doc.lineWidth(1.2).moveTo(left, 80).lineTo(left + totalW, 80).stroke('#000000');

    // Fila 1: UNIDAD MÉDICA | No. EXPEDIENTE
    const r1Top = 86;
    const r1Bot = 105;
    doc.lineWidth(0.5).moveTo(left, r1Top).lineTo(left + totalW, r1Top).stroke('#000000');
    doc.fontSize(6.2).font(regF).fillColor('#000000').text('UNIDAD MÉDICA:', left, r1Top + 2);
    this.dibujarTextoAjustado(doc, datos.unidad_medica || 'Hospital General San Felipe del Progreso', left, r1Top + 10, 386, 9, { maxFontSize: 7.2, minFontSize: 5.5, isBold: true });
    doc.lineWidth(0.5).moveTo(left + 390, r1Top).lineTo(left + 390, r1Bot).stroke('#000000');
    doc.fontSize(6.2).font(regF).fillColor('#000000').text('No. EXPEDIENTE:', left + 394, r1Top + 2);
    this.dibujarTextoAjustado(doc, paciente.expediente_clinico || paciente.expediente_numero || '--', left + 394, r1Top + 10, totalW - 396, 9, { maxFontSize: 7.2, minFontSize: 5.5, isBold: true });
    doc.lineWidth(0.5).moveTo(left, r1Bot).lineTo(left + totalW, r1Bot).stroke('#000000');

    // Fila 2: NOMBRE COMPLETO DE LA O EL PACIENTE | GÉNERO | EDAD
    const r2Bot = 129;
    doc.fontSize(6.2).font(regF).fillColor('#000000').text('NOMBRE COMPLETO DE LA O EL PACIENTE:', left, r1Bot + 2);
    this.dibujarTextoAjustado(doc, nombreComp, left, r1Bot + 11.5, 314, 10, { maxFontSize: 7.5, minFontSize: 5.5, isBold: true });
    doc.lineWidth(0.5).moveTo(left + 318, r1Bot).lineTo(left + 318, r2Bot).stroke('#000000');
    doc.fontSize(6.2).font(regF).fillColor('#000000').text('GÉNERO:', left + 322, r1Bot + 2);
    doc.fontSize(6.2).font(regF).fillColor('#000000').text(`( ${esMasc ? 'X' : '  '} ) MASCULINO   ( ${esFem ? 'X' : '  '} ) FEMENINO`, left + 324, r1Bot + 12.5);
    doc.lineWidth(0.5).moveTo(left + 462, r1Bot).lineTo(left + 462, r2Bot).stroke('#000000');
    doc.fontSize(6.2).font(regF).fillColor('#000000').text('EDAD:', left + 466, r1Bot + 2);
    this.dibujarTextoAjustado(doc, paciente.edad ? `${paciente.edad} AÑOS` : '--', left + 466, r1Bot + 11.5, totalW - 468, 10, { maxFontSize: 7.2, minFontSize: 5.5, isBold: true });
    doc.lineWidth(0.5).moveTo(left, r2Bot).lineTo(left + totalW, r2Bot).stroke('#000000');

    // Fila 3: DOMICILIO | MUNICIPIO | TELÉFONO
    const r3Bot = 148;
    const dom = datos.domicilio || paciente.domicilio || `${paciente.domicilio_municipio || ''}, ${paciente.domicilio_entidad || ''}`.trim() || '--';
    doc.fontSize(6.2).font(regF).fillColor('#000000').text('DOMICILIO:', left, r2Bot + 2);
    this.dibujarTextoAjustado(doc, dom, left, r2Bot + 9.5, 272, 9, { maxFontSize: 7.0, minFontSize: 5.2, font: semiF });
    doc.lineWidth(0.5).moveTo(left + 276, r2Bot).lineTo(left + 276, r3Bot).stroke('#000000');
    doc.fontSize(6.2).font(regF).fillColor('#000000').text('MUNICIPIO:', left + 280, r2Bot + 2);
    this.dibujarTextoAjustado(doc, datos.municipio || paciente.domicilio_municipio || 'San Felipe del Progreso', left + 280, r2Bot + 9.5, 126, 9, { maxFontSize: 7.0, minFontSize: 5.2, font: semiF });
    doc.lineWidth(0.5).moveTo(left + 410, r2Bot).lineTo(left + 410, r3Bot).stroke('#000000');
    doc.fontSize(6.2).font(regF).fillColor('#000000').text('TELÉFONO:', left + 414, r2Bot + 2);
    this.dibujarTextoAjustado(doc, datos.telefono || paciente.telefono || '--', left + 414, r2Bot + 9.5, totalW - 416, 9, { maxFontSize: 7.0, minFontSize: 5.2, font: semiF });
    doc.lineWidth(0.5).moveTo(left, r3Bot).lineTo(left + totalW, r3Bot).stroke('#000000');

    // Fila 4: DIAGNÓSTICO DE INGRESO | FECHA DE INGRESO | TIPO DE INGRESO | FECHA Y HORA DE EGRESO
    const r4Bot = 184;
    doc.fontSize(6.2).font(regF).fillColor('#000000').text('DIAGNÓSTICO DE INGRESO:', left, r3Bot + 2);
    this.dibujarTextoAjustado(doc, datos.diagnostico_ingreso || 'En estudio', left, r3Bot + 10.5, 182, 24, { maxFontSize: 6.8, minFontSize: 5.0, font: semiF, lineGap: 0.5 });
    doc.lineWidth(0.5).moveTo(left + 186, r3Bot).lineTo(left + 186, r4Bot).stroke('#000000');
    doc.fontSize(6.2).font(regF).fillColor('#000000').text('FECHA DE INGRESO:', left + 190, r3Bot + 2);
    doc.fontSize(7.0).font(semiF).fillColor('#000000').text(formatFecha(datos.fecha_ingreso), left + 190, r3Bot + 14);
    doc.lineWidth(0.5).moveTo(left + 280, r3Bot).lineTo(left + 280, r4Bot).stroke('#000000');
    doc.fontSize(6.2).font(regF).fillColor('#000000').text('TIPO DE INGRESO', left + 284, r3Bot + 2);
    doc.fontSize(5.8).font(regF).fillColor('#000000')
      .text('1.- ENVIADO PROGRAMADO', left + 286, r3Bot + 10.5)
      .text(`( ${tipoProg ? 'X' : '  '} )`, left + 380, r3Bot + 10.5)
      .text('2.- ENVIADO URGENCIAS', left + 286, r3Bot + 18.5)
      .text(`( ${tipoUrg ? 'X' : '  '} )`, left + 380, r3Bot + 18.5)
      .text('3.- URGENCIAS DIRECTO', left + 286, r3Bot + 26.5)
      .text(`( ${tipoDir ? 'X' : '  '} )`, left + 380, r3Bot + 26.5);
    doc.lineWidth(0.5).moveTo(left + 402, r3Bot).lineTo(left + 402, r4Bot).stroke('#000000');
    doc.fontSize(6.2).font(regF).fillColor('#000000').text('FECHA Y HORA DE EGRESO:', left + 406, r3Bot + 2);
    doc.fontSize(7.0).font(semiF).fillColor('#000000').text(formatFechaHora(datos.fecha_hora_egreso), left + 406, r3Bot + 14);
    doc.lineWidth(0.5).moveTo(left, r4Bot).lineTo(left + totalW, r4Bot).stroke('#000000');

    // Fila 5: MOTIVO DEL EGRESO | SERVICIO DEL QUE EGRESA
    const r5Bot = 204;
    doc.fontSize(6.2).font(regF).fillColor('#000000').text('MOTIVO DEL EGRESO:', left, r4Bot + 2);
    this.dibujarTextoAjustado(doc, datos.motivo_egreso || 'Mejoría', left, r4Bot + 10, 314, 9, { maxFontSize: 7.2, minFontSize: 5.5, isBold: true });
    doc.lineWidth(0.5).moveTo(left + 318, r4Bot).lineTo(left + 318, r5Bot).stroke('#000000');
    doc.fontSize(6.2).font(regF).fillColor('#000000').text('SERVICIO DEL QUE EGRESA:', left + 322, r4Bot + 2);
    this.dibujarTextoAjustado(doc, datos.servicio_egreso || 'Hospitalización General', left + 322, r4Bot + 10, totalW - 324, 9, { maxFontSize: 7.2, minFontSize: 5.5, isBold: true });
    doc.lineWidth(0.5).moveTo(left, r5Bot).lineTo(left + totalW, r5Bot).stroke('#000000');

    const secciones = [
      { titulo: 'DIAGNÓSTICOS FINALES', contenido: datos.diagnosticos_finales || datos.diagnostico || '' },
      { titulo: 'RESUMEN (EVALUACIÓN Y ESTADO ACTUAL)', contenido: datos.resumen_evaluacion || '' },
      { titulo: 'TRATAMIENTO INTRAHOSPITALARIO (MEDICAMENTOS, DOSIS, VÍA, TIEMPO)', contenido: datos.tratamiento_intrahospitalario || '' },
      { titulo: 'PROBLEMAS CLÍNICOS PENDIENTES', contenido: datos.problemas_clinicos_pendientes || datos.problemas_pendientes || '' },
      { titulo: 'PLAN DE MANEJO Y TRATAMIENTO AL EGRESO', contenido: datos.plan_manejo_egreso || '' },
      { titulo: 'RECOMENDACIONES AMBULATORIAS', contenido: datos.recomendaciones_ambulatorias || '' },
      { titulo: 'ATENCIÓN DE FACTORES DE RIESGO', contenido: datos.factores_riesgo || '' },
      { titulo: 'PRONÓSTICO', contenido: datos.pronostico || '' }
    ];

    let curY = 212;
    const lineGap = 9.4;

    for (const sec of secciones) {
      doc.fontSize(6.8).font(regF).fillColor('#000000').text(sec.titulo, left, curY, { align: 'center', width: totalW });
      curY += 8.5;

      if (sec.contenido) {
        this.dibujarTextoAjustado(doc, sec.contenido, left + 2, curY + 0.5, totalW - 4, lineGap * 4 - 1.5, {
          maxFontSize: 6.6,
          minFontSize: 4.8,
          font: regF,
          lineGap: 2.0
        });
      }

      for (let l = 1; l <= 4; l++) {
        const lY = curY + l * lineGap;
        doc.lineWidth(0.5).moveTo(left, lY).lineTo(left + totalW, lY).stroke('#000000');
      }

      curY += 4 * lineGap + 7.5;
    }

    // 24. MÉDICO RESPONSABLE — amplio espacio para firma física autógrafa + nombre centrado
    const yMed = 656;
    const sigW = 220;
    const sigX = left + (totalW - sigW) / 2;
    const sigLineY = 718;

    doc.fontSize(7.2).font(boldF).fillColor('#000000').text('MÉDICO RESPONSABLE', left, yMed, { align: 'center', width: totalW });

    const medNombre = datos.medico_responsable || paciente.medico_tratante || '';
    if (medNombre) {
      this.dibujarTextoAjustado(doc, medNombre, sigX, sigLineY - 12, sigW, 11, { maxFontSize: 7.5, minFontSize: 5.5, isBold: true, align: 'center' });
    }

    doc.lineWidth(0.5).moveTo(sigX + 15, sigLineY).lineTo(sigX + sigW - 15, sigLineY).stroke('#000000');
    doc.fontSize(6.5).font(medF).fillColor('#000000').text('NOMBRE Y FIRMA', sigX, sigLineY + 4, { align: 'center', width: sigW });

    doc.fontSize(7.2).font(regF).fillColor('#000000').text('208C0101100000L-361-19', left, 748, { align: 'right', width: totalW });

    doc.end();
  }

  // ============================================================
  // 10. PARTOGRAMA (Formato 208C0101100000L-033-19)
  // ============================================================
  public static generarPartograma(res: Response, datos: any, paciente: any) {
    const doc = this.crearDoc(res, `Partograma_${paciente.expediente_clinico}`, {
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    const boldF = this.fontBold(doc);
    const regF = this.fontReg(doc);
    const semiF = this.fontSemi(doc);

    const left = 28;
    const totalW = 556;
    const right = left + totalW;

    const hLine = (yPos: number, lw = 0.6, x1 = left, x2 = right) => {
      doc.lineWidth(lw).moveTo(x1, yPos).lineTo(x2, yPos).stroke('#000000');
    };
    const vLine = (xPos: number, y1: number, y2: number, lw = 0.6) => {
      doc.lineWidth(lw).moveTo(xPos, y1).lineTo(xPos, y2).stroke('#000000');
    };

    // 1. Logos institucionales superiores
    LogoConfigService.dibujarEncabezado(doc, '', { startX: left, bannerWidth: totalW, soloLogos: true });

    // 2. Franja de título "Partograma" alineado a la izquierda con línea inferior gruesa
    hLine(62, 0.7);
    doc.font(boldF).fontSize(13.5).fillColor('#000000').text('Partograma', left + 4, 65.5, { lineBreak: false });
    hLine(83, 1.8);

    const drawOpenCell = (x: number, y: number, w: number, h: number, label: string, val: any, labelFs = 5.8) => {
      if (label) {
        doc.font(regF).fontSize(labelFs).fillColor('#000000').text(label, x + 3, y + 2.5, {
          width: w - 6,
          lineBreak: false,
        });
      }
      const strVal = val !== undefined && val !== null ? String(val) : '';
      if (strVal) {
        this.dibujarTextoAjustado(doc, strVal, x + 3, y + 10.5, w - 6, h - 12, {
          maxFontSize: 7.5,
          minFontSize: 5.5,
          font: semiF,
          align: 'left',
        });
      }
    };

    const drawSqCheck = (x: number, y: number, label: string, checked: boolean, boxSize = 9.5, labelFs = 6.5, boldLabel = true) => {
      doc.lineWidth(0.8).rect(x, y, boxSize, boxSize).stroke('#000000');
      if (checked) {
        doc.font(boldF).fontSize(boxSize - 1.5).fillColor('#000000').text('X', x, y + 0.8, {
          width: boxSize,
          align: 'center',
          lineBreak: false,
        });
      }
      if (label) {
        doc.font(boldLabel ? boldF : regF).fontSize(labelFs).fillColor('#000000').text(label, x + boxSize + 2.5, y + (boxSize - labelFs) / 2 + 0.5, {
          lineBreak: false,
        });
      }
    };

    const nombreComp = `${paciente.apellido_paterno || ''} ${paciente.apellido_materno || ''} ${paciente.nombre || ''}`.replace(/\s+/g, ' ').trim();
    const fActual = datos.fecha ? this.formatFecha(datos.fecha) : this.formatFecha(new Date());
    const hActual = datos.hora ? String(datos.hora).substring(0, 5) : '12:00';

    // Fila 1: UNIDAD MÉDICA: | FECHA: | HORA: (y = 83..105)
    drawOpenCell(left, 83, 392, 22, 'UNIDAD MÉDICA:', datos.unidad_medica || 'Hospital General San Felipe del Progreso');
    vLine(left + 392, 83, 105);
    drawOpenCell(left + 392, 83, 72, 22, 'FECHA:', fActual);
    vLine(left + 464, 83, 105);
    drawOpenCell(left + 464, 83, totalW - 464, 22, 'HORA:', hActual);
    hLine(105);

    // Fila 2: NOMBRE DE LA PACIENTE | EXPEDIENTE: (y = 105..127)
    drawOpenCell(left, 105, 392, 22, 'NOMBRE DE LA PACIENTE (APELLIDO PATERNO, APELLIDO MATERNO Y NOMBRE(S)):', nombreComp);
    vLine(left + 392, 105, 127);
    drawOpenCell(left + 392, 105, totalW - 392, 22, 'EXPEDIENTE:', paciente.expediente_clinico);
    hLine(127);

    // Fila 3: EDAD: | GESTA: | PARA: | CESAREAS: | ABORTOS: | NÚM. DE HIJOS VIVOS: (y = 127..149)
    const c3 = [0, 106, 160, 214, 322, 428, totalW];
    const l3 = ['EDAD:', 'GESTA:', 'PARA:', 'CESAREAS:', 'ABORTOS:', 'NÚM. DE HIJOS VIVOS:'];
    const v3 = [
      `${paciente.edad || '--'}`,
      `${datos.gesta ?? paciente.gesta ?? 1}`,
      `${datos.para ?? paciente.para ?? 0}`,
      `${datos.cesareas ?? paciente.cesarea ?? 0}`,
      `${datos.abortos ?? paciente.aborto ?? 0}`,
      `${datos.hijos_vivos ?? 1}`,
    ];
    for (let i = 0; i < 6; i++) {
      if (i > 0) vLine(left + c3[i], 127, 149);
      drawOpenCell(left + c3[i], 127, c3[i + 1] - c3[i], 22, l3[i], v3[i]);
    }
    hLine(149);

    // Fila 4: FECHA DEL ÚLTIMO PARTO/CESAREA: | FECHA DE LA ÚLTIMA MENSTRUACIÓN: | FECHA PROBABLE DE PARTO: | SEMANAS DE GESTACIÓN DEL EMBARAZO ACTUAL: (y = 149..172)
    const c4 = [0, 128, 256, 384, totalW];
    const l4 = [
      'FECHA DEL ÚLTIMO PARTO/CESAREA:',
      'FECHA DE LA ÚLTIMA MENSTRUACIÓN:',
      'FECHA PROBABLE DE PARTO:',
      'SEMANAS DE GESTACIÓN DEL EMBARAZO ACTUAL:',
    ];
    const v4 = [
      datos.fecha_ultimo_parto ? this.formatFecha(datos.fecha_ultimo_parto) : '--',
      datos.fecha_ultima_menstruacion ? this.formatFecha(datos.fecha_ultima_menstruacion) : '--',
      datos.fecha_probable_parto ? this.formatFecha(datos.fecha_probable_parto) : '--',
      `${datos.semanas_gestacion || '--'}`,
    ];
    for (let i = 0; i < 4; i++) {
      if (i > 0) vLine(left + c4[i], 149, 172);
      drawOpenCell(left + c4[i], 149, c4[i + 1] - c4[i], 23, l4[i], v4[i], 5.4);
    }
    hLine(172);

    // Fila 5: CONTROL PRENATAL | NÚM. DE CONSULTAS: | DÓNDE: | NÚMERO DE CONSULTAS PRENATALES EN ESTE HOSPITAL: (y = 172..198)
    doc.font(regF).fontSize(5.8).fillColor('#000000').text('CONTROL PRENATAL', left + 3, 174.5, { lineBreak: false });
    const tieneControl = datos.control_prenatal === true || String(datos.control_prenatal).toLowerCase() === 'true' || String(datos.control_prenatal).toUpperCase() === 'SI' || String(datos.control_prenatal) === '1';
    drawSqCheck(left + 4, 184, 'SI', tieneControl, 10, 7.2, true);
    drawSqCheck(left + 48, 184, 'NO', !tieneControl, 10, 7.2, true);
    vLine(left + 92, 172, 198);
    hLine(198, 0.6, left, left + 92);

    drawOpenCell(left + 92, 172, 74, 26, 'NÚM. DE CONSULTAS:', `${datos.num_consultas ?? datos.consultas_totales ?? 0}`);
    vLine(left + 166, 172, 198);
    drawOpenCell(left + 166, 172, 218, 26, 'DÓNDE:', datos.donde_control || datos.lugar_consultas || '');
    vLine(left + 384, 172, 198);
    doc.font(regF).fontSize(5.6).fillColor('#000000').text('NÚMERO DE CONSULTAS\nPRENATALES EN ESTE HOSPITAL:', left + 387, 175, {
      width: 102,
      lineGap: 0.5,
    });
    vLine(left + 492, 172, 198);
    this.dibujarTextoAjustado(doc, `${datos.consultas_este_hospital ?? datos.consultas_hospital ?? 0}`, left + 496, 181, totalW - 500, 12, {
      maxFontSize: 8.0,
      minFontSize: 6.0,
      font: semiF,
      align: 'center',
    });
    hLine(198, 0.6, left + 384, right);

    // COMPLICACIONES EN EL EMBARAZO ACTUAL: (3 renglones rayados: 213, 226, 239)
    doc.font(boldF).fontSize(6.8).fillColor('#000000').text('COMPLICACIONES EN EL EMBARAZO ACTUAL:', left + 3, 204.5, { lineBreak: false });
    hLine(213);
    hLine(226);
    hLine(239);
    this.dibujarTextoAjustado(doc, datos.complicaciones_embarazo || 'Negadas', left + 178, 203.5, totalW - 183, 9, {
      maxFontSize: 7.2,
      minFontSize: 5.8,
      font: semiF,
    });

    // TRATAMIENTO ADMINISTRADO: (3 renglones rayados: 254, 267, 280)
    doc.font(boldF).fontSize(6.8).fillColor('#000000').text('TRATAMIENTO ADMINISTRADO:', left + 3, 245.5, { lineBreak: false });
    hLine(254);
    hLine(267);
    hLine(280);
    this.dibujarTextoAjustado(doc, datos.tratamiento_administrado || datos.tratamiento_embarazo || '', left + 130, 244.5, totalW - 135, 9, {
      maxFontSize: 7.2,
      minFontSize: 5.8,
      font: semiF,
    });

    // Bloque de 3 columnas: ACTIVIDAD UTERINA | SANGRADO TRANSVAGINAL | RUPTURA PREMATURA DE MEMBRANAS (y = 288..332)
    const col3W = totalW / 3;
    hLine(288, 0.8);
    doc.font(boldF).fontSize(6.5).fillColor('#000000');
    doc.text('ACTIVIDAD UTERINA', left, 291, { width: col3W, align: 'center', lineBreak: false });
    doc.text('SANGRADO TRANSVAGINAL', left + col3W, 291, { width: col3W, align: 'center', lineBreak: false });
    doc.text('RUPTURA PREMATURA DE MEMBRANAS', left + col3W * 2, 291, { width: col3W, align: 'center', lineBreak: false });
    hLine(300);

    vLine(left + col3W, 288, 368);
    vLine(left + col3W * 2, 288, 368);

    // Sub-celdas ACTIVIDAD UTERINA
    vLine(left + 96, 300, 332);
    drawOpenCell(left, 300, 96, 32, 'FECHA Y HORA DE INICIO:', datos.actividad_uterina_inicio || `${fActual} ${hActual}`, 5.5);
    drawOpenCell(left + 96, 300, col3W - 96, 32, "CONTRACCIONES EN 10'", `${datos.contracciones_10min || ''}`, 5.5);

    // Sub-celdas SANGRADO TRANSVAGINAL
    const tieneSangrado = datos.sangrado_transvaginal === true || String(datos.sangrado_transvaginal).toLowerCase() === 'true' || String(datos.sangrado_transvaginal).toUpperCase() === 'SI' || String(datos.sangrado_transvaginal) === '1';
    drawOpenCell(left + col3W, 300, col3W - 48, 32, 'FECHA Y HORA DE INICIO:', tieneSangrado ? (datos.sangrado_inicio || '') : '', 5.5);
    drawSqCheck(left + col3W * 2 - 44, 314, 'NO', !tieneSangrado, 11, 6.8, true);

    // Sub-celdas RUPTURA PREMATURA DE MEMBRANAS
    const tieneRpm = datos.ruptura_membranas === true || String(datos.ruptura_membranas).toLowerCase() === 'true' || String(datos.ruptura_membranas).toUpperCase() === 'SI' || String(datos.ruptura_membranas) === '1';
    drawOpenCell(left + col3W * 2, 300, col3W - 48, 32, 'FECHA Y HORA EN QUE OCURRIO:', tieneRpm ? (datos.ruptura_membranas_hora || '') : '', 5.5);
    drawSqCheck(right - 44, 314, 'NO', !tieneRpm, 11, 6.8, true);

    hLine(332);

    // Fila MOVIMIENTO FETAL: | EDEMA: (y = 332..368)
    doc.font(boldF).fontSize(6.2).fillColor('#000000').text('MOVIMIENTO FETAL:', left + 8, 346, { lineBreak: false });
    const movFetal = datos.movimiento_fetal !== false && String(datos.movimiento_fetal).toLowerCase() !== 'false' && String(datos.movimiento_fetal).toUpperCase() !== 'NO' && String(datos.movimiento_fetal) !== '0';
    const movTipo = String(datos.movimiento_fetal_tipo || 'normal').toLowerCase();
    drawSqCheck(left + 94, 338, 'SI', movFetal, 9.5, 6.5, true);
    drawSqCheck(left + 136, 338, 'NORMAL', movFetal && movTipo.includes('norm'), 9.5, 5.8, false);
    drawSqCheck(left + 190, 338, 'AUMENTADO', movFetal && movTipo.includes('aum'), 9.5, 5.8, false);
    drawSqCheck(left + 262, 338, 'DISMINUIDO', movFetal && movTipo.includes('dism'), 9.5, 5.8, false);
    hLine(350, 0.5, left + 94, left + col3W * 2);
    drawSqCheck(left + 94, 354, 'NO', !movFetal, 9.5, 6.5, true);
    doc.font(regF).fontSize(5.8).fillColor('#000000').text('DESDE CUÁNDO', left + 122, 356.5, { lineBreak: false });
    if (!movFetal && datos.movimiento_fetal_desde) {
      doc.font(semiF).fontSize(6.0).text(datos.movimiento_fetal_desde, left + 180, 355);
    }

    doc.font(boldF).fontSize(6.2).fillColor('#000000').text('EDEMA:', left + col3W * 2 + 8, 346, { lineBreak: false });
    const tieneEdema = datos.edema === true || String(datos.edema).toLowerCase() === 'true' || String(datos.edema).toUpperCase() === 'SI' || String(datos.edema) === '1';
    drawSqCheck(left + col3W * 2 + 44, 338, 'SI', tieneEdema, 9.5, 6.5, true);
    doc.font(boldF).fontSize(5.6).fillColor('#000000').text('FECHA DE INICIO', left + col3W * 2 + 78, 340.5, { lineBreak: false });
    if (tieneEdema && (datos.edema_inicio || datos.edema_fecha_inicio)) {
      doc.font(semiF).fontSize(6.0).text(String(datos.edema_inicio || datos.edema_fecha_inicio), left + col3W * 2 + 135, 340);
    }
    hLine(350, 0.5, left + col3W * 2 + 44, right);
    drawSqCheck(left + col3W * 2 + 44, 354, 'NO', !tieneEdema, 9.5, 6.5, true);

    hLine(368);

    // Fila Signos Vitales: TENSIÓN ARTERIAL: | TEMPERATURA: | FRECUENCIA RESPIRATORIA: | FRECUENCIA CARDIACA: (y = 368..392)
    const svW = totalW / 4;
    drawOpenCell(left, 368, svW, 24, 'TENSIÓN ARTERIAL:', datos.ta || '110/70');
    vLine(left + svW, 368, 392);
    drawOpenCell(left + svW, 368, svW - 18, 24, 'TEMPERATURA:', datos.temp || '36.5');
    doc.font(regF).fontSize(6.0).text('° C', left + svW * 2 - 16, 382, { lineBreak: false });
    vLine(left + svW * 2, 368, 392);
    drawOpenCell(left + svW * 2, 368, svW - 18, 24, 'FRECUENCIA RESPIRATORIA:', datos.fr || '20');
    doc.font(regF).fontSize(6.0).text("X'", left + svW * 3 - 14, 382, { lineBreak: false });
    vLine(left + svW * 3, 368, 392);
    drawOpenCell(left + svW * 3, 368, svW - 18, 24, 'FRECUENCIA CARDIACA:', datos.fc || '80');
    doc.font(regF).fontSize(6.0).text("X'", right - 14, 382, { lineBreak: false });
    hLine(392);

    // Bloque central: Columna clínica izquierda (20 renglones de 12.25pt) + Diagramas anatómicos (y = 392..637)
    const diagTop = 392;
    const diagHeight = 245;
    const leftColW = 135;
    const rowStep = diagHeight / 20; // 12.25pt

    // Dibujar los 20 renglones horizontales en la columna izquierda
    for (let r = 1; r <= 20; r++) {
      hLine(diagTop + r * rowStep, 0.5, left, left + leftColW);
    }

    const drawLeftRow = (idx: number, label: string, val?: string, suffix?: string) => {
      const ry = diagTop + idx * rowStep;
      doc.font(boldF).fontSize(5.6).fillColor('#000000').text(label, left + 2, ry + 3.5, { lineBreak: false });
      if (val) {
        const lw = doc.widthOfString(label);
        doc.font(semiF).fontSize(6.0).fillColor('#000000').text(val, left + lw + 6, ry + 3.2, { lineBreak: false });
      }
      if (suffix) {
        doc.font(boldF).fontSize(5.8).fillColor('#000000').text(suffix, left, ry + 3.5, {
          width: leftColW - 3,
          align: 'right',
          lineBreak: false,
        });
      }
    };

    drawLeftRow(0, 'FECUENCIA CARDIACA FETAL', datos.fcf ? `${datos.fcf} lpm` : '');
    drawLeftRow(1, 'RITMO:', datos.fcf_ritmo || 'Regular');
    drawLeftRow(2, 'TONO UTERINO:', datos.tono_uterino || 'Normal');
    drawLeftRow(3, 'CERVIX:');
    drawLeftRow(4, 'DILATACIÓN:', `${datos.cervix_dilatacion || datos.dilatacion || '4'}`, 'cm');
    drawLeftRow(5, 'BORRAMIENTO:', `${datos.cervix_borramiento || datos.borramiento || '60'}`, '%');
    drawLeftRow(6, 'PRESENTACIÓN:', datos.presentacion || 'Cefálica');

    // Fila 7: PELVIS ÚTIL / NO ÚTIL
    const ryPelvis = diagTop + 7 * rowStep;
    const pelvisUtil = datos.pelvis_util !== false;
    doc.font(pelvisUtil ? boldF : regF).fontSize(5.6).fillColor('#000000').text(pelvisUtil ? 'PELVIS ÚTIL [X]' : 'PELVIS ÚTIL', left + 2, ryPelvis + 3.5, { lineBreak: false });
    doc.font(!pelvisUtil ? boldF : regF).fontSize(5.6).fillColor('#000000').text(!pelvisUtil ? 'NO ÚTIL [X]' : 'NO ÚTIL', left + 74, ryPelvis + 3.5, { lineBreak: false });

    // Fila 8: IMPRESIÓN DIAGNÓSTICA: + 3 renglones (9, 10, 11)
    drawLeftRow(8, 'IMPRESIÓN DIAGNÓSTICA:');
    this.dibujarTextoAjustado(doc, datos.impresion_diagnostica || 'Trabajo de parto fase activa', left + 2, diagTop + 9 * rowStep + 2, leftColW - 4, 3 * rowStep - 4, {
      maxFontSize: 6.2,
      minFontSize: 5.0,
      font: regF,
      lineGap: 2.2,
    });

    // Fila 12: INDICACIONES MÉDICAS: + 7 renglones (13..19)
    drawLeftRow(12, 'INDICACIONES MÉDICAS:');
    this.dibujarTextoAjustado(doc, datos.indicaciones_medicas || datos.indicaciones_ingreso || 'Vigilancia estrecha de FCF, dinámica uterina y descenso cefálico.', left + 2, diagTop + 13 * rowStep + 2, leftColW - 4, 7 * rowStep - 4, {
      maxFontSize: 6.2,
      minFontSize: 5.0,
      font: regF,
      lineGap: 2.2,
    });

    const diagBlockPath = this.getAssetPath('partograma_diagrams_block.png');
    if (diagBlockPath && fs.existsSync(diagBlockPath)) {
      doc.image(diagBlockPath, left + leftColW, diagTop, { width: totalW - leftColW, height: diagHeight });
    } else {
      vLine(left + leftColW, diagTop, diagTop + diagHeight);
      hLine(diagTop + diagHeight, 0.6, left + leftColW, right);
    }

    // =========================================================================
    // SUPERPOSICIÓN DE DIAGRAMAS ANATÓMICOS OFICIALES (NOM-007 / IMSS-BIENESTAR)
    // 1. Foco y Altura Uterina (Poses del feto según presentación y Foco FCF)
    // 2. Dilatación y Posición (Círculos concéntricos de 1 a 10 cm + Variedad)
    // 3. Altura de la Presentación (Planos de Hodge 0 a 4 + Ruedita Cabecita)
    // =========================================================================
    const diagX = left + leftColW;   // 159
    const diagY = diagTop;           // 392
    const diagW = totalW - leftColW; // 429
    const diagH = diagHeight;        // 245
    const colW = diagW / 3;          // 143

    // -------------------------------------------------------------
    // DIAGRAMA 1: FOCO ALTURA / ALTURA DEL ÚTERO (POSES DEL FETO)
    // -------------------------------------------------------------
    const cx1 = diagX + colW * 0.5; // 230.5
    const presVal = (datos.presentacion || 'Cefálica').trim().toLowerCase();
    const fcfVal = datos.fcf || '140';

    doc.save();
    if (presVal.includes('pelv') || presVal.includes('podal')) {
      // Pélvica / Pelviana: Cabeza en fondo uterino, nalgas en pelvis
      const headX = cx1 - 4;
      const headY = diagY + 72;
      const headR = 10.5;
      const buttX = cx1 - 2;
      const buttY = diagY + 160;
      const buttR = 11.5;

      doc.lineWidth(2.8).strokeColor('#db2777');
      doc.moveTo(headX - 6, headY + 7)
         .bezierCurveTo(cx1 - 25, diagY + 100, cx1 - 22, diagY + 135, buttX - 6, buttY - 8)
         .stroke();

      doc.circle(headX, headY, headR).fillOpacity(0.85).fillAndStroke('#fce7f3', '#db2777');
      doc.lineWidth(0.8).strokeColor('#9d174d');
      doc.moveTo(headX - 5, headY).lineTo(headX + 5, headY).stroke();
      doc.moveTo(headX, headY).lineTo(headX, headY - 4).stroke();

      doc.circle(buttX, buttY, buttR).fillOpacity(0.85).fillAndStroke('#fce7f3', '#db2777');

      doc.lineWidth(1.3).strokeColor('#db2777');
      doc.moveTo(cx1 + 2, diagY + 115).lineTo(cx1 + 10, diagY + 125).lineTo(cx1 + 3, diagY + 138).stroke();

      doc.fillOpacity(1.0).fontSize(5.2).fillColor('#831843');
      doc.text('Polo Cef.', headX - 10, headY - 2.5, { lineBreak: false });
      doc.text('Polo Pélv.', buttX - 11, buttY + 1.5, { lineBreak: false });

      const fcfX = cx1 - 18;
      const fcfY = diagY + 86;
      doc.circle(fcfX, fcfY, 4.5).lineWidth(1.4).strokeColor('#dc2626').stroke();
      doc.circle(fcfX, fcfY, 1.6).fillColor('#dc2626').fill();
      doc.roundedRect(fcfX - 20, fcfY + 6, 40, 8.5, 2).fillAndStroke('#fee2e2', '#ef4444');
      doc.fontSize(5.0).fillColor('#b91c1c').text(`FCF: ${fcfVal} lpm`, fcfX - 18, fcfY + 7.5, { lineBreak: false });

    } else if (presVal.includes('trans')) {
      // Transversa
      const headX = cx1 - 32;
      const headY = diagY + 120;
      const buttX = cx1 + 32;
      const buttY = diagY + 120;

      doc.lineWidth(2.8).strokeColor('#db2777');
      doc.moveTo(headX + 8, headY).lineTo(buttX - 8, buttY).stroke();

      doc.circle(headX, headY, 10).fillOpacity(0.85).fillAndStroke('#fce7f3', '#db2777');
      doc.circle(buttX, buttY, 11).fillOpacity(0.85).fillAndStroke('#fce7f3', '#db2777');

      doc.fillOpacity(1.0).fontSize(5.2).fillColor('#831843');
      doc.text('Cefálico', headX - 8, headY + 1.5, { lineBreak: false });
      doc.text('Pélvico', buttX - 8, buttY + 1.5, { lineBreak: false });

      const fcfX = cx1;
      const fcfY = diagY + 115;
      doc.circle(fcfX, fcfY, 4.5).lineWidth(1.4).strokeColor('#dc2626').stroke();
      doc.circle(fcfX, fcfY, 1.6).fillColor('#dc2626').fill();
      doc.roundedRect(fcfX - 20, fcfY + 6, 40, 8.5, 2).fillAndStroke('#fee2e2', '#ef4444');
      doc.fontSize(5.0).fillColor('#b91c1c').text(`FCF: ${fcfVal} lpm`, fcfX - 18, fcfY + 7.5, { lineBreak: false });

    } else {
      // Cefálica (Por defecto)
      const headX = cx1 - 2;
      const headY = diagY + 160;
      const headR = 10.5;
      const buttX = cx1 - 4;
      const buttY = diagY + 72;
      const buttR = 11.5;

      doc.lineWidth(2.8).strokeColor('#db2777');
      doc.moveTo(headX - 6, headY - 7)
         .bezierCurveTo(cx1 - 25, diagY + 130, cx1 - 22, diagY + 95, buttX - 6, buttY + 8)
         .stroke();

      doc.circle(headX, headY, headR).fillOpacity(0.85).fillAndStroke('#fce7f3', '#db2777');
      doc.lineWidth(0.8).strokeColor('#9d174d');
      doc.moveTo(headX - 5, headY).lineTo(headX + 5, headY).stroke();
      doc.moveTo(headX, headY).lineTo(headX, headY - 4).stroke();

      doc.circle(buttX, buttY, buttR).fillOpacity(0.85).fillAndStroke('#fce7f3', '#db2777');

      doc.lineWidth(1.3).strokeColor('#db2777');
      doc.moveTo(cx1 + 2, diagY + 105).lineTo(cx1 + 10, diagY + 115).lineTo(cx1 + 3, diagY + 128).stroke();

      doc.fillOpacity(1.0).fontSize(5.2).fillColor('#831843');
      doc.text('Polo Cef.', headX - 10, headY + 1.5, { lineBreak: false });
      doc.text('Polo Pélv.', buttX - 11, buttY - 2.5, { lineBreak: false });

      const fcfX = cx1 - 18;
      const fcfY = diagY + 134;
      doc.circle(fcfX, fcfY, 4.5).lineWidth(1.4).strokeColor('#dc2626').stroke();
      doc.circle(fcfX, fcfY, 1.6).fillColor('#dc2626').fill();
      doc.roundedRect(fcfX - 20, fcfY + 6, 40, 8.5, 2).fillAndStroke('#fee2e2', '#ef4444');
      doc.fontSize(5.0).fillColor('#b91c1c').text(`FCF: ${fcfVal} lpm`, fcfX - 18, fcfY + 7.5, { lineBreak: false });
    }
    doc.restore();

    // -------------------------------------------------------------
    // DIAGRAMA 2: DILATACIÓN Y POSICIÓN (CÍRCULOS DE 1 A 10 CM + FLECHA)
    // -------------------------------------------------------------
    const cx2 = diagX + colW + colW * 0.49; // 372.1
    const cy2 = diagY + diagH * 0.556;     // 528.2
    const maxR = 38.8;                     // Radio círculo de 10 cm
    const rawDil = parseFloat(datos.cervix_dilatacion || datos.dilatacion || '4') || 4;
    const dilNum = Math.min(10, Math.max(0, rawDil));
    const rDil = (dilNum / 10.0) * maxR;
    const posStr = (datos.posicion || 'OA').trim().toUpperCase();

    doc.save();
    for (let c = 1; c <= Math.floor(dilNum); c++) {
      const rc = (c / 10.0) * maxR;
      doc.circle(cx2, cy2, rc).lineWidth(0.5).strokeColor('#fbcfe8').stroke();
    }
    if (rDil > 2) {
      doc.circle(cx2, cy2, rDil).fillOpacity(0.30).fillColor('#f472b6').fill();
      doc.circle(cx2, cy2, rDil).lineWidth(1.6).strokeColor('#db2777').stroke();
    }

    let angleRad = -Math.PI / 2; // OA = hacia PUBIS
    if (posStr.includes('OP')) angleRad = Math.PI / 2;
    else if (posStr.includes('ODA')) angleRad = -Math.PI / 4;
    else if (posStr.includes('OIA')) angleRad = -3 * Math.PI / 4;
    else if (posStr.includes('ODT')) angleRad = 0;
    else if (posStr.includes('OIT')) angleRad = Math.PI;
    else if (posStr.includes('ODP')) angleRad = Math.PI / 4;
    else if (posStr.includes('OIP')) angleRad = 3 * Math.PI / 4;

    const arrowLen = Math.max(rDil, 17);
    const ax = cx2 + Math.cos(angleRad) * arrowLen;
    const ay = cy2 + Math.sin(angleRad) * arrowLen;

    doc.lineWidth(1.6).strokeColor('#9d174d');
    doc.moveTo(cx2, cy2).lineTo(ax, ay).stroke();
    const headAngle = 0.45;
    const tipLen = 5;
    doc.moveTo(ax, ay).lineTo(ax - Math.cos(angleRad - headAngle) * tipLen, ay - Math.sin(angleRad - headAngle) * tipLen).stroke();
    doc.moveTo(ax, ay).lineTo(ax - Math.cos(angleRad + headAngle) * tipLen, ay - Math.sin(angleRad + headAngle) * tipLen).stroke();

    doc.roundedRect(cx2 - 13, cy2 - 5, 26, 10.5, 2.5).fillOpacity(0.95).fillAndStroke('#ffffff', '#db2777');
    doc.fillOpacity(1.0).fontSize(6.0).fillColor('#9d174d').text(`${dilNum}cm ${posStr}`, cx2 - 11, cy2 - 2.8, { lineBreak: false });
    doc.restore();

    // -------------------------------------------------------------
    // DIAGRAMA 3: PLANOS DE HODGE (0 A 4) + RUEDITA CABECITA DEL BEBÉ
    // -------------------------------------------------------------
    const col3Left = diagX + colW * 2;
    const cx3 = col3Left + colW * 0.5; // 516.5

    const hodgePlanes = [
      { p: 0, label: '0: Libre', headX: cx3 - 10, headY: diagY + 68, r: 10 },
      { p: 1, label: 'I: Insinuado', headX: cx3 - 3, headY: diagY + 92, r: 10.5 },
      { p: 2, label: 'II: Fijo', headX: cx3 + 5, headY: diagY + 118, r: 11 },
      { p: 3, label: 'III: Encajado', headX: cx3 + 13, headY: diagY + 140, r: 11 },
      { p: 4, label: 'IV: Prof. Enc.', headX: cx3 + 22, headY: diagY + 162, r: 11 },
    ];

    let hodgeIdx = 1;
    const hodgeStr = String(datos.planos_hodge || '').toLowerCase();
    if (hodgeStr.includes('0') || hodgeStr.includes('libre') || hodgeStr.includes('flot')) hodgeIdx = 0;
    else if (hodgeStr.includes('4') || hodgeStr.includes('iv') || hodgeStr.includes('prof')) hodgeIdx = 4;
    else if (hodgeStr.includes('3') || hodgeStr.includes('iii') || hodgeStr.includes('encaj')) hodgeIdx = 3;
    else if (hodgeStr.includes('2') || hodgeStr.includes('ii') || hodgeStr.includes('fij')) hodgeIdx = 2;
    else if (hodgeStr.includes('1') || hodgeStr.includes('i') || hodgeStr.includes('insin')) hodgeIdx = 1;

    doc.save();
    const guideLines = [
      { label: 'Plano I', y: diagY + 92 },
      { label: 'Plano II', y: diagY + 118 },
      { label: 'Plano III', y: diagY + 140 },
      { label: 'Plano IV', y: diagY + 162 },
    ];

    guideLines.forEach(l => {
      doc.lineWidth(0.7).dash(3, { space: 2 }).strokeColor('#3b82f6');
      doc.moveTo(col3Left + 12, l.y + 6).lineTo(col3Left + colW - 14, l.y - 4).stroke();
      doc.undash();
      doc.fontSize(4.6).fillColor('#1d4ed8').text(l.label, col3Left + colW - 32, l.y - 6, { lineBreak: false });
    });

    const selHodge = hodgePlanes[hodgeIdx];
    doc.circle(selHodge.headX, selHodge.headY, selHodge.r).fillOpacity(0.85).fillAndStroke('#dbeafe', '#1d4ed8');
    doc.lineWidth(0.8).strokeColor('#1e40af');
    doc.moveTo(selHodge.headX - 6, selHodge.headY).lineTo(selHodge.headX + 6, selHodge.headY).stroke();
    doc.moveTo(selHodge.headX, selHodge.headY).lineTo(selHodge.headX - 3, selHodge.headY - 5).stroke();
    doc.moveTo(selHodge.headX, selHodge.headY).lineTo(selHodge.headX + 3, selHodge.headY - 5).stroke();

    doc.roundedRect(selHodge.headX - 20, selHodge.headY + selHodge.r + 2, 40, 9, 2).fillOpacity(0.95).fillAndStroke('#eff6ff', '#2563eb');
    doc.fillOpacity(1.0).fontSize(5.0).fillColor('#1e40af').text(selHodge.label, selHodge.headX - 18, selHodge.headY + selHodge.r + 3.5, { lineBreak: false });
    doc.restore();

    // Bloque de firma inferior en Página 1 (PERSONAL MÉDICO RESPONSABLE arriba, amplio espacio de firma, línea y (NOMBRE Y FIRMA) abajo)
    doc.font(boldF).fontSize(7.8).fillColor('#000000').text('PERSONAL MÉDICO RESPONSABLE', left, 650, {
      width: totalW,
      align: 'center',
      lineBreak: false,
    });

    const sigW = 240;
    const sigX = left + (totalW - sigW) / 2;
    const sigLineY = 708;
    const medResp = datos.medico_responsable || datos.medico_nombre;
    if (medResp) {
      this.dibujarTextoAjustado(doc, medResp, sigX, sigLineY - 12, sigW, 11, {
        maxFontSize: 7.8,
        minFontSize: 6.0,
        font: semiF,
        align: 'center',
      });
    }
    doc.lineWidth(0.7).moveTo(sigX, sigLineY).lineTo(sigX + sigW, sigLineY).stroke('#000000');
    doc.font(regF).fontSize(6.8).fillColor('#000000').text('(NOMBRE Y FIRMA)', sigX, sigLineY + 3.5, {
      width: sigW,
      align: 'center',
      lineBreak: false,
    });

    doc.font(regF).fontSize(7.2).fillColor('#000000').text('208C0101100000L-033-19', left, 738, {
      align: 'right',
      width: totalW,
      lineBreak: false,
    });

    // ============================================================
    // PÁGINA 2: UNIDAD TOCO QUIRÚRGICA
    // ============================================================
    doc.addPage({ size: 'LETTER', margins: { top: 0, bottom: 0, left: 0, right: 0 } });

    doc.font(boldF).fontSize(9.5).fillColor('#000000').text('UNIDAD TOCO QUIRÚRGICA', left, 66, {
      align: 'center',
      width: totalW,
      lineBreak: false,
    });

    const gridTop = 86;
    const colLabelW = 116;
    const colScaleW = 26;
    const colHLabel = colLabelW + colScaleW; // 142
    const colHoraW = (totalW - colHLabel) / 14;

    // 1. Fila FECHA: (86..104) abierta a los lados, sin divisiones de horas a la derecha
    hLine(gridTop, 0.6);
    vLine(left + colHLabel, gridTop, gridTop + 18, 0.6);
    doc.font(boldF).fontSize(6.8).fillColor('#000000').text('FECHA:', left + 4, gridTop + 5.5, { lineBreak: false });
    doc.font(semiF).fontSize(7.5).text(fActual, left + colHLabel + 8, gridTop + 5, { lineBreak: false });
    hLine(gridTop + 18, 0.6);

    // 2. Fila HORA: (104..122) abierta a los lados, con las 14 columnas de horas
    const yHora = gridTop + 18;
    doc.font(boldF).fontSize(6.8).fillColor('#000000').text('HORA:', left + 4, yHora + 5.5, { lineBreak: false });
    hLine(yHora + 18, 0.6);

    // 3. Banda FRECUENCIA CARDIACA FETAL (122..262 -> 5 sub-filas de 28pt = 140pt)
    const yFcf = yHora + 18;
    const fcfRowH = 28;
    const fcfTotalH = fcfRowH * 5; // 140
    vLine(left + colLabelW, yFcf, yFcf + fcfTotalH, 0.6);
    doc.font(boldF).fontSize(6.8).fillColor('#000000').text('FRECUENCIA CARDIACA\nFETAL', left + 4, yFcf + 56, {
      lineGap: 3,
    });
    const fcfLabels = ['', '160', '140', '120', ''];
    for (let r = 0; r < 5; r++) {
      const ry = yFcf + r * fcfRowH;
      if (r > 0) {
        hLine(ry, 0.6, left + colLabelW, right);
      }
      if (fcfLabels[r]) {
        doc.font(boldF).fontSize(6.8).fillColor('#000000').text(fcfLabels[r], left + colLabelW, ry + 10, {
          width: colScaleW,
          align: 'center',
          lineBreak: false,
        });
      }
    }
    hLine(yFcf + fcfTotalH, 0.6);

    // 4. 5 filas de parámetros maternos (262..352 -> 5 filas de 18pt = 90pt)
    const yParams = yFcf + fcfTotalH;
    const paramRowH = 18;
    const paramNames = [
      'CONTRACCIONES EN 10 MINUTOS',
      'MIL/UNIDADES',
      'TENSIÓN ARTERIAL',
      'PULSO',
      'TEMPERATURA',
    ];
    paramNames.forEach((pName, idx) => {
      const py = yParams + idx * paramRowH;
      doc.font(boldF).fontSize(6.5).fillColor('#000000').text(pName, left + 4, py + 5.5, { lineBreak: false });
      hLine(py + paramRowH, 0.6);
    });

    // 5. Banda DILATACIÓN EN CENTIMETROS (352..512 -> 10 sub-filas de 16pt = 160pt)
    const yDil = yParams + paramNames.length * paramRowH;
    const dilRowH = 16;
    const dilTotalH = dilRowH * 10; // 160
    vLine(left + colLabelW, yDil, yDil + dilTotalH, 0.6);

    // Texto vertical rotado -90 grados "DILATACIÓN EN CENTIMETROS"
    doc.save();
    doc.translate(left + 60, yDil + dilTotalH / 2 + 48);
    doc.rotate(-90);
    doc.font(boldF).fontSize(6.8).fillColor('#000000').text('DILATACIÓN EN CENTIMETROS', 0, 0, { lineBreak: false });
    doc.restore();

    for (let i = 0; i < 10; i++) {
      const cm = 10 - i;
      const ry = yDil + i * dilRowH;
      if (i > 0) {
        hLine(ry, 0.6, left + colLabelW, right);
      }
      doc.font(boldF).fontSize(6.8).fillColor('#000000').text(`${cm}`, left + colLabelW, ry + 4.5, {
        width: colScaleW,
        align: 'center',
        lineBreak: false,
      });
    }
    hLine(yDil + dilTotalH, 0.6);

    // 6. Fila HORAS DE LABOR (512..528 -> 16pt)
    const yLabor = yDil + dilTotalH;
    const laborRowH = 16;
    doc.font(boldF).fontSize(6.8).fillColor('#000000').text('HORAS DE LABOR', left + 4, yLabor + 4.5, { lineBreak: false });
    hLine(yLabor + laborRowH, 0.6);

    // 7. Banda ALTURA DE LA PRESENTACIÓN (528..608 -> 4 sub-filas de 20pt = 80pt)
    const yAlt = yLabor + laborRowH;
    const altRowH = 20;
    const altTotalH = altRowH * 4; // 80
    const gridBot = yAlt + altTotalH;

    vLine(left + colLabelW, yAlt, gridBot, 0.6);
    doc.font(boldF).fontSize(6.8).fillColor('#000000').text('ALTURA DE LA\nPRESENTACIÓN', left + 36, yAlt + 28, {
      align: 'center',
      width: colLabelW - 44,
      lineGap: 3,
    });

    ['I', 'II', 'III', 'IV'].forEach((plano, pIdx) => {
      const ry = yAlt + pIdx * altRowH;
      if (pIdx > 0) {
        hLine(ry, 0.6, left + colLabelW, right);
      }
      doc.font(boldF).fontSize(6.8).fillColor('#000000').text(plano, left + colLabelW, ry + 6, {
        width: colScaleW,
        align: 'center',
        lineBreak: false,
      });
    });
    hLine(gridBot, 0.6);

    // Línea divisoria vertical principal entre etiquetas y las 14 columnas de horas (desde HORA hasta el final)
    vLine(left + colHLabel, yHora, gridBot, 0.6);

    // PÁGINA 2: UNIDAD TOCO QUIRÚRGICA
    // Se imprime la cuadrícula oficial completa en blanco para su llenado
    // y trazado manual a pluma a pie de cama por el personal de salud.
    for (let h = 1; h <= 14; h++) {
      const curX = left + colHLabel + (h - 1) * colHoraW;
      if (h > 1) {
        vLine(curX, yHora, gridBot, 0.6);
      }
      // Sub-división vertical a la mitad de cada columna en la banda FRECUENCIA CARDIACA FETAL (como en el formato oficial)
      vLine(curX + colHoraW / 2, yFcf, yFcf + fcfTotalH, 0.5);

      // Número de hora de labor (1..14)
      doc.font(boldF).fontSize(6.8).fillColor('#000000').text(`${h}`, curX, yLabor + 4.5, {
        width: colHoraW,
        align: 'center',
        lineBreak: false,
      });
    }

    doc.font(regF).fontSize(7.2).fillColor('#000000').text('208C0101100000L-033-19', left, 738, {
      align: 'right',
      width: totalW,
      lineBreak: false,
    });

    doc.end();
  }

  // ============================================================
  // 11. SOLICITUD DE LABORATORIO (Formato 208C0101100000L-025-25)
  // ============================================================
  public static generarLaboratorio(res: Response, datos: any, paciente: any) {
    const doc = this.crearDoc(res, `Solicitud_Laboratorio_${paciente.expediente_clinico}`, {
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    const left = 24;
    const totalW = 564;
    const right = left + totalW;

    const boldF = this.fontBold(doc);
    const regF = this.fontReg(doc);
    const semiF = this.fontSemi(doc);

    const hLine = (yPos: number, lw = 0.7, x1 = left, x2 = right) => {
      doc.lineWidth(lw).moveTo(x1, yPos).lineTo(x2, yPos).stroke('#000000');
    };
    const vLine = (xPos: number, y1: number, y2: number, lw = 0.7) => {
      doc.lineWidth(lw).moveTo(xPos, y1).lineTo(xPos, y2).stroke('#000000');
    };

    // 1. Logos institucionales superiores
    LogoConfigService.dibujarEncabezado(doc, '', { startX: left, bannerWidth: totalW, soloLogos: true });

    // 2. Franja de título abierta a los lados
    hLine(62, 0.8);
    doc.font(boldF).fontSize(10.5).fillColor('#000000').text('SOLICITUD DE LABORATORIO', left, 66.5, {
      width: totalW,
      align: 'center',
      lineBreak: false,
    });
    hLine(81, 0.8);

    const drawOpenCell = (x: number, y: number, w: number, h: number, label: string, val: any, labelFs = 6.8) => {
      if (label) {
        doc.font(regF).fontSize(labelFs).fillColor('#000000').text(label, x + 4, y + 2.5, {
          width: w - 8,
          lineBreak: false,
        });
      }
      const strVal = val !== undefined && val !== null ? String(val) : '';
      if (strVal) {
        this.dibujarTextoAjustado(doc, strVal, x + 4, y + 11.5, w - 8, h - 13, {
          maxFontSize: 8.0,
          minFontSize: 5.8,
          font: semiF,
          align: 'left',
        });
      }
    };

    const nombreComp = `${paciente.apellido_paterno || ''} ${paciente.apellido_materno || ''} ${paciente.nombre || ''}`.replace(/\s+/g, ' ').trim();
    const s = String(paciente.sexo || '').trim().toUpperCase();
    const esFem = s === 'F' || s.startsWith('FEM') || s.startsWith('MUJ');
    const esMasc = s === 'M' || s === 'H' || s.startsWith('MASC') || s.startsWith('HOMB');

    const serv = String(datos.tipo_servicio || 'Hospitalización').toLowerCase();
    const esHosp = serv.includes('hosp');
    const esExt = serv.includes('externa');
    const esUrg = serv.includes('urgencia');
    const esOtro = serv.includes('otro') || (!esHosp && !esExt && !esUrg);

    // Fila 1: Unidad Médica | Fecha de Solicitud (y = 85..107)
    hLine(85, 0.7);
    drawOpenCell(left, 85, 430, 22, 'Unidad Médica', datos.unidad_medica || 'Hospital General San Felipe del Progreso');
    vLine(left + 430, 85, 107);
    drawOpenCell(left + 430, 85, totalW - 430, 22, 'Fecha de Solicitud', datos.fecha_solicitud ? this.formatFecha(datos.fecha_solicitud) : this.formatFecha(new Date()));
    hLine(107, 0.7);

    // Fila 2: Nombre de la o del Paciente | Edad | Sexo (y = 107..132)
    drawOpenCell(left, 107, 362, 25, 'Nombre de la o del Paciente (Primer Apellido, Segundo Apellido, Nombre o Nombres)', nombreComp, 6.5);
    vLine(left + 362, 107, 132);
    drawOpenCell(left + 362, 107, 68, 25, 'Edad', `${paciente.edad || '--'}`);
    vLine(left + 430, 107, 132);
    doc.font(regF).fontSize(6.8).fillColor('#000000').text('Sexo', left + 434, 109.5, { lineBreak: false });

    // Femenino [ ] arriba y Masculino [ ] abajo a la derecha
    doc.font(regF).fontSize(6.5).fillColor('#000000').text('Femenino', left + 476, 109.5, { lineBreak: false });
    doc.lineWidth(0.7).rect(right - 16, 109.5, 12, 6.5).stroke('#000000');
    if (esFem) {
      doc.font(boldF).fontSize(6.2).text('X', right - 16, 109.5, { width: 12, align: 'center', lineBreak: false });
    }
    doc.font(regF).fontSize(6.5).fillColor('#000000').text('Masculino', left + 476, 120.5, { lineBreak: false });
    doc.lineWidth(0.7).rect(right - 16, 120.5, 12, 6.5).stroke('#000000');
    if (esMasc) {
      doc.font(boldF).fontSize(6.2).text('X', right - 16, 120.5, { width: 12, align: 'center', lineBreak: false });
    }
    hLine(132, 0.7);

    // Fila 3: CURP | Fecha de Nacimiento | Núm. de Cama | Núm. de Expediente (y = 132..154)
    drawOpenCell(left, 132, 162, 22, 'CURP', paciente.curp || 'NO ASIGNADA');
    vLine(left + 162, 132, 154);
    drawOpenCell(left + 162, 132, 146, 22, 'Fecha de Nacimiento', this.formatFecha(paciente.fecha_nacimiento));
    vLine(left + 308, 132, 154);
    drawOpenCell(left + 308, 132, 122, 22, 'Núm. de Cama', datos.cama || 'N/A');
    vLine(left + 430, 132, 154);
    drawOpenCell(left + 430, 132, totalW - 430, 22, 'Núm. de Expediente', paciente.expediente_clinico);
    hLine(154, 0.7);

    // Fila 4: Tipo de Servicio | Especialidad Médica (y = 154..179)
    doc.font(regF).fontSize(6.8).fillColor('#000000').text('Tipo de Servicio', left + 4, 156.5, { lineBreak: false });
    const drawServOpt = (lx: number, label: string, bx: number, checked: boolean) => {
      doc.font(regF).fontSize(6.8).fillColor('#000000').text(label, lx, 156.5, { lineBreak: false });
      doc.lineWidth(0.7).rect(bx, 161, 15, 11).stroke('#000000');
      if (checked) {
        doc.font(boldF).fontSize(8.0).text('X', bx, 162.5, { width: 15, align: 'center', lineBreak: false });
      }
    };
    drawServOpt(left + 90, 'Hospitalización', left + 168, esHosp);
    drawServOpt(left + 196, 'Consulta Externa', left + 278, esExt);
    drawServOpt(left + 304, 'Urgencias', left + 350, esUrg);
    drawServOpt(left + 380, 'Otro', left + 408, esOtro);

    vLine(left + 430, 154, 179);
    drawOpenCell(left + 430, 154, totalW - 430, 25, 'Especialidad Médica', datos.especialidad_medica || 'Medicina General');
    hLine(179, 0.7);

    // Fila 5: Nombre del Personal Médico | Cédula Profesional (y = 179..201)
    drawOpenCell(left, 179, 430, 22, 'Nombre del Personal Médico', datos.medico_solicitante || 'Personal Médico');
    vLine(left + 430, 179, 201);
    drawOpenCell(left + 430, 179, totalW - 430, 22, 'Cédula Profesional', datos.medico_cedula || '--');
    hLine(201, 0.7);

    // Fila 6: Diagnóstico | Medicamentos / Observaciones (y = 201..224)
    drawOpenCell(left, 201, 188, 23, 'Diagnóstico', datos.diagnostico || 'En estudio');
    vLine(left + 188, 201, 224);
    drawOpenCell(left + 188, 201, totalW - 188, 23, 'Medicamentos / Observaciones', datos.medicamentos_observaciones || 'Sin observaciones');
    hLine(224, 0.7);

    // Banda Estudios Solicitados abierta a los lados (y = 224..234)
    doc.font(boldF).fontSize(6.8).fillColor('#000000').text('Estudios Solicitados', left, 226, {
      align: 'center',
      width: totalW,
      lineBreak: false,
    });
    hLine(234, 0.7);

    const selRaw = Array.isArray(datos.estudios_seleccionados) ? datos.estudios_seleccionados : [];
    const sel = selRaw.map((it: string) => String(it).toLowerCase().trim());
    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const isChecked = (name: string) => {
      const n = name.toLowerCase().trim();
      const normN = normalize(name);
      return sel.some((s: string) => {
        const normS = normalize(s);
        if (s.includes(n) || n.includes(s)) return true;
        if (normS && normN && (normS.includes(normN) || normN.includes(normS))) return true;
        if (normN === 'tp' && (normS.includes('tp') || normS.includes('protrombina'))) return true;
        if (normN === 'tpt' && (normS.includes('tpt') || normS.includes('tromboplastina') || normS.includes('ttpa'))) return true;
        if ((normN.includes('examengeneraldeorina') || normN === 'ego') && (normS.includes('ego') || normS.includes('orina'))) return true;
        if (normN.includes('biometria') && normS.includes('biometria')) return true;
        if (normN.includes('sedimentacion') && (normS.includes('sedimentacion') || normS.includes('vsg'))) return true;
        return false;
      });
    };

    // Helper para dibujar casillas rectangulares contiguas (12.5 x 7.8pt) como en el formato oficial
    const drawItem = (x: number, y: number, label: string, maxLabelW = 92, boxH = 7.8) => {
      const chk = isChecked(label);
      const boxW = 12.5;
      doc.lineWidth(0.6).rect(x, y, boxW, boxH).stroke('#000000');
      if (chk) {
        doc.font(boldF).fontSize(6.5).fillColor('#000000').text('X', x, y + 0.6, {
          width: boxW,
          align: 'center',
          lineBreak: false,
        });
      }
      const cleanLbl = label.replace(/\n/g, ' ');
      let fs = 6.2;
      doc.font(regF).fontSize(fs);
      while (fs > 4.6 && doc.widthOfString(cleanLbl) > maxLabelW) {
        fs -= 0.2;
        doc.fontSize(fs);
      }
      doc.font(regF).fontSize(fs).fillColor('#000000').text(cleanLbl, x + boxW + 4, y + 0.8 + (6.2 - fs) * 0.35, {
        width: maxLabelW + 4,
        lineBreak: false,
      });
    };

    const drawGroup = (x: number, startY: number, items: string[], maxLabelW = 92, step = 7.8): number => {
      let curY = startY;
      items.forEach((it) => {
        drawItem(x, curY, it, maxLabelW, step);
        curY += step;
      });
      return curY;
    };

    // SECCIÓN SUPERIOR DE ESTUDIOS (y = 236..400)
    doc.font(boldF).fontSize(6.5).fillColor('#000000').text('Química Clínica', left, 237, { lineBreak: false });

    // Columna 1 Química Clínica
    let y1 = 250;
    y1 = drawGroup(left, y1, ['Glucosa', 'Urea/BUN'], 95, 8.2);
    y1 += 5;
    y1 = drawGroup(left, y1, ['Creatina en Suero', 'Ácido Úrico en Suero', 'Colesterol Total', 'Triglicéridos'], 95, 8.2);
    y1 += 5;
    y1 = drawGroup(left, y1, ['Colesterol HDL', 'Colesterol LDL'], 95, 8.2);
    y1 += 8;
    drawGroup(left, y1, ['Amilasa', 'Lipasa', 'CK', 'CK-MB', 'Microproteínas'], 95, 8.2);

    // Columna 2 Química Clínica
    let y2 = 250;
    y2 = drawGroup(left + 136, y2, ['Bilirrubina Total', 'Bilirrubina Directa'], 95, 8.2);
    y2 += 5;
    y2 = drawGroup(left + 136, y2, ['Bilirrubina Indirecta', 'Fosfatasa Alcalina', 'Fosfatasa Acida', 'TGO/AST', 'TGP/ALT', 'GGT', 'LDH', 'Proteínas Totales en Suero'], 95, 8.2);
    y2 += 5;
    drawGroup(left + 136, y2, ['Albumina en Suero', 'Globulina', 'Depuración de Creatina en Orina'], 95, 8.2);

    // Columna 3 Química Clínica + Electrolitos + Gases
    let y3 = 250;
    y3 = drawGroup(left + 272, y3, ['Glucosa Postprandial', 'Hemoglobina Glicosilada (HbA1c)'], 95, 8.2);
    y3 += 8;
    doc.font(boldF).fontSize(6.5).fillColor('#000000').text('Electrolitos', left + 272, y3, { lineBreak: false });
    y3 += 11;
    y3 = drawGroup(left + 272, y3, ['Sodio', 'Potasio', 'Cloro', 'Calcio en Suero', 'Fosforo en Suero', 'Magnesio en Suero'], 95, 8.2);
    y3 += 8;
    doc.font(boldF).fontSize(6.5).fillColor('#000000').text('Gases', left + 272, y3, { lineBreak: false });
    y3 += 11;
    drawGroup(left + 272, y3, ['Gasometría'], 95, 8.2);

    // Columna 4 Inmunología
    doc.font(boldF).fontSize(6.5).fillColor('#000000').text('Inmunología', left + 392, 237, { lineBreak: false });
    drawGroup(left + 392, 250, [
      'Factor Reumatoide', 'Proteína C Reactiva', 'Antiestreptolisinas', 'VDRL',
      'Tífico O', 'Tífico H', 'Proteus OX-19', 'Paratífico A', 'Paratífico B',
      'Rosa de Bengala', 'Células LE', 'Hcg (P.I.E) en Orina',
    ], 110, 8.2);

    hLine(402, 0.7);

    // SECCIÓN MEDIA DE ESTUDIOS (y = 404..552)
    doc.font(boldF).fontSize(6.5).fillColor('#000000').text('Hematología', left, 405, { lineBreak: false });
    let yHem = 415;
    yHem = drawGroup(left, yHem, ['Biometría Hemática', 'Velocidad de Sedimentación Globular'], 102, 8.2);
    yHem += 5;
    yHem = drawGroup(left, yHem, ['Grupo Sanguíneo y Rh'], 102, 8.2);
    yHem += 5;
    yHem = drawGroup(left, yHem, ['Coombs Directo', 'Coombs Indirecto'], 102, 8.2);
    yHem += 9;
    doc.font(boldF).fontSize(6.5).fillColor('#000000').text('Coagulación', left + 4, yHem, { lineBreak: false });
    yHem += 11;
    drawGroup(left, yHem, ['T. P', 'T. P. T', 'Fibrinógeno'], 102, 8.2);

    doc.font(boldF).fontSize(6.5).fillColor('#000000').text('Endocrinología', left + 136, 405, { lineBreak: false });
    let yEndo1 = 415;
    yEndo1 = drawGroup(left + 136, yEndo1, ['T3 Total', 'T4 Total'], 82, 8.2);
    yEndo1 += 5;
    drawGroup(left + 136, yEndo1, ['T3 Libre', 'T4 Libre', 'TSH', 'FSH', 'LH', 'Prolactina', 'Estradiol', 'Testosterona', 'Progesterona', 'Cortisol en Suero', 'Cortisol en Orina'], 82, 8.2);

    let yEndo2 = 415;
    yEndo2 = drawGroup(left + 238, yEndo2, ['Insulina', 'BhCg'], 82, 8.2);
    yEndo2 += 5;
    drawGroup(left + 238, yEndo2, ['Péptido C', 'Ácido Fólico', 'Vitamina B12', 'Ferritina'], 82, 8.2);

    doc.font(boldF).fontSize(6.5).fillColor('#000000').text('Marcadores Tumorales', left + 350, 405, { lineBreak: false });
    let yTum = 415;
    yTum = drawGroup(left + 350, yTum, ['CA 125', 'CA 15-3'], 82, 8.2);
    yTum += 5;
    drawGroup(left + 350, yTum, ['CA 19-9', 'AFP', 'PSA Libre', 'PSA Total', 'CEA'], 82, 8.2);

    doc.font(boldF).fontSize(6.5).fillColor('#000000').text('Drogas Terapéuticas', left + 458, 405, { lineBreak: false });
    let yDrog = 415;
    yDrog = drawGroup(left + 458, yDrog, ['Benzodiacepinas', 'Ácido Valproico'], 84, 8.2);
    yDrog += 5;
    drawGroup(left + 458, yDrog, ['Carbamazepina', 'Digoxina', 'Difenilhidantoina'], 84, 8.2);

    hLine(552, 0.7);

    // SECCIÓN INFERIOR DE ESTUDIOS (y = 554..660)
    doc.font(boldF).fontSize(6.5).fillColor('#000000').text('Uroanálisis', left + 4, 554.5, { lineBreak: false });
    drawGroup(left, 563, ['Examen General de Orina'], 102, 8.2);

    doc.font(boldF).fontSize(6.5).fillColor('#000000').text('Parasitología', left + 4, 584, { lineBreak: false });
    drawGroup(left, 596, ['CPS Simple', 'CPS Seriado', 'Coprológico', 'Prueba de Graham', 'Amiba en Fresco', 'Citología en Moco Fecal', 'Sangre Oculta en Heces'], 102, 8.2);

    doc.font(boldF).fontSize(6.5).fillColor('#000000').text('Bacteriología', left + 136, 554.5, { lineBreak: false });
    let yBac1 = 574;
    yBac1 = drawGroup(left + 136, yBac1, ['Hemocultivo', 'Coprocultivo', 'Urocultivo'], 82, 8.2);
    yBac1 += 6;
    drawGroup(left + 136, yBac1, ['Exudado Naso-Faríngeo', 'Cultivo Ótico', 'Cultivo Ocular', 'Exudado Uretral', 'Exudado Cérvico Vaginal'], 82, 8.2);

    let yBac2 = 563;
    yBac2 = drawGroup(left + 238, yBac2, ['Cultivo Líquido Cefalorraquídeo'], 98, 8.2);
    yBac2 += 6;
    yBac2 = drawGroup(left + 238, yBac2, ['Cultivo Líquido Seminal', 'Identificación Levaduras'], 98, 8.2);
    yBac2 += 6;
    drawGroup(left + 238, yBac2, ['Antibiograma'], 98, 8.2);

    doc.font(boldF).fontSize(6.5).fillColor('#000000').text('Marcadores Especiales', left + 350, 554.5, { lineBreak: false });
    drawGroup(left + 350, 574, ['Procalcitonina', 'PAPP-A', 'PLGF', 'SFH-1X'], 82, 8.2);

    // Recuadro "Otros" con encabezado propio (left + 458 a right, y = 552..656)
    const otrosX = left + 458;
    const otrosW = right - otrosX;
    doc.lineWidth(0.7).rect(otrosX, 552, otrosW, 104).stroke('#000000');
    hLine(562, 0.7, otrosX, right);
    doc.font(boldF).fontSize(6.5).fillColor('#000000').text('Otros', otrosX, 554.5, {
      width: otrosW,
      align: 'center',
      lineBreak: false,
    });
    if (datos.otros_estudios) {
      this.dibujarTextoAjustado(doc, datos.otros_estudios, otrosX + 4, 565, otrosW - 8, 88, {
        maxFontSize: 6.5,
        minFontSize: 4.8,
        font: regF,
        lineGap: 1.2,
      });
    }

    // Bloque inferior de Firma y Sello (y = 674..734)
    const sigLineY = 716;
    hLine(sigLineY, 0.7, left, left + 290);
    if (datos.medico_solicitante) {
      this.dibujarTextoAjustado(doc, datos.medico_solicitante, left + 6, sigLineY - 12, 278, 11, {
        maxFontSize: 7.5,
        minFontSize: 5.8,
        font: semiF,
        align: 'center',
      });
    }
    doc.font(regF).fontSize(6.8).fillColor('#000000').text('Nombre y Firma del Personal Médico Solicitante', left, sigLineY + 3.5, {
      align: 'center',
      width: 290,
      lineBreak: false,
    });

    // Recuadro Sello a la derecha
    const selloX = left + 328;
    const selloW = right - selloX;
    doc.lineWidth(0.7).rect(selloX, 676, selloW, 58).stroke('#000000');
    doc.font(regF).fontSize(6.8).fillColor('#000000').text('Sello', selloX, 679.5, {
      width: selloW,
      align: 'center',
      lineBreak: false,
    });

    // Nota y clave al pie
    doc.font(boldF).fontSize(7.2).fillColor('#000000').text('Nota: ', left, 742, { continued: true });
    doc.font(regF).text('Los valores de referencia deben estar incluidos en los formatos de entrega de resultados de cada laboratorio.', {
      lineBreak: false,
    });

    doc.font(boldF).fontSize(7.8).fillColor('#000000').text('208C0101100000L-025-25', left, 753, {
      align: 'right',
      width: totalW,
      lineBreak: false,
    });

    doc.end();
  }

  // ============================================================
  // 12. SOLICITUD DE ESTUDIO DE GABINETE (Formato 208C0101100000L-394-25)
  // ============================================================
  public static generarGabinete(res: Response, datos: any, paciente: any) {
    const doc = this.crearDoc(res, `Solicitud_Gabinete_${paciente.expediente_clinico}`, {
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    const left = 24;
    const totalW = 564;
    const right = left + totalW;

    const boldF = this.fontBold(doc);
    const regF = this.fontReg(doc);
    const semiF = this.fontSemi(doc);

    const hLine = (yPos: number, lw = 0.7, x1 = left, x2 = right) => {
      doc.lineWidth(lw).moveTo(x1, yPos).lineTo(x2, yPos).stroke('#000000');
    };
    const vLine = (xPos: number, y1: number, y2: number, lw = 0.7) => {
      doc.lineWidth(lw).moveTo(xPos, y1).lineTo(xPos, y2).stroke('#000000');
    };
    const dLine = (yPos: number) => {
      hLine(yPos, 0.7);
      hLine(yPos + 2, 0.7);
    };

    // 1. Logos institucionales superiores
    LogoConfigService.dibujarEncabezado(doc, '', { startX: left, bannerWidth: totalW, soloLogos: true });

    // 2. Franja de título abierta a los lados
    hLine(62, 0.8);
    doc.font(boldF).fontSize(10.5).fillColor('#000000').text('SOLICITUD DE ESTUDIO DE GABINETE', left, 66.5, {
      width: totalW,
      align: 'center',
      lineBreak: false,
    });
    hLine(80, 0.8);
    hLine(82.5, 0.7);

    const drawOpenCell = (x: number, y: number, w: number, h: number, label: string, val: any, labelFs = 6.8) => {
      if (label) {
        doc.font(regF).fontSize(labelFs).fillColor('#000000').text(label, x + 4, y + 2.5, {
          width: w - 8,
          lineBreak: false,
        });
      }
      const strVal = val !== undefined && val !== null ? String(val) : '';
      if (strVal) {
        this.dibujarTextoAjustado(doc, strVal, x + 4, y + 11.5, w - 8, h - 13, {
          maxFontSize: 8.0,
          minFontSize: 5.8,
          font: semiF,
          align: 'left',
        });
      }
    };

    const drawRectCheck = (x: number, y: number, label: string, checked: boolean, boxW = 10, boxH = 6.5) => {
      doc.lineWidth(0.7).rect(x, y, boxW, boxH).stroke('#000000');
      if (checked) {
        doc.font(boldF).fontSize(6.2).fillColor('#000000').text('X', x, y + 0.2, {
          width: boxW,
          align: 'center',
          lineBreak: false,
        });
      }
      doc.font(regF).fontSize(6.8).fillColor('#000000').text(label, x + boxW + 4, y + 0.2, { lineBreak: false });
    };

    const nombreComp = `${paciente.apellido_paterno || ''} ${paciente.apellido_materno || ''} ${paciente.nombre || ''}`.replace(/\s+/g, ' ').trim();
    const s = String(paciente.sexo || '').trim().toUpperCase();
    const esFem = s === 'F' || s.startsWith('FEM') || s.startsWith('MUJ');
    const esMasc = s === 'M' || s === 'H' || s.startsWith('MASC') || s.startsWith('HOMB');

    const proc = String(datos.procedencia || 'Hospitalización').toLowerCase();
    const esExt = proc.includes('externa');
    const esUrg = proc.includes('urgencia');
    const esHosp = proc.includes('hosp') || (!esExt && !esUrg);

    const tipoPac = String(datos.tipo_paciente || '1ª vez').toLowerCase();
    const es1aVez = tipoPac.includes('1') || tipoPac.includes('primera');
    const esSubsec = tipoPac.includes('subsec');

    // Fila 1: Unidad Médica | Fecha | Hora | Núm. de Expediente (y = 82.5..105)
    const cX1 = left + 258;
    const cX2 = left + 350;
    const cX3 = left + 436;
    drawOpenCell(left, 82.5, 258, 22.5, 'Unidad Médica', datos.unidad_medica || 'Hospital General San Felipe del Progreso');
    vLine(cX1, 82.5, 134);
    drawOpenCell(cX1, 82.5, 92, 22.5, 'Fecha', datos.fecha ? this.formatFecha(datos.fecha) : this.formatFecha(new Date()));
    vLine(cX2, 82.5, 134);
    drawOpenCell(cX2, 82.5, 86, 22.5, 'Hora', datos.hora ? String(datos.hora).substring(0, 5) : '11:00');
    vLine(cX3, 82.5, 134);
    drawOpenCell(cX3, 82.5, right - cX3, 22.5, 'Núm. de Expediente', paciente.expediente_clinico);
    hLine(105, 0.7);

    // Fila 2: De | Servicio | Cama | Paciente (y = 105..134)
    doc.font(regF).fontSize(6.8).fillColor('#000000').text('De', left + 4, 107.5, { lineBreak: false });
    drawRectCheck(left + 12, 118, 'Consulta Externa', esExt);
    drawRectCheck(left + 104, 118, 'Urgencias', esUrg);
    drawRectCheck(left + 166, 118, 'Hospitalización', esHosp);

    drawOpenCell(cX1, 105, 92, 29, 'Servicio', datos.servicio || 'General');
    drawOpenCell(cX2, 105, 86, 29, 'Cama', datos.cama || 'N/A');

    doc.font(regF).fontSize(6.8).fillColor('#000000').text('Paciente', cX3 + 4, 107.5, { lineBreak: false });
    drawRectCheck(cX3 + 10, 121, '1ª Vez', es1aVez);
    drawRectCheck(cX3 + 58, 121, 'Subsecuente', esSubsec);
    dLine(134);

    // Fila 3: Nombre de la o del Paciente | Fecha de Nacimiento | Edad | Sexo (y = 136..160)
    drawOpenCell(left, 136, 174, 24, 'Nombre de la o del Paciente', nombreComp);
    vLine(left + 174, 136, 160);
    drawOpenCell(left + 174, 136, 176, 24, 'Fecha de Nacimiento', this.formatFecha(paciente.fecha_nacimiento));
    vLine(cX2, 136, 160);
    drawOpenCell(cX2, 136, 86, 24, 'Edad', `${paciente.edad || '--'} AÑOS`);
    vLine(cX3, 136, 160);
    doc.font(regF).fontSize(6.8).fillColor('#000000').text('Sexo', cX3 + 4, 138.5, { lineBreak: false });
    drawRectCheck(cX3 + 10, 148, 'Femenino', esFem);
    drawRectCheck(cX3 + 68, 148, 'Masculino', esMasc);
    dLine(160);

    // Helper para Secciones Rayadas Abiertas (Datos Clínicos, Diagnóstico, Estudios Solicitados)
    let curY = 162;
    const drawRuledSlot = (title: string, content: string, linesCount: number, endWithDouble = true) => {
      doc.font(regF).fontSize(6.8).fillColor('#000000').text(title, left + 4, curY + 2.5, { lineBreak: false });
      curY += 12;
      hLine(curY, 0.7);

      const lineH = 14.0;
      const slotH = linesCount * lineH;
      for (let l = 1; l <= linesCount; l++) {
        const ly = curY + l * lineH;
        if (l === linesCount && endWithDouble) {
          dLine(ly);
        } else {
          hLine(ly, 0.7);
        }
      }
      if (content && String(content).trim()) {
        this.dibujarTextoAjustado(doc, String(content).trim(), left + 4, curY + 2, totalW - 8, slotH - 4, {
          maxFontSize: 7.5,
          minFontSize: 5.5,
          font: regF,
          lineGap: 3.4,
        });
      }
      curY += slotH + (endWithDouble ? 2 : 0);
    };

    drawRuledSlot('Datos Clínicos', datos.datos_clinicos, 4, true);
    drawRuledSlot('Diagnóstico', datos.diagnostico, 3, true);
    drawRuledSlot('Estudios Solicitados', datos.estudios_solicitados, 3, true);

    // Fila de 4 columnas abiertas a los lados: Fecha de la Próxima Consulta | Personal Médico Solicitante | Vo. Bo. Gestor | Observaciones
    const sigTop = curY;
    const sigH = 62;
    const sigBot = sigTop + sigH;
    const sigSubLine = sigBot - 11;

    const sX1 = left + 112;
    const sX2 = left + 258;
    const sX3 = left + 418;

    vLine(sX1, sigTop, sigBot, 0.7);
    vLine(sX2, sigTop, sigBot, 0.7);
    vLine(sX3, sigTop, sigBot, 0.7);
    hLine(sigSubLine, 0.7, sX1, sX3);
    hLine(sigBot, 0.7);

    doc.font(regF).fontSize(6.8).fillColor('#000000').text('Fecha de la Próxima\nConsulta', left + 4, sigTop + 3, {
      width: sX1 - left - 8,
      align: 'center',
      lineGap: 0.5,
    });
    if (datos.fecha_proxima_consulta) {
      doc.font(semiF).fontSize(7.8).fillColor('#000000').text(this.formatFecha(datos.fecha_proxima_consulta), left + 4, sigTop + 28, {
        align: 'center',
        width: sX1 - left - 8,
        lineBreak: false,
      });
    }

    doc.font(regF).fontSize(6.8).fillColor('#000000').text('Personal Médico Solicitante', sX1 + 4, sigTop + 3, {
      width: sX2 - sX1 - 8,
      align: 'center',
      lineBreak: false,
    });
    if (datos.medico_solicitante) {
      this.dibujarTextoAjustado(doc, datos.medico_solicitante, sX1 + 6, sigSubLine - 13, sX2 - sX1 - 12, 11, {
        maxFontSize: 7.2,
        minFontSize: 5.5,
        font: semiF,
        align: 'center',
      });
    }
    doc.font(regF).fontSize(6.5).fillColor('#000000').text('Nombre y Firma', sX1, sigSubLine + 2, {
      align: 'center',
      width: sX2 - sX1,
      lineBreak: false,
    });

    doc.font(regF).fontSize(6.8).fillColor('#000000').text('Vo. Bo. Gestor o Responsable de la\nTutela de Derechos', sX2 + 4, sigTop + 3, {
      width: sX3 - sX2 - 8,
      align: 'center',
      lineGap: 0.5,
    });
    if (datos.vobo_gestor) {
      this.dibujarTextoAjustado(doc, datos.vobo_gestor, sX2 + 6, sigSubLine - 13, sX3 - sX2 - 12, 11, {
        maxFontSize: 7.2,
        minFontSize: 5.5,
        font: semiF,
        align: 'center',
      });
    }
    doc.font(regF).fontSize(6.5).fillColor('#000000').text('Nombre y Firma', sX2, sigSubLine + 2, {
      align: 'center',
      width: sX3 - sX2,
      lineBreak: false,
    });

    doc.font(regF).fontSize(6.8).fillColor('#000000').text('Observaciones', sX3, sigTop + 3, {
      width: right - sX3,
      align: 'center',
      lineBreak: false,
    });
    if (datos.observaciones) {
      this.dibujarTextoAjustado(doc, datos.observaciones, sX3 + 4, sigTop + 14, right - sX3 - 8, sigH - 16, {
        maxFontSize: 6.8,
        minFontSize: 5.0,
        font: regF,
        lineGap: 1.0,
      });
    }

    // Franja Interpretación del Estudio de Gabinete (abierta a los lados, líneas gruesas)
    curY = sigBot + 10;
    hLine(curY, 1.3);
    doc.font(boldF).fontSize(7.2).fillColor('#000000').text('Interpretación del Estudio de Gabinete', left + 4, curY + 3.5, {
      lineBreak: false,
    });
    curY += 14;
    hLine(curY, 1.3);
    curY += 2.5;
    hLine(curY, 0.7);

    // Fila Placa Utilizada | Clave (abierta a los lados)
    const placaW = 420;
    const plH = 26;
    doc.font(regF).fontSize(6.8).fillColor('#000000').text('Placa Utilizada', left + 4, curY + 2.5, { lineBreak: false });

    const placas = [
      { name: '14x17', dx: 12 },
      { name: '14x14', dx: 52 },
      { name: '11x14', dx: 92 },
      { name: '10x12', dx: 130 },
      { name: '8x10', dx: 170 },
      { name: 'Mastografía', dx: 208 },
      { name: 'Ultrasonido', dx: 278 },
      { name: 'Tomografía', dx: 348 },
    ];
    placas.forEach((pl) => {
      const isChecked = String(datos.placa_utilizada || '').toLowerCase().includes(pl.name.toLowerCase());
      drawRectCheck(left + pl.dx, curY + 13, pl.name, isChecked, 10, 6.5);
    });

    vLine(left + placaW, curY, curY + plH, 0.7);
    drawOpenCell(left + placaW, curY, totalW - placaW, plH, 'Clave', datos.clave_estudio || '--');
    curY += plH;
    dLine(curY);
    curY += 2;

    // Interpretación (12 renglones rayados negros)
    drawRuledSlot('Interpretación', datos.interpretacion || 'PENDIENTE DE INTERPRETACIÓN POR EL SERVICIO DE IMAGENOLOGÍA.', 12, false);

    // Bloque inferior de 3 columnas abiertas a los lados: Fecha de Interpretación | Personal Médico que Interpreta | Observaciones
    curY += 12;
    const botTop = curY;
    const botH = 44;
    const botBot = botTop + botH;
    const botSubY = botBot - 12;

    const bX1 = left + 180;
    const bX2 = left + 362;

    hLine(botTop, 0.7);
    vLine(bX1, botTop, botBot, 0.7);
    vLine(bX2, botTop, botBot, 0.7);
    hLine(botSubY, 0.7, bX1, bX2);
    hLine(botBot, 0.7);

    doc.font(regF).fontSize(6.8).fillColor('#000000').text('Fecha de Interpretación', left, botTop + 2.5, {
      width: bX1 - left,
      align: 'center',
      lineBreak: false,
    });
    if (datos.fecha_interpretacion) {
      doc.font(semiF).fontSize(7.8).fillColor('#000000').text(this.formatFecha(datos.fecha_interpretacion), left, botTop + 18, {
        align: 'center',
        width: bX1 - left,
        lineBreak: false,
      });
    }

    if (datos.medico_interpreta) {
      this.dibujarTextoAjustado(doc, datos.medico_interpreta, bX1 + 6, botSubY - 13, bX2 - bX1 - 12, 11, {
        maxFontSize: 7.2,
        minFontSize: 5.5,
        font: semiF,
        align: 'center',
      });
    }
    doc.font(regF).fontSize(6.8).fillColor('#000000').text('Personal Médico que Interpreta', bX1, botSubY + 2.5, {
      align: 'center',
      width: bX2 - bX1,
      lineBreak: false,
    });

    doc.font(regF).fontSize(6.8).fillColor('#000000').text('Observaciones', bX2, botTop + 2.5, {
      width: right - bX2,
      align: 'center',
      lineBreak: false,
    });
    if (datos.observaciones_interpretacion) {
      this.dibujarTextoAjustado(doc, datos.observaciones_interpretacion, bX2 + 4, botTop + 12, right - bX2 - 8, botH - 14, {
        maxFontSize: 6.8,
        minFontSize: 5.0,
        font: regF,
        lineGap: 1.0,
      });
    }

    doc.font(boldF).fontSize(7.8).fillColor('#000000').text('208C0101100000L-394-25', left, 748, {
      align: 'right',
      width: totalW,
      lineBreak: false,
    });

    doc.end();
  }

  // ============================================================
  // 13. SOLICITUD-RECEPCIÓN DE INTERCONSULTA MÉDICA (Formato 208C0101100000L-024-25)
  // ============================================================
  public static generarInterconsulta(res: Response, datos: any, paciente: any) {
    const doc = this.crearDoc(res, `Interconsulta_${paciente.expediente_clinico}`, {
      size: [612, 396],
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    const left = 24;
    const totalW = 564;
    const right = left + totalW;

    const boldF = this.fontBold(doc);
    const regF = this.fontReg(doc);
    const semiF = this.fontSemi(doc);

    const hLine = (yPos: number, lw = 0.7, x1 = left, x2 = right) => {
      doc.lineWidth(lw).moveTo(x1, yPos).lineTo(x2, yPos).stroke('#000000');
    };
    const vLine = (xPos: number, y1: number, y2: number, lw = 0.7) => {
      doc.lineWidth(lw).moveTo(xPos, y1).lineTo(xPos, y2).stroke('#000000');
    };

    // 1. Logos institucionales superiores
    LogoConfigService.dibujarEncabezado(doc, '', { startX: left, bannerWidth: totalW, soloLogos: true });

    // 2. Franja de título abierta a los lados
    hLine(60, 0.8);
    doc.font(boldF).fontSize(10.5).fillColor('#000000').text('SOLICITUD-RECEPCIÓN DE INTERCONSULTA MÉDICA', left, 64.5, {
      width: totalW,
      align: 'center',
      lineBreak: false,
    });
    hLine(78.5, 0.8);
    hLine(81, 0.7);

    const drawOpenCell = (x: number, y: number, w: number, h: number, label: string, val: any, labelFs = 7.2) => {
      if (label) {
        doc.font(regF).fontSize(labelFs).fillColor('#000000').text(label, x + 4, y + 3, {
          width: w - 8,
          lineBreak: false,
        });
      }
      const strVal = val !== undefined && val !== null ? String(val) : '';
      if (strVal) {
        this.dibujarTextoAjustado(doc, strVal, x + 4, y + 13, w - 8, h - 14.5, {
          maxFontSize: 8.2,
          minFontSize: 6.0,
          font: semiF,
          align: 'left',
        });
      }
    };

    const nombreComp = `${paciente.apellido_paterno || ''} ${paciente.apellido_materno || ''} ${paciente.nombre || ''}`.replace(/\s+/g, ' ').trim();

    const cX1 = left + 380;
    const cX2 = left + 492;

    // Fila 1: Unidad Médica | Fecha de Solicitud | Hora (y = 81..107)
    drawOpenCell(left, 81, 380, 26, 'Unidad Médica', datos.unidad_medica || 'Hospital General San Felipe del Progreso');
    vLine(cX1, 81, 133);
    drawOpenCell(cX1, 81, 112, 26, 'Fecha de Solicitud', datos.fecha_solicitud ? this.formatFecha(datos.fecha_solicitud) : this.formatFecha(new Date()));
    vLine(cX2, 81, 133);
    drawOpenCell(cX2, 81, right - cX2, 26, 'Hora', datos.hora_solicitud ? String(datos.hora_solicitud).substring(0, 5) : '11:00');
    hLine(107, 0.7);

    // Fila 2: Nombre de la o del Paciente | Expediente | Cama (y = 107..133)
    drawOpenCell(left, 107, 380, 26, 'Nombre de la o del Paciente', nombreComp);
    drawOpenCell(cX1, 107, 112, 26, 'Expediente', paciente.expediente_clinico);
    drawOpenCell(cX2, 107, right - cX2, 26, 'Cama', datos.cama || 'N/A');
    hLine(133, 0.7);

    // Fila 3: Servicio que Solicita la Interconsulta | Nombre del Personal Médico Solicitante (y = 133..159)
    const midX = left + 282;
    drawOpenCell(left, 133, 282, 26, 'Servicio que Solicita la Interconsulta', datos.servicio_solicitante || 'Hospitalización');
    vLine(midX, 133, 159);
    drawOpenCell(midX, 133, right - midX, 26, 'Nombre del Personal Médico Solicitante', datos.medico_solicitante_nombre || datos.medico_solicitante || 'Personal Médico');
    hLine(159, 0.7);

    // Fila 4: Motivo de la Interconsulta (espacio abierto sin renglones grises ni bordes laterales, y = 159..216)
    doc.font(regF).fontSize(7.2).fillColor('#000000').text('Motivo de la Interconsulta', left + 4, 162.5, { lineBreak: false });
    const motivoTxt = datos.motivo_interconsulta || datos.motivo || 'Valoración integral y ajuste diagnóstico.';
    this.dibujarTextoAjustado(doc, motivoTxt, left + 4, 174, totalW - 8, 39, {
      maxFontSize: 8.0,
      minFontSize: 6.0,
      font: regF,
      lineGap: 2.5,
    });
    hLine(216, 0.7);

    // Fila 5: Servicio al que se le Solicita la Interconsulta | Nombre del Personal Médico que Recibe la Solicitud (y = 216..242)
    drawOpenCell(left, 216, 282, 26, 'Servicio al que se le Solicita la Interconsulta', datos.servicio_solicitado || datos.especialidad_solicitada || 'Medicina Interna');
    vLine(midX, 216, 242);
    drawOpenCell(midX, 216, right - midX, 26, 'Nombre del Personal Médico que Recibe la Solicitud', datos.medico_receptor_nombre || datos.medico_receptor || 'Personal Médico');
    hLine(242, 0.7);

    // Fila 6 (derecha): Fecha de Recibido | Hora (abierta a la izquierda y derecha, solo con líneas horizontales superior e inferior y divisor vertical entre Fecha y Hora, y = 251..277)
    hLine(251, 0.7, cX1, right);
    drawOpenCell(cX1, 251, 112, 26, 'Fecha de Recibido', datos.fecha_recibido ? this.formatFecha(datos.fecha_recibido) : (datos.fecha_respuesta ? this.formatFecha(datos.fecha_respuesta) : ''));
    vLine(cX2, 251, 277);
    drawOpenCell(cX2, 251, right - cX2, 26, 'Hora', datos.hora_recibido ? String(datos.hora_recibido).substring(0, 5) : '');
    hLine(277, 0.7, cX1, right);

    // Bloque de firmas inferior: Solicitó (izquierda) y Recibió (derecha)
    const sigW = 190;
    const sigLeft1 = left + 26;
    const sigLeft2 = right - sigW - 26;
    const sigY = 342;

    doc.font(boldF).fontSize(8.2).fillColor('#000000').text('Solicitó', sigLeft1, 286, { align: 'center', width: sigW, lineBreak: false });
    if (datos.medico_solicitante_nombre || datos.medico_solicitante) {
      this.dibujarTextoAjustado(doc, datos.medico_solicitante_nombre || datos.medico_solicitante, sigLeft1, sigY - 13, sigW, 11, {
        maxFontSize: 7.5,
        minFontSize: 5.8,
        font: semiF,
        align: 'center',
      });
    }
    hLine(sigY, 0.7, sigLeft1, sigLeft1 + sigW);
    doc.font(regF).fontSize(7.2).fillColor('#000000').text('(Nombre y Firma del\nPersonal Médico)', sigLeft1, sigY + 3, {
      align: 'center',
      width: sigW,
      lineGap: 0.5,
    });

    doc.font(boldF).fontSize(8.2).fillColor('#000000').text('Recibió', sigLeft2, 286, { align: 'center', width: sigW, lineBreak: false });
    if (datos.medico_receptor_nombre || datos.medico_receptor) {
      this.dibujarTextoAjustado(doc, datos.medico_receptor_nombre || datos.medico_receptor, sigLeft2, sigY - 13, sigW, 11, {
        maxFontSize: 7.5,
        minFontSize: 5.8,
        font: semiF,
        align: 'center',
      });
    }
    hLine(sigY, 0.7, sigLeft2, sigLeft2 + sigW);
    doc.font(regF).fontSize(7.2).fillColor('#000000').text('(Nombre y Firma del\nPersonal Médico)', sigLeft2, sigY + 3, {
      align: 'center',
      width: sigW,
      lineGap: 0.5,
    });

    doc.font(boldF).fontSize(8.2).fillColor('#000000').text('208C0101100000L-024-25', left, 374, {
      align: 'right',
      width: totalW,
      lineBreak: false,
    });

    doc.end();
  }

  // ============================================================
  // 14. HOJA DE HOSPITALIZACIÓN (SINBA-SEUL-14-P DGIS)
  // ============================================================
  public static generarSINBA14(res: Response, datos: any, paciente: any): Promise<void> {
    return OfficialPdfService.generarSINBA14(res, datos, paciente);
  }

  // ============================================================
  // 15. HOJA DIARIA DEL SERVICIO DE URGENCIAS (SINBA-SEUL-16-P DGIS)
  // ============================================================
  public static generarSINBA16(res: Response, datos: any, paciente: any): Promise<void> {
    return OfficialPdfService.generarSINBA16(res, datos, paciente);
  }
}
