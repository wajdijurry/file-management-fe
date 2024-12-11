Ext.define('FileManagement.components.utils.KeyboardShortcuts', {
    singleton: true,

    // List of available keyboard shortcuts
    shortcuts: {
        quickSearch: {
            key: 'Space',
            modifier: 'Ctrl',
            description: 'Open Quick Search'
        },
        switchPanels: {
            key: 'Q',
            modifier: 'Alt',
            description: 'Switch between panels'
        }
        // Add other shortcuts here as needed
    },

    init: function() {
        // Add keyboard event listener
        Ext.getBody().on('keydown', this.handleKeyDown, this);
    },

    handleKeyDown: function(e) {
        // Ctrl + Space for Quick Search
        if (e.ctrlKey && e.getKey() === e.SPACE) {
            e.preventDefault(); // Prevent default browser behavior
            this.showQuickSearch();
        }

        // Alt + Q for switching panels
        if (e.altKey && e.getKey() === e.Q) {
            e.preventDefault();
            this.switchPanels();
        }
    },

    showQuickSearch: function() {
        let quickSearch = Ext.ComponentQuery.query('quicksearch')[0];
        
        if (!quickSearch) {
            quickSearch = Ext.create('FileManagement.components.search.QuickSearch', {
                listeners: {
                    itemselected: function(record) {
                        // Handle navigation to the selected item
                        const grid = Ext.ComponentQuery.query('filegrid')[0];
                        if (!grid) return;

                        if (record.get('isFolder')) {
                            // Navigate to folder
                            const parentId = record.get('parent_id');
                            if (parentId) {
                                grid.navigateToFolder(record.get('id'), record.get('name'));
                            }
                        } else {
                            // Open file
                            grid.handleItemDblClick(record);
                        }
                    }
                }
            });
        }

        quickSearch.showSearch();
    },

    showShortcutsWindow: function() {
        // Convert shortcuts object to grid data
        const shortcutsData = Object.values(this.shortcuts).map(shortcut => ({
            shortcut: shortcut.modifier + '+' + shortcut.key,
            description: shortcut.description
        }));

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
                        data: shortcutsData
                    }
                }
            ],
            buttons: [
                {
                    text: 'Close',
                    handler: function() {
                        this.up('window').close();
                    }
                }
            ]
        }).show();
    },

    switchPanels: function() {
        // TO DO: implement switching panels logic
    }
});
