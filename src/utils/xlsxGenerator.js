import JSZip from 'jszip';

/**
 * Generates a valid .xlsx file with basic styling using JSZip.
 * @param {Array<string[]>} headers - Array of header strings
 * @param {Array<Array<string|number>>} rows - Array of row data
 * @param {string} sheetName - Name of the worksheet
 * @param {string} title - Optional title for the sheet
 * @param {Array<{label: string, value: string}>} metadata - Optional metadata key-value pairs
 * @returns {Promise<Blob>} - The generated XLSX file as a Blob
 */
export const generateXlsx = async (headers, rows, sheetName = 'Sheet1', title = '', metadata = []) => {
    const zip = new JSZip();

    // 1. [Content_Types].xml
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="xml" ContentType="application/xml"/>
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
    <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
    <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
    <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`);

    // 2. _rels/.rels
    zip.folder('_rels').file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`);

    // 3. xl/workbook.xml
    zip.folder('xl').file('workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
    <sheets>
        <sheet name="${sheetName}" sheetId="1" r:id="rId1"/>
    </sheets>
</workbook>`);

    // 4. xl/_rels/workbook.xml.rels
    zip.folder('xl').folder('_rels').file('workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
    <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
    <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`);

    // 5. xl/styles.xml (Styling definitions)
    // sId=0: Default
    // sId=1: Header (Orange fill, White text, Bold, Border)
    // sId=2: Cell (Border)
    // sId=3: Title/Metadata (Bold, No Border)
    zip.folder('xl').file('styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
    <fonts count="2">
        <font><sz val="11"/><name val="Calibri"/></font>
        <font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font>
        <font><b/><sz val="12"/><name val="Calibri"/></font>
    </fonts>
    <fills count="3">
        <fill><patternFill patternType="none"/></fill>
        <fill><patternFill patternType="gray125"/></fill>
        <fill><patternFill patternType="solid"><fgColor rgb="FFF97316"/></patternFill></fill> 
    </fills>
    <borders count="2">
        <border><left/><right/><top/><bottom/><diagonal/></border>
        <border>
            <left style="thin"><color auto="1"/></left>
            <right style="thin"><color auto="1"/></right>
            <top style="thin"><color auto="1"/></top>
            <bottom style="thin"><color auto="1"/></bottom>
            <diagonal/>
        </border>
    </borders>
    <cellStyleXfs count="1">
        <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
    </cellStyleXfs>
    <cellXfs count="4">
        <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/> 
        <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
        <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
        <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    </cellXfs>
</styleSheet>`);

    // 6. Shared Strings (Optimization)
    const uniqueStrings = new Set();
    const addString = (str) => {
        if (str === null || str === undefined) return -1;
        const s = String(str);
        uniqueStrings.add(s);
    };

    if (title) addString(title);
    if (metadata) {
        metadata.forEach(item => {
            addString(item.label);
            addString(item.value);
        });
    }
    headers.forEach(h => addString(h));
    rows.forEach(r => r.forEach(c => addString(c)));

    const sortedStrings = Array.from(uniqueStrings);
    const stringMap = new Map();
    sortedStrings.forEach((s, i) => stringMap.set(s, i));

    let sharedStringsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst count="${uniqueStrings.size}" uniqueCount="${uniqueStrings.size}" xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`;
    sortedStrings.forEach(s => {
        // Simple escaping
        const escaped = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        sharedStringsXml += `<si><t>${escaped}</t></si>`;
    });
    sharedStringsXml += `</sst>`;
    zip.folder('xl').file('sharedStrings.xml', sharedStringsXml);

    // 7. xl/worksheets/sheet1.xml
    let sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
    <cols>
        ${headers.map((_, i) => `<col min="${i+1}" max="${i+1}" width="20" customWidth="1"/>`).join('')}
    </cols>
    <sheetData>`;

    let currentRow = 1;

    // Title Row
    if (title) {
        const strIdx = stringMap.get(title);
        sheetXml += `<row r="${currentRow}" spans="1:1">
            <c r="A${currentRow}" s="3" t="s"><v>${strIdx}</v></c>
        </row>`;
        currentRow++;
    }

    // Metadata Rows
    if (metadata && metadata.length > 0) {
        metadata.forEach(item => {
            const labelIdx = stringMap.get(item.label);
            const valueIdx = stringMap.get(item.value);
            sheetXml += `<row r="${currentRow}" spans="1:2">
                <c r="A${currentRow}" s="3" t="s"><v>${labelIdx}</v></c>
                <c r="B${currentRow}" t="s"><v>${valueIdx}</v></c>
            </row>`;
            currentRow++;
        });
        currentRow++; // Add an empty row after metadata
    }

    // Header Row (s="1")
    sheetXml += `<row r="${currentRow}" spans="1:${headers.length}">`;
    headers.forEach((h, i) => {
        const strIdx = stringMap.get(String(h));
        const colRef = getColRef(i);
        sheetXml += `<c r="${colRef}${currentRow}" s="1" t="s"><v>${strIdx}</v></c>`;
    });
    sheetXml += `</row>`;
    currentRow++;

    // Data Rows (s="2")
    rows.forEach((row) => {
        sheetXml += `<row r="${currentRow}" spans="1:${headers.length}">`;
        row.forEach((cell, cIdx) => {
            const colRef = getColRef(cIdx);
            if (typeof cell === 'number') {
                sheetXml += `<c r="${colRef}${currentRow}" s="2"><v>${cell}</v></c>`;
            } else if (cell !== null && cell !== undefined && cell !== '') {
                const strIdx = stringMap.get(String(cell));
                sheetXml += `<c r="${colRef}${currentRow}" s="2" t="s"><v>${strIdx}</v></c>`;
            } else {
                sheetXml += `<c r="${colRef}${currentRow}" s="2"/>`;
            }
        });
        sheetXml += `</row>`;
        currentRow++;
    });

    sheetXml += `</sheetData></worksheet>`;
    zip.folder('xl').folder('worksheets').file('sheet1.xml', sheetXml);

    return await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

// Helper: 0 -> A, 1 -> B, ... 26 -> AA
const getColRef = (idx) => {
    let dividend = idx + 1;
    let columnName = '';
    let modulo;

    while (dividend > 0) {
        modulo = (dividend - 1) % 26;
        columnName = String.fromCharCode(65 + modulo) + columnName;
        dividend = Math.floor((dividend - modulo) / 26);
    }
    return columnName;
};
