<?php
require_once __DIR__ . '/../config/db.php';

if (isset($_SESSION['user_id'])) {
    echo json_encode([
        "logged_in" => true,
        "user" => [
            "id" => $_SESSION['user_id'],
            "name" => $_SESSION['name'],
            "role" => $_SESSION['role'],
            "designation" => $_SESSION['designation'] ?? null,
            "employee_id" => $_SESSION['employee_id'] ?? null,
            "admin_photo" => $_SESSION['admin_photo'] ?? null
        ]
    ]);
} else {
    echo json_encode(["logged_in" => false]);
}
?>
