Ext.define('FileManagement.components.utils.KeyboardShortcuts', {
    singleton: true,

    init: function() {
        // Add keyboard event listener
        Ext.getBody().on('keydown', this.handleKeyDown, this);
    },

    handleKeyDown: function(e) {
        // Alt + G for Quick Search
        if (e.altKey && e.getKey() === e.G) {
            e.preventDefault(); // Prevent default browser behavior
            this.showQuickSearch();
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
    }
});
