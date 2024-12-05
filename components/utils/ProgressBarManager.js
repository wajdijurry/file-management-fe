Ext.define('FileManagement.components.utils.ProgressBarManager', {
    singleton: true,

    progressBars: {},
    queueWindow: null,
    fileQueueStore: null,

    constructor: function() {
        this.callParent(arguments);
        
        // Create a shared store for all progress bars
        this.fileQueueStore = Ext.create('Ext.data.Store', {
            fields: ['fileName', 'status', 'progressId'],
            data: []
        });
    },

    createQueueWindow: function() {
        if (this.queueWindow) {
            return this.queueWindow;
        }

        this.queueWindow = Ext.create('Ext.window.Window', {
            title: 'File Queue',
            layout: 'fit',
            width: 400,
            height: 300,
            closeAction: 'hide', // Hide instead of destroy
            items: [
                Ext.create('Ext.grid.Panel', {
                    store: this.fileQueueStore,
                    columns: [
                        { text: 'File Name', dataIndex: 'fileName', flex: 1 },
                        {
                            text: 'Status',
                            dataIndex: 'status',
                            width: 150,
                            renderer: function (value) {
                                let iconHtml = '';
                                if (value === 'Uploaded' || value === 'Moved' || value === 'Downloaded') {
                                    iconHtml = '<span style="color:green; margin-right:5px;" class="fa fa-check-circle"></span>';
                                } else if (value === 'Failed') {
                                    iconHtml = '<span style="color:red; margin-right:5px;" class="fa fa-times-circle"></span>';
                                } else if (value === 'Queued') {
                                    iconHtml = '<span style="color:blue; margin-right:5px;" class="fa fa-clock"></span>';
                                }
                                return `${iconHtml}${value}`;
                            }
                        }
                    ]
                })
            ],
            listeners: {
                hide: function () {
                    // Reset toggle state of all queue buttons when window is hidden
                    Ext.ComponentQuery.query('button[toggleGroup^=progress-]').forEach(button => {
                        button.toggle(false);
                    });
                }
            }
        });

        return this.queueWindow;
    },

    addProgressBar: function (id, text, files = [], cancelCallback = null, showQueueButton = true) {
        const userToolbar = Ext.getCmp('userToolbar');
        if (this.progressBars[id]) {
            console.warn(`Progress bar with ID "${id}" already exists.`);
            return;
        }

        // Add files to the shared store with their progress ID
        if (files && files.length > 0) {
            const newFiles = files.map(file => ({
                ...file,
                progressId: id
            }));
            this.fileQueueStore.add(newFiles);
        }

        // Create or get the queue window
        const queueWindow = this.createQueueWindow();

        // Add the progress bar to the toolbar
        const progressBarContainer = userToolbar.down('#progressBar').add({
            xtype: 'container',
            layout: 'hbox',
            items: [
                {
                    xtype: 'button',
                    text: 'Queue',
                    margin: '0 5 0 5',
                    iconCls: 'fa fa-clock',
                    hidden: !showQueueButton,
                    enableToggle: true,
                    toggleGroup: `progress-${id}`,
                    toggleHandler: function (button, pressed) {
                        if (pressed) {
                            queueWindow.show();
                        }
                    }
                },
                {
                    xtype: 'button',
                    text: 'Cancel',
                    margin: '0 5 0 5',
                    iconCls: 'fa fa-ban',
                    listeners: {
                        click: function () {
                            console.log('Cancel button pressed');
                            if (typeof cancelCallback === 'function') {
                                cancelCallback(id);
                            }
                            FileManagement.components.utils.ProgressBarManager.removeProgressBar(id);
                        }
                    }
                },
                {
                    xtype: 'progressbar',
                    text: text,
                    width: 300,
                    value: 0,
                    margin: '0 5 0 5'
                }
            ]
        });

        this.progressBars[id] = {
            container: progressBarContainer,
            files: files
        };
    },

    updateQueuedStatus: function(id, fileName, status) {
        // Update status in the shared store
        const record = this.fileQueueStore.findRecord('fileName', fileName);
        if (record) {
            record.set('status', status);
            this.fileQueueStore.commitChanges();
        }
    },

    removeProgressBar: function(id) {
        const progressBar = this.progressBars[id];
        if (progressBar) {
            // Remove files for this progress bar from the store
            const filesToRemove = this.fileQueueStore.queryBy(record => record.get('progressId') === id);
            this.fileQueueStore.remove(filesToRemove.items);

            // Remove the progress bar UI
            const userToolbar = Ext.getCmp('userToolbar');
            if (userToolbar) {
                const progressBarContainer = userToolbar.down('#progressBar');
                if (progressBarContainer) {
                    progressBarContainer.remove(progressBar.container, true);
                }
            }
            delete this.progressBars[id];
        }
    },

    updateProgress: function(id, progress, text) {
        let progressBar = this.progressBars[id];
        if (!progressBar) {
            console.warn(`Progress bar with ID "${id}" does not exist.`);
            return;
        }

        const progressBarComponent = progressBar.container.down('progressbar');
        progressBarComponent.show();
        progressBarComponent.updateProgress(progress / 100, text || `${progress}%`);

        if (progress >= 100) {
            progressBarComponent.hide();
        }
    },

    getTruncatedTextWithProgress: function (text, progress, maxWidth) {
        // Use a canvas to measure text width and truncate as necessary
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = '12px Arial'; // Match the font used in the progress bar
        let truncatedText = `${text} (${progress}%)`;

        while (context.measureText(truncatedText).width > maxWidth) {
            truncatedText = truncatedText.slice(0, -5) + '... (' + progress + '%)';
        }

        return truncatedText;
    }
});
