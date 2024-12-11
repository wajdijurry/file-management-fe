Ext.define('FileManagement.components.grids.FileGrid', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.filegrid',
    requires: [
        'FileManagement.components.utils.PanelUtils',
        'FileManagement.components.utils.FileGridUtils',
        'FileManagement.components.actions.FileGridActions',
        'FileManagement.components.utils.PasswordPromptUtil',
        'FileManagement.components.utils.AccessTracker',
        'FileManagement.components.utils.DecompressionUtil'
    ],

    title: 'Files Explorer',

    frame: true,
    closable: true,

    store: 'FileManagement.components.stores.FileGridStore',

    currentFolder: '',
    currentFolderPath: [], // Store the folder path segments
    userId: null, // Store the user ID to represent the root directory

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
        {
            text: 'Type',
            dataIndex: 'type',
            width: 100,
            renderer: function(value) {
                return value || 'Unknown';
            }
        },
        { 
            text: 'Size', 
            dataIndex: 'size', 
            flex: 1,
            renderer: function(value) {
                if (value < 1024) return `${value} Bytes`;
                else if (value < 1024 * 1024) return `${(value / 1024).toFixed(2)} KB`;
                else if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(2)} MB`;
                return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
            }
        },
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

    // Main toolbar with action buttons
    tbar: {
        xtype: 'toolbar',
        enableOverflow: true,
        items: [
            {
                text: 'Share',
                iconCls: 'fa fa-duotone fa-solid fa-share-nodes',
                id: 'shareItemButton',
                disabled: true,
                handler: function () {
                    // do nothing for now
                }
            },
            {
                xtype: 'tbseparator'
            },
            {
                text: 'Move Selected',
                iconCls: 'fa fa-arrows-alt',
                id: 'moveItemsButton',
                disabled: true,
                handler: function () {
                    const grid = this.up('grid');
                    grid.moveItemsHandler(arguments);
                }
            },
            {
                text: 'Download',
                iconCls: 'fa fa-download',
                id: 'downloadButton',
                disabled: true,
                handler: async function() {
                    const grid = this.up('gridpanel');
                    const selection = grid.getSelectionModel().getSelection();

                    if (selection.length === 0) {
                        Ext.Msg.alert('Error', 'Please select at least one file to download.');
                        return;
                    }

                    const token = FileManagement.helpers.Functions.getToken();

                    if (selection.length === 1) {
                        const file = selection[0];
                        const filePath = file.get('path');
                        const fileName = file.get('name');
                        const chunkSize = 2 * 1024 * 1024;

                        await grid.downloadFileInChunks(filePath, fileName, token, chunkSize);
                    } else {
                        Ext.Msg.prompt('Zip File Name', 'Enter the name of the zip file:', async function(btn, zipFileName) {
                            if (btn === 'ok' && zipFileName) {
                                let filePaths = selection.map(record => record.get('path'));
                                filePaths = filePaths.map(path => path.split('/').slice(1).join('/'));
                                zipFileName = zipFileName.endsWith('.zip') ? zipFileName : `${zipFileName}.zip`

                                const abortController = new AbortController();
                                const signal = abortController.signal;

                                FileManagement.components.utils.ProgressBarManager.addProgressBar('compression', `Compressing ${zipFileName}`, [], function () {
                                    abortController.abort();
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

                                    await grid.downloadFileInChunks(zipFilePath, `${zipFileName}`, token, 2 * 1024 * 1024);
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
                text: 'Compress Selected',
                iconCls: 'fa fa-compress',
                id: 'compressButton',
                disabled: true,
                handler: function() {
                    const grid = this.up('grid');
                    grid.onCompressSelectedFiles(grid);
                }
            }
        ]
    },

    // Sub toolbar with file management
    dockedItems: [{
        xtype: 'toolbar',
        dock: 'top',
        cls: 'sub-toolbar',
        enableOverflow: true,
        items: [
            {
                xtype: 'textfield',
                emptyText: 'Search by name...',
                width: 200,
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
                xtype: 'tbseparator'
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
                text: 'Upload',
                iconCls: 'fa fa-upload',
                handler: function () {
                    const mainPanelRegion = Ext.getCmp('mainPanelRegion');
                    let uploadForm = Ext.ComponentQuery.query('fileuploadform')[0];

                    if (!uploadForm) {
                        uploadForm = Ext.create('FileManagement.components.forms.FileUploadForm', {
                            x: '50%',
                            y: '50%'
                        });
                        mainPanelRegion.add(uploadForm);
                    } else {
                        uploadForm.setVisible(!uploadForm.isVisible());
                    }

                    if (uploadForm.isVisible()) {
                        const uploadFormZIndex = parseInt(this.getEl().getStyle('z-index'), 10) + 1 || 1000;
                        uploadForm.getEl().setStyle('z-index', uploadFormZIndex);
                    }

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
                            const parentFolderId = this.up('grid').currentFolderId || null;
                            
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
                                scope: this
                            });
                        }
                    }, this);
                }
            }
        ]
    }],

    // Initialize the component
    initComponent: function () {
        var me = this;

        // Create items count text
        me.itemsCountText = '0 items';

        // Add listener for store data changes
        me.on('afterrender', function() {
            // Get reference to the count text component
            const countText = me.down('tbtext[itemId=itemsCount]');
            
            me.getStore().on('datachanged', function() {
                const count = me.getStore().getCount();
                me.itemsCountText = `${count} item${count !== 1 ? 's' : ''}`;
                if (countText) {
                    countText.setText(me.itemsCountText);
                }
            });
        });

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
                    hidden: true,
                    handler: function(item) {
                        const record = me.getSelectionModel().getSelection()[0];
                        if (record && record.get('isPasswordProtected')) {
                            FileManagement.components.utils.PasswordPromptUtil.showPasswordPrompt({
                                itemId: record.get('id'),
                                isFolder: record.get('isFolder'),
                                action: 'removePassword',
                                onSuccess: function(password) {
                                    // Remove password after verification
                                    const token = FileManagement.helpers.Functions.getToken();
                                    Ext.Ajax.request({
                                        url: 'http://localhost:5000/api/files/password/remove',
                                        method: 'POST',
                                        headers: {
                                            'Authorization': `Bearer ${token}`
                                        },
                                        jsonData: {
                                            itemId: record.get('id'),
                                            currentPassword: password,  // Password from the prompt
                                            isFolder: record.get('isFolder')
                                        },
                                        success: function(response) {
                                            me.getStore().reload();
                                            Ext.Msg.alert('Success', 'Password removed successfully.');
                                        },
                                        failure: function(response) {
                                            Ext.Msg.alert('Error', 'Failed to remove password.');
                                        }
                                    });
                                }
                            });
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
                                        const proceedWithDecompress = () => {
                                            FileManagement.components.utils.DecompressionUtil.showDecompressDialog({
                                                file: zipFile,
                                                currentFolder: this.currentFolder,
                                                parentId: this.currentFolderId,
                                                onSuccess: function() {
                                                    grid.getStore().reload();
                                                }
                                            });
                                        };

                                        // Check if archive is password protected
                                        if (zipFile.get('isPasswordProtected')) {
                                            FileManagement.components.utils.PasswordPromptUtil.showPasswordPrompt({
                                                itemId: zipFile.get('id'),
                                                isFolder: false,
                                                onSuccess: function() {
                                                    proceedWithDecompress();
                                                }
                                            });
                                        } else {
                                            proceedWithDecompress();
                                        }
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
                    const removePasswordMenuItem = menu.down('#removePasswordMenuItem');

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
                    setPasswordMenuItem.setHidden(selection.length !== 1 || selection[0].get('isPasswordProtected'));

                    removePasswordMenuItem.setHidden(selection.length !== 1 || !selection[0].get('isPasswordProtected'));

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
                        itemId: 'itemsCount',
                        text: me.itemsCountText
                    },
                    {
                        xtype: 'tbseparator'
                    },
                    {
                        xtype: 'tbtext',
                        text: 'Path: '
                    },
                    {
                        xtype: 'toolbar',
                        itemId: 'breadcrumbToolbar',
                        border: 0,
                        items: [],
                        scrollable: {
                            x:true,
                            y:false
                        }
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
        if (!record) return;

        const fileId = record.get('id');
        
        // Check if file/folder is password protected and not already verified
        if (record.get('isPasswordProtected') && !FileManagement.components.utils.AccessTracker.isItemVerified(fileId)) {
            FileManagement.components.utils.PasswordPromptUtil.showPasswordPrompt({
                itemId: fileId,
                isFolder: record.get('isFolder'),
                action: 'removePassword',
                onSuccess: () => {
                    this.handleItemDblClick(record);
                }
            });
        } else {
            this.handleItemDblClick(record);
        }
    },

    handleItemDblClick: function (record) {
        if (record.get('isFolder')) {
            this.loadFolderContents(record.get('name'), record.get('id'));
        } else {
            const fileId = record.get('id');
            const mainPanel = Ext.getCmp('mainPanelRegion');

            if (!mainPanel) {
                Ext.Msg.alert('Error', 'Main panel not found.');
                return;
            }

            // Check if a viewer for this file is already open
            const existingViewer = mainPanel.items.findBy(item => item.fileId === fileId);
            if (existingViewer) {
                existingViewer.setStyle({ zIndex: ++window.highestZIndex });
                existingViewer.show();
                existingViewer.toFront();
                return;
            }

            // Create and add the new viewer panel
            const viewer = FileManagement.components.viewers.ViewerFactory.createViewer(record);
            if (viewer) {
                viewer.fileId = fileId;
                viewer.show();

                const toolbar = Ext.ComponentQuery.query('userToolbar')[0];
                if (toolbar) {
                    toolbar.addPanelToggleButton(viewer, record.get('name'), record.get('icon'));
                }
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
                if (overModel.get('isFolder') || overModel.get('mimetype').includes('zip')) {
                    const draggedRecords = data.records;
                    const targetId = overModel.get('id');

                    // Call the moveItem function for each dragged record
                    // draggedRecords.forEach(record => {
                    //     this.up('filegrid').moveItem(record, targetFolderId);
                    // });

                    this.up('filegrid').moveItem(draggedRecords, overModel);
                } else {
                    Ext.Msg.alert('Invalid Drop', 'You can only drop items inside a folder or archives.');
                }
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