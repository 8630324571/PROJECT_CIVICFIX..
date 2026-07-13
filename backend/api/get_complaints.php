<?php
require_once __DIR__ . '/../config/db.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(["error" => "Not logged in."]);
    exit;
}

$role = $_SESSION['role'];
$user_id = $_SESSION['user_id'];

// Optional filters (used by admin dashboard)
$status = $_GET['status'] ?? null;
$category = $_GET['category'] ?? null;

try {
    if ($role === 'admin') {
        // Admins see everything, with optional filters
        $sql = "SELECT c.*, u.name AS reporter_name, u.email AS reporter_email
                FROM complaints c
                JOIN users u ON c.user_id = u.id
                WHERE 1=1";
        $params = [];

        if ($status) {
            $sql .= " AND c.status = ?";
            $params[] = $status;
        }
        if ($category) {
            $sql .= " AND c.category = ?";
            $params[] = $category;
        }
        $sql .= " ORDER BY c.created_at DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
    } else {
        // Citizens only see their own complaints
        $stmt = $pdo->prepare("SELECT * FROM complaints WHERE user_id = ? ORDER BY created_at DESC");
        $stmt->execute([$user_id]);
    }

    $complaints = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Attach the update history (who changed status, their designation, remarks)
    // to every complaint so citizens can see exactly which official acted on it.
    if (count($complaints) > 0) {
        $ids = array_column($complaints, 'id');
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $histStmt = $pdo->prepare("
            SELECT cu.complaint_id, cu.status, cu.remarks, cu.updated_at,
                   u.name AS admin_name, u.employee_id, u.designation, u.admin_photo
            FROM complaint_updates cu
            LEFT JOIN users u ON cu.updated_by = u.id
            WHERE cu.complaint_id IN ($placeholders)
            ORDER BY cu.updated_at ASC
        ");
        $histStmt->execute($ids);
        $history = $histStmt->fetchAll(PDO::FETCH_ASSOC);

        $historyByComplaint = [];
        foreach ($history as $h) {
            $historyByComplaint[$h['complaint_id']][] = $h;
        }
        foreach ($complaints as &$c) {
            $c['updates'] = $historyByComplaint[$c['id']] ?? [];
        }
        unset($c);
    }

    echo json_encode(["success" => true, "complaints" => $complaints]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Failed to fetch complaints: " . $e->getMessage()]);
}
?>
