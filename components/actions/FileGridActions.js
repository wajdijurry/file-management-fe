Ext.define('FileManagement.components.actions.FileGridActions', {
    singleton: true,

    onDeleteFiles: function(grid) {
        const selectedRecords = grid.getSelectionModel().getSelection();
        if (selectedRecords.length === 0) return;

        Ext.Msg.confirm('Delete Files', 'Are you sure you want to delete the selected files?', function(btn) {
            if (btn === 'yes') {
                const token = localStorage.getItem('token');
                const fileIds = selectedRecords.map(record => record.get('id'));

                Ext.Ajax.request({
                    url: 'http://localhost:5000/api/files',
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    jsonData: { ids: fileIds },
                    success: function() {
                        grid.getStore().reload();
                    },
                    failure: function(response) {
                        Ext.Msg.alert('Error', 'Failed to delete files/folders.');
                    }
                });
            }
        });
    },

    onRenameFile: function(grid) {
        const selectedRecord = grid.getSelectionModel().getSelection()[0];
        if (!selectedRecord) return;

        Ext.Msg.prompt('Rename', 'Enter new name:', function(btn, text) {
            if (btn === 'ok' && text) {
                const token = localStorage.getItem('token');
                
                Ext.Ajax.request({
                    url: 'http://localhost:5000/api/files/rename',
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    jsonData: {
                        fileId: selectedRecord.get('id'),
                        newName: text
                    },
                    success: function() {
                        grid.getStore().reload();
                    }
                });
            }
        }, null, null, selectedRecord.get('name'));
    },

    onViewFile: function(grid, record) {
        if (!record) {
            record = grid.getSelectionModel().getSelection()[0];
            if (!record) {
                Ext.Msg.alert('Error', 'No file selected.');
                return;
            }
        }

        if (record.get('isFolder')) {
            Ext.Msg.alert('Error', 'Cannot view folders. Please select a file.');
            return;
        }

        const fileId = record.get('id');
        const mainPanel = Ext.getCmp('mainPanelRegion');

        if (!mainPanel) {
            Ext.Msg.alert('Error', 'Main panel not found.');
            return;
        }

        try {
            // Check if a viewer for this file is already open
            const existingViewer = mainPanel.items.findBy(item => item.fileId === fileId);
            if (existingViewer) {
                existingViewer.setStyle({ zIndex: ++window.highestZIndex });
                existingViewer.show();
                existingViewer.toFront();
                return;
            }

            // Create and add the new viewer panel
            const viewer = FileManagement.components.viewers.ViewerFactory.createViewer(record);
            if (viewer) {
                viewer.fileId = fileId; // Tag the panel with the file ID for tracking
                viewer.show(); // Add the viewer to the main panel

                const toolbar = Ext.ComponentQuery.query('userToolbar')[0];
                if (toolbar) {
                    toolbar.addPanelToggleButton(viewer, record.get('name'), record.get('icon'));
                }
            }
        } catch (error) {
            console.error('Error viewing file:', error);
            Ext.Msg.alert('Error', error.message || 'Failed to view file. Please try again.');
        }
    },

    onOpenFolder: function(grid, record) {
        if (!record || record.get('type') !== 'folder') return;
        
        const folderId = record.get('id');
        const folderName = record.get('name');
        grid.loadFolderContents(folderName, folderId);
    },

    onCompressSelectedFiles: function(grid) {
        const selectedRecords = grid.getSelectionModel().getSelection();
        if (selectedRecords.length === 0) return;

        // Filter out the up directory entry
        const validRecords = selectedRecords.filter(record => !record.get('isUpDirectory'));
        if (validRecords.length === 0) {
            Ext.Msg.alert('Error', 'Please select valid files or folders to compress.');
            return;
        }

        // Get file/folder info for compression
        // const items = validRecords.map(record => ({
        //     id: record.get('id'),
        //     type: record.get('isFolder') ? 'folder' : 'file',
        //     name: record.get('name')
        // }));

        // Use the CompressionDialog for better user experience
        const store = grid.getStore();
        store.compressSelected(
            grid,
            selectedRecords,
            grid.currentFolderId || null,
            grid.currentFolder || ''
        );
    }
});
