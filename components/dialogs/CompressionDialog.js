Ext.define('FileManagement.components.dialogs.CompressionDialog', {
    extend: 'Ext.window.Window',
    xtype: 'compressiondialog',

    title: 'Compression Settings',
    modal: true,
    width: 400,
    layout: 'form',
    padding: 10,
    closeAction: 'destroy',

    config: {
        selections: null,
        currentFolderId: null,
        currentFolder: null,
        onSuccess: null
    },

    initComponent: function() {
        this.callParent(arguments);

        // Get socket instance from SocketManager
        const socket = FileManagement.components.utils.SocketManager.socket;

        if (!socket) {
            console.error('Socket connection not initialized');
            return;
        }

        socket.on('connect', () => {
            console.log('Socket connected for compression updates');
        });

        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });

        socket.on('compressionProgress', (data) => {
            FileManagement.components.utils.ProgressBarManager.updateProgress(
                data.progressId,
                data.progress,
                `Compressing to ${data.fileName}...`
            );
        });

        socket.on('compressionComplete', (data) => {
            FileManagement.components.utils.ProgressBarManager.removeProgressBar(data.progressId);
            
            // Refresh the file grid
            const fileGrid = Ext.ComponentQuery.query('filegrid')[0];
            if (fileGrid && fileGrid.getStore()) {
                fileGrid.getStore().reload();
            }

            if (typeof this.onSuccess === 'function') {
                this.onSuccess();
            }
        });

        socket.on('compressionError', (data) => {
            FileManagement.components.utils.ProgressBarManager.removeProgressBar(data.progressId);
            Ext.Msg.alert('Compression Error', `Failed to compress files: ${data.error}`);
        });
    },

    items: [{
        xtype: 'textfield',
        fieldLabel: 'Archive Name',
        name: 'archiveName',
        allowBlank: false,
        width: '100%'
    }, {
        xtype: 'combobox',
        fieldLabel: 'Archive Type',
        name: 'archiveType',
        store: [
            ['7z', '7-Zip (.7z) - Best compression'],
            ['zip', 'ZIP (.zip) - Universal compatibility'],
            ['tgz', 'TGZ (.tar.gz) - Unix/Linux compatible']
        ],
        value: '7z',
        editable: false,
        width: '100%',
        listeners: {
            change: function(combo, newValue) {
                const nameField = combo.up('window').down('[name=archiveName]');
                const currentName = nameField.getValue();
                const baseName = currentName.substring(0, currentName.lastIndexOf('.')) || currentName;
                const ext = {
                    '7z': '.7z',
                    'zip': '.zip',
                    'tgz': '.tar.gz'
                }[newValue] || '.7z';
                nameField.setValue(baseName + ext);
            }
        }
    }, {
        xtype: 'slider',
        fieldLabel: 'Compression Level',
        name: 'compressionLevel',
        width: '100%',
        value: 6,
        minValue: 1,
        maxValue: 9,
        increment: 1,
        tipText: function(thumb) {
            var levels = {
                1: 'Fastest (1)',
                2: 'Fast (2)',
                3: 'Fast (3)',
                4: 'Normal (4)',
                5: 'Normal (5)',
                6: 'Normal (6 - Default)',
                7: 'Maximum (7)',
                8: 'Maximum (8)',
                9: 'Ultra (9 - Slowest)'
            };
            return levels[thumb.value] || thumb.value;
        }
    }],

    buttons: [{
        text: 'Cancel',
        handler: function(btn) {
            btn.up('window').close();
        }
    }, {
        text: 'Compress',
        handler: function(btn) {
            const win = this.up('window');
            const values = {
                archiveName: win.down('[name=archiveName]').getValue(),
                archiveType: win.down('[name=archiveType]').getValue(),
                compressionLevel: win.down('[name=compressionLevel]').getValue()
            };

            if (!values.archiveName) {
                Ext.Msg.alert('Error', 'Please enter an archive name.');
                return;
            }

            const token = FileManagement.helpers.Functions.getToken();
            const fileName = values.archiveName.endsWith('.' + values.archiveType) 
                ? values.archiveName 
                : `${values.archiveName}.${values.archiveType}`;
            const selectedItems = win.selections.map(record => record.get('id'));

            // Generate unique progress ID using timestamp and random number
            const progressId = `compression-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            // Add progress bar for compression
            FileManagement.components.utils.ProgressBarManager.addProgressBar(
                progressId, 
                `Compressing to ${fileName}...`, 
                win.selections.map(record => ({ 
                    fileName: record.get('name'), 
                    status: 'Queued' 
                })),
                null,  // No cancel callback needed
                false
            );

            if (selectedItems.length === 0) {
                Ext.Msg.alert('Error', 'No items selected for compression.');
                return;
            }

            // Close the dialog immediately after submitting
            win.close();

            fetch('http://localhost:5000/api/files/compress', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    items: selectedItems,
                    folder: win.currentFolder,
                    parentId: win.currentFolderId,
                    zipFileName: fileName,
                    archiveType: values.archiveType,
                    compressionLevel: values.compressionLevel,
                    progressId: progressId // Pass the progress ID to backend
                })
            })
            .then(response => response.json())
            .then(result => {
                if (!result.success) {
                    throw new Error(result.error || 'Failed to start compression');
                }
            })
            .catch(error => {
                FileManagement.components.utils.ProgressBarManager.removeProgressBar(progressId);
                Ext.Msg.alert('Compression Error', `Failed to start compression: ${error.message}`);
            });
        }
    }],
});
