Ext.define('FileManagement.components.models.Folder', {
    extend: 'Ext.data.TreeModel',
    alias: 'Folder',

    fields: [
        { name: 'id', type: 'string', allowNull: true, allowBlank: true }, // The folder ID from the backend
        { name: 'text', type: 'string' }, // The folder name
        { name: 'expanded', type: 'boolean', defaultValue: false }, // Expanded state
        { name: 'leaf', type: 'boolean', defaultValue: false }, // Whether it's a leaf node
        { name: 'iconCls', type: 'string', defaultValue: 'fa fa-solid fa-folder' },
    ],
    idProperty: 'id' // Use the backend's `id` field as the unique identifier
});
