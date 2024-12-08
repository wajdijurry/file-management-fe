Ext.define('FileManagement.components.utils.PasswordPromptUtil', {
    singleton: true,

    requires: [
        'FileManagement.components.utils.AccessTracker'
    ],

    /**
     * Show a password prompt window and verify the password
     * @param {Object} config Configuration object
     * @param {String} config.itemId The ID of the item to verify password for
     * @param {Boolean} config.isFolder Whether the item is a folder
     * @param {Function} config.onSuccess Callback function to execute on successful password verification
     * @param {Function} [config.onFailure] Optional callback function to execute on password verification failure
     * @param {Function} [config.onCancel] Optional callback function to execute when user cancels the prompt
     * @param {String} [config.action] The action being performed (e.g. 'removePassword')
     */
    showPasswordPrompt: function(config) {
        // Skip verification check if this is a remove password action
        if (!config.action || config.action !== 'removePassword') {
            // First check if the item is already verified
            if (FileManagement.components.utils.AccessTracker.isItemVerified(config.itemId)) {
                if (config.onSuccess) {
                    config.onSuccess();
                }
                return;
            }
        }

        const passwordWindow = Ext.create('Ext.window.Window', {
            title: 'Enter Password',
            modal: true,
            width: 300,
            layout: 'form',
            padding: 10,
            items: [{
                xtype: 'displayfield',
                value: `This ${config.isFolder ? 'folder' : 'file'} is password protected.`,
                style: {
                    marginBottom: '10px'
                }
            }, {
                xtype: 'textfield',
                inputType: 'password',
                fieldLabel: 'Password',
                allowBlank: false,
                name: 'password',
                listeners: {
                    specialkey: function(field, e) {
                        if (e.getKey() === e.ENTER) {
                            field.up('window').down('button[text="OK"]').handler();
                        }
                    }
                }
            }],
            buttons: [{
                text: 'OK',
                handler: function(btn) {
                    const password = this.up('window').down('textfield').getValue();
                    const token = FileManagement.helpers.Functions.getToken();
                    
                    // Verify password
                    Ext.Ajax.request({
                        url: 'http://localhost:5000/api/files/password/verify',
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        },
                        jsonData: {
                            itemId: config.itemId,
                            password: password,
                            isFolder: config.isFolder || false
                        },
                        success: function(response) {
                            // Add item to verified list on successful verification
                            FileManagement.components.utils.AccessTracker.addVerifiedItem(config.itemId);
                            passwordWindow.close();
                            if (config.onSuccess) {
                                config.onSuccess(password);
                            }
                        },
                        failure: function(response) {
                            if (response.status === 401) {
                                Ext.Msg.alert('Error', 'Invalid password. Please try again.');
                            } else {
                                Ext.Msg.alert('Error', 'Failed to verify password. Please try again.');
                            }
                            if (config.onFailure) {
                                config.onFailure(response);
                            }
                        }
                    });
                }
            }, {
                text: 'Cancel',
                handler: function(btn) {
                    btn.up('window').close();
                    if (config.onCancel) {
                        config.onCancel();
                    }
                }
            }]
        });

        passwordWindow.show();
        return passwordWindow;
    }
});
