#!/bin/bash

#echo "[INFO] FTP server is about to start"
#twistd -n ftp --password-file=/home/builder/streams/pass &

source $PWD/bin/activate
$PWD/bin/python _watchdog.py &
echo "[INFO] Stream files monitor has been started at the background."
echo "[INFO] Modulator Web Console is about to start."
$PWD/bin/python mwc.py
