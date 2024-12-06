// ViewerFactory.js
Ext.define('FileManagement.components.viewers.ViewerFactory', {
    singleton: true,

    createViewer: function(record) {
        const fileType = record.get('mimetype');
        const filePath = record.get('id');
        const fileName = record.get('name');
        const fileUrl = `http://localhost:5000/api/files/view/${filePath}`;
        const mainPanel = Ext.getCmp('mainPanelRegion');

        let viewer;

        if (fileType.startsWith('image/')) {
            viewer = Ext.create('FileManagement.components.viewers.ImageViewer', {
                src: fileUrl,
                title: `Image: ${fileName}`
            });
        } else if (fileType === 'application/pdf') {
            viewer = Ext.create('FileManagement.components.viewers.PDFViewer', {
                src: fileUrl,
                title: `PDF: ${fileName}`
            });
        } else if (fileType.startsWith('application/vnd') || fileType.includes('msword')) {
            viewer = Ext.create('FileManagement.components.viewers.OfficeDocumentViewer', {
                src: fileUrl,
                title: `Office Document Viewer: ${fileName}`
            });
        } else if (fileType === 'text/plain') {
            viewer = Ext.create('FileManagement.components.viewers.TextViewer', {
                src: fileUrl,
                title: `Text Viewer: ${fileName}`
            });
        } else if (fileType === 'application/zip') {
            viewer = Ext.create('FileManagement.components.viewers.ZipViewer', {
                src: fileUrl,
                fileName: fileName,
                title: `Zip File Contents: ${fileName}`
            });
        } else {
            Ext.Msg.alert('Unsupported File Type', 'The selected file type is not supported for viewing.');
            return;
        }

        viewer.show = function () {
            mainPanel.add(viewer); // Add the viewer panel to the main region
        }

        return viewer;
    }
});
