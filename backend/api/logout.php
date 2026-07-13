<?php
require_once __DIR__ . '/../config/db.php';
session_destroy();
echo json_encode(["success" => true, "message" => "Logged out."]);
?>
