import React, { useState, useEffect, createContext, useContext, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart as BarChartIcon, Users, Settings, Search, Bell, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, PlusCircle, Filter, Edit, Trash2, FileText, FileSpreadsheet, Presentation, Sun, Moon, LogOut, Upload, Download, MoreVertical, X, FolderKanban, File, Archive, Copy, ClipboardCheck, ClipboardList, Bug, ClipboardPaste, History, ArchiveRestore, TrendingUp, Shield, Palette, Loader2, Megaphone, Calendar, AlertTriangle, FolderOpen, List, MessageSquare, Wrench, BookUser, Phone, Check } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BarChart, Bar, PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis } from 'recharts';
import { supabase } from './supabaseClient';
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
import { sendAnnouncementFCMNotification, sendDeliveryTaskAssignmentNotification, sendProjectTaskAssignmentNotification } from './utils/fcmNotifications';
import { notificationManager } from './utils/realTimeNotifications';
import { getDepartmentColor, getAvatarText, getAvatarProps } from './utils/avatarColors';
import { handleSupabaseError, isRLSError } from './utils/rlsErrorHandler';
import { useFcm } from './hooks/useFcm';
import { useSubscription } from './hooks/useSubscription';
import { usePermissions } from './hooks/usePermissions';
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
import FeedbackPage from './pages/FeedbackPage';
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

    return (
        <>
            <header className="flex items-center justify-between h-16 px-4 md:px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
                <div className="flex items-center">
                    <button onClick={onMenuClick} className="md:hidden mr-4 text-gray-500 dark:text-gray-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
                    </button>
                </div>
                <div className="flex items-center space-x-4">
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
        canAccessAdmin,
        canAccessFeedback,
        canAccessUserAdmin,
        canAccessDocumentManagement,
        canAccessDropdownMenu,
        canAccessAuditTrail
    } = usePermissions();
    const [isAdminMode, setIsAdminMode] = useState(false);
    const sidebarRef = useRef(null);

    // Check if user can access admin mode
    const isAdminUser = canAccessAdmin();

    // Regular navigation items (visible to all users)
    const regularNavItems = [
        { name: 'Dashboard', icon: BarChartIcon, show: true },
        { name: 'Projects', icon: FolderKanban, show: true },
        { name: 'Announcements', icon: Megaphone, show: true },
        {
            name: 'Project Team',
            icon: FolderOpen,
            show: true,
            isGroup: true,
            subItems: [
                { name: 'Resource Calendar', parent: 'Project Team' },
                { name: 'Project Tasks', parent: 'Project Team' },
                { name: 'Equipment', parent: 'Project Team' },
                { name: 'Vehicles', parent: 'Project Team' }
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
                { name: 'Document Hub', parent: 'Training Centre' },
                { name: 'Video Tutorials', parent: 'Training Centre' }
            ]
        },
        {
            name: 'Contact Details',
            icon: BookUser,
            show: true,
            isGroup: true,
            subItems: [
                { name: 'User Contacts', parent: 'Contact Details' },
                { name: 'Useful Contacts', parent: 'Contact Details' }
            ]
        },
        { name: 'Analytics', icon: TrendingUp, show: true },
        { name: 'Settings', icon: Settings, show: true },
    ];

    // Admin-specific navigation items (only visible in admin mode)
    const adminNavItems = [
        { name: 'Feedback', icon: Bug, show: canAccessFeedback },
        { name: 'User Admin', icon: Users, show: canAccessUserAdmin },
        { name: 'Document Management', icon: FileText, show: canAccessDocumentManagement },
        { name: 'Dropdown Menu', icon: List, show: canAccessDropdownMenu },
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
    const isProjectTeamActive = activeTab === 'Resource Calendar' || activeTab === 'Project Tasks' || activeTab === 'Equipment' || activeTab === 'Vehicles';
    const isTrainingCentreActive = activeTab === 'Document Hub' || activeTab === 'Video Tutorials';
    const isContactDetailsActive = activeTab === 'User Contacts' || activeTab === 'Useful Contacts';

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
                                    {item.subItems.map(subItem => (
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
        </aside>
    );
};

// --- SHARED COMPONENTS ---
// Card component moved to src/components/ui/index.jsx

// --- PAGE COMPONENTS ---
const AnnouncementsPage = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedPriority, setSelectedPriority] = useState('All');
    const [announcementToDelete, setAnnouncementToDelete] = useState(null);
    const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
    const [categories, setCategories] = useState([]);
    const { user } = useAuth();
    const { showSuccessModal, showErrorModal } = useToast();
    const { markAsRead, refreshNotifications, announcementRefreshTrigger } = useNotifications();
    const { canCreateProjects, canEditProjects, canDeleteProjects } = usePermissions();

    console.log('📢 [FILTER] AnnouncementsPage rendered, categories state:', categories);

    const fetchAnnouncements = async () => {
        try {
            const { data, error } = await supabase
                .from('announcements')
                .select(`
                    *,
                    author:users!author_id(name, username, avatar),
                    announcement_reads!left (
                        read_at,
                        dismissed_at,
                        user_id
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) {
                // If table doesn't exist, just set empty announcements
                if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('does not exist')) {
                    console.warn('Announcements table does not exist yet. Please create it in your Supabase database.');
                    setAnnouncements([]);
                    setLoading(false);
                    return;
                }
                throw error;
            }

            const processedData = (data || []).map(announcement => {
                const userRead = announcement.announcement_reads?.find(read => read.user_id === user?.id);
                return {
                    ...announcement,
                    author_name: 'System', // Fallback since we removed the join
                    isRead: !!userRead?.read_at, // Check if current user has read this announcement
                    readCount: announcement.announcement_reads?.length || 0 // Count of total reads
                };
            });

            setAnnouncements(processedData);
        } catch (error) {
            console.error('Error fetching announcements:', error);
            setAnnouncements([]);
        } finally {
            setLoading(false);
        }
    };

    // Fetch announcement categories from database
    const fetchCategories = async () => {
        try {
            console.log('📢 [FILTER] Fetching announcement categories for filter...');

            // First, let's see what categories exist in the database
            const { data: allCategories, error: allError } = await supabase
                .from('dropdown_categories')
                .select('name');

            console.log('📢 [FILTER] Available dropdown categories:', allCategories);

            if (allError) {
                console.log('📢 [FILTER] Error fetching dropdown_categories (table may not exist):', allError.message);
                console.log('📢 [FILTER] Using hardcoded fallback due to table access error');
                setCategories(['General', 'Safety', 'Equipment', 'Policy', 'Training', 'Project Updates', 'Maintenance']);
                return;
            }

            if (!allCategories || allCategories.length === 0) {
                console.log('📢 [FILTER] No dropdown categories found in database - using hardcoded fallback');
                setCategories(['General', 'Safety', 'Equipment', 'Policy', 'Training', 'Project Updates', 'Maintenance']);
                return;
            }

            // Try different possible variations of announcement category names
            const possibleNames = [
                'announcement_category',  // Your database has this one!
                'announcement category',
                'Announcement Category',
                'Announcement',
                'announcement',
                'Category',
                'category'
            ];

            let foundData = null;
            let foundCategoryName = null;

            for (const categoryName of possibleNames) {
                console.log(`📢 [FILTER] Trying category name: "${categoryName}"`);
                const { data, error } = await supabase
                    .from('dropdown_items')
                    .select(`
                        display_text,
                        dropdown_categories!inner(name)
                    `)
                    .eq('dropdown_categories.name', categoryName)
                    .eq('is_active', true)
                    .order('sort_order');

                if (!error && data && data.length > 0) {
                    console.log(`📢 [FILTER] SUCCESS! Found categories with name "${categoryName}":`, data);
                    foundData = data;
                    foundCategoryName = categoryName;
                    break;
                } else if (error) {
                    console.log(`📢 [FILTER] Error with "${categoryName}":`, error.message);
                } else {
                    console.log(`📢 [FILTER] No data found for "${categoryName}"`);
                }
            }

            if (foundData && foundData.length > 0) {
                console.log(`📢 [FILTER] Using categories from "${foundCategoryName}":`, foundData.map(cat => cat.display_text));
                setCategories(foundData.map(cat => cat.display_text));
            } else {
                console.log('📢 [FILTER] No announcement categories found in any variation.');
                console.log('📢 [FILTER] Available category names to try:', allCategories.map(cat => cat.name));
                console.log('📢 [FILTER] ✅ Found "announcement_category" category but it has NO ITEMS!');
                console.log('📢 [FILTER] ⚠️  ACTION NEEDED: Go to Dropdown Menu Management → announcement_category');
                console.log('📢 [FILTER] ➕ ADD THESE ITEMS: General, Safety, Equipment, Policy, Training, Project Updates, Maintenance');
                console.log('📢 [FILTER] 🔄 Then refresh this page - the dropdown will work automatically!');
                console.log('📢 [FILTER] Using hardcoded fallback for now');
                setCategories(['General', 'Safety', 'Equipment', 'Policy', 'Training', 'Project Updates', 'Maintenance']);
            }
        } catch (error) {
            console.error('📢 [FILTER] Error fetching announcement categories:', error);
            // Fallback to hardcoded categories
            setCategories(['General', 'Safety', 'Equipment', 'Policy', 'Training', 'Project Updates', 'Maintenance']);
        }
    };

    useEffect(() => {
        if (user) {
            fetchAnnouncements();
            fetchCategories();
        }
    }, [user]);

    // Debug: Log categories whenever they change
    useEffect(() => {
        console.log('📢 [FILTER] Categories state updated:', categories);
    }, [categories]);

    // Refresh announcements when markAllAsRead is called from notification bell
    useEffect(() => {
        if (user && announcementRefreshTrigger > 0) {
            fetchAnnouncements();
        }
    }, [announcementRefreshTrigger, user]);

    const handleMarkAsRead = async (announcementId) => {
        try {
            // First check if the record already exists
            const { data: existing, error: checkError } = await supabase
                .from('announcement_reads')
                .select('id, read_at')
                .eq('announcement_id', announcementId)
                .eq('user_id', user.id)
                .maybeSingle();

            if (checkError) {
                console.error('Error checking existing read record:', checkError);
                return;
            }

            if (existing) {
                // Record exists, update it if not already marked as read
                if (!existing.read_at) {
                    const { error: updateError } = await supabase
                        .from('announcement_reads')
                        .update({ read_at: new Date().toISOString() })
                        .eq('announcement_id', announcementId)
                        .eq('user_id', user.id);

                    if (updateError) {
                        console.error('Error updating read status:', updateError);
                        return;
                    }
                }
            } else {
                // Record doesn't exist, insert it
                const { error: insertError } = await supabase
                    .from('announcement_reads')
                    .insert({
                        announcement_id: announcementId,
                        user_id: user.id,
                        read_at: new Date().toISOString()
                    });

                if (insertError) {
                    console.error('Error inserting read record:', insertError);
                    return;
                }
            }

            fetchAnnouncements();
        } catch (error) {
            console.error('Error marking announcement as read:', error);
        }
    };

    const handleMarkAsReadPage = async (announcementId) => {
        try {
            // Use the NotificationContext markAsRead function
            await markAsRead(announcementId);
            
            // Refresh both the announcements page and notifications
            await fetchAnnouncements();
            await refreshNotifications();
        } catch (error) {
            console.error('Error marking announcement as read:', error);
            showErrorModal('Error marking announcement as read', 'Error');
        }
    };

    const handleDelete = (announcementId) => {
        setAnnouncementToDelete(announcementId);
        setIsDeleteConfirmModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!announcementToDelete) return;

        try {
            const { error } = await supabase
                .from('announcements')
                .delete()
                .eq('id', announcementToDelete);

            if (error) throw error;

            fetchAnnouncements();
            showSuccessModal('Announcement deleted successfully', 'Success');
        } catch (error) {
            console.error('Error deleting announcement:', error);
            showErrorModal('Error deleting announcement', 'Error');
        } finally {
            setIsDeleteConfirmModalOpen(false);
            setAnnouncementToDelete(null);
        }
    };

    const filteredAnnouncements = announcements.filter(announcement => {
        const matchesSearch = announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            announcement.content.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || announcement.category === selectedCategory;
        const matchesPriority = selectedPriority === 'All' || announcement.priority === selectedPriority.toLowerCase();

        // Hide feedback announcements from non-super admins
        const isSuperAdmin = user?.email === 'colin.rogers@inorail.co.uk';
        const isFeedbackAnnouncement = announcement.category === 'Feedback';
        const showFeedback = !isFeedbackAnnouncement || isSuperAdmin;

        return matchesSearch && matchesCategory && matchesPriority && showFeedback;
    });

    if (loading) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="ml-2">Loading announcements...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Announcements</h1>
                    <p className="text-gray-600 dark:text-gray-400">Company-wide announcements and updates</p>
                </div>
                {canCreateProjects && (
                    <Button onClick={() => setIsCreateModalOpen(true)} className="w-full sm:w-auto">
                        <PlusCircle size={16} className="mr-2" />
                        New Announcement
                    </Button>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                    <div className="flex-1">
                        <Input
                            placeholder="Search announcements..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full"
                        />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                            <option value="All">All Categories</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </Select>
                        <Select value={selectedPriority} onChange={(e) => setSelectedPriority(e.target.value)}>
                            <option value="All">All Priorities</option>
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Urgent">Urgent</option>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Announcements List */}
            <div className="space-y-4">
                {filteredAnnouncements.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl">
                        <Megaphone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No announcements found</h3>
                        <p className="text-gray-500 dark:text-gray-400">
                            {searchTerm || selectedCategory !== 'All' || selectedPriority !== 'All' 
                                ? 'Try adjusting your filters'
                                : 'No announcements have been created yet'
                            }
                        </p>
                    </div>
                ) : (
                    filteredAnnouncements.map(announcement => {
                        const priority = ANNOUNCEMENT_PRIORITIES[announcement.priority];
                        return (
                            <div
                                key={announcement.id}
                                className={`bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 ${
                                    !announcement.isRead ? 'border-l-4 border-l-orange-500' : ''
                                }`}
                            >
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white break-words">
                                                {announcement.title}
                                            </h3>
                                            {!announcement.isRead && (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-400 self-start">
                                                    New
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                                            <span className="flex items-center gap-1">
                                                👤 By {announcement.author?.name || 'Unknown User'}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar size={14} />
                                                {new Date(announcement.created_at).toLocaleDateString()}
                                            </span>
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${priority.bg} ${priority.color}`}>
                                                {priority.label}
                                            </span>
                                            {announcement.category && (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                                    {announcement.category}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                                        {!announcement.isRead && announcement.author_id !== user?.id && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleMarkAsReadPage(announcement.id)}
                                            >
                                                Mark as Read
                                            </Button>
                                        )}
                                        {(canEditProjects || canDeleteProjects) && (announcement.author_id === user.id || user.privilege === 'Admin') && (
                                            <>
                                                {canEditProjects && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedAnnouncement(announcement);
                                                            setIsEditModalOpen(true);
                                                        }}
                                                    >
                                                        <Edit size={14} />
                                                    </Button>
                                                )}
                                                {canDeleteProjects && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDelete(announcement.id)}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <Trash2 size={14} />
                                                    </Button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words overflow-wrap-anywhere">
                                    {announcement.content}
                                </div>
                                {announcement.expires_at && (
                                    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-500/10 rounded-lg flex items-center gap-2">
                                        <AlertTriangle size={16} className="text-yellow-500" />
                                        <span className="text-sm text-yellow-700 dark:text-yellow-300">
                                            Expires: {new Date(announcement.expires_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                )}
                                {announcement.target_roles && (
                                    <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                                        Target audience: {announcement.target_roles.join(', ')}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Create Announcement Modal */}
            <AnnouncementModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSave={fetchAnnouncements}
                announcement={null}
            />

            {/* Edit Announcement Modal */}
            <AnnouncementModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedAnnouncement(null);
                }}
                onSave={fetchAnnouncements}
                announcement={selectedAnnouncement}
            />

            {/* Custom Confirmation Modals */}
            <CustomConfirmationModal
                isOpen={isDeleteConfirmModalOpen}
                onClose={() => {
                    setIsDeleteConfirmModalOpen(false);
                    setAnnouncementToDelete(null);
                }}
                onConfirm={confirmDelete}
                title="Delete Announcement"
                message={`Are you sure you want to permanently delete this announcement? This action cannot be undone and the announcement will be removed for all users.${announcementToDelete && user.privilege === 'Admin' ? ' (Admin override - deleting another user\'s announcement)' : ''}`}
                confirmText="Delete Permanently"
                cancelText="Keep Announcement"
                type="danger"
            />
        </div>
    );
};

const AnnouncementModal = ({ isOpen, onClose, onSave, announcement }) => {
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        category: 'General',
        priority: 'medium',
        target_roles: [],
        expires_at: ''
    });
    const [loading, setLoading] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [categories, setCategories] = useState([]);
    const { user } = useAuth();
    const { showSuccessModal, showErrorModal } = useToast();

    // Fetch departments from database
    const fetchDepartments = async () => {
        try {
            console.log('📢 Fetching departments for announcements...');
            const { data, error } = await supabase
                .from('dropdown_items')
                .select(`
                    display_text,
                    dropdown_categories!inner(name)
                `)
                .eq('dropdown_categories.name', 'department')
                .eq('is_active', true)
                .order('sort_order');

            if (error) {
                console.error('Error fetching departments:', error);
                // Try with capitalized name as fallback
                console.log('📢 Trying with capitalized "Department"...');
                const { data: capitalData, error: capitalError } = await supabase
                    .from('dropdown_items')
                    .select(`
                        display_text,
                        dropdown_categories!inner(name)
                    `)
                    .eq('dropdown_categories.name', 'Department')
                    .eq('is_active', true)
                    .order('sort_order');

                if (capitalError) {
                    console.error('Error fetching departments with capital D:', capitalError);
                    setDepartments([]);
                    return;
                }

                if (capitalData && capitalData.length > 0) {
                    console.log('📢 Found departments with capital D:', capitalData);
                    setDepartments(capitalData.map(dept => dept.display_text));
                } else {
                    console.log('No departments found with capital D either');
                    setDepartments([]);
                }
                return;
            }

            if (data && data.length > 0) {
                console.log('📢 Found departments:', data);
                setDepartments(data.map(dept => dept.display_text));
            } else {
                console.log('No departments found in database');
                setDepartments([]);
            }
        } catch (error) {
            console.error('Error fetching departments:', error);
            setDepartments([]);
        }
    };

    // Fetch announcement categories from database
    const fetchCategories = async () => {
        try {
            console.log('📢 [MODAL] Fetching announcement categories...');

            // First, let's see what categories exist in the database
            const { data: allCategories, error: allError } = await supabase
                .from('dropdown_categories')
                .select('name');

            console.log('📢 [MODAL] Available dropdown categories:', allCategories);

            if (allError) {
                console.log('📢 [MODAL] Error fetching dropdown_categories (table may not exist):', allError.message);
                console.log('📢 [MODAL] Using hardcoded fallback due to table access error');
                setCategories(['General', 'Safety', 'Equipment', 'Policy', 'Training', 'Project Updates', 'Maintenance']);
                return;
            }

            if (!allCategories || allCategories.length === 0) {
                console.log('📢 [MODAL] No dropdown categories found in database - using hardcoded fallback');
                setCategories(['General', 'Safety', 'Equipment', 'Policy', 'Training', 'Project Updates', 'Maintenance']);
                return;
            }

            // Try different possible variations of announcement category names
            const possibleNames = [
                'announcement_category',  // Your database has this one!
                'announcement category',
                'Announcement Category',
                'Announcement',
                'announcement',
                'Category',
                'category'
            ];

            let foundData = null;
            let foundCategoryName = null;

            for (const categoryName of possibleNames) {
                console.log(`📢 [MODAL] Trying category name: "${categoryName}"`);
                const { data, error } = await supabase
                    .from('dropdown_items')
                    .select(`
                        display_text,
                        dropdown_categories!inner(name)
                    `)
                    .eq('dropdown_categories.name', categoryName)
                    .eq('is_active', true)
                    .order('sort_order');

                if (!error && data && data.length > 0) {
                    console.log(`📢 [MODAL] SUCCESS! Found categories with name "${categoryName}":`, data);
                    foundData = data;
                    foundCategoryName = categoryName;
                    break;
                } else if (error) {
                    console.log(`📢 [MODAL] Error with "${categoryName}":`, error.message);
                } else {
                    console.log(`📢 [MODAL] No data found for "${categoryName}"`);
                }
            }

            if (foundData && foundData.length > 0) {
                console.log(`📢 [MODAL] SUCCESS! Using categories from "${foundCategoryName}":`, foundData.map(cat => cat.display_text));
                setCategories(foundData.map(cat => cat.display_text));
            } else {
                console.log('📢 [MODAL] ❌ No announcement categories found in any variation!');
                console.log('📢 [MODAL] Available dropdown categories in your database:', allCategories.map(cat => cat.name));
                console.log('📢 [MODAL] ✅ Found "announcement_category" category but it has NO ITEMS!');
                console.log('📢 [MODAL] ⚠️  ACTION NEEDED: Go to Dropdown Menu Management → announcement_category');
                console.log('📢 [MODAL] ➕ ADD THESE ITEMS: General, Safety, Equipment, Policy, Training, Project Updates, Maintenance');
                console.log('📢 [MODAL] 🔄 Then refresh this page - the dropdown will work automatically!');
                console.log('📢 [MODAL] Using hardcoded fallback for now');
                setCategories(['General', 'Safety', 'Equipment', 'Policy', 'Training', 'Project Updates', 'Maintenance']);
            }
        } catch (error) {
            console.error('📢 [MODAL] Error fetching announcement categories:', error);
            // Fallback to hardcoded categories
            setCategories(['General', 'Safety', 'Equipment', 'Policy', 'Training', 'Project Updates', 'Maintenance']);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchDepartments();
            fetchCategories();
        }
    }, [isOpen]);

    useEffect(() => {
        if (announcement) {
            setFormData({
                title: announcement.title || '',
                content: announcement.content || '',
                category: announcement.category || 'General',
                priority: announcement.priority || 'medium',
                target_roles: announcement.target_roles || [],
                expires_at: announcement.expires_at ? announcement.expires_at.split('T')[0] : ''
            });
        } else {
            setFormData({
                title: '',
                content: '',
                category: 'General',
                priority: 'medium',
                target_roles: [],
                expires_at: ''
            });
        }
    }, [announcement, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                ...formData,
                author_id: user.id,
                expires_at: formData.expires_at || null,
                target_roles: formData.target_roles.length > 0 ? formData.target_roles : null
            };

            let result;
            if (announcement) {
                result = await supabase
                    .from('announcements')
                    .update(payload)
                    .eq('id', announcement.id);
            } else {
                result = await supabase
                    .from('announcements')
                    .insert([payload]);
            }

            if (result.error) throw result.error;

            // Send FCM push notification for new announcements
            if (!announcement) {
                try {
                    const fcmResult = await sendAnnouncementFCMNotification(
                        {
                            ...formData,
                            id: result.data?.[0]?.id || 'new-announcement'
                        },
                        user.id
                    );

                    if (fcmResult.success) {
                        console.log(`FCM notifications sent to ${fcmResult.sent} subscribers`);

                        // Show success message with notification count
                        const successMessage = `Announcement created successfully! Notifications sent to ${fcmResult.sent} users.`;
                        showSuccessModal(successMessage, 'Success');
                    } else {
                        console.warn('FCM notification failed:', fcmResult.message);
                        // Still show success for announcement creation, but note notification failure
                        showSuccessModal('Announcement created successfully! (Note: Some notifications may have failed to send)', 'Success');
                    }
                } catch (notifError) {
                    console.error('Error sending FCM notification:', notifError);
                    // Don't fail the announcement creation if notifications fail
                    showSuccessModal('Announcement created successfully! (Note: Push notifications failed to send)', 'Success');
                }
            } else {
                showSuccessModal('Announcement updated successfully!', 'Success');
            }

            onSave();
            onClose();
        } catch (error) {
            console.error('Error saving announcement:', error);
            showErrorModal('Error saving announcement: ' + error.message, 'Error');
        } finally {
            setLoading(false);
        }
    };

    const handleTargetRoleChange = (role) => {
        setFormData(prev => ({
            ...prev,
            target_roles: prev.target_roles.includes(role)
                ? prev.target_roles.filter(r => r !== role)
                : [...prev.target_roles, role]
        }));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={announcement ? 'Edit Announcement' : 'Create Announcement'}>
            <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Title"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        required
                        placeholder="Announcement title"
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Content
                        </label>
                        <textarea
                            value={formData.content}
                            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                            required
                            rows={6}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            placeholder="Announcement content..."
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select
                            label="Category"
                            value={formData.category}
                            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                        >
                            {categories.length > 0 ? (
                                categories.map(category => (
                                    <option key={category} value={category}>{category}</option>
                                ))
                            ) : (
                                <>
                                    <option value="General">General (Loading...)</option>
                                    <option value="Safety">Safety</option>
                                    <option value="Equipment">Equipment</option>
                                    <option value="Policy">Policy</option>
                                    <option value="Training">Training</option>
                                    <option value="Project Updates">Project Updates</option>
                                    <option value="Maintenance">Maintenance</option>
                                </>
                            )}
                        </Select>

                        <Select
                            label="Priority"
                            value={formData.priority}
                            onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                        </Select>
                    </div>

                    <Input
                        label="Expiration Date (optional)"
                        type="date"
                        value={formData.expires_at}
                        onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Target Departments (optional - leave empty for all users)
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {departments.length > 0 ? (
                                departments.map(department => (
                                    <label key={department} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={formData.target_roles.includes(department)}
                                            onChange={() => handleTargetRoleChange(department)}
                                            className="mr-2"
                                        />
                                        <span className="text-sm">{department}</span>
                                    </label>
                                ))
                            ) : (
                                <span className="text-sm text-gray-500">Loading departments...</span>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            {announcement ? 'Update' : 'Create'} Announcement
                        </Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

// DropdownMenuPage moved to src/components/pages/DropdownMenuPage.jsx


// ProjectsPage has been extracted to src/pages/ProjectsPage.jsx
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
        const matchesSearch = (j.projectName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (j.projectNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (j.itemName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (j.client?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        const matchesArchive = showArchived ? j.archived : !j.archived;
        const matchesDiscipline = filterDiscipline.length === 0 || filterDiscipline.includes(j.discipline);
        const matchesStatus = filterStatus.length === 0 || filterStatus.includes(j.status);
        return matchesSearch && matchesArchive && matchesDiscipline && matchesStatus;
    }), [jobs, searchTerm, showArchived, filterDiscipline, filterStatus]);

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

    const totalPages = Math.ceil(sortedJobs.length / itemsPerPage);

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

const ContextMenu = ({ x, y, cellData, clipboard, onAction, onClose, canAllocate, canSetStatus }) => {
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    const hasAssignment = !!cellData.assignment;
    const isStatusAssignment = hasAssignment && cellData.assignment.type === 'status';
    const hasProjectAssignment = hasAssignment && (
        (Array.isArray(cellData.assignment) && cellData.assignment.some(a => a.type === 'project' && a.projectNumber)) ||
        (cellData.assignment.type === 'project' && cellData.assignment.projectNumber)
    );
    const canAddSecondProject = hasAssignment && (
        (!Array.isArray(cellData.assignment) && cellData.assignment.type === 'project') ||
        (Array.isArray(cellData.assignment) && cellData.assignment.length === 1 && cellData.assignment[0].type === 'project')
    );

    // Viewers can only view, no context menu actions
    if (!canAllocate && !canSetStatus) {
        return null;
    }

    return (
        <div
            ref={menuRef}
            style={{ top: y, left: x }}
            className="absolute z-50 w-40 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1"
        >
            {hasAssignment && (
                <>
                    {!isStatusAssignment && canAllocate && (
                        <>
                            <button onClick={() => onAction('copy')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><Copy size={14} className="mr-2"/>Copy</button>
                            <button onClick={() => onAction('cut')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>Cut</button>
                            {canAddSecondProject && (
                                <button onClick={() => onAction('addSecondProject')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><PlusCircle size={14} className="mr-2"/>Add Second Project</button>
                            )}
                            {hasProjectAssignment && (
                                <button onClick={() => onAction('goToProject')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><FolderKanban size={14} className="mr-2"/>Go to Project</button>
                            )}
                        </>
                    )}
                    {(canAllocate || (isStatusAssignment && canSetStatus)) && (
                        <button onClick={() => onAction('delete')} className="w-full text-left flex items-center px-4 py-2 text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700"><Trash2 size={14} className="mr-2"/>Delete</button>
                    )}
                </>
            )}
            {!hasAssignment && (
                <>
                    {canAllocate && (
                        <button onClick={() => onAction('allocate')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><PlusCircle size={14} className="mr-2"/>Allocate Resource</button>
                    )}
                    {canAllocate && clipboard.data && (
                        <button onClick={() => onAction('paste')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><ClipboardCheck size={14} className="mr-2"/>Paste</button>
                    )}
                    {canSetStatus && (
                        <>
                            <button onClick={() => onAction('setAvailable')} className="w-full text-left flex items-center px-4 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700"><Check size={14} className="mr-2"/>Available</button>
                            <button onClick={() => onAction('setNotAvailable')} className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"><X size={14} className="mr-2"/>Not Available</button>
                        </>
                    )}
                </>
            )}
        </div>
    );
};

const ResourceCalendarPage = ({ onViewProject }) => {
    const { user: currentUser } = useAuth();
    const { canAllocateResources, canSetAvailabilityStatus } = usePermissions();
    const { users: allUsers, loading: usersLoading, error: usersError } = useUsers();
    const { projects } = useProjects();
    const { showPrivilegeError, showErrorModal } = useToast();
    const [teamRoles, setTeamRoles] = useState([]);
    const [teamRolesLoading, setTeamRolesLoading] = useState(true);
    const [teamRolesError, setTeamRolesError] = useState(null);

    // Fetch team roles directly from dropdown_items table
    useEffect(() => {
        const fetchTeamRoles = async () => {
            setTeamRolesLoading(true);
            setTeamRolesError(null);
            try {
                // First get the team_role category ID
                const { data: categoryData, error: categoryError } = await supabase
                    .from('dropdown_categories')
                    .select('id')
                    .eq('name', 'team_role')
                    .single();

                if (categoryError) {
                    console.error('Error fetching team role category:', categoryError);
                    setTeamRolesError(categoryError.message);
                    setTeamRoles([]);
                    return;
                }

                // Then get the team role items
                const { data: itemsData, error: itemsError } = await supabase
                    .from('dropdown_items')
                    .select('value, display_text, sort_order')
                    .eq('category_id', categoryData.id)
                    .eq('is_active', true)
                    .order('sort_order');

                if (itemsError) {
                    console.error('Error fetching team role items:', itemsError);
                    setTeamRolesError(itemsError.message);
                    setTeamRoles([]);
                } else {
                    console.log('Successfully fetched team roles:', itemsData);
                    setTeamRoles(itemsData || []);
                }
            } catch (error) {
                console.error('Error in fetchTeamRoles:', error);
                setTeamRolesError(error.message);
                setTeamRoles([]);
            } finally {
                setTeamRolesLoading(false);
            }
        };

        fetchTeamRoles();
    }, []);

    // Fetch departments for filtering
    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                const { data, error } = await supabase
                    .from('dropdown_items')
                    .select(`
                        display_text,
                        dropdown_categories!inner(name)
                    `)
                    .eq('dropdown_categories.name', 'department')
                    .eq('is_active', true)
                    .order('sort_order');

                if (error) {
                    console.error('Error fetching departments:', error);
                    // Try with capitalized name as fallback
                    const { data: capitalData, error: capitalError } = await supabase
                        .from('dropdown_items')
                        .select(`
                            display_text,
                            dropdown_categories!inner(name)
                        `)
                        .eq('dropdown_categories.name', 'Department')
                        .eq('is_active', true)
                        .order('sort_order');

                    if (!capitalError && capitalData && capitalData.length > 0) {
                        setDepartments(capitalData.map(dept => dept.display_text));
                    } else {
                        setDepartments([]);
                    }
                    return;
                }

                if (data && data.length > 0) {
                    setDepartments(data.map(dept => dept.display_text));
                } else {
                    setDepartments([]);
                }
            } catch (error) {
                console.error('Error fetching departments:', error);
                setDepartments([]);
            }
        };

        fetchDepartments();
    }, []);

    const getTeamRoleDisplayText = (roleValue) => {
        const role = teamRoles.find(r => r.value === roleValue);
        return role ? role.display_text : roleValue;
    };

    // Get only team roles that are actually assigned to users
    const activeTeamRoles = useMemo(() => {
        if (!allUsers || allUsers.length === 0 || !teamRoles || teamRoles.length === 0) {
            return [];
        }

        // Get unique team roles from all users
        const userRoles = new Set(allUsers.map(user => user.team_role).filter(Boolean));

        // Filter teamRoles to only include roles that have users assigned
        return teamRoles.filter(role => userRoles.has(role.display_text));
    }, [allUsers, teamRoles]);

    const [allocations, setAllocations] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentWeekStart, setCurrentWeekStart] = useState(getWeekStartDate(new Date()));
    const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
    const [isManageUsersModalOpen, setIsManageUsersModalOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [selectedCell, setSelectedCell] = useState(null);
    const [visibleUserIds, setVisibleUserIds] = useState([]);
    const [filterRoles, setFilterRoles] = useState([]);
    const [filterDepartments, setFilterDepartments] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [sortOrder, setSortOrder] = useState('department');
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, cellData: null });
    const [clipboard, setClipboard] = useState({ type: null, data: null, sourceCell: null });
    const filterRef = useRef(null);
    const scrollPositionRef = useRef(0);

    // shiftColors and leaveColors imported from src/constants/index.js

    const getResourceAllocations = useCallback(async (silent = false) => {
        // Save scroll position before updating if in silent mode
        if (silent) {
            scrollPositionRef.current = window.scrollY || document.documentElement.scrollTop;
        }

        if (!silent) {
            setLoading(true);
        }
        setError(null);
        try {
            // Fetch allocations from both real users and dummy users tables
            const [realAllocationsResult, dummyAllocationsResult] = await Promise.all([
                supabase.from('resource_allocations').select('*'),
                supabase.from('dummy_resource_allocations').select('*')
            ]);

            const { data: realData, error: realError } = realAllocationsResult;
            const { data: dummyData, error: dummyError } = dummyAllocationsResult;

                if (realError && dummyError) {
                    console.error('Error fetching resource allocations:', realError, dummyError);
                    setError('Failed to fetch allocations');
                    setAllocations({});
                    return;
                }

                // Combine data from both tables
                const allData = [
                    ...(realData || []),
                    ...(dummyData || [])
                ];

                const formattedAllocations = {};

                allData.forEach(allocation => {
                    if (!allocation.allocation_date) {
                        return;
                    }
                    const dateParts = allocation.allocation_date.split('-').map(Number);
                    const allocationDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
                    const weekStart = getWeekStartDate(allocationDate);
                    const weekKey = formatDateForKey(weekStart);

                    if (!formattedAllocations[weekKey]) {
                        formattedAllocations[weekKey] = {};
                    }
                    if (!formattedAllocations[weekKey][allocation.user_id]) {
                        formattedAllocations[weekKey][allocation.user_id] = {
                            assignments: Array(7).fill(null)
                        };
                    }

                    const dayIndex = (allocationDate.getDay() + 1) % 7; // Saturday = 0, Sunday = 1, etc.

                    let assignmentData = null;
                    if (allocation.leave_type) {
                        assignmentData = {
                            type: 'leave',
                            leaveType: allocation.leave_type,
                            comment: allocation.comment || ''
                        };
                    } else if (allocation.assignment_type === 'status') {
                        assignmentData = {
                            type: 'status',
                            status: allocation.comment || ''
                        };
                    } else if (allocation.assignment_type === 'project') {
                        assignmentData = {
                            type: 'project',
                            projectNumber: allocation.project_number || '',
                            projectName: allocation.project_name || '',
                            client: allocation.client || '',
                            task: allocation.task || '',
                            shift: allocation.shift || '',
                            time: allocation.time || '',
                            comment: allocation.comment || '',
                            projectId: allocation.project_id || null
                        };
                    }

                    if (dayIndex >= 0 && dayIndex < 7) {
                        const currentAssignment = formattedAllocations[weekKey][allocation.user_id].assignments[dayIndex];

                        if (!currentAssignment) {
                            // First assignment for this day
                            formattedAllocations[weekKey][allocation.user_id].assignments[dayIndex] = assignmentData;
                        } else if (assignmentData && assignmentData.type === 'project' && currentAssignment.type === 'project') {
                            // Multiple projects - convert to array
                            if (Array.isArray(currentAssignment)) {
                                currentAssignment.push(assignmentData);
                            } else {
                                formattedAllocations[weekKey][allocation.user_id].assignments[dayIndex] = [currentAssignment, assignmentData];
                            }
                        } else if (assignmentData && assignmentData.type === 'leave') {
                            // Leave overwrites any project assignments
                            formattedAllocations[weekKey][allocation.user_id].assignments[dayIndex] = assignmentData;
                        }
                    }
                });

            setAllocations(formattedAllocations);

            // Restore scroll position after state update if in silent mode
            if (silent) {
                // Use requestAnimationFrame to ensure DOM has updated
                requestAnimationFrame(() => {
                    window.scrollTo(0, scrollPositionRef.current);
                });
            }

        } catch (err) {
            console.error('Unexpected error:', err);
            setError('Failed to load resource allocations');
            setAllocations({});
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, []); // Empty dependency array - function is stable

    useEffect(() => {
        getResourceAllocations();

        console.log('🔌 Setting up real-time subscriptions for resource allocations...');

        // Set up real-time subscriptions for resource allocations
        const realAllocationsSubscription = supabase
            .channel('resource-allocations-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'resource_allocations'
                },
                (payload) => {
                    console.log('📅 Resource allocations changed:', payload.eventType, payload);
                    console.log('🔄 Reloading resource allocations (silent)...');
                    getResourceAllocations(true); // Reload all allocations silently without showing loading state
                }
            )
            .subscribe((status) => {
                console.log('📡 Resource allocations subscription status:', status);
            });

        const dummyAllocationsSubscription = supabase
            .channel('dummy-resource-allocations-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'dummy_resource_allocations'
                },
                (payload) => {
                    console.log('📅 Dummy resource allocations changed:', payload.eventType, payload);
                    console.log('🔄 Reloading dummy resource allocations (silent)...');
                    getResourceAllocations(true); // Reload all allocations silently without showing loading state
                }
            )
            .subscribe((status) => {
                console.log('📡 Dummy resource allocations subscription status:', status);
            });

        return () => {
            console.log('🔌 Unsubscribing from resource allocations...');
            realAllocationsSubscription.unsubscribe();
            dummyAllocationsSubscription.unsubscribe();
        };
    }, [getResourceAllocations]); // Now depends on the memoized function

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setIsFilterOpen(false);
            }
             if (contextMenu.visible) {
                setContextMenu({ visible: false });
            }
        };
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, [contextMenu.visible]);

        useEffect(() => {
        if (allUsers.length > 0) {
            // This line runs whenever the allUsers list changes.
            // It gets all the current user IDs and sets them as visible.
            setVisibleUserIds((allUsers || []).map(u => u.id));
        }
    }, [allUsers]);

    const displayedUsers = useMemo(() => {
        let usersToDisplay = allUsers;

        if (filterRoles.length > 0) {
            usersToDisplay = usersToDisplay.filter(user => filterRoles.includes(user.team_role));
        }

        if (filterDepartments.length > 0) {
            usersToDisplay = usersToDisplay.filter(user => filterDepartments.includes(user.department));
        }

        usersToDisplay = usersToDisplay.filter(user => visibleUserIds.includes(user.id));

        // Apply sorting based on sortOrder
        if (sortOrder === 'alphabetical') {
            usersToDisplay.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortOrder === 'department') {
            // Custom department order
            const departmentOrder = ['Site team', 'Project team', 'Delivery team', 'Design team', 'Office staff', 'Subcontractor'];

            usersToDisplay.sort((a, b) => {
                const deptA = (a.department || '').trim();
                const deptB = (b.department || '').trim();

                // Normalize department names to handle case variations
                const deptALower = deptA.toLowerCase();
                const deptBLower = deptB.toLowerCase();

                // Get the index in the custom order (case-insensitive)
                const indexA = departmentOrder.findIndex(dept => dept.toLowerCase() === deptALower);
                const indexB = departmentOrder.findIndex(dept => dept.toLowerCase() === deptBLower);

                // If both departments are in the custom order, sort by their index
                if (indexA !== -1 && indexB !== -1) {
                    if (indexA !== indexB) {
                        return indexA - indexB;
                    }
                } else if (indexA !== -1) {
                    // A is in custom order, B is not - A comes first
                    return -1;
                } else if (indexB !== -1) {
                    // B is in custom order, A is not - B comes first
                    return 1;
                } else {
                    // Neither is in custom order, sort alphabetically by department
                    const deptComparison = deptA.localeCompare(deptB);
                    if (deptComparison !== 0) {
                        return deptComparison;
                    }
                }

                // Same department (or both missing), sort by name
                return a.name.localeCompare(b.name);
            });
        }

        return usersToDisplay;
    }, [allUsers, visibleUserIds, filterRoles, filterDepartments, sortOrder]);

    const weekDates = useMemo(() => {
        return Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));
    }, [currentWeekStart]);

    const handleCellClick = (userId, date, dayIndex) => {
        if (!canAllocateResources) return;
        setSelectedCell({ userId, date, dayIndex });
        setIsAllocationModalOpen(true);
    };

    const handleActionClick = (e, userId, dayIndex, assignment) => {
        e.stopPropagation();
        e.preventDefault();
        setContextMenu({
            visible: true,
            x: e.pageX,
            y: e.pageY,
            cellData: { userId, dayIndex, assignment, date: weekDates[dayIndex] }
        });
    };

    const handleSaveAllocation = async (allocationData, cellToUpdate = selectedCell, isSecondProject = false) => {
        const { userId } = cellToUpdate;
        const weekKey = formatDateForKey(getWeekStartDate(cellToUpdate.date));
        const dayIndex = (cellToUpdate.date.getDay() + 1) % 7; // Saturday = 0, Sunday = 1, etc.

        setAllocations(prev => {
            const newAllocations = JSON.parse(JSON.stringify(prev));
            if (!newAllocations[weekKey]) newAllocations[weekKey] = {};
            if (!newAllocations[weekKey][userId]) newAllocations[weekKey][userId] = { assignments: Array(7).fill(null) };

            const currentAssignment = newAllocations[weekKey][userId].assignments[dayIndex];

            if (allocationData === null) {
                newAllocations[weekKey][userId].assignments[dayIndex] = null;
            } else if (allocationData.type === 'leave') {
                newAllocations[weekKey][userId].assignments[dayIndex] = allocationData;
            } else if (allocationData.type === 'status') {
                newAllocations[weekKey][userId].assignments[dayIndex] = allocationData;
            } else if (!Object.values(allocationData).some(val => val !== '' && val !== 'Days' && val !== null)) {
                 newAllocations[weekKey][userId].assignments[dayIndex] = null;
            } else {
                const projectData = {...allocationData, type: 'project'};

                // Handle multiple projects per day
                if (isSecondProject && currentAssignment) {
                    if (Array.isArray(currentAssignment)) {
                        // Already have multiple projects, add another
                        newAllocations[weekKey][userId].assignments[dayIndex] = [...currentAssignment, projectData];
                    } else if (currentAssignment.type === 'project') {
                        // Convert single project to array
                        newAllocations[weekKey][userId].assignments[dayIndex] = [currentAssignment, projectData];
                    } else {
                        // Replace leave with project
                        newAllocations[weekKey][userId].assignments[dayIndex] = projectData;
                    }
                } else {
                    // First/only project for the day
                    newAllocations[weekKey][userId].assignments[dayIndex] = projectData;
                }
            }

            return newAllocations;
        });

        setIsAllocationModalOpen(false);

        // Determine if this is a dummy user and select the appropriate table
        const user = allUsers.find(u => u.id === userId);
        const isDummyUser = user?.isDummy === true;
        const tableName = isDummyUser ? 'dummy_resource_allocations' : 'resource_allocations';

        let recordData = null; // For error handling

        try {
            const allocationDate = cellToUpdate.date;
            const allocationDateString = formatDateForKey(allocationDate);

            // Get all existing records for this user and date
            const { data: existingRecords } = await supabase
                .from(tableName)
                .select('*')
                .eq('user_id', userId)
                .eq('allocation_date', allocationDateString);

            const shouldDelete = allocationData === null ||
                                (allocationData.type !== 'leave' &&
                                 !Object.values(allocationData).some(val => val !== '' && val !== 'Days' && val !== null));

            if (shouldDelete) {
                // Delete all existing records for this day
                if (existingRecords && existingRecords.length > 0) {
                    const { error } = await supabase
                        .from(tableName)
                        .delete()
                        .eq('user_id', userId)
                        .eq('allocation_date', allocationDateString);
                    if (error) throw error;
                }
            } else if (isSecondProject) {
                // Adding a second project - insert new record
                recordData = {
                    user_id: userId,
                    allocation_date: allocationDateString,
                    assignment_type: 'project',
                    project_id: allocationData.projectId,
                    project_number: allocationData.projectNumber || null,
                    project_name: allocationData.projectName || null,
                    client: allocationData.client || null,
                    task: allocationData.task || null,
                    shift: allocationData.shift || 'Nights',
                    time: allocationData.time || null,
                    comment: allocationData.comment || null,
                    leave_type: null
                };

                const { error } = await supabase
                    .from(tableName)
                    .insert([recordData]);

                if (error) throw error;
            } else {
                recordData = {
                    user_id: userId,
                    allocation_date: allocationDateString,
                };

                if (allocationData.type === 'leave') {
                    recordData = {
                        ...recordData,
                        assignment_type: 'leave',
                        leave_type: allocationData.leaveType,
                        comment: allocationData.comment || null,
                        project_id: null, project_number: null, project_name: null, client: null, task: null, shift: null, time: null
                    };
                } else if (allocationData.type === 'status') {
                    recordData = {
                        ...recordData,
                        assignment_type: 'status',
                        comment: allocationData.status,
                        leave_type: null,
                        project_id: null, project_number: null, project_name: null, client: null, task: null, shift: null, time: null
                    };
                } else {
                    recordData = {
                        ...recordData,
                        assignment_type: 'project',
                        project_id: allocationData.projectId || null,
                        project_number: allocationData.projectNumber || null,
                        project_name: allocationData.projectName || null,
                        client: allocationData.client || null,
                        task: allocationData.task || null,
                        shift: allocationData.shift || null,
                        time: allocationData.time || null,
                        comment: allocationData.comment || null,
                        leave_type: null,
                    };
                }

                // For single project/leave, replace existing record if any
                if (existingRecords && existingRecords.length > 0) {
                    // Delete all existing records first, then insert new one
                    const { error: deleteError } = await supabase
                        .from(tableName)
                        .delete()
                        .eq('user_id', userId)
                        .eq('allocation_date', allocationDateString);

                    if (deleteError) throw deleteError;
                }

                const { error } = await supabase
                    .from(tableName)
                    .insert([recordData]);
                if (error) throw error;
            }
        } catch (err) {
            console.error('Error saving allocation to Supabase:', err);
            const errorMessage = handleSupabaseError(err, tableName, 'insert', recordData);
            if (isRLSError(err)) {
                showPrivilegeError(errorMessage);
            } else {
                showErrorModal(errorMessage, 'Failed to Save Allocation');
            }
        }
    };

    const handleContextMenuAction = (action) => {
        const { cellData } = contextMenu;
        if (!cellData) return;
        const cellToUpdate = { userId: cellData.userId, dayIndex: cellData.dayIndex, date: cellData.date };

        if (action === 'goToProject') {
            const projectToView = projects?.find(p => p.project_number === cellData.assignment.projectNumber);
            if (projectToView) {
                onViewProject(projectToView);
            }
            setContextMenu({ visible: false });
            return;
        }

        if (action === 'copy' || action === 'cut') {
            setClipboard({ type: action, data: cellData.assignment, sourceCell: cellToUpdate });
        } else if (action === 'delete') {
            handleSaveAllocation(null, cellToUpdate);
        } else if (action === 'paste') {
            handleSaveAllocation(clipboard.data, cellToUpdate);
            if (clipboard.type === 'cut') {
                handleSaveAllocation(null, clipboard.sourceCell);
                setClipboard({ type: null, data: null, sourceCell: null });
            }
        } else if (action === 'allocate') {
            setSelectedCell(cellToUpdate);
            setIsAllocationModalOpen(true);
        } else if (action === 'addSecondProject') {
            setSelectedCell({...cellToUpdate, isSecondProject: true});
            setIsAllocationModalOpen(true);
        } else if (action === 'setAvailable') {
            handleSaveAllocation({ type: 'status', status: 'Available' }, cellToUpdate);
        } else if (action === 'setNotAvailable') {
            handleSaveAllocation({ type: 'status', status: 'Not Available' }, cellToUpdate);
        }
        setContextMenu({ visible: false });
    };

    const handleUpdateVisibleUsers = (newUserIds) => {
        setVisibleUserIds(newUserIds);
        setIsManageUsersModalOpen(false);
    };

    const changeWeek = (offset) => {
        setCurrentWeekStart(prev => addDays(prev, offset * 7));
    };

    const handleRoleFilterChange = (role) => {
        setFilterRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
    };

    const handleSelectAllRoles = () => {
        if (filterRoles.length === activeTeamRoles.length) {
            // If all are selected, deselect all
            setFilterRoles([]);
        } else {
            // Select all active team roles
            setFilterRoles(activeTeamRoles.map(role => role.display_text));
        }
    };

    const isAllRolesSelected = activeTeamRoles.length > 0 && filterRoles.length === activeTeamRoles.length;

    const handleDepartmentFilterChange = (department) => {
        setFilterDepartments(prev => prev.includes(department) ? prev.filter(d => d !== department) : [...prev, department]);
    };

    const handleSelectAllDepartments = () => {
        if (filterDepartments.length === departments.length) {
            // If all are selected, deselect all
            setFilterDepartments([]);
        } else {
            // Select all departments
            setFilterDepartments([...departments]);
        }
    };

    const isAllDepartmentsSelected = departments.length > 0 && filterDepartments.length === departments.length;

    const weekKey = formatDateForKey(currentWeekStart);
    const fiscalWeek = getFiscalWeek(currentWeekStart);
    const currentWeekAllocations = allocations[weekKey] || {};
    const selectedUser = selectedCell ? allUsers?.find(u => u.id === selectedCell.userId) : null;

    if (loading || usersLoading) {
        return (
            <div className="p-4 md:p-6 flex items-center justify-center min-h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300">Loading Resource Allocations...</p>
                </div>
            </div>
        );
    }

    if (usersError) {
        return (
            <div className="p-4 md:p-6 flex items-center justify-center min-h-96">
                <div className="text-center text-red-600">
                    <p>Error loading users: {usersError}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Resource Allocation</h1>
                <div className="flex items-center gap-2 flex-wrap justify-center">
                    <Button variant="outline" onClick={() => setCurrentWeekStart(getWeekStartDate(new Date()))}>This Week</Button>
                    <Button variant="outline" onClick={() => changeWeek(-1)}><ChevronLeft size={16}/></Button>
                    <Button variant="outline" onClick={() => changeWeek(1)}><ChevronRight size={16}/></Button>
                    <Button onClick={() => setIsManageUsersModalOpen(true)}><Users size={16} className="mr-2"/>Show/Hide User</Button>
                </div>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                 <div className="flex items-center gap-2">
                    <div className="relative" ref={filterRef}>
                         <Button variant="outline" onClick={() => setIsFilterOpen(!isFilterOpen)}><Filter size={16} className="mr-2"/>Filter</Button>
                         {isFilterOpen && (
                             <div className="absolute top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 p-4 space-y-4">
                                 {/* Roles Filter */}
                                 <div>
                                     <h4 className="font-semibold mb-2 text-sm">Roles</h4>
                                     <div className="space-y-2 max-h-40 overflow-y-auto">
                                         {teamRolesLoading || usersLoading ? (
                                             <div className="text-sm text-gray-500">Loading team roles...</div>
                                         ) : teamRolesError ? (
                                             <div className="text-sm text-red-500">Error loading roles: {teamRolesError}</div>
                                         ) : activeTeamRoles.length === 0 ? (
                                             <div className="text-sm text-gray-500">No team roles assigned to users</div>
                                         ) : (
                                             <>
                                                 <label className="flex items-center space-x-2 text-sm font-medium border-b border-gray-200 dark:border-gray-600 pb-2 mb-2">
                                                     <input
                                                         type="checkbox"
                                                         checked={isAllRolesSelected}
                                                         onChange={handleSelectAllRoles}
                                                         className="rounded text-orange-500 focus:ring-orange-500"
                                                     />
                                                     <span>All Roles</span>
                                                 </label>
                                                 {activeTeamRoles.map(role => (
                                                     <label key={role.value} className="flex items-center space-x-2 text-sm">
                                                         <input type="checkbox" checked={filterRoles.includes(role.display_text)} onChange={() => handleRoleFilterChange(role.display_text)} className="rounded text-orange-500 focus:ring-orange-500"/>
                                                         <span>{role.display_text}</span>
                                                     </label>
                                                 ))}
                                             </>
                                         )}
                                     </div>
                                     <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setFilterRoles([])}>Clear Roles</Button>
                                 </div>

                                 {/* Departments Filter */}
                                 <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                                     <h4 className="font-semibold mb-2 text-sm">Departments</h4>
                                     <div className="space-y-2 max-h-40 overflow-y-auto">
                                         {departments.length === 0 ? (
                                             <div className="text-sm text-gray-500">No departments found</div>
                                         ) : (
                                             <>
                                                 <label className="flex items-center space-x-2 text-sm font-medium border-b border-gray-200 dark:border-gray-600 pb-2 mb-2">
                                                     <input
                                                         type="checkbox"
                                                         checked={isAllDepartmentsSelected}
                                                         onChange={handleSelectAllDepartments}
                                                         className="rounded text-orange-500 focus:ring-orange-500"
                                                     />
                                                     <span>All Departments</span>
                                                 </label>
                                                 {departments.map(department => (
                                                     <label key={department} className="flex items-center space-x-2 text-sm">
                                                         <input
                                                             type="checkbox"
                                                             checked={filterDepartments.includes(department)}
                                                             onChange={() => handleDepartmentFilterChange(department)}
                                                             className="rounded text-orange-500 focus:ring-orange-500"
                                                         />
                                                         <span>{department}</span>
                                                     </label>
                                                 ))}
                                             </>
                                         )}
                                     </div>
                                     <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setFilterDepartments([])}>Clear Departments</Button>
                                 </div>
                             </div>
                         )}
                    </div>
                    <div className="flex items-center">
                        <label htmlFor="sort-by" className="text-sm mr-2">Sort by:</label>
                        <Select id="sort-by" value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="!py-1.5">
                            <option value="alphabetical">Alphabetical</option>
                            <option value="department">Department</option>
                        </Select>
                    </div>
                </div>
                <h2 className="text-lg font-semibold text-center">Week {fiscalWeek}: {formatDateForDisplay(weekDates[0])} - {formatDateForDisplay(weekDates[6])}, {currentWeekStart.getFullYear()}</h2>
            </div>
            {error && (
                 <div className="p-4 mb-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded">
                    Error loading resource allocations from the database: {error}.
                </div>
            )}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-x-auto">
                <table className="w-full text-sm text-left" style={{ tableLayout: 'fixed' }}>
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th className="px-4 py-3 w-[250px]">Staff Member</th>
                            {weekDates.map(date => (
                                <th key={date.toISOString()} className="px-4 py-3 text-center w-52">
                                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                    <br/>
                                    {formatDateForDisplay(date)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {displayedUsers.map(user => (
                            <tr key={user.id}>
                                <td className="px-4 py-2 font-medium">
                                    <div className="flex items-center min-w-0">
                                        <div className={`w-8 h-8 rounded-full ${getDepartmentColor(user.department)} text-white flex items-center justify-center font-bold text-sm mr-3 flex-shrink-0`}>{getAvatarText(user)}</div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-semibold">{user.name}</p>
                                            <p className="text-xs text-gray-500 truncate">{user.department || 'No Department'}</p>
                                            {user.competencies && (
                                                <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5" title={user.competencies}>
                                                    {user.competencies}
                                                </p>
                                            )}
                                            {user.pts_number && (
                                                <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">
                                                    <span className="font-medium">PTS:</span> {user.pts_number}
                                                </p>
                                            )}
                                            {user.mobile_number && (
                                                <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">
                                                    <span className="font-medium">Mobile:</span> {user.mobile_number}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                {weekDates.map((date, dayIndex) => {
                                    const assignment = currentWeekAllocations[user.id]?.assignments[dayIndex] || null;
                                    let cellContent;
                                    let cellColor = '';

                                    if (assignment) {
                                        if (Array.isArray(assignment)) {
                                            // Multiple projects
                                            cellContent = (
                                                <div className="h-full flex flex-col gap-1 overflow-hidden">
                                                    {assignment.map((proj, index) => {
                                                        const projColor = shiftColors[proj.shift] || '';
                                                        return (
                                                            <div key={index} className={`p-1 rounded-md text-xs flex flex-col text-center ${projColor} flex-1`}>
                                                                <p className="font-bold text-[10px] truncate">{proj.projectNumber}</p>
                                                                <p className="text-[10px] truncate" title={proj.projectName}>{proj.projectName}</p>
                                                                <p className="text-[10px] truncate" title={proj.task}>{proj.task}</p>
                                                                <p className="font-semibold text-[10px]">{proj.shift}</p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        } else if (assignment.type === 'leave') {
                                            cellColor = leaveColors[assignment.leaveType] || '';
                                            cellContent = (
                                                <div className={`p-1.5 rounded-md text-xs h-full flex flex-col justify-center font-semibold ${cellColor}`}>
                                                    <div className="text-center">{assignment.leaveType}</div>
                                                    {assignment.comment && (
                                                        <div className="text-center text-[10px] font-normal mt-1 opacity-90" title={assignment.comment}>
                                                            {assignment.comment.length > 20 ? assignment.comment.substring(0, 20) + '...' : assignment.comment}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        } else if (assignment.type === 'status') {
                                            const statusColor = assignment.status === 'Available'
                                                ? 'text-green-600 dark:text-green-400'
                                                : 'text-red-600 dark:text-red-400';
                                            cellContent = (
                                                <div className={`p-1.5 rounded-md text-xs h-full flex items-center justify-center font-semibold ${statusColor}`}>
                                                    <div className="text-center">{assignment.status}</div>
                                                </div>
                                            );
                                        } else if (assignment.type === 'project') {
                                            cellColor = shiftColors[assignment.shift] || '';
                                            cellContent = (
                                                <div className={`p-1.5 rounded-md text-xs space-y-1 h-full flex flex-col overflow-hidden text-center ${cellColor}`}>
                                                    <p className="font-bold whitespace-nowrap overflow-ellipsis overflow-hidden">{assignment.projectNumber}</p>
                                                    <p className="flex-grow min-w-0 break-words" title={assignment.projectName}>{assignment.projectName}</p>
                                                    <p className="whitespace-nowrap overflow-ellipsis overflow-hidden" title={assignment.client}>{assignment.client}</p>
                                                    <p className="font-semibold">{assignment.task}</p>
                                                    <p className="font-semibold">{assignment.shift}</p>
                                                    <p className="text-gray-500 dark:text-gray-400 whitespace-nowrap overflow-ellipsis overflow-hidden" title={assignment.comment}>{assignment.comment}</p>
                                                </div>
                                            );
                                        }
                                    }

                                    const isStatusAssignment = assignment && assignment.type === 'status';
                                    const showContextMenuButton = canAllocateResources || canSetAvailabilityStatus;

                                    return (
                                        <td key={date.toISOString()} className="p-1 align-top h-40 relative group">
                                            <div
                                                onClick={() => handleCellClick(user.id, date, dayIndex)}
                                                className={`w-full h-full text-left rounded-md ${canAllocateResources ? 'cursor-pointer' : 'cursor-default'}`}
                                            >
                                                {cellContent}
                                            </div>
                                            {showContextMenuButton && (
                                                <button
                                                    onClick={(e) => handleActionClick(e, user.id, dayIndex, assignment)}
                                                    className="absolute top-1 right-1 p-1 rounded-full bg-gray-300/20 dark:bg-gray-900/20 hover:bg-gray-400/50 dark:hover:bg-gray-700/50"
                                                >
                                                    <MoreVertical size={14} />
                                                </button>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {contextMenu.visible && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    cellData={contextMenu.cellData}
                    clipboard={clipboard}
                    onAction={handleContextMenuAction}
                    onClose={() => setContextMenu({ visible: false })}
                    canAllocate={canAllocateResources}
                    canSetStatus={canSetAvailabilityStatus}
                />
            )}
            {selectedCell && (
                <AllocationModal
                    isOpen={isAllocationModalOpen}
                    onClose={() => setIsAllocationModalOpen(false)}
                    onSave={(allocationData) => handleSaveAllocation(allocationData, selectedCell, selectedCell.isSecondProject)}
                    user={selectedUser}
                    date={selectedCell.date}
                    currentAssignment={currentWeekAllocations[selectedCell.userId]?.assignments[selectedCell.dayIndex] || null}
                    projects={projects}
                    isSecondProject={selectedCell.isSecondProject}
                />
            )}
            <ShowHideUsersModal
                isOpen={isManageUsersModalOpen}
                onClose={() => setIsManageUsersModalOpen(false)}
                onSave={handleUpdateVisibleUsers}
                allUsers={allUsers}
                visibleUserIds={visibleUserIds}
            />
        </div>
    );
};

const DeliveryTasksPage = () => {
    const { user } = useAuth();
    const { canCompleteTasks, canCreateTasks, canEditProjects, canDeleteProjects } = usePermissions();
    const { deliveryTasks, addDeliveryTask, updateDeliveryTask, deleteDeliveryTask, deleteAllArchivedDeliveryTasks, loading, error } = useDeliveryTasks();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [taskToEdit, setTaskToEdit] = useState(null);
    const [users, setUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(true);

    // Fetch real users from the database
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setUsersLoading(true);
                const { data, error } = await supabase
                    .from('users')
                    .select('id, username, name, privilege, avatar, email')
                    .order('name');

                if (error) {
                    console.error('Error fetching users:', error);
                    // Fallback to mock users if database fetch fails
                    setUsers(Object.values(mockUsers));
                } else {
                    setUsers(data || []);
                }
            } catch (error) {
                console.error('Error in fetchUsers:', error);
                // Fallback to mock users if there's an exception
                setUsers(Object.values(mockUsers));
            } finally {
                setUsersLoading(false);
            }
        };

        fetchUsers();
    }, []);

    const handleSaveTask = async (taskData) => {
        if (taskToEdit) {
            await updateDeliveryTask({ ...taskToEdit, ...taskData });
        } else {
            const newTask = { ...taskData, completed: false, project: 'Delivery Team', createdBy: user?.id };
            await addDeliveryTask(newTask);
        }
        setIsModalOpen(false);
        setTaskToEdit(null);
    };

    const handleToggleComplete = async (task) => {
        const isCompleting = !task.completed;
        const updatedTask = {
            ...task,
            completed: isCompleting,
            completedAt: isCompleting ? new Date().toISOString() : null,
            completedBy: isCompleting ? user?.id : null
        };
        await updateDeliveryTask(updatedTask);
    };

    const handleDeleteTask = async (taskId) => {
        await deleteDeliveryTask(taskId);
    };

    const handleDeleteAllArchived = async () => {
        const archivedCount = deliveryTasks.filter(t => t.archived === true).length;
        if (archivedCount === 0) {
            alert('There are no archived tasks to delete.');
            return;
        }
        if (window.confirm(`Are you sure you want to delete all ${archivedCount} archived delivery tasks? This action cannot be undone.`)) {
            await deleteAllArchivedDeliveryTasks();
        }
    };

    const openEditModal = (task) => {
        setTaskToEdit(task);
        setIsModalOpen(true);
    };
    
    const openNewTaskModal = () => {
        setTaskToEdit(null);
        setIsModalOpen(true);
    };

    if (loading) {
        return <div className="p-8 text-2xl font-semibold text-center">Loading Delivery Tasks...</div>;
    }

    if (error) {
        return (
            <div className="p-6 m-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                <h2 className="font-bold text-xl mb-2">Error Loading Delivery Tasks</h2>
                <p>There was a problem fetching delivery task data from the database.</p>
                <p className="mt-4 font-bold">Error Message:</p>
                <pre className="font-mono bg-red-50 p-2 rounded mt-1 text-sm">{error}</pre>
            </div>
        );
    }

    const [showArchived, setShowArchived] = useState(false);

    const activeTasks = deliveryTasks.filter(t => t.archived !== true);
    const archivedTasks = deliveryTasks.filter(t => t.archived === true);
    const tasksToDisplay = showArchived ? archivedTasks : activeTasks;
    const incompleteTasks = tasksToDisplay.filter(t => !t.completed);
    const completedTasks = tasksToDisplay.filter(t => t.completed);

    const handleArchiveTask = async (task) => {
        console.log('Archive button clicked for delivery task:', task.id, 'Current archived status:', task.archived);
        const newArchivedStatus = task.archived === true ? false : true;
        console.log('Setting archived to:', newArchivedStatus);
        const updatedTask = { ...task, archived: newArchivedStatus };
        await updateDeliveryTask(updatedTask);
    };

    return (
        <div className="p-4 md:p-6">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Delivery Tasks</h1>
                    <Button
                        variant="outline"
                        onClick={() => setShowArchived(!showArchived)}
                        className="text-sm"
                    >
                        {showArchived ? 'Show Active' : 'Show Archived'} ({showArchived ? activeTasks.length : archivedTasks.length})
                    </Button>
                    {showArchived && archivedTasks.length > 0 && (
                        <Button
                            variant="outline"
                            onClick={handleDeleteAllArchived}
                            className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                            <Trash2 size={16} className="mr-2"/>Delete All Archived
                        </Button>
                    )}
                </div>
                {canCreateTasks && (
                    <Button onClick={openNewTaskModal}><PlusCircle size={16} className="mr-2"/>Add Delivery Task</Button>
                )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                <div className="p-4">
                    <h3 className="text-lg font-semibold mb-4">To Do ({incompleteTasks.length})</h3>
                    <ul className="space-y-2">
                        {incompleteTasks.map(task => (
                            <DeliveryTaskItem key={task.id} task={task} onToggle={() => handleToggleComplete(task)} onEdit={openEditModal} onDelete={handleDeleteTask} onArchive={handleArchiveTask} users={users} canComplete={canCompleteTasks} canEdit={canEditProjects} canDelete={canDeleteProjects} />
                        ))}
                        {incompleteTasks.length === 0 && (
                            <li className="text-gray-500 dark:text-gray-400 text-center py-4">{showArchived ? 'No pending archived tasks' : 'No pending delivery tasks'}</li>
                        )}
                    </ul>
                </div>
                {completedTasks.length > 0 && (
                    <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                        <h3 className="text-lg font-semibold mb-4 text-green-600 dark:text-green-400">Completed ({completedTasks.length})</h3>
                        <ul className="space-y-2">
                            {completedTasks.map(task => (
                                <DeliveryTaskItem key={task.id} task={task} onToggle={() => handleToggleComplete(task)} onEdit={openEditModal} onDelete={handleDeleteTask} onArchive={handleArchiveTask} users={users} canComplete={canCompleteTasks} canEdit={canEditProjects} canDelete={canDeleteProjects} />
                            ))}
                        </ul>
                    </div>
                )}
            </div>
            <DeliveryTaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveTask} task={taskToEdit} users={users} usersLoading={usersLoading} />
        </div>
    );
};


const ShowHideUsersModal = ({ isOpen, onClose, onSave, allUsers, visibleUserIds }) => {
    const [selectedIds, setSelectedIds] = useState(visibleUserIds);

    useEffect(() => {
        setSelectedIds(visibleUserIds);
    }, [visibleUserIds, isOpen]);

    const handleToggleUser = (userId) => {
        setSelectedIds(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const handleSelectAll = () => {
        if (selectedIds.length === allUsers.length) {
            // If all are selected, deselect all
            setSelectedIds([]);
        } else {
            // Select all users
            setSelectedIds(allUsers.map(user => user.id));
        }
    };

    const handleSave = () => {
        onSave(selectedIds);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Show/Hide Staff">
            <div className="p-6">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Select the staff members to display on the resource planner.</p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSelectAll}
                            className="text-xs"
                        >
                            {selectedIds.length === allUsers.length ? 'Deselect All' : 'Select All'}
                        </Button>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2 p-2 border rounded-md dark:border-gray-600">
                        {(allUsers || []).map(user => (
                            <label key={user.id} className="flex items-center space-x-3 cursor-pointer p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.includes(user.id)}
                                    onChange={() => handleToggleUser(user.id)}
                                    className="h-4 w-4 rounded text-orange-500 focus:ring-orange-500 border-gray-300 dark:border-gray-500"
                                />
                                <span>{user.name}</span>
                            </label>
                        ))}
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleSave}>Save</Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

const AllocationModal = ({ isOpen, onClose, onSave, user, date, currentAssignment, projects, isSecondProject = false }) => {
    const [isManual, setIsManual] = useState(false);
    const [leaveType, setLeaveType] = useState('');
    const [formData, setFormData] = useState({
        projectNumber: '', projectName: '', client: '', time: '', task: '', comment: '', shift: 'Nights', projectId: null
    });

    useEffect(() => {
        if (currentAssignment) {
            if (currentAssignment.type === 'leave') {
                setLeaveType(currentAssignment.leaveType);
                setFormData({ projectNumber: '', projectName: '', client: '', time: '', task: '', comment: currentAssignment.comment || '', shift: 'Nights', projectId: null });
                setIsManual(false);
            } else {
                setLeaveType('');
                setFormData({
                    projectNumber: currentAssignment.projectNumber || '',
                    projectName: currentAssignment.projectName || '',
                    client: currentAssignment.client || '',
                    time: currentAssignment.time || '',
                    task: currentAssignment.task || '',
                    comment: currentAssignment.comment || '',
                    shift: currentAssignment.shift || 'Nights',
                    projectId: currentAssignment.projectId || null
                });
                const isProjectInList = projects?.some(p => p.project_number === currentAssignment.projectNumber) || false;
                setIsManual(!isProjectInList && !!currentAssignment.projectNumber);
            }
        } else {
            setFormData({ projectNumber: '', projectName: '', client: '', time: '', task: '', comment: '', shift: 'Nights', projectId: null });
            setIsManual(false);
            setLeaveType('');
        }
    }, [currentAssignment, isOpen]);

    const handleProjectSelect = (e) => {
        const selectedProjectNumber = e.target.value;
        const project = projects?.find(p => p.project_number === selectedProjectNumber);
        if (project) {
            setFormData(prev => ({ ...prev, projectNumber: project.project_number, projectName: project.project_name, client: project.client, projectId: project.id }));
        } else {
            setFormData(prev => ({...prev, projectNumber: '', projectName: '', client: '', projectId: null}));
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        if (leaveType) {
            onSave({ type: 'leave', leaveType: leaveType, comment: formData.comment || '' });
        } else {
            onSave(formData);
        }
    };

    const handleClear = () => {
        onSave(null);
    }
    
    const handleLeaveChange = (type) => {
        setLeaveType(prev => prev === type ? '' : type);
    };

    const projectFieldsDisabled = !!leaveType;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isSecondProject ? "Add Second Project" : "Allocate Resource"}>
             <div className="p-6 overflow-y-auto max-h-[80vh]">
                <div className="space-y-4">
                    <div>
                        <p><span className="font-semibold">Staff:</span> {user?.name}</p>
                        <p><span className="font-semibold">Date:</span> {date?.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    
                    {!isSecondProject && (
                        <div className="grid grid-cols-2 gap-2 pt-2">
                            <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={leaveType === 'Annual Leave'} onChange={() => handleLeaveChange('Annual Leave')} className="rounded text-orange-500 focus:ring-orange-500"/><span>Annual Leave</span></label>
                            <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={leaveType === 'Bank Holiday'} onChange={() => handleLeaveChange('Bank Holiday')} className="rounded text-orange-500 focus:ring-orange-500"/><span>Bank Holiday</span></label>
                            <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={leaveType === 'Office (Haydock)'} onChange={() => handleLeaveChange('Office (Haydock)')} className="rounded text-orange-500 focus:ring-orange-500"/><span>Office (Haydock)</span></label>
                            <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={leaveType === 'Office (Home)'} onChange={() => handleLeaveChange('Office (Home)')} className="rounded text-orange-500 focus:ring-orange-500"/><span>Office (Home)</span></label>
                            <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={leaveType === 'Training'} onChange={() => handleLeaveChange('Training')} className="rounded text-orange-500 focus:ring-orange-500"/><span>Training</span></label>
                            <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={leaveType === 'Stand Down'} onChange={() => handleLeaveChange('Stand Down')} className="rounded text-orange-500 focus:ring-orange-500"/><span>Stand Down</span></label>
                            <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={leaveType === 'Sick Day'} onChange={() => handleLeaveChange('Sick Day')} className="rounded text-orange-500 focus:ring-orange-500"/><span>Sick Day</span></label>
                            <label className="flex items-center space-x-2 text-sm"><input type="checkbox" checked={leaveType === 'Rest Day'} onChange={() => handleLeaveChange('Rest Day')} className="rounded text-orange-500 focus:ring-orange-500"/><span>Rest Day</span></label>
                        </div>
                    )}

                    <fieldset disabled={projectFieldsDisabled} className={`space-y-4 ${!isSecondProject ? 'border-t pt-4 mt-4 border-gray-200 dark:border-gray-700' : ''} disabled:opacity-40`}>
                        <div className="flex items-center space-x-2">
                            <input type="checkbox" id="manual-entry" checked={isManual} onChange={(e) => setIsManual(e.target.checked)} className="rounded text-orange-500 focus:ring-orange-500"/>
                            <label htmlFor="manual-entry" className="text-sm">Enter Manually</label>
                        </div>

                        {!isManual ? (
                            <Select label="Project" value={formData.projectNumber} onChange={handleProjectSelect}>
                                <option value="">Select Project</option>
                                {(projects || []).map(p => (
                                    <option key={p.id} value={p.project_number}>{p.project_number} - {p.project_name}</option>
                                ))}
                            </Select>
                        ) : (
                            <Input label="Project Number" name="projectNumber" value={formData.projectNumber} onChange={handleInputChange} />
                        )}
                        
                        <Input label="Project Name" name="projectName" value={formData.projectName} onChange={handleInputChange} disabled={!isManual} />
                        <Input label="Client" name="client" value={formData.client} onChange={handleInputChange} disabled={!isManual} />
                        
                        <Select label="Shift" name="shift" value={formData.shift} onChange={handleInputChange}>
                            <option>Nights</option>
                            <option>Days</option>
                            <option>Evening</option>
                        </Select>

                        <Input label="Task" name="task" value={formData.task} onChange={handleInputChange} placeholder="e.g., Survey, Monitoring..."/>
                        
                        <Input label="Start/End Time" name="time" value={formData.time} onChange={handleInputChange} placeholder="e.g., 09:00 - 17:00"/>
                        <Input label="Comment" name="comment" value={formData.comment} onChange={handleInputChange} placeholder="Add a comment..."/>
                    </fieldset>

                    {!isSecondProject && leaveType && (
                        <div className="space-y-2 pt-4">
                            <Input
                                label="Comment (Optional)"
                                name="comment"
                                value={formData.comment}
                                onChange={handleInputChange}
                                placeholder="Add a comment for this leave type..."
                            />
                        </div>
                    )}
                </div>
            </div>
            <div className="flex-shrink-0 flex justify-between items-center p-4 border-t border-gray-200 dark:border-gray-700">
                <Button variant="danger" onClick={handleClear}>Clear Assignment</Button>
                <div className="flex space-x-2">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Save</Button>
                </div>
            </div>
        </Modal>
    );
};

// UserProvider moved to src/contexts/UserContext.jsx

// Removed useTeamRoles hook - now fetching team roles directly in ResourceCalendarPage


// --- REPLACE UserAdminPage with this new version ---
const UserAdminPage = () => {
    // MODIFICATION 1: Get data and functions from the new useUsers hook
    const { users, addUser, updateUser, deleteUser, loading, error } = useUsers();
    const { teamRoles } = useTeamRoles();

    // Helper function to get display text for team role
    const getTeamRoleDisplayText = (roleValue) => {
        const role = teamRoles.find(r => r.value === roleValue);
        return role ? role.display_text : roleValue;
    };
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const { user: currentUser } = useAuth();
    const privileges = userPrivileges[currentUser.privilege];
    const [searchTerm, setSearchTerm] = useState('');
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

    const filteredUsers = useMemo(() => users.filter(user => 
        (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.role && user.role.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.team_role && user.team_role.toLowerCase().includes(searchTerm.toLowerCase()))
    ), [users, searchTerm]);

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
                                {privileges.canEditUserAdmin && (
                                    <td className="px-6 py-4">
                                        <button onClick={() => openEditModal(user)} className="p-1.5 text-gray-500 hover:text-blue-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"><Edit size={16} /></button>
                                        <button onClick={() => handleDeleteClick(user)} className="p-1.5 text-gray-500 hover:text-red-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"><Trash2 size={16} /></button>
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
        <div>
            <h2 className="text-xl font-semibold mb-4">Security</h2>
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
    const { canDownloadFiles, canUploadDocuments } = usePermissions();
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);
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

            const filesWithDetails = data.map(file => ({
                id: file.id,
                name: file.name,
                size: formatFileSize(file.metadata?.size || 0),
                uploaded: new Date(file.created_at).toLocaleDateString(),
                fullPath: `project-${projectId}/${file.name}`
            }));

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
                            <th className="px-4 py-2"></th>
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
                                    <td className="px-4 py-3 text-center">
                                        {canDownloadFiles ? (
                                            <button
                                                onClick={() => handleDownload(file)}
                                                className="p-1 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                                                title="Download file"
                                            >
                                                <Download size={16} />
                                            </button>
                                        ) : (
                                            <span className="text-xs text-gray-400 dark:text-gray-500">No access</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const AuditTrailPage = () => {
    const { auditLogs, loading, error } = useAuditTrail();
    const [logs, setLogs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'descending' });
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [currentPage, setCurrentPage] = useState(1);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [actionFilter, setActionFilter] = useState([]);
    const [userFilter, setUserFilter] = useState('');
    const [entityFilter, setEntityFilter] = useState('');
    const [dateRange, setDateRange] = useState({
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [severityFilter, setSeverityFilter] = useState('');
    const [expandedRows, setExpandedRows] = useState(new Set());
    const filterRef = useRef(null);

    useEffect(() => {
        setLogs(auditLogs);
    }, [auditLogs]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Enhanced action icons and colors
    const getActionIcon = (action) => {
        switch (action) {
            case 'LOGIN': return { icon: '🔐', color: 'text-green-600 bg-green-100 dark:bg-green-900/30' };
            case 'LOGOUT': return { icon: '🚪', color: 'text-gray-600 bg-gray-100 dark:bg-gray-700' };
            case 'CREATE': return { icon: '➕', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' };
            case 'UPDATE': return { icon: '✏️', color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30' };
            case 'DELETE': return { icon: '🗑️', color: 'text-red-600 bg-red-100 dark:bg-red-900/30' };
            case 'VIEW': return { icon: '👁️', color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' };
            case 'SYSTEM_EVENT': return { icon: '⚙️', color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' };
            case 'ERROR': return { icon: '❌', color: 'text-red-600 bg-red-100 dark:bg-red-900/30' };
            case 'WARNING': return { icon: '⚠️', color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30' };
            default: return { icon: '📝', color: 'text-gray-600 bg-gray-100 dark:bg-gray-700' };
        }
    };

    const getSeverity = (action, details) => {
        if (action === 'DELETE' || action === 'ERROR') return 'HIGH';
        if (action === 'UPDATE' || action === 'WARNING') return 'MEDIUM';
        return 'LOW';
    };

    const filteredLogs = useMemo(() => logs.filter(log => {
        const user = log.userId ? mockUsers[log.userId] : { name: 'SYSTEM' };
        const logDate = new Date(log.timestamp).toISOString().split('T')[0];

        const matchesSearch = (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.entity.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.entityId && log.entityId.toString().includes(searchTerm)));

        const matchesAction = actionFilter.length === 0 || actionFilter.includes(log.action);
        const matchesUser = userFilter === '' || log.userId === parseInt(userFilter);
        const matchesEntity = entityFilter === '' || log.entity === entityFilter;
        const matchesDate = (!dateRange.start || logDate >= dateRange.start) &&
                           (!dateRange.end || logDate <= dateRange.end);
        const matchesSeverity = severityFilter === '' || getSeverity(log.action, log.details) === severityFilter;

        return matchesSearch && matchesAction && matchesUser && matchesEntity && matchesDate && matchesSeverity;
    }), [logs, searchTerm, actionFilter, userFilter, entityFilter, dateRange, severityFilter]);

    const sortedLogs = useMemo(() => {
        let sortableItems = [...filteredLogs];
        sortableItems.sort((a, b) => {
            let aVal = a[sortConfig.key];
            let bVal = b[sortConfig.key];

            // Special handling for timestamp sorting
            if (sortConfig.key === 'timestamp') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }

            if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
        return sortableItems;
    }, [filteredLogs, sortConfig]);

    const paginatedLogs = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedLogs.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedLogs, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(sortedLogs.length / itemsPerPage);

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

    const toggleRowExpansion = (logId) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(logId)) {
            newExpanded.delete(logId);
        } else {
            newExpanded.add(logId);
        }
        setExpandedRows(newExpanded);
    };

    const handleExport = (format) => {
        const headers = ['Timestamp', 'User', 'Action', 'Entity', 'Entity ID', 'Severity', 'Details'];
        const rows = sortedLogs.map(log => {
            const user = log.userId ? mockUsers[log.userId] : { name: 'SYSTEM' };
            return [
                formatTimestamp(log.timestamp),
                user.name,
                log.action,
                log.entity,
                log.entityId || '',
                getSeverity(log.action, log.details),
                JSON.stringify(log.details)
            ];
        });

        if (format === 'CSV') {
            const csvContent = [headers, ...rows].map(row =>
                row.map(cell => `"${cell}"`).join(',')).join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit-trail-${dateRange.start}-to-${dateRange.end}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        }
        // Add other export formats as needed
    };

    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleString('en-GB', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: 'Europe/London'
        });
    };

    const formatRelativeTime = (timestamp) => {
        const now = new Date();
        const logTime = new Date(timestamp);
        const diffInMs = now - logTime;
        const diffInMins = Math.floor(diffInMs / (1000 * 60));
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

        if (diffInMins < 1) return 'Just now';
        if (diffInMins < 60) return `${diffInMins}m ago`;
        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInDays < 7) return `${diffInDays}d ago`;
        return formatTimestamp(timestamp);
    };

    const uniqueActions = [...new Set(logs.map(log => log.action))];
    const uniqueEntities = [...new Set(logs.map(log => log.entity))];
    const allUsers = Object.values(mockUsers);

    // Summary statistics
    const stats = {
        total: filteredLogs.length,
        high: filteredLogs.filter(log => getSeverity(log.action, log.details) === 'HIGH').length,
        medium: filteredLogs.filter(log => getSeverity(log.action, log.details) === 'MEDIUM').length,
        low: filteredLogs.filter(log => getSeverity(log.action, log.details) === 'LOW').length,
        today: filteredLogs.filter(log => {
            const logDate = new Date(log.timestamp).toDateString();
            const today = new Date().toDateString();
            return logDate === today;
        }).length
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Loading audit logs...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-6">
            {error && (
                <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg">
                    <div className="flex items-center">
                        <span className="mr-2">❌</span>
                        <span>Error loading audit logs: {error}</span>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Audit Trail</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">System activity monitoring and security logs</p>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-center">
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="text-lg font-bold text-gray-900 dark:text-white">{stats.total}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="text-lg font-bold text-red-600">{stats.high}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">High</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="text-lg font-bold text-yellow-600">{stats.medium}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Medium</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="text-lg font-bold text-green-600">{stats.low}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Low</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="text-lg font-bold text-blue-600">{stats.today}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Today</div>
                    </div>
                </div>
            </div>

            {/* Enhanced Filters */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
                    {/* Search */}
                    <div className="lg:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search logs..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                        </div>
                    </div>

                    {/* Date Range */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From</label>
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To</label>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                    </div>

                    {/* Filters */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Action</label>
                        <select
                            value={actionFilter[0] || ''}
                            onChange={(e) => setActionFilter(e.target.value ? [e.target.value] : [])}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                            <option value="">All Actions</option>
                            {uniqueActions.map(action => (
                                <option key={action} value={action}>{action}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Entity</label>
                        <select
                            value={entityFilter}
                            onChange={(e) => setEntityFilter(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                            <option value="">All Entities</option>
                            {uniqueEntities.map(entity => (
                                <option key={entity} value={entity}>{entity}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Actions</label>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => {
                                    setSearchTerm('');
                                    setActionFilter([]);
                                    setUserFilter('');
                                    setEntityFilter('');
                                    setSeverityFilter('');
                                }}
                                variant="outline"
                                className="flex-1"
                            >
                                Clear
                            </Button>
                            <div className="relative group">
                                <Button variant="outline" className="flex-1">
                                    <Download size={16} className="mr-1"/>Export
                                </Button>
                                <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-200 z-20">
                                    <button onClick={() => handleExport('CSV')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">CSV</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Enhanced Audit Log Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => requestSort('timestamp')}>
                                    Timestamp {getSortIndicator('timestamp')}
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => requestSort('user')}>
                                    User {getSortIndicator('user')}
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => requestSort('action')}>
                                    Action {getSortIndicator('action')}
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => requestSort('entity')}>
                                    Entity {getSortIndicator('entity')}
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Severity
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Details
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {paginatedLogs.map(log => {
                                const user = log.userId ? mockUsers[log.userId] : { name: 'SYSTEM', avatar: 'SYS' };
                                const actionData = getActionIcon(log.action);
                                const severity = getSeverity(log.action, log.details);
                                const isExpanded = expandedRows.has(log.id);

                                return (
                                    <React.Fragment key={log.id}>
                                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-600/20 cursor-pointer" onClick={() => toggleRowExpansion(log.id)}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900 dark:text-white font-mono">
                                                    {formatRelativeTime(log.timestamp)}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {formatTimestamp(log.timestamp)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center font-bold text-xs mr-3">
                                                        {getAvatarText(user)}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                            {user.name}
                                                        </div>
                                                        {log.details?.ip_address && (
                                                            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                                                {log.details.ip_address}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${actionData.color}`}>
                                                    <span className="mr-1">{actionData.icon}</span>
                                                    {log.action}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900 dark:text-white">
                                                    {log.entity}
                                                    {log.entityId && (
                                                        <span className="ml-1 text-gray-500 dark:text-gray-400">#{log.entityId}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    severity === 'HIGH' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                                    severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                                    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                }`}>
                                                    {severity}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs">
                                                        {Object.keys(log.details || {}).length > 0 ?
                                                            `${Object.keys(log.details).length} properties` :
                                                            'No details'
                                                        }
                                                    </div>
                                                    <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                                        ▼
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50">
                                                    <div className="space-y-2">
                                                        <h4 className="font-medium text-gray-900 dark:text-white">Event Details:</h4>
                                                        <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-x-auto text-gray-800 dark:text-gray-200">
                                                            {JSON.stringify(log.details, null, 2)}
                                                        </pre>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <Pagination
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                setItemsPerPage={setItemsPerPage}
                totalItems={sortedLogs.length}
            />
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
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                color: white;
                font-family: sans-serif;
            ">
                <div style="
                    background: white;
                    color: #333;
                    padding: 20px 40px;
                    border-radius: 8px;
                    text-align: center;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                ">
                    <div style="
                        width: 40px;
                        height: 40px;
                        border: 4px solid #f3f3f3;
                        border-top: 4px solid #f97316;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 10px auto;
                    "></div>
                    <p style="margin: 0; font-weight: 500;">${message}</p>
                </div>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
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

    // Advanced CSS preprocessing to handle oklch and inject CSS override
    const createOklchOverrideStylesheet = () => {
        const oklchToHex = {
            // Common oklch patterns with their hex equivalents
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

        // Create comprehensive CSS override
        let cssOverride = '/* html2canvas oklch fallback styles */\n';

        // Get all stylesheets and process their CSS text
        for (const stylesheet of document.styleSheets) {
            try {
                if (stylesheet.cssRules) {
                    for (const rule of stylesheet.cssRules) {
                        if (rule.style && rule.cssText.includes('oklch(')) {
                            let modifiedRule = rule.cssText;

                            // Replace oklch functions with hex equivalents
                            for (const [oklch, hex] of Object.entries(oklchToHex)) {
                                const escapedOklch = oklch.replace(/[()]/g, '\\$&');
                                modifiedRule = modifiedRule.replace(new RegExp(escapedOklch, 'g'), hex);
                            }

                            // Fallback for unmapped oklch colors
                            modifiedRule = modifiedRule.replace(/oklch\([^)]+\)/g, '#6b7280');

                            if (modifiedRule !== rule.cssText) {
                                cssOverride += modifiedRule + '\n';
                            }
                        }
                    }
                }
            } catch (e) {
                // Skip CORS-blocked stylesheets
            }
        }

        return cssOverride;
    };

    const injectTemporaryStylesheet = (cssText) => {
        const style = document.createElement('style');
        style.id = 'html2canvas-oklch-override';
        style.textContent = cssText;
        document.head.appendChild(style);
        return style;
    };

    const preprocessColors = (element) => {
        // Create and inject CSS override stylesheet
        const cssOverride = createOklchOverrideStylesheet();
        const injectedStyle = injectTemporaryStylesheet(cssOverride);

        console.log('Injected CSS override for oklch colors');
        return { injectedStyle };
    };

    const restoreOriginalStyles = ({ injectedStyle }) => {
        if (injectedStyle && injectedStyle.parentNode) {
            injectedStyle.parentNode.removeChild(injectedStyle);
            console.log('Removed CSS override stylesheet');
        }
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

const AnalyticsCard = ({ title, children }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
        <h3 className="p-4 text-lg font-semibold border-b border-gray-200 dark:border-gray-700">{title}</h3>
        <div className="p-4">{children}</div>
    </div>
);

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

const MainLayout = () => {
    const { user, isLoading } = useAuth();
    const [activeTab, setActiveTab] = useState('Dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
    const [passwordPromptReason, setPasswordPromptReason] = useState(null);
    const [isChatbotVisible, setIsChatbotVisible] = useState(false);

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

    // Ensure user starts on Dashboard only on initial login, not on every user state change
    useEffect(() => {
        if (user && !isLoading && !hasInitialized) {
            setActiveTab('Dashboard');
            setHasInitialized(true);
        } else if (!user && !isLoading) {
            // Reset when user logs out so next login will go to Dashboard
            setHasInitialized(false);
        }
    }, [user, isLoading, hasInitialized]);

    useEffect(() => {
        if (selectedProject) {
            const updatedProject = projects.find(p => p.id === selectedProject.id);
            if (updatedProject) {
                setSelectedProject(updatedProject);
            } else {
                setSelectedProject(null);
                setActiveTab('Projects');
            }
        }
    }, [projects, selectedProject]);

    // Check if user needs to change password
    useEffect(() => {
        if (user && !isLoading && !showPasswordPrompt) {
            // FIRST: Check for password recovery (check URL parameters and hash fragments)
            const urlParams = new URLSearchParams(window.location.search);
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            
            const accessToken = urlParams.get('access_token') || hashParams.get('access_token');
            const type = urlParams.get('type') || hashParams.get('type');
            
            // Also check if this is a password recovery session by checking if user just signed in
            // and has specific recovery indicators in the auth user metadata
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

            // SECOND: Check for new user (no last_login)
            if (!user.last_login) {
                setPasswordPromptReason('new_user');
                setShowPasswordPrompt(true);
                return;
            }
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
        const [selectedCategory, setSelectedCategory] = useState('Standards & Specs');

        const documentCategories = [
            { value: 'Standards & Specs', label: 'Standards & Specs', icon: FileText },
            { value: 'Procedures', label: 'Procedures & Guides', icon: ClipboardList },
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
                <FileManagementSystem category={selectedCategory} />
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
        switch (activeTab) {
            case 'Dashboard': return <DashboardPage onViewProject={handleViewProject} setActiveTab={setActiveTab} />;
            case 'Projects': return <ProjectsPage onViewProject={handleViewProject} />;
            case 'Announcements': return <AnnouncementsPage />;
            case 'Feedback': return <FeedbackPage />;
            case 'Resource Calendar': return <ResourceCalendarPage onViewProject={handleViewProject} />;
            case 'Project Tasks': return <ProjectTasksPage />;
            case 'Equipment': return <EquipmentPage />;
            case 'Vehicles': return <VehiclesPage />;
            case 'Delivery Tracker': return <DeliveryTrackerPage />;
            case 'Delivery Tasks': return <DeliveryTasksPage />;
            case 'Analytics': return <AnalyticsPage />;
            case 'Document Hub': return <DocumentHubPage />;
            case 'Video Tutorials': return <VideoTutorialsPage />;
            case 'User Contacts': return <UserContactsPage />;
            case 'Useful Contacts': return <UsefulContactsPage />;
            case 'User Admin': return <UserAdmin />;
            case 'Dropdown Menu': return <DropdownMenuPage />;
            case 'Audit Trail': return <AuditTrailPage />;
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

  if (isLoading && !user) {
    return <LoadingScreen />;
  }

  if (isAuthenticated && user) {
    return (
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
    );
  }

  return <LoginPage />;
};

const MainAppLayout = () => {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [settingsSection, setSettingsSection] = useState('profile');

  // Enhanced setActiveTab to handle settings section
  const handleSetActiveTab = (tab, section = null) => {
    setActiveTab(tab);
    if (tab === 'Settings' && section) {
      setSettingsSection(section);
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
