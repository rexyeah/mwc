
// Handle upload file section UI

$('#file').on('change', function (e) {
    $('#node_farm').hide();
    $('#progressBar').show();
    $('#cancel').show();
});


$('#cancel').on('click', function (e) {
    $('#node_farm').show();
    $('#progressBar').hide();
    $('#cancel').hide();
});

// Handle upload action
$('#upload').on('click', function (event) {
    var formData = new FormData($('#upload_form')[0]);
    $.ajax({
        xhr: function () {
            var xhr = new window.XMLHttpRequest();
            xhr.upload.addEventListener("progress", function (evt) {
                if (evt.lengthComputable) {
                    var percent = evt.loaded / evt.total;
                    console.log(percent*100)
                    $('#progressBar').val(Math.round(percent*100));
                }
            }, false);
            return xhr;
        },
        type: 'POST',
        url: "/",
        data: formData,
        processData: false,
        contentType: false,
        success: function (data) {}
    });
});
