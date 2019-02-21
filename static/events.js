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
                result['ot'] = $('input[id$=ot]').eq((n-1)).val()
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
    let slot = get_slot(this.id);
    let docker_enabled = $('div[id$=_parm_block]').eq(slot).is(':visible');
    let docker_blocks = $(`div[id$=_parm_block]:eq(${slot}), span[id$=_ot_block]:eq(${slot})`);
    this.value = docker_enabled ? "1" : "0"
    docker_enabled ? docker_blocks.hide("slow") : docker_blocks.show("slow");
    socket.emit('set_docker',{
        'node': slot,
        'docker': this.value
    });
});

$('input[id$=ot]').on('click', function() {
    let slot = get_slot(this.id);
    this.value = this.checked ? "1" : "0";
    socket.emit('set_overtime',{
        'node': slot,
        'ot': this.value
    });
});

$("select[id$=file]").on("change", function () {
    let slot = get_slot(this.id)
    socket.emit("get_mediainfo", {
        "filename": $(this).val()
    });
    socket.on("report_mediainfo", function(r) {
        $(`input[id$=playrate]:eq(${slot})`).val(r.playrate);
    });
});

$("input[id$=_file_search]").on("input", function () {
    let slot = get_slot(this.id)
    $(`select[id$=file]:eq(${slot})`).html("");
    socket.emit("filter_ts", {"node": slot, "name": $(this).val()})
});
