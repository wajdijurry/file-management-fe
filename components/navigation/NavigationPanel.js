Ext.define('FileManagement.components.navigation.NavigationPanel', {
    extend: 'Ext.panel.Panel',
    xtype: 'navigationpanel',
    id: 'navigationpanel',
    title: 'Navigation Panel',
    layout: 'fit',
    collapsible: true,

    requires: [
        'FileManagement.components.stores.PanelListStore'
    ],

    initComponent: function() {
        // Initialize the store
        this.panelListStore = Ext.create('FileManagement.components.stores.PanelListStore');

        Ext.apply(this, {
            items: [
                {
                    xtype: 'dataview',
                    itemId: 'panelList',
                    bind: {
                        store: '{panelListStore}' // Use the store initialized above
                    },
                    itemTpl: '{title}',
                    listeners: {
                        itemclick: function(view, record) {
                            const panel = record.get('panelRef');
                            if (panel) {
                                panel.getEl().setStyle('z-index', ++window.highestZIndex);
                            }
                        }
                    }
                }
            ],
        });

        this.callParent();
    },

    refreshPanelList: function() {
        const mainPanelRegion = Ext.getCmp('mainPanelRegion');
        const panelList = this.down('#panelList');
        const store = panelList.getStore();

        if (!mainPanelRegion) {
            return;
        }

        // Convert `mainPanelRegion.items` to an array using `getRange()`

        const visiblePanels = mainPanelRegion.items.getRange().filter(panel => panel.isVisible());

        console.log(visiblePanels);

        // Map over the array of visible panels to create data objects
        const data = visiblePanels.map(panel => ({
            id: panel.getId(),
            title: panel.title || 'Untitled Panel',
            panelRef: panel
        }));

        store.loadData(data);
    }
});
