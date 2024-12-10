Ext.define('FileManagement.components.viewers.ImageViewer', {
    extend: 'Ext.panel.Panel',
    xtype: 'imageviewer',

    config: {
        src: null
    },

    title: 'Image Viewer',
    layout: 'fit',
    closable: true,
    frame: true,
    modal: true,

    width: 400, // Set a fixed width
    height: 350, // Set a fixed height
    x: 0,
    y: 0,

    style: {
        zIndex: ++window.highestZIndex,
    },

    draggable: {
        onMouseUp: function(e, panel) {
            FileManagement.components.utils.PanelUtils.onMouseUp(panel ?? this.panel);
        },
        onDrag: function(e, panel) {
            FileManagement.components.utils.PanelUtils.onDrag(panel ?? this.panel);
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

    tbar: [
        {
            text: 'Convert',
            iconCls: 'fa fa-exchange-alt',
            menu: {
                xtype: 'menu',
                items: [
                    {
                        xtype: 'combobox',
                        fieldLabel: 'Target Format',
                        itemId: 'targetFormat',
                        store: ['PNG', 'JPG', 'WEBP', 'AVIF'],
                        editable: false,
                        width: 150
                    },
                    {
                        xtype: 'sliderfield',
                        fieldLabel: 'Quality (%)',
                        itemId: 'qualitySlider',
                        minValue: 1,
                        maxValue: 100,
                        value: 100,
                        increment: 1,
                        width: 300
                    },
                    {
                        text: 'Convert',
                        iconCls: 'fa fa-check',
                        handler: function () {
                            const token = FileManagement.helpers.Functions.getToken();
                            const viewer = this.up('imageviewer');
                            const targetFormat = viewer.down('#targetFormat')?.getValue();
                            const quality = viewer.down('#qualitySlider')?.getValue();
                            const grid = Ext.ComponentQuery.query('filegrid')[0];

                            if (!targetFormat) {
                                Ext.Msg.alert('Error', 'Please select a target format.');
                                return;
                            }

                            viewer.mask(`Converting to "${targetFormat}"...`);

                            Ext.Ajax.request({
                                url: 'http://localhost:5000/api/image/convert-image',
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${token}`
                                },
                                jsonData: {
                                    fileId: viewer.fileId,
                                    targetFormat: targetFormat,
                                    quality: quality
                                },
                                success: function () {
                                    Ext.Msg.alert('Success', 'Image converted successfully.');
                                },
                                failure: function () {
                                    Ext.Msg.alert('Error', 'Failed to convert the image.');
                                },
                                callback: function () {
                                    grid.getStore().reload();
                                    viewer.unmask();
                                }
                            });
                        }
                    }
                ]
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

            const mainPanelRegion = Ext.getCmp('mainPanelRegion');
            const mainPanelRegionBox = mainPanelRegion.getBox();

            panel.maxWidth = mainPanelRegionBox.width;
            panel.maxHeight = mainPanelRegionBox.height;
        }
    },

    initComponent: function() {
        const token = FileManagement.helpers.Functions.getToken();
        const imagePath = this.getSrc();
        const viewerPanel = this;

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
                            const screenWidth = window.innerWidth;
                            const screenHeight = window.innerHeight;

                            // Adjust panel size based on image dimensions
                            viewerPanel.setSize(
                                Math.min(naturalWidth, screenWidth * 0.9),
                                Math.min(naturalHeight, screenHeight * 0.9)
                            );

                            // Set minimum dimensions for usability
                            viewerPanel.setMinWidth(300);
                            viewerPanel.setMinHeight(200);
                        };
                    } catch (error) {
                        Ext.Msg.alert('Error', 'Failed to load the image.');
                    }
                }
            }
        }];

        this.callParent();
    }
});
