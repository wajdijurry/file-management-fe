Ext.define('FileManagement.components.forms.FileUploadForm', {
    extend: 'Ext.form.Panel',
    xtype: 'fileuploadform',
    title: 'Upload Files',
    bodyPadding: 10,
    frame: true,
    closable: true,

    titleAlign: 'left',
    width: 400,
    height: 300,
    x: 100,
    y: 100,

    draggable: {
        onMouseUp: function(e, panel) {
            FileManagement.components.utils.PanelUtils.onMouseUp(panel ?? this.panel);
        },
        onDrag: function(e, panel) {
            FileManagement.components.utils.PanelUtils.onDrag(panel ?? this.panel);
        }
    },

    resizable: {
        constrain: true, // Enable constraint within a specified element
        dynamic: true, // Updates size dynamically as resizing
        minHeight: 300,
        minWidth: 450,
    },

    listeners: {
        afterrender: function(form) {
            form.initDragAndDropZone();
        },
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
        destroy: function(form) {
            FileManagement.components.utils.PanelUtils.destroy(this);
        },
    },

    items: [
        {
            xtype: 'container',
            itemId: 'dropZone',
            cls: 'drag-drop-zone',
            html: '<div class="drop-zone-text">Drop files here to upload</div>',
            height: 150,
            anchor: '100%',
            border: true,
            bodyPadding: 10
        },
        {
            xtype: 'fieldcontainer',
            layout: 'hbox',
            margin: '20 0',
            items: [
                {
                    xtype: 'filefield',
                    name: 'file',
                    fieldLabel: 'Files',
                    labelWidth: 50,
                    flex: 1,
                    buttonText: 'Select Files...',
                    margin: '0 10 0 0',
                    multiple: true,
                    listeners: {
                        afterrender: function (filefield) {
                            // Set the file input to accept multiple files
                            filefield.fileInputEl.dom.setAttribute('multiple', 'multiple');
                        }
                    }
                }
            ]
        }
        // {
        //     xtype: 'filefield',
        //     name: 'file',
        //     fieldLabel: 'Files',
        //     labelWidth: 50,
        //     msgTarget: 'side',
        //     allowBlank: false,
        //     buttonText: 'Select Files...',
        //     multiple: true,
        //     listeners: {
        //         afterrender: function (filefield) {
        //             // Set the file input to accept multiple files
        //             filefield.fileInputEl.dom.setAttribute('multiple', 'multiple');
        //         }
        //     }
        // }
    ],

    buttons: [
        {
            text: 'Upload',
            handler: function (btn) {
                const form = btn.up('form');
                const basicForm = form.getForm();
                if (!basicForm.isValid()) return;

                const fileField = basicForm.findField('file');
                const files = fileField.fileInputEl.dom.files;

                form.uploadFiles(files);

                try {
                    basicForm.reset();
                    form.destroy();
                } catch (err) {
                    // do nothing, as the form might be closed
                }
            }
        }
    ],

    uploadFiles: async function (files) {
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
                await this.uploadFileInChunks(file, progressId, CHUNK_SIZE, abortController.signal);
                FileManagement.components.utils.ProgressBarManager.updateQueuedStatus(progressId, file.name, 'Uploaded');
            } catch (error) {
                console.log(error);
                if (error.name === 'AbortError') {
                    console.log(`Upload for ${file.name} canceled.`);
                    FileManagement.components.utils.ProgressBarManager.updateProgress(progressId, 0, 'Upload Canceled');
                } else {
                    console.error('Error during upload:', error);
                }
                failedFiles.push(file.name);
                FileManagement.components.utils.ProgressBarManager.updateQueuedStatus(progressId, file.name, 'Failed');
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
    },

    uploadFileInChunks: async function (file, progressId, chunkSize, abortSignal) {
        let start = 0;
        const totalChunks = Math.ceil(file.size / chunkSize);
        const token = FileManagement.helpers.Functions.getToken();
        const fileGrid = Ext.ComponentQuery.query('filegrid')[0];

        // Query server for already uploaded chunks
        const response = await fetch(`http://localhost:5000/api/files/upload/status?filename=${encodeURIComponent(file.name)}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const uploadedChunks = await response.json();
            if (uploadedChunks && uploadedChunks.length) {
                console.log(`Resuming upload for ${file.name} from chunk ${uploadedChunks.length + 1}`);
                start = uploadedChunks.length * chunkSize; // Skip already uploaded chunks
            }
        }

        while (start < file.size) {
            const end = Math.min(start + chunkSize, file.size);
            const chunk = file.slice(start, end);

            const formData = new FormData();
            formData.append('folderId', fileGrid.currentFolderId || ''); // Set folder in FormData
            formData.append('chunk', chunk);
            formData.append('filename', file.name);
            formData.append('currentChunk', Math.floor(start / chunkSize) + 1);
            formData.append('totalChunks', totalChunks);

            const uploadResponse = await fetch('http://localhost:5000/api/files/upload', {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${token}` // Add token to headers
                },
                signal: abortSignal // Attach AbortController signal
            });

            if (!uploadResponse.ok) {
                throw new Error(`Failed to upload chunk ${start} - ${end}`);
            }

            start = end;
            const progress = Math.round((start / file.size) * 100);
            FileManagement.components.utils.ProgressBarManager.updateProgress(progressId, progress, `Uploading ${file.name} (${progress}%)`);
        }
    },

    initDragAndDropZone: function() {
        const dropZone = this.down('#dropZone').getEl().dom;

        // Drag & Drop Event Handlers
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', async (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');

            const files = e.dataTransfer.files;
            if (files.length) {
                await this.uploadFiles(files);
            }
        });
    },
});