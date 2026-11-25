import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Converts a Blob to pure Base64 string (without data: URL prefix)
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl === 'string') {
        const commaIdx = dataUrl.indexOf(',');
        resolve(commaIdx !== -1 ? dataUrl.substring(commaIdx + 1) : dataUrl);
      } else {
        resolve('');
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Client-Side PDF Generation and Sharing Utility
 * Uses bundled jsPDF and html2canvas with an isolated, fixed-width A4 sandbox clone
 * ensuring scroll position, mobile viewport, or transforms NEVER cut off headers or content.
 */

export async function ensureHtml2PdfLoaded() {
  if (typeof window !== 'undefined') {
    if (!window.jspdf) window.jspdf = { jsPDF };
    if (!window.jsPDF) window.jsPDF = jsPDF;
    if (!window.html2canvas) window.html2canvas = html2canvas;
  }
  return true;
}

/**
 * Generate PDF Blob from an HTML element using an isolated sandbox
 */
export async function generatePdfBlob(element, customFileName = 'Order_Slip.pdf', onProgress = null) {
  await ensureHtml2PdfLoaded();

  const getJsPdf = () => {
    if (window.jspdf && window.jspdf.jsPDF) return window.jspdf.jsPDF;
    if (typeof window.jsPDF === 'function') return window.jsPDF;
    return null;
  };

  const JsPdf = getJsPdf();
  const html2canvas = window.html2canvas;

  const renderPageCanvas = async (domElem, customScale = 2) => {
    if (!domElem) throw new Error('Target element is null');

    // Wait for fonts to finish loading so text is crisp and visible
    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch (e) {
        // ignore font errors
      }
    }

    const sbox = document.createElement('div');
    sbox.id = 'pdf-render-sandbox';
    sbox.style.position = 'fixed';
    sbox.style.top = '0px';
    sbox.style.left = '0px';
    sbox.style.width = '720px';
    sbox.style.backgroundColor = '#ffffff';
    sbox.style.zIndex = '-9999';
    sbox.style.visibility = 'visible';
    sbox.style.opacity = '1';
    sbox.style.overflow = 'hidden';
    sbox.style.pointerEvents = 'none';

    const clone = domElem.cloneNode(true);
    // Ensure clone is positioned at (0,0) and never retains offscreen (-9999px) styles
    clone.style.position = 'relative';
    clone.style.left = '0px';
    clone.style.top = '0px';
    clone.style.right = 'auto';
    clone.style.bottom = 'auto';
    clone.style.transform = 'none';
    clone.style.margin = '0px';
    clone.style.width = '720px';
    clone.style.maxWidth = '720px';
    clone.style.minWidth = '720px';
    clone.style.boxSizing = 'border-box';
    clone.style.backgroundColor = '#ffffff';
    clone.style.color = '#0f172a';
    clone.style.display = 'block';
    clone.style.visibility = 'visible';
    clone.style.opacity = '1';
    clone.style.boxShadow = 'none';

    // Ensure clone always has adequate padding so right-aligned elements (like quotation numbers) never clip
    if (!clone.style.padding || clone.style.padding === '0px') {
      const computedPad = window.getComputedStyle ? window.getComputedStyle(domElem).padding : '';
      if (!computedPad || computedPad === '0px') {
        clone.style.padding = '24px 28px';
      }
    }

    // Strip any negative coordinates or fixed positions from children
    clone.querySelectorAll('*').forEach((el) => {
      if (
        el.style.left === '-9999px' ||
        el.style.position === 'fixed' ||
        (el.style.position === 'absolute' && el.style.left && el.style.left.startsWith('-'))
      ) {
        el.style.position = 'relative';
        el.style.left = '0px';
        el.style.top = '0px';
      }
    });

    // Copy images and enable CORS
    const origImgs = domElem.querySelectorAll('img');
    const cloneImgs = clone.querySelectorAll('img');
    cloneImgs.forEach((img, i) => {
      if (origImgs[i]) {
        img.crossOrigin = 'anonymous';
        img.src = origImgs[i].src;
      }
    });

    // Copy canvas drawings (e.g. digital signatures)
    const origCanvases = domElem.querySelectorAll('canvas');
    const cloneCanvases = clone.querySelectorAll('canvas');
    origCanvases.forEach((origCvs, i) => {
      const targetCvs = cloneCanvases[i];
      if (targetCvs) {
        targetCvs.width = origCvs.width;
        targetCvs.height = origCvs.height;
        const ctx = targetCvs.getContext('2d');
        if (ctx) ctx.drawImage(origCvs, 0, 0);
      }
    });

    try {
      sbox.appendChild(clone);
      document.body.appendChild(sbox);

      // Wait for DOM layout calculation and paint
      await new Promise((r) => setTimeout(r, 120));

      const targetHeight = Math.max(clone.scrollHeight, clone.offsetHeight, 400);

      // Fixed x:0, y:0, width:720 prevents html2canvas from scrolling off-screen to blank white!
      const cvs = await html2canvas(clone, {
        scale: customScale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        scrollY: 0,
        scrollX: 0,
        x: 0,
        y: 0,
        width: 720,
        height: targetHeight,
        windowWidth: 720,
        logging: false,
      });

      return cvs;
    } finally {
      if (sbox && sbox.parentNode) {
        sbox.parentNode.removeChild(sbox);
      }
    }
  };

  // Check if target has explicit .pdf-page elements (e.g. Worker Khata Statements or multi-page reports)
  const allPdfPages = element.querySelectorAll('.pdf-page');
  const activeJsPdf = jsPDF || JsPdf;
  const activeH2C = html2canvas || window.html2canvas;

  if (allPdfPages.length > 0 && activeJsPdf && activeH2C) {
    const pdf = new activeJsPdf('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 6;
    const printWidth = pdfWidth - margin * 2;
    const availableHeight = pdfHeight - margin * 2;

    const totalCount = allPdfPages.length;
    // High-definition crisp rendering settings:
    // Scale 1.5 produces razor-sharp 1080px width (Retina DPI) for clean text & borders
    // Quality 0.94 preserves maximum clarity without JPEG compression blur
    const renderScale = 1.5;
    const jpegQuality = 0.94;

    // Pre-allocate all pages in jsPDF upfront
    for (let p = 1; p < totalCount; p++) {
      pdf.addPage();
    }

    // Determine optimal worker pool concurrency based on available CPU cores (typically 3 to 4)
    const hardwareThreads =
      typeof navigator !== 'undefined' && navigator.hardwareConcurrency
        ? navigator.hardwareConcurrency
        : 4;
    const poolSize = Math.min(
      totalCount,
      Math.min(4, Math.max(2, hardwareThreads >= 4 ? hardwareThreads - 1 : 2))
    );

    // Create pool of persistent, isolated sandbox iframes
    const iframes = [];
    for (let i = 0; i < poolSize; i++) {
      const ifr = document.createElement('iframe');
      ifr.id = `pdf-fast-sandbox-${i}`;
      ifr.style.cssText =
        'position:fixed;top:0;left:-9999px;width:720px;height:1050px;border:none;visibility:visible;opacity:1;pointer-events:none;z-index:-9999;';
      document.body.appendChild(ifr);
      const sDoc = ifr.contentDocument || ifr.contentWindow.document;
      sDoc.open();
      sDoc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body {
          margin: 0;
          padding: 0;
          background: #ffffff;
          color: #0f172a;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
        }
      </style></head><body><div id="render-mount"></div></body></html>`);
      sDoc.close();
      iframes.push(ifr);
    }

    let nextPageIndex = 0;
    let completedPages = 0;

    const runWorker = async (iframe) => {
      const sDoc = iframe.contentDocument || iframe.contentWindow.document;
      const mount = sDoc.getElementById('render-mount');

      while (true) {
        const pageIdx = nextPageIndex++;
        if (pageIdx >= totalCount) break;

        const srcPage = allPdfPages[pageIdx];
        mount.innerHTML = '';

        const clone = sDoc.importNode(srcPage, true);
        clone.style.position = 'relative';
        clone.style.left = '0px';
        clone.style.top = '0px';
        clone.style.margin = '0px';
        clone.style.width = '720px';
        clone.style.maxWidth = '720px';
        clone.style.boxSizing = 'border-box';
        clone.style.backgroundColor = '#ffffff';
        mount.appendChild(clone);

        const targetHeight = Math.max(clone.scrollHeight || 0, clone.offsetHeight || 0, 1000);

        try {
          const canvas = await activeH2C(clone, {
            scale: renderScale,
            useCORS: false,
            allowTaint: false,
            backgroundColor: '#ffffff',
            scrollY: 0,
            scrollX: 0,
            x: 0,
            y: 0,
            width: 720,
            height: targetHeight,
            windowWidth: 720,
            logging: false,
            imageTimeout: 0,
            window: iframe.contentWindow,
            document: sDoc,
          });

          const imgData = canvas.toDataURL('image/jpeg', jpegQuality);
          const printHeight = (canvas.height * printWidth) / canvas.width;

          // Directly insert into the specific pre-allocated page of jsPDF
          pdf.setPage(pageIdx + 1);
          if (printHeight <= availableHeight) {
            pdf.addImage(imgData, 'JPEG', margin, margin, printWidth, printHeight, undefined, 'FAST');
          } else {
            const scale = availableHeight / printHeight;
            const finalWidth = printWidth * scale;
            const finalHeight = printHeight * scale;
            const xOffset = margin + (printWidth - finalWidth) / 2;
            pdf.addImage(imgData, 'JPEG', xOffset, margin, finalWidth, finalHeight, undefined, 'FAST');
          }

          // Immediately clear canvas buffers to prevent heap bloat and GC pauses
          canvas.width = 0;
          canvas.height = 0;
        } catch (pageErr) {
          console.warn(`Error rendering PDF page ${pageIdx + 1}:`, pageErr);
        } finally {
          mount.innerHTML = '';
          completedPages++;
          if (onProgress) {
            onProgress({ current: completedPages, total: totalCount });
          }
        }
      }
    };

    try {
      await Promise.all(iframes.map((ifr) => runWorker(ifr)));
      return pdf.output('blob');
    } finally {
      iframes.forEach((ifr) => {
        if (ifr && ifr.parentNode) {
          ifr.parentNode.removeChild(ifr);
        }
      });
    }
  }

  // Check if target has 2-page full order (Page 1 + Page 2) scoped to the element
  const p1 = element.querySelector('#pdf-page-1');
  const p2 = element.querySelector('#pdf-page-2');

  if (p1 && p2 && JsPdf && html2canvas) {
    const canvas1 = await renderPageCanvas(p1);
    const canvas2 = await renderPageCanvas(p2);

    const pdf = new JsPdf('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
    const margin = 6;
    const printWidth = pdfWidth - (margin * 2); // 198mm

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

  // Single Page Slip (1 Page) - scoped to element (Job slip or Stock Order Slip)
  const singleTarget = element.querySelector('#pdf-single-page') || element;
  if (JsPdf && html2canvas && singleTarget) {
    const cvs = await renderPageCanvas(singleTarget);

    const pdf = new JsPdf('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 6;
    const printWidth = pdfWidth - (margin * 2);
    const printHeight = (cvs.height * printWidth) / cvs.width;
    const imgData = cvs.toDataURL('image/jpeg', 0.98);

    const availableHeight = pdfHeight - (margin * 2);
    if (printHeight <= availableHeight) {
      pdf.addImage(imgData, 'JPEG', margin, margin, printWidth, printHeight);
    } else {
      // Proportionally scale to fit on single A4 sheet without clipping details
      const scale = availableHeight / printHeight;
      const finalWidth = printWidth * scale;
      const finalHeight = printHeight * scale;
      const xOffset = margin + (printWidth - finalWidth) / 2;
      pdf.addImage(imgData, 'JPEG', xOffset, margin, finalWidth, finalHeight);
    }

    return pdf.output('blob');
  }

  // Fallback
  const html2pdf = window.html2pdf;
  const worker = html2pdf().set({
    margin: [4, 4, 4, 4],
    filename: customFileName,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, width: 720, windowWidth: 720, x: 0, y: 0, scrollX: 0, scrollY: 0 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'] },
  }).from(element);
  return await worker.output('blob');
}

/**
 * Share PDF file directly (WhatsApp, Android Share Sheet, etc.)
 * Strictly shares the pure PDF file without unwanted text or URLs.
 */
export async function sharePdfFile({
  elementId = 'printableSheet',
  fileName = 'FaizanBody_JobSheet.pdf',
  onProgress = null,
}) {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Printable sheet element not found');
  }

  const pdfBlob = await generatePdfBlob(element, fileName, onProgress);
  const cleanFileName = (fileName || 'FaizanBody_JobSheet.pdf')
    .replace(/[^\w\.-]/gi, '_')
    .replace(/_+/g, '_');
  const safeFileName = cleanFileName.endsWith('.pdf') ? cleanFileName : `${cleanFileName}.pdf`;

  // 1. CAPACITOR ANDROID NATIVE SHARING (Opens WhatsApp with pure PDF file)
  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = await blobToBase64(pdfBlob);
      if (base64Data) {
        const writeRes = await Filesystem.writeFile({
          path: safeFileName,
          data: base64Data,
          directory: Directory.Cache,
          recursive: true,
        });

        let targetUri = writeRes?.uri;
        if (!targetUri) {
          const uriResult = await Filesystem.getUri({
            path: safeFileName,
            directory: Directory.Cache,
          });
          targetUri = uriResult?.uri;
        }

        if (targetUri) {
          await Share.share({
            files: [targetUri],
            dialogTitle: 'Share PDF via WhatsApp',
          });
          return { success: true, method: 'capacitor_share' };
        }
      }
    } catch (nativeErr) {
      if (
        nativeErr?.message?.includes('cancel') ||
        nativeErr?.message?.includes('closed') ||
        nativeErr?.name === 'AbortError'
      ) {
        return { success: false, cancelled: true };
      }
      console.warn('Capacitor native PDF share failed, trying Web Share API:', nativeErr);
    }
  }

  // 2. WEB BROWSER NATIVE FILE SHARING (Android Chrome, etc.)
  const pdfFile = new File([pdfBlob], safeFileName, { type: 'application/pdf' });
  if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    try {
      await navigator.share({
        files: [pdfFile],
      });
      return { success: true, method: 'shared' };
    } catch (err) {
      if (err.name === 'AbortError') {
        return { success: false, cancelled: true };
      }
      console.warn('Navigator share error, falling back to download:', err);
    }
  }

  // 3. Fallback: Browser download via Blob URL
  const downloadUrl = URL.createObjectURL(pdfBlob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = safeFileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 4000);

  return { success: true, method: 'downloaded' };
}

/**
 * Direct Download PDF to device storage
 */
export async function downloadPdfFile({
  elementId = 'printableSheet',
  fileName = 'FaizanBody_JobSheet.pdf',
  onProgress = null,
}) {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Printable sheet element not found');
  }

  const pdfBlob = await generatePdfBlob(element, fileName, onProgress);
  const cleanFileName = (fileName || 'FaizanBody_JobSheet.pdf')
    .replace(/[^\w\.-]/gi, '_')
    .replace(/_+/g, '_');
  const safeFileName = cleanFileName.endsWith('.pdf') ? cleanFileName : `${cleanFileName}.pdf`;

  // 1. CAPACITOR ANDROID NATIVE DOWNLOAD
  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = await blobToBase64(pdfBlob);
      if (base64Data) {
        let savedUri = null;

        // Try writing to Documents directory
        try {
          const res = await Filesystem.writeFile({
            path: safeFileName,
            data: base64Data,
            directory: Directory.Documents,
            recursive: true,
          });
          savedUri = res?.uri;
        } catch {
          // Fallback to Cache directory if Documents permissions blocked
          const res = await Filesystem.writeFile({
            path: safeFileName,
            data: base64Data,
            directory: Directory.Cache,
            recursive: true,
          });
          savedUri = res?.uri;
        }

        if (savedUri) {
          // Open Android native share / view sheet so user can view with PDF viewer or save
          try {
            await Share.share({
              files: [savedUri],
              dialogTitle: 'PDF Downloaded - View or Save',
            });
          } catch {
            // Dismissed by user is fine
          }
          return { success: true, uri: savedUri };
        }
      }
    } catch (nativeErr) {
      console.warn('Capacitor PDF download failed, falling back to web download:', nativeErr);
    }
  }

  // 2. WEB BROWSER DOWNLOAD
  const downloadUrl = URL.createObjectURL(pdfBlob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = safeFileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 4000);

  return { success: true };
}
