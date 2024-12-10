Ext.define('FileManagement.components.utils.DecompressionUtil', {
    singleton: true,

    decompressFile: function(config) {
        const token = FileManagement.helpers.Functions.getToken();
        const {
            filePath,
            parentId,
            onSuccess,
            onFailure
        } = config;

        Ext.Ajax.request({
            url: 'http://localhost:5000/api/files/decompress',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            jsonData: {
                filePath: filePath,
                parentId: parentId
            },
            success: function(response) {
                if (onSuccess) {
                    onSuccess(response);
                } else {
                    Ext.Msg.alert('Success', 'File decompressed successfully.');
                }
            },
            failure: function(response) {
                if (onFailure) {
                    onFailure(response);
                } else {
                    let responseJSON = JSON.parse(response.responseText);
                    Ext.Msg.alert('Error', 'Failed to decompress file: ' + responseJSON.error);
                }
            }
        });
    },

    showDecompressDialog: function(config) {
        Ext.create('FileManagement.components.dialogs.ExtractionDialog', {
            file: config.file,
            onSuccess: config.onSuccess
        }).show();
    }
});
