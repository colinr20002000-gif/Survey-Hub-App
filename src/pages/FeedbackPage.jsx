import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { Button, Select, Modal } from '../components/ui';

const FeedbackPage = () => {
    const { user } = useAuth();
    const [feedback, setFeedback] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedFeedback, setSelectedFeedback] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [deleteConfirmation, setDeleteConfirmation] = useState(null);

    // Check if current user is super admin
    const isSuperAdmin = user?.email === 'colin.rogers@inorail.co.uk';

    useEffect(() => {
        fetchFeedback();
    }, []);

    const fetchFeedback = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('feedback')
                .select(`
                    *,
                    user:users!user_id(name, email, username)
                `)
                .order('created_at', { ascending: false });

            if (fetchError) {
                throw fetchError;
            }

            setFeedback(data || []);
        } catch (err) {
            console.error('Error fetching feedback:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const updateFeedbackStatus = async (feedbackId, newStatus, adminNotes = '') => {
        try {
            const { error } = await supabase
                .from('feedback')
                .update({
                    status: newStatus,
                    admin_notes: adminNotes,
                    updated_at: new Date().toISOString()
                })
                .eq('id', feedbackId);

            if (error) {
                throw error;
            }

            // Update local state
            setFeedback(prev => prev.map(item =>
                item.id === feedbackId
                    ? { ...item, status: newStatus, admin_notes: adminNotes }
                    : item
            ));

            setSelectedFeedback(null);
            alert('Feedback status updated successfully');
        } catch (err) {
            console.error('Error updating feedback:', err);
            alert('Failed to update feedback status');
        }
    };

    const deleteFeedback = async (feedbackId) => {
        if (!isSuperAdmin) {
            alert('Only super administrators can delete feedback');
            return;
        }

        try {
            const { error } = await supabase
                .from('feedback')
                .delete()
                .eq('id', feedbackId);

            if (error) {
                throw error;
            }

            setFeedback(prev => prev.filter(item => item.id !== feedbackId));
            setSelectedFeedback(null);
            setDeleteConfirmation(null);
            alert('Feedback deleted successfully');
        } catch (err) {
            console.error('Error deleting feedback:', err);
            alert('Failed to delete feedback');
        }
    };

    const filteredFeedback = feedback.filter(item => {
        const statusMatch = statusFilter === 'all' || item.status === statusFilter;
        const typeMatch = typeFilter === 'all' || item.type === typeFilter;
        return statusMatch && typeMatch;
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'open': return 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400';
            case 'in_progress': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-400';
            case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400';
            case 'closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-400';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getTypeColor = (type) => {
        return type === 'bug'
            ? 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400'
            : 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-400';
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-red-800">Error Loading Feedback</h3>
                    <p className="mt-2 text-sm text-red-700">{error}</p>
                    <button
                        onClick={fetchFeedback}
                        className="mt-4 bg-red-100 px-3 py-1 rounded text-red-800 hover:bg-red-200"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Feedback Management</h1>
                <p className="text-gray-600 dark:text-gray-400">Manage bug reports and feature requests</p>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 mb-6">
                <div className="flex flex-wrap gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="all">All Statuses</option>
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                        </Select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                            <option value="all">All Types</option>
                            <option value="bug">Bug Reports</option>
                            <option value="feature">Feature Requests</option>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Feedback List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                <div className="p-6">
                    <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                        Feedback Items ({filteredFeedback.length})
                    </h2>
                    {filteredFeedback.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            No feedback items found
                        </div>
                    ) : (
                        filteredFeedback.map(item => (
                            <div
                                key={item.id}
                                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 hover:shadow-md transition-shadow cursor-pointer"
                                onClick={() => setSelectedFeedback(item)}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(item.type)}`}>
                                                {item.type === 'bug' ? 'Bug Report' : 'Feature Request'}
                                            </span>
                                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                                                {item.status.replace('_', ' ').toUpperCase()}
                                            </span>
                                        </div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                            {item.description}
                                        </p>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                            <span>By: {item.user?.name || 'Unknown'}</span>
                                            <span>{formatDate(item.created_at)}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {isSuperAdmin && (
                                            <Button
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteConfirmation(item);
                                                }}
                                                className="text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-500/10"
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Feedback Detail Modal */}
            {selectedFeedback && (
                <Modal
                    isOpen={!!selectedFeedback}
                    onClose={() => setSelectedFeedback(null)}
                    title="Manage Feedback"
                >
                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(selectedFeedback.type)}`}>
                                    {selectedFeedback.type === 'bug' ? 'Bug Report' : 'Feature Request'}
                                </span>
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedFeedback.status)}`}>
                                    {selectedFeedback.status.replace('_', ' ').toUpperCase()}
                                </span>
                            </div>
                            <h3 className="font-semibold text-lg">{selectedFeedback.title}</h3>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Description
                            </label>
                            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                                <p className="text-sm whitespace-pre-wrap">{selectedFeedback.description}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Submitted By
                                </label>
                                <p className="text-sm">{selectedFeedback.user?.name} ({selectedFeedback.user?.email})</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Submitted On
                                </label>
                                <p className="text-sm">{formatDate(selectedFeedback.created_at)}</p>
                            </div>
                        </div>

                        {selectedFeedback.admin_notes && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Admin Notes
                                </label>
                                <div className="bg-blue-50 dark:bg-blue-500/10 p-3 rounded-lg">
                                    <p className="text-sm whitespace-pre-wrap">{selectedFeedback.admin_notes}</p>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2 pt-4">
                            {selectedFeedback.status === 'open' && (
                                <Button
                                    onClick={() => updateFeedbackStatus(selectedFeedback.id, 'in_progress')}
                                    className="bg-yellow-500 hover:bg-yellow-600"
                                >
                                    Mark In Progress
                                </Button>
                            )}
                            {selectedFeedback.status === 'in_progress' && (
                                <Button
                                    onClick={() => updateFeedbackStatus(selectedFeedback.id, 'resolved')}
                                    className="bg-green-500 hover:bg-green-600"
                                >
                                    Mark Resolved
                                </Button>
                            )}
                            {(selectedFeedback.status === 'resolved' || selectedFeedback.status === 'open') && (
                                <Button
                                    onClick={() => updateFeedbackStatus(selectedFeedback.id, 'closed')}
                                    variant="outline"
                                >
                                    Close
                                </Button>
                            )}
                            {isSuperAdmin && (
                                <Button
                                    onClick={() => setDeleteConfirmation(selectedFeedback)}
                                    className="bg-red-500 hover:bg-red-600 text-white"
                                >
                                    <Trash2 size={14} className="mr-1" />
                                    Delete
                                </Button>
                            )}
                        </div>
                    </div>
                </Modal>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmation && (
                <Modal
                    isOpen={!!deleteConfirmation}
                    onClose={() => setDeleteConfirmation(null)}
                    title="Confirm Deletion"
                >
                    <div className="space-y-4">
                        <p className="text-gray-700 dark:text-gray-300">
                            Are you sure you want to delete this feedback item? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <Button
                                onClick={() => {
                                    deleteFeedback(deleteConfirmation.id);
                                }}
                                className="bg-red-500 hover:bg-red-600"
                            >
                                Delete
                            </Button>
                            <Button
                                onClick={() => setDeleteConfirmation(null)}
                                variant="outline"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default FeedbackPage;
