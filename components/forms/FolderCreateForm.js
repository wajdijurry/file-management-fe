Ext.define('FileManagement.components.forms.FolderCreateForm', {
    extend: 'Ext.form.Panel',
    xtype: 'foldercreateform',
    title: 'Create New Folder',
    frame: true,
    modal: true,
    width: 300,
    height: 100,
    bodyPadding: 10,

    draggable: {
        onMouseUp: function(e) {
            const panel = this.panel;
            FileManagement.components.utils.PanelUtils.onMouseUp(panel);
        }
    },

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

    items: [
        {
            xtype: 'textfield',
            name: 'folderName',
            fieldLabel: 'Folder Name',
            allowBlank: false,
            anchor: '100%',
            emptyText: 'Enter folder name...'
        }
    ],

    buttons: [
        {
            text: 'Create',
            formBind: true,
            disabled: true,
            handler: function() {
                const form = this.up('form').getForm();
                const folderName = form.findField('folderName').getValue();

                if (form.isValid() && folderName) {
                    Ext.Ajax.request({
                        url: 'http://localhost:5000/api/files/create-folder',
                        method: 'POST',
                        jsonData: { name: folderName },
                        success: function(response) {
                            Ext.Msg.alert('Success', 'Folder created successfully.');
                            const fileGrid = Ext.ComponentQuery.query('filegrid')[0];
                            if (fileGrid) fileGrid.getStore().load(); // Reload grid to show the new folder
                            form.reset();
                        },
                        failure: function(response) {
                            Ext.Msg.alert('Error', 'Failed to create folder: ' + response.statusText);
                        }
                    });
                }
            }
        }
    ],

    tools: [
        {
            type: 'close',
            handler: function() {
                const panel = this.up('panel');
                if (panel) {
                    FileManagement.components.utils.PanelUtils.closePanel(panel);
                }
            }
        }
    ],
});
