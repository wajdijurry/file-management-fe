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
        if (!record || record.get('type') !== 'file') return;

        const token = localStorage.getItem('token');
        const filePath = record.get('path');
        
        Ext.Ajax.request({
            url: 'http://localhost:5000/api/files/view',
            method: 'GET',
            params: { filePath: filePath },
            headers: { 'Authorization': `Bearer ${token}` },
            success: function(response) {
                // Handle file viewing based on file type
                const fileContent = response.responseText;
                // Implementation depends on file type and viewing requirements
            }
        });
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

        Ext.Msg.prompt('Compress Files', 'Enter the name for the ZIP file:', function(btn, zipFileName) {
            if (btn === 'ok' && zipFileName) {
                const token = localStorage.getItem('token');
                zipFileName = zipFileName.endsWith('.zip') ? zipFileName : `${zipFileName}.zip`;

                // Get file/folder IDs for compression
                const items = validRecords.map(record => ({
                    id: record.get('id'),
                    type: record.get('isFolder') ? 'folder' : 'file',
                    name: record.get('name')
                }));

                // Add progress bar for compression
                const progressId = 'compression';
                FileManagement.components.utils.ProgressBarManager.addProgressBar(
                    progressId,
                    `Compressing items to ${zipFileName}...`,
                    items.map(item => ({ fileName: item.name, status: 'Queued' })),
                    null,
                    false
                );

                Ext.Ajax.request({
                    url: 'http://localhost:5000/api/files/compress',
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    jsonData: {
                        items: items,
                        zipFileName: zipFileName,
                        folder: grid.currentFolder || '',
                        parentId: grid.currentFolderId || null
                    },
                    success: function(response) {
                        const result = Ext.JSON.decode(response.responseText);
                        if (result.success) {
                            FileManagement.components.utils.ProgressBarManager.updateProgress(
                                progressId,
                                100,
                                `Compression complete: ${zipFileName}`
                            );
                            setTimeout(() => {
                                FileManagement.components.utils.ProgressBarManager.removeProgressBar(progressId);
                                grid.getStore().reload();
                            }, 2000);
                        } else {
                            FileManagement.components.utils.ProgressBarManager.updateQueuedStatus(
                                progressId,
                                zipFileName,
                                'Failed'
                            );
                            Ext.Msg.alert('Error', result.error || 'Failed to compress files.');
                        }
                    },
                    failure: function(response) {
                        let errorMessage = 'Failed to compress files.';
                        try {
                            const result = Ext.JSON.decode(response.responseText);
                            errorMessage = result.error || errorMessage;
                        } catch (e) {
                            console.error('Error parsing error response:', e);
                        }

                        FileManagement.components.utils.ProgressBarManager.updateQueuedStatus(
                            progressId,
                            zipFileName,
                            'Failed'
                        );
                        Ext.Msg.alert('Error', errorMessage);
                    }
                });
            }
        });
    }
});
