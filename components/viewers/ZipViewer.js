// ZipViewer.js
Ext.define('FileManagement.components.viewers.ZipViewer', {
    extend: 'Ext.window.Window',
    xtype: 'zipviewer',

    config: {
        src: null,
        fileName: null
    },

    title: 'Zip File Contents',
    modal: true,
    layout: 'fit',
    width: 400,
    height: 300,
    constrain: true,

    zipStack: [], // Track nested zip entries for navigation
    currentZip: null, // Store the current zip instance

    initComponent: async function() {
        const token = FileManagement.helpers.Functions.getToken();
        const zipFilePath = this.getSrc();
        const zipWindow = this;

        // Initialize grid panel and other items here to avoid rendering issues
        this.items = [{
            xtype: 'gridpanel',
            store: {
                fields: ['name'],
                data: [] // Initialize with empty data, populated later in showZipContents
            },
            columns: [{ text: 'File Name', dataIndex: 'name', flex: 1 }],
            tbar: [
                {
                    xtype: 'button',
                    iconCls: 'fa fa-arrow-left',
                    tooltip: 'Go Back',
                    handler: function() {
                        const previousZip = zipWindow.zipStack.pop();
                        if (previousZip) {
                            zipWindow.processZipEntries(previousZip, zipWindow.fileName);
                        } else {
                            this.hide();
                        }
                    },
                    hidden: true // Initially hide the "Go Back" button
                },
                {
                    xtype: 'textfield',
                    emptyText: 'Search by file name...',
                    listeners: {
                        change: function(field, newValue) {
                            const grid = field.up('gridpanel');
                            const store = grid.getStore();
                            store.clearFilter();

                            if (newValue) {
                                store.filterBy(record => record.get('name').toLowerCase().includes(newValue.toLowerCase()));
                            }
                        }
                    }
                }
            ],
            listeners: {
                itemdblclick: function(grid, record) {
                    zipWindow.onZipFileDoubleClick(record);
                }
            }
        }];

        this.callParent(arguments);

        // Fetch and process the zip file after initialization
        try {
            const response = await fetch(zipFilePath, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Failed to load zip file');

            const zipData = await response.arrayBuffer();
            const zip = await JSZip.loadAsync(zipData);
            this.currentZip = zip;
            this.zipStack = [];

            // Process and display the zip entries
            this.processZipEntries(zip, this.getFileName());
        } catch (error) {
            Ext.Msg.alert('Error', `Failed to load the zip file: ${error.message}`);
            zipWindow.close();
        }
    },

    processZipEntries: function(zip, parentPath) {
        const fileList = [];
        zip.forEach((relativePath, zipEntry) => {
            if (!zipEntry.dir) {
                fileList.push({ name: zipEntry.name });
            }
        });

        // Call showZipContents to display the processed file list
        this.showZipContents(fileList, parentPath, zip);
    },

    showZipContents: function(fileList, parentPath, zip) {
        const grid = this.down('gridpanel');
        const goBackButton = this.down('toolbar').items.getAt(0);

        // Update the grid store with the new file list
        grid.getStore().loadData(fileList);

        // Set the window title to reflect the opened zip file's name
        this.setTitle('Contents of: ' + parentPath);

        // Show or hide the Go Back button based on the stack
        goBackButton.setVisible(this.zipStack.length > 0);

        // Update the current zip reference for further navigation
        this.currentZip = zip;
    },

    // Handles double-click on zip files within the zip viewer to navigate into nested zips
    onZipFileDoubleClick: function(record) {
        const fileName = record.get('name');
        const zipEntry = this.currentZip.file(fileName);

        // Check if the double-clicked file is a zip to navigate into it
        if (zipEntry && fileName.endsWith('.zip')) {
            zipEntry.async('arraybuffer').then(innerZipData => {
                JSZip.loadAsync(innerZipData).then(innerZip => {
                    // Push the current zip onto the stack and process inner zip entries
                    this.zipStack.push(this.currentZip);
                    this.processZipEntries(innerZip, fileName);
                }).catch(err => {
                    Ext.Msg.alert('Error', 'Failed to read the inner zip file: ' + err.message);
                });
            });
        } else {
            Ext.Msg.alert('Info', 'This file is not a zip file: ' + fileName);
        }
    }
});
