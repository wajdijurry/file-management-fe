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
            rootProperty: 'files' // API response structure
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
                            break
                        case 'text/plain':
                            iconClass += ' fa-duotone fa-solid fa-file-lines';
                        // Add more cases as needed
                        default:
                            iconClass += ' fa-duotone fa-solid fa-file'; // Default icon class
                    }
                }

                return iconClass;
            }
        },
        { name: 'name', type: 'string' },
        {
            name: 'size',
            type: 'int',
            convert: function(value, record) {
                if (record.get('isFolder')) return '';
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
        { name: 'isFolder', type: 'boolean' }
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
            failure: () => {
                Ext.Msg.alert('Error', 'Failed to rename file/folder.');
            }
        });
    },

    compressSelected: function(grid, selection, currentFolderId, currentFolder) {
        // Prompt for zip file name
        Ext.Msg.prompt('Zip File Name', 'Enter the name for the zip file:', function(btn, text) {
            if (btn === 'ok' && text) {
                const zipFileName = text.endsWith('.zip') ? text : `${text}.zip`;
                const selectedItems = selection.map(record => record.get('name'));

                if (selectedItems.length === 0) {
                    Ext.Msg.alert('Error', 'No items selected for compression.');
                    return;
                }

                // Call the backend API to compress the selected items
                Ext.Ajax.request({
                    url: 'http://localhost:5000/api/files/compress',
                    method: 'POST',
                    jsonData: {
                        items: selectedItems,
                        folder: currentFolder,
                        zipFileName: zipFileName,
                        parentId: currentFolderId
                    },
                    success: function(response) {
                        Ext.Msg.alert('Success', 'Files compressed successfully.');
                        grid.getStore().reload();
                    },
                    failure: function(response) {
                        Ext.Msg.alert('Error', 'Failed to compress files');
                    }
                });
            }
        });
    }
});