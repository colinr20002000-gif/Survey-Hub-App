import * as htmlToImage from 'html-to-image';
import jsPDF from 'jspdf';

/**
 * Export inspection details as an image (PNG)
 * @param {HTMLElement} element - The DOM element to capture
 * @param {string} vehicleName - Vehicle name for the filename
 * @param {string} date - Inspection date for the filename
 * @param {string} registration - Vehicle registration for the filename
 */
export const exportAsImage = async (element, vehicleName = 'vehicle', date = 'inspection', registration = '') => {
    let styleElement = null;
    try {
        // Create a style element with print-friendly colors
        styleElement = document.createElement('style');
        styleElement.id = 'export-override-styles';
        styleElement.textContent = `
            /* Force readable text colors for export - catch all gray text variants */
            .inspection-export-wrapper *,
            .inspection-export-wrapper p,
            .inspection-export-wrapper span,
            .inspection-export-wrapper div,
            .inspection-export-wrapper h1,
            .inspection-export-wrapper h2,
            .inspection-export-wrapper h3,
            .inspection-export-wrapper h4,
            .inspection-export-wrapper h5,
            .inspection-export-wrapper h6,
            .inspection-export-wrapper label,
            .inspection-export-wrapper .text-gray-100,
            .inspection-export-wrapper .text-gray-200,
            .inspection-export-wrapper .text-gray-300,
            .inspection-export-wrapper .text-gray-400,
            .inspection-export-wrapper .text-gray-500,
            .inspection-export-wrapper .text-gray-600,
            .inspection-export-wrapper .text-gray-700,
            .inspection-export-wrapper .text-gray-800,
            .inspection-export-wrapper .text-gray-900,
            .inspection-export-wrapper .text-white,
            .inspection-export-wrapper [class*="text-gray"] {
                color: #000000 !important;
            }

            /* Preserve status colors */
            .inspection-export-wrapper .text-green-600,
            .inspection-export-wrapper .text-green-500,
            .inspection-export-wrapper .text-green-400,
            .inspection-export-wrapper [class*="text-green"] {
                color: #16a34a !important;
            }

            .inspection-export-wrapper .text-red-600,
            .inspection-export-wrapper .text-red-500,
            .inspection-export-wrapper .text-red-400,
            .inspection-export-wrapper [class*="text-red"] {
                color: #dc2626 !important;
            }

            /* Fix backgrounds */
            .inspection-export-wrapper .bg-gray-700,
            .inspection-export-wrapper .bg-gray-800,
            .inspection-export-wrapper .bg-gray-900,
            .inspection-export-wrapper [class*="bg-gray-7"],
            .inspection-export-wrapper [class*="bg-gray-8"],
            .inspection-export-wrapper [class*="bg-gray-9"] {
                background-color: #ffffff !important;
            }

            .inspection-export-wrapper .border-gray-700,
            .inspection-export-wrapper .border-gray-600,
            .inspection-export-wrapper [class*="border-gray"] {
                border-color: #d1d5db !important;
            }
        `;
        document.head.appendChild(styleElement);

        // Add wrapper class to element
        element.classList.add('inspection-export-wrapper');

        // Wait for styles to apply
        await new Promise(resolve => setTimeout(resolve, 100));

        // Create PNG from the element
        const dataUrl = await htmlToImage.toPng(element, {
            quality: 1.0,
            pixelRatio: 2,
            backgroundColor: '#ffffff',
            cacheBust: true
        });

        // Download the image
        const link = document.createElement('a');
        const fileName = registration
            ? `${registration}_${vehicleName}_inspection_${date}.png`.replace(/\s+/g, '_')
            : `${vehicleName}_inspection_${date}.png`.replace(/\s+/g, '_');
        link.href = dataUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        return { success: true };
    } catch (error) {
        console.error('Error exporting as image:', error);
        return { success: false, error: error.message };
    } finally {
        // Clean up
        if (element) {
            element.classList.remove('inspection-export-wrapper');
        }
        if (styleElement && styleElement.parentNode) {
            document.head.removeChild(styleElement);
        }
    }
};

/**
 * Generate inspection image blob (for zip export)
 * @param {HTMLElement} element - The DOM element to capture
 */
