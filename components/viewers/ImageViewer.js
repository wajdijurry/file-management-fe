// ImageViewer.js
Ext.define('FileManagement.components.viewers.ImageViewer', {
    extend: 'Ext.window.Window',
    xtype: 'imageviewer',

    config: {
        src: null
    },

    title: 'Image Viewer',
    modal: true,
    draggable: true,
    layout: 'fit',
    autoShow: true,
    constrain: true,

    initComponent: function() {
        const token = FileManagement.helpers.Functions.getToken();
        const imagePath = this.getSrc();
        const imageWindow = this;

        this.items = [{
            xtype: 'image',
            listeners: {
                afterrender: async function(img) {
                    try {
                        const response = await fetch(imagePath, { headers: { 'Authorization': `Bearer ${token}` } });
                        if (!response.ok) throw new Error('Failed to load image');

                        const blob = await response.blob();
                        const objectURL = URL.createObjectURL(blob);
                        img.setSrc(objectURL);

                        const image = new Image();
                        image.src = objectURL;
                        image.onload = () => {
                            const { width: naturalWidth, height: naturalHeight } = image;
                            imageWindow.setWidth(naturalWidth);
                            imageWindow.setHeight(naturalHeight);

                            const screenWidth = window.innerWidth;
                            const screenHeight = window.innerHeight;

                            imageWindow.setMaxWidth(screenWidth * 0.9);
                            imageWindow.setMaxHeight(screenHeight * 0.9);
                            imageWindow.setMinWidth(300);
                            imageWindow.setMinHeight(200);

                            imageWindow.show();
                            imageWindow.center();
                        };
                    } catch (error) {
                        Ext.Msg.alert('Error', 'Failed to load the image.');
                        imageWindow.close();
                    }
                }
            }
        }];

        this.listeners = {
            close: function () {
                this.destroy();
            }
        };

        this.callParent();
    }
});
