from gevent import subprocess
from gevent.subprocess import Popen, PIPE
from config import Config as config
from pathlib import Path as path
import os


class Docker():

    def __init__(self):
        self.nodes = []
        cmd = ('lsusb | grep 9445 | awk -F\' \'  \'{gsub(/:/,""); '
               'print "/dev/bus/usb/"$2"/"$4}\'')
        self.nodes = self._execute(cmd).strip().split('\n')
        self.wd = '/home/builder/ModulatorConsoleDocker/'
        self.base = os.fspath(path.cwd())

    def _execute(self, cmd):
        p = Popen(cmd, stdin=PIPE, stderr=PIPE,
                  stdout=PIPE, shell=True, encoding='utf8')
        return p.communicate()[0]

    def run(self, n):
        os.chdir(self.wd)
        docker_cmd = "./docker.sh"
        cmd = f"{docker_cmd} run {self.nodes[n]}".split(' ')
        p = Popen(cmd, stdin=PIPE, stderr=PIPE, stdout=PIPE, encoding='utf8')
        result = ""
        os.chdir(self.base)
        while True:
            output = p.stdout.readline()
            if 'modulator_stack' in str(output):
                result += str(output)
            if 'Press CTRL-C to stop' in str(output) and result:
                return 'OK'

    def stop(self, n):
        os.chdir(self.wd)
        cmd = './docker.sh stop'.split(' ')
        p = Popen(cmd, stdin=PIPE, stderr=PIPE, stdout=PIPE)
        os.chdir(self.base)
        msg = ['modulator_netdvb', 'modulator_proxy']
        while True:
            output = str(p.stdout.readline())
            if any(o in output for o in msg):
                return 'STOP'
