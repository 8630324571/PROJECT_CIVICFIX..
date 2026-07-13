<?php
require_once __DIR__ . '/../config/db.php';

$data = json_decode(file_get_contents("php://input"), true);

$name = trim($data['name'] ?? '');
$email = trim($data['email'] ?? '');
$password = $data['password'] ?? '';
$role = $data['role'] ?? 'citizen'; // allow 'admin' only for demo/testing purposes
$employee_id = trim($data['employee_id'] ?? '');
$designation = trim($data['designation'] ?? '');
$live_photo = $data['live_photo'] ?? null; // base64 data URL from webcam capture, admins only

if (!$name || !$email || !$password) {
    http_response_code(400);
    echo json_encode(["error" => "Name, email and password are required."]);
    exit;
}

if (!in_array($role, ['citizen', 'admin'])) {
    $role = 'citizen';
}

// Admins must identify themselves — this ID/designation/photo is shown on
// every action they take, so citizens always know which official made a change.
if ($role === 'admin' && (!$employee_id || !$designation)) {
    http_response_code(400);
    echo json_encode(["error" => "Employee ID and designation are required for admin accounts."]);
    exit;
}
if ($role !== 'admin') {
    $employee_id = null;
    $designation = null;
    $live_photo = null;
}

$admin_photo_path = null;
if ($role === 'admin') {
    if (!$live_photo || strpos($live_photo, 'data:image/') !== 0) {
        http_response_code(400);
        echo json_encode(["error" => "A live camera photo is required for admin accounts."]);
        exit;
    }

    // Expect "data:image/jpeg;base64,...."
    if (!preg_match('/^data:image\/(jpeg|jpg|png);base64,(.+)$/', $live_photo, $matches)) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid photo format."]);
        exit;
    }
    $imgData = base64_decode($matches[2]);
    if ($imgData === false || strlen($imgData) < 1000) {
        http_response_code(400);
        echo json_encode(["error" => "Captured photo appears invalid. Please retake it."]);
        exit;
    }
    // Cap size (~5MB) to avoid abuse
    if (strlen($imgData) > 5 * 1024 * 1024) {
        http_response_code(400);
        echo json_encode(["error" => "Photo is too large."]);
        exit;
    }

    $uploadDir = __DIR__ . '/../uploads/admin_photos/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    $filename = 'admin_' . bin2hex(random_bytes(8)) . '.jpg';
    file_put_contents($uploadDir . $filename, $imgData);
    $admin_photo_path = 'uploads/admin_photos/' . $filename;
}

try {
    // Check if email already exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(["error" => "Email already registered."]);
        exit;
    }

    $hashed = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO users (name, email, password, role, employee_id, designation, admin_photo) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$name, $email, $hashed, $role, $employee_id, $designation, $admin_photo_path]);

    echo json_encode([
        "success" => true,
        "message" => "Account created successfully.",
        "user_id" => $pdo->lastInsertId()
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Registration failed: " . $e->getMessage()]);
}
?>
