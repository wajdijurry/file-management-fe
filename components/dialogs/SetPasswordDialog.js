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
        width: '100%',
        listeners: {
            specialkey: function(field, e) {
                if (e.getKey() === e.ENTER) {
                    field.up('window').down('textfield[name=confirmPassword]').focus();
                }
            }
        }
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
        },
        listeners: {
            specialkey: function(field, e) {
                if (e.getKey() === e.ENTER) {
                    const win = field.up('window');
                    const setPasswordBtn = win.down('button[text=Set Password]');
                    setPasswordBtn.handler.call(setPasswordBtn, setPasswordBtn);
                }
            }
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
                        if (win.onSuccess) {
                            win.onSuccess();
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
