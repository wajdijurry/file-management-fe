// components/FileGridStore.js
Ext.define('FileManagement.components.stores.FileGridStore', {
    extend: 'Ext.data.Store',
    autoLoad: true, // Automatically load the store on initialization
    xtype: "fileGridStore",
    groupField: 'parentPath',
    proxy: {
        type: 'ajax',
        url: 'http://localhost:5000/api/files',
        reader: {
            type: 'json',
            rootProperty: 'files',
            idProperty: 'id'
        },
        extraParams: {
            parent_id: ''
        },
        appendId: false, // Ensure parameters are properly handled
        simpleSortMode: true // Enable simple sort mode for proper parameter handling
    },

    listeners: {
        load: function(store, records, successful, operation) {
            if (!successful) {
                console.error('Failed to load files:', operation.getError());
            }

            if (successful && store.currentFolderId) {
                store.insert(0, {
                    name: '..',
                    isFolder: true,
                    isUpDirectory: true // Custom property to identify `..` item
                });
            }
        }
    },

    fields: [
        { name: 'id', type: 'string' }, // MongoDB ID field
        { name: 'mimetype', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'path', type: 'string' },
        {
            name: 'icon',
            type: 'string',
            convert: function(value, record) {
                let mimeType = record.get('mimetype');
                let iconClass = 'fa fa-xl'; // Base class

                if (record.get('isFolder')) {
                    iconClass += ' fa-folder'; // Folder icon
                } else {
                    switch (mimeType) {
                        case 'application/pdf':
                            iconClass += ' fa-file-pdf red-icon';
                            break;
                        case 'image/jpeg':
                        case 'image/png':
                        case 'image/avif':
                            iconClass += ' fa-image green-icon';
                            break;
                        case 'doc':
                            iconClass += ' icon-doc blue-icon';
                            break;
                        case 'application/zip':
                            iconClass += ' fa-file-archive yellow-icon';
                            break;
                        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                        case 'application/msword':
                            iconClass += ' fa-duotone fa-solid fa-file-word blue-icon';
                            break;
                        case 'application/vnd.ms-powerpoint':
                        case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
                            iconClass += ' fa-duotone fa-solid fa-file-ppt';
                            break;
                        case 'text/plain':
                            iconClass += ' fa-duotone fa-solid fa-file-lines';
                            break;
                        default:
                            iconClass += ' fa-duotone fa-solid fa-file';
                    }
                }

                // Add lock icon if item is locked
                if (record.get('isLocked')) {
                    iconClass += ' fa-lock'; // Lock icon
                }

                return iconClass;
            }
        },
        {
            name: 'type',
            type: 'string',
            convert: function(value, record) {
                if (record.get('isFolder')) return 'Folder';
                const mimetype = record.get('mimetype') || '';
                if (!mimetype) return 'Unknown';
                
                // Common file types
                switch (mimetype) {
                    case 'application/pdf':
                        return 'PDF';
                    case 'application/zip':
                        return 'ZIP';
                    case 'application/x-7z-compressed':
                        return '7Z';
                    case 'application/x-tar':
                    case 'application/gzip':
                        return 'Archive';
                    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                    case 'application/msword':
                        return 'Word';
                    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
                    case 'application/vnd.ms-excel':
                        return 'Excel';
                    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
                    case 'application/vnd.ms-powerpoint':
                        return 'PowerPoint';
                    case 'text/plain':
                        return 'Text';
                    default:
                        // Handle image types
                        if (mimetype.startsWith('image/')) {
                            return mimetype.split('/')[1].toUpperCase();
                        }
                        // Handle video types
                        if (mimetype.startsWith('video/')) {
                            return 'Video';
                        }
                        // Handle audio types
                        if (mimetype.startsWith('audio/')) {
                            return 'Audio';
                        }
                        return mimetype.split('/')[1] || 'Unknown';
                }
            }
        },
        {
            name: 'size',
            type: 'number',
            sortType: 'asInt',
            convert: function(value) {
                return parseInt(value, 10) || 0;
            }
        },
        {
            name: 'createdAt',
            type: 'date' // Automatically parses ISO date strings from MongoDB
        },
        { name: 'isFolder', type: 'boolean' },
        { name: 'isLocked', type: 'boolean' },
        { name: 'hasChildren', type: 'boolean' },
        { 
            name: 'parentPath',
            convert: function(v, record) {
                const path = record.get('path') || '';
                // Extract the last part of the path (after the last userId occurrence)
                const parts = path.split('/');
                const userIdIndex = parts.findIndex(part => /^[0-9a-f]{24}$/i.test(part));
                
                if (userIdIndex !== -1) {
                    // Get only the parts after userId
                    const relevantParts = parts.slice(userIdIndex + 1, -1);
                    return relevantParts.length ? '/' + relevantParts.join('/') : '/';
                }
                return '/';
            }
        }
    ],

    constructor: function(config) {
        this.callParent([config]);

        // Add listener to handle grouping based on search
        this.on('beforeload', function(store, operation) {
            const isSearching = store.getProxy().extraParams.search;
            store.setGroupField(isSearching ? 'parentPath' : null);
        });
    },

    loadFolderContents: function(folderName, folderId, pushToPath = true) {
        // Only push the folder to currentFolderPath if explicitly allowed
        if (folderName !== null && folderId !== this.currentFolderId && pushToPath) {
            this.currentFolderPath.push({ name: folderName, id: folderId });
        }

        this.getProxy().setExtraParam('parent_id', folderId);
        this.load({
            callback: function(records, operation, success) {
                if (!success) {
                    Ext.Msg.alert('Error', `Failed to load contents of folder "${folderName}".`);
                }
            }
        });
    },

    deleteFiles: function(fileIds) {
        Ext.Ajax.request({
            url: 'http://localhost:5000/api/files', // API for batch deletion
            method: 'DELETE',
            jsonData: { ids: fileIds },
            success: (response) => {
                Ext.Msg.alert('Success', 'Files/Folders deleted successfully.');
                this.reload(); // Reload the store data after deletion
            },
            failure: (response) => {
                Ext.Msg.alert('Error', 'Failed to delete files/folders.');
            }
        });
    },

    renameFile: function(fileId, newName, isFolder) {
        Ext.Ajax.request({
            url: 'http://localhost:5000/api/files/rename',
            method: 'POST',
            jsonData: { itemId: fileId, newName, isFolder },
            success: () => {
                Ext.Msg.alert('Success', 'File/Folder renamed successfully.');
                this.reload(); // Reload the store after renaming
            },
            failure: (response) => {
                let error = JSON.parse(response.responseText).message;
                Ext.Msg.alert('Error', error ?? 'Failed to rename file/folder.');
            }
        });
    },

    compressSelected: function(grid, selections, currentFolderId, currentFolder) {        
        Ext.create('FileManagement.components.dialogs.CompressionDialog', {
            selections,
            currentFolderId: currentFolderId,
            currentFolder: currentFolder,
            onSuccess: function() {
                console.log('khaldoon');
                
                grid.getStore().reload();
            }
        }).show();
    }
});