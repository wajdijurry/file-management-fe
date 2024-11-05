Ext.define('FileManagement.components.navigation.UserToolbar', {
    extend: 'Ext.toolbar.Toolbar',
    xtype: 'userToolbar',
    id: 'userToolbar',
    cls: 'x-toolbar-classic',
    style: { position: 'sticky', bottom: 0, zIndex: 1000 },

    initComponent: function() {
        const username = sessionStorage.getItem('username') || localStorage.getItem('username');

        Ext.apply(this, {
            items: [
                {
                    xtype: 'tbtext',
                    text: `Welcome, ${username}` // Display username on the left
                },
                '->', // Pushes the logout button to the right
                {
                    xtype: 'button',
                    text: 'Logout',
                    iconCls: 'fa fa-sign-out',
                    handler: function() {
                        Ext.Msg.confirm('Confirm Logout', 'Are you sure you want to log out?', function(choice) {
                            if (choice === 'yes') {
                                localStorage.removeItem('token');
                                localStorage.removeItem('username');
                                sessionStorage.removeItem('token');
                                sessionStorage.removeItem('username');
                                location.reload();
                            }
                        });
                    }
                }
            ]
        });

        this.callParent(arguments);
    }
});
