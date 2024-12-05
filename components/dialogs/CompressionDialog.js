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
            ['zip', 'ZIP (.zip)'],
            ['7z', '7-Zip (.7z)']
        ],
        value: 'zip',
        editable: false,
        width: '100%'
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
            const win = btn.up('window');
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
            const selectedItems = win.selections.map(record => ({
                id: record.get('id'),
                type: record.get('isFolder') ? 'folder' : 'file',
                name: record.get('name')
            }));

            const abortController = new AbortController();
            const signal = abortController.signal;

            // Add progress bar for compression
            FileManagement.components.utils.ProgressBarManager.addProgressBar(
                'compression', 
                `Compressing to ${fileName}...`, 
                selectedItems.map(item => ({ fileName: item.name, status: 'Queued' })),
                function () {
                    abortController.abort();
                    fetch('http://localhost:5000/api/files/stop-compression', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            zipFileName: fileName,
                            folder: win.currentFolder,
                            parentId: win.currentFolderId
                        })
                    }).catch(() => {
                        Ext.Msg.alert('Error', 'Failed to cancel compression on the server.');
                    });
                }, 
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
                    items: selectedItems.map(item => item.id),
                    folder: win.currentFolder,
                    parentId: win.currentFolderId,
                    zipFileName: fileName,
                    archiveType: values.archiveType,
                    compressionLevel: values.compressionLevel
                }),
                signal
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    if (typeof win.onSuccess === 'function') {
                        console.log('vxcvcv');
                        win.onSuccess();
                    }
                } else {
                    throw new Error(result.error || 'Compression failed');
                }
            })
            .catch(error => {
                if (error.name === 'AbortError') {
                    Ext.Msg.alert('Compression Cancelled', 'The compression operation was cancelled.');
                } else {
                    Ext.Msg.alert('Compression Error', `Failed to compress files: ${error.message}`);
                }
            });
        }
    }],
});
