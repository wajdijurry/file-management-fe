// PDFViewer.js
Ext.define('FileManagement.components.viewers.PDFViewer', {
    extend: 'Ext.panel.Panel',
    xtype: 'pdfviewer',

    config: {
        src: null,
        fileName: null
    },

    title: 'PDF Viewer',
    layout: 'fit',
    closable: true,
    frame: true,
    modal: true,

    cls: "iframe-container",

    width: 600, // Set a fixed width
    height: 400, // Set a fixed height
    x: 220,
    y: 220,

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

    listeners: {
        afterrender: function (panel) {
            // Ensure absolute positioning for free dragging
            const el = panel.getEl();
            if (el) {
                el.setStyle('z-index', ++window.highestZIndex); // Set a base z-index
            }
        }
    },

    initComponent: function () {
        // Initialize the PDF viewer with a placeholder component
        this.items = [{
            xtype: 'container',
            html: 'Loading PDF...',
            style: 'width: 100%; height: 100%; text-align: center; padding-top: 20px;'
        }];

        this.callParent(arguments);

        // Load the PDF content after initialization
        this.loadPdfContent();
    },

    loadPdfContent: async function () {
        const token = FileManagement.helpers.Functions.getToken();
        const fileUrl = this.getSrc();

        try {
            // Fetch the PDF file with the Authorization header
            const response = await fetch(fileUrl, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Failed to load PDF file');

            const blob = await response.blob();
            const objectURL = URL.createObjectURL(blob);

            // Set up the PDF viewer component after loading
            this.removeAll(); // Clear loading placeholder
            this.add({
                xtype: 'component',
                autoEl: {
                    tag: 'iframe',
                    src: objectURL,
                    style: 'width: 100%; height: 100%; border: none;'
                }
            });
        } catch (error) {
            Ext.Msg.alert('Error', 'Failed to load the PDF file: ' + error.message);
            this.close();
        }
    }
});
