import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    CheckCircle, 
    AlertTriangle, 
    Clock, 
    Camera, 
    Upload,
    Search,
    Filter,
    PlusCircle,
    FileText,
    Calendar,
    X,
    Eye,
    Download,
    Check,
    XCircle,
    Archive,
    Trash2,
    Edit,
    TrendingUp,
    Image as ImageIcon
} from 'lucide-react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { usePermissions } from '../../hooks/usePermissions';
import { Card, Button, Input, Select, Modal, Pagination } from '../ui';

const LogCertificateView = React.forwardRef(({ log }, ref) => {
    if (!log) return null;
    
    return (
        <div className="p-6 space-y-6 bg-white dark:bg-gray-800 text-left" ref={ref}>
            {/* Header */}
            <div className="flex justify-between items-start border-b pb-4 border-gray-200 dark:border-gray-700">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Calibration Check</h2>
                    <p className="text-sm text-gray-500">Survey Hub Equipment Management</p>
                </div>
                <div className={`px-4 py-2 rounded-full font-bold border ${
                    log.status === 'Pass' 
                        ? 'bg-green-100 text-green-800 border-green-200' 
                        : 'bg-red-100 text-red-800 border-red-200'
                }`}>
                    {log.status.toUpperCase()}
                </div>
            </div>

            {/* Equipment Details */}
            <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
                <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Equipment</p>
                    <p className="font-medium text-gray-900 dark:text-white">{log.equipment?.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">SN: {log.equipment?.serial_number || 'N/A'}</p>
                    {log.equipment?.model && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">Model: {log.equipment.model}</p>
                    )}
                </div>
                <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Technician</p>
                    <p className="font-medium text-gray-900 dark:text-white">{log.user?.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{new Date(log.check_date).toLocaleString()}</p>
                </div>
            </div>

            {/* Technical Data */}
            <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Calibration Values</h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Horizontal Collimation:</span>
                        <span className="font-mono font-medium">{log.ha_collimation || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Vertical Collimation:</span>
                        <span className="font-mono font-medium">{log.va_collimation || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Trunnion Axis Tilt:</span>
                        <span className="font-mono font-medium">{log.trunnion_axis_tilt || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Auto Lock Hz:</span>
                        <span className="font-mono font-medium">{log.auto_lock_collimation_hz || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Auto Lock Vt:</span>
                        <span className="font-mono font-medium">{log.auto_lock_collimation_vt || 'N/A'}</span>
                    </div>
                </div>
            </div>

            {/* Checklist */}
            <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Inspection Checklist</h3>
                <div className="grid grid-cols-2 gap-4">
                    {[
                        { label: 'Tribrach Circular Level', value: log.tribrach_circular_level },
                        { label: 'Prism Precise Level', value: log.prism_precise_level },
                        { label: 'Prism Optical Plummet', value: log.prism_optical_plummet },
                        { label: 'Compensator', value: log.compensator },
                    ].map((item, i) => (
                        <div key={i} className="flex items-center space-x-3">
                            {item.value ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                                <XCircle className="w-5 h-5 text-red-500" />
                            )}
                            <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Comments */}
            {log.comments && (
                <div className="space-y-2">
                    <h3 className="font-semibold text-lg border-b pb-2">Comments</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 italic bg-gray-50 dark:bg-gray-700/30 p-3 rounded">
                        "{log.comments}"
                    </p>
                </div>
            )}

            {/* Evidence */}
            {log.evidence_url && (
                <div className="space-y-2">
                    <h3 className="font-semibold text-lg border-b pb-2">Evidence</h3>
                    <img 
                        src={log.evidence_url} 
                        alt="Evidence" 
                        className="w-full h-48 object-contain rounded-lg border border-gray-200 bg-gray-50"
                    />
                </div>
            )}
        </div>
    );
});

const LogDetailModal = ({ log, isOpen, onClose }) => {
    const modalRef = useRef(null);
    const { can } = usePermissions();

    const handleExportImage = async () => {
        if (!modalRef.current) return;
        
        let styleElement = null;
        const element = modalRef.current;

        try {
            // Create a style element with print-friendly colors (copied logic from vehicle export)
            styleElement = document.createElement('style');
            styleElement.id = 'export-override-styles-check-adjust';
            styleElement.textContent = `
                /* Force readable text colors for export - catch all gray text variants */
                .check-adjust-export-wrapper *,
                .check-adjust-export-wrapper p,
                .check-adjust-export-wrapper span,
                .check-adjust-export-wrapper div,
                .check-adjust-export-wrapper h1,
                .check-adjust-export-wrapper h2,
                .check-adjust-export-wrapper h3,
                .check-adjust-export-wrapper h4,
                .check-adjust-export-wrapper h5,
                .check-adjust-export-wrapper h6,
                .check-adjust-export-wrapper label,
                .check-adjust-export-wrapper .text-gray-100,
                .check-adjust-export-wrapper .text-gray-200,
                .check-adjust-export-wrapper .text-gray-300,
                .check-adjust-export-wrapper .text-gray-400,
                .check-adjust-export-wrapper .text-gray-500,
                .check-adjust-export-wrapper .text-gray-600,
                .check-adjust-export-wrapper .text-gray-700,
                .check-adjust-export-wrapper .text-gray-800,
                .check-adjust-export-wrapper .text-gray-900,
                .check-adjust-export-wrapper .text-white,
                .check-adjust-export-wrapper [class*="text-gray"] {
                    color: #000000 !important;
                }

                /* Preserve status colors */
                .check-adjust-export-wrapper .text-green-600,
                .check-adjust-export-wrapper .text-green-500,
                .check-adjust-export-wrapper .text-green-400,
                .check-adjust-export-wrapper [class*="text-green"] {
                    color: #16a34a !important;
                }

                .check-adjust-export-wrapper .text-red-600,
                .check-adjust-export-wrapper .text-red-500,
                .check-adjust-export-wrapper .text-red-400,
                .check-adjust-export-wrapper [class*="text-red"] {
                    color: #dc2626 !important;
                }

                /* Fix backgrounds */
                .check-adjust-export-wrapper .bg-gray-50,
                .check-adjust-export-wrapper .bg-gray-100,
                .check-adjust-export-wrapper .bg-gray-700,
                .check-adjust-export-wrapper .bg-gray-800,
                .check-adjust-export-wrapper .bg-gray-900,
                .check-adjust-export-wrapper [class*="bg-gray-"] {
                    background-color: #ffffff !important;
                }

                .check-adjust-export-wrapper .border-gray-200,
                .check-adjust-export-wrapper .border-gray-700,
                .check-adjust-export-wrapper .border-gray-600,
                .check-adjust-export-wrapper [class*="border-gray"] {
                    border-color: #d1d5db !important;
                }
                
                /* Ensure SVG icons (Lucide) that aren't status colored are black */
                .check-adjust-export-wrapper svg:not([class*="text-green"]):not([class*="text-red"]) {
                    stroke: #000000 !important;
                }
            `;
            document.head.appendChild(styleElement);

            // Add wrapper class to element
            element.classList.add('check-adjust-export-wrapper');

            // Wait for styles to apply (crucial for html-to-image to pick up new computed styles)
            await new Promise(resolve => setTimeout(resolve, 100));

            const dataUrl = await toPng(element, {
                backgroundColor: '#ffffff',
                pixelRatio: 2, // Higher resolution
                cacheBust: true
            });
            
            const link = document.createElement('a');
            link.href = dataUrl;
            const serial = log.equipment?.serial_number || 'No_Serial';
            link.download = `Check_Adjust_Certificate_${serial}_${new Date(log.check_date).toISOString().split('T')[0]}.png`;
            link.click();
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            // Clean up
            if (element) {
                element.classList.remove('check-adjust-export-wrapper');
            }
            if (styleElement && styleElement.parentNode) {
                document.head.removeChild(styleElement);
            }
        }
    };

    if (!isOpen || !log) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Calibration Certificate">
            <div className="max-h-[80vh] overflow-y-auto">
                <LogCertificateView log={log} ref={modalRef} />
            </div>
            
            {/* Actions */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2 bg-gray-50 dark:bg-gray-800 rounded-b-xl">
                <Button variant="outline" onClick={onClose}>Close</Button>
                {can('EXPORT_CHECK_ADJUST_CERTIFICATE') && (
                    <Button onClick={handleExportImage} className="flex items-center gap-2">
                        <Download size={16} /> Export Certificate
                    </Button>
                )}
            </div>
        </Modal>
    );
};

// Image compression function
const compressImage = (file, maxSizeKB = 500) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions (max 1920px width)
                const maxWidth = 1920;
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Start with high quality and reduce if needed
                let quality = 0.9;
                const tryCompress = () => {
                    canvas.toBlob((blob) => {
                        if (blob.size / 1024 <= maxSizeKB || quality <= 0.1) {
                            resolve(blob);
                        } else {
                            quality -= 0.1;
                            tryCompress();
                        }
                    }, 'image/jpeg', quality);
                };
                tryCompress();
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
};

const CheckAdjustPage = () => {
    const { user } = useAuth();
    const { addToast } = useToast();
    const { can } = usePermissions();
    const [loading, setLoading] = useState(true);
    const [equipment, setEquipment] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [usersData, setUsersData] = useState([]);
    const [logs, setLogs] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [isManageMode, setIsManageMode] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [photoPreview, setPhotoPreview] = useState(null);
    
    // Form State
    const [formData, setFormData] = useState({
        equipment_id: '',
        ha_collimation: '',
        va_collimation: '',
        trunnion_axis_tilt: '',
        auto_lock_collimation_hz: '',
        auto_lock_collimation_vt: '',
        tribrach_circular_level: false,
        prism_precise_level: false,
        prism_optical_plummet: false,
        compensator: false,
        comments: '',
        status: 'Pass',
        evidence_file: null,
        photo_url: ''
    });

    // Filters & Pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    
    // View Modal State
    const [selectedLog, setSelectedLog] = useState(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    
    // Overdue Modal State
    const [showOverdueModal, setShowOverdueModal] = useState(false);

    // Export Wizard State
    const [wizardOpen, setWizardOpen] = useState(false);
    const [exportStartDate, setExportStartDate] = useState('');
    const [exportEndDate, setExportEndDate] = useState('');
    const [selectedExportIds, setSelectedExportIds] = useState([]);
    const [isExporting, setIsExporting] = useState(false);
    const [exportLogsList, setExportLogsList] = useState([]); // For batch export rendering

    const fetchData = React.useCallback(async () => {
        setLoading(true);
        try {
            // Fetch Total Stations
            // Note: We assume 'Total Station' is the exact category string. 
            // If dynamic categories are used, we might need to fetch the category ID first.
            // For robustness, we'll try to match by string in the query if possible, or filter client-side if category is an ID.
            // Based on EquipmentPage, category seems to be stored as a string value (dropdown_items.value).
            
            const { data: eqData, error: eqError } = await supabase
                .from('equipment')
                .select('id, name, serial_number, model, category, status')
                .eq('category', 'Total Station')
                .neq('status', 'archived') // Exclude archived if needed
                .order('name', { ascending: true });

            if (eqError) throw eqError;
            setEquipment(eqData || []);

            // Fetch Assignments
            const { data: assignData, error: assignError } = await supabase
                .from('equipment_assignments')
                .select('*')
                .is('returned_at', null);
            
            if (assignError) throw assignError;
            setAssignments(assignData || []);

            // Fetch Users
            const { data: uData, error: uError } = await supabase
                .from('users')
                .select('id, name');
            
            if (uError) throw uError;
            setUsersData(uData || []);

            // Fetch Logs
            const { data: logData, error: logError } = await supabase
                .from('check_adjust_logs')
                .select(`
                    *,
                    equipment:equipment_id (name, serial_number, model),
                    user:user_id (name)
                `)
                .order('check_date', { ascending: false });

            if (logError) {
                // If table doesn't exist yet, just set empty logs (handle graceful degradation)
                if (logError.code === '42P01') {
                    console.warn('check_adjust_logs table does not exist yet.');
                    setLogs([]);
                } else {
                    throw logError;
                }
            } else {
                setLogs(logData || []);
            }

        } catch (error) {
            console.error('Error fetching data:', error);
            addToast({ message: 'Failed to load data', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // KPI Calculations & Overdue List
    const { kpiData, overdueList } = useMemo(() => {
        const totalUnits = equipment.length;
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Get latest log for each unit
        const latestLogs = {};
        logs.forEach(log => {
            if (!latestLogs[log.equipment_id] || new Date(log.check_date) > new Date(latestLogs[log.equipment_id].check_date)) {
                latestLogs[log.equipment_id] = log;
            }
        });

        // Create lookup map for assignments
        const assignmentMap = {};
        assignments.forEach(a => {
            assignmentMap[a.equipment_id] = a.user_id;
        });

        // Create lookup map for users
        const userMap = {};
        usersData.forEach(u => {
            userMap[u.id] = u.name;
        });

        let compliant = 0;
        let overdueCount = 0;
        const overdueItems = [];

        equipment.forEach(unit => {
            const lastLog = latestLogs[unit.id];
            if (lastLog && new Date(lastLog.check_date) >= sevenDaysAgo && lastLog.status === 'Pass') {
                compliant++;
            } else {
                overdueCount++;
                const assignedUserId = assignmentMap[unit.id];
                const assignedUserName = assignedUserId ? userMap[assignedUserId] : 'Unassigned';
                
                overdueItems.push({
                    ...unit,
                    lastLog: lastLog,
                    assignedTo: assignedUserName
                });
            }
        });

        return { 
            kpiData: { totalUnits, compliant, overdue: overdueCount },
            overdueList: overdueItems
        };
    }, [equipment, logs, assignments, usersData]);

    // Total Station Summary List Calculation
    const totalStationSummary = useMemo(() => {
        const assignmentMap = {};
        assignments.forEach(a => {
            assignmentMap[a.equipment_id] = a.user_id;
        });

        const userMap = {};
        usersData.forEach(u => {
            userMap[u.id] = u.name;
        });

        const latestLogs = {};
        logs.forEach(log => {
            if (!latestLogs[log.equipment_id] || new Date(log.check_date) > new Date(latestLogs[log.equipment_id].check_date)) {
                latestLogs[log.equipment_id] = log;
            }
        });

        return equipment.map(unit => {
            const assignedUserId = assignmentMap[unit.id];
            const assignedUserName = assignedUserId ? userMap[assignedUserId] : 'Unassigned';
            const lastLog = latestLogs[unit.id];
            
            // Calculate status
            let status = 'Never Checked';
            let nextDue = null;
            
            if (lastLog) {
                const lastDate = new Date(lastLog.check_date);
                const nextDate = new Date(lastLog.next_due_date || new Date(lastDate.getTime() + 7 * 24 * 60 * 60 * 1000));
                nextDue = nextDate;
                
                const now = new Date();
                if (lastLog.status === 'Fail') {
                    status = 'Fail';
                } else if (nextDate < now) {
                    status = 'Overdue';
                } else {
                    status = 'Compliant';
                }
            }

            return {
                id: unit.id,
                name: unit.name,
                serial_number: unit.serial_number,
                model: unit.model,
                assignedTo: assignedUserName,
                lastCheck: lastLog ? lastLog.check_date : null,
                nextDue: nextDue,
                status: status
            };
        }).sort((a, b) => {
            return a.name.localeCompare(b.name); // Sort by equipment name
        });
    }, [equipment, logs, assignments, usersData]);

    const toggleExportSelection = (id) => {
        setSelectedExportIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const selectAllExport = () => {
        if (selectedExportIds.length === equipment.length) {
            setSelectedExportIds([]);
        } else {
            setSelectedExportIds(equipment.map(e => e.id));
        }
    };

    const handleWizardExport = async () => {
        if (!exportStartDate || !exportEndDate) {
            addToast({ message: 'Please select a start and end date.', type: 'warning' });
            return;
        }
        if (selectedExportIds.length === 0) {
            addToast({ message: 'Please select at least one item.', type: 'warning' });
            return;
        }

        setIsExporting(true);
        try {
            // Fetch logs
            const { data: exportLogs, error } = await supabase
                .from('check_adjust_logs')
                .select(`
                    *,
                    equipment:equipment_id (name, serial_number, model),
                    user:user_id (name)
                `)
                .in('equipment_id', selectedExportIds)
                .gte('check_date', new Date(exportStartDate).toISOString())
                .lte('check_date', new Date(new Date(exportEndDate).setHours(23, 59, 59, 999)).toISOString());

            if (error) throw error;

            if (!exportLogs || exportLogs.length === 0) {
                addToast({ message: 'No logs found for the selected criteria.', type: 'info' });
                setIsExporting(false);
                return;
            }

            // Trigger rendering of all logs
            setExportLogsList(exportLogs);
            
            // Wait for DOM to render
            await new Promise(resolve => setTimeout(resolve, 1000));

            const zip = new JSZip();
            let count = 0;

            // Inject styles for printing (exact match to single export)
            const styleElement = document.createElement('style');
            styleElement.textContent = `
                /* Force readable text colors for export - catch all gray text variants */
                .check-adjust-export-wrapper *,
                .check-adjust-export-wrapper p,
                .check-adjust-export-wrapper span,
                .check-adjust-export-wrapper div,
                .check-adjust-export-wrapper h1,
                .check-adjust-export-wrapper h2,
                .check-adjust-export-wrapper h3,
                .check-adjust-export-wrapper h4,
                .check-adjust-export-wrapper h5,
                .check-adjust-export-wrapper h6,
                .check-adjust-export-wrapper label,
                .check-adjust-export-wrapper .text-gray-100,
                .check-adjust-export-wrapper .text-gray-200,
                .check-adjust-export-wrapper .text-gray-300,
                .check-adjust-export-wrapper .text-gray-400,
                .check-adjust-export-wrapper .text-gray-500,
                .check-adjust-export-wrapper .text-gray-600,
                .check-adjust-export-wrapper .text-gray-700,
                .check-adjust-export-wrapper .text-gray-800,
                .check-adjust-export-wrapper .text-gray-900,
                .check-adjust-export-wrapper .text-white,
                .check-adjust-export-wrapper [class*="text-gray"] {
                    color: #000000 !important;
                }

                /* Preserve status colors */
                .check-adjust-export-wrapper .text-green-600,
                .check-adjust-export-wrapper .text-green-500,
                .check-adjust-export-wrapper .text-green-400,
                .check-adjust-export-wrapper [class*="text-green"] {
                    color: #16a34a !important;
                }

                .check-adjust-export-wrapper .text-red-600,
                .check-adjust-export-wrapper .text-red-500,
                .check-adjust-export-wrapper .text-red-400,
                .check-adjust-export-wrapper [class*="text-red"] {
                    color: #dc2626 !important;
                }

                /* Fix backgrounds */
                .check-adjust-export-wrapper .bg-gray-50,
                .check-adjust-export-wrapper .bg-gray-100,
                .check-adjust-export-wrapper .bg-gray-700,
                .check-adjust-export-wrapper .bg-gray-800,
                .check-adjust-export-wrapper .bg-gray-900,
                .check-adjust-export-wrapper [class*="bg-gray-"] {
                    background-color: #ffffff !important;
                }

                .check-adjust-export-wrapper .border-gray-200,
                .check-adjust-export-wrapper .border-gray-700,
                .check-adjust-export-wrapper .border-gray-600,
                .check-adjust-export-wrapper [class*="border-gray"] {
                    border-color: #d1d5db !important;
                }
                
                /* Ensure SVG icons (Lucide) that aren't status colored are black */
                .check-adjust-export-wrapper svg:not([class*="text-green"]):not([class*="text-red"]) {
                    stroke: #000000 !important;
                }
            `;
            document.head.appendChild(styleElement);

            // Wait for styles to apply
            await new Promise(resolve => setTimeout(resolve, 100));

            for (const log of exportLogs) {
                const element = document.getElementById(`export-log-${log.id}`);
                if (element) {
                    element.classList.add('check-adjust-export-wrapper');
                    try {
                        const dataUrl = await toPng(element, {
                            backgroundColor: '#ffffff',
                            pixelRatio: 2,
                            cacheBust: true
                        });
                        
                        const serial = log.equipment?.serial_number || 'No_Serial';
                        const dateStr = new Date(log.check_date).toISOString().split('T')[0];
                        // Filename matching single export: Check_Adjust_Certificate_${serial}_${date}.png
                        const fileName = `Check_Adjust_Certificate_${serial}_${dateStr}.png`;
                        
                        const base64Data = dataUrl.split(',')[1];
                        zip.file(fileName, base64Data, { base64: true });
                        count++;
                    } catch (err) {
                        console.error(`Failed to export log ${log.id}:`, err);
                    }
                    element.classList.remove('check-adjust-export-wrapper');
                }
            }

            document.head.removeChild(styleElement);
            setExportLogsList([]);

            if (count > 0) {
                const content = await zip.generateAsync({ type: 'blob' });
                const link = document.createElement('a');
                link.href = window.URL.createObjectURL(content);
                link.download = `CheckAdjust_Reports_${exportStartDate}_to_${exportEndDate}.zip`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                setWizardOpen(false);
                addToast({ message: `Exported ${count} reports successfully.`, type: 'success' });
            }

        } catch (error) {
            console.error('Export wizard error:', error);
            addToast({ message: 'Export failed: ' + error.message, type: 'error' });
        } finally {
            setIsExporting(false);
            setExportLogsList([]);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: type === 'checkbox' ? checked : value 
        }));
    };

    const handleFileChange = async (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            try {
                // Compress immediately for preview and readiness
                const compressedBlob = await compressImage(file);
                setFormData(prev => ({ ...prev, evidence_file: compressedBlob }));
                setPhotoPreview(URL.createObjectURL(compressedBlob));
            } catch (error) {
                console.error('Error processing image:', error);
                addToast({ message: 'Failed to process image', type: 'error' });
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.equipment_id) {
            addToast({ message: 'Please select a unit', type: 'error' });
            return;
        }

        // Check permissions before submitting
        if (modalMode === 'create' && !can('ADD_CHECK_ADJUST_LOG')) {
            addToast({ message: 'You do not have permission to add check & adjust logs.', type: 'error' });
            return;
        }
        if (modalMode === 'edit' && !can('EDIT_CHECK_ADJUST_LOG')) {
            addToast({ message: 'You do not have permission to edit check & adjust logs.', type: 'error' });
            return;
        }

        setSubmitting(true);
        try {
            let evidenceUrl = null;

            // Upload Evidence if new file selected
            if (formData.evidence_file) {
                setUploading(true);
                try {
                    // File is already compressed in handleFileChange
                    const compressedBlob = formData.evidence_file;
                    
                    // Use jpg extension for compressed image
                    const fileExt = 'jpg';
                    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
                    const filePath = `check-adjust/${fileName}`;

                    // Convert Blob to File for better compatibility with Supabase Storage (fixes mobile access denied)
                    const fileToUpload = new File([compressedBlob], fileName, { type: 'image/jpeg' });

                    const { error: uploadError } = await supabase.storage
                        .from('evidence')
                        .upload(filePath, fileToUpload, {
                            contentType: 'image/jpeg',
                            cacheControl: '3600',
                            upsert: false
                        });

                    if (uploadError) {
                        console.error('Supabase upload error:', uploadError);
                        addToast({ message: `Image upload failed: ${uploadError.message}`, type: 'error' });
                        throw new Error(`Image upload failed: ${uploadError.message}`); // Rethrow to stop saving log without photo
                    } else {
                        const { data: { publicUrl } } = supabase.storage
                            .from('evidence')
                            .getPublicUrl(filePath);
                        evidenceUrl = publicUrl;
                    }
                } catch (imageError) {
                    console.error('Error during image processing or upload:', imageError);
                    addToast({ message: `Failed to process/upload image: ${imageError.message}`, type: 'error' });
                    // Decide whether to proceed saving the log without the photo or stop entirely
                    // For now, we'll rethrow to stop the log saving
                    throw imageError;
                } finally {
                    setUploading(false);
                }
            }

            // Calculate Next Due Date (7 days from now)
            const nextDue = new Date();
            nextDue.setDate(nextDue.getDate() + 7);

            const newLog = {
                equipment_id: formData.equipment_id,
                user_id: user.id,
                check_date: new Date().toISOString(),
                ha_collimation: formData.ha_collimation,
                va_collimation: formData.va_collimation,
                trunnion_axis_tilt: formData.trunnion_axis_tilt,
                auto_lock_collimation_hz: formData.auto_lock_collimation_hz,
                auto_lock_collimation_vt: formData.auto_lock_collimation_vt,
                tribrach_circular_level: formData.tribrach_circular_level,
                prism_precise_level: formData.prism_precise_level,
                prism_optical_plummet: formData.prism_optical_plummet,
                compensator: formData.compensator,
                comments: formData.comments,
                status: formData.status,
                evidence_url: evidenceUrl,
                next_due_date: nextDue.toISOString()
            };

            if (modalMode === 'create') {
                const { data, error } = await supabase
                    .from('check_adjust_logs')
                    .insert([newLog])
                    .select(`
                        *,
                        equipment:equipment_id (name, serial_number),
                        user:user_id (name)
                    `)
                    .single();

                if (error) throw error;

                setLogs([data, ...logs]);
                addToast({ message: 'Check & Adjust log saved successfully', type: 'success' });
                setIsModalOpen(false);
                setFormData({
                    equipment_id: '',
                    ha_collimation: '',
                    va_collimation: '',
                    trunnion_axis_tilt: '',
                    auto_lock_collimation_hz: '',
                    auto_lock_collimation_vt: '',
                    tribrach_circular_level: false,
                    prism_precise_level: false,
                    prism_optical_plummet: false,
                    compensator: false,
                    comments: '',
                    status: 'Pass',
                    evidence_file: null,
                    photo_url: ''
                });
                setPhotoPreview(null);

            } else { // edit mode
                const { data, error } = await supabase
                    .from('check_adjust_logs')
                    .update(newLog) // Note: this copies all fields, including user_id, check_date
                    .eq('id', selectedLog.id)
                    .select(`
                        *,
                        equipment:equipment_id (name, serial_number),
                        user:user_id (name)
                    `)
                    .single();

                if (error) throw error;
                setLogs(prev => prev.map(log => log.id === selectedLog.id ? data : log));
                addToast({ message: 'Check & Adjust log updated successfully', type: 'success' });
                setIsModalOpen(false);
                // Also update the selectedLog if it's currently open in view modal
                if (selectedLog && selectedLog.id === data.id) {
                    setSelectedLog(data);
                }
            }

        } catch (error) {
            console.error('Error saving log:', error); // Log the full error for debugging
            addToast({ message: error.message || 'Failed to save log', type: 'error' });
        } finally {
            setSubmitting(false);
            setPhotoPreview(null); // Clear photo preview after submission attempt
        }
    };

    const handleEditLog = (log) => {
        setSelectedLog(log); // Set selectedLog for reference in handleSubmit
        setModalMode('edit');
        setFormData({
            equipment_id: log.equipment_id,
            ha_collimation: log.ha_collimation,
            va_collimation: log.va_collimation,
            trunnion_axis_tilt: log.trunnion_axis_tilt,
            auto_lock_collimation_hz: log.auto_lock_collimation_hz,
            auto_lock_collimation_vt: log.auto_lock_collimation_vt,
            tribrach_circular_level: log.tribrach_circular_level,
            prism_precise_level: log.prism_precise_level,
            prism_optical_plummet: log.prism_optical_plummet,
            compensator: log.compensator,
            comments: log.comments,
            status: log.status,
            evidence_file: null, // Don't pre-fill file input
            photo_url: log.evidence_url
        });
        setPhotoPreview(log.evidence_url || null);
        setIsModalOpen(true);
    };

    const handleDeleteLog = async (logId) => {
        if (!can('DELETE_CHECK_ADJUST_LOG')) {
            addToast({ message: 'You do not have permission to delete check & adjust logs.', type: 'error' });
            return;
        }
        if (!window.confirm('Are you sure you want to delete this log? This action cannot be undone.')) {
            return;
        }

        setSubmitting(true); // Re-using submitting state
        try {
            // Logic to delete log and associated evidence photo
            const logToDelete = logs.find(log => log.id === logId);
            if (logToDelete && logToDelete.evidence_url) {
                const path = logToDelete.evidence_url.split('evidence/').pop();
                if (path) {
                    await supabase.storage.from('evidence').remove([path]);
                }
            }
            
            const { error } = await supabase
                .from('check_adjust_logs')
                .delete()
                .eq('id', logId);

            if (error) throw error;

            setLogs(prev => prev.filter(log => log.id !== logId));
            addToast({ message: 'Check & Adjust log deleted successfully', type: 'success' });
        } catch (error) {
            console.error('Error deleting log:', error);
            addToast({ message: error.message || 'Failed to delete log', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    // Pagination Logic
    const filteredLogs = logs.filter(log => 
        (log.equipment?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.equipment?.serial_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const paginatedLogs = filteredLogs.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Check & Adjust</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Total Station Calibration & Compliance</p>
                </div>
                <div className="flex gap-2">
                    {(can('EDIT_CHECK_ADJUST_LOG') || can('DELETE_CHECK_ADJUST_LOG')) && (
                        <Button 
                            onClick={() => setIsManageMode(!isManageMode)} 
                            variant="outline"
                            className="flex items-center"
                        >
                            {isManageMode ? 'Done' : 'Manage'}
                        </Button>
                    )}
                    {can('EXPORT_CHECK_ADJUST_REPORTS') && (
                        <Button onClick={() => setWizardOpen(true)} variant="outline" className="flex items-center">
                            <Archive className="w-4 h-4 mr-2" /> Export Wizard
                        </Button>
                    )}
                    {can('ADD_CHECK_ADJUST_LOG') && (
                        <Button onClick={() => {
                            setModalMode('create');
                            setFormData({
                                equipment_id: '',
                                ha_collimation: '',
                                va_collimation: '',
                                trunnion_axis_tilt: '',
                                auto_lock_collimation_hz: '',
                                auto_lock_collimation_vt: '',
                                tribrach_circular_level: false,
                                prism_precise_level: false,
                                prism_optical_plummet: false,
                                compensator: false,
                                comments: '',
                                status: 'Pass',
                                evidence_file: null,
                                photo_url: ''
                            });
                            setPhotoPreview(null);
                            setIsModalOpen(true);
                        }}>
                            <PlusCircle className="w-4 h-4 mr-2" />
                            Perform Check
                        </Button>
                    )}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <Card className="border-l-4 border-l-blue-500">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Units</p>
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{kpiData.totalUnits}</h3>
                        </div>
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
                            <Camera className="w-6 h-6" />
                        </div>
                    </div>
                </Card>
                
                <Card className="border-l-4 border-l-green-500">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Compliant (7 Days)</p>
                            <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">{kpiData.compliant}</h3>
                        </div>
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                            <CheckCircle className="w-6 h-6" />
                        </div>
                    </div>
                </Card>

                <Card 
                    className={`border-l-4 ${kpiData.overdue > 0 ? 'border-l-red-500 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700' : 'border-l-gray-300'}`}
                    onClick={() => kpiData.overdue > 0 && setShowOverdueModal(true)}
                >
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Overdue</p>
                            <h3 className={`text-2xl font-bold ${kpiData.overdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-white'}`}>
                                {kpiData.overdue}
                            </h3>
                        </div>
                        <div className={`p-3 rounded-full ${kpiData.overdue > 0 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Total Station Summary Table */}
            <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2 text-orange-500" />
                        Total Station Summary
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-white uppercase bg-orange-500 dark:bg-orange-600 border-b border-orange-600 dark:border-orange-800">
                            <tr>
                                <th className="px-6 py-3">Equipment</th>
                                <th className="px-6 py-3">Assigned To</th>
                                <th className="px-6 py-3">Last Check</th>
                                <th className="px-6 py-3">Next Due</th>
                                <th className="px-6 py-3 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {totalStationSummary.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">No total stations found</td>
                                </tr>
                            ) : (
                                totalStationSummary.map((unit) => (
                                    <tr key={unit.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900 dark:text-white">{unit.name}</div>
                                            <div className="text-xs text-gray-500">{unit.model} - {unit.serial_number}</div>
                                        </td>
                                        <td className="px-6 py-4">{unit.assignedTo}</td>
                                        <td className="px-6 py-4">
                                            {unit.lastCheck ? new Date(unit.lastCheck).toLocaleDateString() : 'Never'}
                                        </td>
                                        <td className={`px-6 py-4 ${unit.status === 'Overdue' ? 'text-red-600 font-bold' : ''}`}>
                                            {unit.nextDue ? new Date(unit.nextDue).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                unit.status === 'Compliant' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                                unit.status === 'Overdue' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                                                unit.status === 'Fail' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                                                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                            }`}>
                                                {unit.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Recent Logs Table */}
            <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
                        <FileText className="w-5 h-5 mr-2" />
                        Historical Logs
                    </h3>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Search logs..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-white uppercase bg-orange-500 dark:bg-orange-600 border-b border-orange-600 dark:border-orange-800">
                            <tr>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Model</th>
                                <th className="px-6 py-3">Technician</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Next Due</th>
                                <th className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center">Loading...</td>
                                </tr>
                            ) : paginatedLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center">No logs found.</td>
                                </tr>
                            ) : (
                                paginatedLogs.map(log => {
                                    const isOverdue = new Date(log.next_due_date) < new Date();
                                    return (
                                        <tr key={log.id} className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${isOverdue ? 'border-l-4 border-l-red-500' : ''}`}>
                                            <td className="px-6 py-4">
                                                {new Date(log.check_date).toLocaleDateString()} 
                                                <span className="text-xs text-gray-400 block">
                                                    {new Date(log.check_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                                {log.equipment?.name}
                                                <span className="text-xs text-gray-500 block">{log.equipment?.model || 'N/A'}</span>
                                            </td>
                                            <td className="px-6 py-4">{log.user?.name || 'Unknown'}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    log.status === 'Pass' 
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                                                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                                }`}>
                                                    {log.status}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 ${isOverdue ? 'text-red-600 font-semibold' : ''}`}>
                                                {log.next_due_date ? new Date(log.next_due_date).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedLog(log);
                                                            setIsViewModalOpen(true);
                                                        }}
                                                        className="text-blue-600 hover:underline flex items-center"
                                                    >
                                                        <Eye className="w-4 h-4 mr-1" /> View
                                                    </button>
                                                    {isManageMode && can('EDIT_CHECK_ADJUST_LOG') && (
                                                        <button 
                                                            onClick={() => handleEditLog(log)} 
                                                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                            title="Edit Log"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {isManageMode && can('DELETE_CHECK_ADJUST_LOG') && (
                                                        <button 
                                                            onClick={() => handleDeleteLog(log.id)} 
                                                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                            title="Delete Log"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <Pagination 
                        currentPage={currentPage} 
                        setCurrentPage={setCurrentPage} 
                        totalPages={totalPages} 
                        itemsPerPage={itemsPerPage}
                        setItemsPerPage={setItemsPerPage}
                        totalItems={filteredLogs.length}
                    />
                </div>
            </div>

            {/* Hidden container for batch export rendering */}
            <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
                {exportLogsList.map(log => (
                    <div key={log.id} id={`export-log-${log.id}`} className="w-[600px] min-h-[850px] bg-white p-8 relative">
                        <LogCertificateView log={log} />
                        {/* Footer for branding if needed, or just whitespace filler */}
                        <div className="absolute bottom-4 left-0 w-full text-center text-xs text-gray-300">
                            Generated by Survey Hub
                        </div>
                    </div>
                ))}
            </div>

            {/* View Log Modal */}
            <LogDetailModal 
                log={selectedLog} 
                isOpen={isViewModalOpen} 
                onClose={() => {
                    setIsViewModalOpen(false);
                    setSelectedLog(null);
                }} 
            />

            {/* Overdue Equipment Modal */}
            <Modal isOpen={showOverdueModal} onClose={() => setShowOverdueModal(false)} title="Overdue Equipment">
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {overdueList.length === 0 ? (
                        <p className="text-gray-500 text-center">No equipment is currently overdue.</p>
                    ) : (
                        <div className="space-y-4">
                            {overdueList.map(unit => (
                                <div key={unit.id} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex justify-between items-center">
                                    <div>
                                        <h4 className="font-semibold text-red-800 dark:text-red-300">{unit.name}</h4>
                                        <p className="text-sm text-red-700 dark:text-red-400">
                                            SN: {unit.serial_number || 'N/A'} | Model: {unit.model || 'N/A'}
                                        </p>
                                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                            Assigned to: <span className="font-medium">{unit.assignedTo}</span>
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase">Last Checked</p>
                                        <p className="text-sm text-gray-700 dark:text-gray-300">
                                            {unit.lastLog ? new Date(unit.lastLog.check_date).toLocaleDateString() : 'Never'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                    <Button variant="outline" onClick={() => setShowOverdueModal(false)}>Close</Button>
                </div>
            </Modal>

            {/* Calibration Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Perform Check & Adjust">
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Unit *</label>
                        <select 
                            name="equipment_id" 
                            value={formData.equipment_id} 
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500"
                            required
                        >
                            <option value="">-- Select Total Station --</option>
                            {equipment.map(unit => (
                                <option key={unit.id} value={unit.id}>
                                    {unit.name} {unit.serial_number ? `(${unit.serial_number})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Horizontal Collimation" 
                            name="ha_collimation" 
                            value={formData.ha_collimation} 
                            onChange={handleInputChange} 
                        />
                        <Input 
                            label="Vertical Collimation" 
                            name="va_collimation" 
                            value={formData.va_collimation} 
                            onChange={handleInputChange} 
                        />
                        <Input 
                            label="Trunion Axis Tilt" 
                            name="trunnion_axis_tilt" 
                            value={formData.trunnion_axis_tilt} 
                            onChange={handleInputChange} 
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Auto Lock Collimation Hz" 
                            name="auto_lock_collimation_hz" 
                            value={formData.auto_lock_collimation_hz} 
                            onChange={handleInputChange} 
                        />
                        <Input 
                            label="Auto Lock Collimation Vt" 
                            name="auto_lock_collimation_vt" 
                            value={formData.auto_lock_collimation_vt} 
                            onChange={handleInputChange} 
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                name="tribrach_circular_level"
                                checked={formData.tribrach_circular_level}
                                onChange={handleInputChange}
                                className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Tribrach Circular Level</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                name="prism_precise_level"
                                checked={formData.prism_precise_level}
                                onChange={handleInputChange}
                                className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Prism Precise Level</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                name="prism_optical_plummet"
                                checked={formData.prism_optical_plummet}
                                onChange={handleInputChange}
                                className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Prism Optical Plummet</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                name="compensator"
                                checked={formData.compensator}
                                onChange={handleInputChange}
                                className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Compensator</span>
                        </label>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Comments</label>
                        <textarea
                            name="comments"
                            value={formData.comments}
                            onChange={handleInputChange}
                            rows="3"
                            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500"
                            placeholder="Add any additional notes or observations..."
                        />
                    </div>

                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                            <select 
                                name="status" 
                                value={formData.status} 
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500"
                            >
                                <option value="Pass">Pass</option>
                                <option value="Fail">Fail</option>
                            </select>
                        </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Evidence (Screen Capture)</label>
                        
                        {(photoPreview || formData.photo_url) ? (
                            <div className="relative group border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden h-48 bg-gray-100 dark:bg-gray-800">
                                <img 
                                    src={photoPreview || formData.photo_url} 
                                    alt="Preview" 
                                    className="w-full h-full object-contain" 
                                />
                                <div className="absolute inset-0 flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity md:bg-black md:bg-opacity-50">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPhotoPreview(null);
                                            setFormData(prev => ({ ...prev, evidence_file: null, photo_url: '' }));
                                        }}
                                        className="text-white text-sm font-medium bg-red-600 px-3 py-1.5 rounded-md hover:bg-red-700 shadow-sm"
                                    >
                                        Remove Photo
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {/* Camera Button - Forces Camera */}
                                <div className="relative">
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        capture="environment"
                                        onChange={handleFileChange}
                                        className="hidden" 
                                        id="ca-camera-upload"
                                    />
                                    <label 
                                        htmlFor="ca-camera-upload" 
                                        className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors h-24"
                                    >
                                        <Camera className="w-6 h-6 text-gray-500 dark:text-gray-400 mb-1" />
                                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Take Photo</span>
                                    </label>
                                </div>

                                {/* Gallery Button - Allows File Selection */}
                                <div className="relative">
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={handleFileChange}
                                        className="hidden" 
                                        id="ca-gallery-upload"
                                    />
                                    <label 
                                        htmlFor="ca-gallery-upload" 
                                        className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors h-24"
                                    >
                                        <ImageIcon className="w-6 h-6 text-gray-500 dark:text-gray-400 mb-1" />
                                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Upload File</span>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)} type="button">Cancel</Button>
                        <Button type="submit" disabled={submitting || uploading}>
                            {submitting || uploading ? 'Saving...' : 'Save Log'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Export Wizard Modal */}
            <Modal isOpen={wizardOpen} onClose={() => setWizardOpen(false)} title="Export Check & Adjust Reports">
                <div className="p-6 space-y-4 h-[70vh] flex flex-col">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Select a date range and equipment to generate and export Check & Adjust reports as a ZIP file.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Start Date</label>
                            <Input
                                type="date"
                                value={exportStartDate}
                                onChange={(e) => setExportStartDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">End Date</label>
                            <Input
                                type="date"
                                value={exportEndDate}
                                onChange={(e) => setExportEndDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col">
                        <div className="p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex justify-between items-center">
                            <span className="font-medium text-sm">Select Equipment</span>
                            <button 
                                onClick={selectAllExport}
                                className="text-xs text-blue-600 hover:underline"
                            >
                                {selectedExportIds.length > 0 && selectedExportIds.length === equipment.length ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        <div className="overflow-y-auto p-2 space-y-1">
                            {equipment.map(item => (
                                <label key={item.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-600 rounded cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedExportIds.includes(item.id)}
                                        onChange={() => toggleExportSelection(item.id)}
                                        className="rounded text-orange-500 focus:ring-orange-500"
                                    />
                                    <span className="text-sm">{item.name} <span className="text-gray-400 text-xs">({item.serial_number})</span></span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setWizardOpen(false)}>Cancel</Button>
                        <Button onClick={handleWizardExport} disabled={isExporting}>
                            {isExporting ? 'Generating...' : 'Export Reports'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default CheckAdjustPage;
