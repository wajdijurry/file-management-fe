// components/FileGridActions.js
Ext.define('FileManagement.components.grids.FileGridActions', {
    singleton: true,

    statics: {
        getDeleteAction: function() {
            return [{
                icon: 'https://cdn-icons-png.flaticon.com/512/1214/1214428.png',
                tooltip: 'Delete File',
                handler: function(grid, rowIndex) {
                    const record = grid.getStore().getAt(rowIndex);
                    const filename = record.get('filename');

                    Ext.Msg.confirm('Confirm Delete', `Are you sure you want to delete ${filename}?`, function(btn) {
                        if (btn === 'yes') {
                            fetch('http://localhost:5000/api/files/delete', {
                                method: 'DELETE',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ filenames: [filename] }),
                            })
                                .then(response => {
                                    if (!response.ok) {
                                        throw new Error('Network response was not ok ' + response.statusText);
                                    }
                                    return response.json();
                                })
                                .then(data => {
                                    Ext.Msg.alert('Success', 'File deleted successfully.');
                                    grid.getStore().reload(); // Reload the store to reflect changes
                                })
                                .catch(error => {
                                    console.error('Delete failed:', error);
                                    Ext.Msg.alert('Error', 'Failed to delete file.');
                                });
                        }
                    });
                }
            }];
        }
    }
});