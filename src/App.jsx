import React, { useState, useEffect, createContext, useContext, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart as BarChartIcon, Users, Settings, Search, Bell, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, PlusCircle, Filter, Edit, Trash2, FileText, FileSpreadsheet, Presentation, Sun, Moon, LogOut, Upload, Download, MoreVertical, X, FolderKanban, File, Archive, Copy, ClipboardCheck, ClipboardList, Bug, ClipboardPaste, History, ArchiveRestore, TrendingUp, Shield, Palette, Loader2, Megaphone, Calendar, AlertTriangle, FolderOpen, List, MessageSquare, Wrench, BookUser, Phone, Check, Bot, RefreshCw, Eye, ExternalLink } from 'lucide-react';
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
import { PERMISSIONS, PERMISSION_DESCRIPTIONS } from './utils/privileges';
import './utils/testRealtime'; // Load realtime test utilities
import LoginPage from './components/pages/LoginPage';
import UserAdmin from './components/pages/UserAdmin';
import DropdownMenuPage from './components/pages/DropdownMenuPage';
import PasswordChangePrompt from './components/PasswordChangePrompt';
import CustomConfirmationModal from './components/ConfirmationModal';
import AdminDocumentManager from './components/pages/AdminDocumentManager';
import Chatbot from './components/Chatbot';
import { Card, Input, Select, Button, Switch, Modal, ConfirmationModal, StatusBadge, Pagination } from './components/ui';
import FileManagementSystem from './components/FileManagement/FileManagementSystem';
import EquipmentPage from './components/Equipment/EquipmentPage';
import VehiclesPage from './components/Vehicles/VehiclesPage';
import ProjectsPageComponent from './pages/ProjectsPage';
import DashboardPage from './pages/DashboardPage';
import AssignedTasksPage from './pages/AssignedTasksPage';
import ProjectTasksPage from './pages/ProjectTasksPage';
import UserContactsPage from './pages/UserContactsPage';
import UsefulContactsPage from './pages/UsefulContactsPage';
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
        canViewAssignedTasks: false,
        canViewUserAdmin: false,
        canEditUserAdmin: false,
        canViewAuditTrail: false,
        canViewAnalytics: true,
    },
    'Viewer+': {
        level: 0.5,
        canEditProjects: false,
        canViewAssignedTasks: true,
        canViewUserAdmin: false,
        canEditUserAdmin: false,
        canViewAuditTrail: false,
        canViewAnalytics: true,
    },
    'Editor': {
        level: 1,
        canEditProjects: true,
        canViewAssignedTasks: false,
        canViewUserAdmin: false,
        canEditUserAdmin: false,
        canViewAuditTrail: false,
        canViewAnalytics: true,
    },
    'Subcontractor': {
        level: 2,
        canEditProjects: false,
        canViewAssignedTasks: false,
        canViewUserAdmin: false,
        canEditUserAdmin: false,
        canViewAuditTrail: false,
        canViewAnalytics: true,
    },
    'Site Staff': {
        level: 3,
        canEditProjects: true,
        canViewAssignedTasks: false,
        canViewUserAdmin: false,
        canEditUserAdmin: false,
        canViewAuditTrail: false,
        canViewAnalytics: true,
    },
    'Office Staff': {
        level: 4,
        canEditProjects: true,
        canViewAssignedTasks: true,
        canViewUserAdmin: true,
        canEditUserAdmin: false,
        canViewAuditTrail: true,
        canViewAnalytics: true,
    },
    'Delivery Surveyors': {
        level: 4,
        canEditProjects: true,
        canViewAssignedTasks: true,
        canViewUserAdmin: true,
        canEditUserAdmin: false,
        canViewAuditTrail: true,
        canViewAnalytics: true,
    },
    'Project Managers': {
        level: 4,
        canEditProjects: true,
        canViewAssignedTasks: true,
        canViewUserAdmin: true,
        canEditUserAdmin: false,
        canViewAuditTrail: true,
        canViewAnalytics: true,
    },
    'Admin': {
        level: 5,
        canEditProjects: true,
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
const Header = ({ onMenuClick, setActiveTab, activeTab }) => {
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

        if (!window.swRegistration) {
            addToast({ message: 'Service worker not available', type: 'error' });
            return;
        }

        try {
            addToast({ message: 'Checking for updates...', type: 'info' });
            await window.swRegistration.update();

            // Check if an update is waiting
            if (window.swRegistration.waiting) {
                addToast({ message: 'Update found! Installing...', type: 'success' });
                // Tell it to skip waiting and activate
                window.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
            } else if (window.swRegistration.installing) {
                addToast({ message: 'Update found! Installing...', type: 'success' });
            } else {
                addToast({ message: `You're running the latest version (v${packageJson.version})`, type: 'success' });
            }
        } catch (error) {
            console.error('Update check failed:', error);
            addToast({ message: 'Failed to check for updates', type: 'error' });
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
                                                console.log('Notification clicked, navigating to Announcements');
                                                markAsRead(notif.id);
                                                // Navigate to announcements page for all notifications
                                                setActiveTab('Announcements');
                                                setIsNotificationsOpen(false);
                                                console.log('setActiveTab called with: Announcements');
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
    const sidebarRef = useRef(null);

    // Check if user can access admin mode
    const isAdminUser = canAccessAdmin();

    // Regular navigation items (visible to all users)
    const regularNavItems = [
        { name: 'Dashboard', icon: BarChartIcon, show: true },
        { name: 'Projects', icon: FolderKanban, show: can('VIEW_PROJECTS') },
        { name: 'Announcements', icon: Megaphone, show: can('VIEW_ANNOUNCEMENTS') },
        {
            name: 'Project Team',
            icon: FolderOpen,
            show: true,
            isGroup: true,
            subItems: [
                { name: 'Resource Calendar', parent: 'Project Team', show: can('VIEW_RESOURCE_CALENDAR') },
                { name: 'Equipment Calendar', parent: 'Project Team', show: can('VIEW_EQUIPMENT_CALENDAR') },
                { name: 'Project Tasks', parent: 'Project Team', show: can('VIEW_TASKS') },
                { name: 'Equipment', parent: 'Project Team', show: can('VIEW_EQUIPMENT') },
                { name: 'Vehicles', parent: 'Project Team', show: can('VIEW_VEHICLES') }
            ]
        },
        {
            name: 'Delivery Team',
            icon: ClipboardPaste,
            show: true,
            isGroup: true,
            subItems: [
                { name: 'Delivery Tracker', parent: 'Delivery Team' },
                { name: 'Delivery Tasks', parent: 'Delivery Team' }
            ]
        },
        {
            name: 'Training Centre',
            icon: Presentation,
            show: true,
            isGroup: true,
            subItems: [
                { name: 'Document Hub', parent: 'Training Centre', show: can('VIEW_DOCUMENT_HUB') },
                { name: 'Video Tutorials', parent: 'Training Centre' },
                { name: 'Rail Components', parent: 'Training Centre' }
            ]
        },
        {
            name: 'Contact Details',
            icon: BookUser,
            show: true,
            isGroup: true,
            subItems: [
                { name: 'User Contacts', parent: 'Contact Details' },
                { name: 'Useful Contacts', parent: 'Contact Details' },
                { name: 'On-Call Contacts', parent: 'Contact Details' }
            ]
        },
        {
            name: 'Analytics',
            icon: TrendingUp,
            show: can('VIEW_ANALYTICS'),
            isGroup: true,
            subItems: [
                { name: 'Project Logs', parent: 'Analytics' },
                { name: 'Resource', parent: 'Analytics' },
                { name: 'AFV', parent: 'Analytics' }
            ]
        },
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
        // For group items (Project Team, Delivery Team, Training Centre), do nothing as they're just headers
        if (!item.isGroup) {
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

    const isDeliveryTeamActive = activeTab === 'Delivery Tracker' || activeTab === 'Delivery Tasks';
    const isProjectTeamActive = activeTab === 'Resource Calendar' || activeTab === 'Equipment Calendar' || activeTab === 'Project Tasks' || activeTab === 'Equipment' || activeTab === 'Vehicles';
    const isTrainingCentreActive = activeTab === 'Document Hub' || activeTab === 'Video Tutorials' || activeTab === 'Rail Components';
    const isContactDetailsActive = activeTab === 'User Contacts' || activeTab === 'Useful Contacts' || activeTab === 'On-Call Contacts';

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
        <aside ref={sidebarRef} className={`fixed md:relative z-40 md:z-auto inset-y-0 left-0 w-64 bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col`}>
            <div className="border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <div className="flex items-center justify-between h-16 px-6">
                    {isAdminUser ? (
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
                            <RetroTargetIcon className="w-8 h-8 text-orange-500" />
                            <span className="ml-3 text-xl font-bold text-gray-800 dark:text-white">Survey Hub</span>
                        </button>
                    ) : (
                        <div className="flex items-center">
                            <RetroTargetIcon className="w-8 h-8 text-orange-500" />
                            <span className="ml-3 text-xl font-bold text-gray-800 dark:text-white">Survey Hub</span>
                        </div>
                    )}
                </div>
            </div>
            <nav className="p-4 overflow-y-auto flex-1 min-h-0 scroll-smooth">
                <ul className="pb-4">
                    {navItems.map(item => (
                        <li key={item.name}>
                            {item.isGroup ? (
                                <div className={`flex items-center px-4 py-2.5 my-1 text-sm font-medium rounded-lg ${
                                    (item.name === 'Delivery Team' && isDeliveryTeamActive) ||
                                    (item.name === 'Project Team' && isProjectTeamActive) ||
                                    (item.name === 'Training Centre' && isTrainingCentreActive) ||
                                    (item.name === 'Contact Details' && isContactDetailsActive)
                                        ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400'
                                        : 'text-gray-700 dark:text-gray-300'
                                }`}>
                                    <item.icon size={20} className="mr-3" />
                                    <span className="flex-1">{item.name}</span>
                                </div>
                            ) : (
                                <a
                                    href="#"
                                    onClick={(e) => handleItemClick(item, e)}
                                    className={`flex items-center px-4 py-2.5 my-1 text-sm font-medium rounded-lg transition-colors duration-200 ${
                                        activeTab === item.name
                                            ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400'
                                            : 'text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    <item.icon size={20} className="mr-3" />
                                    <span className="flex-1">{item.name}</span>
                                </a>
                            )}
                            {item.isGroup && (
                                <ul className="ml-4 mt-1 space-y-1">
                                    {item.subItems.filter(subItem => subItem.show !== false).map(subItem => (
                                        <li key={subItem.name}>
                                            <a
                                                href="#"
                                                onClick={(e) => handleSubItemClick(subItem, e)}
                                                className={`flex items-center px-4 py-2 text-sm rounded-lg transition-colors duration-200 ${
                                                    activeTab === subItem.name
                                                        ? 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400'
                                                        : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                                                }`}
                                            >
                                                <span className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full mr-3"></span>
                                                {subItem.name}
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
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <Shield size={14} />
                    <span>v{packageJson.version}</span>
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
    // MODIFICATION 1: Get data and functions from the new useJobs hook
    const { jobs, addJob, updateJob, deleteJob, loading, error } = useJobs();
    const { canCreateProjects, canEditProjects, canDeleteProjects } = usePermissions();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [jobToEdit, setJobToEdit] = useState(null);
    const [showArchived, setShowArchived] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
    const [sortConfig, setSortConfig] = useState({ key: 'plannedDeliveryDate', direction: 'ascending' });
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filterDiscipline, setFilterDiscipline] = useState([]);
    const [filterStatus, setFilterStatus] = useState([]);
    const filterRef = useRef(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [jobToDelete, setJobToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [jobToArchive, setJobToArchive] = useState(null);
    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // MODIFICATION 2: Update save handler to use async context functions
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

    // MODIFICATION 3: Update delete handler
    const confirmDelete = async () => {
        await deleteJob(jobToDelete.id);
        setIsDeleteModalOpen(false);
        setJobToDelete(null);
    };
    
    const handleArchiveClick = (job) => {
        setJobToArchive(job);
        setIsArchiveModalOpen(true);
    };

    // MODIFICATION 4: Update archive handler (it's an update operation)
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

    const filteredJobs = useMemo(() => jobs.filter(j => {
        const matchesSearch = (j.projectName?.toLowerCase() || '').includes(debouncedSearchTerm.toLowerCase()) ||
            (j.projectNumber?.toLowerCase() || '').includes(debouncedSearchTerm.toLowerCase()) ||
            (j.itemName?.toLowerCase() || '').includes(debouncedSearchTerm.toLowerCase()) ||
            (j.client?.toLowerCase() || '').includes(debouncedSearchTerm.toLowerCase());
        const matchesArchive = showArchived ? j.archived : !j.archived;
        const matchesDiscipline = filterDiscipline.length === 0 || filterDiscipline.includes(j.discipline);
        const matchesStatus = filterStatus.length === 0 || filterStatus.includes(j.status);
        return matchesSearch && matchesArchive && matchesDiscipline && matchesStatus;
    }), [jobs, debouncedSearchTerm, showArchived, filterDiscipline, filterStatus]);

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

    const paginatedJobs = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedJobs.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedJobs, currentPage, itemsPerPage]);

    const totalPages = useMemo(() => {
        if (!sortedJobs || sortedJobs.length === 0) return 0;
        return Math.ceil(sortedJobs.length / itemsPerPage);
    }, [sortedJobs, itemsPerPage]);

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

    const uniqueDisciplines = [...new Set(jobs.map(j => j.discipline))];
    
    const clearFilters = () => {
        setFilterDiscipline([]);
        setFilterStatus([]);
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
    
    // MODIFICATION 5: Add loading and error states
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

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div></div>
                <div className="w-full md:w-auto flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="text" placeholder="Search jobs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
                    </div>
                    <div className="flex gap-2">
                         <div className="relative" ref={filterRef}>
                            <Button variant="outline" onClick={() => setIsFilterOpen(!isFilterOpen)}>
                                <Filter size={16} className="mr-2" /> Filter
                            </Button>
                            {isFilterOpen && (
                                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 p-4 space-y-4">
                                    <div>
                                        <h4 className="font-semibold mb-2">Discipline</h4>
                                        {uniqueDisciplines.map(d => <label key={d} className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={filterDiscipline.includes(d)} onChange={() => setFilterDiscipline(prev => prev.includes(d) ? prev.filter(i => i !== d) : [...prev, d])} className="rounded text-orange-500"/><span>{d}</span></label>)}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold mb-2">Status</h4>
                                        {jobStatuses.map(s => <label key={s} className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={filterStatus.includes(s)} onChange={() => setFilterStatus(prev => prev.includes(s) ? prev.filter(i => i !== s) : [...prev, s])} className="rounded text-orange-500"/><span>{s}</span></label>)}
                                    </div>
                                    <Button variant="outline" size="sm" className="w-full mt-3" onClick={clearFilters}>Clear Filters</Button>
                                </div>
                            )}
                        </div>
                        {canCreateProjects && (
                            <Button onClick={openNewJobModal}><PlusCircle size={16} className="mr-2"/>Add Job</Button>
                        )}
                    </div>
                </div>
            </div>
             <div className="flex items-center mb-4">
                 <label htmlFor="show-archived-jobs" className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Show Archived Jobs</label>
                 <Switch id="show-archived-jobs" isChecked={showArchived} onToggle={() => setShowArchived(!showArchived)} />
             </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            {tableHeaders.map(header => (
                                <th key={header.key} scope="col" className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => requestSort(header.key)}>
                                    <div className="flex items-center">{header.label}<span className="ml-2">{getSortIndicator(header.key)}</span></div>
                                </th>
                            ))}
                            <th className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedJobs.map(job => (
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
            <Pagination currentPage={currentPage} setCurrentPage={setCurrentPage} totalPages={totalPages} itemsPerPage={itemsPerPage} setItemsPerPage={setItemsPerPage} totalItems={sortedJobs.length} />
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
    );
};

// JobModal has been extracted to src/components/modals/JobModal.jsx

const UserAdminPage = () => {
    // MODIFICATION 1: Get data and functions from the new useUsers hook
    const { users, addUser, updateUser, deleteUser, loading, error } = useUsers();
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
    const privileges = userPrivileges[currentUser.privilege];
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
            const newUser = { 
                ...userRecord, 
                avatar: userRecord.name.split(' ').map(n => n[0]).join(''),
            };
            await addUser(newUser);
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
    const [formData, setFormData] = useState({ name: '', username: '', email: '', privilege: 'Viewer', teamRole: 'site_team', password: '' });
    const { teamRoles, loading: teamRolesLoading } = useTeamRoles();

    useEffect(() => {
        if (user) {
            // When editing, map snake_case from DB to camelCase for the form state
            setFormData({ name: user.name, username: user.username, email: user.email, privilege: user.privilege, teamRole: user.team_role, password: user.password || '' });
        } else {
            // Set default to first available team role or fallback
            const defaultTeamRole = teamRoles.length > 0 ? teamRoles[0].value : 'site_team';
            setFormData({ name: '', username: '', email: '', privilege: 'Viewer', teamRole: defaultTeamRole, password: '' });
        }
    }, [user, isOpen, teamRoles]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={user ? 'Edit User' : 'Add User'}>
            <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input label="Full Name" name="name" value={formData.name} onChange={handleChange} required />
                    <Input label="Username" name="username" value={formData.username} onChange={handleChange} required />
                    <Input label="Email" name="email" type="email" value={formData.email} onChange={handleChange} required />
                    <Input 
                        label="Password" 
                        name="password" 
                        type="password" 
                        value={formData.password} 
                        onChange={handleChange} // This line was added
                        placeholder={user ? "Leave blank to keep unchanged" : ""} 
                        required={!user} 
                    />
                    <Select label="Privilege" name="privilege" value={formData.privilege} onChange={handleChange}>
                        {Object.keys(userPrivileges).map(p => <option key={p}>{p}</option>)}
                    </Select>
                    <Select label="Team Role" name="teamRole" value={formData.teamRole} onChange={handleChange}>
                        {teamRolesLoading ? (
                            <option>Loading...</option>
                        ) : (
                            teamRoles.map(role => <option key={role.value} value={role.value}>{role.display_text}</option>)
                        )}
                    </Select>
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
        error: subscriptionError
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
        { id: 'overview', label: 'Overview' },
        { id: 'tasks', label: 'Tasks' },
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
                {activeTab === 'overview' && <ProjectOverview project={project} onUpdate={updateProject} canEdit={privileges.canEditProjects} />}
                {activeTab === 'tasks' && <ProjectTasks project={project} canEdit={privileges.canEditProjects} />}
                {activeTab === 'files' && <ProjectFiles projectId={project.id} />}
            </div>
        </div>
    );
};

const ProjectOverview = ({ project, onUpdate, canEdit }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState(project);

    useEffect(() => {
        setFormData(project);
    }, [project]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        onUpdate(formData);
        setIsEditing(false);
    };

    return (
        <div className="space-y-6">
            {canEdit && (
                <div className="flex justify-end">
                    {isEditing ? (
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => { setIsEditing(false); setFormData(project); }}>Cancel</Button>
                            <Button onClick={handleSave}>Save Changes</Button>
                        </div>
                    ) : (
                        <Button variant="outline" onClick={() => setIsEditing(true)}>Edit Details</Button>
                    )}
                </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold mb-4">Project Description</h3>
                    {isEditing ? (
                        <textarea name="description" value={formData.description} onChange={handleInputChange} rows="5" className="w-full p-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"></textarea>
                    ) : (
                        <p className="text-sm text-gray-600 dark:text-gray-400">{project.description}</p>
                    )}
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold mb-4">Key Dates</h3>
                    <div className="text-sm space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500">Created</label>
                            {isEditing ? <Input type="date" name="date_created" value={formData.date_created} onChange={handleInputChange} /> : <p>{project.date_created}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500">Start Date</label>
                            {isEditing ? <Input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} /> : <p>{project.startDate}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500">Target Completion</label>
                            {isEditing ? <Input type="date" name="targetDate" value={formData.targetDate} onChange={handleInputChange} /> : <p>{project.targetDate}</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProjectTasks = ({ project, canEdit }) => {
    const { updateProject } = useProjects();
    const [isEditing, setIsEditing] = useState(false);
    const [tasksText, setTasksText] = useState(project.tasksText || '');

    useEffect(() => {
        setTasksText(project.tasksText || '');
    }, [project.tasksText]);

    const handleSave = () => {
        updateProject({ ...project, tasksText });
        setIsEditing(false);
    };

    const handleCancel = () => {
        setTasksText(project.tasksText || '');
        setIsEditing(false);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
            <div className="p-4 flex justify-between items-center border-b dark:border-gray-700">
                <h3 className="font-semibold">Tasks & Notes</h3>
                {canEdit && (
                    isEditing ? (
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
                            <Button onClick={handleSave}>Save</Button>
                        </div>
                    ) : (
                        <Button variant="outline" onClick={() => setIsEditing(true)}>Edit</Button>
                    )
                )}
            </div>
            <div className="p-4">
                {isEditing ? (
                    <textarea
                        value={tasksText}
                        onChange={(e) => setTasksText(e.target.value)}
                        rows="15"
                        className="w-full p-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Enter a list of tasks or any relevant information..."
                    />
                ) : (
                    <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-sans">
                        {tasksText || 'No tasks or notes have been added yet.'}
                    </pre>
                )}
            </div>
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

// Privilege Page Component
const PrivilegePage = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('Viewer');
    const [isEditMode, setIsEditMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [currentPermissions, setCurrentPermissions] = useState({});
    const [permissionChanges, setPermissionChanges] = useState({});
    const [loading, setLoading] = useState(true);

    const privilegeLevels = [
        { id: 'Viewer', name: 'Viewer' },
        { id: 'Viewer+', name: 'Viewer+' },
        { id: 'Editor', name: 'Editor' },
        { id: 'Editor+', name: 'Editor+' },
        { id: 'Admin', name: 'Admin' },
    ];

    // Load permissions from database for current tab
    useEffect(() => {
        const fetchPermissions = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('privilege_permissions')
                    .select('*')
                    .eq('privilege_level', activeTab)
                    .order('display_order', { ascending: true });

                if (error) throw error;

                // Group by category
                const groupedPermissions = {};
                data.forEach(perm => {
                    if (!groupedPermissions[perm.permission_category]) {
                        groupedPermissions[perm.permission_category] = [];
                    }
                    groupedPermissions[perm.permission_category].push({
                        permission: perm.permission_key,
                        label: perm.permission_label,
                        has: perm.is_granted
                    });
                });

                setCurrentPermissions(groupedPermissions);
                setPermissionChanges({});
            } catch (error) {
                console.error('Error fetching permissions:', error);
                showToast('Failed to load permissions', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchPermissions();
    }, [activeTab, showToast]);

    const handleTogglePermission = (permissionKey, currentValue) => {
        setPermissionChanges(prev => ({
            ...prev,
            [permissionKey]: !currentValue
        }));
    };

    const handleSave = async () => {
        if (Object.keys(permissionChanges).length === 0) {
            showToast('No changes to save', 'info');
            return;
        }

        setIsSaving(true);
        try {
            console.log('💾 Starting permission save...', {
                activeTab,
                changes: permissionChanges,
                user: user?.email,
                userPrivilege: user?.privilege
            });

            // Prepare bulk updates
            const updates = Object.entries(permissionChanges).map(([permissionKey, isGranted]) => ({
                permission_key: permissionKey,
                privilege_level: activeTab,
                is_granted: isGranted
            }));

            console.log('💾 Prepared updates:', updates);

            // Perform all updates
            const promises = updates.map(({ permission_key, privilege_level, is_granted }) =>
                supabase
                    .from('privilege_permissions')
                    .update({ is_granted })
                    .eq('permission_key', permission_key)
                    .eq('privilege_level', privilege_level)
            );

            const results = await Promise.all(promises);
            console.log('💾 Update results:', results);

            // Check if any failed
            const failed = results.filter(r => r.error);
            if (failed.length > 0) {
                console.error('❌ Some updates failed:', failed.map(f => f.error));
                throw new Error(`${failed.length} updates failed: ${failed[0].error.message}`);
            }

            showToast('Permissions updated successfully', 'success');
            setIsEditMode(false);
            setPermissionChanges({});

            // Reload permissions
            const { data, error } = await supabase
                .from('privilege_permissions')
                .select('*')
                .eq('privilege_level', activeTab)
                .order('display_order', { ascending: true });

            if (error) throw error;

            // Group by category
            const groupedPermissions = {};
            data.forEach(perm => {
                if (!groupedPermissions[perm.permission_category]) {
                    groupedPermissions[perm.permission_category] = [];
                }
                groupedPermissions[perm.permission_category].push({
                    permission: perm.permission_key,
                    label: perm.permission_label,
                    has: perm.is_granted
                });
            });

            setCurrentPermissions(groupedPermissions);
        } catch (error) {
            console.error('Error updating permissions:', error);
            showToast('Failed to update permissions', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setIsEditMode(false);
        setPermissionChanges({});
    };

    const getPermissionValue = (permissionKey, originalValue) => {
        if (permissionChanges.hasOwnProperty(permissionKey)) {
            return permissionChanges[permissionKey];
        }
        return originalValue;
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Privilege Overview</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        {isEditMode ? 'Edit permissions for each privilege role' : 'View the permissions and access levels for each privilege role'}
                    </p>
                </div>
                <div className="flex gap-2">
                    {!isEditMode ? (
                        <button
                            onClick={() => setIsEditMode(true)}
                            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
                        >
                            <Edit className="h-4 w-4" />
                            Edit Permissions
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={handleCancel}
                                disabled={isSaving}
                                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving || Object.keys(permissionChanges).length === 0}
                                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Check className="h-4 w-4" />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                <div className="flex flex-wrap gap-2">
                    {privilegeLevels.map((level) => (
                        <button
                            key={level.id}
                            onClick={() => {
                                if (!isEditMode || Object.keys(permissionChanges).length === 0) {
                                    setActiveTab(level.id);
                                } else {
                                    if (confirm('You have unsaved changes. Do you want to discard them?')) {
                                        setPermissionChanges({});
                                        setIsEditMode(false);
                                        setActiveTab(level.id);
                                    }
                                }
                            }}
                            className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
                                activeTab === level.id
                                    ? 'bg-orange-500 text-white'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                        >
                            {level.name}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                </div>
            ) : (
                <>
                    {/* Permission Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {Object.entries(currentPermissions).map(([category, permissions]) => (
                            <div key={category} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{category}</h2>
                                <div className="space-y-3">
                                    {permissions.map((perm) => {
                                        const currentValue = getPermissionValue(perm.permission, perm.has);
                                        return (
                                            <div key={perm.permission} className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 flex-1">
                                                    {!isEditMode && (
                                                        currentValue ? (
                                                            <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                                                        ) : (
                                                            <X className="h-5 w-5 text-red-500 flex-shrink-0" />
                                                        )
                                                    )}
                                                    <span className={`text-sm ${
                                                        currentValue
                                                            ? 'text-gray-900 dark:text-white'
                                                            : 'text-gray-500 dark:text-gray-500'
                                                    }`}>
                                                        {perm.label}
                                                    </span>
                                                </div>
                                                {isEditMode && (
                                                    <button
                                                        onClick={() => handleTogglePermission(perm.permission, perm.has)}
                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                            currentValue ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                                                        }`}
                                                    >
                                                        <span
                                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                                currentValue ? 'translate-x-6' : 'translate-x-1'
                                                            }`}
                                                        />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Summary */}
                    {!isEditMode && (
                        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">
                                {PERMISSION_DESCRIPTIONS[activeTab]?.title} Summary
                            </h3>
                            <p className="text-blue-800 dark:text-blue-400 mb-4">
                                {PERMISSION_DESCRIPTIONS[activeTab]?.description}
                            </p>
                            <div className="space-y-1">
                                {PERMISSION_DESCRIPTIONS[activeTab]?.capabilities.map((capability, index) => (
                                    <p key={index} className="text-sm text-blue-700 dark:text-blue-300">
                                        {capability}
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Edit Mode Info */}
                    {isEditMode && Object.keys(permissionChanges).length > 0 && (
                        <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                            <p className="text-yellow-800 dark:text-yellow-400 text-sm">
                                You have {Object.keys(permissionChanges).length} unsaved change{Object.keys(permissionChanges).length > 1 ? 's' : ''}.
                                Click "Save Changes" to apply them.
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
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
            case 'Equipment Calendar': return can('VIEW_EQUIPMENT_CALENDAR') ? <Suspense fallback={<LoadingFallback />}><EquipmentCalendarPage onViewProject={handleViewProject} /></Suspense> : <AccessDenied />;
            case 'Project Tasks': return can('VIEW_TASKS') ? <ProjectTasksPage /> : <AccessDenied />;
            case 'Equipment': return can('VIEW_EQUIPMENT') ? <EquipmentPage /> : <AccessDenied />;
            case 'Vehicles': return can('VIEW_VEHICLES') ? <VehiclesPage /> : <AccessDenied />;
            case 'Delivery Tracker': return <DeliveryTrackerPage />;
            case 'Delivery Tasks': return <DeliveryTasksPage />;
            case 'Project Logs': return can('VIEW_ANALYTICS') ? <Suspense fallback={<LoadingFallback />}><ProjectLogsPage /></Suspense> : <AccessDenied />;
            case 'Resource': return can('VIEW_ANALYTICS') ? <Suspense fallback={<LoadingFallback />}><ResourceAnalyticsPage /></Suspense> : <AccessDenied />;
            case 'AFV': return can('VIEW_ANALYTICS') ? <Suspense fallback={<LoadingFallback />}><AFVPage /></Suspense> : <AccessDenied />;
            case 'Document Hub': return can('VIEW_DOCUMENT_HUB') ? <DocumentHubPage /> : <AccessDenied />;
            case 'Video Tutorials': return <VideoTutorialsPage />;
            case 'Rail Components': return <RailComponentsPage />;
            case 'User Contacts': return <UserContactsPage />;
            case 'Useful Contacts': return <UsefulContactsPage />;
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
                <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} setActiveTab={setActiveTab} activeTab={activeTab} />
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
            {!isChatbotVisible && (
                <button
                    onClick={() => setIsChatbotVisible(true)}
                    className="fixed bottom-4 right-4 bg-orange-500 text-white p-4 rounded-full shadow-lg hover:bg-orange-600 z-40"
                >
                    <MessageSquare size={24} />
                </button>
            )}
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
      case 'Project Tasks':
        return <ProjectTasksPage />;
      case 'Equipment':
        return <EquipmentPage />;
      case 'Vehicles':
        return <VehiclesPage />;
      case 'Delivery Tracker':
        return <DeliveryTrackerPage />;
      case 'Delivery Tasks':
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
