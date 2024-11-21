Ext.define('FileManagement.components.navigation.UserToolbar', {
    extend: 'Ext.toolbar.Toolbar',
    xtype: 'userToolbar',
    id: 'userToolbar',
    cls: 'x-toolbar-classic',
    style: { position: 'sticky', bottom: 0, zIndex: 1000 },

    openedPanels: {},
    index: 3,

    // addPanelToggleButton: (panel, label) => {
    //     const me = this;
    //     // Dynamically add a toggle button for the panel
    //     // Track the panel and its button
    //     me.openedPanels[panel.id] = me.insert(me.index, {
    //         xtype: 'button',
    //         text: label,
    //         enableToggle: true,
    //         pressed: true,
    //         toggleHandler: function (btn, pressed) {
    //             const mainPanelRegion = Ext.getCmp('mainPanelRegion');
    //             if (pressed) {
    //                 mainPanelRegion.setActiveItem(panel); // Activate the panel
    //             } else {
    //                 mainPanelRegion.remove(panel, false); // Deactivate without destroying
    //             }
    //         }
    //     });
    //     panel.on('destroy', () => me.removePanelToggleButton(panel));
    //
    //     me.index++;
    // },

    removePanelToggleButton: (panel) => {
        // Remove the toggle button associated with the panel
        const toggleButton = this.openedPanels[panel.id];
        if (toggleButton) {
            this.remove(toggleButton);
            delete this.openedPanels[panel.id];
        }
    },

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
            ]
        });

        this.addPanelToggleButton = (panel, label, icon) => {
            const me = this;
            // Dynamically add a toggle button for the panel
            // Track the panel and its button
            me.openedPanels[panel.id] = me.insert(me.index, {
                xtype: 'button',
                text: label,
                enableToggle: true,
                pressed: true,
                maxWidth:  150,
                closable: true,
                cls: 'ellipsis',
                iconCls: icon,
                toggleHandler: function (btn, pressed) {
                    const mainPanelRegion = Ext.getCmp('mainPanelRegion');
                    if (pressed) {
                        mainPanelRegion.setActiveItem(panel); // Activate the panel
                    } else {
                        mainPanelRegion.remove(panel, false); // Deactivate without destroying
                        panel.destroy();
                    }
                }
            });
            panel.on('destroy', () => me.removePanelToggleButton(panel));

            me.index++;
        };

        this.removePanelToggleButton = function(panel) {
            // Remove the toggle button associated with the panel
            const toggleButton = this.openedPanels[panel.id];
            if (toggleButton) {
                this.remove(toggleButton);
                delete this.openedPanels[panel.id];
            }

            this.index--;
        }

        this.callParent(arguments);
    }
});
