/**
 * Client-Side PDF Generation and Sharing Utility
 * Uses html2pdf.js with an isolated, fixed-width A4 sandbox clone
 * ensuring scroll position, mobile viewport, or transforms NEVER cut off headers or content.
 */

export async function ensureHtml2PdfLoaded() {
  if (window.html2pdf) return window.html2pdf;

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="html2pdf"]');
    if (existing) {
      if (window.html2pdf) return resolve(window.html2pdf);
      existing.addEventListener('load', () => resolve(window.html2pdf));
      existing.addEventListener('error', () => reject(new Error('Failed to load html2pdf library')));
      
      let attempts = 0;
      const interval = setInterval(() => {
        if (window.html2pdf) {
          clearInterval(interval);
          resolve(window.html2pdf);
        } else if (++attempts > 30) {
          clearInterval(interval);
          reject(new Error('html2pdf load timeout'));
        }
      }, 150);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = () => resolve(window.html2pdf);
    script.onerror = () => reject(new Error('Failed to load html2pdf engine'));
    document.head.appendChild(script);
  });
}

/**
 * Generate PDF Blob from an HTML element using an isolated sandbox
 */
export async function generatePdfBlob(element, customFileName = 'Order_Slip.pdf') {
  await ensureHtml2PdfLoaded();

  const getJsPdf = () => {
    if (window.jspdf && window.jspdf.jsPDF) return window.jspdf.jsPDF;
    if (typeof window.jsPDF === 'function') return window.jsPDF;
    return null;
  };

  const JsPdf = getJsPdf();
  const html2canvas = window.html2canvas;

  const renderPageCanvas = async (domElem) => {
    const sbox = document.createElement('div');
    sbox.style.position = 'fixed';
    sbox.style.top = '0px';
    sbox.style.left = '0px';
    sbox.style.width = '720px';
    sbox.style.backgroundColor = '#ffffff';
    sbox.style.zIndex = '-99999';
    sbox.style.visibility = 'visible';
    sbox.style.opacity = '1';
    sbox.style.overflow = 'visible';

    const clone = domElem.cloneNode(true);
    clone.style.width = '720px';
    clone.style.maxWidth = '720px';
    clone.style.boxSizing = 'border-box';
    clone.style.backgroundColor = '#ffffff';

    const origImgs = domElem.querySelectorAll('img');
    const cloneImgs = clone.querySelectorAll('img');
    cloneImgs.forEach((img, i) => {
      if (origImgs[i]) img.src = origImgs[i].src;
    });

    sbox.appendChild(clone);
    document.body.appendChild(sbox);

    await new Promise((r) => setTimeout(r, 60));
    const cvs = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      scrollY: 0,
      scrollX: 0,
      x: 0,
      y: 0,
      width: 720,
      windowWidth: 720,
      logging: false,
    });

    document.body.removeChild(sbox);
    return cvs;
  };

  // Check if printing 2-page full order (has #pdf-page-1 and #pdf-page-2)
  const p1 = document.getElementById('pdf-page-1');
  const p2 = document.getElementById('pdf-page-2');

  if (p1 && p2 && JsPdf && html2canvas) {
    const canvas1 = await renderPageCanvas(p1);
    const canvas2 = await renderPageCanvas(p2);

    const pdf = new JsPdf('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
    const margin = 8;
    const printWidth = pdfWidth - (margin * 2); // 194mm

    // PAGE 1
    const imgData1 = canvas1.toDataURL('image/jpeg', 0.98);
    const printHeight1 = (canvas1.height * printWidth) / canvas1.width;
    pdf.addImage(imgData1, 'JPEG', margin, margin, printWidth, Math.min(printHeight1, pdfHeight - (margin * 2)));

    // PAGE 2 (EXACTLY 2 PAGES TOTAL!)
    pdf.addPage();
    const imgData2 = canvas2.toDataURL('image/jpeg', 0.98);
    const printHeight2 = (canvas2.height * printWidth) / canvas2.width;
    pdf.addImage(imgData2, 'JPEG', margin, margin, printWidth, Math.min(printHeight2, pdfHeight - (margin * 2)));

    return pdf.output('blob');
  }

  // Single Page Slip (1 Page)
  const singleTarget = document.getElementById('pdf-single-page') || element;
  if (JsPdf && html2canvas && singleTarget) {
    const cvs = await renderPageCanvas(singleTarget);

    const pdf = new JsPdf('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const printWidth = pdfWidth - (margin * 2);
    const printHeight = (cvs.height * printWidth) / cvs.width;
    const imgData = cvs.toDataURL('image/jpeg', 0.98);
    pdf.addImage(imgData, 'JPEG', margin, margin, printWidth, Math.min(printHeight, pdfHeight - (margin * 2)));

    return pdf.output('blob');
  }

  // Fallback
  const html2pdf = window.html2pdf;
  const worker = html2pdf().set({
    margin: [8, 8, 8, 8],
    filename: customFileName,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, width: 720 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  }).from(element);
  return await worker.output('blob');
}

/**
 * Share PDF file directly (WhatsApp, Telegram, Android Share Sheet, etc.)
 */
export async function sharePdfFile({
  elementId = 'printableSheet',
  fileName = 'FaizanBody_JobSheet.pdf',
  title = 'Faizan Body Works - Job Slip',
  text = 'Faizan Body Works Job Sheet PDF',
}) {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Printable sheet element not found');
  }

  const pdfBlob = await generatePdfBlob(element, fileName);
  const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

  // If browser supports native file sharing (Android Chrome, WebView, iOS Safari)
  if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    try {
      await navigator.share({
        files: [pdfFile],
        title,
        text,
      });
      return { success: true, method: 'shared' };
    } catch (err) {
      if (err.name === 'AbortError') {
        return { success: false, cancelled: true };
      }
      console.warn('Navigator share error, falling back to download:', err);
    }
  }

  // Fallback: Trigger direct file download
  const downloadUrl = URL.createObjectURL(pdfBlob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 3000);

  return { success: true, method: 'downloaded' };
}

/**
 * Direct Download PDF to device storage
 */
export async function downloadPdfFile({
  elementId = 'printableSheet',
  fileName = 'FaizanBody_JobSheet.pdf',
}) {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Printable sheet element not found');
  }

  const pdfBlob = await generatePdfBlob(element, fileName);
  const downloadUrl = URL.createObjectURL(pdfBlob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 3000);

  return { success: true };
}
