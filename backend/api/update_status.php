<?php
require_once __DIR__ . '/../config/db.php';

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(["error" => "Only admins can update complaint status."]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$complaint_id = $data['complaint_id'] ?? null;
$status = $data['status'] ?? null;
$remarks = trim($data['remarks'] ?? '');

$validStatuses = ['pending', 'in_progress', 'resolved'];
if (!$complaint_id || !in_array($status, $validStatuses)) {
    http_response_code(400);
    echo json_encode(["error" => "Valid complaint_id and status are required."]);
    exit;

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare("UPDATE complaints SET status = ? WHERE id = ?");
    $stmt->execute([$status, $complaint_id]);

    $stmt = $pdo->prepare("INSERT INTO complaint_updates (complaint_id, status, remarks, updated_by)
                            VALUES (?, ?, ?, ?)");
    $stmt->execute([$complaint_id, $status, $remarks, $_SESSION['user_id']]);

    $pdo->commit();
    echo json_encode(["success" => true, "message" => "Status updated."]);
} catch (PDOException $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["error" => "Update failed: " . $e->getMessage()]);
}
?>
