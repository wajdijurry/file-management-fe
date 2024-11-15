// frontend/components/forms/auth/LoginForm.js
Ext.define('FileManagement.components.forms.auth.LoginForm', {
    extend: 'Ext.window.Window',
    xtype: 'loginform',
    title: 'Login',
    modal: true,
    closable: false,
    resizable: false,
    width: 300,
    layout: 'fit',
    autoShow: true,
    bodyPadding: 10,
    headers: {},
    // Define custom events
    listeners: {
        loginSuccess: 'onLoginSuccess' // Maps to a function or event listener on success
    },
    items: {
        xtype: 'form',
        bodyStyle: 'background: transparent; border: none;',  // Set form body to transparent
        items: [
            { xtype: 'textfield', name: 'username', fieldLabel: 'Username', allowBlank: false },
            { xtype: 'textfield', name: 'password', fieldLabel: 'Password', inputType: 'password', allowBlank: false },
            { xtype: 'checkbox', name: 'rememberMe', fieldLabel: 'Remember Me' } // Add Remember Me checkbox
        ],
        buttons: [
            {
                text: 'Login',
                handler: function(btn) {
                    const form = btn.up('form').getForm();
                    if (form.isValid()) {
                        form.submit({
                            url: 'http://localhost:5000/api/auth/login',
                            success: function(form, action) {
                                const { token, username } = action.result;
                                const rememberMe = form.findField('rememberMe').getValue();

                                // Store the token and username
                                localStorage.setItem('token', token);
                                localStorage.setItem('username', username);

                                // Reload the application to ensure updates
                                Ext.Msg.alert('Success', 'Logged in successfully', function() {
                                    window.location.reload();
                                });
                            },
                            failure: function(form, action) {
                                Ext.Msg.alert('Failed', action.result ? action.result.error : 'Server error');
                            }
                        });
                    }
                }
            },
            {
                text: 'Register',
                id: 'loginform-registerbutton'
            }
        ]
    }
});
