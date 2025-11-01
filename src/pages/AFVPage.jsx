import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Upload, Filter, X, Calendar, ExternalLink, TrendingUp, DollarSign, Percent, FileText, Download, Eye, FileSpreadsheet, Image, Calculator, Activity, BarChart2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Button, Select, Input, Pagination, Modal } from '../components/ui';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { toPng } from 'html-to-image';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';

const AFVPage = () => {
    // Permissions
    const { user } = useAuth();
    const { can } = usePermissions();

    // Check if user has permission to view AFV
    const canViewAFV = can('VIEW_AFV');
    const canImportCSV = can('IMPORT_AFV_CSV');
    // Colors for charts
    const COLORS = ['#fb923c', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

    // Data state
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    // Modal states
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Ref for dashboard export
    const dashboardRef = useRef(null);
    const exportRef = useRef(null);

    // Ref to track if data has been loaded
    const hasLoadedData = useRef(false);

    // Filter states with localStorage persistence
    const [dateRange, setDateRange] = useState(() => {
        const saved = localStorage.getItem('afv_dateRange');
        return saved || 'last30';
    });
    const [customStartDate, setCustomStartDate] = useState(() => {
        return localStorage.getItem('afv_customStartDate') || '';
    });
    const [customEndDate, setCustomEndDate] = useState(() => {
        return localStorage.getItem('afv_customEndDate') || '';
    });
    const [selectedProjects, setSelectedProjects] = useState(() => {
        const saved = localStorage.getItem('afv_selectedProjects');
        return saved ? JSON.parse(saved) : [];
    });
    const [selectedClients, setSelectedClients] = useState(() => {
        const saved = localStorage.getItem('afv_selectedClients');
        return saved ? JSON.parse(saved) : [];
    });
    const [selectedDisciplines, setSelectedDisciplines] = useState(() => {
        const saved = localStorage.getItem('afv_selectedDisciplines');
        return saved ? JSON.parse(saved) : [];
    });
    const [selectedWorkOrderTypes, setSelectedWorkOrderTypes] = useState(() => {
        const saved = localStorage.getItem('afv_selectedWorkOrderTypes');
        return saved ? JSON.parse(saved) : [];
    });
    const [selectedBusinesses, setSelectedBusinesses] = useState(() => {
        const saved = localStorage.getItem('afv_selectedBusinesses');
        return saved ? JSON.parse(saved) : [];
    });
    const [filterExpiredProjects, setFilterExpiredProjects] = useState(() => {
        const saved = localStorage.getItem('afv_filterExpiredProjects');
        return saved ? JSON.parse(saved) : true; // Default to true (filter out expired)
    });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    // Sorting
    const [sortConfig, setSortConfig] = useState({ key: 'project_number', direction: 'ascending' });

    // Dropdown states
    const [projectsDropdownOpen, setProjectsDropdownOpen] = useState(false);
    const [clientsDropdownOpen, setClientsDropdownOpen] = useState(false);
    const [disciplinesDropdownOpen, setDisciplinesDropdownOpen] = useState(false);
    const [workOrderTypesDropdownOpen, setWorkOrderTypesDropdownOpen] = useState(false);
    const [businessesDropdownOpen, setBusinessesDropdownOpen] = useState(false);

    // Refs for click outside
    const projectsRef = useRef(null);
    const clientsRef = useRef(null);
    const disciplinesRef = useRef(null);
    const workOrderTypesRef = useRef(null);
    const businessesRef = useRef(null);

    // Fetch AFV data from Supabase
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const { data: afvData, error } = await supabase
                .from('afv')
                .select('*')
                .order('project_number', { ascending: true })
                .limit(5000);

            if (error) throw error;
            setData(afvData || []);

            // Get the most recent created_at timestamp
            if (afvData && afvData.length > 0) {
                const timestamps = afvData.map(item => new Date(item.created_at)).filter(d => !isNaN(d.getTime()));
                if (timestamps.length > 0) {
                    const mostRecent = new Date(Math.max(...timestamps));
                    setLastUpdated(mostRecent);
                }
            }

            hasLoadedData.current = true;
        } catch (err) {
            console.error('Error fetching AFV data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!hasLoadedData.current) {
            fetchData();
        }
    }, [fetchData]);

    // Save scroll position
    useEffect(() => {
        const saveScrollPosition = () => {
            sessionStorage.setItem('afvScrollPosition', window.scrollY.toString());
        };

        const scrollInterval = setInterval(saveScrollPosition, 1000);

        return () => {
            clearInterval(scrollInterval);
            saveScrollPosition();
        };
    }, []);

    // Restore scroll position
    useEffect(() => {
        const savedScrollPosition = sessionStorage.getItem('afvScrollPosition');
        if (savedScrollPosition && !loading) {
            setTimeout(() => {
                window.scrollTo(0, parseInt(savedScrollPosition));
            }, 100);
        }
    }, [loading]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (projectsRef.current && !projectsRef.current.contains(event.target)) {
                setProjectsDropdownOpen(false);
            }
            if (clientsRef.current && !clientsRef.current.contains(event.target)) {
                setClientsDropdownOpen(false);
            }
            if (disciplinesRef.current && !disciplinesRef.current.contains(event.target)) {
                setDisciplinesDropdownOpen(false);
            }
            if (workOrderTypesRef.current && !workOrderTypesRef.current.contains(event.target)) {
                setWorkOrderTypesDropdownOpen(false);
            }
            if (businessesRef.current && !businessesRef.current.contains(event.target)) {
                setBusinessesDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Save filters to localStorage
    useEffect(() => {
        localStorage.setItem('afv_dateRange', dateRange);
    }, [dateRange]);

    useEffect(() => {
        localStorage.setItem('afv_customStartDate', customStartDate);
    }, [customStartDate]);

    useEffect(() => {
        localStorage.setItem('afv_customEndDate', customEndDate);
    }, [customEndDate]);

    useEffect(() => {
        localStorage.setItem('afv_selectedProjects', JSON.stringify(selectedProjects));
    }, [selectedProjects]);

    useEffect(() => {
        localStorage.setItem('afv_selectedClients', JSON.stringify(selectedClients));
    }, [selectedClients]);

    useEffect(() => {
        localStorage.setItem('afv_selectedDisciplines', JSON.stringify(selectedDisciplines));
    }, [selectedDisciplines]);

    useEffect(() => {
        localStorage.setItem('afv_selectedWorkOrderTypes', JSON.stringify(selectedWorkOrderTypes));
    }, [selectedWorkOrderTypes]);

    useEffect(() => {
        localStorage.setItem('afv_selectedBusinesses', JSON.stringify(selectedBusinesses));
    }, [selectedBusinesses]);

    useEffect(() => {
        localStorage.setItem('afv_filterExpiredProjects', JSON.stringify(filterExpiredProjects));
    }, [filterExpiredProjects]);

    // Get date range for filtering
    const getDateRange = useCallback(() => {
        const today = new Date();
        let startDate = null;
        let endDate = new Date(today);

        switch (dateRange) {
            case 'today': {
                startDate = new Date(today);
                break;
            }
            case 'yesterday': {
                startDate = new Date(today);
                startDate.setDate(startDate.getDate() - 1);
                endDate = new Date(startDate);
                break;
            }
            case 'last7': {
                startDate = new Date(today);
                startDate.setDate(startDate.getDate() - 7);
                break;
            }
            case 'last14': {
                startDate = new Date(today);
                startDate.setDate(startDate.getDate() - 14);
                break;
            }
            case 'last30': {
                startDate = new Date(today);
                startDate.setDate(startDate.getDate() - 30);
                break;
            }
            case 'last90': {
                startDate = new Date(today);
                startDate.setDate(startDate.getDate() - 90);
                break;
            }
            case 'thisWeek': {
                startDate = new Date(today);
                startDate.setDate(startDate.getDate() - today.getDay());
                break;
            }
            case 'lastWeek': {
                startDate = new Date(today);
                startDate.setDate(startDate.getDate() - today.getDay() - 7);
                endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + 6);
                break;
            }
            case 'thisMonth': {
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                break;
            }
            case 'lastMonth': {
                startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                endDate = new Date(today.getFullYear(), today.getMonth(), 0);
                break;
            }
            case 'thisQuarter': {
                const currentQuarter = Math.floor(today.getMonth() / 3);
                startDate = new Date(today.getFullYear(), currentQuarter * 3, 1);
                break;
            }
            case 'lastQuarter': {
                const lastQuarter = Math.floor(today.getMonth() / 3) - 1;
                const lastQuarterYear = lastQuarter < 0 ? today.getFullYear() - 1 : today.getFullYear();
                const adjustedQuarter = lastQuarter < 0 ? 3 : lastQuarter;
                startDate = new Date(lastQuarterYear, adjustedQuarter * 3, 1);
                endDate = new Date(lastQuarterYear, adjustedQuarter * 3 + 3, 0);
                break;
            }
            case 'thisYear': {
                startDate = new Date(today.getFullYear(), 0, 1);
                break;
            }
            case 'lastYear': {
                startDate = new Date(today.getFullYear() - 1, 0, 1);
                endDate = new Date(today.getFullYear() - 1, 11, 31);
                break;
            }
            case 'custom': {
                startDate = customStartDate ? new Date(customStartDate) : null;
                endDate = customEndDate ? new Date(customEndDate) : new Date(today);
                break;
            }
            case 'allTime': {
                startDate = null;
                endDate = null;
                break;
            }
            default: {
                break;
            }
        }

        return { startDate, endDate };
    }, [dateRange, customStartDate, customEndDate]);

    // Filter data based on selected filters
    const filteredData = useMemo(() => {
        let filtered = [...data];

        // Filter out projects where the end_date has expired (is in the past) - only if toggle is enabled
        if (filterExpiredProjects) {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Reset time to start of day for fair comparison
            filtered = filtered.filter(item => {
                if (!item.end_date) return true; // Keep projects without end date
                const itemEndDate = new Date(item.end_date);
                itemEndDate.setHours(0, 0, 0, 0);
                return itemEndDate >= today; // Keep only if end date is today or in the future
            });
        }

        // Date range filter (based on start_date only)
        const { startDate, endDate } = getDateRange();
        if (startDate || endDate) {
            filtered = filtered.filter(item => {
                if (!item.start_date) return false;

                const itemStartDate = new Date(item.start_date);

                // Include item if its start_date falls within the filter date range
                if (startDate && itemStartDate < startDate) return false;
                if (endDate && itemStartDate > endDate) return false;

                return true;
            });
        }

        // Project filter
        if (selectedProjects.length > 0) {
            filtered = filtered.filter(item => selectedProjects.includes(item.project_number));
        }

        // Client filter
        if (selectedClients.length > 0) {
            filtered = filtered.filter(item => selectedClients.includes(item.client));
        }

        // Discipline filter
        if (selectedDisciplines.length > 0) {
            filtered = filtered.filter(item => selectedDisciplines.includes(item.discipline));
        }

        // Work Order Type filter
        if (selectedWorkOrderTypes.length > 0) {
            filtered = filtered.filter(item => selectedWorkOrderTypes.includes(item.work_order_type));
        }

        // Business filter
        if (selectedBusinesses.length > 0) {
            filtered = filtered.filter(item => selectedBusinesses.includes(item.business));
        }

        return filtered;
    }, [data, getDateRange, selectedProjects, selectedClients, selectedDisciplines, selectedWorkOrderTypes, selectedBusinesses, filterExpiredProjects]);

    // Get unique values for dropdowns from filteredData
    const uniqueProjects = useMemo(() => {
        return [...new Set(data.map(item => item.project_number).filter(Boolean))].sort();
    }, [data]);

    const uniqueClients = useMemo(() => {
        return [...new Set(data.map(item => item.client).filter(Boolean))].sort();
    }, [data]);

    const uniqueDisciplines = useMemo(() => {
        return [...new Set(data.map(item => item.discipline).filter(Boolean))].sort();
    }, [data]);

    const uniqueWorkOrderTypes = useMemo(() => {
        return [...new Set(data.map(item => item.work_order_type).filter(Boolean))].sort();
    }, [data]);

    const uniqueBusinesses = useMemo(() => {
        return [...new Set(data.map(item => item.business).filter(Boolean))].sort();
    }, [data]);

    // Calculate KPIs
    const kpis = useMemo(() => {
        const totalRevenue = filteredData.reduce((sum, item) => sum + (parseFloat(item.order_value) || 0), 0);
        const totalForecastProfit = filteredData.reduce((sum, item) => sum + (parseFloat(item.forecast_profit) || 0), 0);
        const avgProfitMargin = filteredData.length > 0
            ? filteredData.reduce((sum, item) => sum + (parseFloat(item.profit_margin) || 0), 0) / filteredData.length
            : 0;
        const activeProjects = new Set(filteredData.map(item => item.project_number).filter(Boolean)).size;

        // New KPIs
        const anticipatedFinalCost = filteredData.reduce((sum, item) => sum + (parseFloat(item.anticipated_final_cost_ev) || 0), 0);
        const totalCostToDate = filteredData.reduce((sum, item) =>
            sum + (parseFloat(item.cost_to_date) || 0) + (parseFloat(item.manual_cost_adjustment) || 0), 0);
        const costToDateVsAnticipatedPercentage = anticipatedFinalCost > 0
            ? (totalCostToDate / anticipatedFinalCost) * 100
            : 0;
        const totalInvoiceValue = filteredData.reduce((sum, item) => sum + (parseFloat(item.cumulative_value) || 0), 0);
        const totalOrderValue = filteredData.reduce((sum, item) => sum + (parseFloat(item.order_value) || 0), 0);
        const invoiceVsOrderPercentage = totalOrderValue > 0
            ? (totalInvoiceValue / totalOrderValue) * 100
            : 0;
        const forecastGroupMargin = totalOrderValue > 0
            ? (totalForecastProfit / totalOrderValue) * 100
            : 0;

        return {
            totalRevenue,
            totalForecastProfit,
            avgProfitMargin: avgProfitMargin * 100, // Convert to percentage
            activeProjects,
            anticipatedFinalCost,
            totalCostToDate,
            costToDateVsAnticipatedPercentage,
            totalInvoiceValue,
            totalOrderValue,
            invoiceVsOrderPercentage,
            forecastGroupProfit: totalForecastProfit,
            forecastGroupMargin
        };
    }, [filteredData]);


    // Revenue by Discipline chart data
    const revenueByDisciplineData = useMemo(() => {
        const grouped = {};
        filteredData.forEach(item => {
            const discipline = item.discipline || 'Unknown';
            grouped[discipline] = (grouped[discipline] || 0) + (parseFloat(item.order_value) || 0);
        });

        return Object.entries(grouped)
            .map(([name, value]) => ({ name, value }))
            .filter(item => item.value > 0);
    }, [filteredData]);


    // Business Revenue Breakdown chart data
    const businessRevenueData = useMemo(() => {
        const engineeringRevenue = filteredData.reduce((sum, item) =>
            sum + (parseFloat(item.inoengineering_afv_revenue) || 0), 0);
        const surveyingRevenue = filteredData.reduce((sum, item) =>
            sum + (parseFloat(item.inosurveying_afv_revenue) || 0), 0);

        return [
            { name: 'InoEngineering', value: engineeringRevenue },
            { name: 'InoSurveying', value: surveyingRevenue }
        ].filter(item => item.value > 0);
    }, [filteredData]);

    // Top 10 Clients by Order Value chart data
    const topClientsByOrderValueData = useMemo(() => {
        const grouped = {};
        filteredData.forEach(item => {
            const client = item.client || 'Unknown';
            grouped[client] = (grouped[client] || 0) + (parseFloat(item.order_value) || 0);
        });

        return Object.entries(grouped)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
    }, [filteredData]);

    // Total Order Value Over Time chart data
    const orderValueOverTimeData = useMemo(() => {
        const grouped = {};

        filteredData.forEach(item => {
            if (!item.start_date) return;

            const date = new Date(item.start_date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!grouped[monthKey]) {
                grouped[monthKey] = { date: monthKey, orderValue: 0 };
            }
            grouped[monthKey].orderValue += (parseFloat(item.order_value) || 0);
        });

        return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
    }, [filteredData]);

    // Project Profit Margin Distribution (Histogram) chart data
    const profitMarginDistributionData = useMemo(() => {
        const bins = [
            { range: '<0%', min: -Infinity, max: 0, count: 0 },
            { range: '0-10%', min: 0, max: 0.1, count: 0 },
            { range: '10-20%', min: 0.1, max: 0.2, count: 0 },
            { range: '20-30%', min: 0.2, max: 0.3, count: 0 },
            { range: '30-40%', min: 0.3, max: 0.4, count: 0 },
            { range: '40-50%', min: 0.4, max: 0.5, count: 0 },
            { range: '>50%', min: 0.5, max: Infinity, count: 0 }
        ];

        filteredData.forEach(item => {
            const margin = parseFloat(item.profit_margin);
            if (isNaN(margin) || margin === null) return;

            // Find the appropriate bin
            for (let bin of bins) {
                if (margin >= bin.min && margin < bin.max) {
                    bin.count++;
                    break;
                }
            }
        });

        return bins.map(bin => ({ range: bin.range, count: bin.count }));
    }, [filteredData]);

    // Work Scope Breakdown chart data
    const workScopeBreakdownData = useMemo(() => {
        const grouped = {};
        filteredData.forEach(item => {
            const scope = item.original_scope_change || 'Unknown';
            grouped[scope] = (grouped[scope] || 0) + (parseFloat(item.order_value) || 0);
        });

        return Object.entries(grouped)
            .map(([name, value]) => ({ name, value }))
            .filter(item => item.value > 0);
    }, [filteredData]);

    // Project Count by Discipline chart data
    const projectCountByDisciplineData = useMemo(() => {
        const grouped = {};
        filteredData.forEach(item => {
            const discipline = item.discipline || 'Unknown';
            grouped[discipline] = (grouped[discipline] || 0) + 1;
        });

        return Object.entries(grouped)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [filteredData]);



    // Parse CSV line with proper comma and quote handling
    const parseCSVLine = (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        return result;
    };

    // Parse date from CSV
    const parseDate = (dateStr) => {
        if (!dateStr || dateStr.trim() === '') return null;

        try {
            // DD/MM/YYYY format (e.g., 30/10/2025)
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
                const [day, month, year] = dateStr.split('/');

                // Validate the date is actually valid (e.g., not 31/09/2025)
                const testDate = new Date(year, parseInt(month) - 1, parseInt(day));
                if (testDate.getFullYear() !== parseInt(year) ||
                    testDate.getMonth() !== parseInt(month) - 1 ||
                    testDate.getDate() !== parseInt(day)) {
                    console.warn(`Invalid date detected: "${dateStr}" - setting to null`);
                    return null;
                }

                return `${year}-${month}-${day}`;
            }
            // ISO 8601 with time (YYYY-MM-DDTHH:mm:ss) - just extract date part
            else if (/^\d{4}-\d{2}-\d{2}T/.test(dateStr)) {
                const datePart = dateStr.split('T')[0];
                // Validate the extracted date
                const [year, month, day] = datePart.split('-');
                const testDate = new Date(year, parseInt(month) - 1, parseInt(day));
                if (testDate.getFullYear() !== parseInt(year) ||
                    testDate.getMonth() !== parseInt(month) - 1 ||
                    testDate.getDate() !== parseInt(day)) {
                    console.warn(`Invalid date detected: "${dateStr}" - setting to null`);
                    return null;
                }
                return datePart;
            }
            // YYYY-MM-DD
            else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                // Validate the date
                const [year, month, day] = dateStr.split('-');
                const testDate = new Date(year, parseInt(month) - 1, parseInt(day));
                if (testDate.getFullYear() !== parseInt(year) ||
                    testDate.getMonth() !== parseInt(month) - 1 ||
                    testDate.getDate() !== parseInt(day)) {
                    console.warn(`Invalid date detected: "${dateStr}" - setting to null`);
                    return null;
                }
                return dateStr;
            }
            // Try native Date parsing as last resort
            else {
                const date = new Date(dateStr);
                if (!date || isNaN(date.getTime())) {
                    console.warn(`Unable to parse date: "${dateStr}"`);
                    return null;
                }
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
        } catch (e) {
            console.error('Error parsing date:', e);
            return null;
        }
    };

    // Handle CSV Import
    const handleCSVImport = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            setIsUploading(true);
            let text = await file.text();

            // Remove BOM if present
            if (text.charCodeAt(0) === 0xFEFF) {
                text = text.substring(1);
            }

            let rows = text.split('\n').filter(row => row.trim());

            // Check if first line is a separator declaration
            let headerRowIndex = 0;
            if (rows[0] && rows[0].trim().toLowerCase().startsWith('sep=')) {
                headerRowIndex = 1;
            }

            const rawHeaders = parseCSVLine(rows[headerRowIndex]);

            // Clean headers - remove "AFV[" prefix and "]" suffix
            const headers = rawHeaders.map(h => {
                let cleaned = h.trim();
                if (cleaned.startsWith('AFV[')) {
                    cleaned = cleaned.substring(4);
                }
                if (cleaned.endsWith(']')) {
                    cleaned = cleaned.substring(0, cleaned.length - 1);
                }
                // Convert to snake_case for database
                return cleaned.toLowerCase()
                    .replace(/\s+/g, '_')
                    .replace(/[()]/g, '')
                    .replace(/\//g, '_')
                    .replace(/__+/g, '_');
            }).filter(h => h !== '');

            console.log('CSV Headers:', headers);

            const records = [];

            for (let i = headerRowIndex + 1; i < rows.length; i++) {
                const rawValues = parseCSVLine(rows[i]);
                const record = {};

                let validColumnIndex = 0;
                rawHeaders.forEach((rawHeader, index) => {
                    const cleanHeader = rawHeader.trim();
                    if (cleanHeader === '') return;

                    const header = headers[validColumnIndex];
                    let value = rawValues[index];
                    validColumnIndex++;

                    // Trim string values
                    if (typeof value === 'string') {
                        value = value.trim();
                    }

                    // Convert empty values to null
                    if (value === '' || value === undefined || value === null) {
                        value = null;
                    }

                    // Parse date fields
                    if ((header === 'start_date' || header === 'end_date')) {
                        if (value) {
                            const parsedDate = parseDate(value);
                            record[header] = parsedDate;
                        } else {
                            record[header] = null;
                        }
                        return;
                    }

                    // Convert probability and profit_margin to decimals
                    if ((header === 'probability' || header === 'profit_margin')) {
                        if (value && value !== null) {
                            const num = parseFloat(value);
                            record[header] = !isNaN(num) ? num : null;
                        } else {
                            record[header] = null;
                        }
                        return;
                    }

                    // Convert integer fields
                    const integerFields = ['business_code', 'discipline_code', 'next_sequence_number'];
                    if (integerFields.includes(header)) {
                        if (value && value !== null) {
                            const num = parseInt(value);
                            record[header] = !isNaN(num) ? num : null;
                        } else {
                            record[header] = null;
                        }
                        return;
                    }

                    // Convert numeric fields
                    const numericFields = [
                        'inoengineering_afv_revenue', 'inosurveying_afv_revenue',
                        'initial_value', 'order_value', 'cumulative_value',
                        'value_to_complete', 'cost_to_date', 'manual_cost_adjustment',
                        'anticipated_final_cost_ev', 'forecast_profit', 'invoicing_%_complete'
                    ];
                    if (numericFields.includes(header)) {
                        if (value && value !== null) {
                            const num = parseFloat(value);
                            record[header] = !isNaN(num) ? num : null;
                        } else {
                            record[header] = null;
                        }
                        return;
                    }

                    // Default: set as-is for text fields
                    record[header] = value;
                });

                if (Object.keys(record).length > 0) {
                    records.push(record);
                }
            }

            console.log(`Parsed ${records.length} records from CSV`);

            // Validate records before inserting
            records.forEach((record, index) => {
                // Check for any numeric fields that might be strings
                const numericFields = [
                    'probability', 'inoengineering_afv_revenue', 'inosurveying_afv_revenue',
                    'initial_value', 'order_value', 'cumulative_value',
                    'value_to_complete', 'cost_to_date', 'manual_cost_adjustment',
                    'anticipated_final_cost_ev', 'forecast_profit', 'profit_margin', 'invoicing_%_complete'
                ];

                numericFields.forEach(field => {
                    if (record[field] !== null && record[field] !== undefined) {
                        if (typeof record[field] === 'string') {
                            console.warn(`Record ${index}: ${field} is a string: "${record[field]}"`);
                        } else if (isNaN(record[field])) {
                            console.warn(`Record ${index}: ${field} is NaN`);
                        }
                    }
                });
            });

            // Delete existing data
            const { error: deleteError } = await supabase
                .from('afv')
                .delete()
                .neq('id', 0);

            if (deleteError) throw deleteError;

            // Insert new records in batches
            const batchSize = 500;
            for (let i = 0; i < records.length; i += batchSize) {
                const batch = records.slice(i, i + batchSize);
                console.log(`Inserting batch ${Math.floor(i / batchSize) + 1}, records ${i} to ${i + batch.length}`);
                console.log('Sample record from batch:', JSON.stringify(batch[0], null, 2));

                const { error: insertError } = await supabase
                    .from('afv')
                    .insert(batch);

                if (insertError) {
                    console.error('Insert error details:', insertError);
                    console.error('Failed batch first record:', JSON.stringify(batch[0], null, 2));
                    throw new Error(`Insert failed: ${insertError.message || JSON.stringify(insertError)}`);
                }
            }

            // Refresh data
            await fetchData();
            setIsImportModalOpen(false);
            alert(`✅ Successfully imported ${records.length} AFV records!`);

        } catch (err) {
            console.error('Error importing CSV:', err);
            alert('Error importing CSV: ' + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    // Sorting
    const sortedData = useMemo(() => {
        const sorted = [...filteredData];
        sorted.sort((a, b) => {
            let aVal = a[sortConfig.key];
            let bVal = b[sortConfig.key];

            // Handle numeric fields
            const numericFields = ['order_value', 'forecast_profit', 'profit_margin', 'probability'];
            if (numericFields.includes(sortConfig.key)) {
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
            }

            // Handle null values
            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;

            if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [filteredData, sortConfig]);

    // Pagination
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sortedData.slice(start, start + itemsPerPage);
    }, [sortedData, currentPage, itemsPerPage]);

    const totalPages = useMemo(() => {
        if (!sortedData || sortedData.length === 0 || !itemsPerPage || itemsPerPage <= 0) return 0;
        return Math.ceil(sortedData.length / itemsPerPage);
    }, [sortedData, itemsPerPage]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key) => {
        if (sortConfig.key !== key) return '↕';
        return sortConfig.direction === 'ascending' ? '↑' : '↓';
    };

    // Handle file viewing (open in browser)
    const handleView = (url) => {
        if (!url) return;

        if (url.includes('sharepoint.com') || url.includes('.sharepoint.')) {
            let viewUrl = url.replace(/[?&]download=1/gi, '');
            const separator = viewUrl.includes('?') ? '&' : '?';
            viewUrl = `${viewUrl}${separator}web=1`;
            window.open(viewUrl, '_blank', 'noopener,noreferrer');
        } else if (url.toLowerCase().includes('.pdf')) {
            window.open(url, '_blank', 'noopener,noreferrer');
        } else if (url.toLowerCase().match(/\.(xlsx?m?|docx?m?|pptx?m?)$/i)) {
            const viewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`;
            window.open(viewerUrl, '_blank', 'noopener,noreferrer');
        } else {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    };

    // Handle opening file in Excel desktop application
    const handleOpenInExcel = (url) => {
        if (!url) return;

        // For SharePoint/OneDrive links, use the ms-excel protocol to open in desktop app
        if (url.includes('sharepoint.com') || url.includes('.sharepoint.')) {
            // Use the ms-excel protocol handler to open in Excel desktop
            window.location.href = `ms-excel:ofe|u|${url}`;
        } else if (url.toLowerCase().match(/\.(xlsx?m?)$/i)) {
            // For other Excel files, try the protocol handler
            window.location.href = `ms-excel:ofe|u|${url}`;
        } else {
            // Fallback to regular view
            handleView(url);
        }
    };

    // Handle file download
    const handleDownload = async (url, projectNo) => {
        if (!url) return;

        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;

            const urlParts = url.split('/');
            const fileName = urlParts[urlParts.length - 1] || `afv-${projectNo || 'file'}.xlsx`;
            link.download = fileName;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download failed:', error);
            window.open(url, '_blank');
        }
    };

    // Handle CSV Export
    const handleCSVExport = () => {
        try {
            const headers = filteredData.length > 0 ? Object.keys(filteredData[0]) : [];

            const csvContent = [
                headers.join(','),
                ...filteredData.map(item =>
                    headers.map(header => {
                        let value = item[header];

                        if (value === null || value === undefined) return '';
                        const stringValue = String(value);
                        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                            return `"${stringValue.replace(/"/g, '""')}"`;
                        }
                        return stringValue;
                    }).join(',')
                )
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);

            link.setAttribute('href', url);
            link.setAttribute('download', `afv-export-${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            alert(`✅ CSV Export Successful!\n\n📊 Exported Records: ${filteredData.length}`);
        } catch (error) {
            console.error('Error exporting CSV:', error);
            alert('❌ Error exporting CSV. Please try again.');
        }
    };

    // Handle Export Image
    const handleExportImage = async () => {
        if (!exportRef.current) return;

        setIsExporting(true);

        try {
            const dataUrl = await toPng(exportRef.current, {
                quality: 1,
                pixelRatio: 2,
                backgroundColor: '#ffffff'
            });

            const link = document.createElement('a');
            const fileName = `afv-dashboard-${new Date().toISOString().split('T')[0]}.png`;
            link.download = fileName;
            link.href = dataUrl;
            link.click();

            alert(`✅ Dashboard exported successfully!\n\nFile: ${fileName}\n\nNote: The exported image includes KPIs and charts only (filters are excluded).`);
        } catch (error) {
            console.error('Error exporting image:', error);
            alert('❌ Error exporting dashboard. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    // Format currency
    const formatCurrency = (value) => {
        if (value === null || value === undefined) return '£0.00';
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP'
        }).format(value);
    };

    // Format percentage
    const formatPercentage = (value) => {
        if (value === null || value === undefined) return '0%';
        return `${(value * 100).toFixed(2)}%`;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p className="text-red-800 dark:text-red-200">Error loading AFV data: {error}</p>
                </div>
            </div>
        );
    }

    // Check if user has permission to view AFV
    if (!canViewAFV) {
        return (
            <div className="p-6">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Access Denied</h3>
                            <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                                You don't have permission to view the AFV Dashboard. Please contact an administrator if you need access.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AFV Dashboard</h1>
                    {lastUpdated && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            Last imported: {lastUpdated.toLocaleString()}
                        </p>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={handleExportImage}
                        disabled={isExporting}
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                        <Image size={16} className="mr-2" />
                        {isExporting ? 'Exporting...' : 'Export Image'}
                    </Button>
                    <Button
                        onClick={handleCSVExport}
                        className="bg-green-500 hover:bg-green-600 text-white"
                    >
                        <FileSpreadsheet size={16} className="mr-2" />
                        Export CSV
                    </Button>
                    {canImportCSV && (
                        <Button
                            onClick={() => setIsImportModalOpen(true)}
                            className="bg-orange-500 hover:bg-orange-600 text-white"
                        >
                            <Upload size={16} className="mr-2" />
                            Import CSV
                        </Button>
                    )}
                </div>
            </div>

            {/* Dashboard Content */}
            <div ref={dashboardRef} className="space-y-6">
                {/* Filters */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Filter size={20} className="text-orange-500" />
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h2>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                                {kpis.activeProjects} Active Project{kpis.activeProjects !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Date Range Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Date Range
                            </label>
                            <select
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value)}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                <option value="today">Today</option>
                                <option value="yesterday">Yesterday</option>
                                <option value="last7">Last 7 Days</option>
                                <option value="last14">Last 14 Days</option>
                                <option value="last30">Last 30 Days</option>
                                <option value="last90">Last 90 Days</option>
                                <option value="thisWeek">This Week</option>
                                <option value="lastWeek">Last Week</option>
                                <option value="thisMonth">This Month</option>
                                <option value="lastMonth">Last Month</option>
                                <option value="thisQuarter">This Quarter</option>
                                <option value="lastQuarter">Last Quarter</option>
                                <option value="thisYear">This Year</option>
                                <option value="lastYear">Last Year</option>
                                <option value="custom">Custom Range</option>
                                <option value="allTime">All Time</option>
                            </select>
                        </div>

                        {/* Custom Date Range */}
                        {dateRange === 'custom' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        value={customStartDate}
                                        onChange={(e) => setCustomStartDate(e.target.value)}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        End Date
                                    </label>
                                    <input
                                        type="date"
                                        value={customEndDate}
                                        onChange={(e) => setCustomEndDate(e.target.value)}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                            </>
                        )}

                        {/* Project Filter */}
                        <div ref={projectsRef} className="relative">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Project Number
                            </label>
                            <div
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer flex justify-between items-center"
                                onClick={() => setProjectsDropdownOpen(!projectsDropdownOpen)}
                            >
                                <span className="truncate">
                                    {selectedProjects.length === 0 ? 'All Projects' : `${selectedProjects.length} selected`}
                                </span>
                                <span>▼</span>
                            </div>
                            {projectsDropdownOpen && (
                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    <div className="p-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setSelectedProjects([])}
                                            className="w-full mb-2"
                                        >
                                            Clear All
                                        </Button>
                                        {uniqueProjects.map(project => (
                                            <label key={project} className="flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedProjects.includes(project)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedProjects([...selectedProjects, project]);
                                                        } else {
                                                            setSelectedProjects(selectedProjects.filter(p => p !== project));
                                                        }
                                                    }}
                                                    className="mr-2"
                                                />
                                                <span className="text-sm text-gray-900 dark:text-white">{project}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Client Filter */}
                        <div ref={clientsRef} className="relative">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Client
                            </label>
                            <div
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer flex justify-between items-center"
                                onClick={() => setClientsDropdownOpen(!clientsDropdownOpen)}
                            >
                                <span className="truncate">
                                    {selectedClients.length === 0 ? 'All Clients' : `${selectedClients.length} selected`}
                                </span>
                                <span>▼</span>
                            </div>
                            {clientsDropdownOpen && (
                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    <div className="p-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setSelectedClients([])}
                                            className="w-full mb-2"
                                        >
                                            Clear All
                                        </Button>
                                        {uniqueClients.map(client => (
                                            <label key={client} className="flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedClients.includes(client)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedClients([...selectedClients, client]);
                                                        } else {
                                                            setSelectedClients(selectedClients.filter(c => c !== client));
                                                        }
                                                    }}
                                                    className="mr-2"
                                                />
                                                <span className="text-sm text-gray-900 dark:text-white">{client}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Discipline Filter */}
                        <div ref={disciplinesRef} className="relative">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Discipline
                            </label>
                            <div
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer flex justify-between items-center"
                                onClick={() => setDisciplinesDropdownOpen(!disciplinesDropdownOpen)}
                            >
                                <span className="truncate">
                                    {selectedDisciplines.length === 0 ? 'All Disciplines' : `${selectedDisciplines.length} selected`}
                                </span>
                                <span>▼</span>
                            </div>
                            {disciplinesDropdownOpen && (
                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    <div className="p-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setSelectedDisciplines([])}
                                            className="w-full mb-2"
                                        >
                                            Clear All
                                        </Button>
                                        {uniqueDisciplines.map(discipline => (
                                            <label key={discipline} className="flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedDisciplines.includes(discipline)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedDisciplines([...selectedDisciplines, discipline]);
                                                        } else {
                                                            setSelectedDisciplines(selectedDisciplines.filter(d => d !== discipline));
                                                        }
                                                    }}
                                                    className="mr-2"
                                                />
                                                <span className="text-sm text-gray-900 dark:text-white">{discipline}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Work Order Type Filter */}
                        <div ref={workOrderTypesRef} className="relative">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Work Order Type
                            </label>
                            <div
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer flex justify-between items-center"
                                onClick={() => setWorkOrderTypesDropdownOpen(!workOrderTypesDropdownOpen)}
                            >
                                <span className="truncate">
                                    {selectedWorkOrderTypes.length === 0 ? 'All Types' : `${selectedWorkOrderTypes.length} selected`}
                                </span>
                                <span>▼</span>
                            </div>
                            {workOrderTypesDropdownOpen && (
                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    <div className="p-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setSelectedWorkOrderTypes([])}
                                            className="w-full mb-2"
                                        >
                                            Clear All
                                        </Button>
                                        {uniqueWorkOrderTypes.map(type => (
                                            <label key={type} className="flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedWorkOrderTypes.includes(type)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedWorkOrderTypes([...selectedWorkOrderTypes, type]);
                                                        } else {
                                                            setSelectedWorkOrderTypes(selectedWorkOrderTypes.filter(t => t !== type));
                                                        }
                                                    }}
                                                    className="mr-2"
                                                />
                                                <span className="text-sm text-gray-900 dark:text-white">{type}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Business Filter */}
                        <div ref={businessesRef} className="relative">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Business
                            </label>
                            <div
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer flex justify-between items-center"
                                onClick={() => setBusinessesDropdownOpen(!businessesDropdownOpen)}
                            >
                                <span className="truncate">
                                    {selectedBusinesses.length === 0 ? 'All Businesses' : `${selectedBusinesses.length} selected`}
                                </span>
                                <span>▼</span>
                            </div>
                            {businessesDropdownOpen && (
                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    <div className="p-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setSelectedBusinesses([])}
                                            className="w-full mb-2"
                                        >
                                            Clear All
                                        </Button>
                                        {uniqueBusinesses.map(business => (
                                            <label key={business} className="flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedBusinesses.includes(business)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedBusinesses([...selectedBusinesses, business]);
                                                        } else {
                                                            setSelectedBusinesses(selectedBusinesses.filter(b => b !== business));
                                                        }
                                                    }}
                                                    className="mr-2"
                                                />
                                                <span className="text-sm text-gray-900 dark:text-white">{business}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Filter Expired Projects Toggle */}
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={filterExpiredProjects}
                                onChange={(e) => setFilterExpiredProjects(e.target.checked)}
                                className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-700"
                            />
                            <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                Hide projects with expired end dates
                            </span>
                        </label>
                    </div>
                </div>

                {/* Exportable Content - KPIs and Charts */}
                <div ref={exportRef} className="space-y-6">
                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* 1. Total Order Value */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Total Order Value</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                    {formatCurrency(kpis.totalOrderValue)}
                                </p>
                            </div>
                            <DollarSign className="h-10 w-10 text-teal-500" />
                        </div>
                    </div>

                    {/* 2. Total Invoice Value */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Total Invoice Value</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                    {formatCurrency(kpis.totalInvoiceValue)}
                                </p>
                            </div>
                            <BarChart2 className="h-10 w-10 text-indigo-500" />
                        </div>
                    </div>

                    {/* 3. Invoice vs Order Value */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Invoice vs Order Value</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                    {kpis.invoiceVsOrderPercentage.toFixed(0)}%
                                </p>
                            </div>
                            <Percent className="h-10 w-10 text-pink-500" />
                        </div>
                    </div>

                    {/* 4. Forecast Profit */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Forecast Profit</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                    {formatCurrency(kpis.forecastGroupProfit)}
                                </p>
                            </div>
                            <TrendingUp className="h-10 w-10 text-green-500" />
                        </div>
                    </div>

                    {/* 5. Forecast Margin */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Forecast Margin</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                    {kpis.forecastGroupMargin.toFixed(0)}%
                                </p>
                            </div>
                            <Percent className="h-10 w-10 text-blue-500" />
                        </div>
                    </div>

                    {/* 6. Anticipated Final Cost */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Anticipated Final Cost</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                    {formatCurrency(kpis.anticipatedFinalCost)}
                                </p>
                            </div>
                            <Calculator className="h-10 w-10 text-cyan-500" />
                        </div>
                    </div>

                    {/* 7. Total Cost to Date */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Total Cost to Date</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                    {formatCurrency(kpis.totalCostToDate)}
                                </p>
                            </div>
                            <DollarSign className="h-10 w-10 text-red-500" />
                        </div>
                    </div>

                    {/* 8. Cost to Date vs Anticipated */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Cost to Date vs Anticipated</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                    {kpis.costToDateVsAnticipatedPercentage.toFixed(0)}%
                                </p>
                            </div>
                            <Activity className="h-10 w-10 text-yellow-500" />
                        </div>
                    </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Business Revenue Breakdown - Always show */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Business Revenue Breakdown</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={businessRevenueData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {businessRevenueData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => formatCurrency(value)} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Revenue by Discipline - Only show for single project */}
                    {selectedProjects.length === 1 && (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue by Discipline</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={revenueByDisciplineData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {revenueByDisciplineData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => formatCurrency(value)} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Top 10 Clients by Order Value - Only show for multiple projects */}
                    {selectedProjects.length !== 1 && (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top 10 Clients by Order Value</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={topClientsByOrderValueData} margin={{ top: 5, right: 30, left: 20, bottom: 20 }} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis
                                        type="number"
                                        tick={{ fill: '#9ca3af' }}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        tick={false}
                                        width={10}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                                        labelStyle={{ color: '#f3f4f6' }}
                                        formatter={(value) => formatCurrency(value)}
                                    />
                                    <Bar
                                        dataKey="value"
                                        fill="#fb923c"
                                        label={{
                                            position: 'insideLeft',
                                            fill: '#ffffff',
                                            fontSize: 12,
                                            content: ({ x, y, width, height, value, index }) => {
                                                const item = topClientsByOrderValueData[index];
                                                return (
                                                    <text
                                                        x={x + 5}
                                                        y={y + height / 2}
                                                        fill="#ffffff"
                                                        textAnchor="start"
                                                        dominantBaseline="middle"
                                                        fontSize={12}
                                                    >
                                                        {item?.name}
                                                    </text>
                                                );
                                            }
                                        }}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Total Order Value Over Time - Only show for multiple projects */}
                    {selectedProjects.length !== 1 && (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Total Order Value Over Time</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={orderValueOverTimeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                                    />
                                    <YAxis
                                        tick={{ fill: '#9ca3af' }}
                                        width={80}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                                        labelStyle={{ color: '#f3f4f6' }}
                                        formatter={(value) => formatCurrency(value)}
                                    />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="orderValue"
                                        stroke="#fb923c"
                                        name="Order Value"
                                        strokeWidth={2}
                                        dot={{ r: 4 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Project Profit Margin Distribution - Only show for multiple projects */}
                    {selectedProjects.length !== 1 && (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Project Profit Margin Distribution</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={profitMarginDistributionData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis
                                        dataKey="range"
                                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                                    />
                                    <YAxis
                                        tick={{ fill: '#9ca3af' }}
                                        width={60}
                                        label={{ value: 'Count of Projects', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                                        labelStyle={{ color: '#f3f4f6' }}
                                    />
                                    <Bar dataKey="count" fill="#10b981" name="Projects" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Work Scope Breakdown - Always show */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Work Scope Breakdown (by Value)</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={workScopeBreakdownData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {workScopeBreakdownData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => formatCurrency(value)} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Project Count by Discipline - Always show */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Project Count by Discipline</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={projectCountByDisciplineData} margin={{ top: 20, right: 30, left: 60, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis
                                    dataKey="name"
                                    tick={false}
                                    axisLine={{ stroke: '#374151' }}
                                />
                                <YAxis
                                    tick={{ fill: '#9ca3af' }}
                                    width={50}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                                    labelStyle={{ color: '#f3f4f6' }}
                                />
                                <Bar dataKey="count" fill="#8b5cf6" name="Projects" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden mt-6">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                AFV Data ({filteredData.length} records)
                            </h3>
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                    Show per page:
                                </span>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => {
                                        setItemsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                                        onClick={() => requestSort('project_number')}>
                                        Project Number {getSortIndicator('project_number')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                                        onClick={() => requestSort('project_name')}>
                                        Project Name {getSortIndicator('project_name')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                                        onClick={() => requestSort('client')}>
                                        Client {getSortIndicator('client')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                                        onClick={() => requestSort('discipline')}>
                                        Discipline {getSortIndicator('discipline')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                                        onClick={() => requestSort('work_order_title')}>
                                        Work Order Title {getSortIndicator('work_order_title')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                                        onClick={() => requestSort('order_value')}>
                                        Order Value {getSortIndicator('order_value')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                                        onClick={() => requestSort('forecast_profit')}>
                                        Forecast Profit {getSortIndicator('forecast_profit')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                                        onClick={() => requestSort('profit_margin')}>
                                        Profit Margin {getSortIndicator('profit_margin')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                                        onClick={() => requestSort('start_date')}>
                                        Start Date {getSortIndicator('start_date')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                                        onClick={() => requestSort('end_date')}>
                                        End Date {getSortIndicator('end_date')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {paginatedData.map((item, index) => (
                                    <tr key={item.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {item.project_number || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                            {item.project_name || '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {item.client || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                            {item.discipline || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                            {item.work_order_title || '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {formatCurrency(item.order_value)}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {formatCurrency(item.forecast_profit)}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {formatPercentage(item.profit_margin)}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {item.start_date ? new Date(item.start_date).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {item.end_date ? new Date(item.end_date).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                                            {item.link && (
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleView(item.link)}
                                                        title="Open in browser"
                                                    >
                                                        <Eye size={14} />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleDownload(item.link, item.project_number)}
                                                        title="Download file"
                                                    >
                                                        <Download size={14} />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleOpenInExcel(item.link)}
                                                        title="Open in Excel"
                                                    >
                                                        <FileSpreadsheet size={14} />
                                                    </Button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                            <Pagination
                                currentPage={currentPage}
                                setCurrentPage={setCurrentPage}
                                totalPages={totalPages}
                                itemsPerPage={itemsPerPage}
                                setItemsPerPage={setItemsPerPage}
                                totalItems={sortedData.length}
                            />
                        </div>
                    )}
                </div>

            {/* Import Modal */}
            {isImportModalOpen && (
                <Modal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    title="Import AFV Data"
                >
                    <div className="p-6">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Upload a CSV file containing AFV data. The CSV should include headers with AFV[] prefixes (e.g., AFV[Project Number]).
                        </p>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleCSVImport}
                            disabled={isUploading}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        {isUploading && (
                            <div className="mt-4 text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Uploading...</p>
                            </div>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default AFVPage;
