Ext.define('FileManagement.components.viewers.ZipViewer', {
    extend: 'Ext.panel.Panel',
    xtype: 'zipviewer',

    config: {
        src: null,
        fileName: null
    },

    title: 'Zip File Contents',
    closable: true,
    frame: true,
    modal: true,

    width: 400, // Set a fixed width
    height: 350, // Set a fixed height
    layout: 'fit', // Ensure the gridpanel fills the panel
    x: 220,
    y: 220,

    style: {
        zIndex: ++window.highestZIndex,
    },

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

    header: {
        listeners: {
            dblclick: function (header) {
                const panel = header.up('panel');
                FileManagement.components.utils.PanelUtils.toggleMaximize(panel);
            }
        }
    },

    tools: [
        {
            type: 'maximize',
            handler: function () {
                const panel = this.up('panel');
                if (panel && !panel.maximized) {
                    FileManagement.components.utils.PanelUtils.maximizePanel(panel);
                } else if (panel) {
                    FileManagement.components.utils.PanelUtils.minimizePanel(panel);
                }
            }
        }
    ],

    listeners: {
        afterrender: function (panel) {
            // Ensure absolute positioning for free dragging
            const el = panel.getEl();
            if (el) {
                el.setStyle('z-index', ++window.highestZIndex); // Set a base z-index
            }
        }
    },

    zipStack: [], // Track nested zip entries for navigation
    currentZip: null, // Store the current zip instance

    initComponent: async function() {
        const token = FileManagement.helpers.Functions.getToken();
        const zipFilePath = this.getSrc();
        const zipPanel = this;

        // Initialize grid panel and other items
        this.items = [{
            xtype: 'gridpanel',
            store: {
                fields: ['name'],
                data: [] // Initialize with empty data, populated later in showZipContents
            },
            scrollable: true, // Enable vertical scrolling
            columns: [{ text: 'File Name', dataIndex: 'name', flex: 1 }],
            tbar: [
                {
                    xtype: 'button',
                    iconCls: 'fa fa-arrow-left',
                    tooltip: 'Go Back',
                    handler: function() {
                        const previousZip = zipPanel.zipStack.pop();
                        if (previousZip) {
                            zipPanel.processZipEntries(previousZip, zipPanel.fileName);
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
                    zipPanel.onZipFileDoubleClick(record);
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

        // Set the panel title to reflect the opened zip file's name
        this.setTitle('Contents of: ' + parentPath);

        // Show or hide the Go Back button based on the stack
        goBackButton.setVisible(this.zipStack.length > 0);

        // Update the current zip reference for further navigation
        this.currentZip = zip;
    },

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
