Ext.define('FileManagement.components.dialogs.SetPasswordDialog', {
    extend: 'Ext.window.Window',
    xtype: 'setpassworddialog',

    title: 'Set Password',
    modal: true,
    width: 350,
    layout: 'form',
    padding: 10,
    closeAction: 'destroy',

    config: {
        itemId: null,
        itemName: '',
        isFolder: false,
        onSuccess: null
    },

    items: [{
        xtype: 'displayfield',
        value: 'Set a password to protect this item.'
    }, {
        xtype: 'textfield',
        name: 'password',
        fieldLabel: 'Password',
        inputType: 'password',
        allowBlank: false,
        width: '100%'
    }, {
        xtype: 'textfield',
        name: 'confirmPassword',
        fieldLabel: 'Confirm Password',
        inputType: 'password',
        allowBlank: false,
        width: '100%',
        validator: function(value) {
            const password = this.up('window').down('textfield[name=password]').getValue();
            return value === password ? true : 'Passwords do not match';
        }
    }],

    buttons: [{
        text: 'Cancel',
        handler: function(btn) {
            btn.up('window').close();
        }
    }, {
        text: 'Set Password',
        handler: function(btn) {
            const win = btn.up('window');
            const password = win.down('textfield[name=password]').getValue();
            const confirmPassword = win.down('textfield[name=confirmPassword]').getValue();

            if (!password || password !== confirmPassword) {
                Ext.Msg.alert('Error', 'Passwords do not match.');
                return;
            }

            // Call the set password API
            Ext.Ajax.request({
                url: 'http://localhost:5000/api/files/password/set',
                method: 'POST',
                jsonData: {
                    itemId: win.getItemId(),
                    password: password,
                    isFolder: win.getIsFolder()
                },
                success: function(response) {
                    const result = Ext.JSON.decode(response.responseText);
                    if (result.success) {
                        Ext.Msg.alert('Success', 'Password set successfully.');
                        if (win.getOnSuccess) {
                            win.getOnSuccess();
                        }
                        win.close();
                    } else {
                        Ext.Msg.alert('Error', 'Failed to set password.');
                    }
                },
                failure: function() {
                    Ext.Msg.alert('Error', 'Failed to set password.');
                }
            });
        }
    }]
});
