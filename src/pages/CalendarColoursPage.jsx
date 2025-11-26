import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Palette, Save, RotateCcw, Loader2 } from 'lucide-react';

const CalendarColoursPage = () => {
    const { user: currentUser } = useAuth();
    const isAdminOrSuperAdmin = currentUser && (currentUser.privilege === 'Admin' || currentUser.privilege === 'Super Admin');

    const [activeTab, setActiveTab] = useState('resource');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [resourceColours, setResourceColours] = useState({});
    const [equipmentColours, setEquipmentColours] = useState({});
    const [categories, setCategories] = useState({ statuses: [], disciplines: [] });

    // Predefined colour palette
    const colourPalette = [
        { name: 'Orange', value: '#F97316' },
        { name: 'Blue', value: '#3B82F6' },
        { name: 'Green', value: '#10B981' },
        { name: 'Purple', value: '#8B5CF6' },
        { name: 'Pink', value: '#EC4899' },
        { name: 'Yellow', value: '#EAB308' },
        { name: 'Red', value: '#EF4444' },
        { name: 'Teal', value: '#14B8A6' },
        { name: 'Indigo', value: '#6366F1' },
        { name: 'Cyan', value: '#06B6D4' },
        { name: 'Lime', value: '#84CC16' },
        { name: 'Amber', value: '#F59E0B' },
        { name: 'Rose', value: '#F43F5E' },
        { name: 'Emerald', value: '#059669' },
        { name: 'Violet', value: '#7C3AED' },
        { name: 'Sky', value: '#0EA5E9' },
        { name: 'Gray', value: '#6B7280' },
        { name: 'Slate', value: '#64748B' },
    ];

    // Default colour
    const defaultColour = '#F97316';

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);

            // Define shift and leave types used in Resource Calendar
            const shiftTypes = [
                { value: 'Nights', display_text: 'Nights' },
                { value: 'Days', display_text: 'Days' },
                { value: 'Evening', display_text: 'Evening' }
            ];

            // Fetch unique leave types from calendar_colours table
            const { data: leaveTypesData, error: leaveError } = await supabase
                .from('calendar_colours')
                .select('category_value, category_display')
                .eq('calendar_type', 'resource')
                .eq('category_type', 'leave')
                .order('category_value');

            if (leaveError) {
                console.error('Error fetching leave types:', leaveError);
            }

            const leaveTypes = (leaveTypesData || []).map(item => ({
                value: item.category_value,
                display_text: item.category_display || item.category_value
            }));

            // Fetch unique equipment categories from equipment table
            const { data: equipmentData, error: equipError } = await supabase
                .from('equipment')
                .select('category');

            if (equipError) {
                console.error('Error fetching equipment:', equipError);
            }

            // Get unique categories
            const uniqueCategories = [...new Set((equipmentData || []).map(item => item.category).filter(Boolean))].sort();

            // Fetch colour settings
            const { data: coloursData, error: coloursError } = await supabase
                .from('calendar_colours')
                .select('*');

            if (coloursError) throw coloursError;

            // Set categories - Resource uses shifts/leaves, Equipment uses unique categories from equipment table
            setCategories({
                statuses: shiftTypes,
                disciplines: leaveTypes,
                equipmentCategories: uniqueCategories.map(category => ({
                    value: category,
                    display_text: category
                }))
            });

            // Process colour settings
            const colours = coloursData || [];
            const resourceColourMap = {};
            const equipmentColourMap = {};

            colours.forEach(colour => {
                if (colour.calendar_type === 'resource') {
                    resourceColourMap[colour.category_value] = colour.colour;
                } else if (colour.calendar_type === 'equipment') {
                    equipmentColourMap[colour.category_value] = colour.colour;
                }
            });

            setResourceColours(resourceColourMap);
            setEquipmentColours(equipmentColourMap);
        } catch (error) {
            console.error('Error loading calendar colours:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleColourChange = (categoryValue, colour) => {
        if (activeTab === 'resource') {
            setResourceColours(prev => ({ ...prev, [categoryValue]: colour }));
        } else {
            setEquipmentColours(prev => ({ ...prev, [categoryValue]: colour }));
        }
    };

    const handleSave = async () => {
        if (!isAdminOrSuperAdmin) return;

        try {
            setSaving(true);

            const calendarType = activeTab === 'resource' ? 'resource' : 'equipment';
            const colourMap = activeTab === 'resource' ? resourceColours : equipmentColours;

            let allCategories, colourSettings;

            if (activeTab === 'resource') {
                allCategories = [...categories.statuses, ...categories.disciplines];
                colourSettings = allCategories.map(cat => ({
                    calendar_type: calendarType,
                    category_type: categories.statuses.some(s => s.value === cat.value) ? 'shift' : 'leave',
                    category_value: cat.value,
                    category_display: cat.display_text,
                    colour: colourMap[cat.value] || defaultColour
                }));
            } else {
                // Equipment calendar uses equipment categories
                allCategories = categories.equipmentCategories || [];
                colourSettings = allCategories.map(cat => ({
                    calendar_type: calendarType,
                    category_type: 'equipment',
                    category_value: cat.value,
                    category_display: cat.display_text,
                    colour: colourMap[cat.value] || defaultColour
                }));
            }

            // Delete existing colours for this calendar type
            await supabase
                .from('calendar_colours')
                .delete()
                .eq('calendar_type', calendarType);

            // Insert new colour settings
            const { error } = await supabase
                .from('calendar_colours')
                .insert(colourSettings);

            if (error) throw error;

            alert('Colours saved successfully!');
        } catch (error) {
            console.error('Error saving colours:', error);
            alert('Error saving colours: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        if (activeTab === 'resource') {
            setResourceColours({});
        } else {
            setEquipmentColours({});
        }
    };

    const currentColours = activeTab === 'resource' ? resourceColours : equipmentColours;

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
                <div className="flex items-center gap-2 mb-2">
                    <Palette className="text-orange-500" size={24} />
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar Colours</h1>
                </div>
                <p className="text-gray-600 dark:text-gray-400">Customize tile colours for calendar views</p>
            </div>

            {/* Tabs */}
            <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex gap-4">
                    <button
                        onClick={() => setActiveTab('resource')}
                        className={`px-4 py-2 font-medium transition-colors ${
                            activeTab === 'resource'
                                ? 'text-orange-500 border-b-2 border-orange-500'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        Resource Calendar
                    </button>
                    <button
                        onClick={() => setActiveTab('equipment')}
                        className={`px-4 py-2 font-medium transition-colors ${
                            activeTab === 'equipment'
                                ? 'text-orange-500 border-b-2 border-orange-500'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        Equipment Calendar
                    </button>
                </div>
            </div>

            {/* Colour Configuration */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
                <div className="mb-6 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Configure {activeTab === 'resource' ? 'Resource' : 'Equipment'} Calendar Colours
                    </h2>
                    <div className="flex gap-2">
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            disabled={saving}
                        >
                            <RotateCcw size={16} />
                            Reset
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={saving || !isAdminOrSuperAdmin}
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>

                {activeTab === 'resource' ? (
                    <>
                        {/* Shift Types Section */}
                        <div className="mb-8">
                            <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-4">Shift Type Colours</h3>
                            <div className="space-y-4">
                                {categories.statuses.map(status => (
                                    <ColourPicker
                                        key={status.value}
                                        label={status.display_text}
                                        value={currentColours[status.value] || defaultColour}
                                        onChange={(colour) => handleColourChange(status.value, colour)}
                                        colourPalette={colourPalette}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Leave Types Section */}
                        <div>
                            <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-4">Leave Type Colours</h3>
                            <div className="space-y-4">
                                {categories.disciplines.map(discipline => (
                                    <ColourPicker
                                        key={discipline.value}
                                        label={discipline.display_text}
                                        value={currentColours[discipline.value] || defaultColour}
                                        onChange={(colour) => handleColourChange(discipline.value, colour)}
                                        colourPalette={colourPalette}
                                    />
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Equipment Categories Section */}
                        <div>
                            <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-4">Equipment Category Colours</h3>
                            <div className="space-y-4">
                                {(categories.equipmentCategories || []).map(category => (
                                    <ColourPicker
                                        key={category.value}
                                        label={category.display_text}
                                        value={currentColours[category.value] || defaultColour}
                                        onChange={(colour) => handleColourChange(category.value, colour)}
                                        colourPalette={colourPalette}
                                    />
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const ColourPicker = ({ label, value, onChange, colourPalette }) => {
    const [showPalette, setShowPalette] = useState(false);

    return (
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center gap-4">
                <div
                    className="w-12 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer shadow-sm"
                    style={{ backgroundColor: value }}
                    onClick={() => setShowPalette(!showPalette)}
                />
                <div>
                    <p className="font-medium text-gray-900 dark:text-white">{label}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{value}</p>
                </div>
            </div>

            {showPalette && (
                <div className="absolute mt-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-10">
                    <div className="grid grid-cols-6 gap-2">
                        {colourPalette.map(colour => (
                            <button
                                key={colour.value}
                                className="w-10 h-10 rounded-lg border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
                                style={{ backgroundColor: colour.value }}
                                onClick={() => {
                                    onChange(colour.value);
                                    setShowPalette(false);
                                }}
                                title={colour.name}
                            />
                        ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Custom Colour
                        </label>
                        <input
                            type="color"
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            className="w-full h-10 rounded cursor-pointer"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarColoursPage;
