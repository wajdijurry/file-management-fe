Ext.define('FileManagement.components.grids.FileGrid', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.filegrid',

    title: 'Files Explorer',

    frame: true,
    closable: true,

    store: 'FileManagement.components.stores.FileGridStore',

    currentFolder: '',
    currentFolderPath: [], // Store the folder path segments
    userId: null, // Store the user ID to represent the root directory

    // floating: true, // Enables ZIndexManager for bringToFront

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
        click: {
            element: 'el',
            fn: function () {
                FileManagement.components.utils.PanelUtils.onClick(this);
            }
        },
        destroy: function(panel) {
            // Safely close the upload panel if it exists and is visible
            const uploadForm = Ext.ComponentQuery.query('fileuploadform')[0];
            if (uploadForm && uploadForm.isVisible()) {
                uploadForm.close(); // Close the upload form if visible
            }

            // Ensure the FileGrid's reference button in the toolbar is unpressed if it exists
            if (panel.refBottomToolbarButton) {
                panel.refBottomToolbarButton.setPressed(false);
            }

            // Remove all listeners associated with this panel to avoid lingering references
            panel.un('selectionchange', panel.onSelectionChange, panel);
            panel.un('itemcontextmenu', panel.onItemContextMenu, panel);
            panel.un('itemdblclick', panel.onFileDoubleClick, panel);

            // Perform any additional cleanup needed
            FileManagement.components.utils.PanelUtils.destroy(panel);

            console.log('FileGrid and associated elements cleaned up successfully.');
        },
        afterrender: function (panel) {
            // Ensure absolute positioning for free dragging
            const el = panel.getEl();
            if (el) {
                el.setStyle('position', 'absolute');
            }
        }
    },

    header: {
        listeners: {
            dblclick: function(header) {
                const panel = header.up('panel');
                FileManagement.components.utils.PanelUtils.toggleMaximize(panel);
            }
        }
    },

    width: 600, // Set a fixed width
    height: 400, // Set a fixed height

    // Enable multi-selection
    selModel: {
        selType: 'checkboxmodel', // Use checkbox selection model
        mode: 'MULTI' // Allow multiple selections
    },

    tools: [
        {
            type: 'maximize',
            tooltip: 'Maximize',
            handler: function() {
                const panel = this.up('panel'); // Correctly reference the panel
                if (panel && !panel.maximized) {
                    FileManagement.components.utils.PanelUtils.maximizePanel(panel);
                } else if (panel) {
                    FileManagement.components.utils.PanelUtils.minimizePanel(panel);
                }
            }
        }
    ],

    // Define the columns for the grid
    columns: [
        // { text: 'Name', dataIndex: 'name', flex: 1 },
        {
            text: 'Name',
            dataIndex: 'name',
            flex: 1,
            renderer: function(value, metaData, record) {
                const iconCls = record.get('icon');
                return `<i class="${iconCls}" style="margin-right: 5px;"></i> ${Ext.String.htmlEncode(value)}`;
            }
        },
        { text: 'Size', dataIndex: 'size', flex: 1 },
        {
            text: 'Upload Date',
            dataIndex: 'createdAt',
            width: 150,
            renderer: Ext.util.Format.dateRenderer('Y-m-d H:i:s')  // Customize the date format here
        }
    ],

    // Optionally, you can add features like paging or filtering
    features: [{
        ftype: 'groupingsummary',
        groupHeaderTpl: '{name}',
        startCollapsed: true
    }],

    // Add a toolbar for bulk actions
    tbar: {
        items: [
            {
                xtype: 'textfield',
                emptyText: 'Search by name...',
                listeners: {
                    change: function (field, newValue) {
                        var grid = field.up('gridpanel');
                        var store = grid.getStore();

                        // Clear any existing filters
                        store.clearFilter();

                        // Apply the new filter
                        if (newValue) {
                            store.filterBy(function (record) {
                                // Assuming 'name' is the field you want to search
                                return record.get('name').toLowerCase().includes(newValue.toLowerCase());
                            });
                        }
                    }, // Adjust delay (300ms here) as needed,
                    scope: this
                }
            },
            {
                text: 'Reload',
                iconCls: 'fa fa-refresh',
                handler: function() {
                    const grid = this.up('grid');
                    grid.getStore().reload(); // Reload the store data
                }
            },
            {
                text: 'Delete Selected',
                iconCls: 'fa fa-trash red-icon',
                handler: function () {
                    var grid = this.up('grid'); // Get the grid reference
                    grid.onDeleteFiles(); // Call the delete function
                },
                disabled: true, // Initially disabled
                itemId: 'deleteButton' // Give it an itemId for easy access
            },
            {
                text: 'Go Up',
                iconCls: 'fa fa-level-up',
                itemId: 'goUpButton',  // Add an itemId for easy access
                disabled: true,        // Initially disabled at root level
                handler: function () {
                    const grid = this.up('grid');
                    grid.navigateUp();
                }
            },
            {
                text: 'Upload',
                iconCls: 'fa fa-upload',
                handler: function () {
                    const mainPanelRegion = Ext.getCmp('mainPanelRegion');
                    let uploadForm = Ext.ComponentQuery.query('fileuploadform')[0];

                    if (!uploadForm) {
                        // Create the FileUploadForm if it doesn't exist
                        uploadForm = Ext.create('FileManagement.components.forms.FileUploadForm', {
                            x: '50%',
                            y: '50%'
                        });
                        mainPanelRegion.add(uploadForm);
                    } else {
                        // Toggle visibility if it already exists
                        uploadForm.setVisible(!uploadForm.isVisible());
                    }

                    // Ensure upload form is above FileGrid by setting a higher z-index
                    if (uploadForm.isVisible()) {
                        const uploadFormZIndex = parseInt(this.getEl().getStyle('z-index'), 10) + 1 || 1000; // Set to be above current
                        uploadForm.getEl().setStyle('z-index', uploadFormZIndex);
                    }

                    // Refresh navigation panel when the upload form is shown
                    const navPanel = Ext.ComponentQuery.query('navigationpanel')[0];
                    if (navPanel) navPanel.refreshPanelList();
                }
            },
            {
                text: 'New Folder',
                iconCls: 'fa fa-folder',
                handler: function () {
                    Ext.Msg.prompt('New Folder', 'Enter folder name:', function (btn, folderName) {
                        if (btn === 'ok' && folderName) {
                            const parentFolderId = this.up('grid').currentFolderId || null; // Get the current folder ID or set to null for root
                            console.log(parentFolderId);

                            Ext.Ajax.request({
                                url: 'http://localhost:5000/api/files/create-folder',
                                method: 'POST',
                                jsonData: {
                                    name: folderName,
                                    parentId: parentFolderId
                                },
                                success: function(response) {
                                    Ext.Msg.alert('Success', 'Folder created successfully.');
                                    const store = this.up('grid').getStore();
                                    if (store) {
                                        store.reload();
                                    }
                                },
                                failure: function(response) {
                                    Ext.Msg.alert('Error', 'Failed to create folder');
                                },
                                scope: this // Preserve the context
                            });
                        }
                    }, this);
                }
            },
            {
                xtype: 'tbseparator'
            },
            {
                text: 'Compress Selected',
                iconCls: 'fa fa-compress',
                id: 'compressButton',
                disabled: true, // Initially disabled
                handler: function() {
                    const grid = this.up('grid');

                    grid.onCompressSelectedFiles(grid);
                }
            },
            {
                xtype: 'button',
                text: 'Download',
                iconCls: 'fa fa-download',
                id: 'downloadButton',
                disabled: true, // Initially disabled
                handler: async function() {
                    const grid = this.up('gridpanel'); // Access the FileGrid
                    const selection = grid.getSelectionModel().getSelection(); // Get selected items

                    if (selection.length === 0) {
                        Ext.Msg.alert('Error', 'Please select at least one file to download.');
                        return;
                    }

                    const token = FileManagement.helpers.Functions.getToken();

                    if (selection.length === 1) {
                        // Single file download
                        const file = selection[0];
                        const filePath = file.get('path');
                        const fileName = file.get('name');
                        const chunkSize = 2 * 1024 * 1024; // 10 MB

                        await grid.downloadFileInChunks(filePath, fileName, token, chunkSize);
                    } else {
                        // Multiple file download as ZIP
                        Ext.Msg.prompt('Zip File Name', 'Enter the name of the zip file:', async function(btn, zipFileName) {
                            if (btn === 'ok' && zipFileName) {
                                let filePaths = selection.map(record => record.get('path'));
                                filePaths = filePaths.map(path => path.split('/').slice(1).join('/'));
                                zipFileName = zipFileName.endsWith('.zip') ? zipFileName : `${zipFileName}.zip`

                                const abortController = new AbortController();
                                const signal = abortController.signal;

                                // const progressId = `compression-progress-${Date.now()}`;
                                FileManagement.components.utils.ProgressBarManager.addProgressBar('compression', `Compressing ${zipFileName}`, [], function () {
                                    abortController.abort(); // Abort ongoing requests
                                    // Notify the backend to stop the compression process
                                    fetch('http://localhost:5000/api/files/stop-compression', {
                                        method: 'POST',
                                        headers: {
                                            'Authorization': `Bearer ${token}`,
                                            'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({
                                            zipFileName,
                                            folder: grid.currentFolder,
                                            parentId: grid.currentFolderId
                                        })
                                    }).catch(() => {
                                        Ext.Msg.alert('Error', 'Failed to cancel compression on the server.');
                                    });
                                }, false);

                                try {
                                    const response = await fetch('http://localhost:5000/api/files/compress', {
                                        method: 'POST',
                                        headers: {
                                            'Authorization': `Bearer ${token}`,
                                            'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({
                                            items: filePaths,
                                            zipFileName,
                                            folder: grid.currentFolder,
                                            parentId: grid.currentFolderId
                                        }),
                                        signal
                                    });

                                    if (!response.ok) {
                                        throw new Error('Failed to create ZIP file.');
                                    }

                                    FileManagement.components.utils.ProgressBarManager.removeProgressBar('compression');

                                    const zipFile = await response.json();
                                    let zipFilePath = zipFile.file.path;

                                    // Download the ZIP in chunks
                                    await grid.downloadFileInChunks(zipFilePath, `${zipFileName}`, token, 2 * 1024 * 1024); // 10 MB chunks
                                } catch (error) {
                                    if (error.name === 'AbortError') {
                                        console.log('Compression aborted by user.');
                                    } else {
                                        console.error('Error during compression:', error);
                                        Ext.Msg.alert('Error', `Failed to download ZIP: ${error.message}`);
                                    }
                                }
                            }
                        });
                    }
                }
            },
            {
                xtype: 'tbfill' // Fills remaining space in the toolbar
            }
        ],
        enableOverflow: true
    },

    // Initialize the component
    initComponent: function () {
        var me = this;

        // Create the context menu
        me.contextMenu = Ext.create('Ext.menu.Menu', {
            items: [
                {
                    text: 'View',
                    iconCls: 'fa fa-eye',
                    itemId: 'viewMenuItem',
                    hidden: true, // Initially hidden; shown only for files
                    handler: function () {
                        me.onViewFile();
                    }
                },
                {
                    text: 'Open',
                    iconCls: 'fa fa-folder-open',
                    itemId: 'openMenuItem',
                    hidden: true, // Initially hidden; shown only for folders
                    handler: function (menuItem, e) {
                        me.onOpenFolder();
                    }
                },
                {
                    text: 'Delete',
                    iconCls: 'fa fa-trash red-icon', // Add the custom class here
                    handler: function () {
                        me.onDeleteFiles(); // Call the new delete function
                    }
                },
                {
                    text: 'Rename',
                    iconCls: 'fa fa-pen', // Add the custom class here
                    itemId: 'renameMenuItem',
                    handler: function () {
                        me.onRenameFile(); // Call the new delete function
                    }
                },
                {
                    text: 'Actions',
                    itemId: 'actionsMenu',
                    menu: {
                        items: [
                            {
                                text: 'Decompress',
                                itemId: 'decompressMenuItem',
                                iconCls: 'fa fa-file-archive',
                                hidden: true,
                                handler: function() {
                                    const grid = Ext.ComponentQuery.query('filegrid')[0];
                                    const selection = grid.getSelectionModel().getSelection();
                                    const zipFile = selection[0];

                                    if (zipFile && zipFile.get('mimetype') === 'application/zip') {
                                        // Show a prompt dialog to ask for folder name
                                        Ext.Msg.prompt('Decompress Folder', 'Enter the name of the folder to decompress into:', function(btn, folderName) {
                                            if (btn === 'ok' && folderName) {
                                                // Proceed with decompress request using the specified folder name
                                                Ext.Ajax.request({
                                                    url: 'http://localhost:5000/api/files/decompress',
                                                    method: 'POST',
                                                    jsonData: {
                                                        filePath: zipFile.get('path'),
                                                        targetFolder: this.currentFolder ? this.currentFolder + '/' + folderName : folderName,
                                                        parentId: this.currentFolderId
                                                    },
                                                    success: function(response) {
                                                        Ext.Msg.alert('Success', 'File decompressed successfully.');
                                                        grid.getStore().reload();
                                                    },
                                                    failure: function(response) {
                                                        let responseJSON = JSON.parse(response.responseText);
                                                        Ext.Msg.alert('Error', 'Failed to decompress file: ' + responseJSON.error);
                                                    }
                                                });
                                            }
                                        }, this);
                                    }
                                },
                                scope: this
                            }
                        ]
                    },
                }
            ],
            listeners: {
                show: function(menu, e) {
                    const viewMenuItem = menu.down('#viewMenuItem');
                    const openMenuItem = menu.down('#openMenuItem');
                    const grid = Ext.ComponentQuery.query('filegrid')[0];
                    const selection = grid.getSelectionModel().getSelection();
                    const decompressMenuItem = menu.down('#decompressMenuItem');
                    const actionsMenu = menu.down('#actionsMenu');

                    // Reset visibility
                    viewMenuItem.setHidden(true);
                    openMenuItem.setHidden(true);

                    // Show "View" only if exactly one file is selected
                    if (selection.length === 1 && !selection[0].get('isFolder')) {
                        viewMenuItem.setHidden(false);
                    }

                    // Show "Open" only if exactly one folder is selected
                    if (selection.length === 1 && selection[0].get('isFolder')) {
                        openMenuItem.setHidden(false);
                    }

                    // Show "Decompress" only if exactly one item is selected and it is a zip file
                    const shouldShowDecompress = selection.length === 1 && selection[0].get('mimetype') === 'application/zip';
                    decompressMenuItem.setHidden(!shouldShowDecompress);

                    // Check if any items in the "Actions" menu are visible
                    const actionsVisible = actionsMenu.menu.items.items.filter(item => !item.hidden);
                    actionsMenu.setHidden(!actionsVisible.length);

                    const renameMenuItem = menu.down('#renameMenuItem');
                    renameMenuItem.setDisabled(selection.length !== 1);

                    return true;
                },
            }
        });

        // Add the bottom toolbar (bbar) to display the breadcrumb navigation
        Ext.apply(me, {
            bbar: {
                overflowHandler: 'scroller',
                items: [
                    {
                        xtype: 'tbtext',
                        text: 'Path: '
                    },
                    {
                        xtype: 'toolbar',
                        itemId: 'breadcrumbToolbar',
                        border: 0,
                        items: [],
                    }
                ]
            }
        });

        me.callParent(arguments);

        me.on('afterrender', function () {
            me.loadFiles();
        });

        // Add selection change listener to enable/disable the delete button
        me.getSelectionModel().on('selectionchange', function (selModel, selected) {
            var deleteButton = me.down('#deleteButton');
            deleteButton.setDisabled(selected.length === 0);

            var compressButton = me.down('#compressButton');
            compressButton.setDisabled(selected.length === 0);

            // Disable download button if nothing selected or a folder is selected
            var downloadButton = me.down('#downloadButton');
            downloadButton.setDisabled(selected.length === 0);
        });

        // Add context menu listener
        me.on('itemcontextmenu', function (view, record, item, index, e) {
            e.stopEvent(); // Prevent the default context menu
            me.contextMenu.showAt(e.getXY()); // Show the context menu at the mouse position
        });

        // Add double-click listener to open the file viewer
        me.on('itemdblclick', function (view, record) {
            me.onFileDoubleClick(record);
        });


        me.updateBreadcrumb([]);
    },

    // Handler for "View" option (for files)
    onViewFile: function() {
        const record = this.getSelectionModel().getSelection()[0];

        // Use ViewerFactory to open the file in the appropriate viewer
        const viewer = FileManagement.components.viewers.ViewerFactory.createViewer(record);
        if (viewer) {
            viewer.show();
        } else {
            Ext.Msg.alert('Error', 'Unable to view this file type.');
        }
    },

    // Handler for "Open" option (for folders)
    onOpenFolder: function() {
        const record = this.getSelectionModel().getSelection()[0];
        const folderName = record.get('name');
        const folderId = record.get('_id');

        // Call the method to load folder contents
        this.loadFolderContents(folderName, folderId);
    },

    // Method to update the breadcrumb based on the current folder path
    updateBreadcrumb: function (pathSegments) {
        const breadcrumbToolbar = this.down('#breadcrumbToolbar');
        if (!breadcrumbToolbar) return;

        breadcrumbToolbar.removeAll();

        breadcrumbToolbar.add({
            xtype: 'button',
            text: 'Root',
            handler: () => this.navigateToRoot()
        });

        if (pathSegments.length > 0) {
            breadcrumbToolbar.add({
                xtype: 'tbseparator'
            });
        }

        pathSegments.forEach((segment, index) => {
            breadcrumbToolbar.add({
                xtype: 'button',
                text: segment.name,
                handler: () => this.navigateToPathIndex(index)
            });

            if (index < pathSegments.length - 1) {
                breadcrumbToolbar.add({
                    xtype: 'tbseparator'
                });
            }
        });
    },

    // Method to navigate back to the root directory
    navigateToRoot: function () {
        this.currentFolderPath = [];
        this.loadFolderContents(null, this.userId);
        this.updateBreadcrumb([]);
    },

    navigateToPathIndex: function (index) {
        const newPath = this.currentFolderPath.slice(0, index + 1);
        this.currentFolderPath = newPath;
        const targetFolder = newPath[newPath.length - 1] || { id: null, name: '' };
        this.currentFolder = newPath.map(segment => segment.name).join('/') || '';
        this.loadFolderContents(targetFolder.name, targetFolder.id, false);
        this.updateBreadcrumb(newPath);
    },

    // Optionally, you can add methods for additional functionality
    loadFiles: function () {
        var me = this;

        // Load the store data
        me.getStore().load({
            callback: function (records, operation, success) {
                if (!success) {
                    console.error('Failed to load files:', operation.getError());
                }
            }
        });
    },

    // FileGrid.js
    onDeleteFiles: function() {
        const selectedRecords = this.getSelectionModel().getSelection();
        const fileIds = selectedRecords.map(record => record.get('_id'));

        if (fileIds.length > 0) {
            Ext.Msg.confirm('Confirm', 'Are you sure you want to delete the selected files?', (btn) => {
                if (btn === 'yes') {
                    this.getStore().deleteFiles(fileIds);
                }
            });
        } else {
            Ext.Msg.alert('Warning', 'Please select files to delete.');
        }
    },

    onCompressSelectedFiles: function(grid) {
        const selectedRecords = this.getSelectionModel().getSelection();
        if (selectedRecords) {
            this.getStore().compressSelected(grid, selectedRecords, grid.currentFolderId, grid.currentFolder);
        }
    },

    onRenameFile: function() {
        const selectedRecord = this.getSelectionModel().getSelection()[0];
        if (selectedRecord) {
            const fileId = selectedRecord.get('_id');
            const currentName = selectedRecord.get('name');
            const isFolder = selectedRecord.get('isFolder');

            Ext.Msg.prompt('Rename', 'Enter new name:', (btn, newName) => {
                if (btn === 'ok' && newName && newName !== currentName) {
                    this.getStore().renameFile(fileId, newName, isFolder);
                }
            }, this, false, currentName);
        }
    },

    onFileDoubleClick: function (record) {
        if (record.get('isFolder')) {
            this.loadFolderContents(record.get('name'), record.get('_id'));
        } else {
            const fileId = record.get('_id'); // Unique identifier for the file
            const mainPanel = Ext.getCmp('mainPanelRegion'); // Parent container reference

            if (!mainPanel) {
                Ext.Msg.alert('Error', 'Main panel not found.');
                return;
            }

            // Check if a viewer for this file is already open
            const existingViewer = mainPanel.items.findBy(item => item.fileId === fileId);
            if (existingViewer) {
                existingViewer.setStyle({ zIndex: ++window.highestZIndex });
                return;
            }

            // Create and add the new viewer panel
            const viewer = FileManagement.components.viewers.ViewerFactory.createViewer(record);
            if (viewer) {
                viewer.fileId = fileId; // Tag the panel with the file ID for tracking
                viewer.show(); // Add the viewer to the main panel

                Ext.ComponentQuery.query('userToolbar')[0].addPanelToggleButton(viewer, record.get('name'), record.get('icon'));
            }
        }
    },

    // Function to load the contents of a folder
    loadFolderContents: function(folderName, folderId, pushToPath = true) {
        // Only push the folder to currentFolderPath if explicitly allowed
        if (folderName !== null && folderId !== this.currentFolderId && pushToPath) {
            this.currentFolderPath.push({ name: folderName, id: folderId });
        }

        this.currentFolder = this.currentFolderPath.map(segment => segment.name).join('/') || '';
        this.currentFolderId = folderId ?? '';

        this.updateBreadcrumb(this.currentFolderPath);

        const store = this.getStore();
        if (!store) return;

        store.getProxy().setUrl(`http://localhost:5000/api/files?parent_id=${this.currentFolderId}`);
        store.load({
            callback: function(records, operation, success) {
                if (!success) {
                    Ext.Msg.alert('Error', `Failed to load contents of folder "${folderName}".`);
                }
            }
        });

        const goUpButton = this.down('#goUpButton');
        if (goUpButton) {
            goUpButton.setDisabled(this.currentFolderPath.length === 0);
        }
    },

    navigateUp: function() {
        if (this.currentFolderPath.length > 1) {
            // Remove the last folder from the current folder path
            this.currentFolderPath.pop();

            // Update `currentFolder` based on the new path
            const folderId = this.currentFolderPath.length > 0 ? this.currentFolderPath[this.currentFolderPath.length - 1].id : null;
            this.currentFolder = this.currentFolderPath.map(segment => segment.name).join('/') || '';

            // Load the contents of the parent folder
            this.loadFolderContents(null, folderId);
        } else if (this.currentFolderPath.length === 1) {
            // If only one folder remains, navigate to root
            this.navigateToRoot();
        } else {
            Ext.Msg.alert('Info', 'You are already in the root folder.');
        }
    },

    viewConfig: {
        plugins: {
            ptype: 'gridviewdragdrop',
            dragText: 'Drag and drop to move'
        },
        listeners: {
            drop: function(node, data, overModel, dropPosition, eOpts) {
                // Check if the target is a folder
                // if (overModel.get('isFolder')) {
                    const draggedRecords = data.records;
                    const targetId = overModel.get('_id');

                    // Call the moveItem function for each dragged record
                    // draggedRecords.forEach(record => {
                    //     this.up('filegrid').moveItem(record, targetFolderId);
                    // });

                    this.up('filegrid').moveItem(draggedRecords, overModel);
                // } else {
                //     Ext.Msg.alert('Invalid Drop', 'You can only drop items inside a folder.');
                // }
            }
        }
    },

    // Method to handle moving the item to another folder
    // moveItem: function(record, targetFolderId) {
    //     const itemId = record.get('_id');
    //
    //     // Call the backend to update the folder location
    //     Ext.Ajax.request({
    //         url: `http://localhost:5000/api/files/move`,
    //         method: 'POST',
    //         jsonData: {
    //             itemId: itemId,
    //             targetFolderId: targetFolderId
    //         },
    //         success: () => {
    //             Ext.Msg.alert('Success', 'Item moved successfully.');
    //             this.getStore().reload(); // Refresh the grid after moving
    //         },
    //         failure: (response) => {
    //             const responseText = Ext.decode(response.responseText);
    //             Ext.Msg.alert('Error', responseText.message || 'Failed to move the item.');
    //         }
    //     });
    // },

    moveItem: function(selectedItems, targetRecord) {
        if (!targetRecord) {
            Ext.Msg.alert('Error', 'Please select a target folder or ZIP file.');
            return;
        }

        const isTargetZip = targetRecord.get('name').endsWith('.zip'); // Check if the target is a ZIP file
        const targetId = targetRecord.get('_id'); // Get the target folder/ZIP ID
        const targetName = targetRecord.get('name');

        // Collect the IDs of selected files/folders to be moved
        const itemIds = selectedItems.map(item => item.get('_id'));
        const grid = this.up('grid');

        // Confirm the move action
        Ext.Msg.confirm(
            'Confirm Move',
            `Are you sure you want to move the selected items to ${isTargetZip ? 'ZIP file: ' + targetName : 'folder: ' + targetName}?`,
            function(choice) {
                if (choice === 'yes') {
                    // Show a loading mask
                    const mask = new Ext.LoadMask({
                        msg: 'Moving items...',
                        target: this
                    });
                    mask.show();

                    // Make the API call to move the items
                    Ext.Ajax.request({
                        url: 'http://localhost:5000/api/files/move', // Backend endpoint
                        method: 'POST',
                        jsonData: {
                            itemIds: itemIds,
                            targetId: targetId,
                            isTargetZip: isTargetZip // Let the backend know if the target is a ZIP
                        },
                        success: function(response) {
                            mask.hide();

                            const res = Ext.decode(response.responseText);
                            if (res.success) {
                                Ext.Msg.alert('Success', 'Items moved successfully.');
                                this.getStore().reload(); // Reload the store data
                            } else {
                                Ext.Msg.alert('Error', res.message || 'Failed to move items.');
                            }
                        },
                        failure: function(response) {
                            mask.hide();
                            Ext.Msg.alert('Error', 'An error occurred while moving the items.');
                        },
                        scope: this
                    });
                }
            },
            this
        );
    },

    downloadFileInChunks: async function (filePath, fileName, token, chunkSize) {
        let start = 0;
        const chunks = [];
        const progressId = `download-${fileName}`; // Unique ID for this download progress bar

        const abortController = new AbortController();

        // Add progress bar with a unique ID
        FileManagement.components.utils.ProgressBarManager.addProgressBar(progressId, `Downloading ${fileName} (0%)`, [], function () {
            console.log(`Cancelling upload for ${fileName}`);
            abortController.abort(); // Abort ongoing requests
        }, false);

        try {
            // Fetch the file size from the backend
            const metadataResponse = await fetch('http://localhost:5000/api/files/file-size', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ filePath }),
                signal: abortController.signal // Attach AbortController signal
            });

            if (!metadataResponse.ok) {
                throw new Error('Failed to fetch file metadata.');
            }

            const { fileSize } = await metadataResponse.json();

            // Fetch file chunks
            while (start < fileSize) {
                const end = Math.min(start + chunkSize - 1, fileSize - 1);
                const chunkResponse = await fetch('http://localhost:5000/api/files/download', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Range': `bytes=${start}-${end}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ filePath }),
                    signal: abortController.signal // Attach AbortController signal
                });

                if (!chunkResponse.ok) {
                    throw new Error('Failed to download chunk.');
                }

                const chunk = await chunkResponse.arrayBuffer(); // Ensure raw data is received
                chunks.push(chunk);
                start += chunkSize;

                const progress = Math.round((start / fileSize) * 100);
                FileManagement.components.utils.ProgressBarManager.updateProgress(progressId, progress, `Downloading ${fileName} (${progress}%)`);
            }

            // Combine chunks into a single Blob
            const combinedBuffer = this.concatenateChunks(chunks);

            // Create a Blob and download the file
            const blob = new Blob([combinedBuffer], { type: 'application/octet-stream' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = fileName;
            link.click();

            FileManagement.components.utils.ProgressBarManager.updateProgress(progressId, 100, 'Download Complete');
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log(`Upload for ${file.name} canceled.`);
                FileManagement.components.utils.ProgressBarManager.updateProgress(progressId, 0, 'Upload Canceled');
            } else {
                console.error('Error during upload:', error);
                FileManagement.components.utils.ProgressBarManager.updateProgress(progressId, 0, 'Upload Failed');
            }
            Ext.Msg.alert('Error', `Download failed: ${error.message}`);
            FileManagement.components.utils.ProgressBarManager.updateProgress(progressId, 0, 'Download Failed');
        } finally {
            FileManagement.components.utils.ProgressBarManager.removeProgressBar(progressId);
        }
    },

    concatenateChunks: function (chunks) {
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
        const combinedBuffer = new Uint8Array(totalLength);

        let offset = 0;
        chunks.forEach(chunk => {
            combinedBuffer.set(new Uint8Array(chunk), offset);
            offset += chunk.byteLength;
        });

        return combinedBuffer.buffer; // Return as ArrayBuffer
    }

});