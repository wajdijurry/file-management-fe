Ext.define('FileManagement.components.search.QuickSearch', {
    extend: 'Ext.window.Window',
    xtype: 'quicksearch',

    title: 'Quick Search',
    width: 500,
    height: 400,
    layout: 'fit',
    floating: true,
    draggable: true,
    resizable: false,
    modal: true,
    closable: true,
    closeAction: 'hide',
    cls: 'quick-search-window',
    bodyStyle: {
        background: '#fff'
    },

    // Custom styling for modal mask
    modalConfig: {
        opacity: 0.3
    },

    // Center in viewport
    x: undefined,
    y: undefined,

    initComponent: function() {
        var me = this;

        // Create the store for search results
        me.store = Ext.create('Ext.data.Store', {
            fields: [
                'id',
                'name',
                'path',
                'type',
                'size',
                'createdAt',
                'isFolder',
                'isPasswordProtected',
                'parent_id'
            ],
            proxy: {
                type: 'ajax',
                url: 'http://localhost:5000/api/files/search',
                reader: {
                    type: 'json',
                    rootProperty: 'results'
                }
            }
        });

        me.items = [{
            xtype: 'panel',
            layout: 'border',
            cls: 'quick-search-panel',
            items: [{
                xtype: 'textfield',
                region: 'north',
                fieldLabel: 'Search',
                labelWidth: 50,
                padding: '10 10 5 10',
                cls: 'quick-search-field',
                emptyText: 'Type to search files and folders...',
                enableKeyEvents: true,
                listeners: {
                    keyup: {
                        buffer: 300,
                        fn: function(field) {
                            const query = field.getValue();
                            if (query.length >= 2) {
                                me.store.load({
                                    params: { query: query }
                                });
                            } else {
                                me.store.removeAll();
                            }
                        }
                    },
                    specialkey: function(field, e) {
                        if (e.getKey() === e.ESC) {
                            me.hide();
                        }
                    }
                }
            }, {
                xtype: 'grid',
                region: 'center',
                store: me.store,
                cls: 'quick-search-grid',
                viewConfig: {
                    stripeRows: true,
                    enableTextSelection: true
                },
                columns: [{
                    text: 'Name',
                    dataIndex: 'name',
                    flex: 2,
                    renderer: function(value, meta, record) {
                        const iconClass = record.get('isFolder') ? 'fa fa-folder' : 
                            FileManagement.components.utils.IconUtil.getIconForMimetype(record.get('type'));
                        return `<i class="${iconClass}" style="margin-right: 5px;"></i> ${Ext.String.htmlEncode(value)}`;
                    }
                }, {
                    text: 'Path',
                    dataIndex: 'path',
                    flex: 2
                }, {
                    text: 'Type',
                    dataIndex: 'type',
                    width: 100
                }],
                listeners: {
                    itemdblclick: function(grid, record) {
                        me.hide();
                        me.fireEvent('itemselected', record);
                    }
                }
            }]
        }];

        me.callParent(arguments);
    },

    showSearch: function() {
        const viewport = Ext.ComponentQuery.query('viewport')[0];
        if (!viewport) return;

        // Position in the center of the viewport
        const box = viewport.getBox();
        this.setPosition(
            box.x + (box.width - this.width) / 2,
            box.y + (box.height - this.height) / 2
        );

        this.show();
        
        // Focus the search field
        const searchField = this.down('textfield');
        if (searchField) {
            searchField.focus(true, 100);
        }
    }
});
