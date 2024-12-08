Ext.define('FileManagement.components.utils.ProgressBarManager', {
    singleton: true,

    progressBars: {},
    queueWindow: null,
    fileQueueStore: null,
    operationsPopover: null,
    progressButton: null,
    activeOperationId: null,

    constructor: function() {
        this.callParent(arguments);
        
        // Create a shared store for all progress bars
        this.fileQueueStore = Ext.create('Ext.data.Store', {
            fields: ['fileName', 'status', 'progressId'],
            data: []
        });
    },

    init: function() {
        // Initialize file queue store
        this.fileQueueStore = Ext.create('Ext.data.Store', {
            fields: ['fileName', 'status', 'progressId'],
            data: []
        });

        // Create operations popover
        this.operationsPopover = Ext.create('Ext.panel.Panel', {
            floating: true,
            hidden: true,
            shadow: true,
            width: 400,
            maxHeight: 300,
            minHeight: 30,
            autoScroll: true,
            cls: 'operations-popover',
            layout: {
                type: 'vbox',
                align: 'stretch'
            },
            style: {
                zIndex: 999999 // Ensure popover stays on top
            },
            bodyStyle: {
                background: '#fff',
                padding: '5px'
            },
            items: [],
            listeners: {
                hide: function() {
                    const btn = FileManagement.components.utils.ProgressBarManager.progressButton;
                    if (btn) {
                        btn.removeCls('active');
                    }
                }
            }
        });

        // Create progress button
        const userToolbar = Ext.getCmp('userToolbar');
        this.progressButton = userToolbar.down('#progressBar').add({
            xtype: 'button',
            itemId: 'operationsButton',
            hidden: true,
            html: '<div class="circular-progress"><span class="percentage">0%</span></div>',
            handler: function(btn) {
                const popover = FileManagement.components.utils.ProgressBarManager.operationsPopover;
                if (popover.isVisible()) {
                    popover.hide();
                    btn.removeCls('active');
                } else {
                    btn.addCls('active');
                    popover.showBy(btn, 'tl-bl?', [0, -5]);
                }
            }
        });

        return this.progressButton;
    },

    addProgressBar: function(id, text, files = [], cancelCallback = null) {
        if (this.progressBars[id]) {
            console.warn(`Progress bar with ID "${id}" already exists.`);
            return;
        }

        // Create popover if it doesn't exist
        if (!this.operationsPopover) {
            this.init();
        }

        // Add files to queue store
        if (files && files.length > 0) {
            const newFiles = files.map(file => ({
                fileName: file.name,
                status: 'queued',
                progressId: id
            }));
            this.fileQueueStore.add(newFiles);
        }

        const progressContainer = {
            xtype: 'container',
            layout: 'hbox',
            margin: '0 0 4 0',
            items: [{
                xtype: 'progressbar',
                text: text + ' (0%)',
                flex: 1,
                value: 0
            }, {
                xtype: 'button',
                iconCls: 'fa fa-ban',
                margin: '0 0 0 5',
                handler: function() {
                    // Extract the actual job ID from the progress bar ID
                    // Progress bar ID format: "compression-[timestamp]-[random]"
                    if (id.startsWith('compression-')) {
                        // Cancel via socket
                        FileManagement.components.utils.SocketManager.cancelOperation(id);
                        
                        // Also cancel via API
                        Ext.Ajax.request({
                            url: 'http://localhost:5000/api/files/stop-compression',
                            method: 'POST',
                            jsonData: { jobId: id },
                            success: function(response) {
                                const result = Ext.decode(response.responseText);
                                console.log('Compression cancelled via API:', result);
                            },
                            failure: function(response) {
                                console.error('Failed to cancel compression via API:', response);
                            }
                        });
                    } else {
                        console.warn('Not a compression job:', id);
                    }
                }
            }]
        };

        // Add to popover
        const popoverItem = this.operationsPopover.add(progressContainer);

        this.progressBars[id] = {
            container: popoverItem,
            files: files,
            progress: 0
        };

        // Show progress button if hidden
        if (this.progressButton.isHidden()) {
            this.progressButton.show();
        }

        return popoverItem;
    },

    removeProgressBar: function(id) {
        const progressBar = this.progressBars[id];

        if (!progressBar) {
            console.warn(`Progress bar with ID "${id}" does not exist.`);
            return;
        }

        // Remove files from queue store
        const filesToRemove = this.fileQueueStore.queryBy(record => record.get('progressId') === id);
        if (filesToRemove.length > 0) {
            this.fileQueueStore.remove(filesToRemove.items);
        }

        // Remove from popover
        this.operationsPopover.remove(progressBar.container, true);
        delete this.progressBars[id];

        // Hide progress button if no more progress bars
        if (Object.keys(this.progressBars).length === 0) {
            this.progressButton.hide();
            this.operationsPopover.hide();
        }
    },

    cancelRelatedProgressBars: function(files) {
        const progressBarsToRemove = [];
        
        // Find all progress bars that contain any of the files
        Object.entries(this.progressBars).forEach(([id, progressBar]) => {
            if (progressBar.files && progressBar.files.some(file => 
                files.some(f => f.name === file.name))) {
                progressBarsToRemove.push(id);
            }
        });

        // Remove all related progress bars
        progressBarsToRemove.forEach(id => this.removeProgressBar(id));
    },

    updateQueuedStatus: function(id, fileName, status) {
        // Update status in the shared store
        const record = this.fileQueueStore.findRecord('fileName', fileName);
        if (record) {
            record.set('status', status);
            this.fileQueueStore.commitChanges();
        }
    },

    updateProgress: function(id, progress) {
        const progressBar = this.progressBars[id];
        if (!progressBar) {
            console.warn(`Progress bar with ID "${id}" does not exist.`);
            return;
        }

        // Update progress bar
        const progressComponent = progressBar.container.items.getAt(0);
        if (progressComponent) {
            progressComponent.updateProgress(
                progress / 100,
                progressComponent.text.replace(/\(\d+%\)/, `(${Math.round(progress)}%)`)
            );
        }

        // Update circular progress in button
        const circularProgress = this.progressButton.el.down('.circular-progress');
        if (circularProgress) {
            circularProgress.setStyle({
                background: `conic-gradient(#4169E1 ${progress * 3.6}deg, #E8EBF4 0deg)`
            });
            const percentageEl = circularProgress.down('.percentage');
            if (percentageEl) {
                percentageEl.setHtml(`${Math.round(progress)}%`);
            }
        }

        // Store progress
        progressBar.progress = progress;
    }
});
