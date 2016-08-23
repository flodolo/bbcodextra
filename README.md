# BBCodeXtra
==========

Source code for Mozilla add-on
https://addons.mozilla.org/firefox/addon/bbcodextra

Menu Reference (English)
http://www.yetanothertechblog.com/bbcodextra/

# Development
You need to create a virtual environment for Python libraries. Skip the first instruction if you already have virtualenv installed:

```
$ pip install virtualenv                       # installs virtualenv, skip if already have it
$ virtualenv -p python2.7 venv                 # create a virtual env in the folder `venv`
$ source venv/bin/activate                     # activate the virtual env
$ bin/pipstrap.py                              # securely upgrade pip
$ pip install -r requirements/base.txt         # installs dependencies
```
