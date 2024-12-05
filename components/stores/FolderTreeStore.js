Ext.define('FileManagement.components.stores.FolderTreeStore', {
    extend: 'Ext.data.TreeStore',
    alias: 'store.foldertreestore',

    model: 'FileManagement.components.models.Folder', // Refer to the Folder model

    proxy: {
        type: 'ajax', // Use AJAX to fetch data from the backend
        url: 'http://localhost:5000/api/files/folders/tree', // Backend API endpoint
        reader: {
            type: 'json', // Parse JSON response
            rootProperty: 'folders' // Match the backend's "folders" property
        }
    },

    root: {
        id: "root",
        text: "root",
        expanded: true,
        parentId: null,
        leaf: false,
        children: [],
    },

    rootVisible: true,

    nodeParam: 'id', // Query parameter for the parent node ID
    defaultRootId: null, // Match the root ID for consistency with the backend
    autoLoad: true, // Explicitly control data loading
    lazyFill: true, // Load children on demand
    listeners: {
        beforeload: function (store, operation) {
            const node = operation.node;
            const parentId = node.getId() || 'root'; // Use 'root' if parentId is undefined
            store.getProxy().setExtraParams({ parentId }); // Dynamically set parentId
        },
        load: function (store, records, successful, operation) {
            if (successful) {
                console.log('Loaded records:', records);
            } else {
                console.error('Failed to load tree data');
            }
        }
    }
});
