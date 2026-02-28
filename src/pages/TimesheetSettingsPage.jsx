import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Edit, Save, X, ChevronRight, LayoutGrid, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useProjects } from '../contexts/ProjectContext';
import { Button, Card, Combobox } from '../components/ui';
import { useToast } from '../contexts/ToastContext';

const TimesheetSettingsPage = () => {
    const { projects } = useProjects();
    const { showToast } = useToast();
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [timesheetItems, setTimesheetItems] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    
    const [newTaskName, setNewTaskName] = useState('');

    // Fetch dynamic "Timesheet Items" from dropdown_items
    useEffect(() => {
        const fetchTimesheetItems = async () => {
            try {
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
                    
                    // Set default selection to the first internal item if available
                    if (itemsData && itemsData.length > 0 && !selectedProjectId) {
                        setSelectedProjectId(`item-${itemsData[0].value}`);
                    }
                }
            } catch (err) {
                console.error('Error fetching dynamic timesheet items:', err);
            }
        };
        fetchTimesheetItems();
    }, []);

    const projectOptions = useMemo(() => {
        const options = [];
        
        // 1. Projects first
        projects.forEach(p => options.push({ value: p.id, label: `${p.project_number} - ${p.project_name}` }));

        // 2. Dynamic Timesheet Items at bottom
        timesheetItems.forEach(item => {
            options.push({ 
                value: `item-${item.value}`, 
                label: item.display_text.toUpperCase() 
            });
        });

        return options;
    }, [projects, timesheetItems]);

    const fetchTasks = async () => {
        if (!selectedProjectId) return;
        
        setLoading(true);
        try {
            let query = supabase.from('timesheet_tasks').select(`*`);
            
            if (typeof selectedProjectId === 'string' && selectedProjectId.startsWith('item-')) {
                const item = timesheetItems.find(i => `item-${i.value}` === selectedProjectId);
                if (!item) throw new Error('Item not found');
                query = query.eq('dropdown_item_id', item.id);
            } else {
                query = query.eq('project_id', selectedProjectId);
            }

            const { data, error } = await query.order('name');
            if (error) throw error;
            setTasks(data || []);
        } catch (error) {
            console.error('Error fetching tasks:', error);
            showToast('Failed to load tasks', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, [selectedProjectId, timesheetItems]);

    const handleAddTask = async (e) => {
        e.preventDefault();
        if (!newTaskName.trim() || !selectedProjectId) return;

        try {
            const isDropdownItem = typeof selectedProjectId === 'string' && selectedProjectId.startsWith('item-');
            let insertData = {
                name: newTaskName,
                is_active: true,
                is_internal: isDropdownItem
            };

            if (isDropdownItem) {
                const item = timesheetItems.find(i => `item-${i.value}` === selectedProjectId);
                insertData.dropdown_item_id = item.id;
                insertData.project_id = null;
            } else {
                insertData.project_id = selectedProjectId;
                insertData.dropdown_item_id = null;
            }

            const { data, error } = await supabase
                .from('timesheet_tasks')
                .insert([insertData])
                .select()
                .single();

            if (error) throw error;
            
            setTasks(prev => [...prev, data]);
            setNewTaskName('');
            showToast('Task added successfully', 'success');
        } catch (error) {
            console.error('Error adding task:', error);
            showToast('Failed to add task', 'error');
        }
    };

    const handleDeleteTask = async (id) => {
        if (!window.confirm('Delete this task?')) return;
        
        try {
            const { error } = await supabase.from('timesheet_tasks').delete().eq('id', id);
            if (error) throw error;
            setTasks(prev => prev.filter(t => t.id !== id));
            showToast('Task deleted', 'success');
        } catch (error) {
            showToast('Failed to delete task', 'error');
        }
    };

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <LayoutGrid className="text-orange-500" />
                        Timesheet Task Management
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Define unique tasks for each project and internal category.</p>
                </div>
            </div>

            <Card title="Step 1: Select Project or Internal Category" className="mb-6">
                <div className="flex items-end gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Context</label>
                        <Combobox 
                            options={projectOptions.map(o => o.label)}
                            value={projectOptions.find(o => o.value === selectedProjectId)?.label || ''}
                            onChange={(e) => {
                                const opt = projectOptions.find(o => o.label === e.target.value);
                                if (opt) setSelectedProjectId(opt.value);
                            }}
                            placeholder="Select where to add tasks..."
                        />
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Step 2: Manage Tasks">
                    <form onSubmit={handleAddTask} className="mb-6 flex gap-2">
                        <input 
                            value={newTaskName}
                            onChange={e => setNewTaskName(e.target.value)}
                            placeholder="Add new task (e.g. Surveying, Office Work)..."
                            className="flex-1 border-gray-200 dark:border-gray-700 rounded-lg text-sm dark:bg-gray-800 text-gray-900 dark:text-white px-3"
                        />
                        <Button type="submit" size="sm" disabled={!selectedProjectId}>
                            <Plus size={16} className="mr-1" /> Add Task
                        </Button>
                    </form>

                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-orange-500" /></div>
                    ) : (
                        <div className="space-y-3">
                            {tasks.map(task => (
                                <div key={task.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg group">
                                    <span className="font-medium text-sm text-gray-900 dark:text-white">{task.name}</span>
                                    <button 
                                        onClick={() => handleDeleteTask(task.id)}
                                        className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            {tasks.length === 0 && selectedProjectId && (
                                <div className="text-center py-8 text-gray-500 bg-gray-50 dark:bg-gray-900/50 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-800 text-sm">
                                    No tasks defined for this context yet.
                                </div>
                            )}
                        </div>
                    )}
                </Card>

                <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-xl border border-blue-200 dark:border-blue-800 self-start">
                    <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                        <AlertCircle size={18} />
                        How this works
                    </h3>
                    <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-3">
                        <li>• <strong>No more Shared Tasks</strong>: Tasks are now 100% unique to the project or category you select above.</li>
                        <li>• <strong>Internal Categories</strong>: Selecting "INTERNAL: SICK" allows you to define tasks like "Paid Sick Leave" which will only appear when SICK is selected in the timesheet.</li>
                        <li>• <strong>Projects</strong>: Selecting a project number allows you to define job-specific tasks like "Site Survey", "Post Processing", etc.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default TimesheetSettingsPage;
