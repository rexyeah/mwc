import json
import os
from pathlib import Path as path
from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit
from flask_apscheduler import APScheduler
from werkzeug.utils import secure_filename
from config import Config
from docker import Docker


class Utility:
    def _load_json(self, filepath):
        return json.load(path(str(filepath)).open("r"))

    def _dump_json(self, filepath, data):
        try:
            json.dump(data, path(str(filepath)).open("w"))
        except Exception as e:
            raise e

    def _execute(self, cmd):
        from subprocess import Popen, PIPE
        p = Popen(cmd, stdin=PIPE, stderr=PIPE,
                  stdout=PIPE, shell=True, encoding='utf8')
        return p.communicate()[0]

    def _upload(self):
        if request.method == 'POST':
            file = request.files['file']
            if file:
                filename = path(secure_filename(file.filename))
                uppath = Config().updir / filename
                file.save(os.fspath(uppath))


class Modulator:
    def __init__(self):
        self.config = Config()
        self.util = Utility()
        self.docker = Docker()

    def _load_configuration_dict(self, node):
        return self.util._load_json(node)

    def _get_players(self):
        socketio.emit('players', {'players': self.config.players})

    def _set_parameters(self, nc):
        d = {}
        for n in range(int(nc['node_counts'])):
            d[n] = self._load_configuration_dict(n)
        socketio.emit('parms', d)

    def _filter(self, k):
        def walk(k):
            with Config().tsfiles.open("r") as f:
                ts = [line.rstrip('\n')
                      for line in f if k['name'].lower() in line.lower()]
                ts.sort()
            return ts
        socketio.emit('report_filter', {'node': k['node'], 'ts': walk(k)})

    def _watch(self):
        cnts = self.config.nodecounts
        docker_state = ['0' for i in range(cnts)]
        state = [path(f"modulator.playing.{b}").exists() for b in range(cnts)]
        for b in range(cnts):
            d = self._load_configuration_dict(str(b))
            docker_state[b] = d['docker']
        socketio.emit('report_watch', {
                      'state': state, 'docker_state': docker_state})
        for i, b in enumerate(state):
            if b:
                player = f"player{i+1}"
                socketio.emit(f"{player}_name", {
                    player: path(f"modulator.playing.{i}").read_text()})

    def _get_mediainfo(self, ts):
        cmd = ("mediainfo --Output=\"General;%OverallBitRate%\""
               f" \"{ts['filename']}\"")
        rate = str(self.util._execute(cmd)).strip()
        if len(rate) > 0:
            res = int(rate)
            if res > 0:
                if res > (4 * 10**7):
                    res = 23052768
                socketio.emit('report_mediainfo', {'playrate': res})

    def _docker_state(self, d):
        n = self.util._load_json(d['node'])
        n.update({'docker': d['docker']})
        self.util._dump_json(d['node'], n)

    def _set_overtime(self, ot):
        n = self.util._load_json(ot['node'])
        n.update({'ot': ot['ot']})
        self.util._dump_json(ot['node'], n)

    def _play(self, n):
        n = json.loads(n)
        slot, docker, rf = n["slot"], n["docker"], n['rf']
        cmd = (f"{self.config.modhome}/ModulatorConsole "
               f"dvb-t "
               f"-r {self.config.ipaddr} "
               f"--slot {slot} "
               f"--playback play "
               f"--mode loop "
               f"--file \"{n['file']}\" "
               f"--bw {n['bw']} "
               f"--const {n['const']} "
               f"--coderate {n['coderate']} "
               f"--guard {n['guard']} "
               f"--tx {n['tx']} "
               f"--cell-id {n['cellid']} "
               f"--playrate {n['playrate']} "
               f"--rf {int(rf) * 10**6} "
               )
        if int(docker):
            print("docker is enabled")
            result = self.docker.run(int(n['slot']))
            print('docker result:', result)
            socketio.emit('report_docker_start', {
                          'status': result, 'slot': slot})
        else:
            res = self.util._execute(cmd)
        path(f"modulator.playing.{slot}").write_text(n["player"])
        self.util._dump_json(slot, n)
        socketio.emit('response', {'status': [
            'PLAYING',
            int(n['slot']),
            n['player'],
            n['docker']
        ]})

    def _stop(self, n):
        n = json.loads(n)
        slot = n["slot"]
        cmd = (f"{self.config.modhome}/ModulatorConsole "
               f"dvb-t "
               f"-r {self.config.ipaddr} "
               f"--slot {n['slot']} "
               f"--playback stop "
               )
        d = self.util._load_json(slot)
        docker = d['docker']
        if int(docker):
            result = self.docker.stop(n)
            print('docker result:', result)
            d.update({'docker': '0'})
            self.util._dump_json(slot, d)
            socketio.emit('report_docker_stop', {
                          'status': result, 'slot': slot})
        res = self.util._execute(cmd)
        path(f"modulator.playing.{n['slot']}").unlink()
        socketio.emit(
            'response', {'status': ['STOPPED', int(n['slot']), '', 0]})


app = Flask(__name__)
socketio = SocketIO(app)

m = Modulator()


@socketio.on('get_players')
def get_players():
    m._get_players()


@socketio.on('read_parms')
def set_node_parms(nc):
    m._set_parameters(nc)


@socketio.on('watch')
def watch():
    m._watch()


@socketio.on('filter_ts')
def filter(k):
    m._filter(k)


@socketio.on('get_mediainfo')
def get_mediainfo(ts):
    m._get_mediainfo(ts)


@socketio.on('set_docker')
def docker_state(d):
    m._docker_state(d)


@socketio.on('set_overtime')
def set_overtime(ot):
    m._set_overtime(ot)


@socketio.on('play')
def play(n):
    m._play(n)


@socketio.on('stop')
def stop(n):
    m._stop(n)


@app.route('/', methods=['POST'])
def upload():
    Utility()._upload()
    return render_template(Config().template)


@app.route('/')
def index():
    return render_template(Config().template)


def scheduled_stopper():
    for b in range(2):
        if os.path.exists('modulator.playing.%s' % b):
            node = json.load(open('%s' % b))
            if node['ot'] == "0":
                m._stop(json.dumps(node))


class SchdulerConfig(object):
    JOBS = [
        {
            'id': 'stop_all_nodes',
            'func': scheduled_stopper,
            'trigger': 'cron',
            'hour': 19,
            'minute': 30
        }
    ]
    SCHEDULER_API_ENABLED = True


if __name__ == '__main__':
    app.secret_key = 'xup6vup4cj/6'
    app.config.from_object(SchdulerConfig())
    scheduler = APScheduler()
    scheduler.init_app(app)
    scheduler.start()
    socketio.run(app, debug=False, host='0.0.0.0', port=9527)
