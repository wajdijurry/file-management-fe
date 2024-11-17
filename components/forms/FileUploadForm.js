Ext.define('FileManagement.components.forms.FileUploadForm', {
    extend: 'Ext.form.Panel',
    xtype: 'fileuploadform',
    title: 'Upload Files',
    bodyPadding: 10,
    frame: true,
    draggable: true,
    closable: true,

    titleAlign: 'left',
    width: 300,
    height: 100,

    listeners: {
        click: {
            element: 'el', // could be 'body', or any other Ext.Elements
                           // that are available from the component
            fn: function() {
                window.highestZIndex += 1;
                this.setStyle('z-index', window.highestZIndex);
            }
        },
        show: function() {
            FileManagement.components.utils.PanelUtils.show(this);
        },
        hide: function() {
            FileManagement.components.utils.PanelUtils.hide(this);
        },
        destroy: function() {
            FileManagement.components.utils.PanelUtils.destroy(this);
        }
    },

    items: [
        {
            xtype: 'filefield',
            name: 'file',
            fieldLabel: 'Files',
            labelWidth: 50,
            msgTarget: 'side',
            allowBlank: false,
            buttonText: 'Select Files...',
            multiple: true,
            listeners: {
                render: function (filefield) {
                    filefield.fileInputEl.dom.setAttribute('multiple', 'multiple'); // Set the file input to accept multiple files
                }
            }
        }
    ],

    buttons: [
        {
            text: 'Upload',
            handler: async function (btn) {
                const form = btn.up('form').getForm();
                if (!form.isValid()) return;

                const fileField = form.findField('file');
                const files = fileField.fileInputEl.dom.files;
                if (!files.length) return;

                const CHUNK_SIZE = 1024 * 1024; // 1MB per chunk

                // const progressIds = [];
                const failedFiles = [];

                const fileGrid = Ext.ComponentQuery.query('filegrid')[0];

                const fileQueueData = Array.from(files).map(file => ({
                    fileName: file.name,
                    status: 'Queued'
                }));

                const progressId = `upload-progress-${Date.now()}`;
                const abortController = new AbortController();

                FileManagement.components.utils.ProgressBarManager.addProgressBar(progressId, 'Uploading Files...', fileQueueData, function () {
                    abortController.abort(); // Abort ongoing requests
                });

                for (let file of files) {
                    try {
                        await btn.up('form').uploadFileInChunks(file, progressId, CHUNK_SIZE, abortController.signal);
                        FileManagement.components.utils.ProgressBarManager.updateFileStatus(progressId, file.name, 'Uploaded');
                    } catch (error) {
                        console.log(error);
                        if (error.name === 'AbortError') {
                            console.log(`Upload for ${file.name} canceled.`);
                            FileManagement.components.utils.ProgressBarManager.updateProgress(progressId, 0, 'Upload Canceled');
                        } else {
                            console.error('Error during upload:', error);
                        }
                        failedFiles.push(file.name);
                        FileManagement.components.utils.ProgressBarManager.updateFileStatus(progressId, file.name, 'Failed');
                        Ext.Msg.alert('Error', `Failed to upload file: ${file.name}`);
                        break; // Stop processing on failure
                    }
                }

                // Remove the progress bar after uploads are complete
                FileManagement.components.utils.ProgressBarManager.removeProgressBar(progressId);

                // Notify user
                if (failedFiles.length) {
                    Ext.Msg.alert('Error', `Some files failed to upload: ${failedFiles.join(', ')}`);
                } else {
                    Ext.Msg.alert('Success', 'All files uploaded successfully!');
                    fileGrid.getStore().reload();
                }

                form.reset();
            }
        }
    ],

    uploadFileInChunks: async function (file, progressId, chunkSize, abortSignal) {
        let start = 0;
        const totalChunks = Math.ceil(file.size / chunkSize);
        const token = FileManagement.helpers.Functions.getToken();
        const fileGrid = Ext.ComponentQuery.query('filegrid')[0];

        while (start < file.size) {
            const end = Math.min(start + chunkSize, file.size);
            const chunk = file.slice(start, end);

            const formData = new FormData();
            formData.append('folderId', fileGrid.currentFolderId || ''); // Set folder in FormData
            formData.append('chunk', chunk);
            formData.append('filename', file.name);
            formData.append('currentChunk', Math.floor(start / chunkSize) + 1);
            formData.append('totalChunks', totalChunks);

            const response = await fetch('http://localhost:5000/api/files/upload', {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${token}` // Add token to headers
                },
                signal: abortSignal // Attach AbortController signal
            });

            if (!response.ok) {
                throw new Error(`Failed to upload chunk ${start} - ${end}`);
            }

            start = end;
            const progress = Math.round((start / file.size) * 100);
            FileManagement.components.utils.ProgressBarManager.updateProgress(progressId, progress, `Uploading ${file.name} (${progress}%)`);
        }
    }
});