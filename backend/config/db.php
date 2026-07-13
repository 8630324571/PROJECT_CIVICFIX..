<?php
// Database connection config for CivicFix
// Update these if your XAMPP MySQL credentials differ

$DB_HOST = "localhost";
$DB_NAME = "civicfix";
$DB_USER = "root";
$DB_PASS = "";

try {
    $pdo = new PDO("mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4", $DB_USER, $DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database connection failed: " . $e->getMessage()]);
    exit;
}

// CORS + JSON headers (allow local frontend to call this API)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Simple session start (used for login state)
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
?>
