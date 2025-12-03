import React, { useState, useMemo } from 'react';
import { Modal, Button, Input } from '../ui';
import { CheckCircle, AlertTriangle, Calendar, Download, Loader2, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import JSZip from 'jszip';
import InspectionDetailModal from './InspectionDetailModal';

const InspectionExportWizard = ({ isOpen, onClose, vehicles, inspections }) => {
    const [step, setStep] = useState(1);
    const [selectedVehicleIds, setSelectedVehicleIds] = useState([]);
    const [dateRange, setDateRange] = useState({
        start: '',
        end: new Date().toISOString().split('T')[0]
    });
    const [isExporting, setIsExporting] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    
    // State for processing one inspection at a time
    const [currentProcessingInspection, setCurrentProcessingInspection] = useState(null);
    const [processingQueue, setProcessingQueue] = useState([]);
    const [zipInstance, setZipInstance] = useState(null);

    // Filter inspections based on current selection
    const filteredInspections = useMemo(() => {
        let filtered = inspections;

        // Filter by vehicles
        if (selectedVehicleIds.length > 0) {
            filtered = filtered.filter(i => selectedVehicleIds.includes(i.vehicle_id));
        }

        // Filter by date
        if (dateRange.start) {
            filtered = filtered.filter(i => i.inspection_date >= dateRange.start);
        }
        if (dateRange.end) {
            filtered = filtered.filter(i => i.inspection_date <= dateRange.end);
        }

        return filtered;
    }, [inspections, selectedVehicleIds, dateRange]);

    // Reset state when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setStep(1);
            setSelectedVehicleIds([]);
            setDateRange({
                start: '',
                end: new Date().toISOString().split('T')[0]
            });
            setIsExporting(false);
            setProgress({ current: 0, total: 0 });
            setCurrentProcessingInspection(null);
            setProcessingQueue([]);
            setZipInstance(null);
        }
    }, [isOpen]);

    const handleVehicleToggle = (vehicleId) => {
        setSelectedVehicleIds(prev => {
            if (prev.includes(vehicleId)) {
                return prev.filter(id => id !== vehicleId);
            } else {
                return [...prev, vehicleId];
            }
        });
    };

    const handleSelectAllVehicles = () => {
        if (selectedVehicleIds.length === vehicles.length) {
            setSelectedVehicleIds([]);
        } else {
            setSelectedVehicleIds(vehicles.map(v => v.id));
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const startExport = () => {
        if (filteredInspections.length === 0) return;

        setIsExporting(true);
        setProgress({ current: 0, total: filteredInspections.length });
        
        const zip = new JSZip();
        setZipInstance(zip);
        
        // Start processing the first inspection
        setProcessingQueue([...filteredInspections]);
    };

    // Effect to process the queue
    React.useEffect(() => {
        if (isExporting && processingQueue.length > 0 && !currentProcessingInspection) {
            // Take the next item from the queue
            const nextInspection = processingQueue[0];
            setCurrentProcessingInspection(nextInspection);
        } else if (isExporting && processingQueue.length === 0 && !currentProcessingInspection && zipInstance) {
            // Queue is empty, finalize zip
            finalizeExport();
        }
    }, [isExporting, processingQueue, currentProcessingInspection, zipInstance]);

    const handleCaptureComplete = async (blob) => {
        if (!currentProcessingInspection || !zipInstance) return;

        try {
            const inspection = currentProcessingInspection;
            const folderName = `Vehicle_Inspections_Export_${new Date().toISOString().split('T')[0]}`;
            const folder = zipInstance.folder(folderName);

            // Generate filename
            const vehicleName = inspection.vehicles?.name || 'vehicle';
            const registration = inspection.vehicles?.serial_number || '';
            const date = formatDate(inspection.inspection_date).replace(/\s+/g, '-');
            const filename = registration 
                ? `${registration}_${vehicleName}_${date}.png`.replace(/\s+/g, '_')
                : `${vehicleName}_${date}.png`.replace(/\s+/g, '_');

            folder.file(filename, blob);

            // Update progress
            setProgress(prev => ({ ...prev, current: prev.current + 1 }));

            // Remove processed item from queue and clear current
            setProcessingQueue(prev => prev.slice(1));
            setCurrentProcessingInspection(null);

        } catch (err) {
            console.error(`Failed to process inspection`, err);
            // Skip this one and continue
            setProcessingQueue(prev => prev.slice(1));
            setCurrentProcessingInspection(null);
        }
    };

    const finalizeExport = async () => {
        try {
            const folderName = `Vehicle_Inspections_Export_${new Date().toISOString().split('T')[0]}`;
            const content = await zipInstance.generateAsync({ type: "blob" });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `${folderName}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

            onClose();
        } catch (error) {
            console.error('Error generating zip:', error);
            alert('Failed to generate export. Please try again.');
        } finally {
            setIsExporting(false);
            setZipInstance(null);
        }
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={!isExporting ? onClose : undefined} title="Export Inspection Wizard">
                <div className="p-6">
                    {/* Progress Bar */}
                    <div className="mb-6">
                        <div className="flex justify-between mb-2">
                            <span className={`text-xs font-medium ${step >= 1 ? 'text-orange-600' : 'text-gray-400'}`}>Step 1: Select Vehicles</span>
                            <span className={`text-xs font-medium ${step >= 2 ? 'text-orange-600' : 'text-gray-400'}`}>Step 2: Date Range</span>
                            <span className={`text-xs font-medium ${step >= 3 ? 'text-orange-600' : 'text-gray-400'}`}>Step 3: Export</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                            <div className="bg-orange-600 h-2.5 rounded-full" style={{ width: `${(step / 3) * 100}%` }}></div>
                        </div>
                    </div>

                    {/* Step 1: Select Vehicles */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Select Vehicles</h3>
                                <Button variant="ghost" size="sm" onClick={handleSelectAllVehicles}>
                                    {selectedVehicleIds.length === vehicles.length ? 'Deselect All' : 'Select All'}
                                </Button>
                            </div>
                            <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                                {vehicles.length > 0 ? (
                                    vehicles.map(vehicle => (
                                        <div key={vehicle.id} className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
                                            <input
                                                type="checkbox"
                                                id={`vehicle-${vehicle.id}`}
                                                checked={selectedVehicleIds.includes(vehicle.id)}
                                                onChange={() => handleVehicleToggle(vehicle.id)}
                                                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                                            />
                                            <label htmlFor={`vehicle-${vehicle.id}`} className="ml-3 block text-sm text-gray-700 dark:text-gray-300 cursor-pointer w-full">
                                                <span className="font-medium">{vehicle.name}</span>
                                                <span className="text-gray-500 ml-2">({vehicle.serial_number || 'No Reg'})</span>
                                            </label>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-gray-500 py-4">No vehicles found</p>
                                )}
                            </div>
                            <div className="text-sm text-gray-500 text-right">
                                {selectedVehicleIds.length} vehicle(s) selected
                            </div>
                        </div>
                    )}

                    {/* Step 2: Select Date Range */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Select Date Range</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Date</label>
                                    <Input
                                        type="date"
                                        value={dateRange.start}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To Date</label>
                                    <Input
                                        type="date"
                                        value={dateRange.end}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Review & Export */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Review & Export</h3>
                            
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">Selected Vehicles:</span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{selectedVehicleIds.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">Date Range:</span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {dateRange.start ? new Date(dateRange.start).toLocaleDateString() : 'Beginning'} - {dateRange.end ? new Date(dateRange.end).toLocaleDateString() : 'Now'}
                                    </span>
                                </div>
                                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                                    <div className="flex justify-between items-center">
                                        <span className="text-base font-semibold text-gray-900 dark:text-white">Inspections to Export:</span>
                                        <span className="text-lg font-bold text-orange-600">{filteredInspections.length}</span>
                                    </div>
                                </div>
                            </div>

                            {isExporting && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm text-gray-500">
                                        <span>Exporting...</span>
                                        <span>{progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                        <div 
                                            className="bg-green-500 h-2.5 rounded-full transition-all duration-300" 
                                            style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-xs text-center text-gray-400">
                                        Processing {progress.current} of {progress.total}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="mt-8 flex justify-between">
                        {step > 1 ? (
                            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={isExporting}>
                                <ChevronLeft className="w-4 h-4 mr-1" /> Back
                            </Button>
                        ) : (
                            <div /> // Spacer
                        )}

                        {step < 3 ? (
                            <Button onClick={() => setStep(step + 1)} disabled={step === 1 && selectedVehicleIds.length === 0}>
                                Next <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        ) : (
                            <Button onClick={startExport} disabled={isExporting || filteredInspections.length === 0} className="bg-orange-600 hover:bg-orange-700">
                                {isExporting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Exporting...
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-4 h-4 mr-2" />
                                        Download Zip
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Hidden Off-screen Render Area for Export */}
            {currentProcessingInspection && (
                <div style={{
                    position: 'fixed',
                    left: '-9999px',
                    top: '0',
                    width: '800px',
                    zIndex: -1,
                    backgroundColor: '#ffffff'
                }}>
                    <InspectionDetailModal
                        inspection={currentProcessingInspection}
                        autoExport={true}
                        captureMode={true}
                        onCaptureComplete={handleCaptureComplete}
                        onClose={() => {}} // No-op for off-screen render
                    />
                </div>
            )}
        </>
    );
};

export default InspectionExportWizard;
