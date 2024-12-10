// ViewerFactory.js
Ext.define('FileManagement.components.viewers.ViewerFactory', {
    singleton: true,

    createViewer: function(record) {
        const fileType = record.get('mimetype');
        const fileId = record.get('id');
        const fileName = record.get('name');
        const mainPanel = Ext.getCmp('mainPanelRegion');

        let viewer;

        if (fileType.startsWith('image/')) {
            const fileUrl = `http://localhost:5000/api/files/view/${fileId}`;
            viewer = Ext.create('FileManagement.components.viewers.ImageViewer', {
                src: fileUrl,
                title: `Image: ${fileName}`
            });
        } else if (fileType === 'application/pdf') {
            const fileUrl = `http://localhost:5000/api/files/view/${fileId}`;
            viewer = Ext.create('FileManagement.components.viewers.PDFViewer', {
                src: fileUrl,
                title: `PDF: ${fileName}`
            });
        } else if (fileType.startsWith('application/vnd') || fileType.includes('msword')) {
            const fileUrl = `http://localhost:5000/api/files/view/${fileId}`;
            viewer = Ext.create('FileManagement.components.viewers.OfficeDocumentViewer', {
                src: fileUrl,
                title: `Office Document Viewer: ${fileName}`
            });
        } else if (['text/plain', 'application/json'].includes(fileType)) {
            const fileUrl = `http://localhost:5000/api/files/view/${fileId}`;
            viewer = Ext.create('FileManagement.components.viewers.TextViewer', {
                src: fileUrl,
                title: `Text Viewer: ${fileName}`
            });
        } else if (fileType === 'application/zip') {
            const fileUrl = `http://localhost:5000/api/files/view/${fileId}`;
            viewer = Ext.create('FileManagement.components.viewers.ZipViewer', {
                src: fileUrl,
                fileName: fileName,
                filePath: record.get('path'),
                title: `Zip File Contents: ${fileName}`
            });
        } else if (fileType.startsWith('video/')) {
            const fileUrl = `http://localhost:5000/api/video/stream/${fileId}`;
            viewer = Ext.create('FileManagement.components.viewers.VideoViewer', {
                title: `Video Viewer: ${fileName}`,
                fileId,
                autoPlay: false
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
