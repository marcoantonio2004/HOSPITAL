import path from 'path';
import fs from 'fs';
import Module from 'module';

/**
 * En Vercel Services (`@vercel/backends`), el entrypoint compilado se monta en
 * `/var/task/index.js` mientras que las dependencias instaladas quedan trazadas
 * bajo `/var/task/backend/node_modules`. Se agregan estas rutas al resolvedor
 * global de Node.js antes de importar Express o cualquier dependencia externa.
 */
const extraNodeModules = [
  path.resolve(__dirname, 'backend/node_modules'),
  path.resolve(__dirname, '../backend/node_modules'),
  path.resolve(process.cwd(), 'backend/node_modules'),
  '/var/task/backend/node_modules',
];

const existing = process.env.NODE_PATH
  ? process.env.NODE_PATH.split(path.delimiter).filter(Boolean)
  : [];

let updated = false;
for (const dir of extraNodeModules) {
  if (!existing.includes(dir)) {
    existing.push(dir);
    updated = true;
  }
}

if (updated) {
  process.env.NODE_PATH = existing.join(path.delimiter);
  const modAny = Module as unknown as {
    _initPaths?: () => void;
    globalPaths?: string[];
  };
  if (typeof modAny._initPaths === 'function') {
    modAny._initPaths();
  }
  if (Array.isArray(modAny.globalPaths)) {
    for (const dir of extraNodeModules) {
      if (!modAny.globalPaths.includes(dir)) {
        modAny.globalPaths.push(dir);
      }
    }
  }
}

/**
 * Referencias estáticas de archivo para que el analizador @vercel/nft incluya
 * las fuentes estándar y el perfil ICC que PDFKit carga dinámicamente.
 */
export function __nftPdfKitHints(): boolean {
  if (process.env.__NFT_TRACE_PDFKIT === '1') {
    return (
      fs.existsSync(path.join(__dirname, '../node_modules/pdfkit/js/standard-fonts/Helvetica.cjs')) &&
      fs.existsSync(path.join(__dirname, '../node_modules/pdfkit/js/standard-fonts/HelveticaBold.cjs')) &&
      fs.existsSync(path.join(__dirname, '../node_modules/pdfkit/js/standard-fonts/HelveticaOblique.cjs')) &&
      fs.existsSync(path.join(__dirname, '../node_modules/pdfkit/js/standard-fonts/HelveticaBoldOblique.cjs')) &&
      fs.existsSync(path.join(__dirname, '../node_modules/pdfkit/js/standard-fonts/TimesRoman.cjs')) &&
      fs.existsSync(path.join(__dirname, '../node_modules/pdfkit/js/standard-fonts/TimesBold.cjs')) &&
      fs.existsSync(path.join(__dirname, '../node_modules/pdfkit/js/standard-fonts/TimesItalic.cjs')) &&
      fs.existsSync(path.join(__dirname, '../node_modules/pdfkit/js/standard-fonts/TimesBoldItalic.cjs')) &&
      fs.existsSync(path.join(__dirname, '../node_modules/pdfkit/js/standard-fonts/Courier.cjs')) &&
      fs.existsSync(path.join(__dirname, '../node_modules/pdfkit/js/standard-fonts/CourierBold.cjs')) &&
      fs.existsSync(path.join(__dirname, '../node_modules/pdfkit/js/standard-fonts/CourierOblique.cjs')) &&
      fs.existsSync(path.join(__dirname, '../node_modules/pdfkit/js/standard-fonts/CourierBoldOblique.cjs')) &&
      fs.existsSync(path.join(__dirname, '../node_modules/pdfkit/js/standard-fonts/Symbol.cjs')) &&
      fs.existsSync(path.join(__dirname, '../node_modules/pdfkit/js/standard-fonts/ZapfDingbats.cjs')) &&
      fs.existsSync(path.join(__dirname, '../node_modules/pdfkit/js/standard-fonts/chunks/standardGlyphNames-DNHAb7rp.cjs')) &&
      fs.existsSync(path.join(__dirname, '../node_modules/pdfkit/js/data/sRGB_IEC61966_2_1.icc'))
    );
  }
  return false;
}
