import React, { useState, useRef, useEffect } from 'react';
import { Modal, Button } from '../ui';
import { CheckCircle, X, Camera, ZoomIn, Download, Loader2 } from 'lucide-react';
import { exportAsImage, exportAsPDF, generateInspectionImageBlob } from '../../utils/inspectionExport';

// Inspection Detail Modal Component
const InspectionDetailModal = ({ inspection, onClose, autoExport = false, onExportComplete, captureMode = false, onCaptureComplete }) => {
    const [viewingImage, setViewingImage] = useState(null);
    const [exporting, setExporting] = useState(false);
    const contentRef = useRef(null);
    const [hasAutoExported, setHasAutoExported] = useState(false);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const handleDownloadImage = async (imageUrl) => {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `vehicle-inspection-photo-${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading image:', error);
            alert('Failed to download image');
        }
    };

    const handleExportAsImage = async () => {
        if (!contentRef.current) return;

        setExporting(true);

        // Store original styles
        const originalMaxHeight = contentRef.current.style.maxHeight;
        const originalOverflow = contentRef.current.style.overflow;
        const originalHeight = contentRef.current.style.height;

        try {
            // Temporarily remove scroll constraints to capture full content
            contentRef.current.style.maxHeight = 'none';
            contentRef.current.style.overflow = 'visible';
            contentRef.current.style.height = 'auto';

            // Wait for layout to settle
            await new Promise(resolve => setTimeout(resolve, 200));

            // If in capture mode, return blob instead of downloading
            if (captureMode && onCaptureComplete) {
                const blob = await generateInspectionImageBlob(contentRef.current);
                onCaptureComplete(blob);
            } else {
                // Normal export (download)
                const vehicleName = inspection.vehicles?.name || 'vehicle';
                const date = formatDate(inspection.inspection_date).replace(/\s+/g, '-');
                const result = await exportAsImage(contentRef.current, vehicleName, date, '');

                if (!result.success) {
                    alert(`Failed to export as image: ${result.error}`);
                }
            }
        } catch (error) {
            console.error('Error exporting as image:', error);
            if (!captureMode) alert('Failed to export as image');
        } finally {
            // Restore original styles
            contentRef.current.style.maxHeight = originalMaxHeight;
            contentRef.current.style.overflow = originalOverflow;
            contentRef.current.style.height = originalHeight;

            setExporting(false);

            // If auto-exporting, call completion callback
            if (autoExport && onExportComplete) {
                onExportComplete();
            }
        }
    };

    // Auto-export effect
    useEffect(() => {
        if (autoExport && contentRef.current && !hasAutoExported && !exporting) {
            setHasAutoExported(true);
            // Wait for component to fully render, including images
            // Using a longer timeout to ensure everything (like images) is ready
            setTimeout(() => {
                if (contentRef.current) {
                    handleExportAsImage();
                }
            }, 1000); 
        }
    }, [autoExport, hasAutoExported, exporting]);

    const handleExportAsPDF = async () => {
        if (!contentRef.current) return;

        setExporting(true);

        // Store original styles
        const originalMaxHeight = contentRef.current.style.maxHeight;
        const originalOverflow = contentRef.current.style.overflow;
        const originalHeight = contentRef.current.style.height;

        try {
            // Temporarily remove scroll constraints to capture full content
            contentRef.current.style.maxHeight = 'none';
            contentRef.current.style.overflow = 'visible';
            contentRef.current.style.height = 'auto';

            // Add export mode class to force black text
            contentRef.current.classList.add('export-mode');

            // Wait for styles to apply
            await new Promise(resolve => setTimeout(resolve, 200));

            const vehicleName = inspection.vehicles?.name || 'vehicle';
            const date = formatDate(inspection.inspection_date).replace(/\s+/g, '-');
            const result = await exportAsPDF(contentRef.current, vehicleName, date);

            if (!result.success) {
                alert(`Failed to export as PDF: ${result.error}`);
            }
        } catch (error) {
            console.error('Error exporting as PDF:', error);
            alert('Failed to export as PDF');
        } finally {
            // Remove export mode class
            contentRef.current.classList.remove('export-mode');

            // Restore original styles
            contentRef.current.style.maxHeight = originalMaxHeight;
            contentRef.current.style.overflow = originalOverflow;
            contentRef.current.style.height = originalHeight;

            setExporting(false);
        }
    };

    const getCheckIcon = (value) => {
        if (value === 'satisfactory') return <CheckCircle className="w-4 h-4 text-green-600" />;
        if (value === 'defective') return <X className="w-4 h-4 text-red-600" />;
        return <span className="text-xs text-gray-400">N/A</span>;
    };

    const getCheckLabel = (value) => {
        if (value === 'satisfactory') return 'Satisfactory';
        if (value === 'defective') return 'Defective';
        return 'N/A';
    };

    const CheckItem = ({ label, value }) => (
        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
            <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
            <div className="flex items-center space-x-2">
                {getCheckIcon(value)}
                <span className={`text-sm font-medium ${
                    value === 'satisfactory' ? 'text-green-600' :
                    value === 'defective' ? 'text-red-600' :
                    'text-gray-400'
                }`}>
                    {getCheckLabel(value)}
                </span>
            </div>
        </div>
    );

    // If auto-exporting, render content without Modal wrapper
    const content = (
        <div ref={contentRef} className={autoExport ? "p-6 bg-white min-w-[700px]" : "flex-1 overflow-y-auto p-6"}>
                    {/* Header Info */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                        <div className="grid grid-cols-2 gap-4">
                            {inspection.vehicles && (
                                <>
                                    <div>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">Vehicle:</span>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {inspection.vehicles.name}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">Registration:</span>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {inspection.vehicles.serial_number || 'N/A'}
                                        </p>
                                    </div>
                                </>
                            )}
                            <div>
                                <span className="text-sm text-gray-500 dark:text-gray-400">Date:</span>
                                <p className="font-medium text-gray-900 dark:text-white">
                                    {formatDate(inspection.inspection_date)}
                                </p>
                            </div>
                            <div>
                                <span className="text-sm text-gray-500 dark:text-gray-400">Mileage:</span>
                                <p className="font-medium text-gray-900 dark:text-white">
                                    {inspection.mileage?.toLocaleString() || 'N/A'}
                                </p>
                            </div>
                            {inspection.users && (
                                <div>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">Inspector:</span>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {inspection.users.name}
                                    </p>
                                </div>
                            )}
                            <div>
                                <span className="text-sm text-gray-500 dark:text-gray-400">Status:</span>
                                <p className={`font-medium ${inspection.has_defects ? 'text-red-600' : 'text-green-600'}`}>
                                    {inspection.has_defects ? 'Has Defects' : 'All Clear'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Fluids Section */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                            <span className="mr-2">💧</span> Fluids
                        </h3>
                        <div className="space-y-1">
                            <CheckItem label="Engine Oil" value={inspection.check_engine_oil} />
                            <CheckItem label="Brake Fluid" value={inspection.check_brake} />
                            <CheckItem label="Clutch Fluid" value={inspection.check_clutch} />
                            <CheckItem label="Power Steering" value={inspection.check_power_steering} />
                            <CheckItem label="Auto Transmission" value={inspection.check_auto_transmission} />
                            <CheckItem label="Screen Wash" value={inspection.check_screen_wash} />
                            <CheckItem label="Fuel" value={inspection.check_fuel} />
                            <CheckItem label="Coolant" value={inspection.check_coolant} />
                        </div>
                    </div>

                    {/* Lights/Electric Section */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                            <span className="mr-2">💡</span> Lights/Electric
                        </h3>
                        <div className="space-y-1">
                            <CheckItem label="Indicators" value={inspection.check_indicators} />
                            <CheckItem label="Side Lights" value={inspection.check_side_lights} />
                            <CheckItem label="Headlights (Dipped)" value={inspection.check_headlights_dipped} />
                            <CheckItem label="Headlights (Main)" value={inspection.check_headlights_main} />
                            <CheckItem label="Number Plate Light" value={inspection.check_number_plate_light} />
                            <CheckItem label="Reversing Light" value={inspection.check_reversing_light} />
                            <CheckItem label="Warning Lights" value={inspection.check_warning_lights} />
                            <CheckItem label="Horn" value={inspection.check_horn} />
                        </div>
                    </div>

                    {/* External Condition Section */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                            <span className="mr-2">🚗</span> External Condition
                        </h3>
                        <div className="space-y-1">
                            <CheckItem label="Door/Wing Mirrors" value={inspection.check_door_wing_mirrors} />
                            <CheckItem label="Wiper Blades" value={inspection.check_wiper_blades} />
                            <CheckItem label="Screen Washers" value={inspection.check_screen_washers} />
                            <CheckItem label="Tyre Pressure" value={inspection.check_tyre_pressure} />
                            <CheckItem label="Tyre Condition" value={inspection.check_tyre_condition} />
                            <CheckItem label="Windscreen Wipers" value={inspection.check_windscreen_wipers} />
                            <CheckItem label="Spare Wheel" value={inspection.check_spare_wheel} />
                            <CheckItem label="Cleanliness" value={inspection.check_cleanliness} />
                        </div>
                    </div>

                    {/* Internal Condition Section */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                            <span className="mr-2">🔧</span> Internal Condition
                        </h3>
                        <div className="space-y-1">
                            <CheckItem label="Seat Belts" value={inspection.check_seat_belts} />
                            <CheckItem label="First Aid Kit" value={inspection.check_first_aid_kit} />
                            <CheckItem label="Fire Extinguisher" value={inspection.check_fire_extinguisher} />
                            <CheckItem label="Head Restraint" value={inspection.check_head_restraint} />
                            <CheckItem label="Torch" value={inspection.check_torch} />
                            <CheckItem label="General Bodywork" value={inspection.check_general_bodywork} />
                            <CheckItem label="Spill Kit" value={inspection.check_spill_kit} />
                            <CheckItem label="Door Locking" value={inspection.check_door_locking} />
                        </div>
                    </div>

                    {/* Vehicle Photos */}
                    {inspection.photos && Array.isArray(inspection.photos) && inspection.photos.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                                <Camera className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                                Vehicle Photos ({inspection.photos.length})
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {inspection.photos.map((image, index) => {
                                    const imageUrl = typeof image === 'string' ? image : image.url;
                                    return (
                                        <div key={index} className="relative group">
                                            <img
                                                src={imageUrl}
                                                alt={`Vehicle photo ${index + 1}`}
                                                className={`w-full h-32 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-700 ${!autoExport ? 'cursor-pointer' : ''}`}
                                                style={{ opacity: 1, visibility: 'visible', display: 'block' }}
                                                onClick={!autoExport ? () => setViewingImage({ url: imageUrl, index }) : undefined}
                                                crossOrigin="anonymous" // Important for html-to-image
                                            />
                                            {!autoExport && (
                                                <div
                                                    className="absolute inset-0 bg-transparent group-hover:bg-black group-hover:bg-opacity-30 transition-opacity rounded-lg flex items-center justify-center pointer-events-none cursor-pointer"
                                                    onClick={() => setViewingImage({ url: imageUrl, index })}
                                                >
                                                    <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Comments and Damage Notes */}
                    {(inspection.comments || inspection.damage_notes) && (
                        <div className="space-y-4">
                            {inspection.comments && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Comments:</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded">
                                        {inspection.comments}
                                    </p>
                                </div>
                            )}
                            {inspection.damage_notes && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Damage Notes:</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 bg-red-50 dark:bg-red-900/20 p-3 rounded">
                                        {inspection.damage_notes}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
    );

    // If auto-exporting, return just the content without Modal wrapper
    if (autoExport) {
        return content;
    }

    // Normal mode - return Modal with content and buttons
    return (
        <Modal isOpen={true} onClose={onClose} title="Inspection Details">
            <div className="flex flex-col max-h-[80vh]">
                {content}

                {/* Footer */}
                <div className="flex-shrink-0 p-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={handleExportAsImage}
                                disabled={exporting}
                                className="flex items-center gap-2"
                            >
                                {exporting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Download className="w-4 h-4" />
                                )}
                                {exporting ? 'Exporting...' : 'Export Inspection'}
                            </Button>
                        </div>
                        <Button variant="outline" onClick={onClose}>Close</Button>
                    </div>
                </div>
            </div>

            {/* Image Viewer Modal */}
            {viewingImage && (
                <div className="fixed inset-0 bg-black bg-opacity-90 z-[100] flex items-center justify-center p-4" onClick={() => setViewingImage(null)}>
                    <button
                        onClick={() => setViewingImage(null)}
                        className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
                    >
                        <X className="w-8 h-8" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadImage(viewingImage.url);
                        }}
                        className="absolute top-4 right-16 text-white hover:text-gray-300 transition-colors z-10 flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20"
                    >
                        <Download className="w-5 h-5" />
                        <span>Download</span>
                    </button>
                    <img
                        src={viewingImage.url}
                        alt={`Vehicle photo ${viewingImage.index + 1}`}
                        className="max-w-full max-h-full object-contain rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                        crossOrigin="anonymous"
                    />
                </div>
            )}
        </Modal>
    );
};

export default InspectionDetailModal;
