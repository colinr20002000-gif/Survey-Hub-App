import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Copy, Save, Send, AlertCircle, Plus, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useTimesheets } from '../hooks/useTimesheets';
import { useTimesheetTasks } from '../hooks/useTimesheetTasks';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { useProjects } from '../contexts/ProjectContext';
import { Button, StatusBadge, Combobox, ConfirmationModal } from '../components/ui';
import { getWeekStartDate, addDays, formatDateForDisplay, formatDateForKey } from '../utils/dateHelpers';

// Helper for more specific formatting without date-fns
const formatDayName = (date) => date.toLocaleDateString('en-GB', { weekday: 'short' });
const formatDayNum = (date) => date.getDate().toString();
const formatFullDisplay = (date) => {
    const d = date.getDate();
    const suffix = (d % 10 === 1 && d !== 11) ? 'st' : (d % 10 === 2 && d !== 12) ? 'nd' : (d % 10 === 3 && d !== 13) ? 'rd' : 'th';
    return `${d}${suffix} ${date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`;
};

const TimesheetsPage = ({ userId: externalUserId, onBack, externalDate }) => {
    const [selectedDate, setSelectedDate] = useState(externalDate || getWeekStartDate(new Date()));
    const weekStartStr = formatDateForKey(selectedDate);
    
    const { loading, timesheet, entries, saveEntry, deleteEntry, submitTimesheet } = useTimesheets(weekStartStr, externalUserId);
    const { projects } = useProjects();
    const { user: authUser } = useAuth();
    const { isEditorOrAbove } = usePermissions();
    const [timesheetItems, setTimesheetItems] = useState([]);
    const [globalSubtasks, setGlobalSubtasks] = useState([]);
    const [targetUser, setTargetUser] = useState(null);
    const [targetUserName, setTargetUserName] = useState('');

    // Fetch user info if externalUserId is provided
    useEffect(() => {
        if (externalUserId) {
            const fetchUserInfo = async () => {
                // Try users table first
                const { data: userData } = await supabase.from('users').select('name, line_manager_id').eq('id', externalUserId).single();
                
                if (userData) {
                    setTargetUser({ ...userData, is_dummy: false });
                    setTargetUserName(userData.name);
                } else {
                    // Try dummy_users table
                    const { data: dummyData } = await supabase.from('dummy_users').select('name, line_manager_id').eq('id', externalUserId).single();
                    if (dummyData) {
                        setTargetUser({ ...dummyData, is_dummy: true });
                        setTargetUserName(dummyData.name);
                    }
                }
            };
            fetchUserInfo();
        }
    }, [externalUserId]);

    // Custom Modal State
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmModalData, setConfirmModalData] = useState({ title: '', message: '', warnings: [] });

    // Fetch dynamic "Timesheet Items" and global subtasks
    useEffect(() => {
        const fetchDropdownData = async () => {
            try {
                // 1. Fetch Timesheet Items (Project categories)
                const { data: catData } = await supabase
                    .from('dropdown_categories')
                    .select('id, name')
                    .or('name.ilike.Timesheet Items,name.ilike.timesheet_items')
                    .limit(1);
                
                if (catData && catData.length > 0) {
                    const { data: itemsData } = await supabase
                        .from('dropdown_items')
                        .select('id, value, display_text')
                        .eq('category_id', catData[0].id)
                        .eq('is_active', true)
                        .order('sort_order');
                    setTimesheetItems(itemsData || []);
                }

                // 2. Fetch Global Subtasks (Flexible lookup)
                const { data: subCatData, error: subCatError } = await supabase
                    .from('dropdown_categories')
                    .select('id, name')
                    .or('name.ilike.Timesheet Sub_Tasks,name.ilike.Timesheet Sub Tasks,name.ilike.timesheet_sub_tasks,name.ilike.timesheet_subtasks')
                    .limit(1);
                
                if (subCatData && subCatData.length > 0) {
                    console.log('✅ Found Subtask category:', subCatData[0].name);
                    const { data: subItemsData } = await supabase
                        .from('dropdown_items')
                        .select('value, display_text')
                        .eq('category_id', subCatData[0].id)
                        .eq('is_active', true)
                        .order('sort_order');
                    setGlobalSubtasks(subItemsData || []);
                } else {
                    console.warn('❌ "Timesheet Sub_Tasks" category NOT found in Dropdown Menu. Please check the name matches exactly.');
                }
            } catch (err) {
                console.error('Error fetching dropdown data:', err);
            }
        };
        fetchDropdownData();
    }, []);

    const weekDays = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => addDays(selectedDate, i));
    }, [selectedDate]);

    const handlePrevWeek = () => setSelectedDate(prev => addDays(prev, -7));
    const handleNextWeek = () => setSelectedDate(prev => addDays(prev, 7));

    const handleConfirmSubmit = () => {
        const totalHours = entries.reduce((sum, e) => sum + Number(e.hours), 0);
        console.log('📝 Submitting timesheet. Total Hours:', totalHours);
        
        // 1. Midweek Total Hour Check (Mon-Fri)
        const midweekDateStrings = [
            formatDateForKey(addDays(selectedDate, 2)), // Mon
            formatDateForKey(addDays(selectedDate, 3)), // Tue
            formatDateForKey(addDays(selectedDate, 4)), // Wed
            formatDateForKey(addDays(selectedDate, 5)), // Thu
            formatDateForKey(addDays(selectedDate, 6))  // Fri
        ];
        console.log('📅 Midweek Date Strings:', midweekDateStrings);

        const midweekHours = entries
            .filter(e => midweekDateStrings.includes(e.entry_date))
            .reduce((sum, e) => sum + Number(e.hours), 0);
        
        console.log('⏲️ Midweek Hours (Mon-Fri):', midweekHours);

        const isLowMidweekTotal = midweekHours < 40;

        // 2. Individual Midweek Day Check
        const lowMidweekDays = midweekDateStrings.filter(dateStr => {
            const dayTotal = entries
                .filter(e => e.entry_date === dateStr)
                .reduce((sum, e) => sum + Number(e.hours), 0);
            return dayTotal < 8;
        });
        console.log('⚠️ Low Midweek Days:', lowMidweekDays);

        // 3. Prepare Modal Content
        const warnings = [];
        if (isLowMidweekTotal) {
            warnings.push(`Total midweek hours (Mon-Fri) is only ${midweekHours.toFixed(1)} (Should be at least 40).`);
        }
        if (lowMidweekDays.length > 0) {
            // Use local date parsing to get day names reliably
            const dayNames = lowMidweekDays.map(ds => {
                const [y, m, d] = ds.split('-').map(Number);
                const date = new Date(y, m - 1, d);
                return date.toLocaleDateString('en-GB', { weekday: 'long' });
            });
            warnings.push(`Less than 8 hours logged on: ${dayNames.join(', ')}.`);
        }

        console.log('🛑 Active Warnings:', warnings);

        setConfirmModalData({
            title: 'Confirm Submission',
            message: 'Are you sure you want to submit this timesheet? Once submitted, it cannot be edited until a manager reviews it.',
            warnings: warnings
        });
        setShowConfirmModal(true);
    };

    // Group entries by row (Project + Task + Subtask)
    const rowGroups = useMemo(() => {
        const groups = {};
        entries.forEach(entry => {
            const key = `${entry.project_id}-${entry.task_id}-${entry.subtask_id}`;
            if (!groups[key]) {
                const subtaskName = globalSubtasks.find(s => s.value === entry.subtask_id)?.display_text || entry.subtask_id;
                groups[key] = {
                    project_id: entry.project_id,
                    project_number: entry.project?.project_number || entry.project_number,
                    project_name: entry.project?.project_name,
                    task_id: entry.task_id,
                    task_name: entry.task?.name,
                    subtask_id: entry.subtask_id,
                    subtask_name: subtaskName,
                    days: {}
                };
            }
            groups[key].days[entry.entry_date] = entry;
        });
        return Object.values(groups);
    }, [entries, globalSubtasks]);

    const isLineManager = targetUser?.line_manager_id === authUser?.id;
    const isAdminEditing = !!externalUserId && (isEditorOrAbove || isLineManager);
    const isLocked = !isAdminEditing && (timesheet?.status === 'Approved' || timesheet?.status === 'Submitted');

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-orange-500" /></div>;

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    {onBack && (
                        <Button variant="outline" size="sm" onClick={onBack} title="Back to Overview">
                            <ChevronLeft size={20} />
                        </Button>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {externalUserId ? `Timesheet: ${targetUserName || 'Loading...'}` : 'Weekly Timesheet'}
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <StatusBadge status={timesheet?.status} />
                            <span className="text-sm text-gray-500">Week Starting: {formatFullDisplay(selectedDate)}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handlePrevWeek}>
                        <ChevronLeft size={16} />
                    </Button>
                    <span className="text-sm font-medium px-2 min-w-[150px] text-center">
                        {formatDateForDisplay(selectedDate)} - {formatDateForDisplay(addDays(selectedDate, 6))}
                    </span>
                    <Button variant="outline" size="sm" onClick={handleNextWeek}>
                        <ChevronRight size={16} />
                    </Button>
                    
                    {!isLocked && (
                        <Button 
                            className="ml-4 bg-orange-600 hover:bg-orange-700 text-white" 
                            onClick={handleConfirmSubmit}
                            disabled={entries.length === 0}
                        >
                            <Send size={16} className="mr-2" />
                            Submit
                        </Button>
                    )}
                </div>
            </div>

            {timesheet?.status === 'Rejected' && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg flex gap-3">
                    <AlertCircle className="text-red-600 dark:text-red-400 shrink-0" />
                    <div>
                        <p className="font-semibold text-red-800 dark:text-red-200">Timesheet Rejected</p>
                        <p className="text-red-700 dark:text-red-300 text-sm">{timesheet.rejection_comment}</p>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="text-xs text-white uppercase bg-orange-500 dark:bg-orange-600 border-b border-orange-600 dark:border-orange-800">
                            <tr>
                                <th className="p-3 border-b border-orange-600 dark:border-orange-800 min-w-[150px]">Project #</th>
                                <th className="p-3 border-b border-orange-600 dark:border-orange-800 min-w-[200px]">Project Name</th>
                                <th className="p-3 border-b border-orange-600 dark:border-orange-800 min-w-[150px]">Task</th>
                                <th className="p-3 border-b border-orange-600 dark:border-orange-800 min-w-[150px]">Subtask</th>
                                {weekDays.map(day => (
                                    <th key={day.toString()} className="p-3 border-b border-orange-600 dark:border-orange-800 text-center min-w-[70px]">
                                        <div className="font-bold">{formatDayName(day)}</div>
                                        <div className="text-[10px] text-orange-100">{formatDayNum(day)}</div>
                                    </th>
                                ))}
                                <th className="p-3 border-b border-orange-600 dark:border-orange-800 text-center font-bold">Total</th>
                                {!isLocked && <th className="p-3 border-b border-orange-600 dark:border-orange-800 w-10"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {rowGroups.map((row, idx) => (
                                <EditableRow 
                                    key={idx}
                                    row={row}
                                    idx={idx}
                                    weekDays={weekDays}
                                    isLocked={isLocked}
                                    projects={projects}
                                    timesheetItems={timesheetItems}
                                    globalSubtasks={globalSubtasks}
                                    saveEntry={saveEntry}
                                    deleteEntry={deleteEntry}
                                />
                            ))}
                            
                            {!isLocked && (
                                <NewEntryRow 
                                    weekDays={weekDays} 
                                    projects={projects}
                                    timesheetItems={timesheetItems}
                                    globalSubtasks={globalSubtasks}
                                    onSave={saveEntry} 
                                />
                            )}
                        </tbody>
                        <tfoot className="bg-gray-50 dark:bg-gray-900/50 font-bold text-gray-900 dark:text-white">
                            <tr>
                                <td colSpan={4} className="p-3 text-right">Daily Totals</td>
                                {weekDays.map(day => {
                                    const dateStr = formatDateForKey(day);
                                    const total = entries
                                        .filter(e => e.entry_date === dateStr)
                                        .reduce((sum, e) => sum + Number(e.hours), 0);
                                    return (
                                        <td key={dateStr} className="p-3 text-center">
                                            {total.toFixed(1)}
                                        </td>
                                    );
                                })}
                                <td className="p-3 text-center text-orange-600 dark:text-orange-400">
                                    {entries.reduce((sum, e) => sum + Number(e.hours), 0).toFixed(1)}
                                </td>
                                {!isLocked && <td></td>}
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Custom Submission Confirmation Modal */}
            <ConfirmationModal 
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={() => {
                    submitTimesheet();
                    setShowConfirmModal(false);
                }}
                title={confirmModalData.title}
                confirmText="Submit Timesheet"
                confirmButtonVariant="primary"
            >
                <div className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-400">{confirmModalData.message}</p>
                    
                    {confirmModalData.warnings.length > 0 && (
                        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-4 rounded-lg space-y-2">
                            <h4 className="font-bold text-orange-800 dark:text-orange-300 flex items-center gap-2 text-sm uppercase tracking-wider">
                                <AlertCircle size={16} />
                                Submission Warnings
                            </h4>
                            <ul className="list-disc list-inside text-sm text-orange-700 dark:text-orange-400 space-y-1">
                                {confirmModalData.warnings.map((w, i) => (
                                    <li key={i}>{w}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </ConfirmationModal>
        </div>
    );
};

const EditableRow = ({ row, idx, weekDays, isLocked, projects, timesheetItems, globalSubtasks, saveEntry, deleteEntry }) => {
    // Current selections - ensure we handle both project IDs (bigint) and internal items (string)
    const findInternalItem = () => {
        const item = timesheetItems.find(i => i.display_text === row.project_number);
        return item ? `item-${item.value}` : '';
    };
    
    const currentProjectId = row.project_id || findInternalItem();
    const isDropdownItem = typeof currentProjectId === 'string' && currentProjectId.startsWith('item-');
    const contextId = isDropdownItem 
        ? timesheetItems.find(i => `item-${i.value}` === currentProjectId)?.id
        : currentProjectId;

    const { tasks, loading: tasksLoading } = useTimesheetTasks(contextId, isDropdownItem);

    const projectOptions = useMemo(() => {
        const options = projects.map(p => ({
            value: p.id,
            label: `${p.project_number} - ${p.project_name}`
        }));
        timesheetItems.forEach(item => {
            options.push({ value: `item-${item.value}`, label: item.display_text.toUpperCase() });
        });
        return options;
    }, [projects, timesheetItems]);

    const handleUpdateMeta = (field, value) => {
        const entries = Object.values(row.days);
        if (entries.length === 0) return;

        let updateData = { [field]: value };
        
        // If project changes
        if (field === 'project_id_raw') {
            const isItem = typeof value === 'string' && value.startsWith('item-');
            if (isItem) {
                const item = timesheetItems.find(i => `item-${i.value}` === value);
                updateData = { 
                    project_id: null, 
                    project_number: item ? item.display_text : 'INTERNAL',
                    task_id: null,
                    subtask_id: null
                };
            } else {
                const proj = projects.find(p => p.id === value);
                updateData = { 
                    project_id: value, 
                    project_number: proj ? proj.project_number : 'UNKNOWN',
                    task_id: null,
                    subtask_id: null
                };
            }
        }

        // Apply to all entries in this row
        entries.forEach(entry => {
            saveEntry({ ...entry, ...updateData });
        });
    };

    return (
        <tr className="hover:bg-orange-50/50 dark:hover:bg-gray-700 transition-colors group">
            <td className="p-2">
                {isLocked ? (
                    <div className="px-3 py-2 text-sm font-bold text-orange-600 dark:text-orange-400">
                        {row.project_number}
                    </div>
                ) : (
                    <Combobox 
                        options={projectOptions.map(o => o.label)}
                        value={isDropdownItem 
                            ? row.project_number.toUpperCase() 
                            : projectOptions.find(o => o.value === currentProjectId)?.label || row.project_number}
                        onChange={(e) => {
                            const opt = projectOptions.find(o => o.label === e.target.value);
                            if (opt) handleUpdateMeta('project_id_raw', opt.value);
                        }}
                        placeholder="Project #"
                        className="min-w-[140px]"
                        inputClassName="border-none bg-transparent font-bold text-orange-600 dark:text-orange-400 p-0 focus:ring-0"
                    />
                )}
            </td>
            <td className="p-2">
                <div className="px-3 py-2 text-xs text-gray-900 dark:text-gray-100 font-medium truncate max-w-[200px]">
                    {row.project_name || (isDropdownItem ? 'Internal Category' : '-')}
                </div>
            </td>
            <td className="p-2">
                <select 
                    value={row.task_id || ''}
                    onChange={(e) => handleUpdateMeta('task_id', e.target.value)}
                    disabled={isLocked || tasksLoading}
                    className="w-full border-none bg-transparent rounded text-sm text-gray-900 dark:text-white font-bold focus:ring-1 focus:ring-orange-500"
                >
                    <option value="" className="text-gray-900 dark:text-white bg-white dark:bg-gray-800">{tasksLoading ? 'Loading...' : 'Select Task'}</option>
                    {tasks.map(t => <option key={t.id} value={t.id} className="text-gray-900 dark:text-white bg-white dark:bg-gray-800">{t.name}</option>)}
                </select>
            </td>
            <td className="p-2">
                <select 
                    value={row.subtask_id || ''}
                    onChange={(e) => handleUpdateMeta('subtask_id', e.target.value)}
                    disabled={isLocked}
                    className="w-full border-none bg-transparent rounded text-sm text-gray-800 dark:text-gray-200 font-medium focus:ring-1 focus:ring-orange-500"
                >
                    <option value="" className="text-gray-900 dark:text-white bg-white dark:bg-gray-800">Select Subtask</option>
                    {globalSubtasks.map(s => (
                        <option key={s.value} value={s.value} className="text-gray-900 dark:text-white bg-white dark:bg-gray-800">{s.display_text}</option>
                    ))}
                </select>
            </td>
            {weekDays.map(day => {
                const dateStr = formatDateForKey(day);
                const entry = row.days[dateStr];
                return (
                    <td key={dateStr} className="p-1">
                        <input 
                            type="number"
                            step="0.5"
                            min="0"
                            max="24"
                            defaultValue={entry?.hours || ''}
                            onBlur={(e) => {
                                const val = parseFloat(e.target.value);
                                if (isNaN(val)) return;
                                saveEntry({
                                    ...entry,
                                    project_id: row.project_id,
                                    project_number: row.project_number,
                                    task_id: row.task_id,
                                    subtask_id: row.subtask_id,
                                    entry_date: dateStr,
                                    hours: val
                                });
                            }}
                            disabled={isLocked}
                            className="w-full text-center border-gray-200 dark:border-gray-700 rounded focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-medium"
                        />
                    </td>
                );
            })}
            <td className="p-2 text-center font-bold text-gray-900 dark:text-white">
                {Object.values(row.days).reduce((sum, e) => sum + Number(e.hours), 0).toFixed(1)}
            </td>
            {!isLocked && (
                <td className="p-2 text-center">
                    <button 
                        onClick={() => {
                            if (window.confirm('Delete this entire line?')) {
                                Object.values(row.days).forEach(e => deleteEntry(e.id));
                            }
                        }}
                        className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete Line"
                    >
                        <Trash2 size={16} />
                    </button>
                </td>
            )}
        </tr>
    );
};

const NewEntryRow = ({ weekDays, projects, timesheetItems, globalSubtasks, onSave }) => {
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [row, setRow] = useState({
        task_id: '',
        subtask_id: '',
        hours: {}
    });

    // Determine context for task loading
    const isDropdownItem = typeof selectedProjectId === 'string' && selectedProjectId.startsWith('item-');
    const contextId = isDropdownItem 
        ? timesheetItems.find(i => `item-${i.value}` === selectedProjectId)?.id // We need the UUID from dropdown_items
        : selectedProjectId;

    const { tasks, loading: tasksLoading } = useTimesheetTasks(contextId, isDropdownItem);

    const projectOptions = useMemo(() => {
        const options = projects.map(p => ({
            value: p.id,
            label: `${p.project_number} - ${p.project_name}`
        }));
        
        // Add dynamic Timesheet Items at the bottom
        timesheetItems.forEach(item => {
            options.push({ 
                value: `item-${item.value}`, 
                label: item.display_text.toUpperCase() 
            });
        });
        
        return options;
    }, [projects, timesheetItems]);

    const handleSave = () => {
        if (!selectedProjectId || !row.task_id) return;
        
        let project_id = null;
        let project_number = '';

        if (typeof selectedProjectId === 'string' && selectedProjectId.startsWith('item-')) {
            const itemValue = selectedProjectId.replace('item-', '');
            const item = timesheetItems.find(i => i.value === itemValue);
            project_number = item ? item.display_text : 'INTERNAL';
        } else {
            const proj = projects.find(p => p.id === selectedProjectId);
            project_id = selectedProjectId;
            project_number = proj ? proj.project_number : 'UNKNOWN';
        }

        // Save each day that has hours
        Object.entries(row.hours).forEach(([date, hrs]) => {
            if (hrs > 0) {
                onSave({
                    project_id,
                    project_number,
                    task_id: row.task_id,
                    subtask_id: row.subtask_id || null,
                    entry_date: date,
                    hours: hrs
                });
            }
        });
        
        // Reset
        setSelectedProjectId('');
        setRow({ task_id: '', subtask_id: '', hours: {} });
    };

    return (
        <tr className="bg-orange-50/30 dark:bg-orange-900/10">
            <td className="p-2">
                <Combobox 
                    options={projectOptions.map(o => o.label)}
                    value={projectOptions.find(o => o.value === selectedProjectId)?.label || ''}
                    onChange={(e) => {
                        const opt = projectOptions.find(o => o.label === e.target.value);
                        if (opt) setSelectedProjectId(opt.value);
                    }}
                    placeholder="Select Project"
                    className="min-w-[150px]"
                />
            </td>
            <td className="p-2">
                <div className="px-3 py-2 text-xs text-gray-500 font-medium truncate max-w-[200px]">
                    {(typeof selectedProjectId === 'string' && selectedProjectId.startsWith('item-')) 
                        ? 'Internal Category' 
                        : projects.find(p => p.id === selectedProjectId)?.project_name || '-'}
                </div>
            </td>
            <td className="p-2">
                <select 
                    value={row.task_id}
                    onChange={e => setRow({...row, task_id: e.target.value})}
                    disabled={!selectedProjectId || tasksLoading}
                    className="w-full border-gray-200 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-2 py-1 disabled:opacity-50 focus:ring-orange-500 focus:border-orange-500"
                >
                    <option value="" className="text-gray-900 dark:text-white">{tasksLoading ? 'Loading...' : 'Select Task'}</option>
                    {tasks.map(t => <option key={t.id} value={t.id} className="text-gray-900 dark:text-white">{t.name}</option>)}
                </select>
            </td>
            <td className="p-2">
                <select 
                    value={row.subtask_id}
                    onChange={e => setRow({...row, subtask_id: e.target.value})}
                    disabled={!row.task_id}
                    className="w-full border-gray-200 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-2 py-1 disabled:opacity-50 focus:ring-orange-500 focus:border-orange-500"
                >
                    <option value="" className="text-gray-900 dark:text-white">Select Subtask</option>
                    {globalSubtasks.map(s => (
                        <option key={s.value} value={s.value} className="text-gray-900 dark:text-white">{s.display_text}</option>
                    ))}
                </select>
            </td>
            {weekDays.map(day => {
                const dateStr = formatDateForKey(day);
                return (
                    <td key={dateStr} className="p-1">
                        <input 
                            type="number" 
                            step="0.5"
                            value={row.hours[dateStr] || ''}
                            onChange={e => setRow({
                                ...row, 
                                hours: { ...row.hours, [dateStr]: parseFloat(e.target.value) }
                            })}
                            className="w-full text-center border-gray-200 dark:border-gray-700 rounded text-sm dark:bg-gray-800 px-1 py-1"
                        />
                    </td>
                );
            })}
            <td className="p-2 text-center">
                <Button size="sm" onClick={handleSave} disabled={!selectedProjectId || !row.task_id}>
                    <Plus size={14} />
                </Button>
            </td>
            <td></td>
        </tr>
    );
};

export default TimesheetsPage;
