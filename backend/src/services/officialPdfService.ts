import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';
import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import { LogoConfigService } from './logoConfig';
import { PDFGeneratorService } from './pdfGenerator';

export class OfficialPdfService {
  private static getTemplatePath(filename: string): string | null {
        const candidates = [
            path.resolve(__dirname, '../assets/templates', filename),
            path.resolve(__dirname, '../../src/assets/templates', filename),
            path.resolve(process.cwd(), 'backend/src/assets/templates', filename),
            path.resolve(process.cwd(), 'backend/dist/assets/templates', filename),
            path.resolve(process.cwd(), 'src/assets/templates', filename),
            path.resolve(process.cwd(), 'dist/assets/templates', filename),
        ];
        for (const c of candidates) {
            if (fs.existsSync(c))
                return c;
        }
        return null;
    }
    private static formatFecha(val: any): string {
        if (!val)
            return '--';
        if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
            const parts = val.substring(0, 10).split('-');
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        try {
            const d = new Date(val);
            if (isNaN(d.getTime()))
                return String(val).substring(0, 10);
            const day = String(d.getUTCDate()).padStart(2, '0');
            const month = String(d.getUTCMonth() + 1).padStart(2, '0');
            const year = d.getUTCFullYear();
            return `${day}/${month}/${year}`;
        }
        catch {
            return String(val);
        }
    }
    private static async dibujarHeaderLogos(pdfDoc: PDFDocument, page: PDFPage, topY = 12, maxH = 46) {
        const { width, height } = page.getSize();
        const config = LogoConfigService.getConfig();
        const yPos = height - topY - maxH;
        try {
            if (config.tipo_encabezado === 'banner') {
                const bannerBuf = LogoConfigService.getActiveBuffer('banner');
                if (bannerBuf) {
                    const img = await pdfDoc.embedPng(bannerBuf).catch(() => null);
                    if (img) {
                        page.drawImage(img, { x: 30, y: yPos, width: width - 60, height: maxH });
                        return;
                    }
                }
            }
            const izqBuf = LogoConfigService.getActiveBuffer('izquierdo');
            if (izqBuf) {
                const imgIzq = await pdfDoc.embedPng(izqBuf).catch(() => null);
                if (imgIzq) {
                    page.drawImage(imgIzq, { x: 26, y: yPos, width: 120, height: maxH });
                }
            }
            const derBuf = LogoConfigService.getActiveBuffer('derecho');
            if (derBuf) {
                const imgDer = await pdfDoc.embedPng(derBuf).catch(() => null);
                if (imgDer) {
                    page.drawImage(imgDer, { x: width - 165, y: yPos, width: 138, height: maxH });
                }
            }
        }
        catch (e) {
            console.error('Error dibujando logos en plantilla oficial:', e);
        }
    }
    private static drawText(page: PDFPage, text: any, x: number, topY: number, font: PDFFont, size = 8, maxWidth?: number) {
        if (text === undefined || text === null || text === '')
            return;
        const { height } = page.getSize();
        const str = String(text);
        page.drawText(str, {
            x,
            y: height - topY,
            size,
            font,
            color: rgb(0, 0, 0),
            maxWidth,
        });
    }
    private static sendDoc(res: Response, filename: string, bytes: Uint8Array) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${filename}.pdf"`);
        res.send(Buffer.from(bytes));
    }
    public static async generarHojaFrontal(res: Response, datos: any, paciente: any) {
        const tPath = this.getTemplatePath('hoja_frontal.template.pdf');
        if (!tPath)
            return PDFGeneratorService.generarHojaFrontal(res, datos, paciente);
        const doc = await PDFDocument.load(fs.readFileSync(tPath));
        const page = doc.getPage(0);
        const font = await doc.embedFont(StandardFonts.Helvetica);
        const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
        await this.dibujarHeaderLogos(doc, page, 14, 44);
        const nombreComp = `${paciente.apellido_paterno || ''} ${paciente.apellido_materno || ''} ${paciente.nombre || ''}`.replace(/\s+/g, ' ').trim();
        const esFem = String(paciente.sexo).toUpperCase().startsWith('F') || String(paciente.sexo).toUpperCase().startsWith('M');
        const esMasc = String(paciente.sexo).toUpperCase().startsWith('H') || String(paciente.sexo).toUpperCase().startsWith('MASC');
        this.drawText(page, datos.unidad_medica || 'Hospital General San Felipe del Progreso', 24, 107, fontBold, 8);
        this.drawText(page, paciente.expediente_clinico, 397, 107, fontBold, 8.5);
        this.drawText(page, this.formatFecha(datos.fecha || new Date()), 493, 107, font, 8.5);
        this.drawText(page, nombreComp, 24, 131, fontBold, 8.5);
        this.drawText(page, this.formatFecha(paciente.fecha_nacimiento), 278, 131, font, 8);
        this.drawText(page, `${paciente.edad || '--'} años`, 397, 131, font, 8);
        if (esFem)
            this.drawText(page, 'X', 463, 137, fontBold, 7.5);
        if (esMasc)
            this.drawText(page, 'X', 522, 137, fontBold, 7.5);
        const dir = paciente.domicilio || `${paciente.domicilio_municipio || ''}, ${paciente.domicilio_entidad || ''}`.trim() || 'San Felipe del Progreso';
        this.drawText(page, dir, 24, 156, font, 8, 360);
        this.drawText(page, paciente.telefono || 'Sin teléfono', 397, 156, font, 8);
        this.drawText(page, datos.personal_medico_tratante || paciente.medico_tratante || 'Dr(a). en turno', 24, 181, fontBold, 8);
        this.drawText(page, datos.cedula_profesional || 'En trámite', 397, 181, font, 8);
        const diags = Array.isArray(datos.diagnosticos_json) ? datos.diagnosticos_json : (datos.diagnostico ? [{ diagnostico: datos.diagnostico, fecha_atencion: this.formatFecha(new Date()) }] : []);
        let yRow = 218;
        for (let r = 0; r < Math.min(19, diags.length); r++) {
            const it = diags[r];
            if (it) {
                this.drawText(page, this.formatFecha(it.fecha_atencion || datos.fecha || new Date()), 24, yRow, font, 7.5);
                this.drawText(page, it.diagnostico || '', 120, yRow, fontBold, 8, 330);
                this.drawText(page, this.formatFecha(it.fecha_control || ''), 470, yRow, font, 7.5);
            }
            yRow += 24.5;
        }
        this.drawText(page, paciente.grupo_sanguineo || 'O', 24, 701, fontBold, 8.5);
        this.drawText(page, paciente.factor_rh || 'POSITIVO (+)', 320, 701, fontBold, 8.5);
        this.drawText(page, paciente.alergias || 'NEGADAS', 24, 725, fontBold, 8.5);
        const bytes = await doc.save();
        this.sendDoc(res, `Hoja_Frontal_${paciente.expediente_clinico}`, bytes);
    }
    public static async generarAvisoPrivacidad(res: Response, datos: any, paciente: any) {
        const tPath = this.getTemplatePath('aviso_privacidad.template.pdf');
        if (!tPath)
            return PDFGeneratorService.generarAvisoPrivacidad(res, datos, paciente);
        const doc = await PDFDocument.load(fs.readFileSync(tPath));
        const page = doc.getPage(0);
        const font = await doc.embedFont(StandardFonts.Helvetica);
        const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
        await this.dibujarHeaderLogos(doc, page, 14, 44);
        if (datos.autoriza_transferencia !== false) {
            this.drawText(page, 'X', 68, 396, fontBold, 9);
        }
        else {
            this.drawText(page, 'X', 345, 396, fontBold, 9);
        }
        this.drawText(page, datos.unidad_medica || LogoConfigService.getUnidadMedica(), 26, 485, fontBold, 8);
        this.drawText(page, datos.municipio || 'San Felipe del Progreso', 26, 516, font, 8);
        const fechaVal = datos.fecha ? new Date(datos.fecha) : new Date();
        const dia = String(fechaVal.getDate());
        const mes = fechaVal.toLocaleDateString('es-MX', { month: 'long' });
        const anio = String(fechaVal.getFullYear()).slice(-2);
        this.drawText(page, dia, 150, 545, fontBold, 8);
        this.drawText(page, mes, 240, 545, fontBold, 8);
        this.drawText(page, anio, 385, 545, fontBold, 8);
        const nomFirma = datos.firma_nombre || `${paciente.nombre || ''} ${paciente.apellido_paterno || ''} ${paciente.apellido_materno || ''}`.trim();
        this.drawText(page, nomFirma, 200, 630, fontBold, 8.5);
        const bytes = await doc.save();
        this.sendDoc(res, `Aviso_Privacidad_${paciente.expediente_clinico}`, bytes);
    }
    public static async generarConsentimiento(res: Response, datos: any, paciente: any) {
        const tPath = this.getTemplatePath('consentimiento.template.pdf');
        if (!tPath)
            return PDFGeneratorService.generarConsentimiento(res, datos, paciente);
        const doc = await PDFDocument.load(fs.readFileSync(tPath));
        const page = doc.getPage(0);
        const font = await doc.embedFont(StandardFonts.Helvetica);
        const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
        await this.dibujarHeaderLogos(doc, page, 14, 44);
        const nombreComp = `${paciente.apellido_paterno || ''} ${paciente.apellido_materno || ''} ${paciente.nombre || ''}`.replace(/\s+/g, ' ').trim();
        const esFem = String(paciente.sexo).toUpperCase().startsWith('F') || String(paciente.sexo).toUpperCase().startsWith('M');
        const esMasc = String(paciente.sexo).toUpperCase().startsWith('H') || String(paciente.sexo).toUpperCase().startsWith('MASC');
        this.drawText(page, datos.unidad_medica || 'Hospital General San Felipe del Progreso', 24, 105, fontBold, 8);
        this.drawText(page, datos.lugar || 'San Felipe del Progreso', 290, 105, font, 8);
        this.drawText(page, this.formatFecha(datos.fecha || new Date()), 400, 105, font, 8);
        this.drawText(page, datos.hora || '12:00', 508, 105, font, 8);
        this.drawText(page, nombreComp, 24, 131, fontBold, 8.5);
        this.drawText(page, this.formatFecha(paciente.fecha_nacimiento), 290, 131, font, 8);
        this.drawText(page, paciente.expediente_clinico, 400, 131, fontBold, 8.5);
        this.drawText(page, `${paciente.edad || '--'} años`, 24, 154, font, 8);
        if (esFem)
            this.drawText(page, 'X', 95, 155, fontBold, 7.5);
        if (esMasc)
            this.drawText(page, 'X', 158, 155, fontBold, 7.5);
        this.drawText(page, paciente.ocupacion || datos.ocupacion || 'Hogar / Campo', 210, 154, font, 8);
        this.drawText(page, paciente.estado_civil || 'Casada(o)', 400, 154, font, 8);
        const dom = paciente.domicilio || `${paciente.domicilio_municipio || ''}, ${paciente.domicilio_entidad || ''}`.trim() || 'San Felipe del Progreso';
        this.drawText(page, dom, 24, 177, font, 8, 540);
        this.drawText(page, datos.servicio || 'Cirugía General', 225, 200, fontBold, 8);
        this.drawText(page, datos.diagnosticos_clinicos || datos.diagnostico || 'Según expediente clínico', 140, 262, font, 7.5, 430);
        this.drawText(page, datos.estudios_previos || 'Biometría Hemática, Química Sanguínea, Tiempos de coagulación', 260, 313, font, 7.5, 310);
        this.drawText(page, datos.actos_anestesicos || 'Anestesia general balanceada / Bloqueo neuroaxial', 115, 364, font, 7.5, 450);
        this.drawText(page, datos.tratamiento_medico || 'Soluciones parenterales, analgesia y antibioticoterapia', 125, 414, font, 7.5, 440);
        this.drawText(page, datos.tratamiento_quirurgico || datos.procedimiento || 'Procedimiento programado según valoración', 145, 464, font, 7.5, 420);
        this.drawText(page, datos.riesgos_complicaciones || 'Infección, sangrado, dolor postoperatorio, reacción a medicamentos', 155, 514, font, 7.5, 410);
        this.drawText(page, datos.personal_medico_nombre || paciente.medico_tratante || 'Médico Tratante', 100, 700, fontBold, 7.5);
        this.drawText(page, datos.familiar_nombre || nombreComp, 380, 700, fontBold, 7.5);
        this.drawText(page, datos.testigo1_nombre || 'Testigo 1', 130, 750, font, 7.5);
        this.drawText(page, datos.testigo2_nombre || 'Testigo 2', 410, 750, font, 7.5);
        const bytes = await doc.save();
        this.sendDoc(res, `Consentimiento_Informado_${paciente.expediente_clinico}`, bytes);
    }
    public static async generarNotaEgreso(res: Response, datos: any, paciente: any) {
        return PDFGeneratorService.generarNotaEgreso(res, datos, paciente);
    }
    public static async generarLaboratorio(res: Response, datos: any, paciente: any) {
        const tPath = this.getTemplatePath('laboratorio.template.pdf');
        if (!tPath)
            return PDFGeneratorService.generarLaboratorio(res, datos, paciente);
        const doc = await PDFDocument.load(fs.readFileSync(tPath));
        const page = doc.getPage(0);
        const font = await doc.embedFont(StandardFonts.Helvetica);
        const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
        await this.dibujarHeaderLogos(doc, page, 14, 44);
        const nombreComp = `${paciente.apellido_paterno || ''} ${paciente.apellido_materno || ''} ${paciente.nombre || ''}`.replace(/\s+/g, ' ').trim();
        const esFem = String(paciente.sexo).toUpperCase().startsWith('F') || String(paciente.sexo).toUpperCase().startsWith('M');
        const esMasc = String(paciente.sexo).toUpperCase().startsWith('H') || String(paciente.sexo).toUpperCase().startsWith('MASC');
        this.drawText(page, datos.unidad_medica || 'Hospital General San Felipe del Progreso', 36, 102, fontBold, 8);
        this.drawText(page, this.formatFecha(datos.fecha || new Date()), 480, 102, fontBold, 8.5);
        this.drawText(page, nombreComp, 36, 126, fontBold, 8.5);
        this.drawText(page, `${paciente.edad || '--'} años`, 410, 126, font, 8);
        if (esFem)
            this.drawText(page, 'X', 485, 126, fontBold, 8);
        if (esMasc)
            this.drawText(page, 'X', 530, 126, fontBold, 8);
        this.drawText(page, paciente.curp || 'NO ASIGNADA', 36, 150, font, 8);
        this.drawText(page, this.formatFecha(paciente.fecha_nacimiento), 204, 150, font, 8);
        this.drawText(page, datos.cama || 'CAMA-12', 354, 150, font, 8);
        this.drawText(page, paciente.expediente_clinico, 480, 150, fontBold, 8.5);
        this.drawText(page, 'X', 120, 172, fontBold, 8); // Hosp
        this.drawText(page, datos.especialidad_medica || 'Medicina General', 480, 172, font, 8);
        this.drawText(page, datos.medico_solicitante || paciente.medico_tratante || 'Dr(a). Solicitante', 36, 198, fontBold, 8);
        this.drawText(page, datos.medico_cedula || '--', 480, 198, font, 8);
        this.drawText(page, datos.diagnostico || 'En estudio', 36, 222, font, 7.5, 170);
        this.drawText(page, datos.medicamentos_observaciones || 'Sin observaciones', 230, 222, font, 7.5, 330);
        this.drawText(page, datos.medico_solicitante || 'Personal Médico Solicitante', 70, 750, fontBold, 7.5);
        const bytes = await doc.save();
        this.sendDoc(res, `Solicitud_Laboratorio_${paciente.expediente_clinico}`, bytes);
    }
    public static async generarGabinete(res: Response, datos: any, paciente: any) {
        const tPath = this.getTemplatePath('gabinete.template.pdf');
        if (!tPath)
            return PDFGeneratorService.generarGabinete(res, datos, paciente);
        const doc = await PDFDocument.load(fs.readFileSync(tPath));
        const page = doc.getPage(0);
        const font = await doc.embedFont(StandardFonts.Helvetica);
        const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
        await this.dibujarHeaderLogos(doc, page, 14, 44);
        const nombreComp = `${paciente.apellido_paterno || ''} ${paciente.apellido_materno || ''} ${paciente.nombre || ''}`.replace(/\s+/g, ' ').trim();
        const esFem = String(paciente.sexo).toUpperCase().startsWith('F') || String(paciente.sexo).toUpperCase().startsWith('M');
        const esMasc = String(paciente.sexo).toUpperCase().startsWith('H') || String(paciente.sexo).toUpperCase().startsWith('MASC');
        this.drawText(page, datos.unidad_medica || 'Hospital General San Felipe del Progreso', 24, 105, fontBold, 8);
        this.drawText(page, this.formatFecha(datos.fecha || new Date()), 292, 105, font, 8);
        this.drawText(page, datos.hora || '11:00', 385, 105, font, 8);
        this.drawText(page, paciente.expediente_clinico, 455, 105, fontBold, 8.5);
        this.drawText(page, 'X', 205, 126, fontBold, 7.5); // Hospitalizacion
        this.drawText(page, datos.servicio || 'General', 292, 126, font, 8);
        this.drawText(page, datos.cama || 'N/A', 385, 126, font, 8);
        this.drawText(page, 'X', 465, 126, fontBold, 7.5); // 1a vez
        this.drawText(page, nombreComp, 24, 150, fontBold, 8.5);
        this.drawText(page, this.formatFecha(paciente.fecha_nacimiento), 205, 150, font, 8);
        this.drawText(page, `${paciente.edad || '--'} años`, 385, 150, font, 8);
        if (esFem)
            this.drawText(page, 'X', 470, 150, fontBold, 7.5);
        if (esMasc)
            this.drawText(page, 'X', 525, 150, fontBold, 7.5);
        this.drawText(page, datos.datos_clinicos || 'Sin antecedentes de relevancia para el estudio.', 24, 180, font, 7.5, 540);
        this.drawText(page, datos.diagnostico || 'En estudio diagnóstico.', 24, 245, font, 7.5, 540);
        this.drawText(page, datos.estudios_solicitados || 'Radiografía / Ultrasonido solicitado.', 24, 310, font, 7.5, 540);
        this.drawText(page, this.formatFecha(datos.fecha_proxima_consulta || ''), 35, 385, font, 8);
        this.drawText(page, datos.medico_solicitante || 'Dr(a). Solicitante', 160, 385, fontBold, 7.5);
        this.drawText(page, 'Vo. Bo. Trabajo Social / Derechos', 300, 385, font, 7.5);
        this.drawText(page, datos.observaciones || 'Urgente', 480, 385, font, 7.5);
        this.drawText(page, datos.interpretacion || 'PENDIENTE DE INTERPRETACIÓN POR IMAGENÓLOGO.', 24, 510, font, 7.5, 540);
        this.drawText(page, this.formatFecha(datos.fecha_interpretacion || new Date()), 55, 725, font, 7.5);
        this.drawText(page, datos.medico_interpreta || 'Personal Médico Radiólogo', 225, 755, fontBold, 7.5);
        const bytes = await doc.save();
        this.sendDoc(res, `Solicitud_Gabinete_${paciente.expediente_clinico}`, bytes);
    }
    public static async generarInterconsulta(res: Response, datos: any, paciente: any) {
        const tPath = this.getTemplatePath('interconsulta.template.pdf');
        if (!tPath)
            return PDFGeneratorService.generarInterconsulta(res, datos, paciente);
        const doc = await PDFDocument.load(fs.readFileSync(tPath));
        const page = doc.getPage(0);
        const font = await doc.embedFont(StandardFonts.Helvetica);
        const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
        await this.dibujarHeaderLogos(doc, page, 8, 38);
        const nombreComp = `${paciente.apellido_paterno || ''} ${paciente.apellido_materno || ''} ${paciente.nombre || ''}`.replace(/\s+/g, ' ').trim();
        this.drawText(page, datos.unidad_medica || 'Hospital General San Felipe del Progreso', 26, 102, fontBold, 8);
        this.drawText(page, this.formatFecha(datos.fecha_solicitud || new Date()), 410, 102, font, 8);
        this.drawText(page, datos.hora_solicitud || '11:00', 525, 102, font, 8);
        this.drawText(page, nombreComp, 26, 126, fontBold, 8.5);
        this.drawText(page, paciente.expediente_clinico, 415, 126, fontBold, 8.5);
        this.drawText(page, datos.cama || 'N/A', 525, 126, font, 8);
        this.drawText(page, datos.servicio_solicitante || 'Medicina Interna', 26, 150, font, 8);
        this.drawText(page, datos.medico_solicitante || 'Dr(a). Solicitante', 315, 150, fontBold, 8);
        this.drawText(page, datos.motivo_interconsulta || 'Se solicita valoración diagnóstica y terapéutica integral.', 26, 178, font, 7.5, 540);
        this.drawText(page, datos.servicio_solicitado || 'Cirugía General', 26, 232, font, 8);
        this.drawText(page, datos.medico_receptor || 'Dr(a). Receptor', 315, 232, fontBold, 8);
        this.drawText(page, this.formatFecha(datos.fecha_recibido || new Date()), 410, 266, font, 8);
        this.drawText(page, datos.hora_recibido || '12:00', 525, 266, font, 8);
        this.drawText(page, datos.medico_solicitante || 'Dr(a). Solicitante', 110, 300, fontBold, 7.5);
        this.drawText(page, datos.medico_receptor || 'Dr(a). Receptor', 440, 300, fontBold, 7.5);
        const bytes = await doc.save();
        this.sendDoc(res, `Interconsulta_${paciente.expediente_clinico}`, bytes);
    }
    public static async generarHCGeneral(res: Response, datos: any, paciente: any) {
        const tPath = this.getTemplatePath('hc_general.template.pdf');
        if (!tPath)
            return PDFGeneratorService.generarHCGeneral(res, datos, paciente);
        const doc = await PDFDocument.load(fs.readFileSync(tPath));
        const font = await doc.embedFont(StandardFonts.Helvetica);
        const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
        const p1 = doc.getPage(0);
        await this.dibujarHeaderLogos(doc, p1, 14, 44);
        const nombreComp = `${paciente.apellido_paterno || ''} ${paciente.apellido_materno || ''} ${paciente.nombre || ''}`.replace(/\s+/g, ' ').trim();
        const esFem = String(paciente.sexo).toUpperCase().startsWith('F') || String(paciente.sexo).toUpperCase().startsWith('M');
        const esMasc = String(paciente.sexo).toUpperCase().startsWith('H') || String(paciente.sexo).toUpperCase().startsWith('MASC');
        this.drawText(p1, datos.unidad_medica || 'Hospital General San Felipe del Progreso', 24, 105, fontBold, 8);
        this.drawText(p1, paciente.expediente_clinico, 450, 105, fontBold, 8.5);
        this.drawText(p1, this.formatFecha(datos.fecha_elaboracion || new Date()), 24, 131, font, 8);
        this.drawText(p1, datos.hora_elaboracion || '10:00', 255, 131, font, 8);
        this.drawText(p1, 'X', 425, 131, fontBold, 7.5); // Directo
        this.drawText(p1, nombreComp, 24, 172, fontBold, 8.5);
        this.drawText(p1, `${paciente.edad || '--'} años`, 385, 172, font, 8);
        if (esFem)
            this.drawText(p1, 'X', 440, 172, fontBold, 7.5);
        if (esMasc)
            this.drawText(p1, 'X', 495, 172, fontBold, 7.5);
        this.drawText(p1, this.formatFecha(paciente.fecha_nacimiento), 24, 198, font, 8);
        this.drawText(p1, paciente.ocupacion || 'Hogar / Empleado', 175, 198, font, 8);
        this.drawText(p1, paciente.es_indigena ? (paciente.lengua_indigena || 'Mazahua') : 'No especificado', 385, 198, font, 8);
        const dom = paciente.domicilio || `${paciente.domicilio_municipio || ''}, ${paciente.domicilio_entidad || ''}`.trim() || 'San Felipe del Progreso';
        this.drawText(p1, dom, 24, 224, font, 8, 340);
        this.drawText(p1, paciente.telefono || 'Sin teléfono', 385, 224, font, 8);
        this.drawText(p1, datos.antecedentes_heredofamiliares || 'Negados / Sin alteraciones relevantes reportadas.', 24, 308, font, 7.5, 540);
        this.drawText(p1, datos.antecedentes_no_patologicos || 'Habitación con todos los servicios, higiene y alimentación adecuada.', 24, 352, font, 7.5, 540);
        this.drawText(p1, datos.antecedentes_patologicos || 'Quirúrgicos, traumáticos, alérgicos y transfusionales negados.', 24, 396, font, 7.5, 540);
        this.drawText(p1, `Gesta: ${paciente.gesta || 0}, Para: ${paciente.para || 0}, Cesárea: ${paciente.cesarea || 0}, Aborto: ${paciente.aborto || 0}, FUM: ${paciente.fecha_ultima_menstruacion || '--'}`, 24, 455, font, 7.5, 540);
        this.drawText(p1, datos.padecimiento_actual || 'Refiere sintomatología de inicio súbito, motivo por el cual acude a valoración.', 24, 514, font, 7.5, 540);
        if (doc.getPageCount() > 1) {
            const p2 = doc.getPage(1);
            await this.dibujarHeaderLogos(doc, p2, 14, 44);
            const sv = datos.presion_arterial || `${datos.presion_arterial_sistolica || '--'}/${datos.presion_arterial_diastolica || '--'}`;
            this.drawText(p2, sv, 36, 136, fontBold, 8);
            this.drawText(p2, `${datos.temperatura || '--'} °C`, 126, 136, font, 8);
            this.drawText(p2, `${datos.frecuencia_cardiaca || '--'} lpm`, 216, 136, font, 8);
            this.drawText(p2, `${datos.frecuencia_respiratoria || '--'} rpm`, 306, 136, font, 8);
            this.drawText(p2, `${datos.peso || '--'} kg`, 396, 136, font, 8);
            this.drawText(p2, `${datos.talla || '--'} cm`, 486, 136, font, 8);
            this.drawText(p2, datos.habitus_exterior || 'Paciente consciente, orientado, buena coloración de tegumentos.', 24, 190, font, 7.5, 540);
            this.drawText(p2, datos.resultados_laboratorio || 'En espera de resultados complementarios.', 24, 440, font, 7.5, 540);
            this.drawText(p2, datos.diagnostico || 'Diagnóstico en estudio.', 24, 485, fontBold, 8, 540);
            this.drawText(p2, datos.tx_actual || 'Plan hospitalario y manejo de soporte en curso.', 24, 545, font, 7.5, 540);
            this.drawText(p2, datos.pronostico || 'Reservado a evolución clínica.', 24, 665, font, 7.5, 540);
            this.drawText(p2, datos.medico_nombre || paciente.medico_tratante || 'Personal Médico Tratante', 250, 715, fontBold, 8);
        }
        const bytes = await doc.save();
        this.sendDoc(res, `Historia_Clinica_${paciente.expediente_clinico}`, bytes);
    }
    public static async generarHCPediatrica(res: Response, datos: any, paciente: any) {
        const tPath = this.getTemplatePath('hc_pediatrica.template.pdf');
        if (!tPath)
            return PDFGeneratorService.generarHCPediatrica(res, datos, paciente);
        const doc = await PDFDocument.load(fs.readFileSync(tPath));
        const font = await doc.embedFont(StandardFonts.Helvetica);
        const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
        const p1 = doc.getPage(0);
        await this.dibujarHeaderLogos(doc, p1, 10, 42);
        const nombreComp = `${paciente.apellido_paterno || ''} ${paciente.apellido_materno || ''} ${paciente.nombre || ''}`.replace(/\s+/g, ' ').trim();
        const esFem = String(paciente.sexo).toUpperCase().startsWith('F') || String(paciente.sexo).toUpperCase().startsWith('M');
        const esMasc = String(paciente.sexo).toUpperCase().startsWith('H') || String(paciente.sexo).toUpperCase().startsWith('MASC');
        this.drawText(p1, datos.unidad_medica || 'Hospital General San Felipe del Progreso', 36, 104, fontBold, 8);
        this.drawText(p1, paciente.expediente_clinico, 450, 104, fontBold, 8.5);
        this.drawText(p1, this.formatFecha(datos.fecha || new Date()), 36, 126, font, 8);
        this.drawText(p1, datos.hora || '10:00', 255, 126, font, 8);
        this.drawText(p1, 'X', 425, 126, fontBold, 7.5); // Indirecto
        this.drawText(p1, nombreComp, 36, 166, fontBold, 8.5);
        this.drawText(p1, `${paciente.edad || 0} años`, 385, 166, font, 8);
        if (esMasc)
            this.drawText(p1, 'X', 440, 166, fontBold, 7.5);
        if (esFem)
            this.drawText(p1, 'X', 495, 166, fontBold, 7.5);
        const dom = paciente.domicilio || `${paciente.domicilio_municipio || ''}, ${paciente.domicilio_entidad || ''}`.trim() || 'San Felipe del Progreso';
        this.drawText(p1, dom, 36, 190, font, 8, 340);
        this.drawText(p1, datos.ocupacion || 'Menor / Estudiante', 385, 190, font, 8);
        this.drawText(p1, paciente.tutor_nombre || 'Padre o Madre', 36, 214, font, 8);
        this.drawText(p1, paciente.tutor_parentesco || 'Madre', 385, 214, font, 8);
        this.drawText(p1, datos.antecedentes_heredofamiliares || 'Negados.', 36, 252, font, 7.5, 540);
        this.drawText(p1, datos.antecedentes_no_patologicos || 'Higiene y alimentación acorde a edad.', 36, 290, font, 7.5, 540);
        this.drawText(p1, datos.antecedentes_perinatales || 'Obtenido a término por vía vaginal, lloró y respiró al nacer.', 36, 328, font, 7.5, 540);
        this.drawText(p1, datos.alimentacion || 'Seno materno y ablactación adecuada.', 36, 380, font, 7.5, 540);
        this.drawText(p1, datos.inmunizaciones || 'Esquema de vacunación completo para edad.', 36, 420, font, 7.5, 540);
        this.drawText(p1, datos.desarrollo_psicomotor || 'Desarrollo adecuado acorde a grupo etario.', 36, 460, font, 7.5, 540);
        this.drawText(p1, datos.antecedentes_patologicos || 'Sin patologías crónicas previas.', 36, 500, font, 7.5, 540);
        this.drawText(p1, datos.padecimiento_actual || 'Cuadro clínico actual bajo manejo médico.', 36, 545, font, 7.5, 540);
        if (doc.getPageCount() > 1) {
            const p2 = doc.getPage(1);
            await this.dibujarHeaderLogos(doc, p2, 10, 42);
            this.drawText(p2, datos.presion_arterial || '--', 36, 136, fontBold, 8);
            this.drawText(p2, `${datos.temperatura || '--'} °C`, 126, 136, font, 8);
            this.drawText(p2, `${datos.frecuencia_cardiaca || '--'} lpm`, 216, 136, font, 8);
            this.drawText(p2, `${datos.frecuencia_respiratoria || '--'} rpm`, 306, 136, font, 8);
            this.drawText(p2, `${datos.peso || '--'} kg`, 396, 136, font, 8);
            this.drawText(p2, `${datos.talla || '--'} cm`, 486, 136, font, 8);
            this.drawText(p2, datos.habitus_exterior_neurologico || 'Paciente pediátrico reactivo, sin facies característica.', 36, 190, font, 7.5, 540);
            this.drawText(p2, datos.resultados_laboratorio || 'Sin alteraciones en paraclínicos.', 36, 425, font, 7.5, 540);
            this.drawText(p2, datos.diagnosticos || 'Control y vigilancia pediátrica.', 36, 470, fontBold, 8, 540);
            this.drawText(p2, datos.terapeutica_empleada || 'Manejo ambulatorio / hospitalario según indicación.', 36, 515, font, 7.5, 540);
            this.drawText(p2, datos.pronostico || 'Bueno para la vida y la función.', 36, 560, font, 7.5, 540);
            this.drawText(p2, datos.medico_nombre || 'PERSONAL MÉDICO PEDIATRA', 250, 715, fontBold, 8);
        }
        const bytes = await doc.save();
        this.sendDoc(res, `HC_Pediatrica_${paciente.expediente_clinico}`, bytes);
    }
    public static async generarConsultaUrgencias(res: Response, datos: any, paciente: any) {
        const tPath = this.getTemplatePath('consulta_urgencias.template.pdf');
        if (!tPath)
            return PDFGeneratorService.generarConsultaUrgencias(res, datos, paciente);
        const doc = await PDFDocument.load(fs.readFileSync(tPath));
        const font = await doc.embedFont(StandardFonts.Helvetica);
        const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
        const p1 = doc.getPage(0);
        await this.dibujarHeaderLogos(doc, p1, 14, 44);
        const nombreComp = `${paciente.apellido_paterno || ''} ${paciente.apellido_materno || ''} ${paciente.nombre || ''}`.replace(/\s+/g, ' ').trim();
        const esFem = String(paciente.sexo).toUpperCase().startsWith('F') || String(paciente.sexo).toUpperCase().startsWith('M');
        const esMasc = String(paciente.sexo).toUpperCase().startsWith('H') || String(paciente.sexo).toUpperCase().startsWith('MASC');
        this.drawText(p1, datos.folio || 'URG-001', 400, 102, fontBold, 8.5);
        this.drawText(p1, datos.unidad_medica || 'Hospital General San Felipe del Progreso', 24, 122, fontBold, 8);
        this.drawText(p1, paciente.expediente_clinico, 440, 122, fontBold, 8.5);
        this.drawText(p1, this.formatFecha(datos.fecha_registro || new Date()), 24, 148, font, 8);
        this.drawText(p1, datos.hora_registro || '12:00', 215, 148, font, 8);
        this.drawText(p1, datos.codigo_triage || 'Urgencia Calificada', 405, 148, fontBold, 8);
        this.drawText(p1, nombreComp, 24, 192, fontBold, 8.5);
        this.drawText(p1, paciente.estado_civil || 'Soltera(o)', 335, 192, font, 8);
        if (esMasc)
            this.drawText(p1, 'X', 445, 192, fontBold, 7.5);
        if (esFem)
            this.drawText(p1, 'X', 505, 192, fontBold, 7.5);
        this.drawText(p1, this.formatFecha(paciente.fecha_nacimiento), 24, 218, font, 8);
        this.drawText(p1, `${paciente.edad || '--'} años`, 205, 218, font, 8);
        this.drawText(p1, paciente.ocupacion || 'Hogar', 275, 218, font, 8);
        this.drawText(p1, paciente.domicilio_municipio || 'San Felipe del Progreso', 24, 242, font, 8);
        this.drawText(p1, 'X', 390, 242, fontBold, 7.5); // Urgencia si
        this.drawText(p1, paciente.contacto_emergencia_nombre || 'Familiar', 24, 268, font, 8);
        this.drawText(p1, paciente.contacto_emergencia_parentesco || 'Familiar', 350, 268, font, 8);
        const dom = paciente.domicilio || `${paciente.domicilio_municipio || ''}, ${paciente.domicilio_entidad || ''}`.trim() || 'San Felipe del Progreso';
        this.drawText(p1, dom, 24, 292, font, 8, 320);
        this.drawText(p1, paciente.telefono || 'Sin teléfono', 350, 292, font, 8);
        this.drawText(p1, this.formatFecha(new Date()), 24, 318, font, 8);
        this.drawText(p1, datos.ta || datos.presion_arterial || '120/80', 36, 360, fontBold, 8);
        this.drawText(p1, `${datos.temp || datos.temperatura || '36.5'} °C`, 126, 360, font, 8);
        this.drawText(p1, `${datos.fr || datos.frecuencia_respiratoria || '18'} rpm`, 216, 360, font, 8);
        this.drawText(p1, `${datos.fc || datos.frecuencia_cardiaca || '75'} lpm`, 306, 360, font, 8);
        this.drawText(p1, `${datos.peso || '--'} kg`, 396, 360, font, 8);
        this.drawText(p1, `${datos.talla || '--'} cm`, 486, 360, font, 8);
        this.drawText(p1, datos.motivo_consulta || 'Dolor abdominal agudo / malestar general.', 24, 400, font, 7.5, 540);
        this.drawText(p1, datos.antecedentes || paciente.antecedentes_patologicos || 'Sin antecedentes quirúrgicos ni alérgicos.', 24, 480, font, 7.5, 540);
        this.drawText(p1, datos.padecimiento_actual || 'Inicia padecimiento horas previas a ingreso hospitalario.', 24, 560, font, 7.5, 540);
        if (doc.getPageCount() > 1) {
            const p2 = doc.getPage(1);
            this.drawText(p2, datos.exploracion_fisica || 'Paciente orientado, cardiopulmonar sin compromiso, abdomen con dolor a la palpación.', 24, 70, font, 7.5, 540);
            this.drawText(p2, datos.diagnosticos_presuncionales || datos.diagnostico || 'Dolor abdominal en estudio.', 24, 210, fontBold, 8, 540);
            this.drawText(p2, datos.analisis_pronostico || 'Pronóstico reservado a evolución.', 24, 310, font, 7.5, 540);
            this.drawText(p2, datos.tratamiento_plan || 'Ayuno, hidratación parenteral, analgésico y vigilancia estrecha.', 24, 410, font, 7.5, 540);
            this.drawText(p2, datos.observaciones_estudios || 'En observación de urgencias.', 24, 520, font, 7.5, 540);
            this.drawText(p2, datos.familiar_nombre || paciente.contacto_emergencia_nombre || nombreComp, 60, 715, fontBold, 7.5);
            this.drawText(p2, datos.medico_nombre || 'Personal Médico de Urgencias', 350, 715, fontBold, 7.5);
        }
        const bytes = await doc.save();
        this.sendDoc(res, `Consulta_Urgencias_${paciente.expediente_clinico}`, bytes);
    }
    public static async generarIndicaciones(res: Response, datos: any, paciente: any) {
        const tPath = this.getTemplatePath('indicaciones.template.pdf');
        if (!tPath)
            return PDFGeneratorService.generarIndicaciones(res, datos, paciente);
        const doc = await PDFDocument.load(fs.readFileSync(tPath));
        const page = doc.getPage(0);
        const font = await doc.embedFont(StandardFonts.Helvetica);
        const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
        await this.dibujarHeaderLogos(doc, page, 14, 50);
        const nombreComp = `${paciente.apellido_paterno || ''} ${paciente.apellido_materno || ''} ${paciente.nombre || ''}`.replace(/\s+/g, ' ').trim();
        const esFem = String(paciente.sexo).toUpperCase().startsWith('F') || String(paciente.sexo).toUpperCase().startsWith('M');
        const esMasc = String(paciente.sexo).toUpperCase().startsWith('H') || String(paciente.sexo).toUpperCase().startsWith('MASC');
        this.drawText(page, datos.unidad_medica || 'Hospital General San Felipe del Progreso', 36, 126, fontBold, 8);
        this.drawText(page, paciente.expediente_clinico, 400, 126, fontBold, 8.5);
        this.drawText(page, nombreComp, 36, 150, fontBold, 8.5);
        this.drawText(page, `${paciente.edad || '--'}`, 370, 150, font, 8);
        if (esMasc)
            this.drawText(page, 'X', 470, 150, fontBold, 7.5);
        if (esFem)
            this.drawText(page, 'X', 520, 150, fontBold, 7.5);
        this.drawText(page, datos.servicio || 'Hospitalización', 36, 172, font, 8);
        this.drawText(page, this.formatFecha(datos.fecha || new Date()), 340, 172, font, 8);
        this.drawText(page, datos.hora || '10:00', 470, 172, font, 8);
        this.drawText(page, datos.presion_arterial || '120/80', 40, 202, fontBold, 7.5);
        this.drawText(page, datos.temperatura ? `${datos.temperatura} °C` : '36.5 °C', 130, 202, font, 7.5);
        this.drawText(page, datos.frecuencia_cardiaca ? `${datos.frecuencia_cardiaca} lpm` : '75 lpm', 220, 202, font, 7.5);
        this.drawText(page, datos.frecuencia_respiratoria ? `${datos.frecuencia_respiratoria} rpm` : '18 rpm', 310, 202, font, 7.5);
        this.drawText(page, datos.peso ? `${datos.peso} kg` : '--', 400, 202, font, 7.5);
        this.drawText(page, datos.talla ? `${datos.talla} cm` : '--', 490, 202, font, 7.5);
        const ordenes = Array.isArray(datos.ordenes) ? datos.ordenes : [];
        let yRow = 245;
        for (const ord of ordenes) {
            if (yRow > 710)
                break;
            this.drawText(page, this.formatFecha(ord.fecha || new Date()), 38, yRow, font, 7);
            this.drawText(page, ord.hora ? String(ord.hora).substring(0, 5) : '10:00', 95, yRow, font, 7);
            this.drawText(page, ord.indicacion || '', 150, yRow, fontBold, 7.5, 300);
            this.drawText(page, `${ord.medico_nombre || 'Médico'}\nCéd. ${ord.medico_cedula || '--'}`, 460, yRow, font, 6.5);
            yRow += 32;
        }
        const bytes = await doc.save();
        this.sendDoc(res, `Indicaciones_Medicas_${paciente.expediente_clinico}`, bytes);
    }
    public static async generarNotasEvolucion(res: Response, notas: any[], paciente: any) {
        const tPath = this.getTemplatePath('notas_evolucion.template.pdf');
        if (!tPath)
            return PDFGeneratorService.generarNotasEvolucion(res, notas, paciente);
        const doc = await PDFDocument.load(fs.readFileSync(tPath));
        const font = await doc.embedFont(StandardFonts.Helvetica);
        const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
        const nombreComp = `${paciente.apellido_paterno || ''} ${paciente.apellido_materno || ''} ${paciente.nombre || ''}`.replace(/\s+/g, ' ').trim();
        const esFem = String(paciente.sexo).toUpperCase().startsWith('F') || String(paciente.sexo).toUpperCase().startsWith('M');
        const esMasc = String(paciente.sexo).toUpperCase().startsWith('H') || String(paciente.sexo).toUpperCase().startsWith('MASC');
        const p0 = doc.getPage(0);
        await this.dibujarHeaderLogos(doc, p0, 14, 44);
        this.drawText(p0, 'Hospital General San Felipe del Progreso', 26, 126, fontBold, 8);
        this.drawText(p0, paciente.expediente_clinico, 365, 126, fontBold, 8.5);
        this.drawText(p0, nombreComp, 26, 150, fontBold, 8.5);
        this.drawText(p0, this.formatFecha(paciente.fecha_nacimiento), 250, 150, font, 8);
        this.drawText(p0, `${paciente.edad || '--'} años`, 365, 150, font, 8);
        if (esFem)
            this.drawText(p0, 'X', 440, 150, fontBold, 7.5);
        if (esMasc)
            this.drawText(p0, 'X', 505, 150, fontBold, 7.5);
        const primeraNota = (notas && notas[0]) || {};
        this.drawText(p0, primeraNota.presion_arterial || '120/80', 36, 185, fontBold, 8);
        this.drawText(p0, `${primeraNota.temperatura || '36.5'} °C`, 126, 185, font, 8);
        this.drawText(p0, `${primeraNota.frecuencia_cardiaca || '75'} lpm`, 216, 185, font, 8);
        this.drawText(p0, `${primeraNota.frecuencia_respiratoria || '18'} rpm`, 306, 185, font, 8);
        this.drawText(p0, `${primeraNota.peso || '--'} kg`, 396, 185, font, 8);
        this.drawText(p0, `${primeraNota.talla || '--'} cm`, 486, 185, font, 8);
        const prepararPaginaContinuacion = async (pg: any) => {
            await this.dibujarHeaderLogos(doc, pg, 14, 44);
            this.drawText(pg, 'Hospital General San Felipe del Progreso', 26, 70, fontBold, 8);
            this.drawText(pg, `Exp: ${paciente.expediente_clinico}`, 365, 70, fontBold, 8.5);
            this.drawText(pg, `Paciente: ${nombreComp}`, 26, 84, fontBold, 8);
            this.drawText(pg, `Edad: ${paciente.edad || '--'} años   Sexo: ${paciente.sexo || '--'}`, 365, 84, font, 8);
        };
        let currentPageIndex = 0;
        let curPage = p0;
        let curY = 245;
        const listaNotas = Array.isArray(notas) && notas.length > 0 ? notas : [{ evolucion: 'Paciente en evolución clínica.' }];
        for (const n of listaNotas) {
            const maxY = currentPageIndex === 0 ? 690 : 700;
            if (curY > maxY) {
                currentPageIndex++;
                if (currentPageIndex < doc.getPageCount()) {
                    curPage = doc.getPage(currentPageIndex);
                }
                else {
                    const [extraPage] = await doc.copyPages(doc, [1]);
                    doc.addPage(extraPage);
                    curPage = doc.getPage(currentPageIndex);
                }
                await prepararPaginaContinuacion(curPage);
                curY = 152;
            }
            const fHora = `${this.formatFecha(n.fecha || new Date())} ${n.hora || ''}`;
            const txt = [
                n.subjetivo ? `S: ${n.subjetivo}` : '',
                n.objetivo ? `O: ${n.objetivo}` : '',
                n.analisis ? `A: ${n.analisis}` : '',
                n.plan ? `P: ${n.plan}` : '',
                n.nota_evolucion_texto || n.evolucion || ''
            ].filter(Boolean).join('\n');
            const firma = (n.medico_nombre ? `\nDr(a). ${n.medico_nombre} | Céd. ${n.medico_cedula || '--'}` : '');
            const fullText = txt + firma;
            this.drawText(curPage, fHora, 38, curY, fontBold, 7.5);
            this.drawText(curPage, fullText, 125, curY, font, 7.5, 420);
            const linesCount = fullText.split('\n').length;
            curY += Math.max(linesCount * 12 + 10, 38);
        }
        if (currentPageIndex === 0 && doc.getPageCount() > 1) {
            doc.removePage(1);
        }
        const totalPages = doc.getPageCount();
        for (let p = 0; p < totalPages; p++) {
            const pg = doc.getPage(p);
            this.drawText(pg, String(p + 1), 420, 94, fontBold, 8);
            this.drawText(pg, String(totalPages), 505, 94, fontBold, 8);
        }
        const bytes = await doc.save();
        this.sendDoc(res, `Notas_Evolucion_${paciente.expediente_clinico}`, bytes);
    }
    public static async generarPartograma(res: Response, datos: any, paciente: any) {
        const tPath = this.getTemplatePath('partograma.template.pdf');
        if (!tPath)
            return PDFGeneratorService.generarPartograma(res, datos, paciente);
        const doc = await PDFDocument.load(fs.readFileSync(tPath));
        const font = await doc.embedFont(StandardFonts.Helvetica);
        const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
        const p1 = doc.getPage(0);
        await this.dibujarHeaderLogos(doc, p1, 14, 44);
        const nombreComp = `${paciente.apellido_paterno || ''} ${paciente.apellido_materno || ''} ${paciente.nombre || ''}`.replace(/\s+/g, ' ').trim();
        this.drawText(p1, datos.unidad_medica || 'Hospital General San Felipe del Progreso', 35, 114, fontBold, 8);
        this.drawText(p1, this.formatFecha(datos.fecha || new Date()), 435, 114, font, 8);
        this.drawText(p1, datos.hora || '12:00', 510, 114, font, 8);
        this.drawText(p1, nombreComp, 35, 138, fontBold, 8.5);
        this.drawText(p1, paciente.expediente_clinico, 435, 138, fontBold, 8.5);
        this.drawText(p1, `${paciente.edad || '--'}`, 35, 162, font, 8);
        this.drawText(p1, `${datos.gesta || paciente.gesta || 1}`, 145, 162, font, 8);
        this.drawText(p1, `${datos.para || paciente.para || 0}`, 200, 162, font, 8);
        this.drawText(p1, `${datos.cesareas || paciente.cesarea || 0}`, 255, 162, font, 8);
        this.drawText(p1, `${datos.abortos || paciente.aborto || 0}`, 365, 162, font, 8);
        this.drawText(p1, `${datos.hijos_vivos || 1}`, 475, 162, font, 8);
        this.drawText(p1, datos.fecha_ultimo_parto || '--', 35, 186, font, 7.5);
        this.drawText(p1, datos.fecha_ultima_menstruacion || '--', 170, 186, font, 7.5);
        this.drawText(p1, datos.fecha_probable_parto || '--', 300, 186, font, 7.5);
        this.drawText(p1, `${datos.semanas_gestacion || '--'}`, 425, 186, font, 8);
        this.drawText(p1, 'X', 48, 215, fontBold, 7.5); // Control prenatal si
        this.drawText(p1, `${datos.num_consultas || 5}`, 155, 215, font, 8);
        this.drawText(p1, datos.donde_control || 'C.S. San Felipe', 255, 215, font, 8);
        this.drawText(p1, datos.complicaciones_embarazo || 'Negadas', 35, 248, font, 7.5);
        this.drawText(p1, datos.tratamiento_administrado || 'Ácido fólico, fumarato ferroso', 35, 290, font, 7.5);
        this.drawText(p1, datos.ta || '110/70 mmHg', 35, 410, fontBold, 8);
        this.drawText(p1, `${datos.temp || '36.5'} °C`, 175, 410, font, 8);
        this.drawText(p1, `${datos.fr || '20'} rpm`, 315, 410, font, 8);
        this.drawText(p1, `${datos.fc || '80'} lpm`, 450, 410, font, 8);
        this.drawText(p1, datos.impresion_diagnostica || 'Trabajo de parto fase activa', 35, 535, fontBold, 7.5, 120);
        this.drawText(p1, datos.indicaciones_medicas || 'Vigilancia estrecha de FCF y dinámica uterina.', 35, 580, font, 7.5, 120);
        this.drawText(p1, datos.medico_responsable || 'DR(A). GINECO-OBSTETRA', 250, 755, fontBold, 8);
        const bytes = await doc.save();
        this.sendDoc(res, `Partograma_${paciente.expediente_clinico}`, bytes);
    }

  private static drawAt(
    page: PDFPage,
    text: any,
    x: number,
    y: number,
    font: PDFFont,
    size = 6.5,
    maxWidth?: number
  ) {
    if (text === undefined || text === null || text === '') return;
    let str = String(text);
    if (maxWidth) {
      while (str.length > 2 && font.widthOfTextAtSize(str, size) > maxWidth) {
        str = str.slice(0, -1);
      }
    }
    page.drawText(str, {
      x,
      y,
      size,
      font,
      color: rgb(0, 0, 0),
    });
  }

  private static drawBoxes(
    page: PDFPage,
    text: any,
    startX: number,
    y: number,
    dx: number,
    font: PDFFont,
    size = 6.5,
    maxChars = 20
  ) {
    if (text === undefined || text === null || text === '') return;
    const str = String(text).toUpperCase().replace(/[^A-Z0-9]/g, '');
    for (let i = 0; i < Math.min(str.length, maxChars); i++) {
      page.drawText(str[i], {
        x: startX + i * dx,
        y,
        size,
        font,
        color: rgb(0, 0, 0),
      });
    }
  }

  private static drawX(
    page: PDFPage,
    x: number,
    y: number,
    fontBold: PDFFont,
    size = 6.5
  ) {
    page.drawText('X', {
      x,
      y,
      size,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
  }

  private static parseFechaParts(val: any): { dd: string; mm: string; yyyy: string } {
    if (!val) return { dd: '', mm: '', yyyy: '' };
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
      const parts = val.substring(0, 10).split('-');
      return { dd: parts[2], mm: parts[1], yyyy: parts[0] };
    }
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return { dd: '', mm: '', yyyy: '' };
      const dd = String(d.getUTCDate()).padStart(2, '0');
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const yyyy = String(d.getUTCFullYear());
      return { dd, mm, yyyy };
    } catch {
      return { dd: '', mm: '', yyyy: '' };
    }
  }

  private static parseHoraParts(val: any): { hh: string; mm: string } {
    if (!val) return { hh: '', mm: '' };
    if (typeof val === 'string') {
      const m = val.match(/(\d{1,2}):(\d{2})/);
      if (m) return { hh: m[1].padStart(2, '0'), mm: m[2] };
    }
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return { hh: '', mm: '' };
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return { hh, mm };
    } catch {
      return { hh: '', mm: '' };
    }
  }

  private static splitNombre(nombreCompleto: string): { nombres: string; primerApellido: string; segundoApellido: string } {
    if (!nombreCompleto) return { nombres: '', primerApellido: '', segundoApellido: '' };
    const clean = nombreCompleto.replace(/^(DR\.|DRA\.|DR |DRA |MED\.|LIC\.)\s*/i, '').trim();
    const parts = clean.split(/\s+/);
    if (parts.length === 1) {
      return { nombres: parts[0], primerApellido: '', segundoApellido: '' };
    } else if (parts.length === 2) {
      return { nombres: parts[0], primerApellido: parts[1], segundoApellido: '' };
    } else if (parts.length === 3) {
      return { nombres: parts[0], primerApellido: parts[1], segundoApellido: parts[2] };
    } else {
      const segundoApellido = parts.pop() || '';
      const primerApellido = parts.pop() || '';
      const nombres = parts.join(' ');
      return { nombres, primerApellido, segundoApellido };
    }
  }

  public static async generarSINBA16(res: Response, datos: any, paciente: any): Promise<void> {
    const tPath = this.getTemplatePath('sinba16.template.pdf');
    if (!tPath) return PDFGeneratorService.generarSINBA16(res, datos, paciente);

    const doc = await PDFDocument.load(fs.readFileSync(tPath));
    const page = doc.getPage(0);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    // 1. FOLIO & CLUES
    const folioStr = datos.folio || paciente.expediente_clinico || 'URG-001';
    this.drawAt(page, folioStr, 505.0, 936.0, fontBold, 7.5);

    // 2. PACIENTE
    this.drawAt(page, (paciente.nombre || '').toUpperCase(), 80.0, 909.0, fontBold, 7.5, 160);
    this.drawAt(page, (paciente.apellido_paterno || '').toUpperCase(), 250.0, 909.0, fontBold, 7.5, 150);
    this.drawAt(page, (paciente.apellido_materno || '').toUpperCase(), 410.0, 909.0, fontBold, 7.5, 150);

    // 3. CURP, DOB, LUGAR DE NACIMIENTO
    if (paciente.curp) {
      this.drawBoxes(page, paciente.curp, 81.5, 878.0, 8.16, fontBold, 6.5, 18);
    }
    const dob = this.parseFechaParts(paciente.fecha_nacimiento);
    this.drawBoxes(page, dob.dd, 302.0, 878.0, 8.16, fontBold, 6.5, 2);
    this.drawBoxes(page, dob.mm, 326.0, 878.0, 8.16, fontBold, 6.5, 2);
    this.drawBoxes(page, dob.yyyy, 351.0, 878.0, 8.16, fontBold, 6.5, 4);
    const entidadNac = (paciente.entidad_nacimiento || paciente.pais_nacimiento || paciente.lugar_nacimiento || 'MÉXICO').toUpperCase();
    this.drawAt(page, entidadNac, 475.0, 878.0, fontBold, 6.5, 120);

    // 4. EDAD & SEXO
    const edadNum = typeof paciente.edad === 'number' ? paciente.edad : parseInt(paciente.edad || '0', 10);
    if (edadNum >= 1) {
      this.drawBoxes(page, String(edadNum).padStart(2, '0'), 380.0, 858.0, 8.16, fontBold, 6.5, 2);
    } else if (paciente.edad_meses) {
      this.drawBoxes(page, String(paciente.edad_meses).padStart(2, '0'), 285.0, 858.0, 8.16, fontBold, 6.5, 2);
    } else if (paciente.edad_dias) {
      this.drawBoxes(page, String(paciente.edad_dias).padStart(2, '0'), 195.0, 858.0, 8.16, fontBold, 6.5, 2);
    }
    const sexo = String(paciente.sexo || '').toUpperCase();
    if (sexo.startsWith('H') || sexo === 'MASCULINO') {
      this.drawX(page, 467.0, 858.5, fontBold);
    } else if (sexo.startsWith('M') || sexo.startsWith('F') || sexo === 'FEMENINO') {
      this.drawX(page, 500.0, 858.5, fontBold);
    } else if (sexo.includes('INTER')) {
      this.drawX(page, 535.0, 858.5, fontBold);
    }

    // 5. AFILIACIÓN & GRATUIDAD
    const afil = String(paciente.afiliacion || datos.afiliacion || '').toLowerCase();
    if (afil.includes('ningun')) this.drawX(page, 198.3, 843.0, fontBold);
    else if (afil.includes('issste')) this.drawX(page, 263.5, 843.0, fontBold);
    else if (afil.includes('pemex')) this.drawX(page, 296.0, 843.0, fontBold);
    else if (afil.includes('sedena')) this.drawX(page, 328.7, 843.0, fontBold);
    else if (afil.includes('semar')) this.drawX(page, 361.2, 843.0, fontBold);
    else if (afil.includes('imss bienestar') || afil.includes('opd') || afil.includes('bienestar')) this.drawX(page, 467.3, 843.0, fontBold);
    else if (afil.includes('imss')) this.drawX(page, 230.9, 843.0, fontBold);
    else if (afil.includes('issfam')) this.drawX(page, 426.5, 843.0, fontBold);
    else if (afil.includes('otra')) this.drawX(page, 393.8, 843.0, fontBold);
    else this.drawX(page, 467.3, 843.0, fontBold);

    if (datos.gratuidad !== false) {
      this.drawX(page, 92.2, 828.2, fontBold);
    } else {
      this.drawX(page, 119.5, 828.2, fontBold);
    }
    const numAfil = paciente.num_afiliacion || datos.folio || paciente.expediente_clinico;
    this.drawBoxes(page, numAfil, 230.0, 824.0, 8.16, fontBold, 6.5, 18);

    // 6. DOMICILIO
    this.drawAt(page, (paciente.domicilio_entidad || paciente.domicilio_pais || 'MÉXICO').toUpperCase(), 170.0, 810.0, font, 6.5, 150);
    this.drawAt(page, (paciente.domicilio_municipio || 'SAN FELIPE DEL PROGRESO').toUpperCase(), 410.0, 810.0, font, 6.5, 180);
    this.drawAt(page, (paciente.domicilio_localidad || 'CENTRO').toUpperCase(), 130.0, 797.0, font, 6.5, 140);
    this.drawBoxes(page, paciente.domicilio_cp || '50640', 363.0, 794.6, 8.16, fontBold, 6.5, 5);
    this.drawAt(page, (paciente.domicilio_tipo_vialidad || 'AVENIDA').toUpperCase(), 480.0, 797.0, font, 6.5, 110);
    const nomVial16 = (paciente.domicilio_nombre_vialidad || (paciente.domicilio ? String(paciente.domicilio).split(/[,#]/)[0] : '') || 'MORELOS').trim();
    this.drawAt(page, nomVial16.toUpperCase(), 170.0, 785.0, font, 6.5, 130);
    this.drawAt(page, String(paciente.domicilio_num_exterior || '142'), 310.0, 785.0, font, 6.5, 30);
    this.drawAt(page, String(paciente.domicilio_num_interior || 'S/N'), 368.0, 785.0, font, 6.5, 30);
    this.drawAt(page, (paciente.domicilio_tipo_asentamiento || 'COLONIA').toUpperCase(), 480.0, 785.0, font, 6.5, 110);
    this.drawAt(page, (paciente.domicilio_nombre_asentamiento || 'CENTRO').toUpperCase(), 180.0, 773.0, font, 6.5, 200);
    this.drawBoxes(page, paciente.telefono || '7121234567', 442.0, 770.5, 8.16, fontBold, 6.5, 10);

    // 7. PRIORITARIOS
    if (paciente.es_indigena) this.drawX(page, 141.2, 758.6, fontBold); else this.drawX(page, 173.8, 758.6, fontBold);
    if (paciente.es_afromexicano) this.drawX(page, 418.7, 758.7, fontBold); else this.drawX(page, 451.3, 758.7, fontBold);
    if (paciente.es_migrante_retornado) this.drawX(page, 141.2, 742.4, fontBold); else this.drawX(page, 173.8, 742.4, fontBold);
    if (paciente.comunidad_lgbt) this.drawX(page, 198.3, 726.5, fontBold); else this.drawX(page, 230.9, 726.5, fontBold);

    // 8. ATENCIÓN PREHOSPITALARIA & INGRESO
    if (datos.atencion_prehospitalaria) this.drawX(page, 149.3, 697.8, fontBold); else this.drawX(page, 168.0, 697.8, fontBold);
    const tiempoT = this.parseHoraParts(datos.tiempo_traslado_horas || '00:30');
    this.drawBoxes(page, tiempoT.hh, 245.0, 697.0, 8.16, fontBold, 6.5, 2);
    this.drawBoxes(page, tiempoT.mm, 269.0, 697.0, 8.16, fontBold, 6.5, 2);

    const fIngreso = this.parseFechaParts(datos.fecha_hora_ingreso || paciente.fecha_hora_ingreso || new Date());
    const hIngreso = this.parseHoraParts(datos.fecha_hora_ingreso || paciente.fecha_hora_ingreso || new Date());
    this.drawBoxes(page, fIngreso.dd, 405.0, 697.0, 8.16, fontBold, 6.5, 2);
    this.drawBoxes(page, fIngreso.mm, 429.0, 697.0, 8.16, fontBold, 6.5, 2);
    this.drawBoxes(page, fIngreso.yyyy, 453.0, 697.0, 8.16, fontBold, 6.5, 4);
    this.drawBoxes(page, hIngreso.hh, 498.0, 697.0, 8.16, fontBold, 6.5, 2);
    this.drawBoxes(page, hIngreso.mm, 522.0, 697.0, 8.16, fontBold, 6.5, 2);

    // 9. TIPO URGENCIA, MOTIVO, TIPO CAMA
    const tipoUrg = String(datos.tipo_urgencia || '').toLowerCase();
    if (tipoUrg.includes('no')) this.drawX(page, 185.0, 677.6, fontBold); else this.drawX(page, 116.8, 677.6, fontBold);

    const motAt = String(datos.motivo_atencion || '').toLowerCase();
    if (motAt.includes('accidente') || motAt.includes('violencia')) this.drawX(page, 124.9, 662.8, fontBold);
    else if (motAt.includes('gineco') || motAt.includes('obstétr')) this.drawX(page, 271.8, 662.8, fontBold);
    else if (motAt.includes('pediátr')) this.drawX(page, 328.9, 662.8, fontBold);
    else this.drawX(page, 231.0, 662.8, fontBold);

    const tipoCaso = String(datos.tipo_caso || '').toLowerCase();
    if (tipoCaso.includes('choque')) this.drawX(page, 475.3, 662.8, fontBold);
    else if (tipoCaso.includes('sin cama')) this.drawX(page, 535.0, 662.8, fontBold);
    else this.drawX(page, 410.5, 662.8, fontBold);

    // 10. TRASLADO TRANSITORIO & ALTA
    if (datos.traslado_transferido) {
      this.drawX(page, 132.0, 644.0, fontBold);
      if (datos.destino_unidad) this.drawAt(page, String(datos.destino_unidad).toUpperCase(), 235.0, 644.0, font, 6.5, 160);
    } else {
      this.drawX(page, 148.0, 644.0, fontBold);
    }

    if (datos.fecha_hora_alta) {
      const fAlta = this.parseFechaParts(datos.fecha_hora_alta);
      const hAlta = this.parseHoraParts(datos.fecha_hora_alta);
      this.drawBoxes(page, fAlta.dd, 123.0, 630.0, 8.16, fontBold, 6.5, 2);
      this.drawBoxes(page, fAlta.mm, 147.0, 630.0, 8.16, fontBold, 6.5, 2);
      this.drawBoxes(page, fAlta.yyyy, 171.0, 630.0, 8.16, fontBold, 6.5, 4);
      this.drawBoxes(page, hAlta.hh, 215.0, 630.0, 8.16, fontBold, 6.5, 2);
      this.drawBoxes(page, hAlta.mm, 239.0, 630.0, 8.16, fontBold, 6.5, 2);
    }

    const altaPor = String(datos.alta_por || '').toLowerCase();
    if (altaPor.includes('hosp')) this.drawX(page, 124.8, 610.0, fontBold);
    else if (altaPor.includes('consulta')) this.drawX(page, 173.8, 610.0, fontBold);
    else if (altaPor.includes('traslado')) this.drawX(page, 230.8, 610.0, fontBold);
    else if (altaPor.includes('defunc')) this.drawX(page, 165.7, 580.0, fontBold);
    else if (altaPor.includes('fuga')) this.drawX(page, 124.8, 563.5, fontBold);
    else if (altaPor.includes('voluntad')) this.drawX(page, 165.7, 563.5, fontBold);
    else this.drawX(page, 124.8, 580.0, fontBold);

    // 11. MUJER EN EDAD FÉRTIL
    const mef = String(datos.mujer_edad_fertil || '').toLowerCase();
    if (mef.includes('embarazo')) {
      this.drawX(page, 141.2, 544.4, fontBold);
      const sem = datos.semanas_gestacion || paciente.semanas_gestacion || '';
      if (sem) this.drawBoxes(page, String(sem).padStart(2, '0'), 225.0, 528.0, 8.16, fontBold, 6.5, 2);
    } else if (mef.includes('puerperio')) {
      this.drawX(page, 239.2, 544.4, fontBold);
    } else {
      this.drawX(page, 405.0, 544.4, fontBold);
    }

    // 12. AFECCIÓN PRINCIPAL & COMORBILIDADES
    this.drawAt(page, (datos.afeccion_principal || 'Atención médica en urgencias').toUpperCase(), 78.0, 504.0, fontBold, 6.5, 420);
    const cieMain = (datos.afeccion_principal_cie || 'R69').replace('.', '').toUpperCase();
    this.drawBoxes(page, cieMain, 511.0, 503.0, 8.16, fontBold, 6.5, 5);

    const comorbs = Array.isArray(datos.comorbilidades) ? datos.comorbilidades : (typeof datos.comorbilidades === 'string' ? JSON.parse(datos.comorbilidades || '[]') : []);
    const comorbY = [482.0, 468.0, 454.0, 440.0, 427.0];
    for (let i = 0; i < Math.min(comorbs.length, comorbY.length); i++) {
      const it = comorbs[i];
      const desc = typeof it === 'string' ? it : (it.diagnostico || it.nombre || '');
      const cie = typeof it === 'object' ? (it.cie10 || it.codigo || '') : '';
      this.drawAt(page, String(desc).toUpperCase(), 78.0, comorbY[i], font, 6.5, 420);
      if (cie) this.drawBoxes(page, String(cie).replace('.', '').toUpperCase(), 511.0, comorbY[i], 8.16, fontBold, 6.5, 5);
    }

    if (datos.causa_externa && datos.causa_externa !== 'N/A') {
      this.drawAt(page, String(datos.causa_externa).toUpperCase(), 60.0, 398.0, font, 6.5, 440);
    }

    if (datos.hoja_lesiones_violencia) {
      this.drawX(page, 230.0, 381.0, fontBold);
      if (datos.hoja_lesiones_folio) this.drawAt(page, String(datos.hoja_lesiones_folio), 482.0, 381.0, fontBold, 6.5);
    } else {
      this.drawX(page, 254.0, 381.0, fontBold);
    }

    // 13. INTERCONSULTAS EN URGENCIAS (3 FILAS, CADA UNA CON 2 SUB-LÍNEAS)
    const inters = Array.isArray(datos.interconsultas_urgencias) ? datos.interconsultas_urgencias : (typeof datos.interconsultas_urgencias === 'string' ? JSON.parse(datos.interconsultas_urgencias || '[]') : []);
    const interTopY = [356.5, 328.5, 300.5];
    const interBotY = [340.0, 312.0, 284.0];
    for (let i = 0; i < Math.min(inters.length, 3); i++) {
      const it = inters[i];
      if (it) {
        if (it.especialidad) this.drawAt(page, String(it.especialidad).toUpperCase(), 60.0, interTopY[i], font, 6.5, 110);
        if (it.cedula) this.drawBoxes(page, String(it.cedula), 446.0, interTopY[i], 8.16, fontBold, 6.5, 10);

        const nomDoc = it.medico_nombre || it.nombre || '';
        const docParts = this.splitNombre(nomDoc);
        const nom = (it.nombre_solo || docParts.nombres || '').toUpperCase();
        const pAp = (it.primer_apellido || docParts.primerApellido || '').toUpperCase();
        const sAp = (it.segundo_apellido || docParts.segundoApellido || '').toUpperCase();
        this.drawAt(page, nom, 185.0, interBotY[i], font, 6.5, 85);
        this.drawAt(page, pAp, 280.0, interBotY[i], font, 6.5, 75);
        this.drawAt(page, sAp, 360.0, interBotY[i], font, 6.5, 75);
        if (it.curp) this.drawBoxes(page, String(it.curp), 442.0, interBotY[i], 8.16, fontBold, 6.5, 18);
      }
    }

    // 14. PROCEDIMIENTOS EN URGENCIAS (5 FILAS)
    const procs = Array.isArray(datos.procedimientos_realizados) ? datos.procedimientos_realizados : (typeof datos.procedimientos_realizados === 'string' ? (datos.procedimientos_realizados.startsWith('[') ? JSON.parse(datos.procedimientos_realizados) : [datos.procedimientos_realizados]) : []);
    const procY = [258.0, 243.5, 229.0, 214.5, 200.0];
    for (let i = 0; i < Math.min(procs.length, procY.length); i++) {
      const it = procs[i];
      const desc = typeof it === 'string' ? it : (it.procedimiento || it.nombre || '');
      const cie9 = typeof it === 'object' ? (it.cie9 || it.codigo || '') : '';
      this.drawAt(page, String(desc).toUpperCase(), 75.0, procY[i], font, 6.5, 425);
      if (cie9) this.drawBoxes(page, String(cie9).replace('.', '').toUpperCase(), 510.0, procY[i], 8.16, fontBold, 6.5, 5);
    }

    // 15. MEDICAMENTOS (6 FILAS)
    const meds = Array.isArray(datos.medicamentos_administrados) ? datos.medicamentos_administrados : (typeof datos.medicamentos_administrados === 'string' ? (datos.medicamentos_administrados.startsWith('[') ? JSON.parse(datos.medicamentos_administrados) : [datos.medicamentos_administrados]) : []);
    const medY = [170.0, 156.5, 142.5, 129.0, 113.5, 98.5];
    for (let i = 0; i < Math.min(meds.length, medY.length); i++) {
      const it = meds[i];
      const nom = typeof it === 'string' ? it : (it.medicamento || it.nombre || '');
      const pres = typeof it === 'object' ? (it.presentacion || it.dosis || '') : '';
      this.drawAt(page, String(nom).toUpperCase(), 60.0, medY[i], font, 6.5, 160);
      if (pres) this.drawAt(page, String(pres).toUpperCase(), 230.0, medY[i], font, 6.5, 120);
    }

    // 16. MÉDICO RESPONSABLE
    const medResp = datos.medico_responsable || paciente.medico_tratante || 'DR. ALEJANDRO MENDOZA VARGAS';
    const medParts = this.splitNombre(medResp);
    this.drawAt(page, medParts.nombres.toUpperCase(), 78.0, 64.0, fontBold, 7, 160);
    this.drawAt(page, medParts.primerApellido.toUpperCase(), 245.0, 64.0, fontBold, 7, 120);
    this.drawAt(page, medParts.segundoApellido.toUpperCase(), 370.0, 64.0, fontBold, 7, 120);
    if (datos.medico_curp) {
      this.drawBoxes(page, datos.medico_curp, 81.5, 44.0, 8.16, fontBold, 6.5, 18);
    }
    const medCed = datos.medico_cedula || 'CED1732599';
    this.drawBoxes(page, medCed, 302.0, 44.0, 8.16, fontBold, 6.5, 10);
    this.drawAt(page, 'FIRMA Y SELLO', 450.0, 44.0, fontBold, 6.5);

    const bytes = await doc.save();
    this.sendDoc(res, `SINBA16_${paciente.expediente_clinico || 'doc'}`, bytes);
  }

  public static async generarSINBA14(res: Response, datos: any, paciente: any): Promise<void> {
    const tPath = this.getTemplatePath('sinba14.template.pdf');
    if (!tPath) return PDFGeneratorService.generarSINBA14(res, datos, paciente);

    const doc = await PDFDocument.load(fs.readFileSync(tPath));
    const page = doc.getPage(0);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    // 1. FOLIO & CLUES
    const folioStr = datos.folio || paciente.expediente_clinico || 'HOSP-001';
    this.drawAt(page, folioStr, 505.0, 935.3, fontBold, 7.5);

    // 2. PACIENTE NOMBRE
    this.drawAt(page, (paciente.nombre || '').toUpperCase(), 88.0, 914.9, fontBold, 7.5, 160);
    this.drawAt(page, (paciente.apellido_paterno || '').toUpperCase(), 260.0, 914.9, fontBold, 7.5, 150);
    this.drawAt(page, (paciente.apellido_materno || '').toUpperCase(), 420.0, 914.9, fontBold, 7.5, 150);

    // 3. CURP, DOB, LUGAR DE NACIMIENTO
    if (paciente.curp) {
      this.drawBoxes(page, paciente.curp, 81.5, 901.5, 8.16, fontBold, 6.5, 18);
    }
    const dob = this.parseFechaParts(paciente.fecha_nacimiento);
    this.drawBoxes(page, dob.dd, 302.0, 901.5, 8.16, fontBold, 6.5, 2);
    this.drawBoxes(page, dob.mm, 326.0, 901.5, 8.16, fontBold, 6.5, 2);
    this.drawBoxes(page, dob.yyyy, 351.0, 901.5, 8.16, fontBold, 6.5, 4);
    const entidadNac = (paciente.entidad_nacimiento || paciente.pais_nacimiento || paciente.lugar_nacimiento || 'MÉXICO').toUpperCase();
    this.drawAt(page, entidadNac, 475.0, 901.5, fontBold, 6.5, 120);

    // 4. EDAD & SEXO
    const edadNum = typeof paciente.edad === 'number' ? paciente.edad : parseInt(paciente.edad || '0', 10);
    if (edadNum >= 1) {
      this.drawBoxes(page, String(edadNum).padStart(2, '0'), 326.0, 888.7, 8.16, fontBold, 6.5, 2);
    } else if (paciente.edad_meses) {
      this.drawBoxes(page, String(paciente.edad_meses).padStart(2, '0'), 247.0, 888.7, 8.16, fontBold, 6.5, 2);
    } else if (paciente.edad_dias) {
      this.drawBoxes(page, String(paciente.edad_dias).padStart(2, '0'), 176.0, 888.7, 8.16, fontBold, 6.5, 2);
    }
    const sexo = String(paciente.sexo || '').toUpperCase();
    if (sexo.startsWith('H') || sexo === 'MASCULINO') {
      this.drawX(page, 413.0, 888.7, fontBold);
    } else if (sexo.startsWith('M') || sexo.startsWith('F') || sexo === 'FEMENINO') {
      this.drawX(page, 453.0, 888.7, fontBold);
    } else if (sexo.includes('INTER')) {
      this.drawX(page, 493.0, 888.7, fontBold);
    }

    // 5. AFILIACIÓN & GRATUIDAD
    const afil = String(paciente.afiliacion || datos.afiliacion || '').toLowerCase();
    if (afil.includes('ningun')) this.drawX(page, 199.0, 872.6, fontBold);
    else if (afil.includes('issste')) this.drawX(page, 270.0, 872.6, fontBold);
    else if (afil.includes('pemex')) this.drawX(page, 302.0, 872.6, fontBold);
    else if (afil.includes('sedena')) this.drawX(page, 333.5, 872.6, fontBold);
    else if (afil.includes('semar')) this.drawX(page, 373.0, 872.6, fontBold);
    else if (afil.includes('imss bienestar') || afil.includes('opd') || afil.includes('bienestar')) this.drawX(page, 468.0, 872.6, fontBold);
    else if (afil.includes('imss')) this.drawX(page, 238.5, 872.6, fontBold);
    else if (afil.includes('issfam')) this.drawX(page, 436.5, 872.6, fontBold);
    else if (afil.includes('otra')) this.drawX(page, 405.0, 872.6, fontBold);
    else this.drawX(page, 468.0, 872.6, fontBold);

    if (datos.gratuidad !== false) {
      this.drawX(page, 88.0, 860.4, fontBold);
    } else {
      this.drawX(page, 118.0, 860.4, fontBold);
    }
    const numAfil = paciente.num_afiliacion || datos.folio || paciente.expediente_clinico;
    this.drawBoxes(page, numAfil, 238.0, 859.0, 8.16, fontBold, 6.5, 18);

    // 6. NACIÓ EN EL HOSPITAL, PESO, TALLA, ESTADO CONYUGAL
    if (datos.nacio_en_hospital) this.drawX(page, 118.0, 848.1, fontBold); else this.drawX(page, 147.0, 848.1, fontBold);
    if (datos.peso_kg) this.drawAt(page, String(datos.peso_kg), 215.0, 848.1, font, 6.5);
    if (datos.talla_cm) this.drawAt(page, String(datos.talla_cm), 310.0, 848.1, font, 6.5);
    this.drawAt(page, String(paciente.estado_civil || 'Soltero(a)'), 455.0, 848.1, font, 6.5, 120);

    // 7. DOMICILIO
    this.drawAt(page, (paciente.domicilio_entidad || paciente.domicilio_pais || 'MÉXICO').toUpperCase(), 170.0, 827.1, font, 6.5, 150);
    this.drawAt(page, (paciente.domicilio_municipio || 'SAN FELIPE DEL PROGRESO').toUpperCase(), 410.0, 827.1, font, 6.5, 180);
    this.drawAt(page, (paciente.domicilio_localidad || 'CENTRO').toUpperCase(), 130.0, 815.7, font, 6.5, 140);
    this.drawBoxes(page, paciente.domicilio_cp || '50640', 335.0, 815.7, 8.16, fontBold, 6.5, 5);
    this.drawAt(page, (paciente.domicilio_tipo_vialidad || 'AVENIDA').toUpperCase(), 480.0, 815.7, font, 6.5, 110);
    const nomVial14 = (paciente.domicilio_nombre_vialidad || (paciente.domicilio ? String(paciente.domicilio).split(/[,#]/)[0] : '') || 'MORELOS').trim();
    this.drawAt(page, nomVial14.toUpperCase(), 170.0, 804.8, font, 6.5, 100);
    this.drawAt(page, String(paciente.domicilio_num_exterior || '142'), 305.0, 804.8, font, 6.5, 25);
    this.drawAt(page, String(paciente.domicilio_num_interior || 'S/N'), 360.0, 804.8, font, 6.5, 25);
    this.drawAt(page, (paciente.domicilio_tipo_asentamiento || 'COLONIA').toUpperCase(), 480.0, 804.8, font, 6.5, 110);
    this.drawAt(page, (paciente.domicilio_nombre_asentamiento || 'CENTRO').toUpperCase(), 180.0, 793.7, font, 6.5, 200);
    this.drawBoxes(page, paciente.telefono || '7121234567', 442.0, 793.7, 8.16, fontBold, 6.5, 10);

    // 8. PRIORITARIOS
    if (paciente.es_indigena) this.drawX(page, 138.0, 777.5, fontBold); else this.drawX(page, 175.0, 777.5, fontBold);
    if (paciente.habla_lengua_indigena) {
      this.drawX(page, 358.0, 777.5, fontBold);
      if (paciente.lengua_indigena) this.drawAt(page, paciente.lengua_indigena.toUpperCase(), 475.0, 777.5, font, 6.5);
    } else {
      this.drawX(page, 389.0, 777.5, fontBold);
    }
    if (paciente.es_afromexicano) this.drawX(page, 138.0, 756.8, fontBold); else this.drawX(page, 175.0, 756.8, fontBold);
    if (paciente.es_migrante_retornado) this.drawX(page, 358.0, 756.8, fontBold); else this.drawX(page, 389.0, 756.8, fontBold);
    if (paciente.comunidad_lgbt) this.drawX(page, 183.0, 741.7, fontBold); else this.drawX(page, 215.0, 741.7, fontBold);

    // 9. EXPEDIENTE & SERVICIO
    this.drawAt(page, paciente.expediente_clinico, 105.0, 716.9, fontBold, 7.5);
    const tipoServ = String(datos.tipo_servicio || '').toLowerCase();
    if (tipoServ.includes('corta')) this.drawX(page, 239.0, 680.1, fontBold); else this.drawX(page, 239.0, 704.7, fontBold);

    // Fechas ingreso / egreso
    const fIng = this.parseFechaParts(datos.fecha_ingreso || paciente.fecha_hora_ingreso || new Date());
    this.drawBoxes(page, fIng.dd, 78.0, 693.2, 8.16, fontBold, 6.5, 2);
    this.drawBoxes(page, fIng.mm, 110.0, 693.0, 8.16, fontBold, 6.5, 2);
    this.drawBoxes(page, fIng.yyyy, 145.0, 693.2, 8.16, fontBold, 6.5, 4);

    if (datos.fecha_egreso || paciente.fecha_hora_alta) {
      const fEg = this.parseFechaParts(datos.fecha_egreso || paciente.fecha_hora_alta);
      this.drawBoxes(page, fEg.dd, 78.0, 668.7, 8.16, fontBold, 6.5, 2);
      this.drawBoxes(page, fEg.mm, 110.0, 668.5, 8.16, fontBold, 6.5, 2);
      this.drawBoxes(page, fEg.yyyy, 145.0, 668.7, 8.16, fontBold, 6.5, 4);
    }

    if (datos.dias_uti) {
      this.drawAt(page, String(datos.dias_uti), 398.0, 667.8, fontBold, 6.5);
    }
    if (datos.dias_terapia_intermedia) {
      this.drawAt(page, String(datos.dias_terapia_intermedia), 398.0, 657.8, fontBold, 6.5);
    }

    // 10. PROCEDENCIA & MOTIVO EGRESO
    const proc = String(datos.procedencia || '').toLowerCase();
    if (proc.includes('consulta')) this.drawX(page, 59.0, 633.3, fontBold);
    else if (proc.includes('urgenc')) this.drawX(page, 128.0, 633.3, fontBold);
    else if (proc.includes('refer')) this.drawX(page, 175.0, 633.3, fontBold);
    else if (proc.includes('cunero')) this.drawX(page, 405.0, 633.3, fontBold);
    else this.drawX(page, 462.0, 633.3, fontBold);

    const motEg = String(datos.motivo_egreso || '').toLowerCase();
    if (motEg.includes('curac')) this.drawX(page, 59.0, 612.0, fontBold);
    else if (motEg.includes('mejor')) this.drawX(page, 109.0, 612.0, fontBold);
    else if (motEg.includes('volunt')) this.drawX(page, 157.0, 612.0, fontBold);
    else if (motEg.includes('traslado')) this.drawX(page, 199.0, 612.0, fontBold);
    else if (motEg.includes('defunc')) this.drawX(page, 59.0, 596.5, fontBold);
    else if (motEg.includes('fuga')) this.drawX(page, 446.0, 596.5, fontBold);
    else this.drawX(page, 109.0, 612.0, fontBold);

    // 11. MUJER EN EDAD FÉRTIL
    const mef = String(datos.mujer_edad_fertil || '').toLowerCase();
    if (mef.includes('embarazo')) this.drawX(page, 118.0, 585.2, fontBold);
    else if (mef.includes('puerperio')) this.drawX(page, 166.0, 585.2, fontBold);
    else this.drawX(page, 302.0, 585.2, fontBold);

    // 12. AFECCIÓN PRINCIPAL & COMORBILIDADES
    this.drawAt(page, (datos.afeccion_principal || 'Tratamiento intrahospitalario').toUpperCase(), 105.0, 563.0, fontBold, 6.5, 415);
    const cieMain = (datos.afeccion_principal_cie || 'Z000').replace('.', '').toUpperCase();
    this.drawBoxes(page, cieMain, 525.0, 562.0, 8.16, fontBold, 6.5, 5);
    if (datos.afeccion_primera_vez !== false) this.drawX(page, 108.0, 553.4, fontBold); else this.drawX(page, 172.0, 553.4, fontBold);

    const comorbs = Array.isArray(datos.comorbilidades) ? datos.comorbilidades : (typeof datos.comorbilidades === 'string' ? JSON.parse(datos.comorbilidades || '[]') : []);
    const comorbY = [542.0, 530.8, 519.6, 508.4, 497.2, 486.0];
    for (let i = 0; i < Math.min(comorbs.length, comorbY.length); i++) {
      const it = comorbs[i];
      const desc = typeof it === 'string' ? it : (it.diagnostico || it.nombre || '');
      const cie = typeof it === 'object' ? (it.cie10 || it.codigo || '') : '';
      this.drawAt(page, String(desc).toUpperCase(), 75.0, comorbY[i], font, 6.5, 440);
      if (cie) this.drawBoxes(page, String(cie).replace('.', '').toUpperCase(), 525.0, comorbY[i], 8.16, fontBold, 6.5, 5);
    }

    if (datos.causa_externa) this.drawAt(page, String(datos.causa_externa).toUpperCase(), 60.0, 454.0, font, 6.5, 500);
    if (datos.infeccion_intrahospitalaria) this.drawX(page, 147.0, 442.5, fontBold); else this.drawX(page, 175.0, 442.5, fontBold);

    // 13. PROCEDIMIENTOS (8 FILAS)
    const procs = Array.isArray(datos.procedimientos_quirurgicos) ? datos.procedimientos_quirurgicos : (typeof datos.procedimientos_quirurgicos === 'string' ? (datos.procedimientos_quirurgicos.startsWith('[') ? JSON.parse(datos.procedimientos_quirurgicos) : [datos.procedimientos_quirurgicos]) : []);
    const procY = [405.5, 394.9, 384.2, 373.6, 362.8, 352.2, 341.4, 330.9];
    for (let i = 0; i < Math.min(procs.length, procY.length); i++) {
      const it = procs[i];
      const desc = typeof it === 'string' ? it : (it.procedimiento || it.nombre || '');
      const cie9 = typeof it === 'object' ? (it.cie9 || it.codigo || '') : '';
      this.drawAt(page, String(desc).toUpperCase(), 68.0, procY[i], font, 6.5, 350);
      if (it.fuera_quirofano) {
        this.drawX(page, 456.0, procY[i], fontBold, 5.5);
      } else {
        this.drawX(page, 424.0, procY[i], fontBold, 5.5);
      }
      if (cie9) this.drawBoxes(page, String(cie9).replace('.', '').toUpperCase(), 523.0, procY[i], 8.16, fontBold, 6.5, 5);
    }

    // 14. ANESTESIA & LESIONES
    const anest = String(datos.tipo_anestesia || '').toLowerCase();
    if (anest.includes('general')) this.drawX(page, 118.0, 320.7, fontBold);
    else if (anest.includes('regional')) this.drawX(page, 166.0, 320.7, fontBold);
    else if (anest.includes('sedac')) this.drawX(page, 207.0, 320.7, fontBold);
    else if (anest.includes('local')) this.drawX(page, 246.0, 320.7, fontBold);
    else if (anest.includes('combin')) this.drawX(page, 278.0, 320.7, fontBold);
    else this.drawX(page, 326.0, 320.7, fontBold);

    if (datos.hoja_lesiones_violencia) {
      this.drawX(page, 525.0, 320.7, fontBold);
      if (datos.hoja_lesiones_folio) this.drawAt(page, String(datos.hoja_lesiones_folio), 475.0, 308.4, fontBold, 6.5);
    } else {
      this.drawX(page, 549.0, 320.7, fontBold);
    }

    // 15. GINECO-OBSTÉTRICA
    if (datos.gesta !== undefined || paciente.gesta !== undefined) {
      this.drawAt(page, String(datos.gesta ?? paciente.gesta ?? 0), 160.0, 293.9, fontBold, 7);
      this.drawAt(page, String(datos.para ?? paciente.para ?? 0), 212.0, 293.9, fontBold, 7);
      this.drawAt(page, String(datos.abortos ?? datos.aborto ?? paciente.aborto ?? 0), 262.0, 293.9, fontBold, 7);
      this.drawAt(page, String(datos.cesareas ?? datos.cesarea ?? paciente.cesarea ?? 0), 315.0, 293.9, fontBold, 7);
    }
    const sem = datos.semanas_gestacion || paciente.semanas_gestacion || '';
    if (sem) {
      this.drawAt(page, String(sem), 548.0, 293.9, fontBold, 7);
    }

    const tParto = String(datos.tipo_parto || '').toLowerCase();
    if (tParto.includes('eutóc') || tParto.includes('eutoc')) this.drawX(page, 175.0, 246.6, fontBold);
    else if (tParto.includes('distóc') || tParto.includes('distoc')) this.drawX(page, 207.0, 246.6, fontBold);
    else if (tParto.includes('cesár') || tParto.includes('cesar')) this.drawX(page, 254.0, 246.6, fontBold);

    const prod = String(datos.producto_embarazo || '').toLowerCase();
    if (prod.includes('gemelar')) this.drawX(page, 207.0, 226.0, fontBold);
    else if (prod.includes('tres')) this.drawX(page, 254.0, 226.0, fontBold);
    else if (prod.includes('únic') || prod.includes('unic')) this.drawX(page, 175.0, 226.0, fontBold);

    const pf = String(datos.metodo_planificacion_familiar || paciente.metodo_planificacion_familiar || '').toLowerCase();
    if (pf.includes('ningun')) this.drawX(page, 405.0, 275.2, fontBold);
    else if (pf.includes('oral')) this.drawX(page, 446.0, 275.2, fontBold);
    else if (pf.includes('mensual')) this.drawX(page, 493.0, 275.2, fontBold);
    else if (pf.includes('bimestral')) this.drawX(page, 406.0, 265.8, fontBold);
    else if (pf.includes('1 varilla') || pf.includes('una varilla')) this.drawX(page, 470.0, 265.8, fontBold);
    else if (pf.includes('cobre')) this.drawX(page, 406.0, 256.1, fontBold);
    else if (pf.includes('femenino')) this.drawX(page, 470.0, 256.1, fontBold);
    else if (pf.includes('masculino')) this.drawX(page, 405.0, 246.6, fontBold);
    else if (pf.includes('medicado')) this.drawX(page, 470.0, 246.6, fontBold);
    else if (pf.includes('parche')) this.drawX(page, 517.0, 246.6, fontBold);
    else if (pf.includes('otb')) this.drawX(page, 404.0, 237.0, fontBold);
    else if (pf.includes('otros') || pf.includes('otro')) this.drawX(page, 445.0, 237.0, fontBold);
    else if (pf.includes('trimestral')) this.drawX(page, 404.0, 226.0, fontBold);
    else if (pf.includes('2 varillas') || pf.includes('doble varilla')) this.drawX(page, 469.0, 226.0, fontBold);

    // 16. MÉDICO RESPONSABLE
    const medResp = datos.medico_responsable || paciente.medico_tratante || 'DR. ALEJANDRO MENDOZA VARGAS';
    const docParts = this.splitNombre(medResp);
    this.drawAt(page, docParts.nombres.toUpperCase(), 100.0, 76.7, fontBold, 7, 160);
    this.drawAt(page, docParts.primerApellido.toUpperCase(), 270.0, 76.7, fontBold, 7, 140);
    this.drawAt(page, docParts.segundoApellido.toUpperCase(), 420.0, 76.7, fontBold, 7, 140);
    if (datos.medico_curp) {
      this.drawBoxes(page, datos.medico_curp, 96.0, 61.6, 8.16, fontBold, 6.5, 18);
    }
    const medCed = datos.medico_cedula || 'CED1732599';
    this.drawBoxes(page, medCed, 330.0, 61.6, 8.16, fontBold, 6.5, 10);
    this.drawAt(page, 'FIRMA Y SELLO', 450.0, 61.6, fontBold, 6.5);

    const bytes = await doc.save();
    this.sendDoc(res, `SINBA14_${paciente.expediente_clinico || 'doc'}`, bytes);
  }
}
