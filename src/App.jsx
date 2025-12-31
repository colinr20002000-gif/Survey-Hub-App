import React, { useState, useEffect, createContext, useContext, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart as BarChartIcon, Users, Settings, Search, Bell, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, PlusCircle, Filter, Edit, Trash2, FileText, FileSpreadsheet, Presentation, Sun, Moon, LogOut, Upload, Download, MoreVertical, X, FolderKanban, File, Archive, Copy, ClipboardCheck, ClipboardList, Bug, ClipboardPaste, History, ArchiveRestore, TrendingUp, Shield, Palette, Loader2, Megaphone, Calendar, AlertTriangle, FolderOpen, List, MessageSquare, Wrench, BookUser, Phone, Check, Bot, RefreshCw, Eye, ExternalLink, Car, Menu, Link, ArrowUpDown, ArrowUp, ArrowDown, Trophy, Image as ImageIcon, Mail, ClipboardCopy } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BarChart, Bar, PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis } from 'recharts';
import { supabase } from './supabaseClient';
import packageJson from '../package.json';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { ProjectProvider, useProjects } from './contexts/ProjectContext';
import { TaskProvider, useTasks } from './contexts/TaskContext';
import { AuditTrailProvider, useAuditTrail } from './contexts/AuditTrailContext';
import { JobProvider, useJobs } from './contexts/JobContext';
import { DeliveryTaskProvider, useDeliveryTasks } from './contexts/DeliveryTaskContext';
import { ProjectTaskProvider, useProjectTasks } from './contexts/ProjectTaskContext';
import { UserProvider, useUsers } from './contexts/UserContext';
import { PermissionProvider } from './contexts/PermissionContext';
import { sendAnnouncementFCMNotification, sendDeliveryTaskAssignmentNotification, sendProjectTaskAssignmentNotification } from './utils/fcmNotifications';
import { notificationManager } from './utils/realTimeNotifications';
import { getDepartmentColor, getAvatarText, getAvatarProps } from './utils/avatarColors';
import { handleSupabaseError, isRLSError } from './utils/rlsErrorHandler';
import { useFcm } from './hooks/useFcm';
import { useSubscription } from './hooks/useSubscription';
import { usePermissions } from './hooks/usePermissions';
import { useDebouncedValue } from './utils/debounce';
import { PrivilegeOverviewPage } from './components/Admin/PrivilegeOverview';
import { PERMISSIONS, PERMISSION_DESCRIPTIONS } from './utils/privileges';
import './utils/testRealtime'; // Load realtime test utilities
import LoginPage from './components/pages/LoginPage';
import UserAdmin from './components/pages/UserAdmin';
import DropdownMenuPage from './components/pages/DropdownMenuPage';
import PasswordChangePrompt from './components/PasswordChangePrompt';
import CustomConfirmationModal from './components/ConfirmationModal';
import AdminDocumentManager from './components/pages/AdminDocumentManager';
import Chatbot from './components/Chatbot';
import { Button, Input, ConfirmationModal, Combobox, ReadOnlyField, RichTextEditor, Modal, Switch, StatusBadge } from './components/ui';
import FileManagementSystem from './components/FileManagement/FileManagementSystem';
import EquipmentPage from './components/Equipment/EquipmentPage';
import VehiclesPage from './components/Vehicles/VehiclesPage';
import ProjectsPageComponent from './pages/ProjectsPage';
import DashboardPage from './pages/DashboardPage';
import AssignedTasksPage from './pages/AssignedTasksPage';
import ProjectTasksPage from './pages/ProjectTasksPage';
import UserContactsPage from './pages/UserContactsPage';
import SubcontractorsPage from './pages/SubcontractorsPage';
import UsefulContactsPage from './pages/UsefulContactsPage';
import UsefulLinksPage from './pages/UsefulLinksPage';
import OnCallContactsPage from './pages/OnCallContactsPage';
import FeedbackPage from './pages/FeedbackPage';
import DeliveryTasksPage from './pages/DeliveryTasksPage';
import RailComponentsPage from './pages/RailComponentsPage';

