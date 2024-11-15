// ViewerFactory.js
Ext.define('FileManagement.components.viewers.ViewerFactory', {
    singleton: true,

    createViewer: function(record) {
        const fileType = record.get('mimetype');
        const filePath = record.get('_id');
        const fileName = record.get('name');
        const fileUrl = `http://localhost:5000/api/files/view/${filePath}`;
        const isFolder = record.get('isFolder');

        if (fileType.startsWith('image/')) {
            return Ext.create('FileManagement.components.viewers.ImageViewer', {
                src: fileUrl,
                title: `Image Viewer: ${fileName}`
            });
        } else if (fileType === 'application/pdf') {
            return Ext.create('FileManagement.components.viewers.PDFViewer', {
                src: fileUrl,
                title: `PDF Viewer: ${fileName}`
            });
        } else if (fileType.startsWith('application/vnd') || fileType.includes('msword')) {
            return Ext.create('FileManagement.components.viewers.OfficeDocumentViewer', {
                src: fileUrl,
                title: `Office Document Viewer: ${fileName}`
            });
        } else if (fileType === 'text/plain') {
            return Ext.create('FileManagement.components.viewers.TextViewer', {
                src: fileUrl,
                title: `Text Viewer: ${fileName}`
            });
        } else if (fileType === 'application/zip') {
            return Ext.create('FileManagement.components.viewers.ZipViewer', {
                src: fileUrl,
                fileName: fileName,
                title: `Zip File Contents: ${fileName}`
            });
        } else {
            Ext.Msg.alert('Unsupported File Type', 'The selected file type is not supported for viewing.');
            return null;
        }
    }
});
