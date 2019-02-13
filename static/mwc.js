var socket = io.connect('http://' + document.domain + ':' + location.port);

const range = n => Array.from(Array(n).keys());
// const label = (status, n, player) => (`Node${n+1}`+` ${status ? `[IN USED BY ${player}]` : ''}`);
const node_counts = $('form[id^=node]').length;
var player = window.localStorage.getItem("player") || "";

window.onload = () => {
    _set_player();
    _set_modulator_parms();
    setInterval(() => {socket.emit('watch');}, 10000);
}

socket.on('report_watch', (r) => {
    _set_modulator_state(r);
});

socket.on('report_filter', (r) => {
    _set_filtered_ts_files(r);
});

socket.on('response', (response) => {
    _set_modulator_state(response, resp=true);
});

socket.on('report_docker_stop', (e) => {
    _change_docker_status(e, "stop");
});
socket.on('report_docker_start', (e) => {
    _change_docker_status(e, "start");
});

_change_docker_status = (e, action) => {
    let start = action == "start" ? 1 : 0;
    let ele = $(`#docker${(parseInt(e.slot)+1)}_state`);
    let msg = `docker: ${start?"started.":"stopped. Node would be reloaded in 3 sec..."}`;
    ele.empty();
    ele.removeClass("docker_running");
    ele.text(msg);
    if (start) {
        ele.removeClass("docker_stopped");
        ele.addClass("docker_started");
    }
    else {
        ele.removeClass("docker_started");
        ele.addClass("docker_stopped");
        window.setTimeout(() => {window.location.reload();}, 3000);
    }
}

_set_filtered_ts_files = (r) => {
    let node_file = `#node${r.node}_file`;
    $(node_file).html('');
    $.each(r.ts, (i, v) => {$(node_file).append(new Option(v, v));});
    $(node_file).trigger('change');
}

// Change all input fileds UI look once the state is changed.
_set_modulator_state = (r, resp=false) => {
    _set_elements_state = (playing, node) => {
        $.each(['_play', ' input', ' select'], (i, t) => {
                $(`#node${node}${t}`).attr('disabled', playing);
            });
        $(`span[id$=${node}_span]`).css('color', (playing ? 'red' : 'green'));
        if (!playing) {
            $(`#play${node}`).val(player);
        }
    }
    _set_docker_state = (docker, n) => {
        eles = ['span[id$=ot_block]', 'div[id$=parm_block]'];
        docker ? $.each(eles, (e) => {$(e).eq(n).hide()}) : $.each(eles, (e) => {$(e).eq(n).show()});
    }
    label = (status, n, player) => (`Node${n+1}`+` ${status ? `[IN USED BY ${player}]` : ''}`);
    if(resp){
        [status, n, p, docker] = r.status;
        _set_docker_state(docker, n);
        _set_elements_state((status == 'PLAYING'), n+1);
        $('span[id$=span]').eq(n).text(label((status == 'PLAYING'), n, p));
        $('select[id^=player]').eq(n).val(player);
        return;
    }
    $.each(range(node_counts), n => {
        _set_elements_state(r.state[n], n+1);
        socket.on(`player${n+1}_name`, s => {
            let player = `${((n > 0) ? s.player2 : s.player1)}`
            $('select[id^=player]').eq(n).val(player);
            $('span[id$=span]').eq(n).text(label(r.state[n], n, player));
        });
        if (parseInt(r.docker_state[n])){
            $('span[id$=ot_block]').eq(n).hide();
            $('div[id$=parm_block]').eq(n).hide();
        }
    });
}

// Set all input fileds values ; not to change its UI look.
_set_modulator_parms = () => {
    socket.emit('read_parms', {node_counts : node_counts});
    socket.emit('watch');
    socket.on('parms', r => {
        $.each(range(node_counts), n =>  {
            n = parseInt(n);
            let p = $('select[id^=player]').eq(n);
            p.prop('disabled') ? p.val(r[n].player) : p.val(player);
            $.each(r[n], (k, v) => {
                if (['ot', 'docker'].includes(k) && parseInt(v)) {
                    $(`input[id$=${k}]`).eq(n).prop('checked', true);
                    return;
                }
                if (['file'].includes(k)) {
                    $(`select[id$=${k}]`).eq(n).append(new Option(r[n].file, r[n].file));
                    return;
                }
                $(`input[id$=${k}]`).eq(n).val(v);
            });
        });
    });
}

_set_player = () => {
    socket.emit('get_players');
    socket.on('players', p => {
        players = p.players
        $.each(players, (i, v) => {
            $('select[id^=player]').append(new Option(v, v));
        });
        if (typeof(window.localStorage) !== "undefined") {
            player = window.localStorage.getItem("player");
            if (player) {
                return;
            }
            else {
                player = prompt("Please enter your intranet id");
                if (players.includes(player)) {
                    window.localStorage.setItem("player", player);
                }
                else {
                    alert(player + " is not a Taiwan office staff");
                    window.location.reload();
                }
            }
        } else {
            alert("Your browser doesn't support localStorage");
        }
    });
}

