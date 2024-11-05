// Helper to retrieve Bearer token
Ext.define('FileManagement.helpers.Functions', {
    singleton: true,

    getToken: function () {
        return localStorage.getItem('token');
    }
});
