Ext.define('FileManagement.components.utils.ProgressBarManager', {
    singleton: true,

    progressBars: {},

    addProgressBar: function (id, text, files = [], cancelCallback = null, showQueueButton = true) {
        const userToolbar = Ext.getCmp('userToolbar');
        if (this.progressBars[id]) {
            console.warn(`Progress bar with ID "${id}" already exists.`);
            return;
        }

        // Explicitly create a store with the provided files
        const fileQueueStore = Ext.create('Ext.data.Store', {
            fields: ['fileName', 'status'], // Define fields explicitly
            data: files // Populate the store with initial data
        });

        const createQueueWindow = () => {
            return Ext.create('Ext.window.Window', {
                title: 'File Queue',
                layout: 'fit',
                width: 400,
                height: 300,
                closeAction: 'destroy', // Ensure the window is destroyed on close
                items: [
                    Ext.create('Ext.grid.Panel', {
                        store: fileQueueStore,
                        columns: [
                            { text: 'File Name', dataIndex: 'fileName', flex: 1 },
                            {
                                text: 'Status',
                                dataIndex: 'status',
                                width: 150,
                                renderer: function (value) {
                                    let iconHtml = '';
                                    if (value === 'Uploaded') {
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
                    close: function () {
                        const queueButton = progressBarContainer.items.items[0];
                        queueButton.toggle(false); // Reset the toggle state of the button when the window is closed
                    }
                }
            });
        };

        let queueWindow = createQueueWindow(); // Reference to the queue window

        // Add the progress bar to the toolbar
        const progressBarContainer = userToolbar.add({
            xtype: 'container',
            layout: 'hbox',
            items: [
                {
                    xtype: 'button',
                    text: 'Queue',
                    margin: '0 5 0 5',
                    iconCls: 'fa fa-clock',
                    hidden: !showQueueButton,
                    enableToggle: true, // Enable toggle behavior
                    toggleGroup: `${id}-queueGroup`, // Unique toggle group for this progress bar
                    toggleHandler: function (button, pressed) {
                        if (pressed) {
                            if (!queueWindow) {
                                queueWindow = createQueueWindow();
                            }
                            queueWindow.show();
                        } else if (queueWindow) {
                            queueWindow.destroy(); // Destroy the window on toggle off
                            queueWindow = null; // Clear reference to avoid reuse of destroyed window
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
                                cancelCallback(id); // Call the cancel callback to interrupt the operation
                            }
                            if (queueWindow) {
                                queueWindow.destroy();
                                queueWindow = null; // Clear reference
                            }
                            FileManagement.components.utils.ProgressBarManager.removeProgressBar(id); // Remove the progress bar
                        }
                    }
                },
                {
                    xtype: 'progressbar',
                    itemId: id,
                    text: this.getTruncatedTextWithProgress(text || '', 0, 300), // Apply truncated text
                    hidden: false,
                    flex: 1, // Allow dynamic resizing
                    width: 300,
                    maxWidth: 450, // Set maximum width
                    cls: 'ellipsis', // Add custom CSS class
                    listeners: {
                        boxready: function (progressbar) {
                            progressbar.updateLayout(); // Ensure proper layout rendering
                        }
                    }
                }
            ]
        });

        // Store references to the progress bar and store
        this.progressBars[id] = {
            component: progressBarContainer,
            progressBar: progressBarContainer.items.items[2], // Correct progress bar reference
            store: fileQueueStore, // Store reference
            queueWindow: queueWindow // Store the window reference for cleanup
        };
    },

    /**
     * Update the progress of an existing progress bar.
     * @param {String} id - Unique ID of the progress bar.
     * @param {Number} progress - Progress value (0 to 100).
     * @param {String} text - Optional text to update the progress bar.
     */
    updateProgress: function(id, progress, text) {
        let progressBar = this.progressBars[id];
        if (!progressBar) {
            console.warn(`Progress bar with ID "${id}" does not exist.`);
            return;
        }

        progressBar = progressBar.progressBar;

        progressBar.show();
        progressBar.updateProgress(progress / 100, text || `${progress}%`);

        if (progress >= 100) {
            progressBar.hide();
        }
    },

    /**
     * Remove a progress bar from the UserToolbar.
     * @param {String} id - Unique ID of the progress bar to remove.
     */
    removeProgressBar: function (id) {
        const progressBarData = this.progressBars[id];
        if (!progressBarData) {
            console.warn(`Progress bar with ID "${id}" does not exist.`);
            return;
        }

        // Destroy the associated queue window if it exists
        if (progressBarData.queueWindow) {
            progressBarData.queueWindow.destroy();
            console.log(`Destroyed queue window for ID: ${id}`);
        }

        if (progressBarData.component) {
            progressBarData.component.destroy();
        }

        // Destroy the progress bar
        const progressBar = progressBarData.progressBar;
        if (progressBar) {
            progressBar.destroy();
            console.log(`Destroyed progress bar for ID: ${id}`);
        }

        // Remove the reference from the manager
        delete this.progressBars[id];
        console.log(`Removed progress bar with ID: ${id}`);
    },

    updateFileStatus: function (id, fileName, status) {
        const progressBarData = this.progressBars[id];
        if (!progressBarData) {
            console.warn(`Progress bar with ID "${id}" does not exist.`);
            console.log('Available IDs:', Object.keys(this.progressBars)); // Debug log
            return;
        }

        const store = progressBarData.store; // Use the store reference from progressBars
        if (!store) {
            console.warn(`Store for progress bar with ID "${id}" does not exist.`);
            return;
        }

        const record = store.findRecord('fileName', fileName);
        if (record) {
            record.set('status', status);
            record.commit();
        } else {
            console.warn(`File "${fileName}" not found in the store.`);
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
