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
                '->', // Pushes the logout button to the right
                {
                    xtype: 'button',
                    text: 'Logout',
                    iconCls: 'fa fa-sign-out',
                    handler: function() {
                        Ext.Msg.confirm('Confirm Logout', 'Are you sure you want to log out?', function(choice) {
                            if (choice === 'yes') {
                                localStorage.removeItem('token');
                                localStorage.removeItem('username');
                                sessionStorage.removeItem('token');
                                sessionStorage.removeItem('username');
                                location.reload();
                            }
                        });
                    }
                }
            ]
        });

        this.callParent(arguments);
    }
});
