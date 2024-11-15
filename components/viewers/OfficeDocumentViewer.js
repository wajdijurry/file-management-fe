// OfficeDocumentViewer.js
Ext.define('FileManagement.components.viewers.OfficeDocumentViewer', {
    extend: 'Ext.window.Window',
    xtype: 'officedocumentviewer',

    config: {
        src: null
    },

    title: 'Office Document Viewer',
    modal: true,
    layout: 'fit',
    width: 800,
    height: 600,
    constrain: true,

    initComponent: function() {
        const filePath = this.getSrc();
        const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(filePath)}&embedded=true`;

        this.items = [{
            xtype: 'component',
            autoEl: { tag: 'iframe', src: viewerUrl, style: 'width: 100%; height: 100%; border: none;' }
        }];

        this.callParent();
        this.show();
    }
});
