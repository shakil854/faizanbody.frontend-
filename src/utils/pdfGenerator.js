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
  const html2pdf = await ensureHtml2PdfLoaded();

  // Create an off-screen sandbox container at fixed desktop A4 width (794px = standard A4 width at 96 DPI)
  // This guarantees:
  // 1. scrollY is ALWAYS 0 (never cuts off top header / Truck No / Shade No!)
  // 2. Mobile screen width doesn't squash or wrap table cells
  // 3. Independent of modal scroll state or user scroll position
  const sandbox = document.createElement('div');
  sandbox.id = 'pdf-render-sandbox';
  sandbox.style.position = 'fixed';
  sandbox.style.top = '0px';
  sandbox.style.left = '0px';
  sandbox.style.width = '794px';
  sandbox.style.backgroundColor = '#ffffff';
  sandbox.style.zIndex = '-99999';
  sandbox.style.opacity = '0.01'; // Visible to DOM/canvas engine, hidden to user
  sandbox.style.pointerEvents = 'none';
  sandbox.style.overflow = 'visible';

  // Clone the printable element
  const clone = element.cloneNode(true);
  clone.id = 'pdf-printable-clone';
  clone.style.width = '794px';
  clone.style.maxWidth = '794px';
  clone.style.margin = '0';
  clone.style.padding = '20px 24px';
  clone.style.boxSizing = 'border-box';
  clone.style.backgroundColor = '#ffffff';
  clone.style.color = '#000000';

  // Ensure all signatures and images are properly linked in clone
  const origImages = element.querySelectorAll('img');
  const cloneImages = clone.querySelectorAll('img');
  cloneImages.forEach((cImg, i) => {
    if (origImages[i]) {
      cImg.src = origImages[i].src;
    }
  });

  sandbox.appendChild(clone);
  document.body.appendChild(sandbox);

  // Allow DOM to finish layout calculation
  await new Promise((r) => setTimeout(r, 80));

  try {
    const opt = {
      margin: [6, 6, 6, 6],
      filename: customFileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollY: 0,
        scrollX: 0,
        windowWidth: 794,
        x: 0,
        y: 0,
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
      },
      pagebreak: {
        mode: ['css', 'legacy'],
        before: '.html2pdf__page-break',
      },
    };

    const worker = html2pdf().set(opt).from(clone);
    const blob = await worker.output('blob');
    return blob;
  } finally {
    if (document.body.contains(sandbox)) {
      document.body.removeChild(sandbox);
    }
  }
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
