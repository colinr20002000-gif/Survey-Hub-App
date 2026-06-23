import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Card, Modal, Combobox } from '../components/ui';
import { Car, Search, ArrowUpDown, ArrowUp, ArrowDown, Loader2, Image as ImageIcon, Edit } from 'lucide-react';
import { formatDateForDisplay } from '../utils/dateHelpers';
import { getDepartmentColor } from '../utils/avatarColors';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../contexts/AuthContext';
import html2canvas from 'html2canvas';

const oklchCache = new Map();

const convertOklchToRgb = (oklchStr) => {
    if (!oklchStr || !oklchStr.includes('oklch(')) return oklchStr;
    if (oklchCache.has(oklchStr)) return oklchCache.get(oklchStr);

    try {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = oklchStr;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
        const result = a === 255 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
        oklchCache.set(oklchStr, result);
        return result;
    } catch (e) {
        return oklchStr;
    }
};

const backupAndFixStylesheets = () => {
    const backups = [];
    const sheets = document.styleSheets;

    const processRules = (rules, sheetIndex, rulePath = []) => {
        if (!rules) return;
        for (let j = 0; j < rules.length; j++) {
            const rule = rules[j];
            const path = [...rulePath, j];
            try {
                if (rule.style && rule.style.cssText && rule.style.cssText.includes('oklch(')) {
                    backups.push({
                        sheetIndex,
                        path,
                        originalCssText: rule.style.cssText
                    });
                    rule.style.cssText = rule.style.cssText.replace(/oklch\([^)]+\)/g, (match) => convertOklchToRgb(match));
                }
            } catch (e) { }
            if (rule.cssRules) {
                try {
                    processRules(rule.cssRules, sheetIndex, path);
                } catch (e) { }
            }
        }
    };

    for (let i = 0; i < sheets.length; i++) {
        const sheet = sheets[i];
        try {
            processRules(sheet.cssRules || sheet.rules, i);
        } catch (e) { }
    }

    return backups;
};

const restoreStylesheets = (backups) => {
    const sheets = document.styleSheets;
    backups.forEach(backup => {
        try {
            let rules = sheets[backup.sheetIndex].cssRules || sheets[backup.sheetIndex].rules;
            let rule = null;
            for (let idx of backup.path) {
                if (rules && rules[idx]) {
                    rule = rules[idx];
                    rules = rule.cssRules;
                } else {
                    rule = null;
                    break;
                }
            }
            if (rule && rule.style) {
                rule.style.cssText = backup.originalCssText;
            }
        } catch (e) { }
    });
};

