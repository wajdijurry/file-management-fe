// OfficeDocumentViewer.js
Ext.define('FileManagement.components.viewers.OfficeDocumentViewer', {
    extend: 'Ext.panel.Panel',
    xtype: 'officedocumentviewer',

    config: {
        src: null
    },

    title: 'Office Document Viewer',
    layout: 'fit',
    closable: true,
    frame: true,
    modal: true,

    width: 600, // Set a fixed width
    height: 400, // Set a fixed height
    x: 220,
    y: 220,
    style: {
        zIndex: ++window.highestZIndex,
    },

    draggable: {
        onMouseUp: function() {
            FileManagement.components.utils.PanelUtils.onMouseUp(this.panel);
        }
    },

    resizable: {
        constrain: true, // Enable constraint within a specified element
        dynamic: true, // Updates size dynamically as resizing
        minHeight: 300,
        minWidth: 450,
    },

    header: {
        listeners: {
            dblclick: function (header) {
                const panel = header.up('panel');
                FileManagement.components.utils.PanelUtils.toggleMaximize(panel);
            }
        }
    },

    tools: [
        {
            type: 'maximize',
            handler: function () {
                const panel = this.up('panel');
                if (panel && !panel.maximized) {
                    FileManagement.components.utils.PanelUtils.maximizePanel(panel);
                } else if (panel) {
                    FileManagement.components.utils.PanelUtils.minimizePanel(panel);
                }
            }
        }
    ],

    initComponent: function () {
        const filePath = this.getSrc();
        const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(filePath)}&embedded=true`;

        // Add an iframe for document viewing
        this.items = [{
            xtype: 'component',
            autoEl: { tag: 'iframe', src: viewerUrl, style: 'width: 100%; height: 100%; border: none;' }
        }];

        this.callParent(arguments);
    }
});
