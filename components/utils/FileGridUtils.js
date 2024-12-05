Ext.define('FileManagement.components.utils.FileGridUtils', {
    singleton: true,

    downloadFileInChunks: async function(filePath, fileName, token, chunkSize) {
        const progressId = `download-${fileName}`; // Use fileName for more readable ID
        const abortController = new AbortController();

        // Add progress bar with cancel callback
        FileManagement.components.utils.ProgressBarManager.addProgressBar(
            progressId, 
            `Downloading ${fileName}`, 
            [{ fileName: fileName, status: 'Queued' }],
            function() {
                console.log('Download cancelled');
                abortController.abort();
            },
            false
        );

        try {
            // First get the file size
            const metadataResponse = await fetch('http://localhost:5000/api/files/file-size', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ filePath }),
                signal: abortController.signal
            });

            if (!metadataResponse.ok) {
                throw new Error('Failed to fetch file size');
            }

            const { fileSize } = await metadataResponse.json();
            console.log('Total file size:', fileSize);

            // Set initial status
            FileManagement.components.utils.ProgressBarManager.updateQueuedStatus(
                progressId,
                fileName,
                'Downloading'
            );

            const chunks = [];
            let totalSize = 0;
            
            // Calculate optimal chunk size (max 2MB)
            const optimalChunkSize = Math.min(chunkSize, Math.max(256 * 1024, Math.floor(fileSize / 10)));

            while (totalSize < fileSize) {
                const end = Math.min(totalSize + optimalChunkSize - 1, fileSize - 1);
                
                const response = await fetch('http://localhost:5000/api/files/download', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'Range': `bytes=${totalSize}-${end}`
                    },
                    body: JSON.stringify({ filePath }),
                    signal: abortController.signal
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const chunk = await response.arrayBuffer();
                if (chunk.byteLength === 0) {
                    throw new Error('Received empty chunk');
                }

                chunks.push(chunk);
                totalSize += chunk.byteLength;
                
                // Update progress for each chunk
                const progress = Math.round((totalSize / fileSize) * 100);
                console.log(`Download progress: ${progress}% (${totalSize}/${fileSize} bytes)`);
                FileManagement.components.utils.ProgressBarManager.updateProgress(
                    progressId,
                    progress,
                    `Downloading ${fileName}... ${progress}%`
                );
            }

            // Combine chunks and create final blob
            const blob = new Blob(chunks, { type: 'application/octet-stream' });
            const url = window.URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // Update final status
            FileManagement.components.utils.ProgressBarManager.updateProgress(
                progressId,
                100,
                `Downloaded ${fileName}`
            );

            // Keep progress bar visible briefly so user can see completion
            setTimeout(() => {
                FileManagement.components.utils.ProgressBarManager.removeProgressBar(progressId);
            }, 2000);

        } catch (error) {
            console.error('Download error:', error);
            if (error.name === 'AbortError') {
                FileManagement.components.utils.ProgressBarManager.updateQueuedStatus(
                    progressId,
                    fileName,
                    'Cancelled'
                );
            } else {
                FileManagement.components.utils.ProgressBarManager.updateQueuedStatus(
                    progressId,
                    fileName,
                    'Failed'
                );
                Ext.Msg.alert('Error', `Download failed: ${error.message}`);
            }
            throw error;
        }
    },

    concatenateChunks: function(chunks) {
        return chunks.join('');
    },

    handleItemAccess: function(record, callback) {
        if (record.get('isPasswordProtected')) {
            // Show password prompt dialog
            Ext.create('FileManagement.components.dialogs.PasswordPromptDialog', {
                itemId: record.get('id'),
                itemName: record.get('name'),
                isFolder: record.get('isFolder'),
                onSuccess: callback
            }).show();
        } else {
            // If not password protected, proceed directly
            callback();
        }
    },

    moveItem: function(selectedItems, targetRecord) {
        const token = localStorage.getItem('token');
        
        return new Promise((resolve, reject) => {
            if (!targetRecord || !targetRecord.id) {
                reject('Invalid target folder');
                return;
            }

            const isTargetZip = targetRecord.name ? targetRecord.name.endsWith('.zip') : false;
            const confirmMessage = isTargetZip ? 
                `Move items into "${targetRecord.name}"?` :
                `Move items to "${targetRecord.name}"?`;

            // First check if target is password protected
            this.handleItemAccess(targetRecord, () => {
                Ext.Msg.confirm('Move', confirmMessage, function(choice) {
                    if (choice === 'yes') {
                        // Prepare the data for the move operation
                        const moveData = {
                            itemIds: selectedItems.map(item => item.get('id')),
                            targetId: targetRecord.id,
                            isTargetZip: isTargetZip,
                            progressId: `moving-${Date.now()}`
                        };

                        // Make the API call to move the items
                        Ext.Ajax.request({
                            url: 'http://localhost:5000/api/files/move',
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            jsonData: moveData,
                            success: function(response) {
                                // Refresh the grid after successful move
                                const grid = Ext.ComponentQuery.query('filegrid')[0];
                                if (grid && grid.getStore()) {
                                    grid.getStore().reload();
                                }
                                resolve(response);
                            },
                            failure: function(response) {
                                reject('Move operation failed: ' + response.statusText);
                            }
                        });
                    }
                });
            });
        });
    }
});
