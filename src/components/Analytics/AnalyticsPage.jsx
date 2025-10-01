import React, { useState, useEffect, useContext, useMemo, createContext } from 'react';
import {
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line,
    CartesianGrid,
    XAxis,
    YAxis
} from 'recharts';
import {
    ChevronDown,
    ChevronUp,
    ChevronLeft,
    ChevronRight,
    Calendar,
    Download,
    FileSpreadsheet,
    Filter,
    TrendingUp,
    Loader2
} from 'lucide-react';
import { supabase } from '../../supabaseClient';

// Context hooks that need to be imported from the main app
// These would need to be provided by parent components or imported from context files
const useProjects = () => {
    const context = useContext(ProjectContext);
    if (!context) {
        throw new Error('useProjects must be used within a ProjectProvider');
    }
    return context;
};

const useJobs = () => {
    const context = useContext(JobContext);
    if (!context) {
        throw new Error('useJobs must be used within a JobProvider');
    }
    return context;
};

const useUsers = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUsers must be used within a UserProvider');
    }
    return context;
};

// Create context placeholders - these should be imported from the main app
const ProjectContext = createContext(null);
const JobContext = createContext(null);
const UserContext = createContext(null);

// Shared utility components
const Input = ({ label, disabled, className, ...props }) => (
    <div>
        {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
        <input
            {...props}
            disabled={disabled}
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                disabled
                    ? 'bg-gray-100 dark:bg-gray-600 border-gray-300 dark:border-gray-500 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'
            } ${className || ''}`}
        />
    </div>
);

const Button = ({ children, variant = 'primary', size = 'md', ...props }) => {
    const baseClasses = "font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors duration-200 flex items-center justify-center";
    const variants = {
        primary: 'text-white bg-orange-500 hover:bg-orange-600 focus:ring-orange-500',
        outline: 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 focus:ring-orange-500',
        danger: 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500',
    };
     const sizes = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm',
    };
    return <button {...props} className={`${baseClasses} ${variants[variant]} ${sizes[size]}`}>{children}</button>;
};

// Shared export utility functions for all analytics components
const showLoadingIndicator = (message = 'Processing...') => {
    const loadingElement = document.createElement('div');
    loadingElement.id = 'export-loading';
    loadingElement.innerHTML = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
            <div style="
                background: white;
                padding: 20px 40px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            ">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite; margin-right: 12px; color: #f97316;">
                    <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c.93 0 1.83.14 2.68.4"></path>
                </svg>
                <span style="color: #374151; font-weight: 500;">${message}</span>
            </div>
        </div>
        <style>
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        </style>
    `;
    document.body.appendChild(loadingElement);
    return loadingElement;
};

const hideLoadingIndicator = () => {
    const loadingElement = document.getElementById('export-loading');
    if (loadingElement) {
        document.body.removeChild(loadingElement);
    }
};

const loadHtml2Canvas = () => {
    return new Promise((resolve, reject) => {
        // Check if html2canvas is already loaded
        if (window.html2canvas) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = () => {
            console.log('html2canvas loaded successfully');
            resolve();
        };
        script.onerror = (error) => {
            console.error('Failed to load html2canvas:', error);
            reject(new Error('Failed to load html2canvas library'));
        };
        document.head.appendChild(script);
    });
};

const captureScreenshot = async (element) => {
    try {
        // Load html2canvas if not available
        if (!window.html2canvas) {
            await loadHtml2Canvas();
        }

        // Wait a moment for animations to settle
        await new Promise(resolve => setTimeout(resolve, 500));

        // Try multiple capture approaches with onclone callback
        return await attemptCapture(element);

    } catch (error) {
        console.error('Screenshot capture failed:', error);
        throw error;
    }
};

