/**
 * Export Utility Functions
 * These functions help users download data from the application
 */

// This function takes data from our app and lets users download it as CSV or JSON files
// Think of it like "Save As" functionality - users can export their survey data
export const exportData = (headers, data, filename, format) => {
  // If user wants CSV format (like an Excel file)
  if (format === 'csv') {
    // Build the CSV content step by step
    const csvContent = [
      // First line: column headers separated by commas
      headers.join(','),
      
      // Then add all the data rows
      ...data.map(row => 
        headers.map(header => {
          // Get the value for this column, or empty string if missing
          const value = row[header] || '';
          
          // If the value contains a comma, wrap it in quotes so CSV readers understand it
          return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
        }).join(',') // Join all columns in this row with commas
      )
    ].join('\n'); // Join all rows with line breaks
    
    // Now create the actual file and trigger the download
    // Create a "blob" (think of it as the file contents)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create an invisible download link
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob); // Point the link to our file
    link.download = `${filename}.csv`; // Set the filename
    
    // Automatically click the link to start the download
    link.click();
  } else if (format === 'json') {
    // If user wants JSON format (great for developers or data analysis)
    
    // Convert the data to a nicely formatted JSON string
    // The "null, 2" makes it pretty-printed with 2-space indentation
    const jsonContent = JSON.stringify(data, null, 2);
    
    // Same download process as CSV, but with JSON file type
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.json`; // Note the .json extension
    link.click();
  }
  
  // Note: If someone passes an unsupported format, nothing happens
  // We could add error handling here if needed
};