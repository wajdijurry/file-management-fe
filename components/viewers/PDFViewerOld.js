// PDFViewer.js
Ext.define('FileManagement.components.viewers.PDFViewerOld', {
    extend: 'Ext.Panel',
    xtype: 'pdf-viewer',

    config: {
        src: null,
        showFileName: true,
    },

    docType: 'pdf',
    loadingText: 'Loading file...',

    bbar: {
        items: ['->', {
            xtype: 'container',
            reference: 'bbar'
        }]
    },

    updateSrc: function (uri) {
        let html = this[this.docType + 'Display'](uri);
        this.setHtml(html);

        if (this.rendered) {
            this.getDockedItems()[1].items.items[1].setHtml(uri);
        } else {
            this.bbar.items[1].html = uri;
        }
    },

    pdfDisplay: function (uri) {
        // Create an iframe for PDF display
        return '<iframe src="' + uri + '" width="100%" height="100%" frameborder="0" style="border:none;">' +
            '<p>Your browser does not support embedded PDFs. <a href="' + uri + '" target="_blank">Click here to download the PDF file.</a></p>' +
            '</iframe>';
    },

    docxDisplay: function (uri) {
        return '<iframe src="https://view.officeapps.live.com/op/embed.aspx?src=' + uri + '" width="100%" height="100%" frameborder="0">' +
            'This is an embedded ' +
            '<a target="_blank" href="http://office.com">Microsoft Office</a> document, powered by ' +
            '<a target="_blank" href="http://office.com/webapps">Office Online</a>.' +
            '</iframe>';
    },

    updateShowFileName: function (doShow) {
        if (this.rendered) {
            this.getDockedItems()[1].setHidden(!doShow);
        } else {
            this.bbar.hidden = !doShow;
        }
    }
});
