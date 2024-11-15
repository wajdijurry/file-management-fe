// PDFViewer.js
Ext.define('FileManagement.components.viewers.PDFViewer', {
    extend: 'Ext.window.Window',
    xtype: 'pdfviewer',

    config: {
        src: null,
        fileName: null
    },

    title: 'PDF Viewer',
    modal: true,
    layout: 'fit',
    width: 800,
    height: 600,
    constrain: true,
    closable: true,

    initComponent: function() {
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

    loadPdfContent: async function() {
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

            this.center(); // Center the window on the screen
            this.show();
        } catch (error) {
            Ext.Msg.alert('Error', 'Failed to load the PDF file: ' + error.message);
            this.close();
        }
    }
});
