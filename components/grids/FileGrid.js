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

    requires: [
        'FileManagement.components.utils.PanelUtils',
        'FileManagement.components.utils.FileGridUtils',
        'FileManagement.components.actions.FileGridActions'
    ],

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
            renderer: Ext.util.Format.dateRenderer('Y-m-d H:i:s')
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
                itemId: 'searchField',
                triggers: {
                    clear: {
                        cls: 'x-form-clear-trigger',
                        hidden: true,
                        handler: function(field) {
                            var grid = field.up('gridpanel');
                            field.setValue('');
                            grid.getStore().clearFilter();
                        }
                    }
                },
                listeners: {
                    change: function(field, newValue) {
                        var grid = field.up('gridpanel');
                        var store = grid.getStore();
                        var clearTrigger = field.getTrigger('clear');
                        
                        store.clearFilter();
                        if (newValue) {
                            store.filterBy(function(record) {
                                return record.get('name').toLowerCase().includes(newValue.toLowerCase());
                            });
                            clearTrigger.show();
                        } else {
                            clearTrigger.hide();
                        }
                    },
                    scope: this
                }
            },
            {
                text: 'Reload',
                iconCls: 'fa fa-refresh',
                handler: function() {
                    const grid = this.up('grid');
                    grid.getStore().reload();
                }
            },
            {
                text: 'Delete Selected',
                iconCls: 'fa fa-trash red-icon',
                handler: function() {
                    var grid = this.up('grid');
                    FileManagement.components.actions.FileGridActions.onDeleteFiles(grid);
                },
                disabled: true,
                itemId: 'deleteButton'
            },
            {
                text: 'Go Up',
                iconCls: 'fa fa-level-up',
                itemId: 'goUpButton',
                disabled: true,
                handler: function() {
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
                                    let error = JSON.parse(response.responseText).message;
                                    Ext.Msg.alert('Error', error ?? 'Failed to create folder');
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
                text: 'Move Selected',
                iconCls: 'fa fa-arrows-alt',
                id: 'moveItemsButton',
                disabled: true, // Initially disabled
                handler: function () {
                    const grid = this.up('grid');
                    grid.moveItemsHandler(arguments);
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

        me.on('continueDecompression', (decision, zipFilePath, folderName, parentId) => {
            // debugger;

            console.log('Decompression decision received:', decision);

            // Notify the server about the user's decision
            const token = FileManagement.helpers.Functions.getToken();

            Ext.Ajax.request({
                url: 'http://localhost:5000/api/files/decompress',
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                jsonData: {
                    decision: decision, // Send the user's decision back to the server
                    filePath: zipFilePath,
                    targetFolder: folderName,
                    merge: decision,
                    parent_id: parentId
                },
                success: function (response) {
                    // debugger;
                    const result = Ext.decode(response.responseText);
                    if (result.success) {
                        console.log('Server acknowledged the decision. Continuing decompression.');
                    } else if (result.conflict) {
                        console.log('Another conflict encountered:', result.conflict.name);
                        me.fireEvent('continueDecompression', result.conflict.decision, zipFilePath, folderName, parentId);
                    }
                },
                failure: function (response) {
                    // debugger;
                    console.error('Failed to notify the server of the decision:', response);
                    Ext.Msg.alert('Error', 'An error occurred while processing your decision. Retrying...');

                    // Retry logic
                    setTimeout(() => {
                        me.fireEvent('continueDecompression', decision, zipFilePath, folderName, parentId); // Retry firing the event
                    }, 2000);
                }
            });
        });

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
                    text: 'Move Item',
                    iconCls: 'fa fa-arrows-alt',
                    handler: this.moveItemsHandler
                },
                {
                    text: 'Set Password',
                    iconCls: 'fa fa-lock',
                    itemId: 'setPasswordMenuItem',
                    handler: function(item) {
                        const record = me.getSelectionModel().getSelection()[0];
                        if (record) {
                            Ext.create('FileManagement.components.dialogs.SetPasswordDialog', {
                                itemId: record.get('id'),
                                itemName: record.get('name'),
                                isFolder: record.get('isFolder'),
                                onSuccess: function() {
                                    me.getStore().reload();
                                }
                            }).show();
                        }
                    }
                },
                {
                    text: 'Remove Password',
                    itemId: 'removePasswordMenuItem',
                    iconCls: 'fa fa-unlock',
                    handler: function(item) {
                        const record = me.getSelectionModel().getSelection()[0];
                        if (record && record.get('isLocked')) {
                            const passwordWindow = Ext.create('Ext.window.Window', {
                                title: 'Remove Password',
                                modal: true,
                                width: 300,
                                layout: 'form',
                                padding: 10,
                                items: [{
                                    xtype: 'textfield',
                                    inputType: 'password',
                                    fieldLabel: 'Current Password',
                                    name: 'password',
                                    allowBlank: false,
                                    width: '100%',
                                    listeners: {
                                        specialkey: function(field, e) {
                                            if (e.getKey() === e.ENTER) {
                                                passwordWindow.down('#submitButton').handler();
                                            }
                                        }
                                    }
                                }],
                                buttons: [{
                                    text: 'Cancel',
                                    handler: function() {
                                        passwordWindow.close();
                                    }
                                }, {
                                    text: 'Remove',
                                    itemId: 'submitButton',
                                    handler: function() {
                                        const password = passwordWindow.down('textfield').getValue();
                                        if (!password) {
                                            Ext.Msg.alert('Error', 'Please enter the current password.');
                                            return;
                                        }

                                        Ext.Ajax.request({
                                            url: 'http://localhost:5000/api/files/password/remove',
                                            method: 'POST',
                                            jsonData: {
                                                itemId: record.get('id'),
                                                currentPassword: password,
                                                isFolder: record.get('isFolder')
                                            },
                                            success: function(response) {
                                                const result = Ext.JSON.decode(response.responseText);
                                                if (result.success) {
                                                    Ext.Msg.alert('Success', 'Password removed successfully.');
                                                    me.getStore().reload();
                                                    passwordWindow.close();
                                                } else {
                                                    Ext.Msg.alert('Error', 'Failed to remove password.');
                                                }
                                            },
                                            failure: function() {
                                                Ext.Msg.alert('Error', 'Failed to remove password.');
                                            }
                                        });
                                    }
                                }]
                            });

                            passwordWindow.show();
                            passwordWindow.down('textfield').focus(true, 100);
                        }
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
                                    const token = FileManagement.helpers.Functions.getToken(); // Get the token for authorization

                                    if (zipFile && zipFile.get('mimetype') === 'application/zip') {
                                        // Show a prompt dialog to ask for folder name
                                        Ext.Msg.prompt('Decompress Folder', 'Enter the name of the folder to decompress into:', function(btn, folderName) {
                                            if (btn === 'ok' && folderName) {
                                                // Proceed with decompress request using the specified folder name
                                                Ext.Ajax.request({
                                                    url: 'http://localhost:5000/api/files/decompress',
                                                    method: 'POST',
                                                    headers: {
                                                        'Authorization': `Bearer ${token}`,
                                                        'Content-Type': 'application/json'
                                                    },
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

                    const setPasswordMenuItem = menu.down('#setPasswordMenuItem');
                    setPasswordMenuItem.setDisabled(selection.length !== 1);

                    const removePasswordMenuItem = menu.down('#removePasswordMenuItem');
                    removePasswordMenuItem.setDisabled(selection.length !== 1 || !selection[0].get('isLocked'));

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

            var moveButton = me.down('#moveItemsButton');
            moveButton.setDisabled(selected.length === 0);
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
    onViewFile: function(record) {
        FileManagement.components.actions.FileGridActions.onViewFile(this, record);
    },

    // Handler for "Open" option (for folders)
    onOpenFolder: function(record) {
        FileManagement.components.actions.FileGridActions.onOpenFolder(this, record);
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

    onDeleteFiles: function() {
        FileManagement.components.actions.FileGridActions.onDeleteFiles(this);
    },

    onRenameFile: function() {
        FileManagement.components.actions.FileGridActions.onRenameFile(this);
    },

    onCompressSelectedFiles: function() {
        FileManagement.components.actions.FileGridActions.onCompressSelectedFiles(this);
    },

    downloadFileInChunks: function(filePath, fileName, token, chunkSize) {
        return FileManagement.components.utils.FileGridUtils.downloadFileInChunks(filePath, fileName, token, chunkSize);
    },

    concatenateChunks: function(chunks) {
        return FileManagement.components.utils.FileGridUtils.concatenateChunks(chunks);
    },

    moveItem: function(selectedItems, targetRecord) {
        return FileManagement.components.utils.FileGridUtils.moveItem(selectedItems, targetRecord);
    },

    // FileGrid.js
    onFileDoubleClick: function (record) {
        const grid = Ext.ComponentQuery.query('filegrid')[0];

        if (record.get('isLocked')) {
            Ext.create('FileManagement.components.dialogs.PasswordPromptDialog', {
                record,
                onSuccess: function(record) {
                    grid.handleItemDblClick(record);
                }
            }).show();

            return false;
        }

        this.handleItemDblClick(record);
    },

    handleItemDblClick: function (record) {
        if (record.get('isFolder')) {
            this.loadFolderContents(record.get('name'), record.get('id'));
        } else {
            const fileId = record.get('id'); // Unique identifier for the file
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
                    const targetId = overModel.get('id');

                    // Call the moveItem function for each dragged record
                    // draggedRecords.forEach(record => {
                    //     this.up('filegrid').moveItem(record, targetFolderId);
                    // });

                    console.log(overModel);

                    this.up('filegrid').moveItem(draggedRecords, overModel);
                // } else {
                //     Ext.Msg.alert('Invalid Drop', 'You can only drop items inside a folder.');
                // }
            }
        }
    },

    // Move items handler
    moveItemsHandler: function () {
        const grid = Ext.ComponentQuery.query('filegrid')[0];
        const selected = grid.getSelectionModel().getSelection();

        if (selected.length === 0) {
            Ext.Msg.alert('Error', 'No items selected for moving.');
            return;
        }

        Ext.create('Ext.window.Window', {
            title: 'Move Item',
            modal: true,
            frame: true,
            layout: 'fit',
            width: 400,
            height: 300,
            items: [
                {
                    xtype: 'treepanel',
                    store: Ext.create('FileManagement.components.stores.FolderTreeStore'),
                    listeners: {
                        select: function (tree, record) {
                            // Update the "Move To" button with the selected folder name
                            const moveButton = this.up('window').down('#moveButton');
                            moveButton.setText(`Move To "${record.get('text')}"`);
                            moveButton.setDisabled(false); // Enable the button when a folder is selected
                        }
                    }
                }
            ],
            bbar: [
                {
                    text: 'Move To', // Default button text
                    itemId: 'moveButton', // Unique ID for easy access
                    disabled: true, // Disabled by default until a folder is selected
                    handler: function (btn) {
                        const window = btn.up('window');
                        const tree = window.down('treepanel');
                        const selectedNode = tree.getSelectionModel().getSelection()[0]; // Get the selected folder

                        if (!selectedNode) {
                            Ext.Msg.alert('Error', 'Please select a target folder.');
                            return;
                        }

                        const fileGrid = Ext.ComponentQuery.query('filegrid')[0];
                        const selectedItems = fileGrid.getSelectionModel().getSelection();

                        if (selectedItems.length === 0) {
                            Ext.Msg.alert('Error', 'No items selected for moving.');
                            return;
                        }

                        // Show loading mask
                        const mask = new Ext.LoadMask({
                            msg: 'Moving items...',
                            target: fileGrid
                        });
                        mask.show();

                        // Use the moveItem function
                        fileGrid.moveItem(selectedItems, selectedNode)
                        .then(function(response) {
                            mask.hide();
                            window.close();
                            fileGrid.getStore().reload();
                        }).catch(function(error) {
                            mask.hide();
                            Ext.Msg.alert('Error', error);
                        });
                    }
                },
                {
                    text: 'Cancel',
                    handler: function (btn) {
                        btn.up('window').close(); // Close the window
                    }
                }
            ]
        }).show();
    }
});