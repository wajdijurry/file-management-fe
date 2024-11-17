Ext.define('FileManagement.components.navigation.UserToolbar', {
    extend: 'Ext.toolbar.Toolbar',
    xtype: 'userToolbar',
    id: 'userToolbar',
    cls: 'x-toolbar-classic',
    style: { position: 'sticky', bottom: 0, zIndex: 1000 },

    initComponent: function() {
        const username = sessionStorage.getItem('username') || localStorage.getItem('username');

        Ext.apply(this, {
            items: [
                {
                    xtype: 'tbtext',
                    text: `Welcome, ${username}` // Display username on the left
                },
                {
                    xtype: 'tbseparator'
                },
                {
                    xtype: 'button',
                    text: 'Files Explorer',
                    iconCls: 'fa fa-folder-open fa-2xs',
                    enableToggle: true,
                    toggleHandler: function(button, pressed) {
                        const mainPanelRegion = Ext.getCmp('mainPanelRegion');

                        if (pressed) {
                                const fileGridStore = Ext.create('FileManagement.components.stores.FileGridStore');
                                let fileGridPanel = Ext.create('FileManagement.components.grids.FileGrid', {
                                    xtype: 'filegrid',
                                    store: fileGridStore,
                                    x: 210,
                                    y: 250,
                                    title: 'File Grid Panel',
                                    refBottomToolbarButton: button,
                                    currentFolderPath: [],
                                    currentFolder: null,
                                    currentFolderId: null
                                });
                                mainPanelRegion.add(fileGridPanel);
                        } else {
                            // Destroy the panel if it exists when toggling off
                            let fileGridPanel = Ext.ComponentQuery.query('filegrid')[0];

                            if (fileGridPanel) {
                                fileGridPanel.destroy();
                            }
                        }
                    }
                },
                {
                    xtype: 'button',
                    text: 'K-Shortcuts',
                    iconCls: 'fa fa-regular fa-keyboard',
                    handler: function() {
                        // Show the keyboard shortcuts window
                        Ext.create('Ext.window.Window', {
                            title: 'Keyboard Shortcuts',
                            modal: true,
                            width: 400,
                            height: 300,
                            layout: 'fit',
                            items: [
                                {
                                    xtype: 'grid',
                                    columns: [
                                        { text: 'Shortcut', dataIndex: 'shortcut', flex: 1 },
                                        { text: 'Description', dataIndex: 'description', flex: 2 }
                                    ],
                                    store: {
                                        fields: ['shortcut', 'description'],
                                        data: [
                                            { shortcut: 'Alt+Q', description: 'Switch between panels' }
                                        ]
                                    }
                                }
                            ],
                            buttons: [
                                {
                                    text: 'Close',
                                    handler: function(button) {
                                        button.up('window').close();
                                    }
                                }
                            ]
                        }).show();
                    }
                },
                {
                    xtype: 'button',
                    text: 'Logout',
                    iconCls: 'fa fa-sign-out',
                    handler: function() {
                        Ext.Msg.confirm('Confirm Logout', 'Are you sure you want to log out?', function(choice) {
                            if (choice === 'yes') {
                                localStorage.removeItem('token');
                                localStorage.removeItem('username');
                                location.reload();
                            }
                        });
                    }
                },
                '->', // Pushes the logout button to the right
            ]
        });

        this.callParent(arguments);
    }
});
