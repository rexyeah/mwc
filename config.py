import os
from pathlib import Path as path


class Config(object):
    def __init__(self):
        self._players = ["sary", "senlic", "stylonwang",
                         "jhung", "jliu", "fpanto", "victorl", "linrex"]
        self._wd = path.cwd()
        self._ipaddr = path(self._get_ipaddr())
        self._home = path(os.path.expanduser("~"))
        self._modhome = self._home / path("ModulatorConsole")
        self._updir = self._home / path("streams")
        self._template = os.fspath(path("modulator.html"))
        self._tsfiles = path("ALL_TS_FILE")
        self._nodecounts = 2
        self._job = []
        # JOBS = [
        #     {
        #         'id': 'stop_all_nodes',
        #         'func': 'mwc.Modulator._echo',
        #         'trigger': 'cron',
        #         'hour': 15,
        #         'minute': 12
        #     }
        # ]
        # SCHEDULER_API_ENABLED = True

    @property
    def players(self):
        return self._players

    @property
    def ipaddr(self):
        return self._ipaddr

    @property
    def template(self):
        return self._template

    @property
    def modhome(self):
        return self._modhome

    @property
    def updir(self):
        return self._updir

    @property
    def tsfiles(self):
        return self._tsfiles

    @property
    def nodecounts(self):
        return self._nodecounts

    @property
    def home(self):
        return self._home

    @property
    def wd(self):
        return os.fspath(self._wd)

    def _get_ipaddr(self):
        from contextlib import closing
        import socket
        with closing(socket.socket(socket.AF_INET, socket.SOCK_DGRAM)) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
