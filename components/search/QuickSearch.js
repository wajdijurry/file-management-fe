Ext.define('FileManagement.components.search.QuickSearch', {
    extend: 'Ext.panel.Panel',
    xtype: 'quicksearch',
    requires: [
        'FileManagement.components.stores.FileGridStore'
    ],

    title: 'Quick Search',
    width: 500,
    height: 400,
    layout: 'fit',
    floating: true,
    draggable: true,
    resizable: false,
    frame: true,
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

        // Initialize the store
        me.store = Ext.create('FileManagement.components.stores.FileGridStore', {
            autoLoad: false,
            fields: [
                { name: 'id', type: 'string' },
                { name: 'name', type: 'string' },
                { name: 'path', type: 'string' },
                { name: 'type', type: 'string' },
                { name: 'mimetype', type: 'string' },
                {
                    name: 'icon',
                    type: 'string',
                    convert: function(value, record) {
                        let mimeType = record.get('type');
                        let iconClass = 'fa fa-xl'; // Base class

                        if (record.get('isFolder')) {
                            iconClass += ' fa-folder'; // Folder icon
                        } else {
                            switch (mimeType) {
                                case 'application/pdf':
                                    iconClass += ' fa-file-pdf red-icon';
                                    break;
                                case 'image/jpeg':
                                case 'image/png':
                                case 'image/avif':
                                    iconClass += ' fa-image green-icon';
                                    break;
                                case 'doc':
                                    iconClass += ' icon-doc blue-icon';
                                    break;
                                case 'application/zip':
                                    iconClass += ' fa-file-archive yellow-icon';
                                    break;
                                case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                                case 'application/msword':
                                    iconClass += ' fa-duotone fa-solid fa-file-word blue-icon';
                                    break;
                                case 'application/vnd.ms-powerpoint':
                                case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
                                    iconClass += ' fa-duotone fa-solid fa-file-ppt';
                                    break;
                                case 'text/plain':
                                    iconClass += ' fa-duotone fa-solid fa-file-lines';
                                    break;
                                default:
                                    iconClass += ' fa-duotone fa-solid fa-file';
                            }
                        }

                        if (record.get('isPasswordProtected')) {
                            iconClass += ' fa-lock';
                        }

                        return iconClass;
                    }
                },
                { name: 'size', type: 'number' },
                { name: 'createdAt', type: 'date' },
                { name: 'isFolder', type: 'boolean' },
                { name: 'isPasswordProtected', type: 'boolean' },
                { name: 'parent_id', type: 'string' },
                { 
                    name: 'parentPath',
                    convert: function(v, record) {
                        const path = record.get('path') || '';
                        // Extract the last part of the path (after the last userId occurrence)
                        const parts = path.split('/');
                        const userIdIndex = parts.findIndex(part => /^[0-9a-f]{24}$/i.test(part));
                        
                        if (userIdIndex !== -1) {
                            // Get only the parts after userId
                            const relevantParts = parts.slice(userIdIndex + 1, -1);
                            return relevantParts.length ? '/' + relevantParts.join('/') : '/';
                        }
                        return '/';
                    }
                }
            ],
            groupField: 'parentPath',
            proxy: {
                type: 'ajax',
                url: 'http://localhost:5000/api/files/search',
                headers: {
                    'Authorization': `Bearer ${FileManagement.helpers.Functions.getToken()}`
                },
                reader: {
                    type: 'json',
                    rootProperty: 'results'
                }
            },
            listeners: {
                load: function(store, records) {
                    console.log('Search results:', records.map(r => r.data));
                }
            }
        });

        me.items = [{
            xtype: 'panel',
            layout: 'border',
            cls: 'quick-search-panel',
            border: false,
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
                            const query = field.getValue().trim();
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
                border: true,
                loadMask: true,
                disableSelection: false,
                viewConfig: {
                    stripeRows: true,
                    enableTextSelection: true,
                    deferEmptyText: false,
                    emptyText: 'No results found',
                    preserveScrollOnRefresh: true,
                    loadMask: true
                },
                features: [{
                    ftype: 'grouping',
                    groupHeaderTpl: [
                        '{name:this.formatGroup}',
                        {
                            formatGroup: function(name) {
                                // Remove any userId from the group name
                                const cleanPath = name.replace(/\/[0-9a-f]{24}\/?/gi, '/');
                                return cleanPath === '/' ? 'Root Directory' : 'Directory: ' + cleanPath;
                            }
                        }
                    ],
                    startCollapsed: false
                }],
                columns: {
                    defaults: {
                        menuDisabled: true,
                        sortable: false
                    },
                    items: [
                        {
                            text: 'Name',
                            dataIndex: 'name',
                            flex: 2,
                            renderer: function(value, meta, record) {
                                return `<i class="${record.get('icon')}" style="margin-right: 5px;"></i>${Ext.String.htmlEncode(value)}`;
                            }
                        },
                        {
                            text: 'Size',
                            dataIndex: 'size',
                            width: 100,
                            renderer: function(value) {
                                if (!value) return '';
                                if (value < 1024) return `${value} B`;
                                if (value < 1024 * 1024) return `${(value / 1024).toFixed(2)} KB`;
                                if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(2)} MB`;
                                return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
                            }
                        },
                        {
                            text: 'Type',
                            dataIndex: 'type',
                            width: 100,
                            renderer: function(value, meta, record) {
                                return record.get('isFolder') ? 'Folder' : record.get('type') || 'Unknown';
                            }
                        },
                        {
                            text: 'Created',
                            dataIndex: 'createdAt',
                            width: 150,
                            renderer: Ext.util.Format.dateRenderer('Y-m-d H:i:s')
                        }
                    ]
                },
                listeners: {
                    itemdblclick: function(grid, record) {
                        me.hide();
                        me.fireEvent('itemselected', record);
                    },
                    viewready: function(grid) {
                        // do nothing
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

        // Clear previous results
        if (this.store) {
            this.store.removeAll();
        }
    }
});
