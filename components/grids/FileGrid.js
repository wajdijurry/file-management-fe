Ext.define('FileManagement.components.grids.FileGrid', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.filegrid',

    title: 'File Grid',

    frame: true,
    closable: true,

    store: 'FileManagement.components.stores.FileGridStore',

    currentFolder: '',
    currentFolderPath: [], // Store the folder path segments
    userId: null, // Store the user ID to represent the root directory

    draggable: {
        onMouseUp: function() {
            FileManagement.components.utils.PanelUtils.onMouseUp(this.panel);
        }
    },

    resizable: {
        constrain: true, // Enable constraint within a specified element
        dynamic: true, // Updates size dynamically as resizing
        // minHeight: 300,
        // minWidth: 600,
    },

    listeners: {
        click: {
            element: 'el', // could be 'body', or any other Ext.Elements
                           // that are available from the component
            fn: function () {
                FileManagement.components.utils.PanelUtils.onClick(this);
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
            text: 'File Type',
            dataIndex: 'mimetype',
            width: 50,
            renderer: function (value, metadata, record) {
                // Return the appropriate CSS class based on the file type
                let iconClass = 'fa fa-xl'; // Base class

                if (record.get('isFolder')) {
                    iconClass += ' fa-folder'; // Folder icon
                } else {
                    switch (value) {
                        case 'application/pdf':
                            iconClass += ' fa-file-pdf red-icon';
                            break;
                        case 'image/jpeg':
                        case 'image/png':
                            iconClass += ' fa-image green-icon';
                            break;
                        case 'doc':
                            iconClass += ' icon-doc blue-icon';
                            break;
                        case 'application/zip':
                            iconClass += ' fa-file-archive yellow-icon';
                        // Add more cases as needed
                        default:
                            iconClass += ' icon-default'; // Default icon class
                    }

                }
                return `<div class="${iconClass}"></div>`;
            }
        },
        {text: 'Name', dataIndex: 'name', flex: 1},
        {
            text: 'Size',
            dataIndex: 'size',
            flex: 1,
            renderer: function (value, metadata, record) {
                if (record.get('isFolder')) {
                    // Display folder size for folders
                    return value < 1024 ? `${value} Bytes` : value < 1024 * 1024 ? `${(value / 1024).toFixed(2)} KB` : `${(value / (1024 * 1024)).toFixed(2)} MB`;
                }

                if (value < 1024) {
                    return value + ' Bytes';
                } else if (value < 1024 * 1024) {
                    return (value / 1024).toFixed(2) + ' KB';
                } else if (value < 1024 * 1024 * 1024) {
                    return (value / (1024 * 1024)).toFixed(2) + ' MB';
                } else {
                    return (value / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
                }
            }
        },
        {
            text: 'Upload Date',
            dataIndex: 'createdAt',
            flex: 1,
            renderer: Ext.util.Format.dateRenderer('Y-m-d H:i:s') // Format the date
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
                    }
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
                        uploadForm = Ext.create('FileManagement.components.forms.FileUploadForm');
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
                text: 'Compress Selected',
                iconCls: 'fa fa-compress',
                id: 'compressButton',
                disabled: true, // Initially disabled
                handler: function() {
                    const grid = this.up('grid');
                    const selection = grid.getSelectionModel().getSelection();
                    const selectedItems = selection.map(record => record.get('name'));

                    if (selectedItems.length === 0) {
                        Ext.Msg.alert('Error', 'No items selected for compression.');
                        return;
                    }

                    // Prompt for zip file name
                    Ext.Msg.prompt('Zip File Name', 'Enter the name for the zip file:', function(btn, text) {
                        if (btn === 'ok' && text) {
                            const zipFileName = text.endsWith('.zip') ? text : `${text}.zip`;
                            const selection = grid.getSelectionModel().getSelection();
                            const selectedItems = selection.map(record => record.get('name'));

                            if (selectedItems.length === 0) {
                                Ext.Msg.alert('Error', 'No items selected for compression.');
                                return;
                            }

                            // Call the backend API to compress the selected items
                            Ext.Ajax.request({
                                url: 'http://localhost:5000/api/files/compress',
                                method: 'POST',
                                jsonData: {
                                    items: selectedItems,
                                    folder: grid.currentFolder,
                                    zipFileName: zipFileName
                                },
                                success: function(response) {
                                    Ext.Msg.alert('Success', 'Files compressed successfully.');
                                    grid.getStore().reload();
                                },
                                failure: function(response) {
                                    Ext.Msg.alert('Error', 'Failed to compress files');
                                }
                            });
                        }
                    });
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
                                    console.log(zipFile);

                                    if (zipFile && zipFile.get('mimetype') === 'application/zip') {
                                        // Show a prompt dialog to ask for folder name
                                        Ext.Msg.prompt('Decompress Folder', 'Enter the name of the folder to decompress into:', function(btn, folderName) {
                                            if (btn === 'ok' && folderName) {
                                                console.log(this.currentFolder);
                                                // Proceed with decompress request using the specified folder name
                                                Ext.Ajax.request({
                                                    url: 'http://localhost:5000/api/files/decompress',
                                                    method: 'POST',
                                                    jsonData: {
                                                        filePath: zipFile.get('path'),
                                                        targetFolder: this.currentFolder ? this.currentFolder + '/' + folderName : folderName
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
                    const grid = Ext.ComponentQuery.query('filegrid')[0];
                    const selection = grid.getSelectionModel().getSelection();
                    const decompressMenuItem = menu.down('#decompressMenuItem');
                    const actionsMenu = menu.down('#actionsMenu');

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
                items: [
                    {
                        xtype: 'tbtext',
                        text: 'Path: '
                    },
                    {
                        xtype: 'toolbar',
                        itemId: 'breadcrumbToolbar',
                        border: 0,
                        items: []
                    }
                ]
            }
        });

        me.callParent(arguments);

        // Initialize breadcrumb path to root on load
        this.updateBreadcrumb([]);

        me.on('afterrender', function () {
            me.loadFiles();
        });

        // Add selection change listener to enable/disable the delete button
        me.getSelectionModel().on('selectionchange', function (selModel, selected) {
            var deleteButton = me.down('#deleteButton'); // Get the delete button
            deleteButton.setDisabled(selected.length === 0); // Enable/disable based on selection

            var compressButton = me.down('#compressButton');
            // Enable the button if there are selected items; disable it otherwise
            compressButton.setDisabled(selected.length === 0);
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
                if (success) {
                    console.log('Files loaded successfully:', records);
                } else {
                    console.error('Failed to load files:', operation.getError());
                }
            }
        });
    },

    onDeleteFiles: function () {
        var me = this;
        var selection = me.getSelectionModel().getSelection();

        if (selection.length > 0) {
            Ext.Msg.confirm('Confirm', 'Are you sure you want to delete the selected files?', function (btn) {
                if (btn === 'yes') {
                    var fileIds = selection.map(record => record.get('_id')); // Get the IDs of selected files
                    Ext.Ajax.request({
                        url: 'http://localhost:5000/api/files', // Adjust the URL to handle batch deletion
                        method: 'DELETE',
                        jsonData: {ids: fileIds}, // Send the IDs in the request body
                        success: function (response) {
                            var data = Ext.decode(response.responseText);
                            if (data.success) {
                                me.getStore().remove(selection); // Remove selected records from the store
                                Ext.Msg.alert('Success', 'Files/Folders deleted successfully.');
                            } else {
                                Ext.Msg.alert('Error', 'Failed to delete the files: ' + data.message);
                            }
                        },
                        failure: function (response) {
                            Ext.Msg.alert('Error', 'Server error: ' + response.statusText);
                        }
                    });
                }
            });
        } else {
            Ext.Msg.alert('Warning', 'Please select files to delete.');
        }
    },

    onRenameFile: function () {
        var me = this;
        var selection = me.getSelectionModel().getSelection()[0];

        if (selection) {
            Ext.Msg.prompt('Rename', 'Enter new name:', function (btn, newName) {
                if (btn === 'ok' && newName) {
                    Ext.Ajax.request({
                        url: 'http://localhost:5000/api/files/rename',
                        method: 'POST',
                        jsonData: {
                            itemId: selection.get('_id'),
                            newName: newName,
                            isFolder: selection.get('isFolder')
                        },
                        success: function(response) {
                            Ext.Msg.alert('Success', 'File/Folder renamed successfully.');
                            const store = this.getStore();
                            if (store) {
                                store.reload();
                            }
                        },
                        failure: function(response) {
                            Ext.Msg.alert('Error', 'Failed to rename file/folder');
                        },
                        scope: this // Preserve the context
                    });
                }
            }, this)
        }
    },

    onFileDoubleClick: function (record) {
        var fileType = record.get('mimetype');
        var filePath = record.get('_id');
        var fileName = record.get('name');

        if (fileType.startsWith('image/')) {
            this.openImageViewer(`http://localhost:5000/api/files/view/${filePath}`);
        } else if (fileType === 'application/zip') {
            this.openZipViewer(`http://localhost:5000/api/files/view/${filePath}`, fileName);
        } else if (fileType === 'application/pdf') {
            this.openPdfViewer(`http://localhost:5000/api/files/view/${filePath}`, fileName);
        } else if (record.get('isFolder')) {
            this.loadFolderContents(record.get('name'), record.get('_id'));
        } else {
            Ext.Msg.alert('Unsupported File Type', 'The selected file type is not supported for viewing.');
        }
    },

    openImageViewer: function (imagePath) {
        const token = FileManagement.helpers.Functions.getToken(); // Retrieve the token

        // Create the window to display the image
        const imageWindow = Ext.create('Ext.window.Window', {
            title: 'Image Viewer',
            modal: true,
            draggable: true,
            layout: 'fit',
            autoShow: true,
            constrain: true,
            items: [{
                xtype: 'image',
                listeners: {
                    afterrender: async function (img) {
                        try {
                            // Fetch the image with the Authorization header
                            const response = await fetch(imagePath, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if (!response.ok) throw new Error('Failed to load image');

                            // Convert the response to a blob and set it as the source
                            const blob = await response.blob();
                            const objectURL = URL.createObjectURL(blob);
                            img.setSrc(objectURL);

                            const image = new Image();
                            image.src = objectURL;
                            image.onload = () => {
                                var naturalWidth = image.width;
                                var naturalHeight = image.height;

                                console.log('Natural Width:', naturalWidth, 'Natural Height:', naturalHeight);

                                // Set the window size to the image's natural dimensions
                                imageWindow.setWidth(naturalWidth);
                                imageWindow.setHeight(naturalHeight);

                                // Get screen dimensions
                                var screenWidth = window.innerWidth;
                                var screenHeight = window.innerHeight;

                                // Set maximum dimensions based on screen size
                                imageWindow.setMaxWidth(screenWidth * 0.9); // 90% of screen width
                                imageWindow.setMaxHeight(screenHeight * 0.9); // 90% of screen height

                                // Set minimum dimensions
                                imageWindow.setMinWidth(300);   // Minimum width
                                imageWindow.setMinHeight(200);   // Minimum height

                                // Show the window and center it
                                imageWindow.show();
                                imageWindow.center();
                            };

                        } catch (error) {
                            Ext.Msg.alert('Error', 'Failed to load the image.');
                            imageWindow.close(); // Close the window if image loading fails
                        }
                    }
                }
            }],
            listeners: {
                close: function () {
                    this.destroy(); // Clean up the window on close
                }
            }
        });
    },

    openZipViewer: async function(zipFilePath, zipFileName) {
        const token = FileManagement.helpers.Functions.getToken(); // Retrieve the token

        try {
            const response = await fetch(zipFilePath, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Network response was not ok');
            const zipData = await response.arrayBuffer();

            const zip = await JSZip.loadAsync(zipData);
            this.currentZip = zip;
            this.zipStack = [];
            this.processZipEntries(zip, zipFileName);
        } catch (error) {
            Ext.Msg.alert('Error', `Failed to load the zip file: ${error.message}`);
        }
    },

    processZipEntries: function(zip, parentPath) {
        var me = this;
        var fileList = [];

        zip.forEach(function(relativePath, zipEntry) {
            if (zipEntry.dir) {
                // Skip directories
                return;
            }

            fileList.push(zipEntry.name); // Collect file names
        });

        // After processing all entries, display the contents
        me.showZipContents(fileList, parentPath, zip);
    },

    showZipContents: function(fileList, parentPath, zip) {
        var me = this;

        // Create a new window to display the zip contents if it doesn't exist or has been closed
        if (!me.zipWindow || !me.zipWindow.isVisible()) {
            me.zipWindow = Ext.create('Ext.window.Window', {
                title: 'Zip File Contents', // Initial title
                modal: true,
                layout: 'fit',
                width: 400,
                height: 300,
                items: [{
                    xtype: 'gridpanel',
                    store: {
                        fields: ['name'],
                        data: [] // Initialize with empty data
                    },
                    columns: [
                        { text: 'File Name', dataIndex: 'name', flex: 1 }
                    ],
                    tbar: [ // Add a toolbar for the Go Back button and search field
                        {
                            xtype: 'button',
                            iconCls: 'fa fa-arrow-left', // Use Font Awesome icon class
                            tooltip: 'Go Back',
                            handler: function() {
                                // Clear the search field
                                var searchField = this.up('toolbar').down('textfield'); // Get the search field
                                searchField.setValue(''); // Clear the search field

                                // Pop the last zip from the stack
                                var previousZip = me.zipStack.pop();
                                // Show the previous zip contents
                                if (previousZip) {
                                    me.processZipEntries(previousZip, parentPath);
                                } else {
                                    this.hide(); // Hide the button if there are no previous zips
                                }
                            }
                        },
                        {
                            xtype: 'textfield',
                            emptyText: 'Search by file name...',
                            listeners: {
                                change: function(field, newValue) {
                                    var grid = field.up('gridpanel');
                                    var store = grid.getStore();

                                    // Clear any existing filters
                                    store.clearFilter();

                                    // Apply the new filter
                                    if (newValue) {
                                        store.filterBy(function(record) {
                                            // Assuming 'name' is the field you want to search
                                            return record.get('name').toLowerCase().includes(newValue.toLowerCase());
                                        });
                                    }
                                }
                            }
                        }
                    ],
                    listeners: {
                        itemdblclick: function(grid, record) {
                            var fileName = record.get('name');
                            var zipEntry = zip.file(fileName); // Get the zip entry

                            // Check if the entry is a zip file
                            if (zipEntry && fileName.endsWith('.zip')) {
                                // Load the inner zip file
                                zipEntry.async('arraybuffer').then(function(innerZipData) {
                                    // Use JSZip to read the inner zip file
                                    JSZip.loadAsync(innerZipData).then(function(innerZip) {
                                        // Push the current zip onto the stack
                                        me.zipStack.push(zip);
                                        // Process inner zip entries
                                        me.processZipEntries(innerZip, fileName);
                                    }).catch(function(err) {
                                        Ext.Msg.alert('Error', 'Failed to read the inner zip file: ' + err.message);
                                    });
                                });
                            } else {
                                Ext.Msg.alert('Info', 'This file is not a zip file: ' + fileName);
                            }
                        }
                    }
                }],
                buttons: [{
                    text: 'Close',
                    handler: function() {
                        me.zipWindow.close();
                    }
                }]
            });
        }

        // Update the grid store with the new file list
        me.zipWindow.down('gridpanel').getStore().loadData(fileList.map(function(name) { return { name: name }; }));

        // Update the title to reflect the name of the currently opened zip file
        me.zipWindow.setTitle('Contents of: ' + parentPath); // Set the title to the name of the zip file

        // Show or hide the Go Back button based on the stack
        var goBackButton = me.zipWindow.down('toolbar').items.getAt(0); // Get the Go Back button
        if (me.zipStack.length > 0) {
            goBackButton.show(); // Show the button if there is a previous zip
        } else {
            goBackButton.hide(); // Hide the button if there are no previous zips
        }

        // Show the zip window
        me.zipWindow.show();
    },

    openPdfViewer: function (fileUrl, fileName) {
        // Validate file URL
        if (!fileUrl) {
            console.error('Invalid file URL');
            return;
        }

        // Create the PDF viewer panel using the custom Ext.ux.PDFViewer component
        const pdfViewerPanel = Ext.create('FileManagement.components.viewers.PDFViewer', {
            src: fileUrl,
            title: fileName || 'PDF Viewer',
            showFileName: true,
            loadingText: 'I am receiving the file'
        });

        // Create a window to display the PDF viewer
        const pdfWindow = Ext.create('Ext.window.Window', {
            title: 'PDF Viewer: ' + fileName,
            modal: true,
            width: 800,
            height: 600,
            layout: 'fit',
            items: [pdfViewerPanel],
            listeners: {
                close: function () {
                    pdfViewerPanel.destroy();
                }
            }
        });

        // Show the window
        pdfWindow.show();
    },

    // Function to load the contents of a folder
    loadFolderContents: function(folderName, folderId, pushToPath = true) {
        // Only push the folder to currentFolderPath if explicitly allowed
        if (folderName !== null && folderId !== this.currentFolderId && pushToPath) {
            this.currentFolderPath.push({ name: folderName, id: folderId });
        }

        this.currentFolder = this.currentFolderPath.map(segment => segment.name).join('/') || '';
        this.currentFolderId = folderId ?? null;

        console.log(this.currentFolderId);

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
    }

});