// components/FileGridStore.js
Ext.define('FileManagement.components.stores.FileGridStore', {
    extend: 'Ext.data.Store',
    autoLoad: true, // Automatically load the store on initialization
    xtype: "fileGridStore",
    proxy: {
        type: 'ajax',
        url: 'http://localhost:5000/api/files', // Update with your API endpoint to fetch files
        reader: {
            type: 'json',
            rootProperty: 'files' // Adjust according to your API response structure
        }
    },

    listeners: {
        load: function(store, records, successful, operation) {
            if (successful) {
                console.log('Files loaded:', records);
            } else {
                console.error('Failed to load files:', operation.getError());
            }
        }
    }
});