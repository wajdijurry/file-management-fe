// components/FileGridStore.js
Ext.define('FileManagement.components.stores.FileGridStore', {
    extend: 'Ext.data.Store',
    autoLoad: true, // Automatically load the store on initialization
    xtype: "fileGridStore",
    proxy: {
        type: 'ajax',
        url: 'http://localhost:5000/api/files?parent_id=', // API endpoint to fetch files
        reader: {
            type: 'json',
            rootProperty: 'files', // API response structure
            idProperty: 'id' // Use MongoDB's id as the record identifier
        }
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
        { name: 'name', type: 'string' },
        {
            name: 'size',
            type: 'int',
            convert: function(value, record) {
                if (value < 1024) return `${value} Bytes`;
                else if (value < 1024 * 1024) return `${(value / 1024).toFixed(2)} KB`;
                else if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(2)} MB`;
                return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
            }
        },
        {
            name: 'createdAt',
            type: 'date' // Automatically parses ISO date strings from MongoDB
        },
        { name: 'isFolder', type: 'boolean' },
        { name: 'isLocked', type: 'boolean' },
        { name: 'hasChildren', type: 'boolean' }
    ],

    loadFolderContents: function(folderName, folderId, pushToPath = true) {
        // Only push the folder to currentFolderPath if explicitly allowed
        if (folderName !== null && folderId !== this.currentFolderId && pushToPath) {
            this.currentFolderPath.push({ name: folderName, id: folderId });
        }

        this.getProxy().setUrl(`http://localhost:5000/api/files?parent_id=${folderId}`);
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