# Modular Site Information - Implementation Guide

## Overview
This guide explains how to complete the modular Site Information tab implementation.

## Database Structure
Already applied migration that creates:
- `site_info_sections` JSONB column - stores array of section objects
- `site_info_photos` JSONB column - stores array of photo objects

## What's Already Done
1. ✅ Database migration applied
2. ✅ State management functions added (lines 3288-3418 in App.jsx)
   - addSection, removeSection, updateSectionData
   - addTrackToSection, removeTrackFromSection, updateTrackInSection
   - addPhotoBox, removePhotoBox, updatePhotoTitle

## What Needs to Be Replaced

### Step 1: Update handlePhotoUpload (around line 3420)
Replace the old `handlePhotoUpload` function with:

```javascript
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
```

### Step 2: Delete getFileInputRef function (around line 3460)
Remove this entirely - it's no longer needed.

### Step 3: Create Section Rendering Components
Add these component functions before the `return` statement:

```javascript
const renderSection = (section) => {
    const { id, type, data } = section;

    const sectionTitles = {
        site_location: 'Site Location',
        chainage_reference: 'Chainage Reference',
        site_mileage: 'Site Mileage',
        track_information: 'Track Information'
    };

    return (
        <div key={id} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">{sectionTitles[type]}</h3>
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

const renderSectionContent = (section) => {
    const { id, type, data } = section;

    switch (type) {
        case 'site_location':
            return (
                <div className="space-y-3">
                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Postcode</label>
                        <Input
                            value={data.postcode || ''}
                            onChange={(e) => updateSectionData(id, 'postcode', e.target.value)}
                            disabled={!isEditing}
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Google Maps Link</label>
                        <Input
                            value={data.google_maps_link || ''}
                            onChange={(e) => updateSectionData(id, 'google_maps_link', e.target.value)}
                            disabled={!isEditing}
                            placeholder="https://maps.google.com/..."
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">What3Words Link</label>
                        <Input
                            value={data.what3words_link || ''}
                            onChange={(e) => updateSectionData(id, 'what3words_link', e.target.value)}
                            disabled={!isEditing}
                            placeholder="https://w3w.co/..."
                        />
                    </div>
                </div>
            );

        case 'chainage_reference':
            return (
                <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chainage Datum</label>
                    <Input
                        value={data.chainage_datum || ''}
                        onChange={(e) => updateSectionData(id, 'chainage_datum', e.target.value)}
                        disabled={!isEditing}
                    />
                </div>
            );

        case 'site_mileage':
            return (
                <div className="space-y-3">
                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ELR</label>
                        <Input
                            value={data.elr || ''}
                            onChange={(e) => updateSectionData(id, 'elr', e.target.value)}
                            disabled={!isEditing}
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Mileage</label>
                        <Input
                            value={data.start_mileage || ''}
                            onChange={(e) => updateSectionData(id, 'start_mileage', e.target.value)}
                            disabled={!isEditing}
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Mileage</label>
                        <Input
                            value={data.end_mileage || ''}
                            onChange={(e) => updateSectionData(id, 'end_mileage', e.target.value)}
                            disabled={!isEditing}
                        />
                    </div>
                </div>
            );

        case 'track_information':
            return (
                <div className="space-y-3">
                    {(data.tracks && data.tracks.length > 0) ? (
                        data.tracks.map((track, index) => (
                            <div key={index} className="flex gap-3 items-start p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                <div className="flex-1">
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                                        Track {index + 1}
                                    </label>
                                    <Input
                                        value={track.name || ''}
                                        onChange={(e) => updateTrackInSection(id, index, 'name', e.target.value)}
                                        disabled={!isEditing}
                                        placeholder="Enter track name"
                                    />
                                </div>
                                <div className="flex items-center gap-2 pt-6">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={track.isDesign || false}
                                            onChange={(e) => updateTrackInSection(id, index, 'isDesign', e.target.checked)}
                                            disabled={!isEditing}
                                            className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-700"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                            Design Track
                                        </span>
                                    </label>
                                    {isEditing && (
                                        <button
                                            onClick={() => removeTrackFromSection(id, index)}
                                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                            title="Remove track"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
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
                {canEdit && (
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
```

### Step 4: Replace the entire return statement
Find the return statement around line 3524 and replace EVERYTHING from `return (` until the closing `);` of ProjectSiteInformation with:

```javascript
return (
    <div className="space-y-6">
        {canEdit && (
            <div className="flex justify-between items-end">
                {isEditing ? (
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => { setIsEditing(false); setFormData({...project, site_info_sections: project.site_info_sections || [], site_info_photos: project.site_info_photos || []}); }}>Cancel</Button>
                        <Button onClick={handleSave}>Save Changes</Button>
                    </div>
                ) : (
                    <Button variant="outline" onClick={() => setIsEditing(true)}>Edit Information</Button>
                )}
            </div>
        )}

        {/* Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {formData.site_info_sections.map(section => renderSection(section))}

            {formData.site_info_sections.length === 0 && !isEditing && (
                <div className="col-span-full text-center py-12 text-gray-400 dark:text-gray-500">
                    <p>No sections added yet.</p>
                </div>
            )}
        </div>

        {/* Add Section Button */}
        {isEditing && (
            <div className="relative">
                <Button
                    variant="outline"
                    onClick={() => setIsAddSectionMenuOpen(!isAddSectionMenuOpen)}
                    className="w-full md:w-auto"
                >
                    <PlusCircle size={16} className="mr-2" />
                    Add Section
                </Button>
                {isAddSectionMenuOpen && (
                    <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 p-2">
                        <button
                            onClick={() => addSection('site_location')}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                        >
                            Site Location
                        </button>
                        <button
                            onClick={() => addSection('chainage_reference')}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                        >
                            Chainage Reference
                        </button>
                        <button
                            onClick={() => addSection('site_mileage')}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                        >
                            Site Mileage
                        </button>
                        <button
                            onClick={() => addSection('track_information')}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                        >
                            Track Information
                        </button>
                    </div>
                )}
            </div>
        )}

        {/* Photos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {formData.site_info_photos.map(photo => renderPhotoBox(photo))}
        </div>

        {/* Add Photo Box Button */}
        {isEditing && (
            <Button
                variant="outline"
                onClick={addPhotoBox}
                className="w-full md:w-auto"
            >
                <PlusCircle size={16} className="mr-2" />
                Add Photo Box
            </Button>
        )}

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
```

## Summary
After these changes, the Site Information tab will be fully modular with:
- Users can add/remove sections (Site Location, Chainage Reference, Site Mileage, Track Information)
- Users can add/remove photo boxes with custom titles
- All data is stored in JSON arrays in the database
- Clean, flexible UI

This is a complete rewrite but provides much better flexibility for users!
