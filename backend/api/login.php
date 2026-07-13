<?php
require_once __DIR__ . '/../config/db.php';

$data = json_decode(file_get_contents("php://input"), true);

$email = trim($data['email'] ?? '');
$password = $data['password'] ?? '';

if (!$email || !$password) {
    http_response_code(400);
    echo json_encode(["error" => "Email and password are required."]);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT id, name, email, password, role, employee_id, designation, admin_photo FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || !password_verify($password, $user['password'])) {
        http_response_code(401);
        echo json_encode(["error" => "Invalid email or password."]);
        exit;
    }

    // Store session
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['role'] = $user['role'];
    $_SESSION['name'] = $user['name'];
    $_SESSION['designation'] = $user['designation'];
    $_SESSION['employee_id'] = $user['employee_id'];
    $_SESSION['admin_photo'] = $user['admin_photo'];

    unset($user['password']);
    echo json_encode(["success" => true, "user" => $user]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Login failed: " . $e->getMessage()]);
}
?>
