import { pool } from '../config/db.js';

export const getNotifications = async (req, res) => {
    try {
        const rawId = req.user?.id || req.user?._id;
        const userId = parseInt(rawId, 10);
        if (isNaN(userId)) {
            return res.json([]);
        }
        const result = await pool.query(
            `SELECT *, to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at_utc
             FROM notifications WHERE recipient_id = $1 ORDER BY created_at DESC LIMIT 50`,
            [userId]
        );
        // Return rows with normalized UTC timestamp
        const rows = result.rows.map(r => ({
            ...r,
            created_at: r.created_at_utc || r.created_at
        }));
        res.json(rows);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.json([]);
    }
};

export const markAsRead = async (req, res) => {
    try {
        const rawId = req.user?.id || req.user?._id;
        const userId = parseInt(rawId, 10);
        if (isNaN(userId)) return res.json({});

        const result = await pool.query(
            `UPDATE notifications SET is_read = true WHERE id = $1 AND recipient_id = $2 RETURNING *`,
            [parseInt(req.params.id, 10), userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const markAllAsRead = async (req, res) => {
    try {
        const rawId = req.user?.id || req.user?._id;
        const userId = parseInt(rawId, 10);
        if (isNaN(userId)) return res.json({ message: 'Marked read' });

        await pool.query(
            `UPDATE notifications SET is_read = true WHERE recipient_id = $1 AND is_read = false`,
            [userId]
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const clearAllNotifications = async (req, res) => {
    try {
        const rawId = req.user?.id || req.user?._id;
        const userId = parseInt(rawId, 10);
        if (isNaN(userId)) return res.json({ message: 'All notifications cleared' });

        await pool.query(`DELETE FROM notifications WHERE recipient_id = $1`, [userId]);
        res.json({ message: 'All notifications cleared' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