const VehicleSummaryPage = () => {
    const { user: currentUser } = useAuth();
    const { canShowVehicleSummaryManageButton } = usePermissions();

    const [vehicles, setVehicles] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [users, setUsers] = useState([]);
    const [mileageLogs, setMileageLogs] = useState([]);
    const [latestInspections, setLatestInspections] = useState({});
    const [allTripLogs, setAllTripLogs] = useState([]);
    const [monthlyLogStatuses, setMonthlyLogStatuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'assignedTo', direction: 'ascending' });
    const [exporting, setExporting] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const tableRef = useRef(null);

    // Edit vehicle modal state
    const [showEditVehicle, setShowEditVehicle] = useState(false);
    const [vehicleToEdit, setVehicleToEdit] = useState(null);
    const [categories, setCategories] = useState([]);
    const [error, setError] = useState('');
    const [vehicleForm, setVehicleForm] = useState({
        name: '',
        description: '',
        category: '',
        serial_number: '',
        status: 'available',
        purchase_date: '',
        warranty_expiry: '',
        location: ''
    });

    // Handle vehicle edit submit
    const handleEditVehicle = async (e) => {
        e.preventDefault();
        try {
            // Check if serial number is being changed and if it already exists
            if (vehicleForm.serial_number !== vehicleToEdit.serial_number && vehicleForm.serial_number?.trim()) {
                const { data: existingVehicle, error: checkError } = await supabase
                    .from('vehicles')
                    .select('id')
                    .eq('serial_number', vehicleForm.serial_number)
                    .neq('id', vehicleToEdit.id)
                    .single();

                if (checkError && checkError.code !== 'PGRST116') {
                    throw checkError;
                }

                if (existingVehicle) {
                    setError('Serial number already exists. Please use a unique serial number.');
                    return;
                }
            }

            // Prepare form data with proper null handling for dates
            const formData = {
                name: vehicleForm.name.trim(),
                description: vehicleForm.description?.trim() || '',
                category: vehicleForm.category || '',
                serial_number: vehicleForm.serial_number?.trim() || null,
                status: vehicleForm.status || 'available',
                purchase_date: vehicleForm.purchase_date || null,
                warranty_expiry: vehicleForm.warranty_expiry || null,
                location: vehicleForm.location?.trim() || '',
                updated_by: currentUser.id
            };

            const { data, error } = await supabase
                .from('vehicles')
                .update(formData)
                .eq('id', vehicleToEdit.id)
                .select();

            if (error) {
                if (error.code === '23505' && error.message.includes('vehicles_serial_number_key')) {
                    setError('Serial number already exists. Please use a unique serial number.');
                } else {
                    setError(`Error updating vehicle: ${error.message}`);
                }
                return;
            }

            // Update vehicle in state
            setVehicles(prev => prev.map(veh =>
                veh.id === vehicleToEdit.id ? data[0] : veh
            ));

            setShowEditVehicle(false);
            setVehicleToEdit(null);
        } catch (err) {
            if (err.message.includes('duplicate key value violates unique constraint')) {
                setError('Serial number already exists. Please use a unique serial number.');
            } else {
                setError(`Error updating vehicle: ${err.message}`);
            }
        }
    };

    // Open edit vehicle modal
    const handleOpenEdit = (itemId) => {
        const vehicle = vehicles.find(v => v.id === itemId);
        if (!vehicle) return;

        setError('');
        setVehicleForm({
            name: vehicle.name || '',
            description: vehicle.description || '',
            category: vehicle.category || '',
            serial_number: vehicle.serial_number || '',
            status: vehicle.status || 'available',
            purchase_date: vehicle.purchase_date ? new Date(vehicle.purchase_date).toISOString().split('T')[0] : '',
            warranty_expiry: vehicle.warranty_expiry ? new Date(vehicle.warranty_expiry).toISOString().split('T')[0] : '',
            location: vehicle.location || ''
        });
        setVehicleToEdit(vehicle);
        setShowEditVehicle(true);
    };

    const handleExportImage = async () => {
        if (!tableRef.current) return;
        setExporting(true);

        // 1. Temporarily replace oklch colors in parent document's stylesheets and style elements
        const backups = backupAndFixStylesheets();
        const styleElements = Array.from(document.querySelectorAll('style'));
        const originalStyleTexts = styleElements.map(el => el.textContent);

        styleElements.forEach(el => {
            try {
                if (el.textContent && el.textContent.includes('oklch(')) {
                    el.textContent = el.textContent.replace(/oklch\([^)]+\)/g, (match) => convertOklchToRgb(match));
                }
            } catch (e) { }
        });

        try {
            await new Promise(resolve => setTimeout(resolve, 100));
            const element = tableRef.current;
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: null,
                onclone: (clonedDoc, clonedElement) => {
                    // Hide any no-export elements (like the Actions column header & cells) in the clone
                    const noExportElements = clonedElement.querySelectorAll('.no-export');
                    noExportElements.forEach(el => {
                        el.style.setProperty('display', 'none', 'important');
                    });

                    // 2. Prevent overflow cropping on the cloned element
                    const tableElement = clonedElement.querySelector('table');
                    if (tableElement) {
                        const scrollWidth = tableElement.scrollWidth;
                        const overflowContainer = clonedElement.querySelector('.overflow-x-auto');
                        if (overflowContainer) {
                            overflowContainer.style.overflow = 'visible';
                            overflowContainer.style.width = scrollWidth + 'px';
                        }
                        clonedElement.style.width = (scrollWidth + 2) + 'px';
                    }

                    // 3. Force override color-related computed styles for elements and SVGs (converts colors resolved as oklch)
                    const originalAll = [element, ...element.querySelectorAll('*')];
                    const clonedAll = [clonedElement, ...clonedElement.querySelectorAll('*')];
                    const colorProps = [
                        'background-color', 'color', 'border-color',
                        'border-top-color', 'border-bottom-color', 'border-left-color', 'border-right-color',
                        'fill', 'stroke', 'box-shadow', 'outline-color'
                    ];

                    for (let i = 0; i < originalAll.length; i++) {
                        const orig = originalAll[i];
                        const clone = clonedAll[i];
                        if (!orig || !clone) continue;

                        const computed = window.getComputedStyle(orig);
                        if (!computed) continue;

                        colorProps.forEach(prop => {
                            const val = computed.getPropertyValue(prop);
                            if (val) {
                                const converted = val.includes('oklch(')
                                    ? val.replace(/oklch\([^)]+\)/g, (match) => convertOklchToRgb(match))
                                    : val;
                                clone.style.setProperty(prop, converted);
                            }
                        });
                    }

                    // Apply structured overrides and layout adjustments to the clone to resolve text & icon misalignment
                    const isDarkMode = document.documentElement.classList.contains('dark');
                    if (isDarkMode) {
                        clonedDoc.documentElement.classList.add('dark');
                        clonedDoc.body.classList.add('dark');
                    }

                    // 1. Fix header sorting icons vertical alignment (Purely style-based)
                    const clonedThs = clonedElement.querySelectorAll('th');
                    clonedThs.forEach(th => {
                        const containerDiv = th.querySelector('div');
                        if (containerDiv) {
                            containerDiv.style.setProperty('display', 'inline-block', 'important');
                            containerDiv.style.setProperty('vertical-align', 'middle', 'important');
                            containerDiv.style.setProperty('line-height', '1', 'important');
                            
                            const sortSpan = containerDiv.querySelector('span');
                            if (sortSpan) {
                                sortSpan.style.setProperty('display', 'inline-block', 'important');
                                sortSpan.style.setProperty('vertical-align', 'middle', 'important');
                                sortSpan.style.setProperty('line-height', '1', 'important');
                            }
                            
                            const svg = containerDiv.querySelector('svg');
                            if (svg) {
                                svg.style.setProperty('display', 'inline-block', 'important');
                                svg.style.setProperty('vertical-align', 'middle', 'important');
                                svg.style.setProperty('margin-top', '-1px', 'important');
                            }
                        }
                    });

                    // 2. Fix colors & vertical alignment in status badges and other pills (Purely style-based)
                    const clonedSpans = clonedElement.querySelectorAll('span');
                    clonedSpans.forEach(span => {
                        const text = span.textContent || '';
                        const className = span.className || '';
                        const hasBg = className.includes('bg-') || span.style.backgroundColor;
                        const hasRounded = className.includes('rounded');
                        const isBadge = hasBg || hasRounded;

                        if (isBadge) {
                            // Apply universal alignment fix for all badge elements using line-height equal to height (no vertical padding)
                            span.style.setProperty('display', 'inline-block', 'important');
                            span.style.setProperty('vertical-align', 'middle', 'important');
                            span.style.setProperty('text-align', 'center', 'important');
                            span.style.setProperty('padding-top', '0', 'important');
                            span.style.setProperty('padding-bottom', '0', 'important');

                            if (className.includes('py-0.5')) {
                                span.style.setProperty('height', '18px', 'important');
                                span.style.setProperty('line-height', '18px', 'important');
                            } else {
                                span.style.setProperty('height', '22px', 'important');
                                span.style.setProperty('line-height', '22px', 'important');
                            }

                            const isUpToDate = text.includes('Up to Date');
                            const isOverdue = text.includes('Overdue') || text.includes('Pending');

                            if (isUpToDate && (className.includes('bg-green-100') || className.includes('bg-green-900') || className.includes('text-green-800') || className.includes('text-green-300'))) {
                                span.className = 'inline-block px-2.5 rounded-full text-xs font-semibold shadow-sm text-center align-middle';
                                span.style.setProperty('display', 'inline-block', 'important');
                                span.style.setProperty('vertical-align', 'middle', 'important');
                                span.style.setProperty('text-align', 'center', 'important');
                                span.style.setProperty('padding-top', '0', 'important');
                                span.style.setProperty('padding-bottom', '0', 'important');
                                span.style.setProperty('height', '22px', 'important');
                                span.style.setProperty('line-height', '22px', 'important');
                                if (isDarkMode) {
                                    span.style.setProperty('background-color', '#14532d', 'important');
                                    span.style.setProperty('color', '#4ade80', 'important');
                                } else {
                                    span.style.setProperty('background-color', '#dcfce7', 'important');
                                    span.style.setProperty('color', '#15803d', 'important');
                                }
                            } else if (isOverdue && (className.includes('bg-red-100') || className.includes('bg-red-900') || className.includes('text-red-800') || className.includes('text-red-300'))) {
                                span.className = 'inline-block px-2.5 rounded-full text-xs font-semibold shadow-sm text-center align-middle';
                                span.style.setProperty('display', 'inline-block', 'important');
                                span.style.setProperty('vertical-align', 'middle', 'important');
                                span.style.setProperty('text-align', 'center', 'important');
                                span.style.setProperty('padding-top', '0', 'important');
                                span.style.setProperty('padding-bottom', '0', 'important');
                                span.style.setProperty('height', '22px', 'important');
                                span.style.setProperty('line-height', '22px', 'important');
                                if (isDarkMode) {
                                    span.style.setProperty('background-color', '#7f1d1d', 'important');
                                    span.style.setProperty('color', '#f87171', 'important');
                                } else {
                                    span.style.setProperty('background-color', '#fee2e2', 'important');
                                    span.style.setProperty('color', '#b91c1c', 'important');
                                }

                                const childSpans = span.querySelectorAll('span');
                                childSpans.forEach(child => {
                                    child.style.setProperty('display', 'inline-block', 'important');
                                    child.style.setProperty('vertical-align', 'middle', 'important');
                                    child.style.setProperty('line-height', 'normal', 'important');
                                    
                                    if (child.className && child.className.includes('text-[10px]')) {
                                        child.style.setProperty('margin-left', '4px', 'important');
                                        if (isDarkMode) {
                                            child.style.setProperty('color', '#fca5a5', 'important');
                                        } else {
                                            child.style.setProperty('color', '#b91c1c', 'important');
                                        }
                                    } else {
                                        if (isDarkMode) {
                                            child.style.setProperty('color', '#f87171', 'important');
                                        } else {
                                            child.style.setProperty('color', '#b91c1c', 'important');
                                        }
                                    }
                                });
                            }
                        }
                    });
                }
            });

            const link = document.createElement('a');
            const timestamp = new Date().toISOString().split('T')[0];
            link.download = `vehicle_summary_${timestamp}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Error exporting table image:', error);
            alert('Failed to export image: ' + error.message);
        } finally {
            // Restore original parent document's stylesheets and style elements
            restoreStylesheets(backups);
            styleElements.forEach((el, idx) => {
                try {
                    el.textContent = originalStyleTexts[idx];
                } catch (e) { }
            });
            setExporting(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [
                { data: vehiclesData },
                { data: assignmentsData },
                { data: realUsers },
                { data: dummyUsers },
                { data: mileageData },
                { data: mileageLogsData },
                { data: monthlyLogsData }
            ] = await Promise.all([
                supabase.from('vehicles').select('*'),
                supabase.from('vehicle_assignments').select('*').is('returned_at', null),
                supabase.from('users').select('id, name, department').is('deleted_at', null),
                supabase.from('dummy_users').select('id, name, team_role').is('deleted_at', null),
                supabase.from('vehicle_inspection_logs')
                    .select('vehicle_id, mileage, inspection_date, created_at')
                    .order('inspection_date', { ascending: false })
                    .order('created_at', { ascending: false }),
                supabase.from('vehicle_mileage_logs')
                    .select('vehicle_id, date'),
                supabase.from('vehicle_monthly_logs')
                    .select('vehicle_id, year, month, status')
            ]);

            setVehicles(vehiclesData || []);
            setAssignments(assignmentsData || []);
            setUsers([
                ...(realUsers || []).map(u => ({ ...u, isDummy: false })),
                ...(dummyUsers || []).map(u => ({ ...u, isDummy: true, department: u.team_role }))
            ]);

            // Get latest mileage for each vehicle from the latest inspection
            const latestMileage = {};
            const latestInspectionMap = {};
            (mileageData || []).forEach(log => {
                if (!latestMileage[log.vehicle_id]) {
                    latestMileage[log.vehicle_id] = log.mileage;
                }
                if (!latestInspectionMap[log.vehicle_id]) {
                    latestInspectionMap[log.vehicle_id] = log;
                }
            });
            setMileageLogs(latestMileage);
            setLatestInspections(latestInspectionMap);
            setAllTripLogs(mileageLogsData || []);
            setMonthlyLogStatuses(monthlyLogsData || []);

            // Load vehicle categories for the edit dropdown
            try {
                const { data: categoryData } = await supabase
                    .from('dropdown_categories')
                    .select('id, name')
                    .eq('name', 'vehicle_type')
                    .single();

                if (categoryData) {
                    const { data: itemsData } = await supabase
                        .from('dropdown_items')
                        .select('id, value')
                        .eq('category_id', categoryData.id)
                        .order('value');
                    setCategories(itemsData || []);
                }
            } catch (categoryError) {
                console.error('Error fetching categories in VehicleSummaryPage:', categoryError);
            }

        } catch (error) {
            console.error('Error fetching vehicle summary data:', error);
        } finally {
            setLoading(false);
        }
    };

    const requestSort = (key) => {
        const header = tableHeaders.find(h => h.key === key);
        if (header?.nonSortable) return;

        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key) => {
        const header = tableHeaders.find(h => h.key === key);
        if (header?.nonSortable) return null;

        if (sortConfig.key !== key) return <ArrowUpDown className="w-3 h-3 ml-1.5 inline-block align-middle text-orange-200" />;
        return sortConfig.direction === 'ascending' ? <ArrowUp className="w-3 h-3 ml-1.5 inline-block align-middle text-white" /> : <ArrowDown className="w-3 h-3 ml-1.5 inline-block align-middle text-white" />;
    };

    const getAssignedUserObj = (vehicleId) => {
        const assignment = assignments.find(a => a.vehicle_id === vehicleId);
        if (!assignment) return null;
        return users.find(u => u.id === assignment.user_id) || null;
    };

    const getCategoryColor = (categoryName) => {
        const colors = {
            'Van': '#EF4444', // Red
            'Truck': '#8B5CF6', // Purple
            'Car': '#3B82F6', // Blue
            'Electric': '#10B981', // Green
            'Hybrid': '#F59E0B', // Amber
            'Uncategorized': '#6B7280' // Gray
        };

        return colors[categoryName] || '#f97316'; // Brand Orange as default
    };

    const getMOTStatusStyles = (dueDate) => {
        if (!dueDate) return 'text-gray-600 dark:text-gray-300';

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiryDate = new Date(dueDate);
        expiryDate.setHours(0, 0, 0, 0);

        const diffTime = expiryDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'text-red-500 font-bold';
        if (diffDays <= 30) return 'text-amber-500 font-bold';
        return 'text-green-500 font-bold';
    };

    const getInspectionStatusStyles = (status) => {
        switch (status) {
            case 'compliant':
                return 'text-green-500 font-bold';
            case 'upcoming':
                return 'text-amber-500 font-bold';
            case 'overdue':
                return 'text-red-500 font-bold';
            case 'never':
            default:
                return 'text-gray-600 dark:text-gray-300';
        }
    };

    const getDeadline = (month, year) => {
        const nextMonth = month === 12 ? 0 : month;
        const nextYear = month === 12 ? year + 1 : year;
        let date = new Date(nextYear, nextMonth, 1);
        while (date.getDay() !== 1) {
            date.setDate(date.getDate() + 1);
        }
        date.setHours(23, 59, 59, 999);
        return date;
    };

    const getMonthStatus = (vehicleId, monthKey) => {
        const [year, month] = monthKey.split('-');
        const log = monthlyLogStatuses.find(l =>
            l.vehicle_id === vehicleId &&
            l.year === parseInt(year) &&
            l.month === parseInt(month)
        );
        return log?.status || 'draft';
    };

    const getMileageOverdueStatus = (vehicleId) => {
        const vehicleLogs = allTripLogs.filter(l => l.vehicle_id === vehicleId);

        if (vehicleLogs.length === 0) return [];

        const firstLogDate = vehicleLogs.reduce((earliest, log) => {
            const date = new Date(log.date);
            return date < earliest ? date : earliest;
        }, new Date());

        const overdueMonths = [];
        const today = new Date();

        let currentCheckDate = new Date(firstLogDate.getFullYear(), firstLogDate.getMonth(), 1);

        while (currentCheckDate < new Date(today.getFullYear(), today.getMonth(), 1)) {
            const month = currentCheckDate.getMonth() + 1;
            const year = currentCheckDate.getFullYear();

            const deadline = getDeadline(month, year);

            if (today > deadline) {
                const status = getMonthStatus(vehicleId, `${year}-${String(month).padStart(2, '0')}`);
                if (status !== 'submitted') {
                    const monthName = currentCheckDate.toLocaleDateString('default', { month: 'short' });
                    overdueMonths.push(`${monthName} '${year.toString().slice(2)}`);
                }
            }

            currentCheckDate.setMonth(currentCheckDate.getMonth() + 1);
        }

        return overdueMonths;
    };

    const summaryData = useMemo(() => {
        return vehicles.map(vehicle => {
            const lastInspection = latestInspections[vehicle.id];
            let status = 'never';
            let lastInspected = 'Never';
            let nextDue = 'N/A';
            let lastInspectedSortVal = 0;
            let nextDueSortVal = 0;

            if (lastInspection) {
                const lastInspectionDate = new Date(lastInspection.inspection_date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                lastInspectionDate.setHours(0, 0, 0, 0);

                const daysSinceInspection = Math.floor((today - lastInspectionDate) / (1000 * 60 * 60 * 24));

                // Calculate next inspection date (7 days after last inspection)
                const nextInspectionDate = new Date(lastInspectionDate);
                nextInspectionDate.setDate(nextInspectionDate.getDate() + 7);

                // Format dates for display using helper
                lastInspected = formatDateForDisplay(lastInspectionDate);
                nextDue = formatDateForDisplay(nextInspectionDate);

                lastInspectedSortVal = lastInspectionDate.getTime();
                nextDueSortVal = nextInspectionDate.getTime();

                if (daysSinceInspection <= 7) {
                    status = 'compliant';
                } else if (daysSinceInspection <= 10) {
                    status = 'upcoming';
                } else {
                    status = 'overdue';
                }
            }

            const overdueList = getMileageOverdueStatus(vehicle.id);

            const assignedUserObj = getAssignedUserObj(vehicle.id);
            const assignedTo = assignedUserObj ? assignedUserObj.name : 'Unassigned';
            const assignedToDepartment = assignedUserObj ? assignedUserObj.department : null;

            return {
                id: vehicle.id,
                name: vehicle.name,
                registration: vehicle.serial_number || 'N/A',
                assignedTo,
                assignedToDepartment,
                currentMileage: mileageLogs[vehicle.id] || 0,
                motDueDate: vehicle.warranty_expiry,
                category: vehicle.category || 'Uncategorized',
                lastInspected,
                lastInspectedSortVal,
                nextDue,
                nextDueSortVal,
                inspectionStatus: status,
                overdueList,
                overdueCount: overdueList.length
            };
        });
    }, [vehicles, assignments, users, mileageLogs, latestInspections, allTripLogs, monthlyLogStatuses]);

    const filteredAndSortedData = useMemo(() => {
        let data = summaryData.filter(item =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.assignedTo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.lastInspected.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.nextDue.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.overdueCount > 0 ? `${item.overdueCount} pending overdue` : 'up to date').toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (sortConfig.key) {
            data.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                if (sortConfig.key === 'lastInspected') {
                    aValue = a.lastInspectedSortVal;
                    bValue = b.lastInspectedSortVal;
                }
                if (sortConfig.key === 'nextDue') {
                    aValue = a.nextDueSortVal;
                    bValue = b.nextDueSortVal;
                }

                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }

        return data;
    }, [summaryData, searchTerm, sortConfig]);

    const tableHeaders = useMemo(() => {
        const headers = [
            { key: 'name', label: 'Vehicle Name' },
            { key: 'registration', label: 'Registration' },
            { key: 'assignedTo', label: 'Assigned To' },
            { key: 'currentMileage', label: 'Current Mileage' },
            { key: 'motDueDate', label: 'MOT Due Date' },
            { key: 'lastInspected', label: 'Last Inspected' },
            { key: 'nextDue', label: 'Next Due' },
            { key: 'overdueCount', label: 'Mileage Overdue' },
            { key: 'category', label: 'Category' },
        ];
        if (canShowVehicleSummaryManageButton && isEditMode) {
            headers.push({ key: 'actions', label: 'Actions', nonSortable: true });
        }
        return headers;
    }, [canShowVehicleSummaryManageButton, isEditMode]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <div className="max-w-[1600px] mx-auto">
                <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                            <Car className="text-orange-500 w-8 h-8" />
                            Vehicle Summary
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Overview of all active company vehicles and their current status</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search vehicles, registration, or users..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm transition-all"
                            />
                        </div>

                        {canShowVehicleSummaryManageButton && (
                            <button
                                onClick={() => setIsEditMode(!isEditMode)}
                                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium shadow-sm transition-all cursor-pointer border ${
                                    isEditMode
                                        ? 'bg-red-500 hover:bg-red-600 text-white border-red-500'
                                        : 'bg-white hover:bg-gray-50 border-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                }`}
                            >
                                <Edit size={18} />
                                <span>{isEditMode ? 'Exit Manage Mode' : 'Manage'}</span>
                            </button>
                        )}

                        <button
                            onClick={handleExportImage}
                            disabled={exporting}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                        >
                            {exporting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Exporting...</span>
                                </>
                            ) : (
                                <>
                                    <ImageIcon size={18} />
                                    <span>Export Image</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div
                    ref={tableRef}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-white uppercase bg-orange-500 dark:bg-orange-600 border-b border-orange-600 dark:border-orange-800">
                                <tr>
                                    {tableHeaders.map(header => (
                                        <th
                                            key={header.key}
                                            scope="col"
                                            className={`${header.key === 'actions' ? 'no-export cursor-default' : 'cursor-pointer hover:bg-orange-600 dark:hover:bg-orange-700'} px-3 py-4 transition-colors text-center whitespace-nowrap`}
                                            onClick={() => requestSort(header.key)}
                                        >
                                            <div className="inline-block align-middle">
                                                <span className="inline-block align-middle">{header.label}</span>
                                                {getSortIndicator(header.key)}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredAndSortedData.length > 0 ? (
                                    filteredAndSortedData.map((item) => (
                                        <tr key={item.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-600/20 transition-colors">
                                            <td className="px-3 py-4 font-medium text-gray-900 dark:text-white text-center whitespace-nowrap">
                                                {item.name}
                                            </td>
                                            <td className="px-3 py-4 text-center whitespace-nowrap">
                                                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs font-mono font-bold uppercase tracking-wider">
                                                    {item.registration}
                                                </span>
                                            </td>
                                            <td className="px-3 py-4 text-center whitespace-nowrap">
                                                {item.assignedTo !== 'Unassigned' ? (
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold text-white shadow-sm ${getDepartmentColor(item.assignedToDepartment)}`}>
                                                        {item.assignedTo}
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                                                        {item.assignedTo}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 py-4 text-center font-mono tabular-nums whitespace-nowrap">
                                                {item.currentMileage.toLocaleString()} mi
                                            </td>
                                            <td className="px-3 py-4 text-center whitespace-nowrap">
                                                <span className={getMOTStatusStyles(item.motDueDate)}>
                                                    {item.motDueDate ? formatDateForDisplay(new Date(item.motDueDate)) : 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-4 text-center font-mono whitespace-nowrap">
                                                {item.lastInspected}
                                            </td>
                                            <td className="px-3 py-4 text-center font-mono whitespace-nowrap">
                                                <span className={getInspectionStatusStyles(item.inspectionStatus)}>
                                                    {item.nextDue}
                                                </span>
                                            </td>
                                            <td className="px-3 py-4 text-center whitespace-nowrap">
                                                {item.overdueList.length > 0 ? (
                                                    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 shadow-sm whitespace-nowrap text-center align-middle">
                                                        <span className="inline-block align-middle">{item.overdueList.length > 1 ? `${item.overdueList.length} Pending` : 'Overdue'}</span>
                                                        <span className="inline-block align-middle ml-1 text-[10px] opacity-75 font-normal">({item.overdueList[0]})</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 shadow-sm text-center align-middle">
                                                        Up to Date
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 py-4 text-center whitespace-nowrap">
                                                <span
                                                    className="px-2.5 py-0.5 rounded-full text-xs font-medium text-white shadow-sm"
                                                    style={{ backgroundColor: getCategoryColor(item.category) }}
                                                >
                                                    {item.category}
                                                </span>
                                            </td>
                                            {canShowVehicleSummaryManageButton && isEditMode && (
                                                <td className="no-export px-3 py-4 text-center whitespace-nowrap">
                                                    <button
                                                        onClick={() => handleOpenEdit(item.id)}
                                                        className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium shadow-sm transition-colors cursor-pointer inline-flex items-center gap-1"
                                                    >
                                                        <Edit className="w-3.5 h-3.5" />
                                                        <span>Select</span>
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={canShowVehicleSummaryManageButton && isEditMode ? 10 : 9} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                                            <div className="flex flex-col items-center gap-2">
                                                <Car className="w-8 h-8 opacity-20" />
                                                <p>No vehicles found matching your search.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            {/* Edit Vehicle Modal */}
            <Modal
                isOpen={showEditVehicle}
                onClose={() => {
                    setShowEditVehicle(false);
                    setVehicleToEdit(null);
                }}
                title="Edit Vehicle"
            >
                <form onSubmit={handleEditVehicle} className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
                    {error && (
                        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm rounded-lg">
                            {error}
                        </div>
                    )}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Name *</label>
                            <input
                                type="text"
                                value={vehicleForm.name}
                                onChange={(e) => setVehicleForm({ ...vehicleForm, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Description</label>
                            <textarea
                                value={vehicleForm.description}
                                onChange={(e) => setVehicleForm({ ...vehicleForm, description: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                rows="3"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Category</label>
                            <Combobox
                                value={vehicleForm.category}
                                onChange={(e) => setVehicleForm({ ...vehicleForm, category: e.target.value })}
                                options={categories.map(cat => cat.value)}
                                placeholder="Select Category"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Registration</label>
                            <input
                                type="text"
                                value={vehicleForm.serial_number}
                                onChange={(e) => setVehicleForm({ ...vehicleForm, serial_number: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Status</label>
                            <Combobox
                                value={vehicleForm.status === 'available' ? 'Available' : (vehicleForm.status === 'maintenance' ? 'Maintenance' : '')}
                                onChange={(e) => setVehicleForm({ ...vehicleForm, status: e.target.value.toLowerCase() })}
                                options={['Available', 'Maintenance']}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Purchase Date</label>
                            <input
                                type="date"
                                value={vehicleForm.purchase_date}
                                onChange={(e) => setVehicleForm({ ...vehicleForm, purchase_date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">MOT Expiry</label>
                            <input
                                type="date"
                                value={vehicleForm.warranty_expiry}
                                onChange={(e) => setVehicleForm({ ...vehicleForm, warranty_expiry: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Location</label>
                            <input
                                type="text"
                                value={vehicleForm.location}
                                onChange={(e) => setVehicleForm({ ...vehicleForm, location: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button
                            type="button"
                            onClick={() => {
                                setShowEditVehicle(false);
                                setVehicleToEdit(null);
                            }}
                            className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 py-2 px-4 rounded-lg font-medium shadow-sm transition-colors cursor-pointer border border-gray-300 dark:border-gray-600"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg font-medium shadow-sm transition-colors cursor-pointer"
                        >
                            Update Vehicle
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default VehicleSummaryPage;
