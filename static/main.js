var socket = io.connect('http://' + document.domain + ':' + location.port);

socket.on('connect', function() {
    socket.emit('watching');
    socket.emit('read_parms');
});

var players = ['sary', 'senlic', 'stylonwang',
               'jhung', 'jliu', 'fpanto', 'victorl', 'linrex']
players.forEach(function (v) {
    $('#player1, #player2').append(new Option(v, v));
});

var player = "";
if (typeof(window.localStorage) !== "undefined") {
    player = window.localStorage.getItem("player");
    if (player) {
        console.log(player, ' registered');
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

var set_node_parms = function (node, r) {
    $.each(r, function (k, v) {
        $('#node' + node + '_' + k).prop('checked', false);
        if (k == 'ot') {
            $('#node' + node + '_' + k).prop('checked', true);
        }
        if (k == 'docker' && v == '1'){
            $('#node' + node + '_' + k).prop('checked', true);
        }
        $('#node' + node + '_' + k).val(v);
    });
    if (!$('#player' + node).prop('disabled')) {
        $('#player' + node).val(player);
        return;
    }
    $('#player' + node).val(r.player);
}

$.each([0, 1], function (n) {
    var node = n + 1;
    var node_file = '#node' + node + '_file';
    socket.on('parms' + n, function(r) {
        $(node_file).append(new Option(r.file, r.file));
        set_node_parms(node, r)
    });
});

window.setInterval(function() {
    socket.emit('watching')
}, 10000)

var set_play_parameters = function (node) {
    var generate_form_data = function (n) {
        var formData = new FormData($('#node' + n)[0]);
        var result = {};
        formData.forEach(function(value, key){
            result[key] = value;
        });
        result['docker'] = $('#node' + n + '_docker').val()
        return JSON.stringify(result);
    }
    return generate_form_data(node)
}

$('#node1_play, #node2_play').on('click', function(e) {
    let slot = this.id.replace('node', '').replace('_play', '');
    socket.emit('play', set_play_parameters(slot));
    socket.emit('read_parms');
});

$('#node1_stop, #node2_stop').on('click', function(e) {
    let slot = parseInt(this.id.replace('node', '').replace('_stop', '')) -1 ;
    socket.emit('stop', {
        slot: slot.toString(), docker: $('#node'+(slot+1)+'_docker').val() })
    socket.emit('read_parms')
});

$('#node1_docker, #node2_docker').on('click', function(e) {
    var id = this.id.replace('_docker', '');
    if($('#' + id + '_parm_block').is(':visible')) {
        this.value = "1";
        $('#' + id + '_parm_block').hide('slow');
        $('#' + id + '_ot_block').hide('slow');
    }else{
        this.value = "0";
        $('#' + id + '_parm_block').show('slow');
        $('#' + id + '_ot_block').show('slow');
    }
    socket.emit('docker_state',{
        'node': parseInt(id.replace('node', ''))-1,
        'docker': this.value
    });
});

var change_element_state = function (playing, node) {
    ['_play', ' input', ' select'].forEach(function (t) {
        $('#node' + node + t).attr('disabled', playing);
    });
    $('#node' + node + '_span').css('color', (playing ? 'red' : 'green'));
    if (!playing) {
        $('#player' + node).val(player);
    }
}

socket.on('modulator', function(r) {
    [0, 1].forEach(function(n) {
        var node = n + 1;
        var txt = "Node " + node;
        change_element_state(r.state[n], node)
        $("#node" + node + "_span").text(txt);
        socket.on('player' + node + '_name', function(s) {
            var player_name = ((n > 0) ? s.player2 : s.player1);
            txt += (r.state[n]?" [IN USED BY " + player_name + "]":"")
            $("#node" + node + "_span").text(txt);
        });
        if (r.docker_state[n] == "1"){
            $('#node' + node + '_parm_block').hide();
            $('#node' + node + '_ot_block').hide();
        }
    });
});

socket.on('response', function(response) {
    let status = response.status[0];
    let node = (parseInt(response.status[1])+1).toString();
    let player = response.status[2];
    let docker = response.status[3]
    console.log('docker:', docker);
    text = 'Node ' + node;
    state = {
        "PLAYING" : [1, (text +' [IN USED BY ' + player + ']')],
        "STOPPED" : [0, text]
    }
    change_element_state(state[status][0], node);
    $('#node' + node +  '_span').text(state[status][1]);
    if(docker == '1'){
        console.log('docker == 1');
        $('#node' + node + '_parm_block').hide();
        $('#node' + node + '_ot_block').hide();
    }else{
        $('#node' + node + '_parm_block').show();
        $('#node' + node + '_ot_block').show();
    }
    socket.on('run_docker_ret', function (e) {
        if(e.status == "OK"){
            alert('The docker:modulator_stack processes are up and running.');
        }
        else{
            alert('The docker:modulator_stack processes are failed.')
        }
    });
});

$('#node1_file, #node2_file').on('change', function () {
    var id = this.id
    socket.emit('fetch_media_info', {
        node_id : id,
        filename: $('#' + id).val()
    });
    socket.on('respond_media_info', function(r) {
        $('#' + id.replace('file', 'playrate')).val(r.playrate);
    });
});

$('#node1_file_search, #node2_file_search').on('input', function () {
    let slot = this.id.replace('node', '').replace('_file_search', '');
    $('#node' + slot + '_file').html('');
    socket.emit('list_ts_'+ slot, {
        ts_name: $('#' + this.id).val()
    })
});

[1, 2].forEach(function (n) {
    socket.on('list_ts_res_' + n, function(r) {
        var node_file = '#node' + n + '_file';
        $(node_file).html('');
        r.ts.forEach(function (v) {
            $(node_file).append(new Option(v, v));
        });
        $(node_file).trigger('change');
    });
});
