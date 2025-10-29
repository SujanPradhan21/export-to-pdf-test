// src/app/services/save-pdf.service.ts
import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';

export interface PdfOptions {
  filename?: string;
  logoUrl?: string;
  logoBase64?: string;
  headerText?: string;
  footerLogoUrl?: string; // NEW: Footer logo
  footerLogoBase64?: string; // NEW: Footer logo base64
  showHeaderOn?:
    | 'all'
    | 'first'
    | 'all-except-first'
    | 'none'
    | number[]
    | ((pageNum: number) => boolean);
  showFooterOn?:
    | 'all'
    | 'first'
    | 'all-except-first'
    | 'none'
    | number[]
    | ((pageNum: number) => boolean);
}

@Injectable({
  providedIn: 'root',
})
export class SavePdfService {
  async generatePDF(
    contentElement: HTMLElement,
    options: PdfOptions = {}
  ): Promise<void> {
    const {
      filename = 'report.pdf',
      logoUrl,
      logoBase64,
      headerText = 'Company Name - Report',
      footerLogoUrl,
      footerLogoBase64,
      showHeaderOn = 'all',
      showFooterOn = 'all',
    } = options;

    // Load header logo if provided
    let headerLogoData: string | null = null;
    if (logoBase64) {
      headerLogoData = logoBase64;
    } else if (logoUrl) {
      headerLogoData = await this.loadImageAsBase64(logoUrl);
    }

    // Load footer logo if provided
    let footerLogoData: string | null = null;
    if (footerLogoBase64) {
      footerLogoData = footerLogoBase64;
    } else if (footerLogoUrl) {
      footerLogoData = await this.loadImageAsBase64(footerLogoUrl);
    }

    const pdf = new jsPDF('p', 'mm', 'a4');

    // Page dimensions
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const headerHeight = 25;
    const footerHeight = 30;
    const maxLineWidth = pageWidth - margin * 2;
    const contentStartY = headerHeight + margin;
    const contentMaxY = pageHeight - footerHeight - margin;

    let currentY = contentStartY;
    let pageNumber = 1;
    let floatingImage: {
      side: 'left' | 'right';
      width: number;
      x: number;
      endY: number;
    } | null = null;

    const shouldShowHeader = (pageNum: number) => {
      if (showHeaderOn === 'all') return true;
      if (showHeaderOn === 'first') return pageNum === 1;
      if (showHeaderOn === 'all-except-first') return pageNum !== 1;
      if (showHeaderOn === 'none') return false;
      if (Array.isArray(showHeaderOn)) return showHeaderOn.includes(pageNum);
      if (typeof showHeaderOn === 'function') return showHeaderOn(pageNum);
      return true;
    };
    const shouldShowFooter = (pageNum: number) => {
      if (showFooterOn === 'all') return true;
      if (showFooterOn === 'first') return pageNum === 1;
      if (showFooterOn === 'all-except-first') return pageNum !== 1;
      if (showFooterOn === 'none') return false;
      if (Array.isArray(showFooterOn)) return showFooterOn.includes(pageNum);
      if (typeof showFooterOn === 'function') return showFooterOn(pageNum);
      return true;
    };

    // Add header with logo
    const addHeader = (pageNum: number) => {
      if (!shouldShowHeader(pageNum)) return;

      if (headerLogoData) {
        const logoWidth = 20;
        const logoHeight = 20;
        const logoX = margin;
        const logoY = 5;

        try {
          pdf.addImage(
            headerLogoData,
            'PNG',
            logoX,
            logoY,
            logoWidth,
            logoHeight
          );
        } catch (e) {
          try {
            pdf.addImage(
              headerLogoData,
              'JPEG',
              logoX,
              logoY,
              logoWidth,
              logoHeight
            );
          } catch (err) {
            console.error('Failed to add header logo:', err);
          }
        }

        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(headerText, logoX + logoWidth + 5, 13);
      } else {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(headerText, pageWidth / 2, 10, { align: 'center' });
      }

      pdf.setLineWidth(0.5);
      pdf.line(margin, headerHeight, pageWidth - margin, headerHeight);
    };

    // Add footer with logo
    // Add footer with logo
    const addFooter = (pageNum: number) => {
      if (!shouldShowFooter(pageNum)) return;

      const footerStartY = pageHeight - footerHeight;
      //   pdf.setLineWidth(0.5);
      //   pdf.line(margin, footerStartY, pageWidth - margin, footerStartY);

      let footerLogoHeight = 0; // Track logo height if present

      if (footerLogoData) {
        const img = new Image();
        img.src = footerLogoData;
        // console.log(img.naturalWidth, '-----------width');
        // console.log(img.naturalHeight, '-----------height');

        // Convert pixel dimensions to mm
        const imgWidthMm = img.naturalWidth * 0.264583;
        const imgHeightMm = img.naturalHeight * 0.264583;

        // Calculate maximum available space in the footer
        const maxFooterWidth = pageWidth - margin * 2; // Available width
        const maxFooterHeight = footerHeight - 6; // Leave some padding (3mm top + 3mm bottom)

        // Calculate scaling factors to fit within footer bounds
        const scaleWidth = maxFooterWidth / imgWidthMm;
        const scaleHeight = maxFooterHeight / imgHeightMm;

        // Use the smaller scale factor to ensure it fits in both dimensions
        const scale = Math.min(scaleWidth, scaleHeight, 1); // Don't upscale if already smaller

        // Calculate final dimensions maintaining aspect ratio
        const footerLogoWidth = imgWidthMm * scale;
        footerLogoHeight = imgHeightMm * scale; // Store the calculated height
        const footerLogoX = margin;
        const footerLogoY = footerStartY + 3;

        try {
          pdf.addImage(
            footerLogoData,
            'PNG',
            footerLogoX,
            footerLogoY,
            footerLogoWidth,
            footerLogoHeight
          );
        } catch (e) {
          try {
            pdf.addImage(
              footerLogoData,
              'JPEG',
              footerLogoX,
              footerLogoY,
              footerLogoWidth,
              footerLogoHeight
            );
          } catch (err) {
            console.error('Failed to add footer logo:', err);
          }
        }
      }

      // Position page number: if footer image exists, place below it; otherwise use default position
      const footerTextY = footerLogoData
        ? footerStartY + 3 + footerLogoHeight + 3 // 3mm padding above image + image height + 3mm padding below
        : pageHeight - 10;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      //   pdf.text(`Page ${pageNum}`, pageWidth / 2, footerTextY, {
      //     align: 'center',
      //   });
      pdf.text(`Page ${pageNum}`, pageWidth - margin, footerTextY, {
        align: 'right',
      });
    };

    // Check if we need a new page
    const checkNewPage = (requiredHeight: number) => {
      if (currentY + requiredHeight > contentMaxY) {
        pdf.addPage();
        pageNumber++;
        addHeader(pageNumber);
        addFooter(pageNumber);
        currentY = contentStartY;
        return true;
      }
      return false;
    };

    // Add first page header and footer
    addHeader(pageNumber);
    addFooter(pageNumber);

    // Process the HTML content (NOW ASYNC)
    const processNode = async (node: Node): Promise<void> => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (text) {
          let textStartX = margin;
          let textWidth = maxLineWidth;

          if (floatingImage && currentY < floatingImage.endY) {
            if (floatingImage.side === 'left') {
              textStartX = margin + floatingImage.width;
              textWidth = maxLineWidth - floatingImage.width;
            } else if (floatingImage.side === 'right') {
              textWidth = maxLineWidth - floatingImage.width;
            }
          }

          const lines = pdf.splitTextToSize(text, textWidth);
          lines.forEach((line: string) => {
            // Check if we've cleared the float
            if (floatingImage && currentY >= floatingImage.endY) {
              floatingImage = null;
              textStartX = margin;
              textWidth = maxLineWidth;
            }

            // Recalculate for each line
            if (floatingImage && currentY < floatingImage.endY) {
              if (floatingImage.side === 'left') {
                textStartX = margin + floatingImage.width;
                textWidth = maxLineWidth - floatingImage.width;
              } else {
                textStartX = margin;
                textWidth = maxLineWidth - floatingImage.width;
              }
            }

            checkNewPage(7);
            pdf.text(line, textStartX, currentY);
            currentY += 7;
          });
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const tagName = element.tagName.toLowerCase();

        switch (tagName) {
          case 'h1':
            checkNewPage(12);
            pdf.setFontSize(20);
            pdf.setFont('helvetica', 'bold');
            const h1Text = element.textContent?.trim() || '';
            const h1Lines = pdf.splitTextToSize(h1Text, maxLineWidth);
            h1Lines.forEach((line: string) => {
              pdf.text(line, margin, currentY);
              currentY += 10;
            });
            currentY += 5;
            break;

          case 'h2':
            checkNewPage(10);
            currentY += 3;
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            const h2Text = element.textContent?.trim() || '';
            const h2Lines = pdf.splitTextToSize(h2Text, maxLineWidth);
            h2Lines.forEach((line: string) => {
              pdf.text(line, margin, currentY);
              currentY += 8;
            });
            currentY += 3;
            break;

          case 'h3':
            checkNewPage(8);
            currentY += 2;
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            const h3Text = element.textContent?.trim() || '';
            const h3Lines = pdf.splitTextToSize(h3Text, maxLineWidth);
            h3Lines.forEach((line: string) => {
              pdf.text(line, margin, currentY);
              currentY += 7;
            });
            currentY += 2;
            break;

          case 'p':
            checkNewPage(7);
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'normal');
            const pText = element.textContent?.trim() || '';

            // Calculate available text width based on floating image
            let textStartX = margin;
            let textWidth = maxLineWidth;

            if (floatingImage && currentY < floatingImage.endY) {
              if (floatingImage.side === 'left') {
                textStartX = margin + floatingImage.width;
                textWidth = maxLineWidth - floatingImage.width;
              } else if (floatingImage.side === 'right') {
                textWidth = maxLineWidth - floatingImage.width;
              }
            }

            const pLines = pdf.splitTextToSize(pText, textWidth);
            pLines.forEach((line: string) => {
              // Check if we've cleared the floating image
              if (floatingImage && currentY >= floatingImage.endY) {
                floatingImage = null;
                textStartX = margin;
                textWidth = maxLineWidth;
              }

              // Recalculate text position for each line
              if (floatingImage && currentY < floatingImage.endY) {
                if (floatingImage.side === 'left') {
                  textStartX = margin + floatingImage.width;
                  textWidth = maxLineWidth - floatingImage.width;
                } else if (floatingImage.side === 'right') {
                  textStartX = margin;
                  textWidth = maxLineWidth - floatingImage.width;
                }
              }

              checkNewPage(7);
              pdf.text(line, textStartX, currentY);
              currentY += 6;
            });
            currentY += 3;
            break;

          case 'ul':
          case 'ol':
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'normal');
            const items = element.querySelectorAll('li');
            items.forEach((li, index) => {
              const bullet = tagName === 'ul' ? '•' : `${index + 1}.`;
              const liText = li.textContent?.trim() || '';
              const liLines = pdf.splitTextToSize(liText, maxLineWidth - 10);

              liLines.forEach((line: string, lineIndex: number) => {
                checkNewPage(7);
                if (lineIndex === 0) {
                  pdf.text(bullet, margin + 2, currentY);
                  pdf.text(line, margin + 10, currentY);
                } else {
                  pdf.text(line, margin + 10, currentY);
                }
                currentY += 6;
              });
            });
            currentY += 3;
            break;

          case 'img':
            const imgElement = element as HTMLImageElement;
            const imgSrc = imgElement.src;

            if (imgSrc) {
              try {
                const imgData = await this.loadImageAsBase64(imgSrc);

                // Get rendered dimensions in pixels
                const imgWidthPx = imgElement.width;
                const imgHeightPx = imgElement.height;

                // Convert to mm
                let imgWidth = imgWidthPx * 0.264583;
                let imgHeight = imgHeightPx * 0.264583;

                // Get float style
                const computedStyle = window.getComputedStyle(imgElement);
                const float = computedStyle.float || 'none';

                // Parse margins
                const marginRight =
                  parseFloat(computedStyle.marginRight) * 0.264583 || 2;
                const marginLeft =
                  parseFloat(computedStyle.marginLeft) * 0.264583 || 2;
                const marginBottom =
                  parseFloat(computedStyle.marginBottom) * 0.264583 || 2;

                // Scale down if needed (consider float space)
                const maxImgWidth =
                  float === 'none' ? maxLineWidth : maxLineWidth * 0.5;
                if (imgWidth > maxImgWidth) {
                  const scale = maxImgWidth / imgWidth;
                  imgWidth = maxImgWidth;
                  imgHeight = imgHeight * scale;
                }

                console.log(
                  `Image: ${imgWidth}mm x ${imgHeight}mm, float: ${float}`
                );

                // Check if we need a new page
                if (currentY + imgHeight > contentMaxY) {
                  pdf.addPage();
                  pageNumber++;
                  addHeader(pageNumber);
                  addFooter(pageNumber);
                  currentY = contentStartY;
                  floatingImage = null; // Reset float on new page
                }

                let imgX = margin;
                let imgY = currentY;

                if (float === 'left') {
                  // Image on left, text flows on right
                  imgX = margin;
                  pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth, imgHeight);

                  floatingImage = {
                    side: 'left',
                    x: margin,
                    width: imgWidth + marginRight,
                    endY: currentY + imgHeight + marginBottom,
                  };
                  // Don't advance currentY - let text flow next to it
                } else if (float === 'right') {
                  // Image on right, text flows on left
                  imgX = pageWidth - margin - imgWidth;
                  pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth, imgHeight);

                  floatingImage = {
                    side: 'right',
                    x: imgX - marginLeft,
                    width: imgWidth + marginLeft,
                    endY: currentY + imgHeight + marginBottom,
                  };
                  // Don't advance currentY - let text flow next to it
                } else {
                  // No float - center image or full width
                  imgX = margin + (maxLineWidth - imgWidth) / 2;
                  pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth, imgHeight);
                  currentY += imgHeight + 5;
                  floatingImage = null;
                }
              } catch (error) {
                console.error('Failed to load image:', error);
              }
            }
            break;
          default:
            // Process children for other elements
            for (const child of Array.from(element.childNodes)) {
              await processNode(child);
            }
            break;
        }
      }
    };

    // Process all child nodes sequentially
    for (const node of Array.from(contentElement.childNodes)) {
      await processNode(node);
    }

    // Save the PDF
    pdf.save(filename);
  }

  // Helper method to load external url image as base64
  private loadImageAsBase64(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataURL = canvas.toDataURL('image/png');
          resolve(dataURL);
        } else {
          reject(new Error('Failed to get canvas context'));
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
  }
}
