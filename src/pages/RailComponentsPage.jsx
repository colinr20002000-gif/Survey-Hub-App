import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit, X, Search, Image as ImageIcon, Upload, ChevronLeft, ZoomIn, LayoutGrid, List } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { usePermissions } from '../hooks/usePermissions';
import { Button, Input, Modal } from '../components/ui';

const RailComponentsPage = () => {
    const { user } = useAuth();
    const { showErrorModal, showPrivilegeError } = useToast();
    const { canUploadDocuments } = usePermissions();

    const [albums, setAlbums] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAlbum, setSelectedAlbum] = useState(null);
    const [viewingPhotos, setViewingPhotos] = useState(false);
    const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);
    const [editingAlbum, setEditingAlbum] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [globalSearchQuery, setGlobalSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [viewingSearchResults, setViewingSearchResults] = useState(false);
    const [albumFormData, setAlbumFormData] = useState({ name: '', description: '', thumbnail: null });
    const [thumbnailPreview, setThumbnailPreview] = useState(null);
    const [uploadingAlbum, setUploadingAlbum] = useState(false);

    // Fetch albums
    const fetchAlbums = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('photo_albums')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            setAlbums(data || []);
        } catch (error) {
            console.error('Error fetching albums:', error);
            showErrorModal('Failed to fetch photo albums', 'Error');
        } finally {
            setLoading(false);
        }
    }, [showErrorModal]);

    useEffect(() => {
        fetchAlbums();

        // Real-time subscription for albums
        const albumsSubscription = supabase
            .channel('photo-albums-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'photo_albums' }, () => {
                fetchAlbums();
            })
            .subscribe();

        return () => {
            albumsSubscription.unsubscribe();
        };
    }, [fetchAlbums]);

    // Handle album form
    const handleAlbumFormChange = (e) => {
        const { name, value } = e.target;
        setAlbumFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleThumbnailChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAlbumFormData(prev => ({ ...prev, thumbnail: file }));
            const reader = new FileReader();
            reader.onloadend = () => setThumbnailPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleCreateAlbum = () => {
        if (!canUploadDocuments) {
            showPrivilegeError('You need Editor privilege or higher to create albums');
            return;
        }
        setEditingAlbum(null);
        setAlbumFormData({ name: '', description: '', thumbnail: null });
        setThumbnailPreview(null);
        setIsAlbumModalOpen(true);
    };

    const handleEditAlbum = (album) => {
        if (!canUploadDocuments) {
            showPrivilegeError('You need Editor privilege or higher to edit albums');
            return;
        }
        setEditingAlbum(album);
        setAlbumFormData({ name: album.name, description: album.description || '', thumbnail: null });
        setThumbnailPreview(album.thumbnail_url);
        setIsAlbumModalOpen(true);
    };

    const handleSaveAlbum = async () => {
        if (!canUploadDocuments) {
            showPrivilegeError('You need Editor privilege or higher to save albums');
            return;
        }

        if (!albumFormData.name.trim()) {
            showErrorModal('Album name is required', 'Validation Error');
            return;
        }

        setUploadingAlbum(true);

        try {
            let thumbnailUrl = editingAlbum?.thumbnail_url || null;

            // Upload thumbnail if new file selected
            if (albumFormData.thumbnail) {
                const fileExt = albumFormData.thumbnail.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `rail-components/thumbnails/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('photos')
                    .upload(filePath, albumFormData.thumbnail);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('photos')
                    .getPublicUrl(filePath);

                thumbnailUrl = publicUrl;
            }

            const albumData = {
                name: albumFormData.name,
                description: albumFormData.description || null,
                thumbnail_url: thumbnailUrl,
                created_by: user.id
            };

            if (editingAlbum) {
                const { error } = await supabase
                    .from('photo_albums')
                    .update(albumData)
                    .eq('id', editingAlbum.id);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('photo_albums')
                    .insert([albumData]);

                if (error) throw error;
            }

            setIsAlbumModalOpen(false);
            fetchAlbums();
        } catch (error) {
            console.error('Error saving album:', error);
            showErrorModal('Failed to save album: ' + error.message, 'Error');
        } finally {
            setUploadingAlbum(false);
        }
    };

    const handleDeleteAlbum = async (albumId) => {
        if (!canUploadDocuments) {
            showPrivilegeError('You need Editor privilege or higher to delete albums');
            return;
        }

        if (!window.confirm('Are you sure you want to delete this album? All photos in this album will also be deleted.')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('photo_albums')
                .delete()
                .eq('id', albumId);

            if (error) throw error;
            fetchAlbums();
        } catch (error) {
            console.error('Error deleting album:', error);
            showErrorModal('Failed to delete album: ' + error.message, 'Error');
        }
    };

    const handleViewAlbum = (album) => {
        setSelectedAlbum(album);
        setViewingPhotos(true);
    };

    const handleBackToAlbums = () => {
        setSelectedAlbum(null);
        setViewingPhotos(false);
        setViewingSearchResults(false);
        setSearchQuery('');
        setGlobalSearchQuery('');
    };

    const handleGlobalSearch = async (query) => {
        setGlobalSearchQuery(query);

        if (!query.trim()) {
            setSearchResults([]);
            setViewingSearchResults(false);
            return;
        }

        setSearching(true);
        try {
            const { data, error } = await supabase
                .from('photos')
                .select(`
                    *,
                    photo_albums (
                        id,
                        name,
                        description
                    )
                `)
                .ilike('description', `%${query}%`)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSearchResults(data || []);
            setViewingSearchResults(true);
        } catch (error) {
            console.error('Error searching photos:', error);
            showErrorModal('Failed to search photos', 'Error');
        } finally {
            setSearching(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300">Loading Rail Components...</p>
                </div>
            </div>
        );
    }

    if (viewingSearchResults) {
        return (
            <GlobalSearchResults
                searchQuery={globalSearchQuery}
                searchResults={searchResults}
                searching={searching}
                onBack={handleBackToAlbums}
                onSearchChange={handleGlobalSearch}
            />
        );
    }

    if (viewingPhotos && selectedAlbum) {
        return (
            <AlbumDetailView
                album={selectedAlbum}
                onBack={handleBackToAlbums}
                canEdit={canUploadDocuments}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
            />
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Rail Components Photo Albums</h1>
                    {canUploadDocuments && (
                        <Button onClick={handleCreateAlbum}>
                            <Plus size={16} className="mr-2" />
                            Create Album
                        </Button>
                    )}
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Browse and learn about various rail components through our photo library</p>

                {/* Global Search Bar */}
                <div className="relative max-w-2xl">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search all photos by description..."
                        value={globalSearchQuery}
                        onChange={(e) => handleGlobalSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    {searching && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500"></div>
                        </div>
                    )}
                </div>
            </div>

            {albums.length === 0 ? (
                <div className="text-center py-12">
                    <ImageIcon size={64} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400 mb-4">No photo albums yet</p>
                    {canUploadDocuments && (
                        <Button onClick={handleCreateAlbum}>
                            <Plus size={16} className="mr-2" />
                            Create Your First Album
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {albums.map(album => (
                        <div key={album.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
                            <div onClick={() => handleViewAlbum(album)} className="aspect-video bg-gray-200 dark:bg-gray-700 relative overflow-hidden">
                                {album.thumbnail_url ? (
                                    <img
                                        src={album.thumbnail_url}
                                        alt={album.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        loading="lazy"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <ImageIcon size={48} className="text-gray-400" />
                                    </div>
                                )}
                            </div>
                            <div className="p-4">
                                <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white truncate" onClick={() => handleViewAlbum(album)}>{album.name}</h3>
                                {album.description && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">{album.description}</p>
                                )}
                                {canUploadDocuments && (
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => handleEditAlbum(album)}>
                                            <Edit size={14} className="mr-1" />
                                            Edit
                                        </Button>
                                        <Button variant="danger" size="sm" onClick={() => handleDeleteAlbum(album.id)}>
                                            <Trash2 size={14} className="mr-1" />
                                            Delete
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Album Modal */}
            <Modal isOpen={isAlbumModalOpen} onClose={() => setIsAlbumModalOpen(false)} title={editingAlbum ? 'Edit Album' : 'Create Album'}>
                <div className="p-6 space-y-4">
                    <Input
                        label="Album Name"
                        name="name"
                        value={albumFormData.name}
                        onChange={handleAlbumFormChange}
                        placeholder="e.g., Track Components, Signaling Equipment"
                        required
                    />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Description
                        </label>
                        <textarea
                            name="description"
                            value={albumFormData.description}
                            onChange={handleAlbumFormChange}
                            placeholder="Brief description of this album..."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            rows="3"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Album Thumbnail
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleThumbnailChange}
                            className="block w-full text-sm text-gray-500 dark:text-gray-400
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-md file:border-0
                                file:text-sm file:font-semibold
                                file:bg-orange-50 file:text-orange-700
                                hover:file:bg-orange-100 dark:file:bg-orange-900 dark:file:text-orange-300"
                        />
                        {thumbnailPreview && (
                            <div className="mt-3">
                                <img src={thumbnailPreview} alt="Preview" className="w-full h-40 object-cover rounded-md" />
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
                    <Button variant="outline" onClick={() => setIsAlbumModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveAlbum} disabled={uploadingAlbum}>
                        {uploadingAlbum ? 'Saving...' : 'Save Album'}
                    </Button>
                </div>
            </Modal>
        </div>
    );
};

// Album Detail View Component
const AlbumDetailView = ({ album, onBack, canEdit, searchQuery, setSearchQuery }) => {
    const { user } = useAuth();
    const { showErrorModal, showPrivilegeError } = useToast();

    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
    const [editingPhoto, setEditingPhoto] = useState(null);
    const [photoFormData, setPhotoFormData] = useState({ image: null, description: '' });
    const [photoPreview, setPhotoPreview] = useState(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
    const [fullscreenPhoto, setFullscreenPhoto] = useState(null);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

    const fetchPhotos = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('photos')
                .select('*')
                .eq('album_id', album.id)
                .order('description', { ascending: true });

            if (error) throw error;
            setPhotos(data || []);
        } catch (error) {
            console.error('Error fetching photos:', error);
            showErrorModal('Failed to fetch photos', 'Error');
        } finally {
            setLoading(false);
        }
    }, [album.id, showErrorModal]);

    useEffect(() => {
        fetchPhotos();

        const photosSubscription = supabase
            .channel('photos-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'photos', filter: `album_id=eq.${album.id}` }, () => {
                fetchPhotos();
            })
            .subscribe();

        return () => {
            photosSubscription.unsubscribe();
        };
    }, [fetchPhotos, album.id]);

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhotoFormData(prev => ({ ...prev, image: file }));
            const reader = new FileReader();
            reader.onloadend = () => setPhotoPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleDescriptionChange = (e) => {
        setPhotoFormData(prev => ({ ...prev, description: e.target.value }));
    };

    const handleAddPhoto = () => {
        if (!canEdit) {
            showPrivilegeError('You need Editor privilege or higher to add photos');
            return;
        }
        setEditingPhoto(null);
        setPhotoFormData({ image: null, description: '' });
        setPhotoPreview(null);
        setIsPhotoModalOpen(true);
    };

    const handleEditPhoto = (photo) => {
        if (!canEdit) {
            showPrivilegeError('You need Editor privilege or higher to edit photos');
            return;
        }
        setEditingPhoto(photo);
        setPhotoFormData({ image: null, description: photo.description || '' });
        setPhotoPreview(photo.image_url);
        setIsPhotoModalOpen(true);
    };

    const handleSavePhoto = async () => {
        if (!canEdit) {
            showPrivilegeError('You need Editor privilege or higher to save photos');
            return;
        }

        if (!editingPhoto && !photoFormData.image) {
            showErrorModal('Please select an image', 'Validation Error');
            return;
        }

        setUploadingPhoto(true);

        try {
            let imageUrl = editingPhoto?.image_url || null;

            if (photoFormData.image) {
                const fileExt = photoFormData.image.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `rail-components/${album.id}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('photos')
                    .upload(filePath, photoFormData.image);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('photos')
                    .getPublicUrl(filePath);

                imageUrl = publicUrl;
            }

            const photoData = {
                album_id: album.id,
                image_url: imageUrl,
                description: photoFormData.description || null,
                created_by: user.id
            };

            if (editingPhoto) {
                const { error } = await supabase
                    .from('photos')
                    .update(photoData)
                    .eq('id', editingPhoto.id);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('photos')
                    .insert([photoData]);

                if (error) throw error;
            }

            setIsPhotoModalOpen(false);
            fetchPhotos();
        } catch (error) {
            console.error('Error saving photo:', error);
            showErrorModal('Failed to save photo: ' + error.message, 'Error');
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handleDeletePhoto = async (photoId) => {
        if (!canEdit) {
            showPrivilegeError('You need Editor privilege or higher to delete photos');
            return;
        }

        if (!window.confirm('Are you sure you want to delete this photo?')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('photos')
                .delete()
                .eq('id', photoId);

            if (error) throw error;
            fetchPhotos();
        } catch (error) {
            console.error('Error deleting photo:', error);
            showErrorModal('Failed to delete photo: ' + error.message, 'Error');
        }
    };

    const filteredPhotos = photos.filter(photo =>
        photo.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300">Loading photos...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <Button variant="outline" onClick={onBack} className="mb-4">
                    <ChevronLeft size={16} className="mr-2" />
                    Back to Albums
                </Button>

                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{album.name}</h1>
                        {album.description && (
                            <p className="text-gray-600 dark:text-gray-400">{album.description}</p>
                        )}
                    </div>
                    {canEdit && (
                        <Button onClick={handleAddPhoto}>
                            <Plus size={16} className="mr-2" />
                            Add Photo
                        </Button>
                    )}
                </div>

                <div className="flex gap-3 items-center">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search photos by description..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>

                    {/* View Toggle */}
                    <div className="flex bg-gray-100 dark:bg-gray-700 rounded-md p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 text-orange-500' : 'text-gray-600 dark:text-gray-400'}`}
                            title="Grid View"
                        >
                            <LayoutGrid size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 text-orange-500' : 'text-gray-600 dark:text-gray-400'}`}
                            title="List View"
                        >
                            <List size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {filteredPhotos.length === 0 ? (
                <div className="text-center py-12">
                    <ImageIcon size={64} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {searchQuery ? 'No photos match your search' : 'No photos in this album yet'}
                    </p>
                    {canEdit && !searchQuery && (
                        <Button onClick={handleAddPhoto}>
                            <Plus size={16} className="mr-2" />
                            Add Your First Photo
                        </Button>
                    )}
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPhotos.map(photo => (
                        <div key={photo.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                            <div className="w-full h-48 sm:h-64 bg-gray-100 dark:bg-gray-700">
                                <img
                                    src={photo.image_url}
                                    alt={photo.description || 'Photo'}
                                    className="w-full h-full object-cover sm:object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => {
                                        console.log('Clicking photo:', photo.image_url);
                                        setFullscreenPhoto(photo);
                                        setIsFullscreenOpen(true);
                                    }}
                                    onLoad={(e) => {
                                        console.log('✅ Thumbnail loaded:', photo.image_url);
                                    }}
                                    onError={(e) => {
                                        console.error('❌ Thumbnail failed:', photo.image_url);
                                    }}
                                />
                            </div>
                            <div className="p-4">
                                {photo.description && (
                                    <p className="text-gray-700 dark:text-gray-300 mb-3">{photo.description}</p>
                                )}
                                {canEdit && (
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => handleEditPhoto(photo)}>
                                            <Edit size={14} className="mr-1" />
                                            Edit
                                        </Button>
                                        <Button variant="danger" size="sm" onClick={() => handleDeletePhoto(photo.id)}>
                                            <Trash2 size={14} className="mr-1" />
                                            Delete
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredPhotos.map(photo => (
                        <div key={photo.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden flex flex-col sm:flex-row">
                            <div className="w-full sm:w-64 h-48 sm:h-40 bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                                <img
                                    src={photo.image_url}
                                    alt={photo.description || 'Photo'}
                                    className="w-full h-full object-cover sm:object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => {
                                        console.log('Clicking photo:', photo.image_url);
                                        setFullscreenPhoto(photo);
                                        setIsFullscreenOpen(true);
                                    }}
                                    onLoad={(e) => {
                                        console.log('✅ Thumbnail loaded:', photo.image_url);
                                    }}
                                    onError={(e) => {
                                        console.error('❌ Thumbnail failed:', photo.image_url);
                                    }}
                                />
                            </div>
                            <div className="p-4 flex-1 flex flex-col justify-between">
                                {photo.description && (
                                    <p className="text-gray-700 dark:text-gray-300 mb-3">{photo.description}</p>
                                )}
                                {canEdit && (
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => handleEditPhoto(photo)}>
                                            <Edit size={14} className="mr-1" />
                                            Edit
                                        </Button>
                                        <Button variant="danger" size="sm" onClick={() => handleDeletePhoto(photo.id)}>
                                            <Trash2 size={14} className="mr-1" />
                                            Delete
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Photo Modal */}
            <Modal isOpen={isPhotoModalOpen} onClose={() => setIsPhotoModalOpen(false)} title={editingPhoto ? 'Edit Photo' : 'Add Photo'}>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Photo Image {!editingPhoto && <span className="text-red-500">*</span>}
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            className="block w-full text-sm text-gray-500 dark:text-gray-400
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-md file:border-0
                                file:text-sm file:font-semibold
                                file:bg-orange-50 file:text-orange-700
                                hover:file:bg-orange-100 dark:file:bg-orange-900 dark:file:text-orange-300"
                        />
                        {photoPreview && (
                            <div className="mt-3">
                                <img src={photoPreview} alt="Preview" className="w-full h-64 object-cover rounded-md" />
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Description
                        </label>
                        <textarea
                            value={photoFormData.description}
                            onChange={handleDescriptionChange}
                            placeholder="Describe this component or what the photo shows..."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            rows="4"
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
                    <Button variant="outline" onClick={() => setIsPhotoModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleSavePhoto} disabled={uploadingPhoto}>
                        {uploadingPhoto ? 'Saving...' : 'Save Photo'}
                    </Button>
                </div>
            </Modal>

            {/* Fullscreen Photo Viewer */}
            {isFullscreenOpen && fullscreenPhoto && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center p-4" onClick={() => setIsFullscreenOpen(false)}>
                    <button
                        onClick={() => setIsFullscreenOpen(false)}
                        className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
                    >
                        <X size={32} />
                    </button>
                    <div className="max-w-7xl max-h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <img
                            src={fullscreenPhoto.image_url}
                            alt={fullscreenPhoto.description}
                            className="max-w-full max-h-[85vh] object-contain"
                        />
                        {fullscreenPhoto.description && (
                            <p className="text-white text-center mt-4 text-lg">{fullscreenPhoto.description}</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// Global Search Results Component
const GlobalSearchResults = ({ searchQuery, searchResults, searching, onBack, onSearchChange }) => {
    const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
    const [fullscreenPhoto, setFullscreenPhoto] = useState(null);

    return (
        <div className="p-6">
            <div className="mb-6">
                <Button variant="outline" onClick={onBack} className="mb-4">
                    <ChevronLeft size={16} className="mr-2" />
                    Back to Albums
                </Button>

                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Search Results
                </h1>

                {/* Keep search bar visible */}
                <div className="relative max-w-2xl mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search all photos by description..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        autoFocus
                    />
                    {searching && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500"></div>
                        </div>
                    )}
                </div>

                <p className="text-gray-600 dark:text-gray-400">
                    {searching ? 'Searching...' : `Found ${searchResults.length} photo${searchResults.length !== 1 ? 's' : ''} matching "${searchQuery}"`}
                </p>
            </div>

            {searchResults.length === 0 && !searching ? (
                <div className="text-center py-12">
                    <ImageIcon size={64} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No photos found matching your search</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {searchResults.map(photo => (
                        <div key={photo.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                            <img
                                src={photo.image_url}
                                alt={photo.description || 'Photo'}
                                className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => {
                                    console.log('Clicking photo:', photo.image_url);
                                    setFullscreenPhoto(photo);
                                    setIsFullscreenOpen(true);
                                }}
                                onLoad={(e) => {
                                    console.log('✅ Thumbnail loaded:', photo.image_url);
                                }}
                                onError={(e) => {
                                    console.error('❌ Thumbnail failed:', photo.image_url);
                                }}
                            />
                            <div className="p-4">
                                {photo.photo_albums && (
                                    <p className="text-xs text-orange-500 dark:text-orange-400 font-semibold mb-2 uppercase">
                                        {photo.photo_albums.name}
                                    </p>
                                )}
                                {photo.description && (
                                    <p className="text-gray-700 dark:text-gray-300">{photo.description}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Fullscreen Photo Viewer */}
            {isFullscreenOpen && fullscreenPhoto && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center p-4" onClick={() => setIsFullscreenOpen(false)}>
                    <button
                        onClick={() => setIsFullscreenOpen(false)}
                        className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
                    >
                        <X size={32} />
                    </button>
                    <div className="max-w-7xl max-h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <img
                            src={fullscreenPhoto.image_url}
                            alt={fullscreenPhoto.description}
                            className="max-w-full max-h-[85vh] object-contain"
                        />
                        {fullscreenPhoto.description && (
                            <p className="text-white text-center mt-4 text-lg">{fullscreenPhoto.description}</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RailComponentsPage;
