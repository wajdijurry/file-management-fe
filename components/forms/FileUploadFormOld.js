Ext.define('FileManagement.components.forms.FileUploadFormOld', {
    extend: 'Ext.form.Panel',
    xtype: 'fileuploadform',
    title: 'Upload Files',
    bodyPadding: 10,
    frame: true,
    closable: true,

    titleAlign: 'left',
    width: 300,
    height: 100,

    listeners: {
        click: {
            element: 'el', // could be 'body', or any other Ext.Elements
                           // that are available from the component
            fn: function() {
                window.highestZIndex += 1;
                this.setStyle('z-index', window.highestZIndex);
            }
        },
        show: function() {
            FileManagement.components.utils.PanelUtils.show(this);
        },
        hide: function() {
            FileManagement.components.utils.PanelUtils.hide(this);
        },
        destroy: function() {
            FileManagement.components.utils.PanelUtils.destroy(this);
        }
    },

    draggable: {
        onMouseUp: function(e) {
            const panel = this.panel;
            FileManagement.components.utils.PanelUtils.onMouseUp(panel);
        }
    },

    items: [
        {
            xtype: 'filefield',
            name: 'files',
            fieldLabel: 'Files',
            labelWidth: 50,
            msgTarget: 'side',
            allowBlank: false,
            anchor: '100%',
            buttonText: 'Select Files...',
            multiple: true, // Allow selecting multiple files
            listeners: {
                afterrender: function (filefield) {
                    filefield.fileInputEl.dom.setAttribute('multiple', 'multiple'); // Set the file input to accept multiple files
                }
            }
        }
    ],

    buttons: [
        {
            text: 'Upload',
            formBind: true,
            disabled: true,
            cls: 'classic-btn', // Keep button styling classic
            handler: function() {
                const extForm = this.up('form');
                const form = extForm.getForm();
                if (form.isValid()) {
                    const files = form.findField('files').fileInputEl.dom.files;
                    const formData = new FormData();

                    // Access the currentFolder value from FileGrid
                    const fileGrid = Ext.ComponentQuery.query('filegrid')[0];
                    if (fileGrid) {
                        formData.append('folder_id', fileGrid.currentFolderId || ''); // Set folder in FormData
                    }

                    // Append all selected files to the FormData
                    Array.from(files).forEach((file) => {
                        formData.append('files', file);
                    });

                    Ext.Ajax.request({
                        url: 'http://localhost:3000/api/files/upload',
                        method: 'POST',
                        rawData: formData, // Use rawData to send FormData directly
                        headers: {
                            'Content-Type': null // Let the browser set the appropriate Content-Type for FormData
                        },
                        success: function(response) {
                            Ext.Msg.alert('Success', 'Your files have been uploaded.');
                            const fileGrid = Ext.ComponentQuery.query('filegrid')[0];
                            if (fileGrid) {
                                fileGrid.getStore().load();
                            }
                            form.reset();
                            extForm.destroy();
                        },
                        failure: function(response) {
                            Ext.Msg.alert('Error', 'Failed to upload files.');
                        }
                    });
                }
            }
        }
    ]
});