// Lazy-loaded pages for better performance
const AnnouncementsPage = lazy(() => import('./pages/AnnouncementsPage'));
const ResourceCalendarPage = lazy(() => import('./pages/ResourceCalendarPage'));
const EquipmentCalendarPage = lazy(() => import('./pages/EquipmentCalendarPage'));
const AuditTrailPage = lazy(() => import('./pages/AuditTrailPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const ProjectLogsPage = lazy(() => import('./pages/ProjectLogsPage'));
const ResourceAnalyticsPage = lazy(() => import('./pages/ResourceAnalyticsPage'));
const AFVPage = lazy(() => import('./pages/AFVPage'));
const CalendarColoursPage = lazy(() => import('./pages/CalendarColoursPage'));
const VehicleMileageLogsPage = lazy(() => import('./pages/VehicleMileageLogsPage'));
const VehicleMileagePage = lazy(() => import('./pages/VehicleMileagePage'));
const CheckAdjustPage = lazy(() => import('./components/Equipment/CheckAdjustPage'));
const EquipmentRegisterPage = lazy(() => import('./components/Equipment/EquipmentRegisterPage'));
const CloseCallsPage = lazy(() => import('./pages/CloseCallsPage'));
const MediaPage = lazy(() => import('./pages/MediaPage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));

import MultiSelectFilter from './components/ui/MultiSelectFilter';
import { DeliveryTaskItem, DeliveryTaskModal } from './components/tasks/TaskComponents';
import ProjectModal from './components/modals/ProjectModal';
import JobModal from './components/modals/JobModal';
import { getWeekStartDate, getFiscalWeek, addDays, formatDateForDisplay, formatDateForKey } from './utils/dateHelpers';
import { jobStatuses, shiftColors, leaveColors, ANNOUNCEMENT_PRIORITIES, NOTIFICATION_METHODS } from './constants';

// --- USER PRIVILEGES & MOCK DATA ---
// Temporary mock data until all components are updated to use UserProvider
const mockUsers = {
  '1': { id: 1, username: 'Colin.Rogers', name: 'Colin Rogers', role: 'Admin', teamRole: 'Office Staff', avatar: 'CR', email: 'colin.rogers@surveyhub.co.uk', last_login: '2024-08-25 10:30', password: 'Survey Hub', privilege: 'Admin' },
  '2': { id: 2, username: 'Ben.Carter', name: 'Ben Carter', role: 'Manager', teamRole: 'Project Team', avatar: 'BC', email: 'ben.carter@surveyhub.co.uk', last_login: '2024-08-25 09:15', password: 'password123', privilege: 'Project Managers' },
  '3': { id: 3, username: 'Chloe.Davis', name: 'Chloe Davis', role: 'Editor', teamRole: 'Site Team', avatar: 'CD', email: 'chloe.davis@surveyhub.co.uk', last_login: '2024-08-24 15:45', password: 'password456', privilege: 'Site Staff' },
  '4': { id: 4, username: 'David.Evans', name: 'David Evans', role: 'Viewer', teamRole: 'Design Team', avatar: 'DE', email: 'david.evans@surveyhub.co.uk', last_login: '2024-08-23 11:20', password: 'password789', privilege: 'Delivery Surveyors' },
  '5': { id: 5, username: 'Frank.Green', name: 'Frank Green', role: 'Viewer', teamRole: 'Subcontractor', avatar: 'FG', email: 'frank.green@contractors.com', last_login: '2024-08-22 18:00', password: 'password101', privilege: 'Subcontractor' },
};

const userPrivileges = {
    'Viewer': {
        level: 0,
        canEditProjects: false,
        canEditSiteInformation: false,
        canViewAssignedTasks: false,
        canViewUserAdmin: false,
        canEditUserAdmin: false,
        canViewAuditTrail: false,
        canViewAnalytics: true,
    },
    'Viewer+': {
        level: 0.5,
        canEditProjects: false,
        canEditSiteInformation: false,
        canViewAssignedTasks: true,
        canViewUserAdmin: false,
        canEditUserAdmin: false,
        canViewAuditTrail: false,
        canViewAnalytics: true,
    },
    'Editor': {
        level: 1,
        canEditProjects: true,
        canEditSiteInformation: true,
        canViewAssignedTasks: false,
        canViewUserAdmin: false,
        canEditUserAdmin: false,
        canViewAuditTrail: false,
        canViewAnalytics: true,
    },
    'Editor+': {
        level: 1.5,
        canEditProjects: true,
        canEditSiteInformation: true,
        canViewAssignedTasks: true,
        canViewUserAdmin: false,
        canEditUserAdmin: false,
        canViewAuditTrail: false,
        canViewAnalytics: true,
    },
    'Subcontractor': {
        level: 2,
        canEditProjects: false,
        canEditSiteInformation: false,
        canViewAssignedTasks: false,
        canViewUserAdmin: false,
        canEditUserAdmin: false,
        canViewAuditTrail: false,
        canViewAnalytics: true,
    },
    'Site Staff': {
        level: 3,
        canEditProjects: true,
        canEditSiteInformation: true,
        canViewAssignedTasks: false,
        canViewUserAdmin: false,
        canEditUserAdmin: false,
        canViewAuditTrail: false,
        canViewAnalytics: true,
    },
    'Office Staff': {
        level: 4,
        canEditProjects: true,
        canEditSiteInformation: true,
        canViewAssignedTasks: true,
        canViewUserAdmin: true,
        canEditUserAdmin: false,
        canViewAuditTrail: true,
        canViewAnalytics: true,
    },
    'Delivery Surveyors': {
        level: 4,
        canEditProjects: true,
        canEditSiteInformation: true,
        canViewAssignedTasks: true,
        canViewUserAdmin: true,
        canEditUserAdmin: false,
        canViewAuditTrail: true,
        canViewAnalytics: true,
    },
    'Project Managers': {
        level: 4,
        canEditProjects: true,
        canEditSiteInformation: true,
        canViewAssignedTasks: true,
        canViewUserAdmin: true,
        canEditUserAdmin: false,
        canViewAuditTrail: true,
        canViewAnalytics: true,
    },
    'Admin': {
        level: 5,
        canEditProjects: true,
        canEditSiteInformation: true,
        canViewAssignedTasks: true,
        canViewUserAdmin: true,
        canEditUserAdmin: true,
        canViewAuditTrail: true,
        canViewAnalytics: true,
    }
};

const initialProjects = [
  { id: 1, project_number: '23001', project_name: 'West Coast Main Line - Track Renewal', client: 'Network Rail', date_created: '2023-10-26', team: ['BC', 'CD'], description: 'Comprehensive topographical survey and track renewal assessment for a 20-mile section.', startDate: '2023-11-01', targetDate: '2024-12-31', tasksText: '- Finalize Survey Report\n- Produce Track Alignment Drawings' },
  { id: 2, project_number: '23045', project_name: 'HS2 Phase 2a - Topographical Survey', client: 'HS2 Ltd', date_created: '2023-09-15', team: ['BC', 'DE'], description: 'Topographical survey for the HS2 Phase 2a route.', startDate: '2023-10-01', targetDate: '2024-06-30', tasksText: 'All tasks completed. Final data delivered to client.' },
  { id: 3, project_number: '24012', project_name: 'Crossrail - Asset Verification', client: 'Transport for London', date_created: '2024-01-20', team: ['BC', 'CD', 'DE'], description: 'Verification of assets along the Crossrail line.', startDate: '2024-02-01', targetDate: '2025-01-31', tasksText: 'Awaiting final instruction from TfL before commencing site visits.' },
  { id: 4, project_number: '24005', project_name: 'Great Western Electrification - OLE Survey', client: 'Network Rail', date_created: '2024-02-10', team: ['BC', 'CD'], description: 'Overhead Line Equipment survey for the GWEP project.', startDate: '2024-03-01', targetDate: '2024-11-30', tasksText: '' },
  { id: 5, project_number: '24002', project_name: 'Docklands Light Railway - Tunnel Inspection', client: 'TfL', date_created: '2024-03-05', team: ['BC'], description: 'Detailed inspection of DLR tunnels.', startDate: '2024-04-01', targetDate: '2024-09-30', tasksText: 'Project on hold due to access restrictions.' },
  { id: 6, project_number: '24018', project_name: 'Midland Main Line - Embankment Stability', client: 'Network Rail', date_created: '2024-04-12', team: ['BC', 'CD', 'DE'], description: 'Assessment of embankment stability on the MML.', startDate: '2024-05-01', targetDate: '2025-03-31', tasksText: '' },
  { id: 7, project_number: '24091', project_name: 'Old Oak Common - Site Survey', client: 'HS2 Ltd', date_created: '2024-05-21', team: ['BC', 'CD'], description: 'Initial site survey for the new Old Oak Common station.', startDate: '2024-06-01', targetDate: '2024-10-31', tasksText: '' },
];

const mockAssignedTasks = [
    { id: 1, text: 'Finalize NR-23-001 survey report', completed: false, project: 'NR-23-001', assignedTo: [3] },
    { id: 2, text: 'Schedule site visit for TFL-24-012', completed: false, project: 'TFL-24-012', assignedTo: [2, 4] },
    { id: 3, text: 'Process point cloud data for HS2-24-091', completed: true, project: 'HS2-24-091', assignedTo: [3] },
    { id: 4, text: 'Review safety briefing for DLR-24-002', completed: false, project: 'DLR-24-002', assignedTo: [2, 3, 4] },
];

const mockResourceAllocations = {
  '2025-08-25': {
    '1': {
        assignments: [
            { type: 'leave', leaveType: 'Office (Haydock)' },
            { type: 'leave', leaveType: 'Office (Haydock)' },
            { type: 'leave', leaveType: 'Office (Home)' },
            { type: 'leave', leaveType: 'Office (Haydock)' },
            { type: 'leave', leaveType: 'Office (Haydock)' },
            null, null
        ]
    },
    '2': {
      assignments: [
        { type: 'leave', leaveType: 'Bank Holiday' },
        { type: 'project', projectNumber: '24005', projectName: 'Great Western Electrification - OLE Survey', client: 'Network Rail', time: '08:00-16:00', task: 'Survey', comment: '', shift: 'Days', projectId: 4 },
        null,
        { type: 'project', projectNumber: '24012', projectName: 'Crossrail - Asset Verification', client: 'Transport for London', time: '09:00-17:00', task: 'Monitoring', comment: 'Check access permits', shift: 'Evening', projectId: 3 },
        null, null, null
      ]
    },
    '3': {
      assignments: [
        { type: 'leave', leaveType: 'Bank Holiday' },
        { type: 'project', projectNumber: '24018', projectName: 'Midland Main Line - Embankment Stability', client: 'Network Rail', time: '22:00-06:00', task: 'Ground Investigation', comment: '', shift: 'Nights', projectId: 6 },
        { type: 'project', projectNumber: '24018', projectName: 'Midland Main Line - Embankment Stability', client: 'Network Rail', time: '22:00-06:00', task: 'Ground Investigation', comment: 'Full PPE required', shift: 'Nights', projectId: 6 },
        null, null, null, null
      ]
    },
    '4': {
      assignments: [
        { type: 'leave', leaveType: 'Bank Holiday' },
        null, null, null,
        { type: 'leave', leaveType: 'Annual Leave' },
        { type: 'leave', leaveType: 'Annual Leave' },
        null
      ]
    }
  }
};




const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
};

const initialJobs = [
    { id: 1, projectName: "HS2 Phase 1 Enabling Works", projectNumber: "HS2-EW-21-001", itemName: "Euston Station Survey", projectManager: "Ben Carter", client: "HS2 Ltd", processingHours: 80, checkingHours: 16, siteStartDate: "2024-08-01", siteCompletionDate: "2024-09-30", plannedDeliveryDate: "2024-10-15", actualDeliveryDate: "", discipline: "Survey", comments: "Awaiting final sign-off from client.", archived: false, status: "Site Work Completed" },
    { id: 2, projectName: "Crossrail - Paddington Integration", projectNumber: "CR-PADD-22-005", itemName: "Paddington Station As-built", projectManager: "Ben Carter", client: "Transport for London", processingHours: 120, checkingHours: 24, siteStartDate: "2024-07-15", siteCompletionDate: "2024-09-20", plannedDeliveryDate: "2024-09-27", actualDeliveryDate: "2024-09-26", discipline: "Design", comments: "", archived: true, status: "Delivered" },
    { id: 3, projectName: "OLE Foundation Survey", projectNumber: "OOC-OLE-23-002", itemName: "Old Oak Common Site", projectManager: "Colin Rogers", client: "HS2 Ltd", processingHours: 60, checkingHours: 12, siteStartDate: "2024-09-01", siteCompletionDate: "2024-10-10", plannedDeliveryDate: "2024-10-20", actualDeliveryDate: "", discipline: "Utility", comments: "Access constraints on weekends.", archived: false, status: "Site Not Started" },
];

// --- ENHANCED MOCK DATA FOR AUDIT TRAIL ---
// --- CONTEXT ---
// All contexts have been moved to separate files in src/contexts/
// mockAuditTrail moved to AuditTrailContext.jsx

// --- ICONS ---
const RetroTargetIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="5"/>
        <circle cx="50" cy="50" r="25" stroke="currentColor" strokeWidth="5"/>
        <path d="M50 0V100" stroke="currentColor" strokeWidth="5"/>
        <path d="M0 50H100" stroke="currentColor" strokeWidth="5"/>
    </svg>
);


// --- MAIN LAYOUT COMPONENTS ---
const Header = ({ onMenuClick, setActiveTab, activeTab, onChatbotToggle }) => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { addToast } = useToast();
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const notificationsRef = useRef(null);
    const profileRef = useRef(null);
    // Import the new notification context
    const {
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        clearAllNotifications,
        markAllAsRead
    } = useNotifications();


    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
                setIsNotificationsOpen(false);
            }
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Handle logout button click - show confirmation
    const handleLogoutClick = () => {
        setShowLogoutConfirm(true);
    };

    // Handle actual logout confirmation
    const handleLogoutConfirm = async () => {
        setIsLoggingOut(true);
        try {
            await logout();
            console.log('Logout successful');
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            setIsLoggingOut(false);
            setShowLogoutConfirm(false);
        }
    };

    // Handle logout cancellation
    const handleLogoutCancel = () => {
        setShowLogoutConfirm(false);
    };

    // Handle manual update check
    const handleCheckForUpdates = async () => {
        setIsProfileOpen(false);

        if (!navigator.serviceWorker) {
            addToast({ message: 'Service worker not available', type: 'error' });
            return;
        }

        try {
            addToast({ message: 'Checking for updates...', type: 'info' });

            // Force re-register service worker with cache bust parameter
            // This bypasses all HTTP caching and forces a fresh download
            const cacheBustUrl = `/sw.js?v=${Date.now()}`;
            console.log('🔍 Manual update check - registering with cache bust:', cacheBustUrl);

            const registration = await navigator.serviceWorker.register(cacheBustUrl, {
                updateViaCache: 'none'
            });

            // Update global reference
            window.swRegistration = registration;

            // Check current SW state before update
            const hadWaitingBefore = !!registration.waiting;
            const hadInstallingBefore = !!registration.installing;

            console.log('📦 SW state after registration:', {
                installing: !!registration.installing,
                waiting: !!registration.waiting,
                active: !!registration.active
            });

            // Set up a listener for the updatefound event
            const updatePromise = new Promise((resolve) => {
                const timeout = setTimeout(() => resolve('no-update'), 5000);

                registration.addEventListener('updatefound', () => {
                    clearTimeout(timeout);
                    console.log('✅ Update found event fired');
                    resolve('update-found');
                }, { once: true });

                // Give time for update to be detected
                setTimeout(() => {
                    clearTimeout(timeout);
                    resolve('checked');
                }, 3000);
            });

            const result = await updatePromise;

            // Check all possible update states
            const hasWaitingNow = !!registration.waiting;
            const hasInstallingNow = !!registration.installing;
            const newUpdateDetected = (hasWaitingNow && !hadWaitingBefore) ||
                                      (hasInstallingNow && !hadInstallingBefore);

            if (result === 'update-found' || newUpdateDetected || hasWaitingNow || hasInstallingNow) {
                console.log('✅ Update available - triggering installation');
                addToast({ message: 'Update found! Refreshing...', type: 'success' });

                // If there's a waiting service worker, tell it to activate
                if (registration.waiting) {
                    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                } else if (registration.installing) {
                    // Wait for installing to become waiting, then activate
                    registration.installing.addEventListener('statechange', function() {
                        if (this.state === 'installed' && registration.waiting) {
                            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                        }
                    });
                }
                
                // Force reload after a short delay to allow SW to activate
                setTimeout(() => {
                    window.location.reload(true);
                    // Fallback for PWA which might ignore reload(true)
                    if (window.matchMedia('(display-mode: standalone)').matches) {
                        window.location.href = window.location.href;
                    }
                }, 1000);
            } else {
                console.log('✅ Already running latest version');
                addToast({ message: `You're running the latest version (v${packageJson.version}). Refreshing...`, type: 'success' });
                
                setTimeout(() => {
                    window.location.reload(true);
                    // Fallback for PWA which might ignore reload(true)
                    if (window.matchMedia('(display-mode: standalone)').matches) {
                        window.location.href = window.location.href;
                    }
                }, 500);
            }
        } catch (error) {
            console.error('Update check failed:', error);
            addToast({ message: 'Failed to check for updates', type: 'error' });
            
            // Fallback reload even on error
            setTimeout(() => {
                window.location.reload(true);
                // Fallback for PWA which might ignore reload(true)
                if (window.matchMedia('(display-mode: standalone)').matches) {
                    window.location.href = window.location.href;
                }
            }, 1500);
        }
    };

    return (
        <>
            <header className="flex items-center justify-between h-16 px-4 md:px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
                <div className="flex items-center">
                    <button onClick={onMenuClick} className="md:hidden mr-4 text-gray-500 dark:text-gray-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
                    </button>
                </div>
                <div className="flex items-center space-x-4">
                    <button onClick={() => window.location.reload()} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400" title="Refresh page">
                        <RefreshCw size={20} />
                    </button>
                    <button onClick={onChatbotToggle} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400" title="AI Company Assistant">
                        <MessageSquare size={20} />
                    </button>
                    <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                <div className="relative" ref={notificationsRef}>
                    <button onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 relative">
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 block h-5 w-5 rounded-full bg-orange-500 ring-2 ring-white dark:ring-gray-800 text-xs text-white flex items-center justify-center font-bold">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>
                    {isNotificationsOpen && (
                        <div className="fixed sm:absolute mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-[80vh] overflow-hidden
                                      w-[calc(100vw-1rem)] sm:w-80
                                      left-2 sm:left-auto
                                      right-2 sm:right-0
                                      top-16 sm:top-auto
                                      transform"
                        >
                            <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-800 dark:text-white truncate">Notifications</h3>
                                    {unreadCount > 0 && (
                                        <span className="text-xs text-gray-500 dark:text-gray-400">{unreadCount} unread</span>
                                    )}
                                </div>
                                <button 
                                    onClick={() => setIsNotificationsOpen(false)}
                                    className="md:hidden p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                    aria-label="Close notifications"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            <ul className="py-2 max-h-80 overflow-y-auto">
                                {isLoading ? (
                                    <li className="flex items-center justify-center py-8">
                                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                                        <span className="ml-2 text-sm text-gray-500">Loading...</span>
                                    </li>
                                ) : notifications.length === 0 ? (
                                    <li className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                                        No notifications
                                    </li>
                                ) : (
                                    notifications.slice(0, 10).map(notif => (
                                        <li
                                            key={notif.id}
                                            className={`flex items-start px-2 sm:px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${!notif.read ? 'bg-orange-50 dark:bg-orange-500/10' : ''}`}
                                            onClick={() => {
                                                console.log('Notification clicked:', notif);
                                                markAsRead(notif.id);

                                                // Navigate based on notification type and source
                                                let targetTab = 'Announcements'; // Default

                                                if (notif.source === 'announcements') {
                                                    targetTab = 'Announcements';
                                                } else if (notif.type?.includes('delivery_task')) {
                                                    targetTab = 'Delivery Team - To Do List';
                                                } else if (notif.type?.includes('project_task')) {
                                                    targetTab = 'To Do List';
                                                }

                                                console.log('Navigating to:', targetTab, 'for notification:', notif);
                                                setActiveTab(targetTab);
                                                setIsNotificationsOpen(false);
                                            }}
                                        >
                                            <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${!notif.read ? 'bg-orange-500' : 'bg-transparent'}`}></div>
                                            <div className="ml-2 sm:ml-3 flex-1 min-w-0">
                                                <p className="text-sm text-gray-700 dark:text-gray-300 break-words">{notif.message}</p>
                                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 break-words">{notif.time}</p>
                                                    {notif.priority && notif.priority !== 'medium' && (
                                                        <span className={`text-xs px-1 py-0.5 rounded shrink-0 ${
                                                            notif.priority === 'urgent' ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300' :
                                                            notif.priority === 'high' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300' :
                                                            'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                                        }`}>
                                                            {notif.priority}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </li>
                                    ))
                                )}
                            </ul>
                            <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2">
                                        {unreadCount > 0 && (
                                            <button 
                                                onClick={markAllAsRead}
                                                className="flex-1 text-center text-sm text-orange-500 hover:underline py-1"
                                            >
                                                Mark all as read
                                            </button>
                                        )}
                                        {notifications.length > 0 && (
                                            <button 
                                                onClick={() => {
                                                    clearAllNotifications();
                                                    setIsNotificationsOpen(false);
                                                }}
                                                className="flex-1 text-center text-sm text-red-500 hover:underline py-1"
                                            >
                                                Clear all
                                            </button>
                                        )}
                                    </div>
                                    <button 
                                        onClick={() => {
                                            setActiveTab('Announcements');
                                            setIsNotificationsOpen(false);
                                        }}
                                        className="w-full text-center text-sm text-gray-500 hover:underline dark:text-gray-400 py-1"
                                    >
                                        View all announcements
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="relative" ref={profileRef}>
                    <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center space-x-2">
                        <div className={`w-9 h-9 rounded-full ${getDepartmentColor(user.department)} text-white flex items-center justify-center font-bold`}>
                            {getAvatarText(user)}
                        </div>
                        <div className="hidden md:block text-left">
                            <p className="text-sm font-semibold text-gray-800 dark:text-white">{user.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{user.privilege}</p>
                        </div>
                        <ChevronDown size={16} className="text-gray-500 dark:text-gray-400" />
                    </button>
                    {isProfileOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                            <button onClick={() => { if (activeTab === 'Settings') setIsProfileOpen(false); else setActiveTab('Settings'); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><Settings size={16} className="mr-2"/>Profile Settings</button>
                            <button onClick={handleCheckForUpdates} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><RefreshCw size={16} className="mr-2"/>Check for Updates</button>
                            <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                            <button onClick={handleLogoutClick} className="w-full text-left flex items-center px-4 py-2 text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700"><LogOut size={16} className="mr-2"/>Logout</button>
                        </div>
                    )}
                </div>
                </div>
            </header>

            {/* Logout Confirmation Dialog */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
                        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 dark:bg-red-900/20 rounded-full">
                            <LogOut className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>

                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-2">
                            Confirm Logout
                        </h3>

                        <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                            Are you sure you want to log out? You will need to sign in again to access your account.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={handleLogoutCancel}
                                disabled={isLoggingOut}
                                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={handleLogoutConfirm}
                                disabled={isLoggingOut}
                                className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
                            >
                                {isLoggingOut ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                        Logging out...
                                    </>
                                ) : (
                                    'Logout'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

const Sidebar = ({ activeTab, setActiveTab, isOpen, setIsOpen }) => {
    const { user } = useAuth();
    const {
        can,
        canAccessAdmin,
        canAccessFeedback,
        canAccessUserAdmin,
        canAccessDocumentManagement,
        canAccessDropdownMenu,
        canAccessAuditTrail,
        canAccessCalendarColours
    } = usePermissions();
    const [isAdminMode, setIsAdminMode] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState({
        'Resource': false,
        'Equipment': false,
        'Vehicles': false,
        'Delivery': false,
        'Training Centre': false,
        'Contact Details': false,
        'Analytics': false,
        'Admin': false
    });
    const sidebarRef = useRef(null);

    // Check if user can access admin mode
    const isAdminUser = canAccessAdmin();

    // Toggle group expansion
    const toggleGroup = (groupName) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupName]: !prev[groupName]
        }));
    };

    // Regular navigation items (visible to all users)
    const regularNavItems = [
        { name: 'Dashboard', icon: BarChartIcon, show: true },
        { name: 'Projects', icon: FolderKanban, show: can('VIEW_PROJECTS') },
        { name: 'Announcements', icon: Megaphone, show: can('VIEW_ANNOUNCEMENTS') },
        {
            name: 'Resource',
            icon: FolderOpen,
            show: true,
            isGroup: true,
            subItems: [
                { name: 'Resource Calendar', parent: 'Resource', show: can('VIEW_RESOURCE_CALENDAR') },
                { name: 'To Do List', parent: 'Resource', show: can('VIEW_TASKS') },
                { name: 'Close Calls', parent: 'Resource', show: can('VIEW_CLOSE_CALLS') },
                { name: 'Media', parent: 'Resource', show: can('VIEW_MEDIA') }
            ]
        },
        {
            name: 'Equipment',
            icon: Wrench,
            show: true,
            isGroup: true,
            subItems: [
                { name: 'Calendar', parent: 'Equipment', show: can('VIEW_EQUIPMENT_CALENDAR') },
                { name: 'Assignments', parent: 'Equipment', show: can('VIEW_EQUIPMENT') },
                { name: 'Register', parent: 'Equipment', show: can('VIEW_EQUIPMENT_REGISTER') },
                { name: 'Check & Adjust', parent: 'Equipment', show: can('VIEW_CHECK_ADJUST') }
            ]
        },
        {
            name: 'Vehicles',
            icon: Car,
            show: can('VIEW_VEHICLES'),
            isGroup: true,
            subItems: [
                { name: 'Vehicle Management', parent: 'Vehicles', show: can('VIEW_VEHICLES') },
                { name: 'Mileage Logs', parent: 'Vehicles', show: can('VIEW_VEHICLE_MILEAGE') },
                { name: 'Vehicle Inspection', parent: 'Vehicles', show: can('VIEW_VEHICLE_INSPECTION') }
            ]
        },
        {
            name: 'Delivery',
            icon: ClipboardPaste,
            show: true,
            isGroup: true,
            subItems: [
                { name: 'Delivery Tracker', parent: 'Delivery', show: can('VIEW_DELIVERY_TRACKER') },
                { name: 'Delivery Team - To Do List', displayName: 'To Do List', parent: 'Delivery', show: can('VIEW_DELIVERY_TODO') }
            ]
        },
        {
            name: 'Training Centre',
            icon: Presentation,
            show: true,
            isGroup: true,
            subItems: [
                { name: 'Document Hub', parent: 'Training Centre', show: can('VIEW_DOCUMENT_HUB') },
                { name: 'Video Tutorials', parent: 'Training Centre', show: can('VIEW_VIDEO_TUTORIALS') },
                { name: 'Rail Components', parent: 'Training Centre', show: can('VIEW_RAIL_COMPONENTS') }
            ]
        },
        {
            name: 'Contact Details',
            icon: BookUser,
            show: true,
            isGroup: true,
            subItems: [
                { name: 'Staff Contacts', parent: 'Contact Details' },
                { name: 'Subcontractors', parent: 'Contact Details' },
                { name: 'Useful Contacts', parent: 'Contact Details' },
                { name: 'On-Call Contacts', parent: 'Contact Details' }
            ]
        },
        { name: 'Useful Links', icon: Link, show: true },
        {
            name: 'Analytics',
            icon: TrendingUp,
            show: can('VIEW_ANALYTICS'),
            isGroup: true,
            subItems: [
                { name: 'Project Logs', parent: 'Analytics', show: can('VIEW_PROJECT_LOGS') },
                { name: 'Resource', parent: 'Analytics', show: can('VIEW_RESOURCE_ANALYTICS') },
                { name: 'AFV', parent: 'Analytics', show: can('VIEW_AFV') }
            ]
        },
        { name: 'Leaderboard', icon: Trophy, show: can('VIEW_LEADERBOARD') },
        { name: 'Settings', icon: Settings, show: true },
    ];

    // Admin-specific navigation items (only visible in admin mode)
    const adminNavItems = [
        { name: 'Feedback', icon: Bug, show: canAccessFeedback },
        { name: 'User Admin', icon: Users, show: canAccessUserAdmin },
        { name: 'Privilege', icon: Shield, show: canAccessUserAdmin },
        { name: 'Document Management', icon: FileText, show: canAccessDocumentManagement },
        { name: 'Dropdown Menu', icon: List, show: canAccessDropdownMenu },
        { name: 'Calendar Colours', icon: Palette, show: canAccessCalendarColours },
        { name: 'Audit Trail', icon: History, show: canAccessAuditTrail },
    ];

    // Choose which navigation items to show based on mode
    const currentNavItems = isAdminMode ? adminNavItems : regularNavItems;
    const navItems = currentNavItems.filter(item => item.show);

    const handleItemClick = (item, e) => {
        e.preventDefault();
        // For group items, toggle expansion on click (both desktop and mobile)
        if (item.isGroup) {
            // If sidebar is collapsed (desktop), expand it first so user can see subitems
            if (isCollapsed) {
                setIsCollapsed(false);
            }
            // Toggle the group expansion on click for all devices
            toggleGroup(item.name);
        } else {
            setActiveTab(item.name);
            // Only close sidebar in mobile when navigating to a page
            if(window.innerWidth < 768) setIsOpen(false);
        }
    };

    const handleSubItemClick = (subItem, e) => {
        e.preventDefault();
        setActiveTab(subItem.name);
        if(window.innerWidth < 768) setIsOpen(false);
    };

    const isDeliveryActive = activeTab === 'Delivery Tracker' || activeTab === 'Delivery Team - To Do List';
    const isResourceActive = activeTab === 'Resource Calendar' || activeTab === 'To Do List';
    const isEquipmentActive = activeTab === 'Calendar' || activeTab === 'Assignments' || activeTab === 'Register' || activeTab === 'Check & Adjust';
    const isTrainingCentreActive = activeTab === 'Document Hub' || activeTab === 'Video Tutorials' || activeTab === 'Rail Components';
    const isContactDetailsActive = activeTab === 'Staff Contacts' || activeTab === 'Subcontractors' || activeTab === 'Useful Contacts' || activeTab === 'On-Call Contacts';
    const isVehiclesActive = activeTab === 'Vehicle Management' || activeTab === 'Vehicle Inspection' || activeTab === 'Mileage Logs';
    const isAnalyticsActive = activeTab === 'Project Logs' || activeTab === 'Resource' || activeTab === 'AFV';

    // Close sidebar when clicking outside in mobile mode
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Only handle click outside in mobile mode and when sidebar is open
            if (window.innerWidth < 768 && isOpen && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, setIsOpen]);

    return (
        <aside ref={sidebarRef} className={`fixed md:relative z-40 md:z-auto inset-y-0 left-0 ${isCollapsed ? 'md:w-20 w-64' : 'w-64'} bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-all duration-300 ease-in-out flex flex-col`}>
            <div className="border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <div className={`flex items-center h-16 ${isCollapsed ? 'md:justify-center md:px-2 justify-between px-6' : 'justify-between px-6'}`}>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors duration-200"
                            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                        >
                            <Menu size={20} />
                        </button>
                        {!isCollapsed && (
                            isAdminUser ? (
                                <button
                                    onClick={() => {
                                        const newAdminMode = !isAdminMode;
                                        setIsAdminMode(newAdminMode);

                                        // Check if current tab exists in the new mode
                                        const newNavItems = newAdminMode ? adminNavItems : regularNavItems;
                                        const filteredNewNavItems = newNavItems.filter(item => item.show);
                                        const currentTabExists = filteredNewNavItems.some(item => item.name === activeTab);

                                        // If current tab doesn't exist in new mode, switch to appropriate default
                                        if (!currentTabExists) {
                                            if (newAdminMode) {
                                                // Switching to admin mode, go to first available admin item (likely Feedback or User Admin)
                                                const firstAdminItem = filteredNewNavItems[0];
                                                setActiveTab(firstAdminItem ? firstAdminItem.name : 'Feedback');
                                            } else {
                                                // Switching to regular mode, go to Dashboard
                                                setActiveTab('Dashboard');
                                            }
                                        }
                                    }}
                                    className="flex items-center hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors duration-200 rounded-lg px-2 py-1"
                                    title={`Switch to ${isAdminMode ? 'Regular' : 'Admin'} Mode`}
                                >
                                    <span className="text-xl font-bold text-gray-800 dark:text-white whitespace-nowrap">Survey Hub</span>
                                    <RetroTargetIcon className="w-8 h-8 text-orange-500 ml-3" />
                                </button>
                            ) : (
                                <div className="flex items-center">
                                    <span className="text-xl font-bold text-gray-800 dark:text-white whitespace-nowrap">Survey Hub</span>
                                    <RetroTargetIcon className="w-8 h-8 text-orange-500 ml-3" />
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
            <nav className={`${isCollapsed ? 'p-2' : 'p-4'} overflow-y-auto flex-1 min-h-0 scroll-smooth`}>
                <ul className="pb-4">
                    {navItems.map(item => (
                        <li key={item.name}>
                            {item.isGroup ? (
                                <button
                                    onClick={(e) => handleItemClick(item, e)}
                                    className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-4'} py-2.5 my-1 text-sm font-medium rounded-lg transition-colors duration-200 ${
                                        (item.name === 'Delivery' && isDeliveryActive) ||
                                        (item.name === 'Resource' && isResourceActive) ||
                                        (item.name === 'Equipment' && isEquipmentActive) ||
                                        (item.name === 'Training Centre' && isTrainingCentreActive) ||
                                        (item.name === 'Contact Details' && isContactDetailsActive) ||
                                        (item.name === 'Vehicles' && isVehiclesActive) ||
                                        (item.name === 'Analytics' && isAnalyticsActive)
                                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-600/40 dark:text-orange-200'
                                            : 'text-gray-700 hover:bg-orange-50 hover:text-orange-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100'
                                    }`}
                                    title={isCollapsed ? item.name : ''}
                                >
                                    <item.icon size={20} className={isCollapsed ? '' : 'mr-3'} />
                                    {!isCollapsed && <span className="flex-1 text-left">{item.name}</span>}
                                </button>
                            ) : (
                                <a
                                    href="#"
                                    onClick={(e) => handleItemClick(item, e)}
                                    className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-4'} py-2.5 my-1 text-sm font-medium rounded-lg transition-colors duration-200 ${
                                        activeTab === item.name
                                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-600/40 dark:text-orange-200'
                                            : 'text-gray-600 hover:bg-orange-50 hover:text-orange-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
                                    }`}
                                    title={isCollapsed ? item.name : ''}
                                >
                                    <item.icon size={20} className={isCollapsed ? '' : 'mr-3'} />
                                    {!isCollapsed && <span className="flex-1">{item.name}</span>}
                                </a>
                            )}
                            {!isCollapsed && item.isGroup && expandedGroups[item.name] && (
                                <ul className="ml-4 mt-1 space-y-1">
                                    {item.subItems.filter(subItem => subItem.show !== false).map(subItem => (
                                        <li key={subItem.name}>
                                            <a
                                                href="#"
                                                onClick={(e) => handleSubItemClick(subItem, e)}
                                                className={`flex items-center px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
                                                    activeTab === subItem.name
                                                        ? 'bg-orange-50 text-orange-800 dark:bg-orange-600/30 dark:text-orange-200'
                                                        : 'text-gray-600 hover:bg-orange-50 hover:text-orange-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100'
                                                }`}
                                            >
                                                <span className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full mr-3"></span>
                                                {subItem.displayName || subItem.name}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </li>
                    ))}
                </ul>
            </nav>

            {/* Version Display */}
            <div className={`${isCollapsed ? 'p-2' : 'p-4'} border-t border-gray-200 dark:border-gray-700`}>
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <Shield size={14} />
                    {!isCollapsed && <span>v{packageJson.version}</span>}
                </div>
            </div>
        </aside>
    );
};

// --- SHARED COMPONENTS ---
// Card component moved to src/components/ui/index.jsx

// --- PAGE COMPONENTS ---
const ProjectsPage = ({ onViewProject }) => {
    return <ProjectsPageComponent onViewProject={onViewProject} />;
};

const DeliveryTrackerPage = () => {
    return (
        <div className="p-4 md:p-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Delivery Tracker</h1>
            <DeliveryTrackerContent />
        </div>
    );
};

const DeliveryTrackerContent = () => {
    const { jobs, addJob, updateJob, deleteJob, loading, error } = useJobs();
    const { canCreateProjects, canEditProjects, canDeleteProjects } = usePermissions();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [jobToEdit, setJobToEdit] = useState(null);
    const [showArchived, setShowArchived] = useState(false);
    
    // Sort Config State with localStorage
    const [sortConfig, setSortConfig] = useState(() => {
        const saved = localStorage.getItem('deliveryTracker_jobs_sortConfig');
        return saved ? JSON.parse(saved) : { key: 'plannedDeliveryDate', direction: 'ascending' };
    });

    const [jobToDelete, setJobToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [jobToArchive, setJobToArchive] = useState(null);
    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

    // Persist sortConfig to localStorage
    useEffect(() => {
        localStorage.setItem('deliveryTracker_jobs_sortConfig', JSON.stringify(sortConfig));
    }, [sortConfig]);
    
    // New Filter State
    const [showFilters, setShowFilters] = useState(() => {
        const saved = localStorage.getItem('deliveryTracker_jobs_showFilters');
        return saved ? JSON.parse(saved) : false;
    });

    const [filters, setFilters] = useState(() => {
        const saved = localStorage.getItem('deliveryTracker_jobs_filters');
        return saved ? JSON.parse(saved) : {
            projectName: [],
            projectNumber: [],
            itemName: [],
            projectManager: [],
            client: [],
            discipline: [],
            siteStartDate: [],
            siteCompletionDate: [],
            plannedDeliveryDate: [],
            actualDeliveryDate: [],
            status: []
        };
    });

    // Persist showFilters to localStorage
    useEffect(() => {
        localStorage.setItem('deliveryTracker_jobs_showFilters', JSON.stringify(showFilters));
    }, [showFilters]);

    // Persist filters to localStorage
    useEffect(() => {
        localStorage.setItem('deliveryTracker_jobs_filters', JSON.stringify(filters));
    }, [filters]);

    const handleSaveJob = async (jobData) => {
        if (jobToEdit) {
            await updateJob({ ...jobToEdit, ...jobData });
        } else {
            const newJob = { ...jobData, archived: false };
            await addJob(newJob);
        }
        setIsModalOpen(false);
        setJobToEdit(null);
    };
    
    const handleDeleteClick = (job) => {
        setJobToDelete(job);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        await deleteJob(jobToDelete.id);
        setIsDeleteModalOpen(false);
        setJobToDelete(null);
    };
    
    const handleArchiveClick = (job) => {
        setJobToArchive(job);
        setIsArchiveModalOpen(true);
    };

    const confirmArchive = async () => {
        await updateJob({ ...jobToArchive, archived: true });
        setIsArchiveModalOpen(false);
        setJobToArchive(null);
    };

    const handleUnarchiveJob = async (jobId) => {
        const jobToUnarchive = jobs.find(j => j.id === jobId);
        if (jobToUnarchive) {
            await updateJob({ ...jobToUnarchive, archived: false });
        }
    };
    
    const openEditModal = (job) => {
        setJobToEdit(job);
        setIsModalOpen(true);
    };

    const openNewJobModal = () => {
        setJobToEdit(null);
        setIsModalOpen(true);
    };

    // Helper to get unique options for filters
    const getOptions = (key) => {
        const values = jobs.map(job => {
            let val = job[key];
            return String(val || '');
        });
        return [...new Set(values)].sort();
    };

    const handleFilterChange = (key, newValues) => {
        setFilters(prev => ({ ...prev, [key]: newValues }));
        setCurrentPage(1);
    };

    const clearFilters = () => {
        setFilters({
            projectName: [],
            projectNumber: [],
            itemName: [],
            projectManager: [],
            client: [],
            discipline: [],
            siteStartDate: [],
            siteCompletionDate: [],
            plannedDeliveryDate: [],
            actualDeliveryDate: [],
            status: []
        });
        setCurrentPage(1);
    };

    const filteredJobs = useMemo(() => jobs.filter(j => {
        const matchesArchive = showArchived ? j.archived : !j.archived;
        if (!matchesArchive) return false;

        return Object.keys(filters).every(key => {
            if (filters[key].length === 0) return true;
            const itemVal = String(j[key] || '');
            return filters[key].includes(itemVal);
        });
    }), [jobs, showArchived, filters]);

    const sortedJobs = useMemo(() => {
        let sortableItems = [...filteredJobs];
        sortableItems.sort((a, b) => {
            if (!a[sortConfig.key] || !b[sortConfig.key]) return 0;
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
        return sortableItems;
    }, [filteredJobs, sortConfig]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key) => {
        if (sortConfig.key !== key) return <ArrowUpDown className="w-3 h-3 ml-1 text-orange-200" />;
        return sortConfig.direction === 'ascending' ? <ArrowUp className="w-3 h-3 ml-1 text-white" /> : <ArrowDown className="w-3 h-3 ml-1 text-white" />;
    };

    const tableHeaders = [
        { key: 'projectName', label: 'Project Name' },
        { key: 'projectNumber', label: 'Project Number' },
        { key: 'itemName', label: 'Item Name' },
        { key: 'projectManager', label: 'PM' },
        { key: 'client', label: 'Client' },
        { key: 'discipline', label: 'Discipline' },
        { key: 'siteStartDate', label: 'Site Start' },
        { key: 'siteCompletionDate', label: 'Site Completion' },
        { key: 'plannedDeliveryDate', label: 'Planned Delivery' },
        { key: 'actualDeliveryDate', label: 'Actual Delivery' },
        { key: 'status', label: 'Status' },
    ];
    
    if (loading) {
        return <div className="p-8 text-2xl font-semibold text-center">Loading Delivery Team...</div>;
    }

    if (error) {
        return (
            <div className="p-6 m-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                <h2 className="font-bold text-xl mb-2">Error Loading Jobs</h2>
                <p>There was a problem fetching job data from the database.</p>
                <p className="mt-4 font-bold">Error Message:</p>
                <pre className="font-mono bg-red-50 p-2 rounded mt-1 text-sm">{error}</pre>
            </div>
        );
    }

    const hasActiveFilters = Object.values(filters).some(arr => arr.length > 0);

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div className="flex items-center">
                     <label htmlFor="show-archived-jobs" className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Show Archived Jobs</label>
                     <Switch id="show-archived-jobs" isChecked={showArchived} onToggle={() => setShowArchived(!showArchived)} />
                </div>
                <div className="w-full md:w-auto flex flex-col sm:flex-row gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowFilters(!showFilters)}
                        className={showFilters ? 'bg-gray-100 dark:bg-gray-700' : ''}
                    >
                        <Filter className="w-4 h-4 mr-2" /> {showFilters ? 'Hide Filters' : 'Show Filters'}
                    </Button>
                    {hasActiveFilters && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={clearFilters}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        >
                            <X className="w-4 h-4 mr-2" /> Clear All
                        </Button>
                    )}
                    {canCreateProjects && (
                        <Button onClick={openNewJobModal}><PlusCircle size={16} className="mr-2"/>Add Job</Button>
                    )}
                </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-visible">
                <div className="overflow-x-auto pb-4">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-white uppercase bg-orange-500 dark:bg-orange-600 border-b border-orange-600 dark:border-orange-800">
                            <tr>
                                {tableHeaders.map(header => (
                                    <th key={header.key} scope="col" className="px-6 py-3 cursor-pointer hover:bg-orange-600 dark:hover:bg-orange-700" onClick={() => requestSort(header.key)}>
                                        <div className="flex items-center">{header.label}<span className="ml-2">{getSortIndicator(header.key)}</span></div>
                                    </th>
                                ))}
                                <th className="px-6 py-3">Actions</th>
                            </tr>
                            {showFilters && (
                                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                    {tableHeaders.map(header => (
                                        <td key={header.key} className="px-2 py-2">
                                            <MultiSelectFilter 
                                                options={getOptions(header.key)} 
                                                selectedValues={filters[header.key]} 
                                                onChange={(vals) => handleFilterChange(header.key, vals)} 
                                            />
                                        </td>
                                    ))}
                                    <td className="px-2 py-2"></td>
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {sortedJobs.map(job => (
                                <tr key={job.id} className={`border-b dark:border-gray-700 ${job.archived ? 'bg-gray-100 dark:bg-gray-700/50' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-600/20'}`}>
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{job.projectName}</td>
                                    <td className="px-6 py-4">{job.projectNumber}</td>
                                    <td className="px-6 py-4">{job.itemName}</td>
                                    <td className="px-6 py-4">{job.projectManager}</td>
                                    <td className="px-6 py-4">{job.client}</td>
                                    <td className="px-6 py-4">{job.discipline}</td>
                                    <td className="px-6 py-4">{job.siteStartDate}</td>
                                    <td className="px-6 py-4">{job.siteCompletionDate}</td>
                                    <td className="px-6 py-4">{job.plannedDeliveryDate}</td>
                                    <td className="px-6 py-4">{job.actualDeliveryDate || 'N/A'}</td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={job.status} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-2">
                                            {canEditProjects && (
                                                <button onClick={() => openEditModal(job)} className="p-1.5 text-gray-500 hover:text-blue-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"><Edit size={16} /></button>
                                            )}
                                            {canDeleteProjects && (
                                                <button onClick={() => handleDeleteClick(job)} className="p-1.5 text-gray-500 hover:text-red-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"><Trash2 size={16} /></button>
                                            )}
                                            {canEditProjects && (
                                                job.archived ? (
                                                    <button onClick={() => handleUnarchiveJob(job.id)} className="p-1.5 text-gray-500 hover:text-green-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700" title="Unarchive"><ArchiveRestore size={16}/></button>
                                                ) : (
                                                    <button onClick={() => handleArchiveClick(job)} className="p-1.5 text-gray-500 hover:text-purple-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700" title="Archive"><Archive size={16} /></button>
                                                )
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <JobModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveJob} job={jobToEdit} />
                <ConfirmationModal 
                    isOpen={isDeleteModalOpen} 
                    onClose={() => setIsDeleteModalOpen(false)} 
                    onConfirm={confirmDelete} 
                    title="Confirm Deletion" 
                    message={`Are you sure you want to delete this job? This action cannot be undone.`}
                    confirmText="Delete"
                    confirmVariant="danger"
                />
                <ConfirmationModal 
                    isOpen={isArchiveModalOpen} 
                    onClose={() => setIsArchiveModalOpen(false)} 
                    onConfirm={confirmArchive} 
                    title="Confirm Archival" 
                    message={`Are you sure you want to archive this job?`}
                    confirmText="Archive"
                    confirmVariant="primary"
                />
            </div>
        </div>
    );
};

// JobModal has been extracted to src/components/modals/JobModal.jsx

const UserAdminPage = () => {
    // MODIFICATION 1: Get data and functions from the new useUsers hook
    const { users, addUser, addAuthUser, updateUser, deleteUser, loading, error } = useUsers();
    const { teamRoles } = useTeamRoles();
    const { createAuditLog } = useAuditTrail();

    // Helper function to get display text for team role
    const getTeamRoleDisplayText = (roleValue) => {
        const role = teamRoles.find(r => r.value === roleValue);
        return role ? role.display_text : roleValue;
    };

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [isResetMFAModalOpen, setIsResetMFAModalOpen] = useState(false);
    const [userToResetMFA, setUserToResetMFA] = useState(null);
    const [mfaStatuses, setMfaStatuses] = useState({});
    const { user: currentUser } = useAuth();
    const privileges = currentUser?.privilege ? userPrivileges[currentUser.privilege] : {};
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });

    // MODIFICATION 2: Update save handler to use async context functions
    const handleSaveUser = async (userData) => {
        // Prepare data for the database (snake_case)
        const userRecord = {
            ...userData,
            team_role: userData.teamRole, // Map from camelCase to snake_case
        };
        delete userRecord.teamRole; // Remove the old key

        if (userToEdit) {
            await updateUser({ ...userToEdit, ...userRecord });
        } else {
            // Check if we should create an auth user or just a database user
            if (userData.createAuthUser) {
                const result = await addAuthUser(userRecord);
                if (!result.success) {
                    // Error already shown by addAuthUser
                    return;
                }
            } else {
                const newUser = {
                    ...userRecord,
                    avatar: userRecord.name.split(' ').map(n => n[0]).join(''),
                };
                await addUser(newUser);
            }
        }
        setIsModalOpen(false);
        setUserToEdit(null);
    };
    
    const openEditModal = (user) => {
        setUserToEdit(user);
        setIsModalOpen(true);
    };

    const openNewUserModal = () => {
        setUserToEdit(null);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (user) => {
        setUserToDelete(user);
        setIsDeleteModalOpen(true);
    };

    // MODIFICATION 3: Update delete handler
    const confirmDelete = async () => {
        await deleteUser(userToDelete.id);
        setIsDeleteModalOpen(false);
        setUserToDelete(null);
    };

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

    // Fetch MFA status for all users
    useEffect(() => {
        const fetchMFAStatuses = async () => {
            const statuses = {};
            for (const user of users) {
                try {
                    const { data, error } = await supabase.rpc('user_has_mfa', {
                        check_user_id: user.id
                    });

                    if (error) {
                        console.error('Error fetching MFA status for user:', user.email, error);
                        statuses[user.id] = false;
                    } else {
                        statuses[user.id] = data === true;
                    }
                } catch (err) {
                    console.error('Error fetching MFA status for user:', user.email, err);
                    statuses[user.id] = false;
                }
            }
            setMfaStatuses(statuses);
        };

        if (users.length > 0) {
            fetchMFAStatuses();
        }
    }, [users]);

    const handleResetMFAClick = (user) => {
        setUserToResetMFA(user);
        setIsResetMFAModalOpen(true);
    };

    const confirmResetMFA = async () => {
        try {
            // Delete MFA factors from auth.mfa_factors table using RPC
            const { data, error } = await supabase.rpc('admin_reset_user_mfa', {
                target_user_id: userToResetMFA.id
            });

            if (error) {
                console.error('Error calling admin_reset_user_mfa:', error);
                throw error;
            }

            console.log('MFA reset successful for user:', userToResetMFA.email);

            // Log the action in audit trail
            await createAuditLog(
                currentUser,
                'MFA Reset',
                `Admin ${currentUser.name} reset MFA for user ${userToResetMFA.name} (${userToResetMFA.email})`,
                'SYSTEM_EVENT'
            );

            // Update MFA status in state
            setMfaStatuses(prev => ({
                ...prev,
                [userToResetMFA.id]: false
            }));

            alert(`MFA has been reset for ${userToResetMFA.name}. They can now log in with just their password.`);
        } catch (err) {
            console.error('Error resetting MFA:', err);
            alert(`Failed to reset MFA: ${err.message || 'Unknown error'}. Please try again.`);
        } finally {
            setIsResetMFAModalOpen(false);
            setUserToResetMFA(null);
        }
    };

    const filteredUsers = useMemo(() => users.filter(user =>
        (user.name && user.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
        (user.username && user.username.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
        (user.email && user.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
        (user.role && user.role.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
        (user.team_role && user.team_role.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
    ), [users, debouncedSearchTerm]);

    const sortedUsers = useMemo(() => {
        let sortableItems = [...filteredUsers];
        sortableItems.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
        return sortableItems;
    }, [filteredUsers, sortConfig]);
    
    // MODIFICATION 4: Add loading and error states
    if (!currentUser) {
        return <div className="p-8 text-2xl font-semibold text-center">Loading...</div>;
    }

    if (loading) {
        return <div className="p-8 text-2xl font-semibold text-center">Loading Users...</div>;
    }

    if (error) {
        return (
            <div className="p-6 m-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                <h2 className="font-bold text-xl mb-2">Error Loading Users</h2>
                <p>There was a problem fetching user data from the database.</p>
                <p className="mt-4 font-bold">Error Message:</p>
                <pre className="font-mono bg-red-50 p-2 rounded mt-1 text-sm">{error}</pre>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">User Administration</h1>
                <div className="w-full md:w-auto flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="text" placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
                    </div>
                    {privileges.canEditUserAdmin && (
                        <Button onClick={openNewUserModal}><PlusCircle size={16} className="mr-2"/>Add User</Button>
                    )}
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            {['name', 'username', 'privilege', 'team_role', 'last_login'].map(key => (
                                <th key={key} scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort(key)}>
                                    <div className="flex items-center">{key.replace('_', ' ')}<span className="ml-2">{getSortIndicator(key)}</span></div>
                                </th>
                            ))}
                            <th scope="col" className="px-6 py-3">MFA Status</th>
                            {privileges.canEditUserAdmin && <th className="px-6 py-3">Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedUsers.map(user => (
                            <tr key={user.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600/20">
                                <td className="px-6 py-4 flex items-center">
                                    <div className={`w-8 h-8 rounded-full ${getDepartmentColor(user.department)} text-white flex items-center justify-center font-bold text-sm mr-3`}>{getAvatarText(user)}</div>
                                    {user.name}
                                </td>
                                <td className="px-6 py-4">{user.username}</td>
                                <td className="px-6 py-4">{user.privilege}</td>
                                <td className="px-6 py-4">{user.team_role}</td>
                                <td className="px-6 py-4">{user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}</td>
                                <td className="px-6 py-4">
                                    {mfaStatuses[user.id] ? (
                                        <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                            <Shield className="inline w-3 h-3 mr-1" />
                                            Enabled
                                        </span>
                                    ) : (
                                        <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                            Disabled
                                        </span>
                                    )}
                                </td>
                                {privileges.canEditUserAdmin && (
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-1">
                                            <button onClick={() => openEditModal(user)} className="p-1.5 text-gray-500 hover:text-blue-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700" title="Edit User"><Edit size={16} /></button>
                                            {mfaStatuses[user.id] && (
                                                <button onClick={() => handleResetMFAClick(user)} className="p-1.5 text-gray-500 hover:text-orange-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700" title="Reset MFA"><Shield size={16} /></button>
                                            )}
                                            <button onClick={() => handleDeleteClick(user)} className="p-1.5 text-gray-500 hover:text-red-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700" title="Delete User"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {privileges.canEditUserAdmin && (
                <>
                    <UserModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveUser} user={userToEdit} />
                    <ConfirmationModal
                        isOpen={isDeleteModalOpen}
                        onClose={() => setIsDeleteModalOpen(false)}
                        onConfirm={confirmDelete}
                        title="Confirm User Deletion"
                        message={`Are you sure you want to delete the user "${userToDelete?.name}"? This action cannot be undone.`}
                        confirmText="Delete"
                        confirmVariant="danger"
                    />
                    <ConfirmationModal
                        isOpen={isResetMFAModalOpen}
                        onClose={() => setIsResetMFAModalOpen(false)}
                        onConfirm={confirmResetMFA}
                        title="Reset Multi-Factor Authentication"
                        message={`Are you sure you want to reset MFA for "${userToResetMFA?.name}"? They will be able to log in with just their password until they re-enable MFA. This action will be logged in the audit trail.`}
                        confirmText="Reset MFA"
                        confirmVariant="danger"
                    />
                </>
            )}
        </div>
    );
};

// --- REPLACE UserModal with this new version ---
const UserModal = ({ isOpen, onClose, onSave, user }) => {
    // Note: The form still uses 'teamRole' (camelCase) for its state
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        email: '',
        privilege: 'Viewer',
        teamRole: 'site_team',
        password: '',
        hire_date: '',
        termination_date: '',
        createAuthUser: true // Default to creating auth users
    });
    const [errors, setErrors] = useState({});
    const { teamRoles, loading: teamRolesLoading } = useTeamRoles();

    useEffect(() => {
        if (user) {
            // When editing, map snake_case from DB to camelCase for the form state
            setFormData({
                name: user.name,
                username: user.username,
                email: user.email,
                privilege: user.privilege,
                teamRole: user.team_role,
                password: user.password || '',
                hire_date: user.hire_date || '',
                termination_date: user.termination_date || '',
                createAuthUser: false // Not applicable when editing
            });
        } else {
            // Set default to first available team role or fallback
            const defaultTeamRole = teamRoles.length > 0 ? teamRoles[0].value : 'site_team';
            setFormData({
                name: '',
                username: '',
                email: '',
                privilege: 'Viewer',
                teamRole: defaultTeamRole,
                password: '',
                hire_date: '',
                termination_date: '',
                createAuthUser: true // Default to creating auth users for new users
            });
        }
    }, [user, isOpen, teamRoles]);

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const validateForm = () => {
        const newErrors = {};

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        // Validate password for new auth users
        if (!user && formData.createAuthUser) {
            if (!formData.password || formData.password.length < 6) {
                newErrors.password = 'Password must be at least 6 characters long';
            }
        }

        // Validate required fields
        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        }
        if (!formData.username.trim()) {
            newErrors.username = 'Username is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Clear previous errors
        setErrors({});

        // Validate form
        if (!validateForm()) {
            return;
        }

        onSave(formData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={user ? 'Edit User' : 'Add User'}>
            <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Input label="Full Name" name="name" value={formData.name} onChange={handleChange} required />
                        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                    </div>
                    <div>
                        <Input label="Username" name="username" value={formData.username} onChange={handleChange} required />
                        {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
                    </div>
                    <div>
                        <Input label="Email" name="email" type="email" value={formData.email} onChange={handleChange} required />
                        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                    </div>
                    <div>
                        <Input
                            label="Password"
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder={user ? "Leave blank to keep unchanged" : ""}
                            required={!user && formData.createAuthUser}
                        />
                        {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                    </div>
                    <Combobox 
                        label="Privilege" 
                        name="privilege" 
                        value={formData.privilege} 
                        onChange={handleChange}
                        options={Object.keys(userPrivileges)}
                    />
                    <Combobox 
                        label="Team Role" 
                        name="teamRole" 
                        value={teamRolesLoading ? 'Loading...' : (teamRoles.find(r => r.value === formData.teamRole)?.display_text || '')} 
                        onChange={(e) => {
                            const selectedText = e.target.value;
                            const role = teamRoles.find(r => r.display_text === selectedText);
                            if (role) {
                                // Mimic event object for handleChange
                                handleChange({ target: { name: 'teamRole', value: role.value } });
                            }
                        }}
                        options={teamRolesLoading ? ['Loading...'] : teamRoles.map(r => r.display_text)}
                    />
                    <Input
                        label="Hire Date"
                        name="hire_date"
                        type="date"
                        value={formData.hire_date}
                        onChange={handleChange}
                    />
                    <Input
                        label="Termination Date"
                        name="termination_date"
                        type="date"
                        value={formData.termination_date}
                        onChange={handleChange}
                        placeholder="Leave blank for active employees"
                    />
                    {!user && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                            <label className="flex items-start space-x-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="createAuthUser"
                                    checked={formData.createAuthUser}
                                    onChange={handleChange}
                                    className="mt-1 w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                                />
                                <div>
                                    <div className="font-semibold text-gray-900 dark:text-white">
                                        Create Authentication User
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        If checked, this will create a real user in Supabase Auth who can log in to the application.
                                        If unchecked, this will only create a user record in the database (useful for dummy users or references).
                                    </div>
                                </div>
                            </label>
                        </div>
                    )}
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit">Save</Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

const SettingsPage = ({ initialSection = 'profile' }) => {
    const { user } = useAuth();
    const [activeSection, setActiveSection] = useState(initialSection);

    // Update activeSection when initialSection changes
    useEffect(() => {
        setActiveSection(initialSection);
    }, [initialSection]);

    const sections = [
        { id: 'profile', label: 'Profile', icon: Users },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'appearance', label: 'Appearance', icon: Palette },
        { id: 'notifications', label: 'Notifications', icon: Bell },
    ];

    return (
        <div className="p-4 md:p-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Settings</h1>
            <div className="flex flex-col md:flex-row gap-8">
                <aside className="md:w-1/4">
                    <nav className="space-y-1">
                        {sections.map(section => (
                            <button 
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeSection === section.id ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/20' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                            >
                                <section.icon className="mr-3 h-5 w-5" />
                                <span>{section.label}</span>
                            </button>
                        ))}
                    </nav>
                </aside>
                <main className="flex-1">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
                        {activeSection === 'profile' && <ProfileSettings user={user} />}
                        {activeSection === 'security' && <SecuritySettings />}
                        {activeSection === 'appearance' && <AppearanceSettings />}
                        {activeSection === 'notifications' && <NotificationSettings />}
                    </div>
                </main>
            </div>
        </div>
    );
};

const ProfileSettings = ({ user }) => {
    const { updateUser } = useAuth();
    const [formData, setFormData] = useState({
        name: user?.name || ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Update form data when user data changes
    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || ''
            });
        }
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage({ type: '', text: '' });

        try {
            // Only update name field if it has changed
            if (formData.name === user.name) {
                setMessage({ type: 'info', text: 'No changes to save.' });
                return;
            }

            const updates = {
                name: formData.name.trim()
            };

            await updateUser(updates);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (err) {
            console.error('Error updating profile:', err);
            setMessage({ type: 'error', text: err.message || 'Failed to update profile. Please try again.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
            {message.text && (
                <div className={`mb-4 p-3 rounded-lg ${
                    message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
                    message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
                    'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                    {message.text}
                </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Full Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                />
                <Input
                    label="Email Address"
                    type="email"
                    value={user?.email || ''}
                    disabled
                />
                <Input
                    label="Username"
                    value={user?.username || ''}
                    disabled
                    placeholder={!user?.username ? 'Loading username...' : ''}
                />
                <Input
                    label="Privilege"
                    value={user?.privilege || ''}
                    disabled
                />
                <div className="pt-2">
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

const SecuritySettings = () => {
    const [passwords, setPasswords] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setPasswords(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        // Validation
        if (!passwords.newPassword || !passwords.confirmPassword) {
            alert('Please fill in all fields');
            setIsLoading(false);
            return;
        }

        if (passwords.newPassword !== passwords.confirmPassword) {
            alert('New passwords do not match');
            setIsLoading(false);
            return;
        }

        if (passwords.newPassword.length < 6) {
            alert('Password must be at least 6 characters long');
            setIsLoading(false);
            return;
        }

        try {
            // Update password using Supabase
            const { error } = await supabase.auth.updateUser({
                password: passwords.newPassword
            });

            if (error) {
                throw error;
            }

            alert('Password updated successfully!');
            setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            console.error('Error updating password:', error);
            alert(`Error updating password: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Password Change Section */}
            <div>
                <h2 className="text-xl font-semibold mb-4">Change Password</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Current Password"
                        type="password"
                        name="currentPassword"
                        value={passwords.currentPassword}
                        onChange={handleChange}
                        placeholder="Enter your current password"
                    />
                    <Input
                        label="New Password"
                        type="password"
                        name="newPassword"
                        value={passwords.newPassword}
                        onChange={handleChange}
                        placeholder="Enter new password (min 6 characters)"
                    />
                    <Input
                        label="Confirm New Password"
                        type="password"
                        name="confirmPassword"
                        value={passwords.confirmPassword}
                        onChange={handleChange}
                        placeholder="Confirm your new password"
                    />
                    <div className="pt-2">
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Updating...' : 'Update Password'}
                        </Button>
                    </div>
                </form>
            </div>

            {/* MFA Section */}
            <div className="border-t dark:border-gray-700 pt-8">
                <MFASettings />
            </div>
        </div>
    );
};

// MFA Settings Component
const MFASettings = () => {
    const { user } = useAuth();
    const [mfaEnabled, setMfaEnabled] = useState(false);
    const [isEnrolling, setIsEnrolling] = useState(false);
    const [qrCode, setQrCode] = useState(null);
    const [factorId, setFactorId] = useState(null);
    const [verificationCode, setVerificationCode] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isVerifying, setIsVerifying] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [backupCodes, setBackupCodes] = useState([]);
    const [showBackupCodes, setShowBackupCodes] = useState(false);

    // Check if MFA is already enabled
    useEffect(() => {
        checkMFAStatus();
    }, []);

    const checkMFAStatus = async () => {
        try {
            const { data, error } = await supabase.auth.mfa.listFactors();

            if (error) {
                console.error('Error checking MFA status:', error);
                setMessage({ type: 'error', text: 'Failed to check MFA status' });
                return;
            }

            const hasActiveFactor = data?.totp?.length > 0;
            setMfaEnabled(hasActiveFactor);

            if (hasActiveFactor) {
                setFactorId(data.totp[0].id);
            }
        } catch (error) {
            console.error('Error checking MFA status:', error);
            setMessage({ type: 'error', text: 'Failed to check MFA status' });
        } finally {
            setIsLoading(false);
        }
    };

    // Generate 10 random backup codes
    const generateBackupCodes = () => {
        const codes = [];
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

        for (let i = 0; i < 10; i++) {
            let code = '';
            for (let j = 0; j < 8; j++) {
                code += characters.charAt(Math.floor(Math.random() * characters.length));
                if (j === 3) code += '-'; // Add dash in middle: XXXX-XXXX
            }
            codes.push(code);
        }

        return codes;
    };

    // Simple hash function for backup codes (using SubtleCrypto API)
    const hashBackupCode = async (code) => {
        const encoder = new TextEncoder();
        const data = encoder.encode(code);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    };

    // Save backup codes to database
    const saveBackupCodes = async (codes) => {
        try {
            // Delete any existing backup codes for this user
            await supabase
                .from('mfa_backup_codes')
                .delete()
                .eq('user_id', user.id);

            // Hash and save new codes
            const codeRecords = await Promise.all(
                codes.map(async (code) => ({
                    user_id: user.id,
                    code_hash: await hashBackupCode(code),
                    used: false
                }))
            );

            const { error } = await supabase
                .from('mfa_backup_codes')
                .insert(codeRecords);

            if (error) {
                console.error('Error saving backup codes:', error);
                throw error;
            }

            console.log('✅ Backup codes saved successfully');
        } catch (error) {
            console.error('Error saving backup codes:', error);
            throw error;
        }
    };

    const handleEnableMFA = async () => {
        setIsEnrolling(true);
        setMessage({ type: '', text: '' });

        try {
            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp',
                friendlyName: 'Authenticator App'
            });

            if (error) {
                throw error;
            }

            setQrCode(data.totp.qr_code);
            setFactorId(data.id);
            setMessage({
                type: 'info',
                text: 'Scan the QR code with your Microsoft Authenticator app, then enter the 6-digit code below.'
            });
        } catch (error) {
            console.error('Error enrolling MFA:', error);
            setMessage({ type: 'error', text: `Failed to enable MFA: ${error.message}` });
            setIsEnrolling(false);
        }
    };

    const handleVerifyMFA = async (e) => {
        console.log('🔐 FUNCTION CALLED - handleVerifyMFA');
        e.preventDefault();
        setIsVerifying(true);
        setMessage({ type: '', text: '' });

        console.log('🔐 Starting MFA enrollment verification...');
        console.log('🔐 Verification code:', verificationCode);
        console.log('🔐 Factor ID:', factorId);

        if (verificationCode.length !== 6) {
            console.log('🔐 Invalid code length:', verificationCode.length);
            setMessage({ type: 'error', text: 'Please enter a valid 6-digit code' });
            setIsVerifying(false);
            return;
        }

        try {
            // Step 1: Create a challenge
            console.log('🔐 Creating challenge for factor:', factorId);
            const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
                factorId: factorId
            });

            if (challengeError) {
                console.error('🔐 Challenge error:', challengeError);
                throw challengeError;
            }

            console.log('🔐 Challenge created:', challengeData.id);

            // Step 2: Verify the code
            // Note: mfa.verify() triggers an auth state change (MFA_CHALLENGE_VERIFIED)
            console.log('🔐 Verifying code:', verificationCode);

            // Create a promise that resolves when MFA_CHALLENGE_VERIFIED event fires
            const verificationPromise = new Promise((resolve, reject) => {
                const authSubscription = supabase.auth.onAuthStateChange((event, session) => {
                    console.log('🔐 Auth event during verification:', event);
                    if (event === 'MFA_CHALLENGE_VERIFIED') {
                        console.log('🔐 MFA_CHALLENGE_VERIFIED event received!');
                        authSubscription.data.subscription.unsubscribe();
                        resolve(true);
                    }
                });

                // Set a timeout in case the event never fires
                setTimeout(() => {
                    authSubscription.data.subscription.unsubscribe();
                    reject(new Error('Verification timed out waiting for MFA_CHALLENGE_VERIFIED event'));
                }, 10000);
            });

            // Call verify (this will trigger MFA_CHALLENGE_VERIFIED event)
            const verifyPromise = supabase.auth.mfa.verify({
                factorId: factorId,
                challengeId: challengeData.id,
                code: verificationCode
            });

            // Wait for either the verify promise or the event (whichever comes first)
            await Promise.race([verificationPromise, verifyPromise.then(result => {
                if (result.error) {
                    throw result.error;
                }
                console.log('🔐 Verify API call completed');
                return result;
            })]);

            console.log('🔐 Verification successful!');

            // Generate and save backup codes
            console.log('🔐 Generating backup recovery codes...');
            const codes = generateBackupCodes();
            await saveBackupCodes(codes);

            setBackupCodes(codes);
            setShowBackupCodes(true);
            setMessage({ type: 'success', text: 'Two-factor authentication enabled successfully! Please save your backup codes.' });
            setMfaEnabled(true);
            setIsEnrolling(false);
            setQrCode(null);
            setVerificationCode('');

            // Refresh MFA status
            await checkMFAStatus();
        } catch (error) {
            console.error('🔐 MFA verification error:', error);
            setMessage({ type: 'error', text: `Verification failed: ${error.message}` });
        } finally {
            setIsVerifying(false);
        }
    };

    const handleDisableMFA = async () => {
        if (!confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
            return;
        }

        setIsLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const { error } = await supabase.auth.mfa.unenroll({
                factorId: factorId
            });

            if (error) {
                throw error;
            }

            setMessage({ type: 'success', text: 'Two-factor authentication disabled' });
            setMfaEnabled(false);
            setFactorId(null);
        } catch (error) {
            console.error('Error disabling MFA:', error);
            setMessage({ type: 'error', text: `Failed to disable MFA: ${error.message}` });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelEnrollment = () => {
        setIsEnrolling(false);
        setQrCode(null);
        setVerificationCode('');
        setMessage({ type: '', text: '' });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-4">
                <Loader2 className="animate-spin mr-2" size={20} />
                <span>Loading MFA settings...</span>
            </div>
        );
    }

    return (
        <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Shield className="mr-2" size={24} />
                Two-Factor Authentication (2FA)
            </h2>

            {/* Status Message */}
            {message.text && (
                <div className={`mb-4 p-3 rounded-lg ${
                    message.type === 'success' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                    message.type === 'error' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                    'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                }`}>
                    {message.text}
                </div>
            )}

            {/* Current Status */}
            <div className="mb-6 p-4 border rounded-lg dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium">Status: {mfaEnabled ? 'Enabled' : 'Disabled'}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {mfaEnabled
                                ? 'Your account is protected with two-factor authentication'
                                : 'Add an extra layer of security to your account'}
                        </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        mfaEnabled
                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>
                        {mfaEnabled ? '✓ Active' : 'Inactive'}
                    </div>
                </div>
            </div>

            {/* Enrollment Flow */}
            {!mfaEnabled && !isEnrolling && (
                <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Two-factor authentication adds an extra layer of security by requiring a code from your authenticator app in addition to your password when signing in.
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        You'll need an authenticator app like <strong>Microsoft Authenticator</strong>, Google Authenticator, or Authy.
                    </p>
                    <Button onClick={handleEnableMFA}>
                        <Shield className="mr-2" size={16} />
                        Enable Two-Factor Authentication
                    </Button>
                </div>
            )}

            {/* QR Code Display */}
            {isEnrolling && qrCode && (
                <div className="space-y-4">
                    <div className="p-4 border rounded-lg dark:border-gray-600">
                        <h3 className="font-medium mb-2">Step 1: Scan QR Code</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Open Microsoft Authenticator and scan this QR code:
                        </p>
                        <div className="flex justify-center bg-white p-6 rounded-lg">
                            <div
                                className="qr-code-container"
                                style={{ width: '300px', height: '300px' }}
                                dangerouslySetInnerHTML={{ __html: qrCode }}
                            />
                        </div>
                        <style>{`
                            .qr-code-container svg {
                                width: 100% !important;
                                height: 100% !important;
                            }
                        `}</style>
                    </div>

                    <div className="p-4 border rounded-lg dark:border-gray-600">
                        <h3 className="font-medium mb-2">Step 2: Enter Verification Code</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Enter the 6-digit code from your authenticator app:
                        </p>
                        <form onSubmit={handleVerifyMFA} className="space-y-4">
                            <Input
                                type="text"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="000000"
                                maxLength={6}
                                className="text-center text-2xl tracking-widest"
                            />
                            <div className="flex gap-2">
                                <Button type="submit" disabled={isVerifying || verificationCode.length !== 6}>
                                    {isVerifying ? 'Verifying...' : 'Verify and Enable'}
                                </Button>
                                <Button type="button" onClick={handleCancelEnrollment} variant="outline">
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Backup Codes Display */}
            {showBackupCodes && backupCodes.length > 0 && (
                <div className="p-6 border-2 border-orange-500 rounded-lg bg-orange-50 dark:bg-orange-900/20 dark:border-orange-600">
                    <div className="flex items-start mb-4">
                        <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400 mr-3 flex-shrink-0 mt-1" />
                        <div>
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Save Your Backup Codes</h3>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                                These backup codes can be used to access your account if you lose access to your authenticator app.
                            </p>
                            <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">
                                ⚠️ Save these codes now! You won't be able to see them again.
                            </p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
                        <div className="grid grid-cols-2 gap-3">
                            {backupCodes.map((code, index) => (
                                <div key={index} className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded text-center">
                                    {code}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            onClick={() => {
                                const text = `Survey Hub - MFA Backup Codes\n\nGenerated: ${new Date().toLocaleString()}\n\nBackup Codes:\n${backupCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}\n\nEach code can only be used once. Keep these codes in a safe place.`;
                                const blob = new Blob([text], { type: 'text/plain' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = 'surveyhub-backup-codes.txt';
                                a.click();
                                URL.revokeObjectURL(url);
                            }}
                        >
                            <Download className="mr-2" size={16} />
                            Download Codes
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                window.print();
                            }}
                        >
                            Print Codes
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowBackupCodes(false);
                                setBackupCodes([]);
                            }}
                        >
                            I've Saved My Codes
                        </Button>
                    </div>
                </div>
            )}

            {/* Disable MFA */}
            {mfaEnabled && !showBackupCodes && (
                <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Two-factor authentication is currently enabled. You'll be asked for a code from your authenticator app each time you sign in.
                    </p>
                    <Button onClick={handleDisableMFA} variant="outline" className="border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900">
                        <X className="mr-2" size={16} />
                        Disable Two-Factor Authentication
                    </Button>
                </div>
            )}
        </div>
    );
};

const AppearanceSettings = () => {
    const { theme, toggleTheme } = useTheme();
    return (
        <div>
            <h2 className="text-xl font-semibold mb-4">Appearance</h2>
            <div className="flex items-center justify-between p-3 border rounded-lg dark:border-gray-600">
                <p>Theme</p>
                <div className="flex items-center gap-2">
                    <button onClick={theme === 'dark' ? toggleTheme : undefined} className={`px-3 py-1 rounded-md text-sm ${theme === 'light' ? 'bg-orange-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Light</button>
                    <button onClick={theme === 'light' ? toggleTheme : undefined} className={`px-3 py-1 rounded-md text-sm ${theme === 'dark' ? 'bg-orange-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Dark</button>
                </div>
            </div>
        </div>
    );
};

const NotificationSettings = () => {
    const [installPrompt, setInstallPrompt] = useState(null);
    const [isInstalled, setIsInstalled] = useState(false);

    // Separate hooks for device permissions and subscriptions
    const {
        permission,
        requestPermission,
        enableNotifications,
        disableNotifications,
        isLoading: fcmLoading,
        error: fcmError,
        fcmToken
    } = useFcm();

    const {
        isSubscribed,
        isLoading: subscriptionLoading,
        error: subscriptionError,
        enableSubscription
    } = useSubscription();

    // Device permissions status
    const hasDevicePermissions = permission === 'granted' && !!fcmToken;
    const isDeviceBlocked = permission === 'denied';

    // Check if app is installed as PWA
    useEffect(() => {
        setIsInstalled(window.matchMedia('(display-mode: standalone)').matches ||
                      window.navigator.standalone === true);

        // Listen for install prompt
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setInstallPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);


    // Handle device permissions toggle
    const handleDevicePermissionToggle = async () => {
        try {
            if (hasDevicePermissions) {
                // User wants to turn OFF device permissions
                const success = await disableNotifications();
                if (!success) {
                    console.error('Failed to disable device notifications');
                }
            } else {
                // User wants to turn ON device permissions
                const success = await (fcmToken ? enableNotifications() : requestPermission());
                if (!success) {
                    console.error('Failed to enable device notifications');
                }
            }
        } catch (error) {
            console.error('Error toggling device permissions:', error);
        }
    };

    // Handle manual subscription as backup when auto-subscribe fails
    const handleManualSubscribe = async () => {
        try {
            // First, enable device permissions if not already enabled
            if (!hasDevicePermissions) {
                console.log('📱 Requesting device permissions first...');
                const permissionSuccess = await requestPermission();
                if (!permissionSuccess) {
                    console.error('Failed to get device permissions');
                    return;
                }
            }

            // Then, enable the subscription
            console.log('📝 Enabling subscription...');
            const subscriptionSuccess = await enableSubscription();
            if (subscriptionSuccess) {
                console.log('✅ Manual subscription successful');
            } else {
                console.error('❌ Failed to enable subscription');
            }
        } catch (error) {
            console.error('Error during manual subscription:', error);
        }
    };

    const handleInstallApp = async () => {
        if (installPrompt) {
            installPrompt.prompt();
            const { outcome } = await installPrompt.userChoice;
            if (outcome === 'accepted') {
                setInstallPrompt(null);
                setTimeout(() => setIsInstalled(true), 1000);
            }
        }
    };

    return (
        <div>
            <h2 className="text-xl font-semibold mb-4">Notification Settings</h2>
            
            <div className="space-y-6">
                {/* PWA Install Section */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h3 className="font-medium mb-3">📱 Mobile App Experience</h3>
                    {isInstalled ? (
                        <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="font-medium text-green-800 dark:text-green-200">
                                    ✅ App Installed Successfully!
                                </span>
                            </div>
                            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                                You're getting the full mobile app experience with better notifications.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-3">
                                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                                    Get the Mobile App Experience
                                </h4>
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                    Install Survey Hub as an app for better notifications, offline access, and native mobile experience.
                                </p>
                            </div>
                            {installPrompt && (
                                <Button onClick={handleInstallApp} className="w-full">
                                    📱 Install Survey Hub App
                                </Button>
                            )}
                            {!installPrompt && (
                                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                    <p><strong>iPhone:</strong> Tap Share → "Add to Home Screen"</p>
                                    <p><strong>Android:</strong> Tap Menu → "Install app" or "Add to Home screen"</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Push Notifications */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h3 className="font-medium mb-3">🔔 Push Notifications</h3>
                    <div className="space-y-4">
                        {/* Device Permissions Toggle */}
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="block font-medium">Device Permissions</span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    Allow browser to show push notifications
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch
                                    isChecked={hasDevicePermissions}
                                    onToggle={handleDevicePermissionToggle}
                                    disabled={fcmLoading}
                                />
                                {fcmLoading && (
                                    <span className="text-xs text-blue-500">Loading...</span>
                                )}
                                {isDeviceBlocked && (
                                    <span className="text-xs text-red-500">Blocked</span>
                                )}
                                {hasDevicePermissions && (
                                    <span className="text-xs text-green-500">Enabled</span>
                                )}
                                {permission === 'default' && (
                                    <span className="text-xs text-gray-500">Not Set</span>
                                )}
                            </div>
                        </div>

                        {/* Subscription Status */}
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="block font-medium">Notification Subscription</span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    Automatically managed when you log in
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                {subscriptionLoading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-sm text-blue-500">Checking...</span>
                                    </div>
                                ) : (
                                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                                        isSubscribed
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                    }`}>
                                        {isSubscribed ? (
                                            <div className="flex items-center gap-1">
                                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                                Subscribed
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1">
                                                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                                                Not Subscribed
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Manual Subscribe Button - Shows when not subscribed */}
                        {!isSubscribed && !subscriptionLoading && (
                            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-3">
                                <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                                    <strong>Not receiving notifications?</strong> Click below to manually subscribe.
                                </p>
                                <Button
                                    onClick={handleManualSubscribe}
                                    disabled={fcmLoading}
                                    className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                                >
                                    {fcmLoading ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Subscribing...
                                        </div>
                                    ) : (
                                        <>🔔 Subscribe to Notifications</>
                                    )}
                                </Button>
                            </div>
                        )}

                        {/* Information Messages */}
                        {isDeviceBlocked && (
                            <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-lg p-3">
                                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                    <strong>Notifications Blocked:</strong> Please enable notifications in your browser settings and refresh the page.
                                </p>
                            </div>
                        )}

                        {!hasDevicePermissions && isSubscribed && (
                            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-3">
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                    <strong>Note:</strong> You're subscribed but need to enable device permissions to receive notifications.
                                </p>
                            </div>
                        )}

                        {(fcmError || subscriptionError) && (
                            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg p-3">
                                <p className="text-sm text-red-800 dark:text-red-200">
                                    <strong>Error:</strong> {fcmError || subscriptionError}
                                </p>
                            </div>
                        )}

                        {/* Help Text */}
                        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                            <p>• <strong>Device Permissions:</strong> Allows your browser to show notifications</p>
                            <p>• <strong>Subscription:</strong> Automatically created when you log in - shows your current status</p>
                            <p>• Device permissions must be enabled to receive push notifications</p>
                        </div>
                    </div>
                </div>


                {/* PWA Benefits */}
                <div className="bg-gradient-to-r from-orange-50 to-blue-50 dark:from-orange-500/10 dark:to-blue-500/10 border border-orange-200 dark:border-orange-500/20 rounded-lg p-4">
                    <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-2">
                        🚀 Why Install the App?
                    </h4>
                    <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                        <li>• <strong>Better Notifications:</strong> More reliable than browser notifications</li>
                        <li>• <strong>Faster Loading:</strong> App loads instantly from your home screen</li>
                        <li>• <strong>Offline Access:</strong> View cached content without internet</li>
                        <li>• <strong>Full Screen:</strong> No browser bars, just your app</li>
                        <li>• <strong>Native Feel:</strong> Feels like a real mobile app</li>
                    </ul>
                </div>
            </div>

        </div>
    );
};

const ProjectDetailPage = ({ project, onBack }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const { updateProject } = useProjects();
    const { user } = useAuth();
    const privileges = userPrivileges[user.privilege];

    const tabs = [
        { id: 'overview', label: 'Survey Brief' },
        { id: 'site_info', label: 'Site Information' },
        { id: 'files', label: 'Files' },
    ];

    return (
        <div className="p-4 md:p-6">
            <button onClick={onBack} className="flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-orange-500 mb-4">
                <ChevronLeft size={16} className="mr-1"/>
                Back to Projects
            </button>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{project.project_name}</h1>
                    <p className="text-gray-500 dark:text-gray-400">{project.project_number} - {project.client}</p>
                </div>
            </div>
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-6">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`py-3 px-1 border-b-2 text-sm font-medium ${activeTab === tab.id ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'}`}>
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>
            <div className="mt-6">
                {activeTab === 'overview' && <ProjectOverview project={project} onUpdate={updateProject} />}
                {activeTab === 'files' && <ProjectFiles projectId={project.id} />}
                {activeTab === 'site_info' && <ProjectSiteInformation project={project} onUpdate={updateProject} canEdit={privileges.canEditSiteInformation} />}
            </div>
        </div>
    );
};

const ProjectOverview = ({ project, onUpdate }) => {
    const { can } = usePermissions();
    const canEditBrief = can('EDIT_SURVEY_BRIEF');
    const canEmailBrief = can('EMAIL_SURVEY_BRIEF');
    const canDownloadPDF = can('DOWNLOAD_SURVEY_BRIEF_PDF');

    const [isEditing, setIsEditing] = useState(false);
    const [items, setItems] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
    const [fullScreenImage, setFullScreenImage] = useState(null);
    const photoInputRefs = useRef({});
    const { addToast } = useToast(); // Assuming useToast is available in this scope

    // Initialize and migrate data
    useEffect(() => {
        const rawItems = project.survey_brief_items || [];
        const migratedItems = rawItems.map(item => {
            if (item.type === 'photo' && !item.photos) {
                // Migrate legacy single photo to array
                return {
                    ...item,
                    photos: item.url ? [{ id: Date.now(), url: item.url, title: item.title }] : []
                };
            }
            return item;
        });
        setItems(migratedItems);
    }, [project]);

    const handleSave = () => {
        onUpdate({ ...project, survey_brief_items: items });
        setIsEditing(false);
    };

    const addItem = (type, title = '') => {
        const newItem = {
            id: Date.now().toString(),
            type,
            title: title || getTypeDefaultTitle(type),
            content: '',
            photos: [] // Initialize empty photos array for all types, used if type is 'photo'
        };
        setItems(prev => [...prev, newItem]);
        setIsAddMenuOpen(false);
    };

    const getTypeDefaultTitle = (type) => {
        switch (type) {
            case 'meeting_times': return 'Meeting Times & Contacts';
            case 'track_detail': return 'Track Detail';
            case 'equipment': return 'Equipment';
            case 'miscellaneous': return 'Miscellaneous';
            case 'photo': return 'Photo Box';
            default: return 'New Section';
        }
    };

    const updateItem = (id, field, value) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const removeItem = (id) => {
        setItems(prev => prev.filter(item => item.id !== id));
    };

    const moveItem = (index, direction) => {
        if ((direction === -1 && index === 0) || (direction === 1 && index === items.length - 1)) return;
        const newItems = [...items];
        [newItems[index], newItems[index + direction]] = [newItems[index + direction], newItems[index]];
        setItems(newItems);
    };

    const handlePhotoUpload = async (event, itemId) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${project.id}_sb_${itemId}_${Date.now()}.${fileExt}`;
            const filePath = `survey-brief-photos/${fileName}`;

            const { data, error } = await supabase.storage
                .from('project-files')
                .upload(filePath, file);

            if (error) throw error;

            const { data: publicUrlData } = supabase.storage
                .from('project-files')
                .getPublicUrl(filePath);

            const newPhoto = {
                id: Date.now().toString(),
                url: publicUrlData.publicUrl,
                title: file.name
            };

            setItems(prev => prev.map(item => {
                if (item.id === itemId) {
                    return { ...item, photos: [...(item.photos || []), newPhoto] };
                }
                return item;
            }));

            alert('Photo uploaded successfully!');
        } catch (error) {
            console.error('Error uploading photo:', error);
            alert('Error uploading photo: ' + error.message);
        } finally {
            setUploading(false);
            if (photoInputRefs.current[itemId]) {
                photoInputRefs.current[itemId].value = '';
            }
        }
    };

    const removePhoto = (itemId, photoId) => {
        if (!confirm('Are you sure you want to remove this photo?')) return;
        setItems(prev => prev.map(item => {
            if (item.id === itemId) {
                return { ...item, photos: item.photos.filter(p => p.id !== photoId) };
            }
            return item;
        }));
    };

    // Helper function to convert HTML to plain text
    const htmlToPlainText = (html) => {
        if (!html) return '';
        const doc = new DOMParser().parseFromString(html, 'text/html');
        // Replace list items with bullet points or numbers
        doc.querySelectorAll('li').forEach(li => {
            if (li.parentNode.nodeName === 'OL') {
                li.textContent = `${Array.from(li.parentNode.children).indexOf(li) + 1}. ${li.textContent}`;
            } else if (li.parentNode.nodeName === 'UL') {
                li.textContent = `• ${li.textContent}`;
            }
        });
        // Add new lines for block elements like p, div, br
        doc.querySelectorAll('p, div, br').forEach(el => {
            el.insertAdjacentText('afterend', '\n');
        });

        return doc.body.textContent
            .replace(/(\n\s*){3,}/g, '\n\n') // Remove excessive newlines
            .trim();
    };

    const getSubject = () => {
        return `${project.project_number} - ${project.project_name} - Survey Brief`;
    };

    const generatePlainTextBody = () => {
        let body = `SURVEY BRIEF\n`;
        body += `Project: ${project.project_name}\n`;
        body += `Number: ${project.project_number}\n\n`;

        items.forEach(item => {
            body += `--- ${item.title.toUpperCase()} ---\n\n`;
            if (item.type === 'photo') {
                if (item.photos && item.photos.length > 0) {
                    item.photos.forEach(photo => {
                        body += `[Photo: ${photo.title || 'Untitled'}]\nLink: ${photo.url}\n\n`;
                    });
                } else {
                    body += "No photos.\n\n";
                }
            } else {
                body += `${htmlToPlainText(item.content)}\n\n`;
            }
        });
        return body;
    };

    const generateHtmlBody = () => {
        let html = `<div style="font-family: Arial, sans-serif; color: #333;">`;
        html += `<h1 style="color: #f97316;">Survey Brief</h1>`;
        html += `<p style="margin-bottom: 5px;"><strong>Project:</strong> ${project.project_name}</p>`;
        html += `<p style="margin-bottom: 20px;"><strong>Number:</strong> ${project.project_number}</p><hr style="border: 0; border-top: 1px solid #eee; margin-bottom: 20px;" />`;

        items.forEach(item => {
            html += `<h2 style="color: #444; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 20px;">${item.title}</h2>`;
            if (item.type === 'photo') {
                if (item.photos && item.photos.length > 0) {
                    html += `<div>`;
                    item.photos.forEach(photo => {
                        html += `
                            <div style="display: inline-block; margin: 10px; vertical-align: top; width: 300px;">
                                <img src="${photo.url}" alt="${photo.title}" width="300" style="width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px;" />
                            </div>
                        `;
                    });
                    html += `</div>`;
                } else {
                    html += `<p><em>No photos.</em></p>`;
                }
            } else {
                html += `<div>${item.content}</div>`;
            }
        });
        html += `</div>`;
        return html;
    };

    const handleDownloadPDF = async () => {
        try {
            addToast({ message: 'Generating PDF...', type: 'info' });
            
            // Create a temporary container for the HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = generateHtmlBody();
            tempDiv.style.width = '794px'; // A4 width at 96 DPI
            tempDiv.style.padding = '40px';
            tempDiv.style.background = 'white';
            tempDiv.style.position = 'absolute';
            tempDiv.style.left = '-9999px';
            tempDiv.style.top = '0';
            
            // Ensure images load
            const images = tempDiv.getElementsByTagName('img');
            const imagePromises = Array.from(images).map(img => {
                img.crossOrigin = "Anonymous"; 
                return new Promise((resolve) => {
                    if (img.complete) resolve();
                    else {
                        img.onload = resolve;
                        img.onerror = resolve;
                    }
                });
            });

            document.body.appendChild(tempDiv);
            await Promise.all(imagePromises);

            const canvas = await html2canvas(tempDiv, {
                scale: 2, 
                useCORS: true,
                logging: false
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const imgWidth = pdfWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pdfHeight;
            }

            pdf.save(`${project.project_number} - Survey Brief.pdf`);
            document.body.removeChild(tempDiv);
            addToast({ message: 'PDF downloaded successfully.', type: 'success' });

        } catch (error) {
            console.error('Error generating PDF:', error);
            addToast({ message: 'Failed to generate PDF.', type: 'error' });
        }
    };

    const handleShareAction = async (type) => {
        const subject = getSubject();
        const plainBody = generatePlainTextBody();

        if (type === 'copy') {
            try {
                const htmlBody = generateHtmlBody();
                const blobHtml = new Blob([htmlBody], { type: 'text/html' });
                const blobText = new Blob([plainBody], { type: 'text/plain' });
                
                const clipboardItem = new ClipboardItem({
                    'text/html': blobHtml,
                    'text/plain': blobText
                });

                await navigator.clipboard.write([clipboardItem]);
                alert('Survey Brief copied to clipboard! You can now paste it into your email.');
                setIsShareModalOpen(false);
            } catch (err) {
                console.error('Failed to copy:', err);
                alert('Failed to copy to clipboard.');
            }
        } else if (type === 'mailto') {
            try {
                const htmlBody = generateHtmlBody();
                const boundary = "boundary_" + Date.now().toString(16);
                
                // 1. Start EML content with headers
                let emlContent = `Subject: ${subject}
Cc: Survey_Brief@inorail.co.uk
X-Unsent: 1
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="${boundary}"

--${boundary}
Content-Type: text/html; charset=utf-8

<!DOCTYPE html>
<html>
<body>
${htmlBody}
</body>
</html>
`;

                // 2. Fetch and attach project files
                addToast({ message: 'Generating email draft with attachments...', type: 'info' });
                
                const { data: files } = await supabase.storage
                    .from('project-files')
                    .list(`project-${project.id}`);

                if (files && files.length > 0) {
                    for (const file of files) {
                        try {
                            const { data: fileData } = await supabase.storage
                                .from('project-files')
                                .download(`project-${project.id}/${file.name}`);

                            if (fileData) {
                                // Convert blob to base64
                                const buffer = await fileData.arrayBuffer();
                                let binary = '';
                                const bytes = new Uint8Array(buffer);
                                for (let i = 0; i < bytes.byteLength; i++) {
                                    binary += String.fromCharCode(bytes[i]);
                                }
                                const base64 = btoa(binary);
                                
                                // Format base64 to 76 chars per line (MIME standard)
                                const formattedBase64 = base64.match(/.{1,76}/g).join('\r\n');

                                // Determine generic content type based on extension
                                const ext = file.name.split('.').pop().toLowerCase();
                                let contentType = 'application/octet-stream';
                                if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) contentType = `image/${ext}`;
                                else if (ext === 'pdf') contentType = 'application/pdf';
                                else if (['doc', 'docx'].includes(ext)) contentType = 'application/msword';
                                else if (['xls', 'xlsx'].includes(ext)) contentType = 'application/vnd.ms-excel';

                                // Get original file name by stripping the prefix
                                const originalFileName = file.name.includes('_')
                                    ? file.name.substring(file.name.indexOf('_') + 1)
                                    : file.name;

                                // Add attachment part
                                emlContent += `
--${boundary}
Content-Type: ${contentType}; name="${originalFileName}"
Content-Transfer-Encoding: base64
Content-Disposition: attachment; filename="${originalFileName}"

${formattedBase64}
`;
                            }
                        } catch (fileErr) {
                            console.error(`Failed to attach file ${file.name}:`, fileErr);
                        }
                    }
                }

                // 3. Close multipart
                emlContent += `\n--${boundary}--`;

                const blob = new Blob([emlContent], { type: 'message/rfc822' });
                const url = URL.createObjectURL(blob);
                
                const link = document.createElement('a');
                link.href = url;
                link.download = `${project.project_number} - Survey Brief.eml`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                addToast({ message: 'Outlook draft generated with attachments.', type: 'success' });
            } catch (err) {
                console.error('Failed to generate email:', err);
                alert('Failed to generate email draft.');
            }
            setIsShareModalOpen(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-end gap-2 mb-4">
                <div className="flex gap-2">
                    {canEditBrief && (
                        isEditing ? (
                            <>
                                <Button variant="outline" onClick={() => { setIsEditing(false); setItems(project.survey_brief_items || []); }}>Cancel</Button>
                                <Button onClick={handleSave}>Save Changes</Button>
                            </>
                        ) : (
                            <Button variant="outline" onClick={() => setIsEditing(true)}>Edit Brief</Button>
                        )
                    )}
                    {canEmailBrief && (
                        <Button variant="outline" onClick={() => handleShareAction('mailto')} title="Download Survey Brief Email">
                            <Mail size={16} className="mr-2" /> Email Brief
                        </Button>
                    )}
                    {canDownloadPDF && (
                        <Button variant="outline" onClick={handleDownloadPDF} title="Download Survey Brief as PDF">
                            <FileText size={16} className="mr-2" /> Download PDF
                        </Button>
                    )}
                </div>

                {isEditing && (
                    <div className="relative">
                        <Button variant="outline" onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}>
                            <PlusCircle size={16} className="mr-2" /> Add Item
                        </Button>
                        {isAddMenuOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 py-1">
                                <button onClick={() => addItem('meeting_times')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">Meeting Times & Contacts</button>
                                <button onClick={() => addItem('track_detail')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">Track Detail</button>
                                <button onClick={() => addItem('equipment')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">Equipment</button>
                                <button onClick={() => addItem('miscellaneous')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">Miscellaneous</button>
                                <button onClick={() => addItem('photo')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">Photo Box</button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="space-y-6">
                {items.map((item, index) => (
                    <div key={item.id} className={
                        `bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 relative group ` +
                        (item.type === 'photo' && !isEditing ? 'w-fit max-w-full' : 'w-full')
                    }>
                        {isEditing && (
                            <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <button onClick={() => moveItem(index, -1)} disabled={index === 0} className="p-1 text-gray-500 hover:text-orange-500 disabled:opacity-30"><ArrowUp size={16} /></button>
                                <button onClick={() => moveItem(index, 1)} disabled={index === items.length - 1} className="p-1 text-gray-500 hover:text-orange-500 disabled:opacity-30"><ArrowDown size={16} /></button>
                                <button onClick={() => removeItem(item.id)} className="p-1 text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                            </div>
                        )}

                        {item.type === 'photo' ? (
                            <div className="flex flex-col">
                                {isEditing ? (
                                    <Input value={item.title} onChange={(e) => updateItem(item.id, 'title', e.target.value)} className="font-semibold mb-4 text-center" />
                                ) : (
                                    <h3 className="font-semibold mb-4 text-center">{item.title}</h3>
                                )}
                                <div className={
                                    `border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-900 w-full`
                                }>
                                    <div className="flex flex-wrap gap-4 justify-start">
                                        {(item.photos || []).map(photo => (
                                            <div key={photo.id} className="relative group/photo">
                                                <div onClick={() => setFullScreenImage({ url: photo.url, title: photo.title })} className="cursor-pointer">
                                                    <img src={photo.url} alt={photo.title} className="h-40 w-auto object-cover rounded-md shadow-sm hover:shadow-md transition-shadow" />
                                                </div>
                                                {isEditing && (
                                                    <button 
                                                        onClick={() => removePhoto(item.id, photo.id)}
                                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover/photo:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
                                                        title="Remove photo"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        
                                        {isEditing && (
                                            <div className="h-40 w-40 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer" onClick={() => photoInputRefs.current[item.id]?.click()}>
                                                <div className="text-center text-gray-400">
                                                    {uploading ? <Loader2 size={24} className="mx-auto mb-2 animate-spin" /> : <PlusCircle size={24} className="mx-auto mb-2" />}
                                                    <span className="text-xs">Add Photo</span>
                                                </div>
                                                <input ref={el => photoInputRefs.current[item.id] = el} type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, item.id)} disabled={uploading} />
                                            </div>
                                        )}
                                    </div>
                                    
                                    {(item.photos || []).length === 0 && !isEditing && (
                                        <div className="text-center text-gray-400 py-8">
                                            <ImageIcon size={48} className="mx-auto mb-2 opacity-50" />
                                            <p>No photos added</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div>
                                {isEditing && item.type === 'miscellaneous' ? (
                                    <Input value={item.title} onChange={(e) => updateItem(item.id, 'title', e.target.value)} className="font-semibold mb-4" />
                                ) : (
                                    <h3 className="font-semibold mb-4">{item.title}</h3>
                                )}
                                {isEditing ? (
                                    <RichTextEditor value={item.content} onChange={(html) => updateItem(item.id, 'content', html)} placeholder="Enter details..." />
                                ) : (
                                    <div 
                                        className="text-sm text-gray-700 dark:text-gray-300 prose dark:prose-invert max-w-none"
                                        dangerouslySetInnerHTML={{ __html: item.content || '<p>No information added.</p>' }}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                ))}
                
                {items.length === 0 && !isEditing && (
                    <div className="text-center py-12 text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                        <p>No survey brief items added yet.</p>
                    </div>
                )}
            </div>

            {fullScreenImage && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4" onClick={() => setFullScreenImage(null)}>
                    <button onClick={() => setFullScreenImage(null)} className="absolute top-4 right-4 text-white hover:text-gray-300"><X size={32} /></button>
                    <img src={fullScreenImage.url} alt={fullScreenImage.title} className="max-w-full max-h-[90vh] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
                </div>
            )}
        </div>
    );
};



const ProjectFiles = ({ projectId }) => {
    const { canDownloadFiles, canUploadDocuments, canDeleteDocuments } = usePermissions();
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [fileToDelete, setFileToDelete] = useState(null);
    const fileInputRef = useRef(null);

    const getFileIcon = (fileName) => {
        const extension = fileName.split('.').pop().toLowerCase();
        switch (extension) {
            case 'xlsx':
            case 'xls':
            case 'csv':
                return <FileSpreadsheet className="text-green-500" />;
            case 'pdf':
                return <FileText className="text-red-500" />;
            case 'dwg':
            case 'dxf':
            case 'ppt':
            case 'pptx':
                return <Presentation className="text-blue-500" />;
            case 'zip':
            case 'rar':
                return <Archive className="text-yellow-500" />;
            default:
                return <File className="text-gray-500" />;
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const fetchFiles = async () => {
        try {
            const { data, error } = await supabase.storage
                .from('project-files')
                .list(`project-${projectId}`, {
                    limit: 100,
                    offset: 0,
                    sortBy: { column: 'created_at', order: 'desc' }
                });

            if (error) {
                console.error('Error fetching files:', error);
                return;
            }

            const filesWithDetails = data.map(file => {
                // Extract original filename by removing timestamp prefix (format: timestamp_originalname)
                const originalName = file.name.includes('_')
                    ? file.name.substring(file.name.indexOf('_') + 1)
                    : file.name;

                return {
                    id: file.id,
                    name: originalName,
                    storageName: file.name, // Keep the storage name for downloads
                    size: formatFileSize(file.metadata?.size || 0),
                    uploaded: new Date(file.created_at).toLocaleDateString(),
                    fullPath: `project-${projectId}/${file.name}`
                };
            });

            setFiles(filesWithDetails);
        } catch (error) {
            console.error('Error fetching files:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFiles();
    }, [projectId]);

    const handleFileUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${file.name}`;
            const filePath = `project-${projectId}/${fileName}`;

            const { data, error } = await supabase.storage
                .from('project-files')
                .upload(filePath, file);

            if (error) {
                alert('Error uploading file: ' + error.message);
                return;
            }

            await fetchFiles();
            alert('File uploaded successfully!');
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Error uploading file');
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDownload = async (file) => {
        try {
            const { data, error } = await supabase.storage
                .from('project-files')
                .download(file.fullPath);

            if (error) {
                alert('Error downloading file: ' + error.message);
                return;
            }

            const url = URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading file:', error);
            alert('Error downloading file');
        }
    };

    const handleOpen = async (file) => {
        try {
            // Get the public URL for the file (bucket is public)
            const { data } = supabase.storage
                .from('project-files')
                .getPublicUrl(file.fullPath);

            if (!data?.publicUrl) {
                alert('Error: Could not generate file URL');
                return;
            }

            // Check if it's a KML file and open in Google Earth Web
            const extension = file.name.split('.').pop().toLowerCase();
            if (extension === 'kml' || extension === 'kmz') {
                // Open KML/KMZ files in Google Earth Web
                const googleEarthUrl = `https://earth.google.com/web/@0,0,0a,22251752.77375655d,35y,0h,0t,0r/data=CgRCAggB?url=${encodeURIComponent(data.publicUrl)}`;
                window.open(googleEarthUrl, '_blank');
            } else {
                // Open other files directly - browser will handle inline display
                window.open(data.publicUrl, '_blank');
            }
        } catch (error) {
            console.error('Error opening file:', error);
            alert('Error opening file');
        }
    };

    const handleDeleteClick = (file) => {
        setFileToDelete(file);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!fileToDelete) return;

        try {
            const { error } = await supabase.storage
                .from('project-files')
                .remove([fileToDelete.fullPath]);

            if (error) {
                alert('Error deleting file: ' + error.message);
                return;
            }

            await fetchFiles();
            alert('File deleted successfully!');
        } catch (error) {
            console.error('Error deleting file:', error);
            alert('Error deleting file');
        } finally {
            setIsDeleteModalOpen(false);
            setFileToDelete(null);
        }
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                <div className="p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                    <p>Loading files...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
            <div className="p-4 flex justify-between items-center border-b dark:border-gray-700">
                <h3 className="font-semibold">Project Files</h3>
                {canUploadDocuments && (
                    <div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={uploading}
                        />
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                        >
                            {uploading ? (
                                <><Loader2 size={16} className="mr-2 animate-spin" />Uploading...</>
                            ) : (
                                <><Upload size={16} className="mr-2" />Upload File</>
                            )}
                        </Button>
                    </div>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th className="px-4 py-2 text-left">Name</th>
                            <th className="px-4 py-2 text-left">Size</th>
                            <th className="px-4 py-2 text-left">Uploaded</th>
                            <th className="px-4 py-2 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {files.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                    No files uploaded yet. Click "Upload File" to add your first file.
                                </td>
                            </tr>
                        ) : (
                            files.map(file => (
                                <tr key={file.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600/20">
                                    <td className="px-4 py-3 flex items-center">
                                        {getFileIcon(file.name)}
                                        <span className="ml-3 font-medium">{file.name}</span>
                                    </td>
                                    <td className="px-4 py-3">{file.size}</td>
                                    <td className="px-4 py-3">{file.uploaded}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-center space-x-1">
                                            {canDownloadFiles && (
                                                <>
                                                    <button
                                                        onClick={() => handleOpen(file)}
                                                        className="p-1.5 text-gray-500 hover:text-blue-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                                                        title="Open file"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownload(file)}
                                                        className="p-1.5 text-gray-500 hover:text-green-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                                                        title="Download file"
                                                    >
                                                        <Download size={16} />
                                                    </button>
                                                </>
                                            )}
                                            {canDeleteDocuments && (
                                                <button
                                                    onClick={() => handleDeleteClick(file)}
                                                    className="p-1.5 text-gray-500 hover:text-red-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                                                    title="Delete file"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                            {!canDownloadFiles && !canDeleteDocuments && (
                                                <span className="text-xs text-gray-400 dark:text-gray-500">No access</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Confirm File Deletion"
                message={`Are you sure you want to delete "${fileToDelete?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                confirmVariant="danger"
            />
        </div>
    );
};

const ProjectSiteInformation = ({ project, onUpdate, canEdit }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        ...project,
        site_info_sections: project.site_info_sections || [],
        site_info_photos: project.site_info_photos || []
    });
    const [uploading, setUploading] = useState(false);
    const [fullScreenImage, setFullScreenImage] = useState(null);
    const [isAddSectionMenuOpen, setIsAddSectionMenuOpen] = useState(false);
    const photoInputRefs = useRef({});

    // Dropdown options state
    const [chainageRefOptions, setChainageRefOptions] = useState([]);

    useEffect(() => {
        setFormData({
            ...project,
            site_info_sections: project.site_info_sections || [],
            site_info_photos: project.site_info_photos || []
        });
    }, [project]);

    // Fetch dropdown options for Chainage Reference
    useEffect(() => {
        const fetchChainageRefOptions = async () => {
            try {
                // First get the category ID
                const { data: categoryData, error: categoryError } = await supabase
                    .from('dropdown_categories')
                    .select('id')
                    .eq('name', 'chainage_reference') // Changed to lowercase matches DB
                    .single();

                if (categoryError || !categoryData) return;

                // Then get the items
                const { data: itemsData, error: itemsError } = await supabase
                    .from('dropdown_items')
                    .select('value') // Changed from label to value
                    .eq('category_id', categoryData.id)
                    .eq('is_active', true)
                    .order('sort_order', { ascending: true });

                if (itemsData) {
                    setChainageRefOptions(itemsData.map(item => item.value));
                }
            } catch (error) {
                console.error('Error fetching chainage reference options:', error);
            }
        };

        fetchChainageRefOptions();
    }, []);

    const handleSave = () => {
        onUpdate(formData);
        setIsEditing(false);
    };

    // Section management
    const addSection = (type) => {
        const newSection = {
            id: Date.now().toString(),
            type,
            order: formData.site_info_sections.length,
            data: getSectionDefaultData(type)
        };
        setFormData(prev => ({
            ...prev,
            site_info_sections: [...prev.site_info_sections, newSection]
        }));
        setIsAddSectionMenuOpen(false);
    };

    const getSectionDefaultData = (type) => {
        switch (type) {
            case 'site_location':
                return { postcode: '', google_maps_link: '', what3words_link: '' };
            case 'chainage_reference':
                return { datum_type: '', datum_miles: '', datum_yards: '', datum_km: '', datum_m: '' };
            case 'site_mileage':
                return { elr: '', start_miles: '', start_yards: '', end_miles: '', end_yards: '' };
            case 'site_chainage':
                return { elr: '', start_km: '', start_m: '', end_km: '', end_m: '' };
            case 'track_information':
                return { tracks: [{ elr: '', track_id: '', isDesign: false }] };
            case 'non_track_works':
                return { title: 'Miscellaneous', notes: '' };
            default:
                return {};
        }
    };

    const removeSection = (sectionId) => {
        setFormData(prev => ({
            ...prev,
            site_info_sections: prev.site_info_sections.filter(s => s.id !== sectionId)
        }));
    };

    const moveSectionUp = (index) => {
        if (index === 0) return;
        const newSections = [...formData.site_info_sections];
        [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
        setFormData(prev => ({ ...prev, site_info_sections: newSections }));
    };

    const moveSectionDown = (index) => {
        if (index === formData.site_info_sections.length - 1) return;
        const newSections = [...formData.site_info_sections];
        [newSections[index + 1], newSections[index]] = [newSections[index], newSections[index + 1]];
        setFormData(prev => ({ ...prev, site_info_sections: newSections }));
    };

    const updateSectionData = (sectionId, field, value) => {
        setFormData(prev => ({
            ...prev,
            site_info_sections: prev.site_info_sections.map(section =>
                section.id === sectionId
                    ? { ...section, data: { ...section.data, [field]: value } }
                    : section
            )
        }));
    };

    // Track management within track_information sections
    const addTrackToSection = (sectionId) => {
        setFormData(prev => ({
            ...prev,
            site_info_sections: prev.site_info_sections.map(section =>
                section.id === sectionId
                    ? {
                        ...section,
                        data: {
                            ...section.data,
                            tracks: [...(section.data.tracks || []), { elr: '', track_id: '', isDesign: false }]
                        }
                    }
                    : section
            )
        }));
    };

    const removeTrackFromSection = (sectionId, trackIndex) => {
        setFormData(prev => ({
            ...prev,
            site_info_sections: prev.site_info_sections.map(section =>
                section.id === sectionId
                    ? {
                        ...section,
                        data: {
                            ...section.data,
                            tracks: section.data.tracks.filter((_, i) => i !== trackIndex)
                        }
                    }
                    : section
            )
        }));
    };

    const updateTrackInSection = (sectionId, trackIndex, field, value) => {
        setFormData(prev => ({
            ...prev,
            site_info_sections: prev.site_info_sections.map(section =>
                section.id === sectionId
                    ? {
                        ...section,
                        data: {
                            ...section.data,
                            tracks: section.data.tracks.map((track, i) =>
                                i === trackIndex ? { ...track, [field]: value } : track
                            )
                        }
                    }
                    : section
            )
        }));
    };

    // Photo box management
    const addPhotoBox = () => {
        const newPhoto = {
            id: Date.now().toString(),
            title: `Photo ${formData.site_info_photos.length + 1}`,
            url: '',
            order: formData.site_info_photos.length
        };
        setFormData(prev => ({
            ...prev,
            site_info_photos: [...prev.site_info_photos, newPhoto]
        }));
    };

    const removePhotoBox = async (photoId) => {
        // Find the photo to see if we need to delete a file
        const photoToRemove = formData.site_info_photos.find(p => p.id === photoId);
        
        if (photoToRemove && photoToRemove.url) {
            try {
                // Extract the file path from the URL
                const urlParts = photoToRemove.url.split('/');
                const fileName = urlParts[urlParts.length - 1];
                const filePath = `site-info-photos/${fileName}`;
                
                const { error } = await supabase.storage
                    .from('project-files')
                    .remove([filePath]);
                    
                if (error) {
                    console.error('Error deleting photo file:', error);
                }
            } catch (err) {
                console.error('Exception deleting photo file:', err);
            }
        }

        setFormData(prev => ({
            ...prev,
            site_info_photos: prev.site_info_photos.filter(p => p.id !== photoId)
        }));
    };

    const updatePhotoTitle = (photoId, title) => {
        setFormData(prev => ({
            ...prev,
            site_info_photos: prev.site_info_photos.map(photo =>
                photo.id === photoId ? { ...photo, title } : photo
            )
        }));
    };

    const handlePhotoUpload = async (event, photoId) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${project.id}_${photoId}_${Date.now()}.${fileExt}`;
            const filePath = `site-info-photos/${fileName}`;

            const { data, error } = await supabase.storage
                .from('project-files')
                .upload(filePath, file);

            if (error) {
                alert('Error uploading photo: ' + error.message);
                return;
            }

            const { data: publicUrlData } = supabase.storage
                .from('project-files')
                .getPublicUrl(filePath);

            setFormData(prev => ({
                ...prev,
                site_info_photos: prev.site_info_photos.map(photo =>
                    photo.id === photoId ? { ...photo, url: publicUrlData.publicUrl } : photo
                )
            }));

            alert('Photo uploaded successfully!');
        } catch (error) {
            console.error('Error uploading photo:', error);
            alert('Error uploading photo');
        } finally {
            setUploading(false);
            if (photoInputRefs.current[photoId]) {
                photoInputRefs.current[photoId].value = '';
            }
        }
    };

    const renderSection = (section, index) => {
        const { id, type, data } = section;

        const sectionTitles = {
            site_location: 'Site Location',
            chainage_reference: 'Chainage Reference',
            site_mileage: 'Site Mileage',
            site_chainage: 'Site Chainage',
            track_information: 'Track Information',
            non_track_works: 'Miscellaneous'
        };

        const getSectionTitle = () => {
            if (type === 'non_track_works' && data.title) {
                return data.title;
            }
            return sectionTitles[type];
        };

        return (
            <div key={id} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{getSectionTitle()}</h3>
                        {isEditing && (
                            <div className="flex items-center gap-1 ml-2">
                                <button
                                    onClick={() => moveSectionUp(index)}
                                    disabled={index === 0}
                                    className={`p-1 rounded-full ${index === 0 ? 'text-gray-300 dark:text-gray-600' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-orange-500'}`}
                                    title="Move Up"
                                >
                                    <ArrowUp size={16} />
                                </button>
                                <button
                                    onClick={() => moveSectionDown(index)}
                                    disabled={index === formData.site_info_sections.length - 1}
                                    className={`p-1 rounded-full ${index === formData.site_info_sections.length - 1 ? 'text-gray-300 dark:text-gray-600' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-orange-500'}`}
                                    title="Move Down"
                                >
                                    <ArrowDown size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                    {isEditing && (
                        <button
                            onClick={() => removeSection(id)}
                            className="text-red-500 hover:text-red-700"
                            title="Remove section"
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>
                {renderSectionContent(section)}
            </div>
        );
    };

    const convertDatumValues = (sectionId, direction) => {
        setFormData(prev => ({
            ...prev,
            site_info_sections: prev.site_info_sections.map(section => {
                if (section.id !== sectionId) return section;

                const { datum_miles, datum_yards, datum_km, datum_m } = section.data;
                let newData = { ...section.data };

                if (direction === 'to_km') {
                    // Convert Miles/Yards to Km/M
                    const totalYards = (parseFloat(datum_miles) || 0) * 1760 + (parseFloat(datum_yards) || 0);
                    const totalMeters = totalYards * 0.9144;
                    newData.datum_km = Math.floor(totalMeters / 1000).toString();
                    newData.datum_m = (totalMeters % 1000).toFixed(3).toString();
                } else {
                    // Convert Km/M to Miles/Yards
                    const totalMeters = (parseFloat(datum_km) || 0) * 1000 + (parseFloat(datum_m) || 0);
                    const totalYards = totalMeters * 1.09361;
                    newData.datum_miles = Math.floor(totalYards / 1760).toString();
                    newData.datum_yards = Math.round(totalYards % 1760).toString();
                }

                return { ...section, data: newData };
            })
        }));
    };

    const convertChainageToMileage = (sectionId) => {
        // Find the first site_chainage section to use as source
        const chainageSection = formData.site_info_sections.find(s => s.type === 'site_chainage');
        
        if (!chainageSection) {
            alert('No Site Chainage section found to convert from.');
            return;
        }
        
        const { start_km, start_m, end_km, end_m, elr } = chainageSection.data;
        
        // Helper to convert km.m to yards
        const convertToYards = (km, m) => {
            const totalMeters = (parseFloat(km) || 0) * 1000 + (parseFloat(m) || 0);
            return totalMeters * 1.09361;
        };
        
        const startTotalYards = convertToYards(start_km, start_m);
        const endTotalYards = convertToYards(end_km, end_m);
        
        const newData = {
            elr: elr || '',
            start_miles: Math.floor(startTotalYards / 1760).toString(),
            start_yards: Math.round(startTotalYards % 1760).toString(),
            end_miles: Math.floor(endTotalYards / 1760).toString(),
            end_yards: Math.round(endTotalYards % 1760).toString()
        };
        
        setFormData(prev => ({
            ...prev,
            site_info_sections: prev.site_info_sections.map(section =>
                section.id === sectionId
                    ? { ...section, data: newData }
                    : section
            )
        }));
    };

    const convertMileageToChainage = (sectionId) => {
        // Find the first site_mileage section to use as source
        const mileageSection = formData.site_info_sections.find(s => s.type === 'site_mileage');
        
        if (!mileageSection) {
            alert('No Site Mileage section found to convert from.');
            return;
        }
        
        const { start_miles, start_yards, end_miles, end_yards, elr } = mileageSection.data;
        
        // Helper to convert miles.yards to meters
        const convertToMeters = (miles, yards) => {
            const totalYards = (parseFloat(miles) || 0) * 1760 + (parseFloat(yards) || 0);
            return totalYards * 0.9144;
        };
        
        const startMeters = convertToMeters(start_miles, start_yards);
        const endMeters = convertToMeters(end_miles, end_yards);
        
        const newData = {
            elr: elr || '',
            start_km: Math.floor(startMeters / 1000).toString(),
            start_m: Math.round(startMeters % 1000).toString(),
            end_km: Math.floor(endMeters / 1000).toString(),
            end_m: Math.round(endMeters % 1000).toString()
        };
        
        setFormData(prev => ({
            ...prev,
            site_info_sections: prev.site_info_sections.map(section =>
                section.id === sectionId
                    ? { ...section, data: newData }
                    : section
            )
        }));
    };

            const renderSectionContent = (section) => {
                const { id, type, data } = section;
        
                // Helper to format meters with leading zeros and 3 decimal places
                        const formatMeters = (value) => {
                            if (value === null || value === undefined || value === '') return '';
                            const num = parseFloat(value);
                            if (isNaN(num)) return value; // Return as-is if not a valid number
                
                            // Round to nearest whole number for zero decimal places
                            const integerPart = Math.round(num).toString();
                            
                            // Pad integer part to 3 digits
                            const formattedInteger = integerPart.padStart(3, '0');
                            
                            return formattedInteger;
                        };                    
                            // Helper to format kilometers to zero decimal places
                            const formatKilometers = (value) => {
                                if (value === null || value === undefined || value === '') return '';
                                const num = parseFloat(value);
                                if (isNaN(num)) return value; // Return as-is if not a valid number
                                return Math.floor(num).toString(); // Return integer part
                            };
                                switch (type) {
                case 'site_location':
                    return (
                        <div className="space-y-3">
                            {isEditing ? (
                                <>
                                    <Input
                                        label="Postcode"
                                        value={data.postcode || ''}
                                        onChange={(e) => updateSectionData(id, 'postcode', e.target.value)}
                                    />
                                    <Input
                                        label="Google Maps Link"
                                        value={data.google_maps_link || ''}
                                        onChange={(e) => updateSectionData(id, 'google_maps_link', e.target.value)}
                                        placeholder="https://maps.google.com/..."
                                    />
                                    <Input
                                        label="What3Words Link"
                                        value={data.what3words_link || ''}
                                        onChange={(e) => updateSectionData(id, 'what3words_link', e.target.value)}
                                        placeholder="https://w3w.co/..."
                                    />
                                </>
                            ) : (
                                <>
                                    <ReadOnlyField label="Postcode" value={data.postcode} />
                                    {data.google_maps_link && (
                                        <div className="text-sm">
                                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Google Maps</label>
                                            <a href={data.google_maps_link} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">View Map</a>
                                        </div>
                                    )}
                                    {data.what3words_link && (
                                        <div className="text-sm">
                                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">What3Words</label>
                                            <a href={data.what3words_link} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">View Location</a>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    );
    
                case 'chainage_reference':
                    return (
                        <div className="space-y-4">
                            {isEditing ? (
                                <>
                                    <Combobox
                                        label="Datum Type"
                                        value={data.datum_type || ''}
                                        onChange={(e) => updateSectionData(id, 'datum_type', e.target.value)}
                                        options={chainageRefOptions}
                                        placeholder="Select or type..."
                                    />
                                    
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Datum Value (Miles / Yards)</label>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => convertDatumValues(id, 'to_miles')}
                                                title="Convert Km/M to Miles/Yards"
                                                className="h-6 px-2 text-xs"
                                            >
                                                <ArrowUp size={12} className="mr-1" />
                                                Convert to Miles/Yards
                                            </Button>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="flex-1 relative">
                                                <Input
                                                    value={data.datum_miles || ''}
                                                    onChange={(e) => updateSectionData(id, 'datum_miles', e.target.value)}
                                                    placeholder="Miles"
                                                    className="pr-12"
                                                />
                                                <span className="absolute right-3 top-2.5 text-xs text-gray-400">mi</span>
                                            </div>
                                            <div className="flex-1 relative">
                                                <Input
                                                    value={data.datum_yards || ''}
                                                    onChange={(e) => updateSectionData(id, 'datum_yards', e.target.value)}
                                                    placeholder="Yards"
                                                    className="pr-12"
                                                />
                                                <span className="absolute right-3 top-2.5 text-xs text-gray-400">yds</span>
                                            </div>
                                        </div>
                                    </div>
    
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Datum Value (Km / Meters)</label>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => convertDatumValues(id, 'to_km')}
                                                title="Convert Miles/Yards to Km/M"
                                                className="h-6 px-2 text-xs"
                                            >
                                                <ArrowDown size={12} className="mr-1" />
                                                Convert to Km/M
                                            </Button>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="flex-1 relative">
                                                <Input
                                                    value={data.datum_km || ''}
                                                    onChange={(e) => updateSectionData(id, 'datum_km', e.target.value)}
                                                    placeholder="Km"
                                                    className="pr-12"
                                                />
                                                <span className="absolute right-3 top-2.5 text-xs text-gray-400">km</span>
                                            </div>
                                            <div className="flex-1 relative">
                                                <Input
                                                    value={data.datum_m || ''}
                                                    onChange={(e) => updateSectionData(id, 'datum_m', e.target.value)}
                                                    placeholder="Meters"
                                                    className="pr-12"
                                                />
                                                <span className="absolute right-3 top-2.5 text-xs text-gray-400">m</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <ReadOnlyField label="Datum Type" value={data.datum_type} className="col-span-2" />
                                    <ReadOnlyField label="Datum (Miles)" value={data.datum_miles ? `${data.datum_miles} mi` : '-'} />
                                    <ReadOnlyField label="Datum (Yards)" value={data.datum_yards ? `${data.datum_yards} yds` : '-'} />
                                    <ReadOnlyField label="Datum (Km)" value={data.datum_km ? `${data.datum_km} km` : '-'} />
                                    <ReadOnlyField label="Datum (Meters)" value={data.datum_m ? `${parseFloat(data.datum_m).toFixed(3)} m` : '-'} />
                                </div>
                            )}
                        </div>
                    );
    
                case 'site_mileage':
                    return (
                        <div className="space-y-4">
                            {isEditing ? (
                                <>
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 mr-4">
                                            <Input
                                                label="ELR"
                                                value={data.elr || ''}
                                                onChange={(e) => updateSectionData(id, 'elr', e.target.value)}
                                            />
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => convertChainageToMileage(id)}
                                            className="mt-6"
                                            title="Convert values from Site Chainage section"
                                        >
                                            <RefreshCw size={14} className="mr-2" />
                                            Convert from Chainage
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Start Mileage</label>
                                        <div className="flex gap-2">
                                            <div className="flex-1 relative">
                                                <Input
                                                    value={data.start_miles || ''}
                                                    onChange={(e) => updateSectionData(id, 'start_miles', e.target.value)}
                                                    placeholder="Miles"
                                                    className="pr-12"
                                                />
                                                <span className="absolute right-3 top-2.5 text-xs text-gray-400">mi</span>
                                            </div>
                                            <div className="flex-1 relative">
                                                <Input
                                                    value={data.start_yards || ''}
                                                    onChange={(e) => updateSectionData(id, 'start_yards', e.target.value)}
                                                    placeholder="Yards"
                                                    className="pr-12"
                                                />
                                                <span className="absolute right-3 top-2.5 text-xs text-gray-400">yds</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">End Mileage</label>
                                        <div className="flex gap-2">
                                            <div className="flex-1 relative">
                                                <Input
                                                    value={data.end_miles || ''}
                                                    onChange={(e) => updateSectionData(id, 'end_miles', e.target.value)}
                                                    placeholder="Miles"
                                                    className="pr-12"
                                                />
                                                <span className="absolute right-3 top-2.5 text-xs text-gray-400">mi</span>
                                            </div>
                                            <div className="flex-1 relative">
                                                <Input
                                                    value={data.end_yards || ''}
                                                    onChange={(e) => updateSectionData(id, 'end_yards', e.target.value)}
                                                    placeholder="Yards"
                                                    className="pr-12"
                                                />
                                                <span className="absolute right-3 top-2.5 text-xs text-gray-400">yds</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <ReadOnlyField label="ELR" value={data.elr} className="col-span-2" />
                                    <ReadOnlyField label="Start Miles" value={data.start_miles ? `${data.start_miles} mi` : '-'} />
                                    <ReadOnlyField label="Start Yards" value={data.start_yards ? `${data.start_yards} yds` : '-'} />
                                    <ReadOnlyField label="End Miles" value={data.end_miles ? `${data.end_miles} mi` : '-'} />
                                    <ReadOnlyField label="End Yards" value={data.end_yards ? `${data.end_yards} yds` : '-'} />
                                </div>
                            )}
                        </div>
                    );
    
                case 'site_chainage':
                    return (
                        <div className="space-y-4">
                            {isEditing ? (
                                <>
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 mr-4">
                                            <Input
                                                label="ELR"
                                                value={data.elr || ''}
                                                onChange={(e) => updateSectionData(id, 'elr', e.target.value)}
                                            />
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => convertMileageToChainage(id)}
                                            className="mt-6"
                                            title="Convert values from Site Mileage section"
                                        >
                                            <RefreshCw size={14} className="mr-2" />
                                            Convert from Mileage
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Start Chainage</label>
                                        <div className="flex gap-2">
                                            <div className="flex-1 relative">
                                                                                            <Input
                                                                                                value={isEditing ? data.start_km || '' : formatKilometers(data.start_km)}
                                                                                                onChange={(e) => updateSectionData(id, 'start_km', e.target.value)}
                                                                                                placeholder="Km"
                                                                                                className="pr-12"
                                                                                            />                                                <span className="absolute right-3 top-2.5 text-xs text-gray-400">km</span>
                                            </div>
                                            <div className="flex-1 relative">
                                                                                            <Input
                                                                                                value={isEditing ? data.start_m || '' : formatMeters(data.start_m)}
                                                                                                onChange={(e) => updateSectionData(id, 'start_m', e.target.value)}
                                                                                                placeholder="Meters"
                                                                                                className="pr-12"
                                                                                            />                                                <span className="absolute right-3 top-2.5 text-xs text-gray-400">m</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">End Chainage</label>
                                        <div className="flex gap-2">
                                            <div className="flex-1 relative">
                                                                                            <Input
                                                                                                value={isEditing ? data.end_km || '' : formatKilometers(data.end_km)}
                                                                                                onChange={(e) => updateSectionData(id, 'end_km', e.target.value)}
                                                                                                placeholder="Km"
                                                                                                className="pr-12"
                                                                                            />                                                <span className="absolute right-3 top-2.5 text-xs text-gray-400">km</span>
                                            </div>
                                            <div className="flex-1 relative">
                                                                                            <Input
                                                                                                value={isEditing ? data.end_m || '' : formatMeters(data.end_m)}
                                                                                                onChange={(e) => updateSectionData(id, 'end_m', e.target.value)}
                                                                                                placeholder="Meters"
                                                                                                className="pr-12"
                                                                                            />                                                <span className="absolute right-3 top-2.5 text-xs text-gray-400">m</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <ReadOnlyField label="ELR" value={data.elr} className="col-span-2" />
                                    <ReadOnlyField label="Start Km" value={data.start_km ? `${formatKilometers(data.start_km)} km` : '-'} />
                                    <ReadOnlyField label="Start Meters" value={data.start_m ? `${formatMeters(data.start_m)} m` : '-'} />
                                    <ReadOnlyField label="End Km" value={data.end_km ? `${formatKilometers(data.end_km)} km` : '-'} />
                                    <ReadOnlyField label="End Meters" value={data.end_m ? `${formatMeters(data.end_m)} m` : '-'} />
                                </div>
                            )}
                        </div>
                    );
    
                case 'track_information':
                    return (
                        <div className="space-y-3">
                            {(data.tracks && data.tracks.length > 0) ? (
                                data.tracks.map((track, index) => (
                                    <div key={index} className="grid grid-cols-[120px_1fr_auto] gap-3 items-start p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                        {isEditing ? (
                                            <>
                                                <Input
                                                    label="ELR"
                                                    value={track.elr || ''}
                                                    onChange={(e) => updateTrackInSection(id, index, 'elr', e.target.value)}
                                                    placeholder="ELR"
                                                />
                                                <Input
                                                    label="Track ID"
                                                    value={track.track_id || ''}
                                                    onChange={(e) => updateTrackInSection(id, index, 'track_id', e.target.value)}
                                                    placeholder="Track ID"
                                                />
                                                <div className="flex items-center gap-2 pt-[1.5rem]">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={track.isDesign || false}
                                                            onChange={(e) => updateTrackInSection(id, index, 'isDesign', e.target.checked)}
                                                            className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-700"
                                                        />
                                                        <span className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">Design Track</span>
                                                    </label>
                                                                                            {isEditing && (
                                                                                                <button
                                                                                                    onClick={() => removeTrackFromSection(id, index)}
                                                                                                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                                                                                    title="Remove track"
                                                                                                >
                                                                                                    <Trash2 size={18} />
                                                                                                </button>
                                                                                            )}                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <ReadOnlyField label="ELR" value={track.elr} />
                                                <ReadOnlyField label="Track ID" value={track.track_id} />
                                                {track.isDesign && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 whitespace-nowrap">
                                                        Design Track
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                                    <p className="text-sm">No tracks added yet.</p>
                                    {isEditing && (
                                        <p className="text-xs mt-1">Click "Add Track" to get started.</p>
                                    )}
                                </div>
                            )}
                            {isEditing && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addTrackToSection(id)}
                                    className="w-full"
                                >
                                    <PlusCircle size={16} className="mr-2" />
                                    Add Track
                                </Button>
                            )}
                        </div>
                    );
    
                case 'non_track_works':
                    return (
                        <div className="space-y-3">
                            {isEditing && (
                                <Input
                                    label="Section Title"
                                    value={data.title ?? 'Miscellaneous'}
                                    onChange={(e) => updateSectionData(id, 'title', e.target.value)}
                                    placeholder="Enter section title..."
                                />
                            )}
                            {isEditing ? (
                                <textarea
                                    value={data.notes || ''}
                                    onChange={(e) => updateSectionData(id, 'notes', e.target.value)}
                                    rows="4"
                                    className="w-full p-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    placeholder="Enter details..."
                                />
                            ) : (
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                    {data.notes || 'No information added.'}
                                </p>
                            )}
                        </div>
                    );
    
                default:
                    return null;
            }
        };
    const renderPhotoBox = (photo) => {
        return (
            <div key={photo.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                {isEditing ? (
                    <div className="flex justify-between items-center mb-4">
                        <Input
                            value={photo.title}
                            onChange={(e) => updatePhotoTitle(photo.id, e.target.value)}
                            className="font-semibold flex-1 mr-2"
                        />
                        <button
                            onClick={() => removePhotoBox(photo.id)}
                            className="text-red-500 hover:text-red-700"
                            title="Remove photo box"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                ) : (
                    <h3 className="font-semibold mb-4">{photo.title}</h3>
                )}
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 flex flex-col items-center justify-center min-h-[300px] relative bg-gray-50 dark:bg-gray-900">
                    {photo.url ? (
                        <div
                            className="relative w-full cursor-pointer group"
                            onClick={() => setFullScreenImage({ url: photo.url, title: photo.title })}
                        >
                            <img
                                src={photo.url}
                                alt={photo.title}
                                className="w-full h-auto max-h-[280px] object-contain rounded-md block"
                            />
                            <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-30 transition-opacity duration-200 rounded-md flex items-center justify-center">
                                <Eye className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" size={32} />
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-gray-400">
                            <ImageIcon size={48} className="mx-auto mb-2 opacity-50" />
                            <p>No photo inserted</p>
                        </div>
                    )}
                    {isEditing && (
                        <div className="absolute top-4 right-4 z-10">
                            <input
                                ref={(el) => (photoInputRefs.current[photo.id] = el)}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handlePhotoUpload(e, photo.id)}
                                disabled={uploading}
                            />
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    photoInputRefs.current[photo.id]?.click();
                                }}
                                disabled={uploading}
                            >
                                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                <span className="ml-2">{photo.url ? 'Change' : 'Upload'}</span>
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {canEdit && (
                <div className="flex flex-wrap justify-between items-end gap-2 mb-4">
                    <div className="flex gap-2">
                        {isEditing ? (
                            <>
                                <Button variant="outline" onClick={() => { setIsEditing(false); setFormData({...project, site_info_sections: project.site_info_sections || [], site_info_photos: project.site_info_photos || []}); }}>Cancel</Button>
                                <Button onClick={handleSave}>Save Changes</Button>
                            </>
                        ) : (
                            <Button variant="outline" onClick={() => setIsEditing(true)}>Edit Information</Button>
                        )}
                    </div>

                    {isEditing && (
                        <div className="flex gap-2 items-center">
                            <div className="relative">
                                <Button
                                    variant="outline"
                                    onClick={() => setIsAddSectionMenuOpen(!isAddSectionMenuOpen)}
                                >
                                    <PlusCircle size={16} className="mr-2" />
                                    Add Section
                                </Button>
                                {isAddSectionMenuOpen && (
                                    <div className="absolute left-0 md:right-0 md:left-auto mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 p-2">
                                        <button onClick={() => addSection('site_location')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">Site Location</button>
                                        <button onClick={() => addSection('chainage_reference')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">Chainage Reference</button>
                                        <button onClick={() => addSection('site_mileage')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">Site Mileage</button>
                                        <button onClick={() => addSection('site_chainage')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">Site Chainage</button>
                                        <button onClick={() => addSection('track_information')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">Track Information</button>
                                        <button onClick={() => addSection('non_track_works')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">Miscellaneous</button>
                                    </div>
                                )}
                            </div>

                            <Button
                                variant="outline"
                                onClick={addPhotoBox}
                            >
                                <PlusCircle size={16} className="mr-2" />
                                Add Photo Box
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {formData.site_info_sections.map((section, index) => renderSection(section, index))}

                {formData.site_info_sections.length === 0 && !isEditing && (
                    <div className="col-span-full text-center py-12 text-gray-400 dark:text-gray-500">
                        <p>No sections added yet.</p>
                    </div>
                )}
            </div>

            {/* Photos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {formData.site_info_photos.map(photo => renderPhotoBox(photo))}
            </div>

            {/* Full Screen Image Modal */}
            {fullScreenImage && (
                <div
                    className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
                    onClick={() => setFullScreenImage(null)}
                >
                    <button
                        onClick={() => setFullScreenImage(null)}
                        className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
                        title="Close"
                    >
                        <X size={32} />
                    </button>
                    <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex flex-col items-center justify-center">
                        <h2 className="text-white text-xl font-semibold mb-4">{fullScreenImage.title}</h2>
                        <img
                            src={fullScreenImage.url}
                            alt={fullScreenImage.title}
                            className="max-w-full max-h-full object-contain rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};


// --- GENERIC / REUSABLE COMPONENTS ---
// UI Components moved to src/components/ui/index.jsx:
// - StatusBadge
// - Pagination
// - Modal

// ProjectModal has been extracted to src/components/modals/ProjectModal.jsx

// UI Components moved to src/components/ui/index.jsx:
// - ConfirmationModal
// - Input
// - Select
// - Button
// - Switch

// Date helper functions moved to src/utils/dateHelpers.js:
// - getWeekStartDate
// - getFiscalWeek
// - addDays
// - formatDateForDisplay
// - formatDateForKey


// --- PROVIDERS & MAIN APP ---
// All Context Providers moved to src/contexts/:
// - AuditTrailProvider → AuditTrailContext.jsx
// - JobProvider → JobContext.jsx
// - DeliveryTaskProvider → DeliveryTaskContext.jsx
// - ProjectTaskProvider → ProjectTaskContext.jsx
// - UserProvider → UserContext.jsx

// Access Denied Component
const AccessDenied = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="text-center">
                <Shield className="h-24 w-24 text-red-500 mx-auto mb-6" />
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    You don't have permission to view this page.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                    Please contact your administrator if you believe this is an error.
                </p>
            </div>
        </div>
    );
};

// Privilege Page Component - Enhanced Version
// Uses the new PrivilegeOverviewPage component with improved UI and features
const PrivilegePage = () => {
    return <PrivilegeOverviewPage />;
};

const MainLayout = () => {
    const { user, isLoading } = useAuth();
    const { can } = usePermissions();

    // Initialize state from browser history or sessionStorage to persist across page refreshes
    const getInitialActiveTab = () => {
        // First check browser history state
        const historyState = window.history.state;
        if (historyState?.activeTab) {
            return historyState.activeTab;
        }
        // Fall back to sessionStorage
        const saved = sessionStorage.getItem('activeTab');
        return saved || 'Dashboard';
    };

    const getInitialSelectedProject = () => {
        // First check browser history state
        const historyState = window.history.state;
        if (historyState?.selectedProject) {
            return historyState.selectedProject;
        }
        // Fall back to sessionStorage
        const saved = sessionStorage.getItem('selectedProject');
        return saved ? JSON.parse(saved) : null;
    };

    const [activeTab, setActiveTab] = useState(getInitialActiveTab);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState(getInitialSelectedProject);
    const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
    const [passwordPromptReason, setPasswordPromptReason] = useState(null);
    const [isChatbotVisible, setIsChatbotVisible] = useState(false);
    const [isRestoringFromHistory, setIsRestoringFromHistory] = useState(false);

    // Push notification support - using existing notification system

    // Initialize real-time notifications when user is loaded
    useEffect(() => {
        if (user?.id && !isLoading) {
            console.log('🔔 Initializing real-time notifications for user:', user.email);
            notificationManager.initialize();

            // Cleanup only when user changes or component unmounts
            return () => {
                notificationManager.cleanup();
            };
        }
    }, [user?.id, isLoading]);

    // Note: Automatic push notification subscription removed to comply with browser requirements
    // Users must explicitly request notifications through UI interaction
    // Push notifications can still be enabled through Settings page or notification prompts
    const [hasInitialized, setHasInitialized] = useState(false);
    const { projects } = useProjects();

    // Save navigation state to sessionStorage whenever it changes
    useEffect(() => {
        sessionStorage.setItem('activeTab', activeTab);
    }, [activeTab]);

    useEffect(() => {
        sessionStorage.setItem('selectedProject', JSON.stringify(selectedProject));
    }, [selectedProject]);

    // Clear sessionStorage on logout
    useEffect(() => {
        if (!user && !isLoading) {
            sessionStorage.removeItem('activeTab');
            sessionStorage.removeItem('selectedProject');
            setHasInitialized(false);
        }
    }, [user, isLoading]);

    // Push navigation state to browser history
    useEffect(() => {
        if (isRestoringFromHistory || !user) {
            return; // Don't push during restoration or when logged out
        }

        const state = {
            activeTab,
            selectedProject: selectedProject ? {
                id: selectedProject.id,
                project_number: selectedProject.project_number,
                project_name: selectedProject.project_name
            } : null,
            timestamp: Date.now()
        };

        const currentState = window.history.state;
        // Only push if state actually changed
        if (currentState?.activeTab !== activeTab ||
            currentState?.selectedProject?.id !== selectedProject?.id) {
            window.history.pushState(state, '', window.location.pathname + window.location.search);
            console.log('📜 Main nav pushed to history:', state);
        }
    }, [activeTab, selectedProject, isRestoringFromHistory, user]);

    // Handle browser back/forward buttons
    useEffect(() => {
        const handlePopState = (event) => {
            console.log('⬅️ Main nav: Browser back/forward detected:', event.state);

            if (event.state?.activeTab) {
                setIsRestoringFromHistory(true);

                setActiveTab(event.state.activeTab);

                // Restore selected project if exists
                if (event.state.selectedProject) {
                    // Try to find the full project data
                    const fullProject = projects?.find(p => p.id === event.state.selectedProject.id);
                    setSelectedProject(fullProject || event.state.selectedProject);
                } else {
                    setSelectedProject(null);
                }

                setTimeout(() => setIsRestoringFromHistory(false), 100);
            }
        };

        window.addEventListener('popstate', handlePopState);

        // Initialize history state if not present
        if (!window.history.state?.activeTab && user) {
            const initialHistoryState = {
                activeTab,
                selectedProject: selectedProject ? {
                    id: selectedProject.id,
                    project_number: selectedProject.project_number,
                    project_name: selectedProject.project_name
                } : null,
                timestamp: Date.now()
            };
            window.history.replaceState(initialHistoryState, '', window.location.pathname + window.location.search);
            console.log('📜 Initialized main nav history with:', initialHistoryState);
        }

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [activeTab, selectedProject, user, projects]);

    // Sync selectedProject with projects data when projects load or update
    // This handles both initial load from sessionStorage and live updates to project data
    useEffect(() => {
        if (projects && projects.length > 0) {
            if (selectedProject) {
                const updatedProject = projects.find(p => p.id === selectedProject.id);
                if (updatedProject) {
                    // Only update if the project data has actually changed
                    if (JSON.stringify(updatedProject) !== JSON.stringify(selectedProject)) {
                        setSelectedProject(updatedProject);
                    }
                } else {
                    // Project no longer exists, clear selection
                    setSelectedProject(null);
                    setActiveTab('Projects');
                }
            } else if (activeTab === 'ProjectDetail') {
                // User is on ProjectDetail page but selectedProject is null (after refresh)
                // Try to restore from sessionStorage
                const savedProject = sessionStorage.getItem('selectedProject');
                if (savedProject) {
                    try {
                        const projectData = JSON.parse(savedProject);
                        const fullProject = projects.find(p => p.id === projectData.id);
                        if (fullProject) {
                            setSelectedProject(fullProject);
                        } else {
                            // Project doesn't exist anymore, go to Projects page
                            setActiveTab('Projects');
                        }
                    } catch (e) {
                        console.error('Error restoring project from sessionStorage:', e);
                        setActiveTab('Projects');
                    }
                }
            }
        }
    }, [projects]); // eslint-disable-line react-hooks/exhaustive-deps

    // Check if user needs to change password
    useEffect(() => {
        if (user && !isLoading && !showPasswordPrompt) {
            // Skip password check if user data is still temporary (instant login)
            // Wait for full user data to load from database
            if (user._isTemporary) {
                return;
            }

            // FIRST: Check for new user (no last_login) - this takes priority
            // If they've already set password once (last_login exists), skip all prompts
            if (!user.last_login) {
                // Check URL parameters for password recovery flow
                const urlParams = new URLSearchParams(window.location.search);
                const hashParams = new URLSearchParams(window.location.hash.substring(1));

                const accessToken = urlParams.get('access_token') || hashParams.get('access_token');
                const type = urlParams.get('type') || hashParams.get('type');

                // Check if this is a password recovery session
                const isRecoverySession = user.auth_user &&
                    (user.auth_user.recovery_sent_at ||
                     (accessToken && (type === 'recovery' || type === 'magiclink')));

                if (isRecoverySession) {
                    setPasswordPromptReason('password_recovery');
                    setShowPasswordPrompt(true);
                    // Clear URL parameters (both query params and hash)
                    window.history.replaceState({}, document.title, window.location.pathname);
                    return;
                }

                // New user without recovery - normal password set
                setPasswordPromptReason('new_user');
                setShowPasswordPrompt(true);
                return;
            }
            // If user.last_login exists, they've already set their password - don't show prompt
        }
    }, [user, isLoading, showPasswordPrompt]);

    const handleViewProject = (project) => {
        setSelectedProject(project);
        setActiveTab('ProjectDetail');
    };

    const handleBackToProjects = () => {
        setSelectedProject(null);
        setActiveTab('Projects');
    };

    // Training Centre Components
    const DocumentHubPage = () => {
        // Initialize selected category from localStorage
        const getStoredCategory = () => {
            try {
                const stored = localStorage.getItem('documentHub_selectedCategory');
                return stored || 'Standards & Specs';
            } catch {
                return 'Standards & Specs';
            }
        };

        const [selectedCategory, setSelectedCategory] = useState(getStoredCategory());
        const [isRestoringFromHistory, setIsRestoringFromHistory] = useState(false);

        // Persist selected category to localStorage
        useEffect(() => {
            try {
                localStorage.setItem('documentHub_selectedCategory', selectedCategory);
            } catch (error) {
                console.error('Failed to save category to localStorage:', error);
            }
        }, [selectedCategory]);

        // Handle browser back/forward for category changes
        useEffect(() => {
            const handlePopState = (event) => {
                if (event.state && event.state.category && event.state.category !== selectedCategory) {
                    console.log('📂 Restoring category from history:', event.state.category);
                    setIsRestoringFromHistory(true);
                    setSelectedCategory(event.state.category);
                    setTimeout(() => setIsRestoringFromHistory(false), 100);
                }
            };

            window.addEventListener('popstate', handlePopState);

            return () => {
                window.removeEventListener('popstate', handlePopState);
            };
        }, [selectedCategory]);

        const documentCategories = [
            { value: 'Standards & Specs', label: 'Standards & Specs', icon: FileText },
            { value: 'Procedures & Guides', label: 'Procedures & Guides', icon: ClipboardList },
            { value: 'Templates', label: 'Templates', icon: File }
        ];

        return (
            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Document Hub</h1>
                    <div className="flex flex-wrap gap-2">
                        {documentCategories.map((category) => {
                            const IconComponent = category.icon;
                            return (
                                <button
                                    key={category.value}
                                    onClick={() => setSelectedCategory(category.value)}
                                    className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                                        selectedCategory === category.value
                                            ? 'bg-orange-500 text-white'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    <IconComponent size={16} className="mr-2" />
                                    {category.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <FileManagementSystem
                    category={selectedCategory}
                    onCategoryChange={setSelectedCategory}
                    isRestoringCategoryFromHistory={isRestoringFromHistory}
                />
            </div>
        );
    };

    const VideoTutorialsPage = () => {
        const { user } = useAuth();
        const isAdminOrSuperAdmin = user && (user.privilege === 'Admin' || user.privilege === 'Super Admin');
        const { showSuccessModal, showErrorModal } = useToast();

        const [videos, setVideos] = useState([]);
        const [categories, setCategories] = useState([]);
        const [loading, setLoading] = useState(true);
        const [selectedCategory, setSelectedCategory] = useState('All');
        const [isAddModalOpen, setIsAddModalOpen] = useState(false);
        const [isEditModalOpen, setIsEditModalOpen] = useState(false);
        const [selectedVideo, setSelectedVideo] = useState(null);
        const [deleteConfirmation, setDeleteConfirmation] = useState(null);

        useEffect(() => {
            fetchVideos();
            fetchCategories();
        }, []);

        const fetchVideos = async () => {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('video_tutorials')
                    .select('*')
                    .eq('is_active', true)
                    .order('sort_order', { ascending: true });

                if (error) throw error;
                setVideos(data || []);
            } catch (error) {
                console.error('Error fetching videos:', error);
                showErrorModal('Error loading videos');
            } finally {
                setLoading(false);
            }
        };

        const fetchCategories = async () => {
            try {
                // Get video_tutorials category
                const { data: categoryData, error: categoryError } = await supabase
                    .from('dropdown_categories')
                    .select('id')
                    .eq('name', 'video_tutorials')
                    .single();

                if (categoryError) throw categoryError;

                // Get category items
                const { data: itemsData, error: itemsError } = await supabase
                    .from('dropdown_items')
                    .select('*')
                    .eq('category_id', categoryData.id)
                    .eq('is_active', true)
                    .order('sort_order', { ascending: true });

                if (itemsError) throw itemsError;
                setCategories(itemsData || []);
            } catch (error) {
                console.error('Error fetching categories:', error);
            }
        };

        const createVideo = async (videoData) => {
            try {
                const { data, error } = await supabase
                    .from('video_tutorials')
                    .insert([{
                        ...videoData,
                        created_by: user.id,
                        sort_order: videos.length + 1
                    }])
                    .select()
                    .single();

                if (error) throw error;

                setVideos(prev => [...prev, data]);
                setIsAddModalOpen(false);
                showSuccessModal('Video added successfully');
            } catch (error) {
                console.error('Error creating video:', error);
                showErrorModal('Error adding video');
            }
        };

        const updateVideo = async (videoId, videoData) => {
            try {
                const { data, error } = await supabase
                    .from('video_tutorials')
                    .update(videoData)
                    .eq('id', videoId)
                    .select()
                    .single();

                if (error) throw error;

                setVideos(prev => prev.map(video => video.id === videoId ? data : video));
                setIsEditModalOpen(false);
                setSelectedVideo(null);
                showSuccessModal('Video updated successfully');
            } catch (error) {
                console.error('Error updating video:', error);
                showErrorModal('Error updating video');
            }
        };

        const deleteVideo = async (videoId) => {
            try {
                const { error } = await supabase
                    .from('video_tutorials')
                    .update({ is_active: false })
                    .eq('id', videoId);

                if (error) throw error;

                setVideos(prev => prev.filter(video => video.id !== videoId));
                setDeleteConfirmation(null);
                showSuccessModal('Video deleted successfully');
            } catch (error) {
                console.error('Error deleting video:', error);
                showErrorModal('Error deleting video');
            }
        };

        const getYouTubeThumbnail = (url) => {
            try {
                const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
                if (videoId) {
                    return `https://img.youtube.com/vi/${videoId[1]}/mqdefault.jpg`;
                }
                return null;
            } catch (error) {
                return null;
            }
        };

        const filteredVideos = selectedCategory === 'All'
            ? videos
            : videos.filter(video => video.category_value === selectedCategory);

        const getCategoryDisplayName = (categoryValue) => {
            const category = categories.find(cat => cat.value === categoryValue);
            return category ? category.display_text : categoryValue;
        };

        if (loading) {
            return (
                <div className="p-6">
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                    </div>
                </div>
            );
        }

        return (
            <div className="p-6">
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Video Tutorials</h1>
                            <p className="text-gray-600 dark:text-gray-400">Learn through our comprehensive video library</p>
                        </div>
                        {isAdminOrSuperAdmin && (
                            <Button
                                onClick={() => setIsAddModalOpen(true)}
                                className="bg-orange-500 hover:bg-orange-600"
                            >
                                <PlusCircle size={16} className="mr-2" />
                                Add Video
                            </Button>
                        )}
                    </div>

                    {/* Category Filter */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Filter by Category
                        </label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-64 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                            <option value="All">All Categories</option>
                            {categories.map(category => (
                                <option key={category.id} value={category.value}>
                                    {category.display_text}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Videos Grid */}
                {filteredVideos.length === 0 ? (
                    <div className="text-center py-12">
                        <Presentation className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            {selectedCategory === 'All' ? 'No videos available' : `No videos in ${getCategoryDisplayName(selectedCategory)}`}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            {isAdminOrSuperAdmin ? 'Click "Add Video" to get started.' : 'Check back later for new content.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredVideos.map(video => (
                            <div key={video.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow">
                                {/* Thumbnail */}
                                <div className="aspect-video bg-gray-100 dark:bg-gray-700">
                                    {getYouTubeThumbnail(video.url) ? (
                                        <img
                                            src={getYouTubeThumbnail(video.url)}
                                            alt={video.title}
                                            className="w-full h-full object-cover cursor-pointer"
                                            onClick={() => window.open(video.url, '_blank')}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center cursor-pointer"
                                             onClick={() => window.open(video.url, '_blank')}>
                                            <Presentation className="h-12 w-12 text-gray-400" />
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 flex-1">
                                            {video.title}
                                        </h3>
                                        {isAdminOrSuperAdmin && (
                                            <div className="flex gap-1 ml-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedVideo(video);
                                                        setIsEditModalOpen(true);
                                                    }}
                                                    className="p-1 h-auto"
                                                >
                                                    <Edit size={12} />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setDeleteConfirmation(video)}
                                                    className="p-1 h-auto text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-500/10"
                                                >
                                                    <Trash2 size={12} />
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                                            {getCategoryDisplayName(video.category_value)}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => window.open(video.url, '_blank')}
                                            className="text-orange-600 hover:text-orange-700"
                                        >
                                            Watch
                                        </Button>
                                    </div>

                                    {video.description && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                                            {video.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add Video Modal */}
                {isAddModalOpen && (
                    <VideoModal
                        isOpen={isAddModalOpen}
                        onClose={() => setIsAddModalOpen(false)}
                        onSave={createVideo}
                        categories={categories}
                        title="Add Video Tutorial"
                    />
                )}

                {/* Edit Video Modal */}
                {isEditModalOpen && selectedVideo && (
                    <VideoModal
                        isOpen={isEditModalOpen}
                        onClose={() => {
                            setIsEditModalOpen(false);
                            setSelectedVideo(null);
                        }}
                        onSave={(videoData) => updateVideo(selectedVideo.id, videoData)}
                        categories={categories}
                        video={selectedVideo}
                        title="Edit Video Tutorial"
                        isEdit={true}
                    />
                )}

                {/* Delete Confirmation Modal */}
                {deleteConfirmation && (
                    <ConfirmationModal
                        isOpen={!!deleteConfirmation}
                        onClose={() => setDeleteConfirmation(null)}
                        onConfirm={() => deleteVideo(deleteConfirmation.id)}
                        title="Delete Video"
                        message={`Are you sure you want to delete "${deleteConfirmation.title}"? This action cannot be undone.`}
                        confirmText="Delete"
                        confirmVariant="danger"
                    />
                )}
            </div>
        );
    };



// EquipmentPage component has been moved to ./components/Equipment/EquipmentPage.jsx

    // Video Modal Component
    const VideoModal = ({ isOpen, onClose, onSave, categories, video, title, isEdit = false }) => {
        const [formData, setFormData] = useState({
            title: '',
            url: '',
            category_value: '',
            description: ''
        });
        const [loading, setLoading] = useState(false);

        useEffect(() => {
            if (!isOpen) {
                setFormData({ title: '', url: '', category_value: '', description: '' });
            } else if (isEdit && video) {
                setFormData({
                    title: video.title,
                    url: video.url,
                    category_value: video.category_value,
                    description: video.description || ''
                });
            }
        }, [isOpen, isEdit, video]);

        const validateYouTubeUrl = (url) => {
            const pattern = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
            return pattern.test(url);
        };

        const handleSubmit = async (e) => {
            e.preventDefault();
            if (!formData.title.trim() || !formData.url.trim() || !formData.category_value) return;

            if (!validateYouTubeUrl(formData.url)) {
                alert('Please enter a valid YouTube URL');
                return;
            }

            setLoading(true);
            try {
                await onSave({
                    title: formData.title.trim(),
                    url: formData.url.trim(),
                    category_value: formData.category_value,
                    description: formData.description.trim()
                });
            } finally {
                setLoading(false);
            }
        };

        return (
            <Modal isOpen={isOpen} onClose={onClose} title={title}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Video Title *
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="Enter video title"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            YouTube URL *
                        </label>
                        <input
                            type="url"
                            value={formData.url}
                            onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="https://www.youtube.com/watch?v=..."
                            required
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Only YouTube URLs are supported
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Category *
                        </label>
                        <select
                            value={formData.category_value}
                            onChange={(e) => setFormData(prev => ({ ...prev, category_value: e.target.value }))}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            required
                        >
                            <option value="">Select a category</option>
                            {categories.map(category => (
                                <option key={category.id} value={category.value}>
                                    {category.display_text}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Categories can be managed in Dropdown Menu settings
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="Brief description of the video content"
                            rows="3"
                        />
                    </div>

                    <div className="flex gap-2 pt-4">
                        <Button
                            type="submit"
                            disabled={loading || !formData.title.trim() || !formData.url.trim() || !formData.category_value}
                            className="bg-orange-500 hover:bg-orange-600"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {isEdit ? 'Update Video' : 'Add Video'}
                        </Button>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                    </div>
                </form>
            </Modal>
        );
    };

    const renderContent = () => {
        if (activeTab === 'ProjectDetail' && selectedProject) {
            return <ProjectDetailPage project={selectedProject} onBack={handleBackToProjects} />;
        }

        const LoadingFallback = () => (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        );

        switch (activeTab) {
            case 'Dashboard': return <DashboardPage onViewProject={handleViewProject} setActiveTab={setActiveTab} />;
            case 'Projects': return can('VIEW_PROJECTS') ? <ProjectsPage onViewProject={handleViewProject} /> : <AccessDenied />;
            case 'Announcements': return can('VIEW_ANNOUNCEMENTS') ? <Suspense fallback={<LoadingFallback />}><AnnouncementsPage /></Suspense> : <AccessDenied />;
            case 'Feedback': return <FeedbackPage />;
            case 'Resource Calendar': return can('VIEW_RESOURCE_CALENDAR') ? <Suspense fallback={<LoadingFallback />}><ResourceCalendarPage onViewProject={handleViewProject} /></Suspense> : <AccessDenied />;
            case 'To Do List': return can('VIEW_TASKS') ? <ProjectTasksPage /> : <AccessDenied />;
            case 'Close Calls': return can('VIEW_CLOSE_CALLS') ? <Suspense fallback={<LoadingFallback />}><CloseCallsPage /></Suspense> : <AccessDenied />;
            case 'Media': return can('VIEW_MEDIA') ? <Suspense fallback={<LoadingFallback />}><MediaPage /></Suspense> : <AccessDenied />;
            
            // Equipment
            case 'Calendar': return can('VIEW_EQUIPMENT_CALENDAR') ? <Suspense fallback={<LoadingFallback />}><EquipmentCalendarPage onViewProject={handleViewProject} /></Suspense> : <AccessDenied />;
            case 'Assignments': return can('VIEW_EQUIPMENT') ? <EquipmentPage /> : <AccessDenied />;
            case 'Register': return can('VIEW_EQUIPMENT_REGISTER') ? <Suspense fallback={<LoadingFallback />}><EquipmentRegisterPage /></Suspense> : <AccessDenied />;
            case 'Check & Adjust': return can('VIEW_CHECK_ADJUST') ? <Suspense fallback={<LoadingFallback />}><CheckAdjustPage /></Suspense> : <AccessDenied />;
                                    case 'Vehicle Management': return can('VIEW_VEHICLES') ? <VehiclesPage /> : <AccessDenied />;
                                    case 'Mileage Logs': return can('VIEW_VEHICLE_MILEAGE') ? <Suspense fallback={<LoadingFallback />}><VehicleMileagePage /></Suspense> : <AccessDenied />;
                                    case 'Vehicle Inspection': return can('VIEW_VEHICLE_INSPECTION') ? <Suspense fallback={<LoadingFallback />}><VehicleMileageLogsPage /></Suspense> : <AccessDenied />;            case 'Delivery Tracker': return can('VIEW_DELIVERY_TRACKER') ? <DeliveryTrackerPage /> : <AccessDenied />;
            case 'Delivery Team - To Do List': return can('VIEW_DELIVERY_TODO') ? <DeliveryTasksPage /> : <AccessDenied />;
            case 'Project Logs': return can('VIEW_PROJECT_LOGS') ? <Suspense fallback={<LoadingFallback />}><ProjectLogsPage /></Suspense> : <AccessDenied />;
            case 'Resource': return can('VIEW_RESOURCE_ANALYTICS') ? <Suspense fallback={<LoadingFallback />}><ResourceAnalyticsPage /></Suspense> : <AccessDenied />;
            case 'AFV': return can('VIEW_AFV') ? <Suspense fallback={<LoadingFallback />}><AFVPage /></Suspense> : <AccessDenied />;
            case 'Leaderboard': return can('VIEW_LEADERBOARD') ? <Suspense fallback={<LoadingFallback />}><LeaderboardPage /></Suspense> : <AccessDenied />;
            case 'Document Hub': return can('VIEW_DOCUMENT_HUB') ? <DocumentHubPage /> : <AccessDenied />;
            case 'Video Tutorials': return can('VIEW_VIDEO_TUTORIALS') ? <VideoTutorialsPage /> : <AccessDenied />;
            case 'Rail Components': return can('VIEW_RAIL_COMPONENTS') ? <RailComponentsPage /> : <AccessDenied />;
            case 'Staff Contacts': return <UserContactsPage />;
            case 'Subcontractors': return <SubcontractorsPage />;
            case 'Useful Contacts': return <UsefulContactsPage />;
            case 'Useful Links': return <UsefulLinksPage />;
            case 'On-Call Contacts': return <OnCallContactsPage />;
            case 'User Admin': return <UserAdmin />;
            case 'Privilege': return <PrivilegePage />;
            case 'Dropdown Menu': return <DropdownMenuPage />;
            case 'Calendar Colours': return <Suspense fallback={<LoadingFallback />}><CalendarColoursPage /></Suspense>;
            case 'Audit Trail': return <Suspense fallback={<LoadingFallback />}><AuditTrailPage /></Suspense>;
            case 'Settings': return <SettingsPage />;
            case 'Document Management': return <AdminDocumentManager />;
            default: return <DashboardPage onViewProject={handleViewProject} setActiveTab={setActiveTab} />;
        }
    };

    // Show loading spinner while authentication is being determined
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    // Show login page if user is not authenticated
    if (!user) {
        return <LoginPage />;
    }

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} setActiveTab={setActiveTab} activeTab={activeTab} onChatbotToggle={() => setIsChatbotVisible(!isChatbotVisible)} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto">
                    {renderContent()}
                </main>
            </div>
            
            {/* Password Change Prompt */}
            {showPasswordPrompt && (
                <PasswordChangePrompt
                    user={user}
                    reason={passwordPromptReason}
                    onComplete={() => {
                        setShowPasswordPrompt(false);
                        setPasswordPromptReason(null);
                        setActiveTab('Dashboard'); // Redirect to main dashboard
                    }}
                />
            )}

            {/* Chatbot */}
            <Chatbot
                isVisible={isChatbotVisible}
                onClose={() => setIsChatbotVisible(false)}
            />
        </div>
    );
};

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

const LoadingScreen = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Loading Survey Hub...</p>
      </div>
    </div>
  );
};

const AppContent = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [isPasswordReset, setIsPasswordReset] = React.useState(false);

  // Check if URL has a password reset token (Supabase redirects with hash)
  React.useEffect(() => {
    const checkPasswordReset = () => {
      const hash = window.location.hash;
      const href = window.location.href;
      const isRecoveryFromStorage = sessionStorage.getItem('isPasswordRecovery') === 'true';

      console.log('🔐 App: Checking for password reset...');
      console.log('🔐 App: Full URL:', href);
      console.log('🔐 App: Hash:', hash);
      console.log('🔐 App: Storage flag:', isRecoveryFromStorage);
      console.log('🔐 App: User:', user);
      console.log('🔐 App: IsAuthenticated:', isAuthenticated);

      const hasRecoveryToken = isRecoveryFromStorage ||
                              hash.includes('type=recovery') ||
                              hash.includes('type%3Drecovery') ||
                              href.includes('type=recovery') ||
                              href.includes('type%3Drecovery');

      if (hasRecoveryToken) {
        console.log('🔐 App: Password reset flow detected!');
        setIsPasswordReset(true);
      } else {
        setIsPasswordReset(false);
      }
    };

    checkPasswordReset();

    // Listen for hash changes
    window.addEventListener('hashchange', checkPasswordReset);
    return () => window.removeEventListener('hashchange', checkPasswordReset);
  }, [user, isAuthenticated]);

  if (isLoading && !user) {
    return <LoadingScreen />;
  }

  // Force show LoginPage if user is in password reset flow, even if temporarily authenticated
  if (isPasswordReset) {
    console.log('🔐 App: Showing LoginPage for password reset');
    return <LoginPage />;
  }

  if (isAuthenticated && user) {
    return (
      <PermissionProvider>
        <ThemeProvider>
          <UserProvider>
            <JobProvider>
              <ProjectProvider>
                <TaskProvider>
                  <DeliveryTaskProvider>
                    <ProjectTaskProvider>
                      <AuditTrailProvider>
                        <MainLayout />
                      </AuditTrailProvider>
                    </ProjectTaskProvider>
                  </DeliveryTaskProvider>
                </TaskProvider>
              </ProjectProvider>
            </JobProvider>
          </UserProvider>
        </ThemeProvider>
      </PermissionProvider>
    );
  }

  return <LoginPage />;
};

const MainAppLayout = () => {
  // Initialize from browser history state if available
  const getInitialState = () => {
    const historyState = window.history.state;
    if (historyState?.activeTab) {
      return {
        activeTab: historyState.activeTab,
        settingsSection: historyState.settingsSection || 'profile',
        selectedProject: historyState.selectedProject || null
      };
    }
    return {
      activeTab: 'Dashboard',
      settingsSection: 'profile',
      selectedProject: null
    };
  };

  const initialState = getInitialState();
  const [activeTab, setActiveTab] = useState(initialState.activeTab);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(initialState.selectedProject);
  const [settingsSection, setSettingsSection] = useState(initialState.settingsSection);
  const [isRestoringFromHistory, setIsRestoringFromHistory] = useState(false);

  // Push navigation state to browser history
  useEffect(() => {
    if (isRestoringFromHistory) {
      return; // Don't push during restoration
    }

    const state = {
      activeTab,
      settingsSection,
      selectedProject: selectedProject ? { id: selectedProject.id, project_number: selectedProject.project_number } : null,
      timestamp: Date.now()
    };

    const currentState = window.history.state;
    // Only push if state actually changed
    if (currentState?.activeTab !== activeTab ||
        currentState?.settingsSection !== settingsSection ||
        currentState?.selectedProject?.id !== selectedProject?.id) {
      window.history.pushState(state, '', window.location.pathname + window.location.search);
      console.log('📜 Main nav pushed to history:', state);
    }
  }, [activeTab, settingsSection, selectedProject, isRestoringFromHistory]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (event) => {
      console.log('⬅️ Main nav: Browser back/forward detected:', event.state);

      if (event.state?.activeTab) {
        setIsRestoringFromHistory(true);

        setActiveTab(event.state.activeTab);

        if (event.state.settingsSection) {
          setSettingsSection(event.state.settingsSection);
        }

        // Note: We're only storing minimal project info in history
        // The full project data would need to be fetched if needed
        setSelectedProject(event.state.selectedProject);

        setTimeout(() => setIsRestoringFromHistory(false), 100);
      }
    };

    window.addEventListener('popstate', handlePopState);

    // Initialize history state if not present
    if (!window.history.state?.activeTab) {
      const initialHistoryState = {
        activeTab,
        settingsSection,
        selectedProject: null,
        timestamp: Date.now()
      };
      window.history.replaceState(initialHistoryState, '', window.location.pathname + window.location.search);
      console.log('📜 Initialized main nav history with:', initialHistoryState);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [activeTab, settingsSection]);

  // Enhanced setActiveTab to handle settings section
  const handleSetActiveTab = (tab, section = null) => {
    setActiveTab(tab);
    if (tab === 'Settings' && section) {
      setSettingsSection(section);
    }
    // Clear selected project when navigating away
    if (tab !== activeTab) {
      setSelectedProject(null);
    }
  };

  const renderContent = () => {
    if (selectedProject) {
      return <ProjectDetailPage project={selectedProject} onBack={() => setSelectedProject(null)} />;
    }
    switch (activeTab) {
      case 'Dashboard':
        return <DashboardPage onViewProject={setSelectedProject} setActiveTab={handleSetActiveTab} />;
      case 'Projects':
        return <ProjectsPage onViewProject={setSelectedProject} />;
      case 'Resource Calendar':
        return <ResourceCalendarPage onViewProject={setSelectedProject} />;
      case 'To Do List':
        return <ProjectTasksPage />;
      case 'Equipment Management':
        return <EquipmentPage />;
      case 'Vehicles':
        return <VehiclesPage />;
      case 'Delivery Tracker':
        return <DeliveryTrackerPage />;
      case 'Delivery Team - To Do List':
        return <DeliveryTasksPage />;
      case 'User Admin':
        return <UserAdmin />;
      case 'Privilege':
        return <PrivilegePage />;
      case 'Announcements':
        return <AnnouncementsPage />;
      case 'Feedback':
        return <FeedbackPage />;
      case 'Dropdown Menu':
        return <DropdownMenuPage />;
      case 'Audit Trail':
        return <AuditTrailPage />;
      case 'Settings':
        return <SettingsPage initialSection={settingsSection} />;
      default:
        return <DashboardPage onViewProject={setSelectedProject} setActiveTab={handleSetActiveTab} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      <Sidebar activeTab={activeTab} setActiveTab={handleSetActiveTab} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} setActiveTab={handleSetActiveTab} activeTab={activeTab} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          {renderContent()}
        </main>
      </div>
      <PasswordChangePrompt />
    </div>
  );
};

const SurveyHubApp = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </NotificationProvider>
    </AuthProvider>
  );
};

export default SurveyHubApp;
