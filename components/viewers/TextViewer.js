// TextViewer.js
Ext.define('FileManagement.components.viewers.TextViewer', {
    extend: 'Ext.window.Window',
    xtype: 'textviewer',

    config: {
        src: null
    },

    title: 'Text Viewer',
    modal: true,
    width: 600,
    height: 400,
    layout: 'fit',
    constrain: true,
    autoShow: true,
    closable: true,

    initComponent: function() {
        // Define items initially with an empty textarea to ensure proper rendering
        this.items = [{
            xtype: 'textarea',
            readOnly: true,
            value: 'Loading...', // Temporary placeholder text
            style: 'width: 100%; height: 100%;',
            margin: '10'
        }];

        // Call parent to complete initialization
        this.callParent(arguments);

        // Fetch the text content after the component is initialized
        this.loadTextContent();
    },

    loadTextContent: async function() {
        const token = FileManagement.helpers.Functions.getToken();
        const fileUrl = this.getSrc();

        try {
            const response = await fetch(fileUrl, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Failed to load text file');

            const textContent = await response.text();

            // Update the textarea with the fetched content
            const textArea = this.down('textarea');
            if (textArea) {
                textArea.setValue(textContent);
            }

            // Center and show the window after content is loaded
            this.center();
            this.show();
        } catch (error) {
            Ext.Msg.alert('Error', 'Failed to load the text file: ' + error.message);
            this.close();
        }
    }
});
