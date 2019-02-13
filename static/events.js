const get_slot = i => (i.match(/\d+/g).map(Number)[0] - 1);

$('button[id$=play], button[id$=stop]').on('click', function (e) {
    e.preventDefault();
    let slot = get_slot(this.id);
    play = () => {
        if($('div[id$=_parm_block]').eq(slot).is(':hidden')){
            let msg = "docker: about to start, please wait...";
            ele = $(`#docker${(parseInt(slot)+1)}_state`);
            ele.removeClass("docker_stopped");
            ele.empty(), ele.text(msg), ele.addClass("docker_running");
        }
        let set_play_parameters = function (node) {
            let generate_form_data = function (n) {
                let formData = new FormData($('#node' + n)[0]);
                let result = {};
                formData.forEach(function(value, key){
                    result[key] = value;
                });
                result['docker'] = $('input[id$=docker]').eq((n-1)).val()
                return JSON.stringify(result);
            }
            return generate_form_data((node+1))
        }
        socket.emit('play', set_play_parameters(slot));
    }
    stop = () => {
        if($('div[id$=_parm_block]').eq(slot).is(':hidden')){
            let msg = "docker: about to stop, please wait...";
            ele = $(`#docker${(parseInt(slot)+1)}_state`);
            ele.removeClass("docker_started");
            ele.empty(), ele.text(msg), ele.addClass("docker_running");
        }
        socket.emit('stop', JSON.stringify({
                    slot: `${slot}`,
                    docker: $('input[id$=docker]').eq(slot).val() }));
    }
    this.id.includes('play') ? play() : stop();
    socket.emit('read_parms', {node_counts : node_counts});
});

$('input[id$=docker]').on('click', function() {
    let slot = this.id.match(/\d+/g).map(Number)[0] - 1;
    if($('div[id$=_parm_block]').eq(slot).is(':visible')) {
        this.value = "1";
        $('div[id$=_parm_block]').eq(slot).hide('slow');
        $('span[id$=_ot_block]').eq(slot).hide('slow');
    }
    else{
        this.value = "0";
        $('div[id$=_parm_block]').eq(slot).show('slow');
        $('span[id$=_ot_block]').eq(slot).show('slow');
    }
    socket.emit('set_docker',{
        'node': slot,
        'docker': this.value
    });
});

$('[id$=file]').on('change', function () {
    let id = this.id
    socket.emit('get_mediainfo', {
        node_id : id,
        filename: $('#' + id).val()
    });
    socket.on('report_mediainfo', function(r) {
        $('#' + id.replace('file', 'playrate')).val(r.playrate);
    });
});

$('[id$=_file_search]').on('input', function () {
    let node = this.id.match(/\d+/g).map(Number)[0];
    $(`#node${node}_file`).html('');
    socket.emit('filter_ts', {node: node, name: $('#' + this.id).val()})
});
