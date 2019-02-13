import sys
import time
import os
from watchdog.observers import Observer
from pathlib import Path as path
from watchdog.events import LoggingEventHandler, FileSystemEventHandler
from config import Config as config

HOME = os.fspath(path(os.path.expanduser("~")))


class WalkStreamFiles(FileSystemEventHandler):
    def walk_save_ts_filepath(self):
        tslist = []
        for root, dirs, files in os.walk(HOME):
            for file in files:
                if file.endswith(".ts"):
                    tslist.append(os.path.join(root, file))
        tslist.sort()
        with open('ALL_TS_FILE', 'w') as f:
            for a in tslist:
                if 'Trash' not in a:
                    f.write(a+'\n')
        print('[INFO] WALK TS FILES COMPLETED')

    def on_created(self, event):
        if event.src_path.endswith('.ts'):
            print('[INFO]', event.event_type, event.src_path)
            print('[INFO] Start the TS file walk')
            self.walk_save_ts_filepath()


if __name__ == "__main__":
    paths = [os.path.join(HOME, dI) for dI in os.listdir(
        HOME) if os.path.isdir(os.path.join(HOME, dI))]
    # paths = ['/home/builder', '/home/builder/streams']
    event_handler = WalkStreamFiles()
    observer = Observer()
    for path in paths:
        observer.schedule(event_handler, path, recursive=False)
    observer.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
