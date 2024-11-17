Ext.define('FileManagement.components.utils.ProgressBarManager', {
    singleton: true,

    progressBars: {},

    addProgressBar: function (id, text, files, cancelCallback, showQueueButton = true) {
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

        // Create the grid immediately
        const fileQueueGrid = Ext.create('Ext.grid.Panel', {
            itemId: `${id}-grid`,
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
                            iconHtml = '<span style="color:blue; margin-right:5px;" class="fa fa-duotone fa-solid fa-clock"></span>';
                        }
                        return `${iconHtml}${value}`;
                    }
                }
            ],
            width: 400,
            height: 300 // Explicit dimensions to avoid layout issues
        });

        // Store references to the progress bar, grid, and store
        const progressBarContainer = userToolbar.add({
            xtype: 'container',
            layout: 'hbox',
            items: [
                {
                    xtype: 'button',
                    text: 'Queue',
                    margin: '0 0 0 10',
                    hidden: !showQueueButton,
                    handler: function () {
                        if (!fileQueueGrid.isVisible()) {
                            const gridWindow = Ext.create('Ext.window.Window', {
                                title: 'File Queue',
                                layout: 'fit',
                                items: [fileQueueGrid] // Attach the existing grid
                            });
                            gridWindow.show();
                        }
                    }
                },
                {
                    xtype: 'button',
                    text: 'Cancel',
                    margin: '0 0 0 10',
                    listeners: {
                        click: function () {
                            console.log('Cancel button pressed');
                            if (typeof cancelCallback === 'function') {
                                console.log('Cancelled');
                                cancelCallback(id); // Call the cancel callback to interrupt the operation
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
                    maxWidth: 400, // Set maximum width
                    cls: 'ellipsis-progress', // Add custom CSS class
                    listeners: {
                        boxready: function (progressbar) {
                            progressbar.updateLayout(); // Ensure proper layout rendering
                        }
                    }
                }
            ]
        });

        this.progressBars[id] = {
            progressBar: progressBarContainer.items.items[2], // Progress bar reference
            grid: fileQueueGrid, // Grid reference
            store: fileQueueStore, // Store reference,
            cancelCallback
        };

        console.log(`Added progress bar with ID: ${id}`, this.progressBars); // Debug log
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

        // Destroy the progress bar container
        if (progressBarData.progressBar) {
            progressBarData.progressBar.up('container').destroy();
        }

        // Destroy the associated grid (if it exists)
        if (progressBarData.grid) {
            const gridWindow = progressBarData.grid.up('window'); // Retrieve the parent window
            if (gridWindow) {
                gridWindow.destroy();
            } else {
                progressBarData.grid.destroy();
            }
        }

        // Remove the reference from the progressBars object
        delete this.progressBars[id];
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