export const generateInspectionImageBlob = async (element) => {
    let styleElement = null;
    try {
        // Create a style element with print-friendly colors
        styleElement = document.createElement('style');
        styleElement.id = 'export-override-styles';
        styleElement.textContent = `
            /* Force readable text colors for export - catch all gray text variants */
            .inspection-export-wrapper *,
            .inspection-export-wrapper p,
            .inspection-export-wrapper span,
            .inspection-export-wrapper div,
            .inspection-export-wrapper h1,
            .inspection-export-wrapper h2,
            .inspection-export-wrapper h3,
            .inspection-export-wrapper h4,
            .inspection-export-wrapper h5,
            .inspection-export-wrapper h6,
            .inspection-export-wrapper label,
            .inspection-export-wrapper .text-gray-100,
            .inspection-export-wrapper .text-gray-200,
            .inspection-export-wrapper .text-gray-300,
            .inspection-export-wrapper .text-gray-400,
            .inspection-export-wrapper .text-gray-500,
            .inspection-export-wrapper .text-gray-600,
            .inspection-export-wrapper .text-gray-700,
            .inspection-export-wrapper .text-gray-800,
            .inspection-export-wrapper .text-gray-900,
            .inspection-export-wrapper .text-white,
            .inspection-export-wrapper [class*="text-gray"] {
                color: #000000 !important;
            }

            /* Preserve status colors */
            .inspection-export-wrapper .text-green-600,
            .inspection-export-wrapper .text-green-500,
            .inspection-export-wrapper .text-green-400,
            .inspection-export-wrapper [class*="text-green"] {
                color: #16a34a !important;
            }

            .inspection-export-wrapper .text-red-600,
            .inspection-export-wrapper .text-red-500,
            .inspection-export-wrapper .text-red-400,
            .inspection-export-wrapper [class*="text-red"] {
                color: #dc2626 !important;
            }

            /* Fix backgrounds */
            .inspection-export-wrapper .bg-gray-700,
            .inspection-export-wrapper .bg-gray-800,
            .inspection-export-wrapper .bg-gray-900,
            .inspection-export-wrapper [class*="bg-gray-7"],
            .inspection-export-wrapper [class*="bg-gray-8"],
            .inspection-export-wrapper [class*="bg-gray-9"] {
                background-color: #ffffff !important;
            }

            .inspection-export-wrapper .border-gray-700,
            .inspection-export-wrapper .border-gray-600,
            .inspection-export-wrapper [class*="border-gray"] {
                border-color: #d1d5db !important;
            }
        `;
        document.head.appendChild(styleElement);

        // Add wrapper class to element
        element.classList.add('inspection-export-wrapper');

        // Wait for styles to apply
        await new Promise(resolve => setTimeout(resolve, 100));

        // Create blob from the element
        const blob = await htmlToImage.toBlob(element, {
            quality: 1.0,
            pixelRatio: 2,
            backgroundColor: '#ffffff',
            cacheBust: true
        });

        return blob;
    } catch (error) {
        console.error('Error generating inspection blob:', error);
        throw error;
    } finally {
        // Clean up
        if (element) {
            element.classList.remove('inspection-export-wrapper');
        }
        if (styleElement && styleElement.parentNode) {
            document.head.removeChild(styleElement);
        }
    }
};

/**
 * Export inspection details as a PDF
 * @param {HTMLElement} element - The DOM element to capture
 * @param {string} vehicleName - Vehicle name for the filename
 * @param {string} date - Inspection date for the filename
 */
export const exportAsPDF = async (element, vehicleName = 'vehicle', date = 'inspection') => {
    try {
        // Create PNG from the element using html-to-image
        const dataUrl = await htmlToImage.toPng(element, {
            quality: 1.0,
            pixelRatio: 2,
            backgroundColor: '#ffffff',
            cacheBust: true,
            style: {
                margin: '0',
                padding: '0'
            }
        });

        // Create an image to get dimensions
        const img = new Image();
        img.src = dataUrl;

        await new Promise((resolve) => {
            img.onload = resolve;
        });

        // Calculate dimensions for PDF
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = (img.height * imgWidth) / img.width;

        // Create PDF
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        let heightLeft = imgHeight;
        let position = 0;

        // Add image to PDF (handle multi-page if needed)
        pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // Add additional pages if content is too long
        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        // Download PDF
        const fileName = `${vehicleName}_inspection_${date}.pdf`.replace(/\s+/g, '_');
        pdf.save(fileName);

        return { success: true };
    } catch (error) {
        console.error('Error exporting as PDF:', error);
        return { success: false, error: error.message };
    }
};
