if (file_exists($_SERVER['DOCUMENT_ROOT']. $_FILES["file"]["name"])) {
    echo 'file exists';
} else {
    $uploaddir = 'uploads/';
    $uploadfile = $uploaddir . basename($_FILES['Filedata']['name']);
    if(move_uploaded_file($_FILES["Filedata"]["tmp_name"], $uploadfile)) {              
        echo 'success';
} else {
    echo 'error';
}   
}