import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * PDF生成和合并工具
 * 使用pdf-lib处理PDF文件
 */

interface SignatureData {
  pageNumber: number;
  x: number;        // 百分比
  y: number;        // 百分比
  width: number;    // 百分比
  height: number;   // 百分比
  text: string;
  type: 'signature' | 'date' | 'text' | 'name' | 'email' | 'initials';
}

/**
 * 在PDF上添加签名
 */
export async function addSignaturesToPDF(
  pdfBytes: ArrayBuffer,
  signatures: SignatureData[]
): Promise<Uint8Array> {
  // 加载PDF文档
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  
  // 加载字体
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // 处理每个签名
  for (const signature of signatures) {
    const pageIndex = signature.pageNumber - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;

    const page = pages[pageIndex];
    const { width: pageWidth, height: pageHeight } = page.getSize();

    // 转换百分比坐标到PDF坐标
    // PDF坐标系统：原点在左下角
    const x = (signature.x / 100) * pageWidth;
    const y = pageHeight - ((signature.y + signature.height) / 100) * pageHeight;
    const width = (signature.width / 100) * pageWidth;
    const height = (signature.height / 100) * pageHeight;

    // 根据类型选择字体和样式
    const font = signature.type === 'signature' ? helveticaBoldFont : helveticaFont;
    const fontSize = signature.type === 'signature' ? 14 : 12;
    const color = signature.type === 'signature' ? rgb(0, 0, 0.8) : rgb(0, 0, 0);

    // 绘制文本
    if (signature.text) {
      // 计算文本大小以居中显示
      const textWidth = font.widthOfTextAtSize(signature.text, fontSize);
      const textHeight = font.heightAtSize(fontSize);
      
      // 居中文本
      const textX = x + (width - textWidth) / 2;
      const textY = y + (height - textHeight) / 2;

      page.drawText(signature.text, {
        x: textX,
        y: textY,
        size: fontSize,
        font,
        color,
      });

      // 为签名添加下划线
      if (signature.type === 'signature') {
        page.drawLine({
          start: { x: x, y: y - 2 },
          end: { x: x + width, y: y - 2 },
          thickness: 1,
          color: rgb(0.5, 0.5, 0.5),
        });
      }
    }
  }

  // 保存修改后的PDF
  return await pdfDoc.save();
}

/**
 * 合并多个PDF文件
 */
export async function mergePDFs(pdfBytesArray: ArrayBuffer[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  for (const pdfBytes of pdfBytesArray) {
    const pdf = await PDFDocument.load(pdfBytes);
    const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    pages.forEach((page) => mergedPdf.addPage(page));
  }

  return await mergedPdf.save();
}

/**
 * 获取PDF的页数
 */
export async function getPDFPageCount(pdfBytes: ArrayBuffer): Promise<number> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  return pdfDoc.getPageCount();
}

/**
 * 下载PDF文件
 */
export function downloadPDF(pdfBytes: Uint8Array, filename: string) {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * 从URL获取PDF文件
 */
export async function fetchPDFFromURL(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: ${response.statusText}`);
  }
  return await response.arrayBuffer();
}

/**
 * 生成签名后的PDF文件名
 */
export function generateSignedPDFName(originalName: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const nameWithoutExt = originalName.replace(/\.pdf$/i, '');
  return `${nameWithoutExt}_signed_${timestamp}.pdf`;
}