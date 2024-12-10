Ext.define('FileManagement.components.dialogs.ExtractionDialog', {
    extend: 'Ext.window.Window',
    alias: 'widget.extractiondialog',

    requires: [
        'FileManagement.components.stores.FolderTreeStore'
    ],

    title: 'Select Extraction Location',
    modal: true,
    width: 400,
    height: 500,
    layout: 'fit',
    
    config: {
        file: null,
        onSuccess: null
    },

    initComponent: function() {
        const dialog = this;

        this.items = [{
            xtype: 'treepanel',
            store: Ext.create('FileManagement.components.stores.FolderTreeStore'),
            listeners: {
                itemcontextmenu: function(view, record, item, index, e) {
                    e.stopEvent();
                    
                    Ext.create('Ext.menu.Menu', {
                        items: [{
                            text: 'Create New Folder',
                            iconCls: 'fa fa-folder',
                            handler: function() {
                                Ext.Msg.prompt('New Folder', 'Enter folder name:', function(btn, folderName) {
                                    if (btn === 'ok' && folderName) {
                                        const token = FileManagement.helpers.Functions.getToken();
                                        const parentId = record.get('id') === 'root' ? null : record.get('id');
                                        
                                        Ext.Ajax.request({
                                            url: 'http://localhost:5000/api/files/create-folder',
                                            method: 'POST',
                                            headers: {
                                                'Authorization': `Bearer ${token}`,
                                                'Content-Type': 'application/json'
                                            },
                                            jsonData: {
                                                name: folderName,
                                                parentId: parentId
                                            },
                                            success: function(response) {
                                                view.getStore().load();
                                            },
                                            failure: function(response) {
                                                let responseJSON = JSON.parse(response.responseText);
                                                Ext.Msg.alert('Error', 'Failed to create folder: ' + responseJSON.error);
                                            }
                                        });
                                    }
                                });
                            }
                        }]
                    }).showAt(e.getXY());
                }
            }
        }];

        this.buttons = [{
            text: 'Extract Here',
            handler: function() {
                const tree = dialog.down('treepanel');
                const selectedNode = tree.getSelection()[0];
                if (selectedNode) {
                    dialog.extractToFolder(selectedNode);
                } else {
                    Ext.Msg.alert('Error', 'Please select a destination folder');
                }
            }
        }, {
            text: 'Cancel',
            handler: function() {
                dialog.close();
            }
        }];

        this.callParent(arguments);
    },

    extractToFolder: function(folderNode) {
        const dialog = this;
        const file = this.getFile();
        
        FileManagement.components.utils.DecompressionUtil.decompressFile({
            filePath: file.get('path'),
            parentId: folderNode.get('id') === 'root' ? null : folderNode.get('id'),
            onSuccess: function(response) {
                dialog.close();
                if (dialog.getOnSuccess()) {
                    dialog.getOnSuccess()(response);
                }
            }
        });
    }
});
