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
            minHeight: 50,
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
    },

    createProgressButton: function() {
        if (this.progressButton) {
            return this.progressButton;
        }

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

    addProgressBar: function(id, files) {
        if (this.progressBars[id]) {
            console.warn(`Progress bar with ID "${id}" already exists.`);
            return;
        }

        // Add files to queue store
        const newFiles = files.map(file => ({
            fileName: file.name,
            status: 'queued',
            progressId: id
        }));
        if (newFiles.length > 0) {
            this.fileQueueStore.add(newFiles);
        }

        const progressContainer = {
            xtype: 'container',
            layout: 'hbox',
            margin: '0 0 4 0',
            items: [{
                xtype: 'progressbar',
                text: files[0].name + ' (0%)',
                flex: 1,
                value: 0
            }, {
                xtype: 'button',
                iconCls: 'fa fa-ban',
                margin: '0 0 0 5',
                handler: function() {
                    FileManagement.components.utils.SocketManager.cancelOperation(id);
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

    updateQueuedStatus: function(id, fileName, status) {
        // Update status in the shared store
        const record = this.fileQueueStore.findRecord('fileName', fileName);
        if (record) {
            record.set('status', status);
            this.fileQueueStore.commitChanges();
        }
    },

    updateProgress: function(id, progress, text) {
        let progressBar = this.progressBars[id];
        if (!progressBar) {
            console.warn(`Progress bar with ID "${id}" does not exist.`);
            return;
        }

        const progressBarComponent = progressBar.container.down('progressbar');
        const percentage = Math.round(progress);
        progressBar.progress = progress;
        progressBar.text = text;
        
        progressBarComponent.updateProgress(
            progress / 100, 
            text ? `${text} (${percentage}%)` : `${percentage}%`,
            true
        );

        // Update circular progress if this is the active operation
        if (id === this.activeOperationId) {
            this.updateCircularProgress(percentage);
        }

        if (progress >= 100) {
            this.removeProgressBar(id);
        }
    },

    updateCircularProgress: function(percentage) {
        if (this.progressButton) {
            const progressEl = this.progressButton.el.down('.circular-progress');
            if (progressEl) {
                // Update the progress text
                progressEl.update(`<span class="percentage">${percentage}%</span>`);
                
                // Update the CSS variable for the conic gradient
                const degrees = (percentage / 100) * 360;
                progressEl.dom.style.setProperty('--progress', `${degrees}deg`);
            }
        }
    }
});