const attemptCapture = async (element) => {
    const oklchToHex = {
        'oklch(0.986 0.003 247.858)': '#f9fafb', 'oklch(0.943 0.006 264.052)': '#f3f4f6',
        'oklch(0.875 0.013 253.094)': '#e5e7eb', 'oklch(0.789 0.019 252.665)': '#d1d5db',
        'oklch(0.682 0.025 260.067)': '#9ca3af', 'oklch(0.566 0.031 259.816)': '#6b7280',
        'oklch(0.451 0.037 259.734)': '#4b5563', 'oklch(0.337 0.043 259.692)': '#374151',
        'oklch(0.227 0.049 259.654)': '#1f2937', 'oklch(0.117 0.055 259.616)': '#111827',
        'oklch(0.989 0.002 106.423)': '#fafaf9', 'oklch(0.925 0.013 106.423)': '#f5f5f4',
        'oklch(0.871 0.022 106.423)': '#e7e5e4', 'oklch(0.764 0.044 106.423)': '#d6d3d1',
        'oklch(0.656 0.065 106.423)': '#a8a29e', 'oklch(0.543 0.087 106.423)': '#78716c',
        'oklch(0.434 0.109 106.423)': '#57534e', 'oklch(0.325 0.131 106.423)': '#44403c',
        'oklch(0.216 0.152 106.423)': '#292524', 'oklch(0.108 0.174 106.423)': '#1c1917',
        'oklch(0.986 0.012 70.672)': '#fff7ed', 'oklch(0.959 0.042 65.552)': '#ffedd5',
        'oklch(0.910 0.079 58.454)': '#fed7aa', 'oklch(0.848 0.119 53.503)': '#fdba74',
        'oklch(0.781 0.159 50.066)': '#fb923c', 'oklch(0.706 0.195 47.644)': '#f97316',
        'oklch(0.627 0.224 45.843)': '#ea580c', 'oklch(0.548 0.252 44.484)': '#c2410c',
        'oklch(0.985 0.007 252.417)': '#eff6ff', 'oklch(0.953 0.028 248.515)': '#dbeafe',
        'oklch(0.900 0.065 243.837)': '#bfdbfe', 'oklch(0.638 0.198 234.752)': '#3b82f6',
        'oklch(0.987 0.013 17.381)': '#fef2f2', 'oklch(0.732 0.205 15.030)': '#ef4444',
        'oklch(0.986 0.014 163.214)': '#f0fdf4', 'oklch(0.705 0.207 161.826)': '#22c55e'
    };

    const onCloneCallback = (clonedDoc) => {
        console.log('Processing cloned document to fix oklch colors...');

        // Find and modify all stylesheets in the cloned document
        const stylesheets = clonedDoc.styleSheets || [];
        for (const stylesheet of stylesheets) {
            try {
                if (stylesheet.cssRules) {
                    for (const rule of stylesheet.cssRules) {
                        if (rule.style) {
                            // Process each CSS property
                            for (let i = 0; i < rule.style.length; i++) {
                                const prop = rule.style[i];
                                let value = rule.style.getPropertyValue(prop);

                                if (value && value.includes('oklch(')) {
                                    // Replace oklch with hex
                                    for (const [oklch, hex] of Object.entries(oklchToHex)) {
                                        value = value.replace(new RegExp(oklch.replace(/[()]/g, '\\$&'), 'g'), hex);
                                    }
                                    // Fallback for unmapped oklch
                                    value = value.replace(/oklch\([^)]+\)/g, '#6b7280');

                                    rule.style.setProperty(prop, value);
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                // Skip CORS-blocked stylesheets
                console.warn('Could not process stylesheet:', e.message);
            }
        }

        // Also inject a style element to override any remaining oklch colors
        const overrideStyle = clonedDoc.createElement('style');
        overrideStyle.textContent = `
            * {
                color: inherit !important;
                background-color: inherit !important;
                border-color: inherit !important;
            }
            [style*="oklch"] {
                color: #374151 !important;
                background-color: #ffffff !important;
            }
        `;
        clonedDoc.head.appendChild(overrideStyle);

        console.log('Cloned document processing complete');
    };

    const captureOptions = [
        // Option 1: True screenshot with current viewport rendering
        {
            scale: 1,
            useCORS: true,
            allowTaint: true,
            backgroundColor: null, // Preserve original background
            logging: false,
            width: element.offsetWidth,
            height: element.offsetHeight,
            x: 0,
            y: 0,
            scrollX: 0,
            scrollY: 0,
            onclone: (clonedDoc, clonedElement) => {
                // Preserve exact layout as shown in browser
                clonedElement.style.transform = 'none';
                clonedElement.style.position = 'static';

                // Apply oklch color fixes only
                onCloneCallback(clonedDoc);
            },
            ignoreElements: (el) => {
                // Only ignore truly hidden elements
                return el.style?.display === 'none' ||
                       el.style?.visibility === 'hidden' ||
                       el.classList?.contains('sr-only') ||
                       (el.offsetWidth === 0 && el.offsetHeight === 0);
            }
        },
        // Option 2: High-quality screenshot capture
        {
            scale: 2,
            backgroundColor: null,
            allowTaint: true,
            useCORS: true,
            logging: false,
            width: element.offsetWidth,
            height: element.offsetHeight,
            onclone: (clonedDoc, clonedElement) => {
                // Keep original styling
                clonedElement.style.width = element.offsetWidth + 'px';
                clonedElement.style.height = element.offsetHeight + 'px';

                // Apply oklch color fixes
                onCloneCallback(clonedDoc);
            },
            ignoreElements: (el) => {
                return el.style?.display === 'none' ||
                       el.style?.visibility === 'hidden';
            }
        },
        // Option 3: Fallback with basic cleanup
        {
            backgroundColor: '#ffffff',
            allowTaint: true,
            scale: 1,
            logging: true,
            onclone: (clonedDoc) => {
                // Simple color fallback only
                const style = clonedDoc.createElement('style');
                style.textContent = `
                    [style*="oklch"] {
                        color: #374151 !important;
                        background-color: #ffffff !important;
                        border-color: #d1d5db !important;
                    }
                `;
                clonedDoc.head.appendChild(style);
            }
        }
    ];

    for (let i = 0; i < captureOptions.length; i++) {
        try {
            console.log(`Attempting capture with option ${i + 1}`);
            const canvas = await window.html2canvas(element, captureOptions[i]);
            console.log(`Capture successful with option ${i + 1}`);
            return canvas;
        } catch (error) {
            console.warn(`Capture attempt ${i + 1} failed:`, error.message);
            if (i === captureOptions.length - 1) {
                throw error;
            }
        }
    }
};

const exportData = (headers, data, filename, format) => {
    let content = '';
    if (format === 'csv') {
        content += headers.join(',') + '\n';
        data.forEach(row => {
            content += row.map(item => `"${item}"`).join(',') + '\n';
        });
    } else { // txt
        content += headers.join('\t') + '\n';
        data.forEach(row => {
            content += row.join('\t') + '\n';
        });
    }

    const blob = new Blob([content], { type: `text/${format}` });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.${format}`;
    link.click();
    URL.revokeObjectURL(link.href);
};

const AnalyticsCard = ({ title, children }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
        <h3 className="p-4 text-lg font-semibold border-b border-gray-200 dark:border-gray-700">{title}</h3>
        <div className="p-4">{children}</div>
    </div>
);

const ProjectsAnalytics = () => {
    const { projects } = useProjects();
    const [filteredData, setFilteredData] = useState(projects);
    const [filters, setFilters] = useState({
        dateRange: { start: '', end: '' },
        predefinedRange: '',
        clients: [],
        years: [],
        archived: 'all'
    });
    const [availableClients, setAvailableClients] = useState([]);
    const [availableYears, setAvailableYears] = useState([]);

    // Predefined date ranges
    const predefinedRanges = {
        'last7days': {
            label: 'Last 7 Days',
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            end: new Date()
        },
        'last30days': {
            label: 'Last 30 Days',
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            end: new Date()
        },
        'last90days': {
            label: 'Last 90 Days',
            start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            end: new Date()
        },
        'thisMonth': {
            label: 'This Month',
            start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            end: new Date()
        },
        'lastMonth': {
            label: 'Last Month',
            start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
            end: new Date(new Date().getFullYear(), new Date().getMonth(), 0)
        },
        'thisYear': {
            label: 'This Year',
            start: new Date(new Date().getFullYear(), 0, 1),
            end: new Date()
        },
        'lastYear': {
            label: 'Last Year',
            start: new Date(new Date().getFullYear() - 1, 0, 1),
            end: new Date(new Date().getFullYear() - 1, 11, 31)
        }
    };

    // Initialize available filters when projects load
    useEffect(() => {
        if (projects && projects.length > 0) {
            const clients = [...new Set(projects.map(p => p.client).filter(Boolean))].sort();
            const years = [...new Set(projects.map(p => p.year).filter(Boolean))].sort((a, b) => b - a);

            setAvailableClients(clients);
            setAvailableYears(years);
            setFilteredData(projects);
        }
    }, [projects]);

    // Handle predefined date range selection
    const handlePredefinedRange = (rangeKey) => {
        if (rangeKey === '') {
            setFilters(prev => ({
                ...prev,
                predefinedRange: '',
                dateRange: { start: '', end: '' }
            }));
        } else {
            const range = predefinedRanges[rangeKey];
            setFilters(prev => ({
                ...prev,
                predefinedRange: rangeKey,
                dateRange: {
                    start: range.start.toISOString().split('T')[0],
                    end: range.end.toISOString().split('T')[0]
                }
            }));
        }
    };

    // Apply all filters
    const applyFilters = () => {
        let data = [...projects];

        // Date filtering
        if (filters.dateRange.start) {
            data = data.filter(p => {
                const projectDate = new Date(p.date_created);
                return projectDate >= new Date(filters.dateRange.start);
            });
        }
        if (filters.dateRange.end) {
            data = data.filter(p => {
                const projectDate = new Date(p.date_created);
                return projectDate <= new Date(filters.dateRange.end);
            });
        }

        // Client filtering
        if (filters.clients.length > 0) {
            data = data.filter(p => filters.clients.includes(p.client));
        }

        // Year filtering
        if (filters.years.length > 0) {
            data = data.filter(p => filters.years.includes(p.year));
        }

        // Archived filtering
        if (filters.archived === 'active') {
            data = data.filter(p => !p.archived);
        } else if (filters.archived === 'archived') {
            data = data.filter(p => p.archived);
        }

        setFilteredData(data);
    };

    // Clear all filters
    const clearFilters = () => {
        setFilters({
            dateRange: { start: '', end: '' },
            predefinedRange: '',
            clients: [],
            years: [],
            archived: 'all'
        });
        setFilteredData(projects);
    };

    // Enhanced export with more data including PDF and Image
    const handleExport = (format) => {
        if (format === 'pdf') {
            exportToPDF();
            return;
        }
        if (format === 'image') {
            exportToImage();
            return;
        }

        const headers = [
            "ID", "Project Number", "Project Name", "Client", "Year",
            "Date Created", "Archived", "Description"
        ];
        const data = filteredData.map(p => [
            p.id,
            p.project_number,
            p.project_name,
            p.client,
            p.year || 'N/A',
            p.date_created ? new Date(p.date_created).toLocaleDateString() : 'N/A',
            p.archived ? 'Yes' : 'No',
            p.description || 'N/A'
        ]);
        exportData(headers, data, `projects_analytics_${new Date().toISOString().split('T')[0]}`, format);
    };

    const exportToImage = async () => {
        const loadingElement = showLoadingIndicator('Taking Dashboard Screenshot...');

        try {
            // Find the main dashboard container
            const dashboardElement = document.querySelector('.space-y-6');
            if (!dashboardElement) {
                throw new Error('Dashboard element not found. Please ensure you are on the analytics page.');
            }

            console.log('Taking screenshot of dashboard as displayed in browser...');
            console.log('Dashboard dimensions:', {
                offsetWidth: dashboardElement.offsetWidth,
                offsetHeight: dashboardElement.offsetHeight,
                scrollWidth: dashboardElement.scrollWidth,
                scrollHeight: dashboardElement.scrollHeight
            });

            const canvas = await captureScreenshot(dashboardElement);

            // Create PNG screenshot exactly as displayed in browser
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().split('T')[0];
            link.download = `dashboard_screenshot_${timestamp}.png`;
            link.href = canvas.toDataURL('image/png', 1.0); // Maximum quality

            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            console.log('Dashboard screenshot export completed successfully');
            console.log('Screenshot dimensions:', canvas.width, 'x', canvas.height);

        } catch (error) {
            console.error('Screenshot export failed:', error);
            alert('Failed to export dashboard screenshot: ' + error.message);
        } finally {
            hideLoadingIndicator();
        }
    };

    const exportToPDF = async () => {
        const loadingElement = showLoadingIndicator('Creating PDF from Dashboard Screenshot...');

        try {
            // Find the main dashboard container
            const dashboardElement = document.querySelector('.space-y-6');
            if (!dashboardElement) {
                throw new Error('Dashboard element not found. Please ensure you are on the analytics page.');
            }

            console.log('Taking screenshot of dashboard to create PDF...');
            console.log('Dashboard dimensions:', {
                offsetWidth: dashboardElement.offsetWidth,
                offsetHeight: dashboardElement.offsetHeight,
                scrollWidth: dashboardElement.scrollWidth,
                scrollHeight: dashboardElement.scrollHeight
            });

            const canvas = await captureScreenshot(dashboardElement);
            const imgData = canvas.toDataURL('image/png', 1.0); // Maximum quality

            // Create PDF from the dashboard screenshot (no headers/footers)
            createPDFFromImage(imgData, canvas.width, canvas.height);

            console.log('Dashboard screenshot PDF export completed successfully');
            console.log('Screenshot dimensions:', canvas.width, 'x', canvas.height);

        } catch (error) {
            console.error('PDF export failed:', error);
            alert('Failed to create PDF from dashboard screenshot: ' + error.message);
        } finally {
            hideLoadingIndicator();
        }
    };

    const createPDFFromImage = (imgData, canvasWidth, canvasHeight) => {
        const printWindow = window.open('', '_blank');

        if (!printWindow) {
            alert('Please allow popups to export PDF');
            return;
        }

        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB');

        // Create a simple HTML that just shows the screenshot as-is
        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Projects Analytics Dashboard Screenshot - ${dateStr}</title>
            <style>
                @page {
                    size: auto;
                    margin: 0;
                }
                body {
                    margin: 0;
                    padding: 0;
                    background: white;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                }
                .screenshot {
                    max-width: 100%;
                    max-height: 100vh;
                }
                .screenshot img {
                    width: 100%;
                    height: auto;
                    display: block;
                }
                @media print {
                    body {
                        margin: 0;
                        padding: 0;
                    }
                    .screenshot {
                        width: 100%;
                        height: 100%;
                    }
                    .screenshot img {
                        width: 100%;
                        height: auto;
                        object-fit: contain;
                    }
                }
            </style>
        </head>
        <body>
            <div class="screenshot">
                <img src="${imgData}" alt="Projects Analytics Dashboard Screenshot" />
            </div>
        </body>
        </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();

        // Wait for image to load then print
        printWindow.onload = () => {
            setTimeout(() => {
                printWindow.print();
                // Don't close automatically to allow user to save
            }, 1000);
        };
    };

    // Analytics calculations
    const analytics = useMemo(() => {
        const projectsByClient = filteredData.reduce((acc, project) => {
            acc[project.client] = (acc[project.client] || 0) + 1;
            return acc;
        }, {});

        const projectsByYear = filteredData.reduce((acc, project) => {
            const year = project.year || 'Unknown';
            acc[year] = (acc[year] || 0) + 1;
            return acc;
        }, {});

        const projectsByMonth = filteredData.reduce((acc, project) => {
            if (project.date_created) {
                const date = new Date(project.date_created);
                const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                acc[monthYear] = (acc[monthYear] || 0) + 1;
            }
            return acc;
        }, {});

        const archivedStats = {
            active: filteredData.filter(p => !p.archived).length,
            archived: filteredData.filter(p => p.archived).length
        };

        return {
            total: filteredData.length,
            projectsByClient,
            projectsByYear,
            projectsByMonth,
            archivedStats
        };
    }, [filteredData]);

    return (
        <div className="space-y-6">
            {/* Enhanced Filters */}
            <ProjectsAnalyticsToolbar
                filters={filters}
                setFilters={setFilters}
                predefinedRanges={predefinedRanges}
                availableClients={availableClients}
                availableYears={availableYears}
                onPredefinedRange={handlePredefinedRange}
                onApplyFilters={applyFilters}
                onClearFilters={clearFilters}
                onExport={handleExport}
            />

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <AnalyticsCard title="Total Projects">
                    <div className="text-3xl font-bold text-orange-600">{analytics.total}</div>
                    <div className="text-sm text-gray-500">
                        {projects.length > analytics.total && `of ${projects.length} total`}
                    </div>
                </AnalyticsCard>
                <AnalyticsCard title="Active Projects">
                    <div className="text-3xl font-bold text-green-600">{analytics.archivedStats.active}</div>
                    <div className="text-sm text-gray-500">Currently active</div>
                </AnalyticsCard>
                <AnalyticsCard title="Archived Projects">
                    <div className="text-3xl font-bold text-gray-600">{analytics.archivedStats.archived}</div>
                    <div className="text-sm text-gray-500">Completed/Archived</div>
                </AnalyticsCard>
                <AnalyticsCard title="Unique Clients">
                    <div className="text-3xl font-bold text-blue-600">
                        {Object.keys(analytics.projectsByClient).length}
                    </div>
                    <div className="text-sm text-gray-500">Different clients</div>
                </AnalyticsCard>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AnalyticsCard title="Projects by Client">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={Object.entries(analytics.projectsByClient).map(([name, value]) => ({ name, projects: value }))}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="projects" fill="#f97316" />
                        </BarChart>
                    </ResponsiveContainer>
                </AnalyticsCard>

                <AnalyticsCard title="Projects by Year">
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={Object.entries(analytics.projectsByYear).map(([name, value]) => ({ name, value }))}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                fill="#8884d8"
                                label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                                {Object.entries(analytics.projectsByYear).map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={['#f97316', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 6]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </AnalyticsCard>

                <AnalyticsCard title="Project Creation Timeline">
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={Object.entries(analytics.projectsByMonth).sort().map(([month, count]) => ({ month, projects: count }))}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="projects" stroke="#f97316" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </AnalyticsCard>

                <AnalyticsCard title="Active vs Archived">
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={[
                                    { name: 'Active', value: analytics.archivedStats.active },
                                    { name: 'Archived', value: analytics.archivedStats.archived }
                                ]}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                fill="#8884d8"
                                label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                                <Cell fill="#10b981" />
                                <Cell fill="#6b7280" />
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </AnalyticsCard>
            </div>
        </div>
    );
};

const ProjectsAnalyticsToolbar = ({
    filters,
    setFilters,
    predefinedRanges,
    availableClients,
    availableYears,
    onPredefinedRange,
    onApplyFilters,
    onClearFilters,
    onExport
}) => {
    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Date Range Selector */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Date Range
                    </label>
                    <select
                        value={filters.predefinedRange}
                        onChange={(e) => {
                            const value = e.target.value;
                            setFilters(prev => ({ ...prev, predefinedRange: value }));
                            if (value && predefinedRanges[value]) {
                                onPredefinedRange(value);
                            }
                        }}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                        <option value="">Custom Range</option>
                        {Object.entries(predefinedRanges).map(([key, range]) => (
                            <option key={key} value={key}>
                                {range.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Custom Date Inputs */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        From Date
                    </label>
                    <input
                        type="date"
                        value={filters.dateRange.start}
                        onChange={(e) => setFilters(prev => ({
                            ...prev,
                            dateRange: { ...prev.dateRange, start: e.target.value },
                            predefinedRange: ''
                        }))}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        To Date
                    </label>
                    <input
                        type="date"
                        value={filters.dateRange.end}
                        onChange={(e) => setFilters(prev => ({
                            ...prev,
                            dateRange: { ...prev.dateRange, end: e.target.value },
                            predefinedRange: ''
                        }))}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                </div>

                {/* Client Filter */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Clients
                    </label>
                    <select
                        multiple
                        value={filters.clients}
                        onChange={(e) => {
                            const values = Array.from(e.target.selectedOptions, option => option.value);
                            setFilters(prev => ({ ...prev, clients: values }));
                        }}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        size="3"
                    >
                        {availableClients.map(client => (
                            <option key={client} value={client}>
                                {client}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Year Filter */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Years
                    </label>
                    <select
                        multiple
                        value={filters.years}
                        onChange={(e) => {
                            const values = Array.from(e.target.selectedOptions, option => option.value);
                            setFilters(prev => ({ ...prev, years: values }));
                        }}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        size="3"
                    >
                        {availableYears.map(year => (
                            <option key={year} value={year}>
                                {year}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Archived Status Filter */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Status
                    </label>
                    <select
                        value={filters.archived}
                        onChange={(e) => setFilters(prev => ({ ...prev, archived: e.target.value }))}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                        <option value="all">All Projects</option>
                        <option value="active">Active Only</option>
                        <option value="archived">Archived Only</option>
                    </select>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Actions
                    </label>
                    <div className="flex flex-col gap-2">
                        <Button onClick={onApplyFilters} className="w-full">
                            Apply Filters
                        </Button>
                        <Button variant="outline" onClick={onClearFilters} className="w-full">
                            Clear All
                        </Button>
                        <div className="relative group">
                            <Button variant="outline" className="w-full">
                                <Download size={16} className="mr-2"/>Export Data
                            </Button>
                            <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-200 z-20">
                                <button onClick={() => onExport('csv')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">as CSV</button>
                                <button onClick={() => onExport('txt')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">as TXT</button>
                                <button onClick={() => onExport('image')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">as Image</button>
                                <button onClick={() => onExport('pdf')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">as PDF</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ResourceAnalytics = () => {
    const { users } = useUsers();
    const [allocations, setAllocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
        end: new Date().toISOString().split('T')[0] // today
    });

    useEffect(() => {
        const fetchResourceData = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('resource_allocations')
                    .select('*')
                    .gte('allocation_date', dateRange.start)
                    .lte('allocation_date', dateRange.end);

                if (error) throw error;
                setAllocations(data || []);
            } catch (err) {
                console.error('Error fetching resource analytics data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchResourceData();
    }, [dateRange]);

    const handleFilter = () => {
        // Filter is automatically applied via useEffect when dateRange changes
    };

    const handleExport = (format) => {
        if (format === 'csv') {
            exportResourceDataAsCSV();
        } else if (format === 'txt') {
            exportResourceDataAsTXT();
        } else if (format === 'pdf') {
            exportResourceAnalyticsToPDF();
        } else if (format === 'image') {
            exportResourceAnalyticsToImage();
        }
    };

    const exportResourceAnalyticsToPDF = async () => {
        const loadingElement = showLoadingIndicator('Creating PDF from Resource Analytics Screenshot...');

        try {
            // Find the main analytics container
            const analyticsElement = document.querySelector('.space-y-6');
            if (!analyticsElement) {
                throw new Error('Analytics element not found. Please ensure you are on the resource analytics page.');
            }

            console.log('Taking screenshot of resource analytics to create PDF...');
            const canvas = await captureScreenshot(analyticsElement);
            const imgData = canvas.toDataURL('image/png', 1.0);

            // Create PDF from the analytics screenshot
            createResourcePDFFromImage(imgData, canvas.width, canvas.height);

            console.log('Resource analytics PDF export completed successfully');

        } catch (error) {
            console.error('Resource analytics PDF export failed:', error);
            alert('Failed to create PDF from resource analytics: ' + error.message);
        } finally {
            hideLoadingIndicator();
        }
    };

    const exportResourceAnalyticsToImage = async () => {
        const loadingElement = showLoadingIndicator('Taking Resource Analytics Screenshot...');

        try {
            // Find the main analytics container
            const analyticsElement = document.querySelector('.space-y-6');
            if (!analyticsElement) {
                throw new Error('Analytics element not found. Please ensure you are on the resource analytics page.');
            }

            console.log('Taking screenshot of resource analytics...');
            const canvas = await captureScreenshot(analyticsElement);

            // Create PNG screenshot
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().split('T')[0];
            link.download = `resource_analytics_screenshot_${timestamp}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            console.log('Resource analytics screenshot export completed successfully');

        } catch (error) {
            console.error('Resource analytics screenshot export failed:', error);
            alert('Failed to export resource analytics screenshot: ' + error.message);
        } finally {
            hideLoadingIndicator();
        }
    };

    const createResourcePDFFromImage = (imgData, canvasWidth, canvasHeight) => {
        const printWindow = window.open('', '_blank');

        if (!printWindow) {
            alert('Please allow popups to export PDF');
            return;
        }

        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB');

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Resource Analytics Screenshot - ${dateStr}</title>
            <style>
                @page {
                    size: auto;
                    margin: 0;
                }
                body {
                    margin: 0;
                    padding: 0;
                    background: white;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                }
                .screenshot {
                    max-width: 100%;
                    max-height: 100vh;
                }
                .screenshot img {
                    width: 100%;
                    height: auto;
                    display: block;
                }
                @media print {
                    body {
                        margin: 0;
                        padding: 0;
                    }
                    .screenshot {
                        width: 100%;
                        height: 100%;
                    }
                    .screenshot img {
                        width: 100%;
                        height: auto;
                        object-fit: contain;
                    }
                }
            </style>
        </head>
        <body>
            <div class="screenshot">
                <img src="${imgData}" alt="Resource Analytics Screenshot" />
            </div>
        </body>
        </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();

        printWindow.onload = () => {
            setTimeout(() => {
                printWindow.print();
            }, 1000);
        };
    };

    const exportResourceDataAsCSV = () => {
        const headers = ['Date', 'User', 'Type', 'Project/Leave', 'Shift', 'Comment'];
        const rows = allocations.map(alloc => [
            alloc.allocation_date,
            users.find(u => u.id === alloc.user_id)?.name || 'Unknown',
            alloc.assignment_type,
            alloc.assignment_type === 'project' ? `${alloc.project_number} - ${alloc.project_name}` : alloc.leave_type,
            alloc.shift || '',
            alloc.comment || ''
        ]);

        const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `resource-analytics-${dateRange.start}-to-${dateRange.end}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const exportResourceDataAsTXT = () => {
        const content = allocations.map(alloc => {
            const user = users.find(u => u.id === alloc.user_id)?.name || 'Unknown';
            const project = alloc.assignment_type === 'project' ? `${alloc.project_number} - ${alloc.project_name}` : alloc.leave_type;
            return `${alloc.allocation_date} | ${user} | ${alloc.assignment_type} | ${project} | ${alloc.shift || ''} | ${alloc.comment || ''}`;
        }).join('\n');

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `resource-analytics-${dateRange.start}-to-${dateRange.end}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Calculate analytics
    const totalAllocations = allocations.length;
    const projectAllocations = allocations.filter(a => a.assignment_type === 'project').length;
    const leaveAllocations = allocations.filter(a => a.assignment_type === 'leave').length;
    const utilizationRate = totalAllocations > 0 ? ((projectAllocations / totalAllocations) * 100).toFixed(1) : 0;

    // User utilization stats
    const userStats = users.map(user => {
        const userAllocations = allocations.filter(a => a.user_id === user.id);
        const userProjects = userAllocations.filter(a => a.assignment_type === 'project').length;
        const userLeave = userAllocations.filter(a => a.assignment_type === 'leave').length;
        const userUtilization = userAllocations.length > 0 ? ((userProjects / userAllocations.length) * 100).toFixed(1) : 0;

        return {
            name: user.name,
            totalDays: userAllocations.length,
            projectDays: userProjects,
            leaveDays: userLeave,
            utilization: userUtilization
        };
    }).filter(stat => stat.totalDays > 0);

    // Leave type breakdown
    const leaveTypes = {};
    allocations.filter(a => a.assignment_type === 'leave').forEach(alloc => {
        leaveTypes[alloc.leave_type] = (leaveTypes[alloc.leave_type] || 0) + 1;
    });

    // Shift distribution
    const shiftDistribution = {};
    allocations.filter(a => a.assignment_type === 'project' && a.shift).forEach(alloc => {
        shiftDistribution[alloc.shift] = (shiftDistribution[alloc.shift] || 0) + 1;
    });

    // Top projects by allocation
    const projectStats = {};
    allocations.filter(a => a.assignment_type === 'project').forEach(alloc => {
        const key = `${alloc.project_number} - ${alloc.project_name}`;
        projectStats[key] = (projectStats[key] || 0) + 1;
    });
    const topProjects = Object.entries(projectStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                    <span className="ml-2 text-gray-600 dark:text-gray-400">Loading resource analytics...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <AnalyticsToolbar
                onExport={handleExport}
                onFilter={handleFilter}
                dateRange={dateRange}
                setDateRange={setDateRange}
            />

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Allocations</h3>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalAllocations}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Project Days</h3>
                    <p className="text-2xl font-bold text-green-600">{projectAllocations}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Leave Days</h3>
                    <p className="text-2xl font-bold text-blue-600">{leaveAllocations}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Utilization Rate</h3>
                    <p className="text-2xl font-bold text-orange-600">{utilizationRate}%</p>
                </div>
            </div>

            {/* User Utilization */}
            <AnalyticsCard title="User Utilization">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="text-left py-2 px-3 font-medium text-gray-900 dark:text-white">User</th>
                                <th className="text-left py-2 px-3 font-medium text-gray-900 dark:text-white">Total Days</th>
                                <th className="text-left py-2 px-3 font-medium text-gray-900 dark:text-white">Project Days</th>
                                <th className="text-left py-2 px-3 font-medium text-gray-900 dark:text-white">Leave Days</th>
                                <th className="text-left py-2 px-3 font-medium text-gray-900 dark:text-white">Utilization</th>
                            </tr>
                        </thead>
                        <tbody>
                            {userStats.map(stat => (
                                <tr key={stat.name} className="border-b border-gray-100 dark:border-gray-700">
                                    <td className="py-2 px-3 text-gray-900 dark:text-white">{stat.name}</td>
                                    <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{stat.totalDays}</td>
                                    <td className="py-2 px-3 text-green-600">{stat.projectDays}</td>
                                    <td className="py-2 px-3 text-blue-600">{stat.leaveDays}</td>
                                    <td className="py-2 px-3">
                                        <span className={`font-medium ${stat.utilization >= 80 ? 'text-green-600' : stat.utilization >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                            {stat.utilization}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </AnalyticsCard>

            {/* Leave Types & Shift Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AnalyticsCard title="Leave Types Breakdown">
                    <div className="space-y-3">
                        {Object.entries(leaveTypes).map(([type, count]) => (
                            <div key={type} className="flex justify-between items-center">
                                <span className="text-gray-900 dark:text-white">{type}</span>
                                <span className="font-medium text-blue-600">{count} days</span>
                            </div>
                        ))}
                        {Object.keys(leaveTypes).length === 0 && (
                            <p className="text-gray-500 dark:text-gray-400">No leave data for selected period</p>
                        )}
                    </div>
                </AnalyticsCard>

                <AnalyticsCard title="Shift Distribution">
                    <div className="space-y-3">
                        {Object.entries(shiftDistribution).map(([shift, count]) => (
                            <div key={shift} className="flex justify-between items-center">
                                <span className="text-gray-900 dark:text-white">{shift}</span>
                                <span className="font-medium text-green-600">{count} allocations</span>
                            </div>
                        ))}
                        {Object.keys(shiftDistribution).length === 0 && (
                            <p className="text-gray-500 dark:text-gray-400">No shift data for selected period</p>
                        )}
                    </div>
                </AnalyticsCard>
            </div>

            {/* Top Projects */}
            <AnalyticsCard title="Top Projects by Allocation">
                <div className="space-y-3">
                    {topProjects.map(([project, count], index) => (
                        <div key={project} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                                    #{index + 1}
                                </span>
                                <span className="text-gray-900 dark:text-white">{project}</span>
                            </div>
                            <span className="font-medium text-orange-600">{count} days</span>
                        </div>
                    ))}
                    {topProjects.length === 0 && (
                        <p className="text-gray-500 dark:text-gray-400">No project data for selected period</p>
                    )}
                </div>
            </AnalyticsCard>
        </div>
    );
};

const DeliveryTrackerAnalytics = () => {
    const { jobs } = useJobs();
    const [filteredJobs, setFilteredJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({
        start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days ago
        end: new Date().toISOString().split('T')[0] // today
    });

    useEffect(() => {
        if (jobs.length > 0) {
            const filtered = jobs.filter(job => {
                if (!dateRange.start || !dateRange.end) return true;

                const jobDate = job.createdAt || job.actualDeliveryDate || job.plannedDeliveryDate;
                if (!jobDate) return true;

                const date = new Date(jobDate).toISOString().split('T')[0];
                return date >= dateRange.start && date <= dateRange.end;
            });
            setFilteredJobs(filtered);
            setLoading(false);
        }
    }, [jobs, dateRange]);

    const handleFilter = () => {
        // Filter is automatically applied via useEffect when dateRange changes
    };

    const handleExport = (format) => {
        if (format === 'csv') {
            exportDeliveryDataAsCSV();
        } else if (format === 'txt') {
            exportDeliveryDataAsTXT();
        } else if (format === 'pdf') {
            exportDeliveryAnalyticsToPDF();
        } else if (format === 'image') {
            exportDeliveryAnalyticsToImage();
        }
    };

    const exportDeliveryAnalyticsToPDF = async () => {
        const loadingElement = showLoadingIndicator('Creating PDF from Delivery Analytics Screenshot...');

        try {
            // Find the main analytics container
            const analyticsElement = document.querySelector('.space-y-6');
            if (!analyticsElement) {
                throw new Error('Analytics element not found. Please ensure you are on the delivery analytics page.');
            }

            console.log('Taking screenshot of delivery analytics to create PDF...');
            const canvas = await captureScreenshot(analyticsElement);
            const imgData = canvas.toDataURL('image/png', 1.0);

            // Create PDF from the analytics screenshot
            createDeliveryPDFFromImage(imgData, canvas.width, canvas.height);

            console.log('Delivery analytics PDF export completed successfully');

        } catch (error) {
            console.error('Delivery analytics PDF export failed:', error);
            alert('Failed to create PDF from delivery analytics: ' + error.message);
        } finally {
            hideLoadingIndicator();
        }
    };

    const exportDeliveryAnalyticsToImage = async () => {
        const loadingElement = showLoadingIndicator('Taking Delivery Analytics Screenshot...');

        try {
            // Find the main analytics container
            const analyticsElement = document.querySelector('.space-y-6');
            if (!analyticsElement) {
                throw new Error('Analytics element not found. Please ensure you are on the delivery analytics page.');
            }

            console.log('Taking screenshot of delivery analytics...');
            const canvas = await captureScreenshot(analyticsElement);

            // Create PNG screenshot
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().split('T')[0];
            link.download = `delivery_analytics_screenshot_${timestamp}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            console.log('Delivery analytics screenshot export completed successfully');

        } catch (error) {
            console.error('Delivery analytics screenshot export failed:', error);
            alert('Failed to export delivery analytics screenshot: ' + error.message);
        } finally {
            hideLoadingIndicator();
        }
    };

    const createDeliveryPDFFromImage = (imgData, canvasWidth, canvasHeight) => {
        const printWindow = window.open('', '_blank');

        if (!printWindow) {
            alert('Please allow popups to export PDF');
            return;
        }

        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB');

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Delivery Analytics Screenshot - ${dateStr}</title>
            <style>
                @page {
                    size: auto;
                    margin: 0;
                }
                body {
                    margin: 0;
                    padding: 0;
                    background: white;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                }
                .screenshot {
                    max-width: 100%;
                    max-height: 100vh;
                }
                .screenshot img {
                    width: 100%;
                    height: auto;
                    display: block;
                }
                @media print {
                    body {
                        margin: 0;
                        padding: 0;
                    }
                    .screenshot {
                        width: 100%;
                        height: 100%;
                    }
                    .screenshot img {
                        width: 100%;
                        height: auto;
                        object-fit: contain;
                    }
                }
            </style>
        </head>
        <body>
            <div class="screenshot">
                <img src="${imgData}" alt="Delivery Analytics Screenshot" />
            </div>
        </body>
        </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();

        printWindow.onload = () => {
            setTimeout(() => {
                printWindow.print();
            }, 1000);
        };
    };

    const exportDeliveryDataAsCSV = () => {
        const headers = [
            'Project Name', 'Project Number', 'Item Name', 'Client', 'Discipline',
            'Project Manager', 'Status', 'Processing Hours', 'Checking Hours',
            'Site Start Date', 'Site Completion Date', 'Planned Delivery', 'Actual Delivery', 'Comments'
        ];
        const rows = filteredJobs.map(job => [
            job.projectName || '',
            job.projectNumber || '',
            job.itemName || '',
            job.client || '',
            job.discipline || '',
            job.projectManager || '',
            job.status || '',
            job.processingHours || '',
            job.checkingHours || '',
            job.siteStartDate || '',
            job.siteCompletionDate || '',
            job.plannedDeliveryDate || '',
            job.actualDeliveryDate || '',
            job.comments || ''
        ]);

        const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `delivery-analytics-${dateRange.start}-to-${dateRange.end}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const exportDeliveryDataAsTXT = () => {
        const content = filteredJobs.map(job =>
            `${job.projectNumber} | ${job.projectName} | ${job.client} | ${job.discipline} | ${job.status} | ${job.processingHours || 0}h processing | ${job.checkingHours || 0}h checking | Planned: ${job.plannedDeliveryDate || 'N/A'} | Actual: ${job.actualDeliveryDate || 'N/A'}`
        ).join('\n');

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `delivery-analytics-${dateRange.start}-to-${dateRange.end}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Calculate analytics
    const totalJobs = filteredJobs.length;
    const completedJobs = filteredJobs.filter(job => job.status === 'Completed').length;
    const onTimeDeliveries = filteredJobs.filter(job =>
        job.actualDeliveryDate && job.plannedDeliveryDate &&
        new Date(job.actualDeliveryDate) <= new Date(job.plannedDeliveryDate)
    ).length;
    const totalProcessingHours = filteredJobs.reduce((sum, job) => sum + (parseInt(job.processingHours) || 0), 0);
    const totalCheckingHours = filteredJobs.reduce((sum, job) => sum + (parseInt(job.checkingHours) || 0), 0);
    const completionRate = totalJobs > 0 ? ((completedJobs / totalJobs) * 100).toFixed(1) : 0;
    const onTimeRate = completedJobs > 0 ? ((onTimeDeliveries / completedJobs) * 100).toFixed(1) : 0;

    // Status distribution
    const statusStats = {};
    filteredJobs.forEach(job => {
        const status = job.status || 'No Status';
        statusStats[status] = (statusStats[status] || 0) + 1;
    });

    // Discipline breakdown
    const disciplineStats = {};
    filteredJobs.forEach(job => {
        const discipline = job.discipline || 'No Discipline';
        disciplineStats[discipline] = (disciplineStats[discipline] || 0) + 1;
    });

    // Client analysis
    const clientStats = {};
    filteredJobs.forEach(job => {
        const client = job.client || 'No Client';
        clientStats[client] = (clientStats[client] || 0) + 1;
    });
    const topClients = Object.entries(clientStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);

    // Project Manager performance
    const pmStats = {};
    filteredJobs.forEach(job => {
        const pm = job.projectManager || 'No PM';
        if (!pmStats[pm]) {
            pmStats[pm] = { total: 0, completed: 0, onTime: 0, hours: 0 };
        }
        pmStats[pm].total += 1;
        pmStats[pm].hours += (parseInt(job.processingHours) || 0) + (parseInt(job.checkingHours) || 0);
        if (job.status === 'Completed') {
            pmStats[pm].completed += 1;
            if (job.actualDeliveryDate && job.plannedDeliveryDate &&
                new Date(job.actualDeliveryDate) <= new Date(job.plannedDeliveryDate)) {
                pmStats[pm].onTime += 1;
            }
        }
    });

    // Delivery performance trends
    const deliveryTrends = filteredJobs
        .filter(job => job.actualDeliveryDate && job.plannedDeliveryDate)
        .map(job => {
            const planned = new Date(job.plannedDeliveryDate);
            const actual = new Date(job.actualDeliveryDate);
            const diffDays = Math.ceil((actual - planned) / (1000 * 60 * 60 * 24));
            return { project: job.projectNumber, delayDays: diffDays };
        })
        .sort((a, b) => b.delayDays - a.delayDays);

    const avgDelay = deliveryTrends.length > 0 ?
        (deliveryTrends.reduce((sum, item) => sum + item.delayDays, 0) / deliveryTrends.length).toFixed(1) : 0;

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                    <span className="ml-2 text-gray-600 dark:text-gray-400">Loading delivery analytics...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <AnalyticsToolbar
                onExport={handleExport}
                onFilter={handleFilter}
                dateRange={dateRange}
                setDateRange={setDateRange}
            />

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Jobs</h3>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalJobs}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Completion Rate</h3>
                    <p className="text-2xl font-bold text-green-600">{completionRate}%</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">On-Time Delivery</h3>
                    <p className="text-2xl font-bold text-blue-600">{onTimeRate}%</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Delay</h3>
                    <p className="text-2xl font-bold text-orange-600">{avgDelay} days</p>
                </div>
            </div>

            {/* Hours Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Processing Hours</h3>
                    <p className="text-2xl font-bold text-purple-600">{totalProcessingHours}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Checking Hours</h3>
                    <p className="text-2xl font-bold text-indigo-600">{totalCheckingHours}</p>
                </div>
            </div>

            {/* Status & Discipline Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AnalyticsCard title="Status Distribution">
                    <div className="space-y-3">
                        {Object.entries(statusStats).map(([status, count]) => (
                            <div key={status} className="flex justify-between items-center">
                                <span className="text-gray-900 dark:text-white">{status}</span>
                                <span className="font-medium text-blue-600">{count} jobs</span>
                            </div>
                        ))}
                        {Object.keys(statusStats).length === 0 && (
                            <p className="text-gray-500 dark:text-gray-400">No status data for selected period</p>
                        )}
                    </div>
                </AnalyticsCard>

                <AnalyticsCard title="Discipline Breakdown">
                    <div className="space-y-3">
                        {Object.entries(disciplineStats).map(([discipline, count]) => (
                            <div key={discipline} className="flex justify-between items-center">
                                <span className="text-gray-900 dark:text-white">{discipline}</span>
                                <span className="font-medium text-green-600">{count} jobs</span>
                            </div>
                        ))}
                        {Object.keys(disciplineStats).length === 0 && (
                            <p className="text-gray-500 dark:text-gray-400">No discipline data for selected period</p>
                        )}
                    </div>
                </AnalyticsCard>
            </div>

            {/* Project Manager Performance */}
            <AnalyticsCard title="Project Manager Performance">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="text-left py-2 px-3 font-medium text-gray-900 dark:text-white">Project Manager</th>
                                <th className="text-left py-2 px-3 font-medium text-gray-900 dark:text-white">Total Jobs</th>
                                <th className="text-left py-2 px-3 font-medium text-gray-900 dark:text-white">Completed</th>
                                <th className="text-left py-2 px-3 font-medium text-gray-900 dark:text-white">On Time</th>
                                <th className="text-left py-2 px-3 font-medium text-gray-900 dark:text-white">Total Hours</th>
                                <th className="text-left py-2 px-3 font-medium text-gray-900 dark:text-white">Completion Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(pmStats).map(([pm, stats]) => {
                                const completionRate = stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : 0;
                                return (
                                    <tr key={pm} className="border-b border-gray-100 dark:border-gray-700">
                                        <td className="py-2 px-3 text-gray-900 dark:text-white">{pm}</td>
                                        <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{stats.total}</td>
                                        <td className="py-2 px-3 text-green-600">{stats.completed}</td>
                                        <td className="py-2 px-3 text-blue-600">{stats.onTime}</td>
                                        <td className="py-2 px-3 text-purple-600">{stats.hours}</td>
                                        <td className="py-2 px-3">
                                            <span className={`font-medium ${completionRate >= 80 ? 'text-green-600' : completionRate >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                {completionRate}%
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </AnalyticsCard>

            {/* Top Clients & Delivery Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AnalyticsCard title="Top Clients">
                    <div className="space-y-3">
                        {topClients.map(([client, count], index) => (
                            <div key={client} className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                                        #{index + 1}
                                    </span>
                                    <span className="text-gray-900 dark:text-white">{client}</span>
                                </div>
                                <span className="font-medium text-orange-600">{count} jobs</span>
                            </div>
                        ))}
                        {topClients.length === 0 && (
                            <p className="text-gray-500 dark:text-gray-400">No client data for selected period</p>
                        )}
                    </div>
                </AnalyticsCard>

                <AnalyticsCard title="Delivery Performance (Top Delays)">
                    <div className="space-y-3">
                        {deliveryTrends.slice(0, 10).map((trend, index) => (
                            <div key={trend.project} className="flex items-center justify-between">
                                <span className="text-gray-900 dark:text-white">{trend.project}</span>
                                <span className={`font-medium ${trend.delayDays > 0 ? 'text-red-600' : trend.delayDays < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                                    {trend.delayDays > 0 ? '+' : ''}{trend.delayDays} days
                                </span>
                            </div>
                        ))}
                        {deliveryTrends.length === 0 && (
                            <p className="text-gray-500 dark:text-gray-400">No delivery performance data for selected period</p>
                        )}
                    </div>
                </AnalyticsCard>
            </div>
        </div>
    );
};

const AnalyticsToolbar = ({ dateRange, setDateRange, onFilter, onExport }) => {
    // Predefined date ranges
    const predefinedRanges = {
        'last7days': {
            label: 'Last 7 Days',
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            end: new Date()
        },
        'last30days': {
            label: 'Last 30 Days',
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            end: new Date()
        },
        'last90days': {
            label: 'Last 90 Days',
            start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            end: new Date()
        },
        'last6months': {
            label: 'Last 6 Months',
            start: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000),
            end: new Date()
        },
        'last12months': {
            label: 'Last 12 Months',
            start: new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000),
            end: new Date()
        },
        'thisMonth': {
            label: 'This Month',
            start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            end: new Date()
        },
        'lastMonth': {
            label: 'Last Month',
            start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
            end: new Date(new Date().getFullYear(), new Date().getMonth(), 0)
        },
        'thisYear': {
            label: 'This Year',
            start: new Date(new Date().getFullYear(), 0, 1),
            end: new Date()
        },
        'lastYear': {
            label: 'Last Year',
            start: new Date(new Date().getFullYear() - 1, 0, 1),
            end: new Date(new Date().getFullYear() - 1, 11, 31)
        }
    };

    const handlePredefinedRange = (rangeKey) => {
        const range = predefinedRanges[rangeKey];
        if (range) {
            setDateRange({
                start: range.start.toISOString().split('T')[0],
                end: range.end.toISOString().split('T')[0]
            });
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Predefined Date Range Selector */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Quick Select
                    </label>
                    <select
                        onChange={(e) => {
                            if (e.target.value) {
                                handlePredefinedRange(e.target.value);
                            }
                        }}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        defaultValue=""
                    >
                        <option value="">Select Range</option>
                        {Object.entries(predefinedRanges).map(([key, range]) => (
                            <option key={key} value={key}>
                                {range.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* From Date */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        From Date
                    </label>
                    <Input
                        type="date"
                        value={dateRange.start}
                        onChange={e => setDateRange(prev => ({...prev, start: e.target.value}))}
                    />
                </div>

                {/* To Date */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        To Date
                    </label>
                    <Input
                        type="date"
                        value={dateRange.end}
                        onChange={e => setDateRange(prev => ({...prev, end: e.target.value}))}
                    />
                </div>

                {/* Actions */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Actions
                    </label>
                    <div className="flex flex-col gap-2">
                        <Button onClick={onFilter} className="w-full">
                            Apply Filter
                        </Button>
                        <div className="relative group">
                            <Button variant="outline" className="w-full">
                                <Download size={16} className="mr-2"/>Export Data
                            </Button>
                            <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-200 z-20">
                                <button onClick={() => onExport('csv')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">as CSV</button>
                                <button onClick={() => onExport('txt')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">as TXT</button>
                                <button onClick={() => onExport('pdf')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">as PDF</button>
                                <button onClick={() => onExport('image')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">as Image</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AnalyticsPage = () => {
    const [activeTab, setActiveTab] = useState('Projects');

    const tabs = ['Projects', 'Resource', 'Delivery Team'];

    return (
        <div className="p-4 md:p-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Analytics</h1>
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-6">
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`py-3 px-1 border-b-2 text-sm font-medium ${activeTab === tab ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>
            <div className="mt-6">
                {activeTab === 'Projects' && <ProjectsAnalytics />}
                {activeTab === 'Resource' && <ResourceAnalytics />}
                {activeTab === 'Delivery Team' && <DeliveryTrackerAnalytics />}
            </div>
        </div>
    );
};

// Export all components
export default AnalyticsPage;
export { ProjectsAnalytics, ResourceAnalytics, DeliveryTrackerAnalytics, AnalyticsCard };