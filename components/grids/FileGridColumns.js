// components/FileGridColumns.js
Ext.define('FileManagement.components.grids.FileGridColumns', {
    extend: 'Ext.grid.column.Column',
    xtype: 'filegridcolumns',

    statics: {
        getColumns: function() {
            return [
                {
                    text: 'Select',
                    xtype: 'checkcolumn',
                    dataIndex: 'selected',
                    width: 50
                },
                { text: 'Filename', dataIndex: 'filename', flex: 1 },
                { text: 'Size (bytes)', dataIndex: 'size', flex: 1 },
                {
                    text: 'Download',
                    renderer: function(value, metaData, record) {
                        return `<a href="http://localhost:5000/uploads/${record.data.filename}" target="_blank">Download</a>`;
                    }
                },
                {
                    text: 'Delete',
                    xtype: 'actioncolumn',
                    width: 100,
                    items: FileManagement.view.FileGridActions.getDeleteAction()
                }
            ];
        }
    }
});