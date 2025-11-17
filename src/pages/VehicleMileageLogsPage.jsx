import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Card, Button, Input, Modal, Select } from '../components/ui';
import { Car, Plus, Search, Calendar, AlertTriangle, CheckCircle, Clock, FileText, ChevronRight, Filter, Loader2, Eye, X, Camera, Upload, Trash2 } from 'lucide-react';

const VehicleMileageLogsPage = () => {
    const { user } = useAuth();
    const [vehicles, setVehicles] = useState([]);
    const [inspections, setInspections] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterUser, setFilterUser] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all'); // all, overdue, upcoming, compliant
    const [showInspectionModal, setShowInspectionModal] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [currentInspection, setCurrentInspection] = useState(null);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedInspectionDetail, setSelectedInspectionDetail] = useState(null);

    // Fetch vehicles from vehicles table
    const fetchVehicles = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('vehicles')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            setVehicles(data || []);
        } catch (err) {
            console.error('Error fetching vehicles:', err);
        }
    }, []);

    // Fetch all inspection logs
    const fetchInspections = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('vehicle_inspection_logs')
                .select(`
                    *,
                    vehicles:vehicle_id (id, name, serial_number),
                    users:user_id (id, name)
                `)
                .order('inspection_date', { ascending: false });

            if (error) throw error;
            setInspections(data || []);
        } catch (err) {
            console.error('Error fetching inspections:', err);
        }
    }, []);

    // Fetch vehicle assignments
    const fetchAssignments = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('vehicle_assignments')
                .select('*')
                .order('assigned_at', { ascending: false });

            if (error) throw error;
            setAssignments(data || []);
        } catch (err) {
            console.error('Error fetching assignments:', err);
        }
    }, []);

    // Fetch users (both real and dummy users)
    const fetchUsers = useCallback(async () => {
        try {
            // Fetch real users
            const { data: realUsers, error: realError } = await supabase
                .from('users')
                .select('*')
                .is('deleted_at', null);

            // Fetch dummy users
            const { data: dummyUsers, error: dummyError } = await supabase
                .from('dummy_users')
                .select('*')
                .eq('is_active', true)
                .is('deleted_at', null);

            if (realError) console.error('Error fetching users:', realError);
            if (dummyError) console.error('Error fetching dummy users:', dummyError);

            // Combine both user lists
            const allUsers = [...(realUsers || []), ...(dummyUsers || [])];
            setUsers(allUsers);
        } catch (err) {
            console.error('Error fetching users:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchVehicles();
        fetchInspections();
        fetchAssignments();
        fetchUsers();
    }, [fetchVehicles, fetchInspections, fetchAssignments, fetchUsers]);

    // Calculate inspection status for a vehicle
    const getVehicleStatus = (vehicleId) => {
        const vehicleInspections = inspections.filter(i => i.vehicle_id === vehicleId);
        if (vehicleInspections.length === 0) {
            return { status: 'never', daysOverdue: null, lastInspection: null, nextInspectionDate: null };
        }

        const lastInspection = vehicleInspections[0];
        const lastInspectionDate = new Date(lastInspection.inspection_date);
        const today = new Date();
        const daysSinceInspection = Math.floor((today - lastInspectionDate) / (1000 * 60 * 60 * 24));

        // Calculate next inspection date (7 days after last inspection)
        const nextInspectionDate = new Date(lastInspectionDate);
        nextInspectionDate.setDate(nextInspectionDate.getDate() + 7);

        // Weekly checks = 7 days
        if (daysSinceInspection <= 7) {
            return { status: 'compliant', daysSinceInspection, lastInspection, nextInspectionDate };
        } else if (daysSinceInspection <= 10) {
            return { status: 'upcoming', daysSinceInspection, lastInspection, nextInspectionDate };
        } else {
            return { status: 'overdue', daysOverdue: daysSinceInspection - 7, lastInspection, nextInspectionDate };
        }
    };

    // Get the currently assigned user for a vehicle
    const getAssignedUser = (vehicleId) => {
        const assignment = assignments.find(a => a.vehicle_id === vehicleId && !a.returned_at);
        if (!assignment) return null;

        // Find the user by either user_id or dummy_user_id
        const userId = assignment.user_id || assignment.dummy_user_id;
        if (!userId) return null;

        return users.find(u => u.id === userId);
    };

    // Filter vehicles based on user and status
    const filteredVehicles = vehicles.filter(vehicle => {
        // Filter by assigned user
        if (filterUser !== 'all') {
            const assignedUser = getAssignedUser(vehicle.id);
            if (!assignedUser || assignedUser.id !== filterUser) return false;
        }

        if (filterStatus === 'all') return true;

        // Handle defects filter
        if (filterStatus === 'defects') {
            const vehicleInspections = inspections.filter(i => i.vehicle_id === vehicle.id);
            if (vehicleInspections.length === 0) return false;
            const lastInspection = vehicleInspections[0];
            return lastInspection.has_defects === true;
        }

        const vehicleStatus = getVehicleStatus(vehicle.id);
        return vehicleStatus.status === filterStatus;
    });

    // Get status badge styling
    const getStatusBadge = (status) => {
        switch (status) {
            case 'compliant':
                return {
                    color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
                    icon: <CheckCircle className="w-4 h-4" />,
                    text: 'Compliant'
                };
            case 'upcoming':
                return {
                    color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
                    icon: <Clock className="w-4 h-4" />,
                    text: 'Due Soon'
                };
            case 'overdue':
                return {
                    color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
                    icon: <AlertTriangle className="w-4 h-4" />,
                    text: 'Overdue'
                };
            case 'never':
                return {
                    color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
                    icon: <FileText className="w-4 h-4" />,
                    text: 'Never Inspected'
                };
            default:
                return {
                    color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
                    icon: <FileText className="w-4 h-4" />,
                    text: 'Unknown'
                };
        }
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    // Statistics
    const stats = {
        total: vehicles.length,
        compliant: vehicles.filter(v => getVehicleStatus(v.id).status === 'compliant').length,
        upcoming: vehicles.filter(v => getVehicleStatus(v.id).status === 'upcoming').length,
        overdue: vehicles.filter(v => getVehicleStatus(v.id).status === 'overdue').length,
        withDefects: vehicles.filter(v => {
            const vehicleInspections = inspections.filter(i => i.vehicle_id === v.id);
            if (vehicleInspections.length === 0) return false;
            const lastInspection = vehicleInspections[0]; // Already sorted by date desc
            return lastInspection.has_defects === true;
        }).length,
    };

    const handleStartInspection = (vehicle) => {
        setSelectedVehicle(vehicle);
        setCurrentInspection({
            vehicle_id: vehicle.id,
            user_id: user.id,
            inspection_date: new Date().toISOString().split('T')[0],
            mileage: '',
            // Initialize all checks to null
            check_engine_oil: null,
            check_brake: null,
            check_clutch: null,
            check_power_steering: null,
            check_auto_transmission: null,
            check_screen_wash: null,
            check_fuel: null,
            check_coolant: null,
            check_indicators: null,
            check_side_lights: null,
            check_headlights_dipped: null,
            check_headlights_main: null,
            check_number_plate_light: null,
            check_reversing_light: null,
            check_warning_lights: null,
            check_horn: null,
            check_door_wing_mirrors: null,
            check_wiper_blades: null,
            check_screen_washers: null,
            check_tyre_pressure: null,
            check_tyre_condition: null,
            check_windscreen_wipers: null,
            check_spare_wheel: null,
            check_cleanliness: null,
            check_seat_belts: null,
            check_first_aid_kit: null,
            check_fire_extinguisher: null,
            check_head_restraint: null,
            check_torch: null,
            check_general_bodywork: null,
            check_spill_kit: null,
            check_door_locking: null,
            comments: '',
            damage_notes: '',
            photos: [],
        });
        setShowInspectionModal(true);
    };

    const handleViewHistory = (vehicle) => {
        setSelectedVehicle(vehicle);
        setShowHistoryModal(true);
    };

    const handleViewInspectionDetail = (inspection) => {
        setSelectedInspectionDetail(inspection);
        setShowDetailModal(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
            {/* Fixed Header - Title Only */}
            <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-2 md:py-4">
                <div className="flex items-center space-x-3">
                    <Car className="w-6 h-6 md:w-8 md:h-8 text-orange-500" />
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Vehicle Mileage Logs</h1>
                        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Weekly vehicle inspection tracking</p>
                    </div>
                </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-auto">
                <div className="bg-white dark:bg-gray-800 px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 dark:border-gray-700">
                    {/* Statistics Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4">
                    <Card className="p-2 md:p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus('all')}>
                        <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Total Vehicles</div>
                        <div className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</div>
                    </Card>
                    <Card className="p-2 md:p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus('compliant')}>
                        <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Compliant</div>
                        <div className="text-xl md:text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.compliant}</div>
                    </Card>
                    <Card className="p-2 md:p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus('upcoming')}>
                        <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Due Soon</div>
                        <div className="text-xl md:text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">{stats.upcoming}</div>
                    </Card>
                    <Card className="p-2 md:p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus('overdue')}>
                        <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Overdue</div>
                        <div className="text-xl md:text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{stats.overdue}</div>
                    </Card>
                    <Card className="p-2 md:p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus('defects')}>
                        <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">With Defects</div>
                        <div className="text-xl md:text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">{stats.withDefects}</div>
                    </Card>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-2 md:gap-4 mt-3 md:mt-4">
                    <div className="flex items-center space-x-2 flex-1">
                        <Filter className="w-5 h-5 text-gray-400" />
                        <Select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} className="flex-1">
                            <option value="all">All Users</option>
                            {users
                                .filter(u => assignments.some(a => (a.user_id === u.id || a.dummy_user_id === u.id) && !a.returned_at))
                                .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                                .map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))
                            }
                        </Select>
                    </div>
                    <div className="flex items-center space-x-2 flex-1">
                        <Filter className="w-5 h-5 text-gray-400" />
                        <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="flex-1">
                            <option value="all">All Status</option>
                            <option value="compliant">Compliant</option>
                            <option value="upcoming">Due Soon</option>
                            <option value="overdue">Overdue</option>
                            <option value="never">Never Inspected</option>
                            <option value="defects">With Defects</option>
                        </Select>
                    </div>
                    </div>
                </div>

                {/* Vehicle Grid */}
                <div className="p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {filteredVehicles.map(vehicle => {
                        const vehicleStatus = getVehicleStatus(vehicle.id);
                        const badge = getStatusBadge(vehicleStatus.status);

                        return (
                            <Card key={vehicle.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
                                <div className="p-6">
                                    {/* Status Badge */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${badge.color}`}>
                                            {badge.icon}
                                            <span className="text-xs font-semibold">{badge.text}</span>
                                        </div>
                                        {vehicleStatus.daysOverdue && (
                                            <span className="text-xs text-red-600 dark:text-red-400 font-semibold">
                                                {vehicleStatus.daysOverdue}d overdue
                                            </span>
                                        )}
                                    </div>

                                    {/* Vehicle Info */}
                                    <div className="flex items-start space-x-3 mb-4">
                                        <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <Car className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                                                {vehicle.name}
                                            </h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                                {vehicle.serial_number || 'No Serial Number'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Last Inspection */}
                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500 dark:text-gray-400">Last Inspection:</span>
                                            <span className="text-gray-900 dark:text-white font-medium">
                                                {vehicleStatus.lastInspection ? formatDate(vehicleStatus.lastInspection.inspection_date) : 'Never'}
                                            </span>
                                        </div>
                                        {vehicleStatus.nextInspectionDate && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-500 dark:text-gray-400">Next Inspection:</span>
                                                <span className="text-gray-900 dark:text-white font-medium">
                                                    {formatDate(vehicleStatus.nextInspectionDate)}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500 dark:text-gray-400">Assigned To:</span>
                                            <span className={`font-medium ${getAssignedUser(vehicle.id) ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                                                {getAssignedUser(vehicle.id)?.name || 'Not Assigned'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => handleViewHistory(vehicle)}
                                            variant="outline"
                                            className="flex-1"
                                        >
                                            <Eye className="w-4 h-4 mr-2" />
                                            History
                                        </Button>
                                        <Button
                                            onClick={() => handleStartInspection(vehicle)}
                                            className="flex-1 group-hover:bg-orange-600 transition-colors"
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Inspect
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>

                {filteredVehicles.length === 0 && (
                    <div className="text-center py-12">
                        <Car className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No vehicles found</h3>
                        <p className="text-gray-500 dark:text-gray-400">
                            {filterUser !== 'all' || filterStatus !== 'all'
                                ? 'Try adjusting your filters'
                                : 'No vehicles are currently tracked in the system'}
                        </p>
                    </div>
                )}
                </div>
            </div>

            {/* Inspection Modal */}
            {showInspectionModal && (
                <InspectionModal
                    vehicle={selectedVehicle}
                    inspection={currentInspection}
                    onClose={() => {
                        setShowInspectionModal(false);
                        setSelectedVehicle(null);
                        setCurrentInspection(null);
                    }}
                    onSave={() => {
                        fetchInspections();
                        setShowInspectionModal(false);
                        setSelectedVehicle(null);
                        setCurrentInspection(null);
                    }}
                />
            )}

            {/* History Modal */}
            {showHistoryModal && (
                <HistoryModal
                    vehicle={selectedVehicle}
                    inspections={inspections.filter(i => i.vehicle_id === selectedVehicle?.id)}
                    onClose={() => {
                        setShowHistoryModal(false);
                        setSelectedVehicle(null);
                    }}
                    onViewDetail={handleViewInspectionDetail}
                />
            )}

            {/* Inspection Detail Modal */}
            {showDetailModal && (
                <InspectionDetailModal
                    inspection={selectedInspectionDetail}
                    onClose={() => {
                        setShowDetailModal(false);
                        setSelectedInspectionDetail(null);
                    }}
                />
            )}
        </div>
    );
};

// Inspection Modal Component
const InspectionModal = ({ vehicle, inspection, onClose, onSave }) => {
    const [formData, setFormData] = useState(inspection);
    const [saving, setSaving] = useState(false);
    const [uploadedImages, setUploadedImages] = useState([]);
    const [uploading, setUploading] = useState(false);

    const handleCheckChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: prev[field] === value ? null : value
        }));
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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

    // Handle image upload
    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploading(true);
        try {
            const file = files[0]; // Take only the first file since we removed multiple

            // Compress image
            const compressedBlob = await compressImage(file);

            // Generate unique filename
            const fileExt = file.name.split('.').pop() || 'jpg';
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `vehicle-inspections/${vehicle.id}/${fileName}`;

            // Upload to Supabase Storage
            const { data, error } = await supabase.storage
                .from('vehicle-photos')
                .upload(filePath, compressedBlob, {
                    contentType: 'image/jpeg',
                    cacheControl: '3600'
                });

            if (error) {
                console.error('Supabase upload error:', error);
                throw error;
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('vehicle-photos')
                .getPublicUrl(filePath);

            setUploadedImages(prev => [...prev, { url: publicUrl, path: filePath }]);

            // Reset the input so user can take another photo
            e.target.value = '';
        } catch (error) {
            console.error('Error uploading image:', error);
            alert(`Error uploading image: ${error.message}. Please try again.`);
        } finally {
            setUploading(false);
        }
    };

    // Remove uploaded image
    const handleRemoveImage = async (imageToRemove) => {
        try {
            // Delete from storage
            if (imageToRemove.path) {
                await supabase.storage
                    .from('vehicle-photos')
                    .remove([imageToRemove.path]);
            }

            setUploadedImages(prev => prev.filter(img => img.url !== imageToRemove.url));
        } catch (error) {
            console.error('Error removing image:', error);
        }
    };

    const handleSubmit = async () => {
        if (!formData.mileage) {
            alert('Please enter the current mileage');
            return;
        }

        setSaving(true);
        try {
            // Check if there are any defects
            const hasDefects = Object.keys(formData).some(key =>
                key.startsWith('check_') && formData[key] === 'defective'
            );

            const dataToSubmit = {
                ...formData,
                has_defects: hasDefects || uploadedImages.length > 0,
                is_submitted: true,
                submitted_at: new Date().toISOString(),
                photos: uploadedImages.length > 0 ? uploadedImages : []
            };

            const { error } = await supabase
                .from('vehicle_inspection_logs')
                .insert([dataToSubmit]);

            if (error) throw error;

            onSave();
        } catch (err) {
            console.error('Error saving inspection:', err);
            alert('Failed to save inspection: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const CheckItem = ({ label, field }) => (
        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
            <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
            <div className="flex space-x-2">
                {['satisfactory', 'defective', 'n/a'].map(option => (
                    <button
                        key={option}
                        onClick={() => handleCheckChange(field, option)}
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${
                            formData[field] === option
                                ? option === 'satisfactory'
                                    ? 'bg-green-500 text-white'
                                    : option === 'defective'
                                    ? 'bg-red-500 text-white'
                                    : 'bg-gray-500 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                    >
                        {option === 'satisfactory' ? '✓' : option === 'defective' ? '✗' : 'N/A'}
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <Modal isOpen={true} onClose={onClose} title={`Vehicle Inspection - ${vehicle.name}`}>
            <div className="max-h-[80vh] overflow-y-auto">
                {/* Header Info */}
                <div className="bg-gray-50 dark:bg-gray-800 p-4 space-y-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400">Vehicle</label>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{vehicle.name}</p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400">Serial Number</label>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{vehicle.serial_number || 'N/A'}</p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400">Date</label>
                            <Input
                                type="date"
                                name="inspection_date"
                                value={formData.inspection_date}
                                onChange={handleInputChange}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400">Mileage *</label>
                            <Input
                                type="number"
                                name="mileage"
                                value={formData.mileage}
                                onChange={handleInputChange}
                                placeholder="Enter mileage"
                                className="mt-1"
                                required
                            />
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                        Mark each item as: ✓ - Satisfactory | ✗ - Defective/Missing | N/A - Not Applicable
                    </p>
                </div>

                {/* Check Sections */}
                <div className="p-6 space-y-6">
                    {/* Fluids Section */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mr-2">
                                <span className="text-blue-600 dark:text-blue-400 text-sm">💧</span>
                            </div>
                            Fluids
                        </h3>
                        <div className="space-y-1">
                            <CheckItem label="Engine Oil" field="check_engine_oil" />
                            <CheckItem label="Brake" field="check_brake" />
                            <CheckItem label="Clutch" field="check_clutch" />
                            <CheckItem label="Power Steering" field="check_power_steering" />
                            <CheckItem label="Auto Transmission" field="check_auto_transmission" />
                            <CheckItem label="Screen Wash" field="check_screen_wash" />
                            <CheckItem label="Fuel" field="check_fuel" />
                            <CheckItem label="Coolant" field="check_coolant" />
                        </div>
                    </div>

                    {/* Lights/Electric Section */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                            <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center mr-2">
                                <span className="text-yellow-600 dark:text-yellow-400 text-sm">💡</span>
                            </div>
                            Lights / Electric
                        </h3>
                        <div className="space-y-1">
                            <CheckItem label="Indicators" field="check_indicators" />
                            <CheckItem label="Side Lights" field="check_side_lights" />
                            <CheckItem label="Headlights (Dipped)" field="check_headlights_dipped" />
                            <CheckItem label="Headlights (Main)" field="check_headlights_main" />
                            <CheckItem label="Number Plate" field="check_number_plate_light" />
                            <CheckItem label="Reversing" field="check_reversing_light" />
                            <CheckItem label="Warning Lights" field="check_warning_lights" />
                            <CheckItem label="Horn" field="check_horn" />
                        </div>
                    </div>

                    {/* External Condition Section */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mr-2">
                                <span className="text-green-600 dark:text-green-400 text-sm">🚗</span>
                            </div>
                            External Condition
                        </h3>
                        <div className="space-y-1">
                            <CheckItem label="Door/Wing Mirrors" field="check_door_wing_mirrors" />
                            <CheckItem label="Wiper Blades" field="check_wiper_blades" />
                            <CheckItem label="Screen Washers" field="check_screen_washers" />
                            <CheckItem label="Tyre Pressure" field="check_tyre_pressure" />
                            <CheckItem label="Tyre Condition" field="check_tyre_condition" />
                            <CheckItem label="Windscreen Wipers" field="check_windscreen_wipers" />
                            <CheckItem label="Spare Wheel" field="check_spare_wheel" />
                            <CheckItem label="Cleanliness (plates, windows, lights)" field="check_cleanliness" />
                        </div>
                    </div>

                    {/* Internal Condition Section */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mr-2">
                                <span className="text-purple-600 dark:text-purple-400 text-sm">🔧</span>
                            </div>
                            Internal Condition
                        </h3>
                        <div className="space-y-1">
                            <CheckItem label="Seat Belts" field="check_seat_belts" />
                            <CheckItem label="First Aid Kit" field="check_first_aid_kit" />
                            <CheckItem label="Fire Extinguisher" field="check_fire_extinguisher" />
                            <CheckItem label="Head Restraint Adjustment" field="check_head_restraint" />
                            <CheckItem label="Torch" field="check_torch" />
                            <CheckItem label="General Bodywork" field="check_general_bodywork" />
                            <CheckItem label="Spill Kit" field="check_spill_kit" />
                            <CheckItem label="Door Locking" field="check_door_locking" />
                        </div>
                    </div>

                    {/* Damage Photos Section */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mr-2">
                                <Camera className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            Damage Photos (Optional)
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                            Take photos with your camera of any damage or issues found
                        </p>

                        {/* Upload Button */}
                        <div className="mb-4">
                            <label className="cursor-pointer">
                                <div className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
                                    {uploading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">Uploading...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Camera className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Take Photo with Camera
                                            </span>
                                        </>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handleImageUpload}
                                    disabled={uploading}
                                    className="hidden"
                                />
                            </label>
                        </div>

                        {/* Uploaded Images Preview */}
                        {uploadedImages.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {uploadedImages.map((image, index) => (
                                    <div key={index} className="relative group">
                                        <img
                                            src={image.url}
                                            alt={`Damage ${index + 1}`}
                                            className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-700"
                                        />
                                        <button
                                            onClick={() => handleRemoveImage(image)}
                                            className="absolute top-1 right-1 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Comments Section */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Comments</h3>
                        <textarea
                            name="comments"
                            value={formData.comments}
                            onChange={handleInputChange}
                            placeholder="Any additional comments or observations..."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                            rows={3}
                        />
                    </div>

                    {/* Damage Notes Section */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Damage Notes</h3>
                        <textarea
                            name="damage_notes"
                            value={formData.damage_notes}
                            onChange={handleInputChange}
                            placeholder="Mark any damage noted, repairs due, etc..."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                            rows={3}
                        />
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-between items-center p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    * Required fields
                </div>
                <div className="flex space-x-2">
                    <Button variant="outline" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={saving}>
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save Inspection'
                        )}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

// History Modal Component
const HistoryModal = ({ vehicle, inspections, onClose, onViewDetail }) => {
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Inspection History - ${vehicle?.name}`}>
            <div className="p-6">
                {inspections.length === 0 ? (
                    <div className="text-center py-8">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400">No inspections recorded for this vehicle</p>
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                        {inspections.map((inspection) => (
                            <div
                                key={inspection.id}
                                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                                onClick={() => onViewDetail(inspection)}
                            >
                                <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-1">
                                        <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {formatDate(inspection.inspection_date)}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
                                        <span>Mileage: {inspection.mileage?.toLocaleString() || 'N/A'}</span>
                                        {inspection.users && (
                                            <span>By: {inspection.users.name}</span>
                                        )}
                                        {inspection.has_defects && (
                                            <span className="flex items-center text-red-600 dark:text-red-400">
                                                <AlertTriangle className="w-4 h-4 mr-1" />
                                                Has Defects
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                            </div>
                        ))}
                    </div>
                )}
                <div className="mt-6 flex justify-end">
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </div>
            </div>
        </Modal>
    );
};

// Inspection Detail Modal Component
const InspectionDetailModal = ({ inspection, onClose }) => {
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const getCheckIcon = (value) => {
        if (value === 'satisfactory') return <CheckCircle className="w-4 h-4 text-green-600" />;
        if (value === 'defective') return <X className="w-4 h-4 text-red-600" />;
        return <span className="text-xs text-gray-400">N/A</span>;
    };

    const getCheckLabel = (value) => {
        if (value === 'satisfactory') return 'Satisfactory';
        if (value === 'defective') return 'Defective';
        return 'N/A';
    };

    const CheckItem = ({ label, value }) => (
        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
            <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
            <div className="flex items-center space-x-2">
                {getCheckIcon(value)}
                <span className={`text-sm font-medium ${
                    value === 'satisfactory' ? 'text-green-600' :
                    value === 'defective' ? 'text-red-600' :
                    'text-gray-400'
                }`}>
                    {getCheckLabel(value)}
                </span>
            </div>
        </div>
    );

    return (
        <Modal isOpen={true} onClose={onClose} title="Inspection Details">
            <div className="flex flex-col max-h-[80vh]">
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Header Info */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-sm text-gray-500 dark:text-gray-400">Date:</span>
                                <p className="font-medium text-gray-900 dark:text-white">
                                    {formatDate(inspection.inspection_date)}
                                </p>
                            </div>
                            <div>
                                <span className="text-sm text-gray-500 dark:text-gray-400">Mileage:</span>
                                <p className="font-medium text-gray-900 dark:text-white">
                                    {inspection.mileage?.toLocaleString() || 'N/A'}
                                </p>
                            </div>
                            {inspection.users && (
                                <div>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">Inspector:</span>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {inspection.users.name}
                                    </p>
                                </div>
                            )}
                            <div>
                                <span className="text-sm text-gray-500 dark:text-gray-400">Status:</span>
                                <p className={`font-medium ${inspection.has_defects ? 'text-red-600' : 'text-green-600'}`}>
                                    {inspection.has_defects ? 'Has Defects' : 'All Clear'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Fluids Section */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                            <span className="mr-2">💧</span> Fluids
                        </h3>
                        <div className="space-y-1">
                            <CheckItem label="Engine Oil" value={inspection.check_engine_oil} />
                            <CheckItem label="Brake Fluid" value={inspection.check_brake} />
                            <CheckItem label="Clutch Fluid" value={inspection.check_clutch} />
                            <CheckItem label="Power Steering" value={inspection.check_power_steering} />
                            <CheckItem label="Auto Transmission" value={inspection.check_auto_transmission} />
                            <CheckItem label="Screen Wash" value={inspection.check_screen_wash} />
                            <CheckItem label="Fuel" value={inspection.check_fuel} />
                            <CheckItem label="Coolant" value={inspection.check_coolant} />
                        </div>
                    </div>

                    {/* Lights/Electric Section */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                            <span className="mr-2">💡</span> Lights/Electric
                        </h3>
                        <div className="space-y-1">
                            <CheckItem label="Indicators" value={inspection.check_indicators} />
                            <CheckItem label="Side Lights" value={inspection.check_side_lights} />
                            <CheckItem label="Headlights (Dipped)" value={inspection.check_headlights_dipped} />
                            <CheckItem label="Headlights (Main)" value={inspection.check_headlights_main} />
                            <CheckItem label="Number Plate Light" value={inspection.check_number_plate_light} />
                            <CheckItem label="Reversing Light" value={inspection.check_reversing_light} />
                            <CheckItem label="Warning Lights" value={inspection.check_warning_lights} />
                            <CheckItem label="Horn" value={inspection.check_horn} />
                        </div>
                    </div>

                    {/* External Condition Section */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                            <span className="mr-2">🚗</span> External Condition
                        </h3>
                        <div className="space-y-1">
                            <CheckItem label="Door/Wing Mirrors" value={inspection.check_door_wing_mirrors} />
                            <CheckItem label="Wiper Blades" value={inspection.check_wiper_blades} />
                            <CheckItem label="Screen Washers" value={inspection.check_screen_washers} />
                            <CheckItem label="Tyre Pressure" value={inspection.check_tyre_pressure} />
                            <CheckItem label="Tyre Condition" value={inspection.check_tyre_condition} />
                            <CheckItem label="Windscreen Wipers" value={inspection.check_windscreen_wipers} />
                            <CheckItem label="Spare Wheel" value={inspection.check_spare_wheel} />
                            <CheckItem label="Cleanliness" value={inspection.check_cleanliness} />
                        </div>
                    </div>

                    {/* Internal Condition Section */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                            <span className="mr-2">🔧</span> Internal Condition
                        </h3>
                        <div className="space-y-1">
                            <CheckItem label="Seat Belts" value={inspection.check_seat_belts} />
                            <CheckItem label="First Aid Kit" value={inspection.check_first_aid_kit} />
                            <CheckItem label="Fire Extinguisher" value={inspection.check_fire_extinguisher} />
                            <CheckItem label="Head Restraint" value={inspection.check_head_restraint} />
                            <CheckItem label="Torch" value={inspection.check_torch} />
                            <CheckItem label="General Bodywork" value={inspection.check_general_bodywork} />
                            <CheckItem label="Spill Kit" value={inspection.check_spill_kit} />
                            <CheckItem label="Door Locking" value={inspection.check_door_locking} />
                        </div>
                    </div>

                    {/* Damage Photos */}
                    {inspection.photos && Array.isArray(inspection.photos) && inspection.photos.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                                <Camera className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                                Damage Photos ({inspection.photos.length})
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {inspection.photos.map((image, index) => (
                                    <div key={index} className="relative group">
                                        <img
                                            src={image.url}
                                            alt={`Damage ${index + 1}`}
                                            className="w-full h-40 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-700 cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                                            onClick={() => window.open(image.url, '_blank')}
                                        />
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity rounded-lg flex items-center justify-center">
                                            <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Comments and Damage Notes */}
                    {(inspection.comments || inspection.damage_notes) && (
                        <div className="space-y-4">
                            {inspection.comments && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Comments:</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded">
                                        {inspection.comments}
                                    </p>
                                </div>
                            )}
                            {inspection.damage_notes && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Damage Notes:</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 bg-red-50 dark:bg-red-900/20 p-3 rounded">
                                        {inspection.damage_notes}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 p-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-end">
                        <Button variant="outline" onClick={onClose}>Close</Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default VehicleMileageLogsPage;
