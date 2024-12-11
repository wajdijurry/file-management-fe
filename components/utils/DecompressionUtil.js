Ext.define('FileManagement.components.utils.DecompressionUtil', {
    singleton: true,

    decompressFile: function(config) {
        const token = FileManagement.helpers.Functions.getToken();
        const {
            filePath,
            parentId,
            onSuccess,
            onFailure,
            grid
        } = config;

        // Show initial loading mask
        if (grid) {
            grid.setLoading('Extracting Files... Please wait (0%)');
        }

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
                if (grid) {
                    grid.setLoading(false);
                }
                if (onSuccess) {
                    onSuccess(response);
                } else {
                    Ext.Msg.alert('Success', 'File decompressed successfully.');
                }
            },
            failure: function(response) {
                if (grid) {
                    grid.setLoading(false);
                }
                if (onFailure) {
                    onFailure(response);
                } else {
                    let responseJSON;
                    try {
                        responseJSON = JSON.parse(response.responseText);
                    } catch (e) {
                        responseJSON = { error: 'Unknown error occurred' };
                    }
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
