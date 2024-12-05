Ext.define('FileManagement.components.dialogs.PasswordPromptDialog', {
    extend: 'Ext.window.Window',
    xtype: 'passwordpromptdialog',

    title: 'Password Required',
    modal: true,
    width: 350,
    layout: 'form',
    padding: 10,
    closeAction: 'destroy',

    config: {
        record: null,
        onSuccess: null
    },

    items: [
        {
            xtype: 'displayfield',
            name: 'message',
            value: 'This item is password protected. Please enter the password to access it.'
        },
        {
            xtype: 'textfield',
            name: 'password',
            fieldLabel: 'Password',
            inputType: 'password',
            allowBlank: false,
            width: '100%',
            listeners: {
                specialkey: function (field, e) {
                    if (e.getKey() === e.ENTER) {
                        const dialog = field.up('passwordpromptdialog');
                        if (dialog) {
                            const submitBtn = dialog.down('#submitButton');
                            if (submitBtn && submitBtn.handler) {
                                submitBtn.handler.call(submitBtn);
                            }
                        }
                    }
                }
            }
        }],

    buttons: [
        {
            text: 'Cancel',
            handler: function (btn) {
                btn.up('window').close();
            }
        },
        {
            text: 'Submit',
            itemId: 'submitButton',
            handler: function () {
                const win = this.up('window');
                const password = win.down('textfield[name=password]').getValue();

                if (!password) {
                    Ext.Msg.alert('Error', 'Please enter a password.');
                    return;
                }

                // Show loading mask
                win.mask('Verifying password...');

                // Call the verify password API
                Ext.Ajax.request({
                    url: 'http://localhost:5000/api/files/password/verify',
                    method: 'POST',
                    jsonData: {
                        itemId: win.record.get('id'),
                        password: password,
                        isFolder: win.record.get('isFolder')
                    },
                    success: function (response) {
                        win.unmask();
                        const result = Ext.JSON.decode(response.responseText);
                        if (result.success) {
                            if (typeof win.onSuccess === 'function') {
                                win.onSuccess(win.record);
                            }
                            win.close();
                        } else {
                            Ext.Msg.alert('Error', 'Invalid password.');
                        }
                    },
                    failure: function () {
                        win.unmask();
                        Ext.Msg.alert('Error', 'Failed to verify password.');
                    }
                });
            }
        }
    ]
});
