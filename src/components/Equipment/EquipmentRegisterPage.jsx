import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { Card, Button, Input, Select, Modal, ConfirmationModal } from '../ui';
import AssetTable from './AssetTable';
import ImportAssetsButton from './ImportAssetsButton';
import { Loader2, Search, Download, Edit, PlusCircle, Trash2, Eye, Archive, Trash } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';

const EquipmentRegisterPage = () => {
    const { user } = useAuth();
    const { canAddEquipment, canImportAssets, canDeleteAllAssets } = usePermissions();
    const [loading, setLoading] = useState(true);
    const [equipment, setEquipment] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [users, setUsers] = useState([]);
    const [availableCategories, setAvailableCategories] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
    const [isManageMode, setIsManageMode] = useState(false);
    const [isAssetMode, setIsAssetMode] = useState(false);
    const [activeTab, setActiveTab] = useState('equipment');

    // Derived lists
    const regularEquipment = useMemo(() => equipment.filter(e => !e.is_asset), [equipment]);
    const assetItems = useMemo(() => equipment.filter(e => e.is_asset), [equipment]);

    // Modal State
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [modalMode, setModalMode] = useState('edit'); // 'create' or 'edit'
    const [selectedItem, setSelectedItem] = useState(null);
    const [certificates, setCertificates] = useState([]);
    const [newCertExpiry, setNewCertExpiry] = useState('');
    const [editForm, setEditForm] = useState({
        name: '',
        model: '',
        serial_number: '',
        status: '',
        location: '',
        purchase_date: '',
        warranty_expiry: '',
        category: '',
        calibration_file: null,
        asset_tag: '',
        description: '',
        new_asset_tag: '',
        quantity: 1,
        kit_group: '',
        assigned_to_text: '',
        last_checked: ''
    });
    const [updating, setUpdating] = useState(false);

    // Export Wizard State
    const [wizardOpen, setWizardOpen] = useState(false);
    const [exportStartDate, setExportStartDate] = useState('');
    const [exportEndDate, setExportEndDate] = useState('');
    const [selectedExportIds, setSelectedExportIds] = useState([]);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Equipment
            const { data: eqData, error: eqError } = await supabase
                .from('equipment')
                .select('*')
                .neq('status', 'archived')
                .order('category', { ascending: true })
                .order('name', { ascending: true });

            if (eqError) throw eqError;
            setEquipment(eqData || []);

            // Fetch Active Assignments
            const { data: assignData, error: assignError } = await supabase
                .from('equipment_assignments')
                .select('*')
                .is('returned_at', null);

            if (assignError) throw assignError;
            setAssignments(assignData || []);

            // Fetch Users (for assignment mapping)
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id, name');

            if (userError) throw userError;
            setUsers(userData || []);

            // Fetch Categories (equipment_type)
            const { data: categoryData, error: categoryError } = await supabase
                .from('dropdown_categories')
                .select('id')
                .eq('name', 'equipment_type')
                .maybeSingle();

            if (categoryError) {
                console.error('Error fetching category type:', categoryError);
            } else if (categoryData) {
                const { data: catItems, error: itemsError } = await supabase
                    .from('dropdown_items')
                    .select('*')
                    .eq('category_id', categoryData.id)
                    .order('sort_order', { ascending: true });
                
                if (itemsError) {
                    console.error('Error fetching category items:', itemsError);
                } else {
                    setAvailableCategories(catItems || []);
                }
            }

        } catch (error) {
            console.error('Error fetching register data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Helper to get assigned user name
    const getAssignedUser = (equipmentId) => {
        const assignment = assignments.find(a => a.equipment_id === equipmentId);
        if (!assignment) return null;
        const assignedUser = users.find(u => u.id === assignment.user_id);
        return assignedUser ? assignedUser.name : 'Unknown User';
    };

    // Helper to get sort order map
    const categoryOrder = useMemo(() => {
        const map = {};
        availableCategories.forEach(cat => {
            map[cat.value] = cat.sort_order;
        });
        return map;
    }, [availableCategories]);

    // Group equipment by category
    const groupedEquipment = useMemo(() => {
        const filtered = regularEquipment.filter(item => 
            (item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
             (item.serial_number && item.serial_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
             (item.model && item.model.toLowerCase().includes(searchTerm.toLowerCase())))
        );

        // Sort items by category then name
        filtered.sort((a, b) => {
            const catA = a.category || 'Uncategorized';
            const catB = b.category || 'Uncategorized';
            if (catA === catB) {
                return a.name.localeCompare(b.name);
            }
            
            const orderA = categoryOrder[catA] !== undefined ? categoryOrder[catA] : 9999;
            const orderB = categoryOrder[catB] !== undefined ? categoryOrder[catB] : 9999;
            
            if (orderA !== orderB) return orderA - orderB;

            return catA.localeCompare(catB);
        });

        const groups = {};
        filtered.forEach(item => {
            const cat = item.category || 'Uncategorized';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(item);
        });

        // If filtering by category
        if (selectedCategoryFilter !== 'All') {
            return { [selectedCategoryFilter]: groups[selectedCategoryFilter] || [] };
        }

        // Sort keys (categories)
        const sortedGroups = {};
        Object.keys(groups).sort((a, b) => {
            const orderA = categoryOrder[a] !== undefined ? categoryOrder[a] : 9999;
            const orderB = categoryOrder[b] !== undefined ? categoryOrder[b] : 9999;
            
            if (orderA !== orderB) return orderA - orderB;
            return a.localeCompare(b);
        }).forEach(key => {
            sortedGroups[key] = groups[key];
        });

        return sortedGroups;
    }, [regularEquipment, searchTerm, selectedCategoryFilter, categoryOrder]);

    const filterCategories = useMemo(() => {
        const cats = new Set(regularEquipment.map(e => e.category || 'Uncategorized'));
        return ['All', ...Array.from(cats).sort((a, b) => {
            const orderA = categoryOrder[a] !== undefined ? categoryOrder[a] : 9999;
            const orderB = categoryOrder[b] !== undefined ? categoryOrder[b] : 9999;
            
            if (orderA !== orderB) return orderA - orderB;
            return a.localeCompare(b);
        })];
    }, [regularEquipment, categoryOrder]);

    const handleDownload = async (e, url, filename) => {
        e.preventDefault();
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok');
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download failed:', error);
            // Fallback to opening in new tab
            window.open(url, '_blank');
        }
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text('Equipment Register', 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 30);

        Object.entries(groupedEquipment).forEach(([category, items]) => {
            if (items.length === 0) return;

            doc.addPage();
            doc.setFontSize(14);
            doc.setTextColor(0);
            doc.text(category, 14, 20);

            const tableColumn = ["Name", "Model", "Serial No.", "Status", "Assigned To", "Cal. Expiry"];
            const tableRows = [];

            items.forEach(item => {
                const assignedTo = getAssignedUser(item.id) || '-';
                const calExpiry = item.warranty_expiry ? new Date(item.warranty_expiry).toLocaleDateString() : '-';

                const rowData = [
                    item.name,
                    item.model || '-',
                    item.serial_number || '-',
                    item.status,
                    assignedTo,
                    calExpiry
                ];
                tableRows.push(rowData);
            });

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 25,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [249, 115, 22] }, // Orange-500
            });
        });

        // Remove the first empty page if we added pages in the loop
        if (doc.getNumberOfPages() > 1) {
            doc.deletePage(1);
        }

        doc.save(`Equipment_Register_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const fetchCertificates = async (equipmentId) => {
        const { data, error } = await supabase
            .from('calibration_certificates')
            .select('*')
            .eq('equipment_id', equipmentId)
            .order('expiry_date', { ascending: false });
        
        if (error) {
            console.error('Error fetching certificates:', error);
        } else {
            setCertificates(data || []);
        }
    };

    const handleAdd = () => {
        setModalMode('create');
        setIsAssetMode(false);
        setEditForm({
            name: '',
            model: '',
            serial_number: '',
            status: 'available',
            location: '',
            purchase_date: '',
            warranty_expiry: '',
            category: '',
            calibration_file: null,
            asset_tag: '',
            description: '',
            new_asset_tag: '',
            quantity: 1,
            kit_group: '',
            assigned_to_text: '',
            last_checked: ''
        });
        setCertificates([]);
        setNewCertExpiry('');
        setEditModalOpen(true);
    };

    const handleAddAsset = () => {
        setModalMode('create');
        setIsAssetMode(true);
        setEditForm({
            name: '',
            model: '',
            serial_number: '',
            status: 'available',
            location: '',
            purchase_date: '',
            warranty_expiry: '',
            category: '',
            calibration_file: null,
            asset_tag: '',
            description: '',
            new_asset_tag: '',
            quantity: 1,
            kit_group: '',
            assigned_to_text: '',
            last_checked: ''
        });
        setCertificates([]);
        setNewCertExpiry('');
        setEditModalOpen(true);
    };

    const handleEdit = (item) => {
        setModalMode('edit');
        setSelectedItem(item);
        const isAsset = !!item.is_asset;
        setIsAssetMode(isAsset);
        setEditForm({
            name: item.name,
            model: item.model || '',
            serial_number: item.serial_number || '',
            status: item.status,
            location: item.location || '',
            purchase_date: item.purchase_date || '',
            warranty_expiry: item.warranty_expiry || '',
            category: item.category,
            calibration_file: null,
            asset_tag: item.asset_tag || '',
            description: item.description || '',
            new_asset_tag: item.new_asset_tag || '',
            quantity: item.quantity || 1,
            kit_group: item.kit_group || '',
            assigned_to_text: item.assigned_to_text || '',
            last_checked: item.last_checked || ''
        });
        setNewCertExpiry('');
        if (!isAsset) {
            fetchCertificates(item.id);
        } else {
            setCertificates([]);
        }
        setEditModalOpen(true);
    };

    const handleUploadCertificate = async () => {
        if (!editForm.calibration_file || !newCertExpiry) {
            alert('Please select a file and expiry date.');
            return;
        }
        
        setUpdating(true);
        try {
            const file = editForm.calibration_file;
            // Sanitize filename: remove non-ascii chars, spaces to underscores
            const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const fileName = `${Date.now()}_${sanitizedName}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('equipment-certificates')
                .upload(filePath, file);

            if (uploadError) throw new Error('Upload failed: ' + uploadError.message);

            const { data: urlData } = supabase.storage
                .from('equipment-certificates')
                .getPublicUrl(filePath);

            const { error: insertError } = await supabase
                .from('calibration_certificates')
                .insert([{
                    equipment_id: selectedItem.id,
                    file_url: urlData.publicUrl,
                    expiry_date: newCertExpiry,
                    created_by: user.id
                }]);

            if (insertError) throw insertError;

            // Update equipment warranty_expiry if this new date is later than current
            const currentExpiry = editForm.warranty_expiry ? new Date(editForm.warranty_expiry) : new Date(0);
            const newExpiry = new Date(newCertExpiry);

            if (newExpiry > currentExpiry) {
                const { error: updateError } = await supabase
                    .from('equipment')
                    .update({ 
                        warranty_expiry: newCertExpiry,
                        calibration_certificate_url: urlData.publicUrl 
                    })
                    .eq('id', selectedItem.id);
                
                if (updateError) throw updateError;

                // Update local state
                setEquipment(prev => prev.map(item => 
                    item.id === selectedItem.id ? { 
                        ...item, 
                        warranty_expiry: newCertExpiry,
                        calibration_certificate_url: urlData.publicUrl
                    } : item
                ));
                setEditForm(prev => ({ ...prev, warranty_expiry: newCertExpiry }));
            }

            fetchCertificates(selectedItem.id);
            setEditForm(prev => ({ ...prev, calibration_file: null }));
            setNewCertExpiry('');
            alert('Certificate uploaded successfully!');

        } catch (error) {
            console.error('Error uploading certificate:', error);
            alert('Failed to upload: ' + error.message);
        } finally {
            setUpdating(false);
        }
    };

    const handleDeleteCertificate = async (cert) => {
        if (!window.confirm('Are you sure you want to delete this certificate?')) return;
        setUpdating(true);
        try {
            // 1. Delete from Storage
            // Extract path from URL. URL format: .../equipment-certificates/filename
            const path = cert.file_url.split('equipment-certificates/').pop();
            if (path) {
                const { error: storageError } = await supabase.storage
                    .from('equipment-certificates')
                    .remove([path]);
                
                if (storageError) {
                    console.warn('Error deleting file from storage:', storageError);
                    // Continue to delete record even if storage fails (orphan cleanup)
                }
            }

            // 2. Delete from Database
            const { error: dbError } = await supabase
                .from('calibration_certificates')
                .delete()
                .eq('id', cert.id);

            if (dbError) throw dbError;

            // 3. Update equipment if this was the active certificate
            if (selectedItem.calibration_certificate_url === cert.file_url) {
                // Fetch remaining certificates to find the next newest one
                const { data: remainingCerts } = await supabase
                    .from('calibration_certificates')
                    .select('*')
                    .eq('equipment_id', selectedItem.id)
                    .neq('id', cert.id) // Exclude the one we just deleted (redundant if deleted, but safe)
                    .order('expiry_date', { ascending: false })
                    .limit(1);

                const nextCert = remainingCerts?.[0];
                const updates = {
                    calibration_certificate_url: nextCert?.file_url || null,
                    warranty_expiry: nextCert?.expiry_date || null // Or keep existing expiry? Better to sync.
                };

                await supabase
                    .from('equipment')
                    .update(updates)
                    .eq('id', selectedItem.id);

                // Update local state
                setEquipment(prev => prev.map(item => 
                    item.id === selectedItem.id ? { ...item, ...updates } : item
                ));
                setEditForm(prev => ({ 
                    ...prev, 
                    warranty_expiry: updates.warranty_expiry || '' 
                }));
            }

            // 4. Refresh list
            fetchCertificates(selectedItem.id);
            alert('Certificate deleted.');
        } catch (error) {
            console.error('Error deleting certificate:', error);
            alert('Failed to delete certificate: ' + error.message);
        } finally {
            setUpdating(false);
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setUpdating(true);
        try {
            if (modalMode === 'create') {
                const newEquipment = {
                    name: editForm.name,
                    model: editForm.model || null,
                    serial_number: editForm.serial_number || null,
                    status: editForm.status,
                    location: editForm.location || null,
                    purchase_date: editForm.purchase_date || null,
                    warranty_expiry: isAssetMode ? null : (editForm.warranty_expiry || null),
                    category: editForm.category,
                    is_asset: isAssetMode,
                    asset_tag: isAssetMode ? editForm.asset_tag : null,
                    description: editForm.description || null,
                    new_asset_tag: isAssetMode ? editForm.new_asset_tag : null,
                    quantity: isAssetMode ? editForm.quantity : null,
                    kit_group: isAssetMode ? editForm.kit_group : null,
                    assigned_to_text: isAssetMode ? editForm.assigned_to_text : null,
                    last_checked: isAssetMode ? editForm.last_checked : null,
                    created_by: user.id,
                    updated_by: user.id
                };

                const { data, error } = await supabase
                    .from('equipment')
                    .insert([newEquipment])
                    .select();

                if (error) throw error;

                setEquipment(prev => [...prev, ...data]);
            } else {
                const updates = {
                    name: editForm.name,
                    model: editForm.model || null,
                    serial_number: editForm.serial_number || null,
                    status: editForm.status,
                    location: editForm.location || null,
                    purchase_date: editForm.purchase_date || null,
                    warranty_expiry: isAssetMode ? null : (editForm.warranty_expiry || null),
                    category: editForm.category,
                    asset_tag: isAssetMode ? editForm.asset_tag : null,
                    description: editForm.description || null,
                    new_asset_tag: isAssetMode ? editForm.new_asset_tag : null,
                    quantity: isAssetMode ? editForm.quantity : null,
                    kit_group: isAssetMode ? editForm.kit_group : null,
                    assigned_to_text: isAssetMode ? editForm.assigned_to_text : null,
                    last_checked: isAssetMode ? editForm.last_checked : null,
                    updated_by: user.id,
                    updated_at: new Date().toISOString()
                };

                const { error } = await supabase
                    .from('equipment')
                    .update(updates)
                    .eq('id', selectedItem.id);

                if (error) throw error;

                setEquipment(prev => prev.map(item => 
                    item.id === selectedItem.id ? { ...item, ...updates } : item
                ));
            }
            
            setEditModalOpen(false);
            setSelectedItem(null);
        } catch (error) {
            console.error('Error saving equipment:', error);
            alert('Failed to save equipment: ' + error.message);
        } finally {
            setUpdating(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedItem) return;
        setUpdating(true);
        try {
            const { error } = await supabase
                .from('equipment')
                .delete()
                .eq('id', selectedItem.id);

            if (error) throw error;

            setEquipment(prev => prev.filter(item => item.id !== selectedItem.id));
            setDeleteConfirmOpen(false);
            setEditModalOpen(false);
            setSelectedItem(null);
        } catch (error) {
            console.error('Error deleting equipment:', error);
            alert('Failed to delete equipment: ' + error.message);
        } finally {
            setUpdating(false);
        }
    };

    const handleDeleteAllAssets = async () => {
        const confirmation = window.prompt('WARNING: This will delete ALL items in the Asset Register. This action cannot be undone.\n\nType "DELETE" to confirm:');
        if (confirmation !== 'DELETE') return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('equipment')
                .delete()
                .eq('is_asset', true);

            if (error) throw error;

            setEquipment(prev => prev.filter(item => !item.is_asset));
            alert('All assets have been deleted.');
        } catch (error) {
            console.error('Error deleting all assets:', error);
            alert('Failed to delete assets: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleWizardExport = async () => {
        if (!exportStartDate || !exportEndDate) {
            alert('Please select a start and end date.');
            return;
        }
        if (selectedExportIds.length === 0) {
            alert('Please select at least one item.');
            return;
        }

        setIsExporting(true);
        try {
            // 1. Fetch all certificates for selected equipment
            const { data: allCerts, error } = await supabase
                .from('calibration_certificates')
                .select('*, equipment:equipment_id(name, serial_number)')
                .in('equipment_id', selectedExportIds);

            if (error) throw error;

            const zip = new JSZip();
            const startDate = new Date(exportStartDate);
            const endDate = new Date(exportEndDate);
            // Set times to cover full days
            startDate.setHours(0,0,0,0);
            endDate.setHours(23,59,59,999);

            let count = 0;

            // 2. Filter and add to ZIP
            const downloadPromises = allCerts.map(async (cert) => {
                if (!cert.file_url || !cert.expiry_date) return;

                const expiry = new Date(cert.expiry_date);
                const validStart = new Date(expiry);
                validStart.setFullYear(validStart.getFullYear() - 1);

                // Check overlap: (RangeStart < CertEnd) AND (RangeEnd > CertStart)
                if (startDate < expiry && endDate > validStart) {
                    try {
                        const response = await fetch(cert.file_url);
                        if (!response.ok) throw new Error('Network err');
                        const blob = await response.blob();

                        let filename = cert.file_url.split('/').pop().split('?')[0];
                        filename = filename.replace(/^\d+_/, ''); // Remove timestamp
                        
                        // Prepend equipment name to avoid collisions and identify files
                        const eqName = cert.equipment?.name || 'Equipment';
                        // Clean filename
                        const safeName = `${eqName}_${filename}`.replace(/[^a-zA-Z0-9._-]/g, '_');
                        
                        zip.file(safeName, blob);
                        count++;
                    } catch (err) {
                        console.error('Failed to download cert for zip:', err);
                    }
                }
            });

            await Promise.all(downloadPromises);

            if (count === 0) {
                alert('No relevant certificates found for the selected period.');
                return;
            }

            // 3. Generate ZIP
            const content = await zip.generateAsync({ type: 'blob' });
            
            // 4. Download
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(content);
            link.download = `Certificates_${exportStartDate}_to_${exportEndDate}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setWizardOpen(false);
            setExportStartDate('');
            setExportEndDate('');
            setSelectedExportIds([]);

        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed: ' + error.message);
        } finally {
            setIsExporting(false);
        }
    };

    const toggleExportSelection = (id) => {
        setSelectedExportIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const selectAllExport = () => {
        // Select all currently filtered equipment
        // We should use the filtered list logic, but simpler to just use 'equipment' or 'groupedEquipment'
        // Let's use 'equipment' (all items) for simplicity in this context, 
        // or we can create a derived list of IDs from groupedEquipment if we want to respect filters.
        // Respecting filters is better UX.
        
        // Flatten groupedEquipment
        const currentVisibleIds = Object.values(groupedEquipment).flat().map(e => e.id);
        
        if (selectedExportIds.length === currentVisibleIds.length) {
            setSelectedExportIds([]);
        } else {
            setSelectedExportIds(currentVisibleIds);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                <span className="ml-2 text-lg">Loading Register...</span>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                        {activeTab === 'equipment' ? 'Equipment Register' : 'Asset Register'}
                    </h1>
                    <div className="flex space-x-4 mt-4 border-b border-gray-200 dark:border-gray-700">
                        <button
                            className={`pb-2 px-1 text-sm font-medium transition-colors ${
                                activeTab === 'equipment' 
                                    ? 'border-b-2 border-orange-500 text-orange-600' 
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                            onClick={() => setActiveTab('equipment')}
                        >
                            Equipment
                        </button>
                        <button
                            className={`pb-2 px-1 text-sm font-medium transition-colors ${
                                activeTab === 'assets' 
                                    ? 'border-b-2 border-orange-500 text-orange-600' 
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                            onClick={() => setActiveTab('assets')}
                        >
                            Assets
                        </button>
                    </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2 md:flex-nowrap">
                    {activeTab === 'assets' && canDeleteAllAssets && (
                        <Button 
                            onClick={handleDeleteAllAssets} 
                            variant="danger"
                            className="flex items-center w-full sm:w-[calc(50%-0.25rem)] md:w-auto"
                        >
                            <Trash className="w-4 h-4 mr-2" /> Delete All Assets
                        </Button>
                    )}
                    {activeTab === 'assets' && canImportAssets && <ImportAssetsButton />}
                    {canAddEquipment && (
                        <Button 
                            onClick={activeTab === 'equipment' ? handleAdd : handleAddAsset} 
                            className="flex items-center w-full sm:w-[calc(50%-0.25rem)] md:w-auto"
                        >
                            <PlusCircle className="w-4 h-4 mr-2" /> 
                            {activeTab === 'equipment' ? 'Add Equipment' : 'Add Asset'}
                        </Button>
                    )}
                    
                    {activeTab === 'equipment' && (
                        <>
                            <Button 
                                variant={isManageMode ? 'primary' : 'outline'} 
                                onClick={() => setIsManageMode(!isManageMode)}
                                className="flex items-center w-full sm:w-[calc(50%-0.25rem)] md:w-auto"
                            >
                                <Edit className="w-4 h-4 mr-2" /> {isManageMode ? 'Done' : 'Manage'}
                            </Button>
                            <Button onClick={() => setWizardOpen(true)} variant="outline" className="flex items-center w-full sm:w-[calc(50%-0.25rem)] md:w-auto">
                                <Archive className="w-4 h-4 mr-2" /> Export Wizard
                            </Button>
                            <Button onClick={handleExportPDF} variant="outline" className="flex items-center w-full sm:w-[calc(50%-0.25rem)] md:w-auto">
                                <Download className="w-4 h-4 mr-2" /> Export PDF
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {activeTab === 'equipment' ? (
                <>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input 
                                    type="text" 
                                    placeholder="Search by name, model, or serial number..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                            <div className="w-full md:w-64">
                                <Select 
                                    value={selectedCategoryFilter} 
                                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                                >
                                    {filterCategories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {Object.entries(groupedEquipment).map(([category, items]) => (
                            items.length > 0 && (
                                <Card key={category} className="overflow-hidden">
                                    <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                        <h2 className="text-lg font-bold text-gray-800 dark:text-white">{category}</h2>
                                        <span className="text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-600">
                                            {items.length} items
                                        </span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                            <thead className="text-xs text-white uppercase bg-orange-500 dark:bg-orange-600 border-b border-orange-600 dark:border-orange-800">
                                                <tr>
                                                    <th className="px-6 py-3 w-[20%]">Name</th>
                                                    <th className="px-6 py-3 w-[15%]">Model</th>
                                                    <th className="px-6 py-3 w-[15%]">Serial No.</th>
                                                    <th className="px-6 py-3 w-[10%]">Status</th>
                                                    <th className="px-6 py-3 w-[10%]">Assigned To</th>
                                                    <th className="px-6 py-3 w-[10%]">Cal. Expiry</th>
                                                    <th className="px-6 py-3 w-[5%] text-center">Cert</th>
                                                    {isManageMode && <th className="px-6 py-3 w-[10%] text-right">Actions</th>}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {items.map((item) => (
                                                    <tr key={item.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                                            {item.name}
                                                        </td>
                                                        <td className="px-6 py-4">{item.model || '-'}</td>
                                                        <td className="px-6 py-4">{item.serial_number || '-'}</td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                                item.status === 'available' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                                                item.status === 'assigned' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                                                                item.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                                                                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                            }`}>
                                                                {item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : 'Unknown'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {(() => {
                                                                const user = getAssignedUser(item.id);
                                                                return user ? (
                                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                                                        {user}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-gray-400">-</span>
                                                                );
                                                            })()}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={(() => {
                                                                if (!item.warranty_expiry) return '';
                                                                const expiry = new Date(item.warranty_expiry);
                                                                const now = new Date();
                                                                const warningDate = new Date();
                                                                warningDate.setDate(now.getDate() + 28);
                                                                
                                                                // Reset time parts for accurate date comparison
                                                                expiry.setHours(0,0,0,0);
                                                                now.setHours(0,0,0,0);
                                                                warningDate.setHours(0,0,0,0);

                                                                if (expiry < now) return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
                                                                if (expiry <= warningDate) return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
                                                                return '';
                                                            })()}>
                                                                {item.warranty_expiry ? new Date(item.warranty_expiry).toLocaleDateString() : '-'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            {item.calibration_certificate_url ? (
                                                                <a 
                                                                    href={item.calibration_certificate_url} 
                                                                    onClick={(e) => {
                                                                        let filename = item.calibration_certificate_url.split('/').pop().split('?')[0];
                                                                        // Remove timestamp prefix (digits_...)
                                                                        filename = filename.replace(/^\d+_/, '');
                                                                        handleDownload(e, item.calibration_certificate_url, filename);
                                                                    }}
                                                                    className="text-gray-500 hover:text-orange-600 inline-block cursor-pointer"
                                                                    title="Download Certificate"
                                                                >
                                                                    <Download className="w-4 h-4" />
                                                                </a>
                                                            ) : (
                                                                <span className="text-gray-300">-</span>
                                                            )}
                                                        </td>
                                                        {isManageMode && (
                                                            <td className="px-6 py-4 text-right">
                                                                <Button variant="outline" size="sm" onClick={() => handleEdit(item)} className="inline-flex items-center">
                                                                    <Edit className="w-3 h-3 mr-1" /> Edit
                                                                </Button>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            )
                        ))}
                        
                        {Object.keys(groupedEquipment).length === 0 && regularEquipment.length === 0 && (
                            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                                <p className="text-gray-500 dark:text-gray-400">No equipment found matching your criteria.</p>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="mt-6">
                    <AssetTable 
                        assets={assetItems}
                        onEdit={handleEdit}
                        onDelete={(item) => { setSelectedItem(item); setDeleteConfirmOpen(true); }}
                    />
                </div>
            )}

            {/* Edit Modal */}
            <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title={modalMode === 'create' ? (isAssetMode ? "Add New Asset" : "Add New Equipment") : (isAssetMode ? "Manage Asset" : "Manage Equipment")}>
                <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">{isAssetMode ? 'Asset Name *' : 'Name *'}</label>
                        <Input
                            required
                            value={editForm.name}
                            onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                        />
                    </div>

                    {isAssetMode && (
                        <div>
                            <label className="block text-sm font-medium mb-1">Asset Tag No</label>
                            <Input
                                value={editForm.asset_tag}
                                onChange={(e) => setEditForm({...editForm, asset_tag: e.target.value})}
                            />
                        </div>
                    )}
                    {isAssetMode && ( // New Input Field
                        <div>
                            <label className="block text-sm font-medium mb-1">New Asset Tag No</label>
                            <Input
                                value={editForm.new_asset_tag}
                                onChange={(e) => setEditForm({...editForm, new_asset_tag: e.target.value})}
                            />
                        </div>
                    )}

                    {isAssetMode && (
                        <div>
                            <label className="block text-sm font-medium mb-1">Quantity</label>
                            <Input
                                type="number"
                                value={editForm.quantity}
                                onChange={(e) => setEditForm({...editForm, quantity: parseInt(e.target.value) || 1})}
                            />
                        </div>
                    )}
                    {isAssetMode && (
                        <div>
                            <label className="block text-sm font-medium mb-1">Kit Group</label>
                            <Input
                                value={editForm.kit_group}
                                onChange={(e) => setEditForm({...editForm, kit_group: e.target.value})}
                            />
                        </div>
                    )}
                    {isAssetMode && (
                        <div>
                            <label className="block text-sm font-medium mb-1">Assigned To</label>
                            <Input
                                value={editForm.assigned_to_text}
                                onChange={(e) => setEditForm({...editForm, assigned_to_text: e.target.value})}
                            />
                        </div>
                    )}
                    {isAssetMode && (
                        <div>
                            <label className="block text-sm font-medium mb-1">Last Checked</label>
                            <Input
                                type="date"
                                value={editForm.last_checked}
                                onChange={(e) => setEditForm({...editForm, last_checked: e.target.value})}
                            />
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium mb-1">{isAssetMode ? 'Equipment Type' : 'Category'}</label>
                            <Select
                                value={editForm.category}
                                onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                            >
                                <option value="">Select {isAssetMode ? 'Type' : 'Category'}</option>
                                {availableCategories.map(cat => (
                                    <option key={cat.id} value={cat.value}>{cat.value}</option>
                                ))}
                            </Select>
                        </div>
                        {!isAssetMode && (
                             <div>
                                <label className="block text-sm font-medium mb-1">Status</label>
                                <Select
                                    value={editForm.status}
                                    onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                                >
                                    <option value="available">Available</option>
                                    <option value="assigned">Assigned</option>
                                    <option value="maintenance">Maintenance</option>
                                    <option value="retired">Archived</option>
                                </Select>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <Input
                            value={editForm.description}
                            onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Serial Number</label>
                        <Input
                            value={editForm.serial_number}
                            onChange={(e) => setEditForm({...editForm, serial_number: e.target.value})}
                        />
                    </div>
                    
                    {!isAssetMode && (
                        <>
                            <div>
                                <label className="block text-sm font-medium mb-1">Location</label>
                                <Input
                                    value={editForm.location}
                                    onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Model (Optional)</label>
                                <Input
                                    value={editForm.model}
                                    onChange={(e) => setEditForm({...editForm, model: e.target.value})}
                                    placeholder="Enter model"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Purchase Date</label>
                                    <Input
                                        type="date"
                                        value={editForm.purchase_date}
                                        onChange={(e) => setEditForm({...editForm, purchase_date: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Cal. Expiry</label>
                                    <Input
                                        type="date"
                                        value={editForm.warranty_expiry}
                                        onChange={(e) => setEditForm({...editForm, warranty_expiry: e.target.value})}
                                        disabled={true} // Controlled by certificates
                                        className="bg-gray-100"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Updated automatically via certificates</p>
                                </div>
                            </div>

                            {modalMode === 'edit' && (
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                    <h3 className="font-medium text-gray-900 dark:text-white mb-3">Calibration Certificates</h3>
                                    
                                    {/* Certificates List */}
                                    {certificates.length > 0 ? (
                                        <div className="space-y-2 mb-4">
                                            {certificates.map((cert) => (
                                                <div key={cert.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-2 h-2 rounded-full ${new Date(cert.expiry_date) < new Date() ? 'bg-red-500' : 'bg-green-500'}`} />
                                                        <span className="text-sm text-gray-700 dark:text-gray-300">Expires: {new Date(cert.expiry_date).toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <a 
                                                            href={cert.file_url} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="p-1 text-gray-500 hover:text-orange-600 transition-colors"
                                                            title="Download"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </a>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteCertificate(cert)}
                                                            className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic mb-4">No certificates uploaded.</p>
                                    )}

                                    {/* Upload New */}
                                    <div className="bg-orange-50 dark:bg-orange-900/10 p-3 rounded-lg border border-orange-100 dark:border-orange-800">
                                        <h4 className="text-sm font-medium text-orange-800 dark:text-orange-300 mb-2">Upload New Certificate</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                            <div>
                                                <label className="block text-xs font-medium mb-1">Expiry Date</label>
                                                <Input
                                                    type="date"
                                                    value={newCertExpiry}
                                                    onChange={(e) => setNewCertExpiry(e.target.value)}
                                                    className="bg-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1">File</label>
                                                <input
                                                    type="file"
                                                    accept=".pdf,image/*"
                                                    onChange={(e) => {
                                                        if (e.target.files && e.target.files[0]) {
                                                            setEditForm(prev => ({ ...prev, calibration_file: e.target.files[0] }));
                                                        }
                                                    }}
                                                    className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200"
                                                />
                                            </div>
                                        </div>
                                        <Button 
                                            type="button" 
                                            size="sm" 
                                            onClick={handleUploadCertificate}
                                            disabled={!editForm.calibration_file || !newCertExpiry || updating}
                                            className="w-full"
                                        >
                                            {updating ? 'Uploading...' : 'Upload Certificate'}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                        {modalMode === 'edit' && (
                            <Button variant="danger" onClick={() => setDeleteConfirmOpen(true)} type="button">Delete</Button>
                        )}
                        <div className="flex gap-2 ml-auto">
                            <Button variant="outline" onClick={() => setEditModalOpen(false)} type="button">Cancel</Button>
                            <Button type="submit" disabled={updating}>
                                {updating ? 'Saving...' : (modalMode === 'create' ? (isAssetMode ? 'Add Asset' : 'Add Equipment') : 'Save Changes')}
                            </Button>
                        </div>
                    </div>
                </form>
            </Modal>

            <ConfirmationModal
                isOpen={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                onConfirm={handleDelete}
                title="Delete Equipment"
                message={`Are you sure you want to delete "${selectedItem?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                confirmVariant="danger"
            />

            {/* Export Wizard Modal */}
            <Modal isOpen={wizardOpen} onClose={() => setWizardOpen(false)} title="Export Certificates Wizard">
                <div className="p-6 space-y-4 h-[70vh] flex flex-col">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Select a date range and equipment to export all relevant calibration certificates as a ZIP file. 
                        Certificates are included if their validity period (1 year) overlaps with the selected range.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Start Date</label>
                            <Input
                                type="date"
                                value={exportStartDate}
                                onChange={(e) => setExportStartDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">End Date</label>
                            <Input
                                type="date"
                                value={exportEndDate}
                                onChange={(e) => setExportEndDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col">
                        <div className="p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex justify-between items-center">
                            <span className="font-medium text-sm">Select Equipment</span>
                            <button 
                                onClick={selectAllExport}
                                className="text-xs text-blue-600 hover:underline"
                            >
                                {selectedExportIds.length > 0 && selectedExportIds.length === Object.values(groupedEquipment).flat().length ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        <div className="overflow-y-auto p-2 space-y-1">
                            {Object.entries(groupedEquipment).map(([category, items]) => (
                                <div key={category}>
                                    <div className="text-xs font-bold text-gray-500 uppercase mt-2 mb-1 px-2">{category}</div>
                                    {items.map(item => (
                                        <label key={item.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-600 rounded cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedExportIds.includes(item.id)}
                                                onChange={() => toggleExportSelection(item.id)}
                                                className="rounded text-orange-500 focus:ring-orange-500"
                                            />
                                            <span className="text-sm">{item.name} <span className="text-gray-400 text-xs">({item.serial_number})</span></span>
                                        </label>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setWizardOpen(false)}>Cancel</Button>
                        <Button onClick={handleWizardExport} disabled={isExporting}>
                            {isExporting ? 'Exporting...' : 'Export Certificates'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default EquipmentRegisterPage;
