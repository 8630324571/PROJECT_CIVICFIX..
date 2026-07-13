<?php
require_once __DIR__ . '/../config/db.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(["error" => "You must be logged in to submit a complaint."]);
    exit;
}

// This endpoint accepts multipart/form-data (because of optional photo upload)
$user_id = $_SESSION['user_id'];
$title = trim($_POST['title'] ?? '');
$description = trim($_POST['description'] ?? '');
$latitude = $_POST['latitude'] ?? null;
$longitude = $_POST['longitude'] ?? null;
$category = $_POST['category'] ?? 'Other';

// Only allow known categories — anything else falls back to "Other"
$allowedCategories = ['Roads', 'Sanitation', 'Electricity', 'Water', 'Other'];
if (!in_array($category, $allowedCategories)) {
    $category = 'Other';
}

if (!$title || !$description) {
    http_response_code(400);
    echo json_encode(["error" => "Title and description are required."]);
    exit;
}

// Handle optional photo upload
$photo_path = null;
if (isset($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
    $uploadDir = __DIR__ . '/../uploads/';
    $ext = pathinfo($_FILES['photo']['name'], PATHINFO_EXTENSION);
    $filename = uniqid('complaint_') . '.' . $ext;
    $target = $uploadDir . $filename;

    $allowed = ['jpg', 'jpeg', 'png', 'gif'];
    if (in_array(strtolower($ext), $allowed) && move_uploaded_file($_FILES['photo']['tmp_name'], $target)) {
        $photo_path = 'uploads/' . $filename;
    }
}

try {
    $stmt = $pdo->prepare("INSERT INTO complaints
        (user_id, title, description, category, latitude, longitude, photo_path)
        VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$user_id, $title, $description, $category, $latitude, $longitude, $photo_path]);
    $complaint_id = $pdo->lastInsertId();

    // Log initial status in history table
    $stmt = $pdo->prepare("INSERT INTO complaint_updates (complaint_id, status, remarks, updated_by)
                            VALUES (?, 'pending', 'Complaint submitted', ?)");
    $stmt->execute([$complaint_id, $user_id]);

    echo json_encode([
        "success" => true,
        "complaint_id" => $complaint_id,
        "category" => $category
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Failed to save complaint: " . $e->getMessage()]);
}
?>