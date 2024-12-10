Ext.define('FileManagement.components.panels.ImageConverterPanel', {
    extend: 'Ext.form.Panel',
    xtype: 'imageconverterpanel',

    title: 'Image Converter',
    layout: 'vbox',
    width: 600,
    bodyPadding: 10,
    frame: true,
    modal: true,
    closable: true,

    config: {
        fileId: null
    },

    items: [
        {
            xtype: 'combobox',
            fieldLabel: 'Target Format',
            name: 'targetFormat',
            store: ['PNG', 'JPG', 'WEBP', 'BMP'],
            editable: false,
            allowBlank: false,
            width: 300
        },
        {
            xtype: 'sliderfield',
            fieldLabel: 'Quality (%)',
            name: 'quality',
            minValue: 0,
            maxValue: 100,
            value: 100,
            increment: 1,
            width: 400
        }
    ],

    buttons: [
        {
            text: 'Convert',
            iconCls: 'x-fa fa-check',
            formBind: true,
            handler: function (btn) {
                const form = btn.up('form');
                const values = form.getValues();

                if (!form.fileId) {
                    Ext.Msg.alert('Error', 'No file selected for conversion.');
                    return;
                }

                Ext.Ajax.request({
                    url: 'http://localhost:5000/api/convert-image',
                    method: 'POST',
                    jsonData: {
                        fileId: form.fileId,
                        targetFormat: values.targetFormat,
                        quality: values.quality
                    },
                    success: function (response) {
                        const result = Ext.decode(response.responseText);
                        Ext.Msg.alert('Success', `Image converted successfully: ${result.filePath}`);
                    },
                    failure: function () {
                        Ext.Msg.alert('Error', 'Image conversion failed.');
                    }
                });
            }
        },
        {
            text: 'Cancel',
            handler: function (btn) {
                btn.up('window').close();
            }
        }
    ]
});
