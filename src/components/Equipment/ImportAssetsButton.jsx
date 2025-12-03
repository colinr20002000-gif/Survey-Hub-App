import React, { useState, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { Button } from '../ui';
import { Upload } from 'lucide-react';

const ImportAssetsButton = () => {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const parseCSV = (text) => {
        const lines = text.split('\n');
        // Headers are assumed to be fixed as per requirement
        
        const result = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const row = [];
            let inQuotes = false;
            let currentValue = '';

            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                if (char === '"') {
                    if (inQuotes && line[j + 1] === '"') {
                        currentValue += '"';
                        j++; // Skip next quote
                    } else {
                        inQuotes = !inQuotes;
                    }
                } else if (char === ',' && !inQuotes) {
                    row.push(currentValue.trim());
                    currentValue = '';
                } else {
                    currentValue += char;
                }
            }
            row.push(currentValue.trim());

            // Map to object based on column index
            // Headers: Asset Tag no., New Asset Tag, Equipment Type, Description, Serial No., Quantity, Kit Group, Assigned To, Last Checked
            // Indexes: 0, 1, 2, 3, 4, 5, 6, 7, 8
            
            if (row.length >= 4) { // Ensure basic fields exist
                result.push({
                    asset_tag: row[0] || null,
                    new_asset_tag: row[1] || null,
                    category: row[2] || 'Uncategorized',
                    description: row[3] || 'No Description',
                    name: row[3] || 'Unknown Asset', // Use description as name
                    serial_number: (row[4] === 'N/A' || row[4] === '') ? null : row[4],
                    quantity: parseInt(row[5]) || 1,
                    kit_group: row[6] || null,
                    assigned_to_text: row[7] || null,
                    last_checked: parseDate(row[8]),
                    is_asset: true,
                    status: 'available'
                });
            }
        }
        return result;
    };

    const parseDate = (dateStr) => {
        if (!dateStr) return null;
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            // DD/MM/YYYY -> YYYY-MM-DD
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return null;
    };

    const processFile = async (file) => {
        setUploading(true);
        const reader = new FileReader();

        reader.onload = async (e) => {
            const text = e.target.result;
            try {
                let data = parseCSV(text);
                console.log('Parsed Data:', data);

                // Client-side deduplication for serial_number within the CSV data itself
                const seenSerials = new Set();
                data = data.filter(item => {
                    if (item.serial_number) {
                        if (seenSerials.has(item.serial_number)) {
                            console.warn(`Duplicate serial number found in CSV, skipping: ${item.serial_number}`);
                            return false;
                        }
                        seenSerials.add(item.serial_number);
                    }
                    return true;
                });

                // Batch insert (Supabase handles batches, but let's do chunks of 50 to be safe)
                const chunkSize = 50;
                for (let i = 0; i < data.length; i += chunkSize) {
                    const chunk = data.slice(i, i + chunkSize);
                    
                    // Use upsert with ignoreDuplicates to skip existing serial numbers
                    const { error } = await supabase
                        .from('equipment')
                        .upsert(chunk, { onConflict: 'serial_number', ignoreDuplicates: true })
                        .select(); 

                    if (error) {
                        console.error('Error inserting chunk:', error);
                        throw error; 
                    }
                }

                alert(`Successfully imported assets!`);
                window.location.reload(); // Refresh to show data
            } catch (error) {
                console.error('Import failed:', error);
                alert('Import failed: ' + error.message);
            } finally {
                setUploading(false);
                if (fileInputRef.current) {
                    fileInputRef.current.value = ''; // Reset input
                }
            }
        };

        reader.onerror = () => {
            console.error('File reading failed');
            alert('Failed to read file');
            setUploading(false);
        };

        reader.readAsText(file);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (window.confirm(`Import data from "${file.name}"?`)) {
                processFile(file);
            } else {
                e.target.value = ''; // Reset if cancelled
            }
        }
    };

    const handleButtonClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    return (
        <>
            <input 
                type="file" 
                accept=".csv" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={handleFileChange} 
            />
            <Button 
                onClick={handleButtonClick} 
                disabled={uploading}
                variant="outline"
                className="flex items-center gap-2"
            >
                <Upload className="w-4 h-4" />
                {uploading ? 'Importing...' : 'Import CSV'}
            </Button>
        </>
    );
};

export default ImportAssetsButton;