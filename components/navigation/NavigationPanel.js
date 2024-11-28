Ext.define('FileManagement.components.navigation.NavigationPanel', {
    extend: 'Ext.panel.Panel',
    xtype: 'navigationpanel',
    id: 'navigationpanel',
    title: 'Navigation Panel',
    layout: 'fit',
    collapsible: true,

    minWidth: 200,
    maxWidth: 300,

    requires: [
        'FileManagement.components.stores.PanelListStore'
    ],

    initComponent: function() {
        // Initialize the store
        const panelListStore = Ext.create('FileManagement.components.stores.PanelListStore');

        Ext.apply(this, {
            items: [
                {
                    xtype: 'dataview',
                    itemId: 'panelList',
                    bind: {
                        store: panelListStore // Use the store initialized above
                    },
                    itemTpl: '{title}',
                    listeners: {
                        itemclick: function(view, record) {
                            const panels = Ext.getCmp('mainPanelRegion').items.getRange();

                            for (const panel of panels) {
                                if (panel.id === record.get('panelRef').id) {
                                    panel.getEl().setStyle('z-index', ++window.highestZIndex);
                                    panel.removeCls('grayed-out');
                                    panel.addCls('active-panel');
                                    continue;
                                }

                                panel.addCls('grayed-out');
                                panel.removeCls('active-panel');
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

        new Ext.util.DelayedTask(function(){
            const visiblePanels = mainPanelRegion.items.getRange().filter(
                panel => panel.isVisible() && panel.itemId !== 'snapassist'
            );

            // Map over the array of visible panels to create data objects
            const data = visiblePanels.map(panel => ({
                id: panel.getId(),
                title: panel.title || 'Untitled Panel',
                panelRef: panel
            }));

            store.loadData(data);
        }).delay(100);
    }
});
