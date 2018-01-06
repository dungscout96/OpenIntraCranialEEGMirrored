# Installing

It is assumed `ieeg_static_data.tar.gz` is in the `$HOME` directory.

Run the following commands:

```
mkdir -p /data/ieeg/data/
cd /data/ieeg/data
tar -xvf $HOME/ieeg_static_data.tar.gz
cp /data/ieeg/data/edf/static/*.nii.gz /var/www/loris/modules/eegbrowser/static/
```

The `.edf` files are resolved relative to `$rootDataPath` defined in `eegbrowser/php/rootPath.php`

TODO: Link to `ieeg_static_data.tar.gz` only for loris developers.
