import express from 'express';
import { query, validationResult } from 'express-validator';
import webSocket from 'ws';

const router = express.Router();

const validateRequest = (req, res, next) => {
    const errors  = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }
    next();
};

const VALID_TIME_INTERVALS = [
    '1 minute', '5 minutes', '10 minutes', '15 minutes', '30 minutes',
    '1 hour', '2 hours', '6 hours', '12 hours',
    '1 day', '1 week', '1 month'
  ];
  
/**
 * GET /api/transactions
 * Get a paginated list of transactions
 */
router.get(
    '/',[
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
    validateRequest,
    ], async (req, res, next) => {
        const limit = parseInt(req.query.limit || 25);
        const offset = parseInt(req.query.offset || 0);
        console.log(`Fetching transactions with limit=${limit}, offset=${offset}`);

        try {
            const pool = req.app.locals.pool;

            const transactionsQuery = { 
                text: `SELECT * FROM transactions ORDER BY time DESC
                LIMIT $1 OFFSET $2`,
                values: [limit, offset],
            };

            const countQuery = {
                text: `SELECT COUNT(*) as total FROM transactions`,
            };

            const [transactionsResult, countResult] = await Promise.all([
                pool.query(transactionsQuery),
                pool.query(countQuery),
            ]);

            console.log(`Found ${transactionsResult.rows.length} transactions, total count: ${countResult.rows[0].total}`);

            const totalCount = parseInt(countResult.rows[0].total);
            const totalPages = Math.ceil(totalCount / limit);

            res.set({
                'X-Total-Count': totalCount,
                'X-Total-Pages': totalPages,
                'X-Current-Page': offset / limit + 1,
                'X-Per-Page': limit,
            });

            res.json({
                rows: transactionsResult.rows,
                totalCount: totalCount,
                pagination: {
                    limit,
                    offset,
                    currentPage: Math.floor(offset / limit) + 1,
                    totalPages
                }
            });
        } catch (error) {
            next(error);
        }
});
/**
 * GET /api/transactions/range
 * Get transactions within a date range
 */
router.get("/range", [
    query('start').isDate().withMessage('Valid start date is required'),
    query('end').isDate().withMessage('Valid end date is required'),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
    validateRequest
  ], async (req, res, next) => {
    const limit = req.query.limit || 25;
    const offset = req.query.offset || 0;
    const startDate = req.query.start;
    const endDate = req.query.end;
    
    // Validate end date is not before start date
    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({
        error: "Invalid date range",
        message: "End date cannot be before start date"
      });
    }
    
    try {
      const pool = req.app.locals.pool;
      
      // Use proper date handling with PostgreSQL date functions
      const transactionsQuery = {
        text: `
          SELECT * FROM transactions 
          WHERE time >= $1::date AND time <= ($2::date + interval '1 day - 1 second')
          ORDER BY time DESC
          LIMIT $3 OFFSET $4
        `,
        values: [startDate, endDate, limit, offset],
      };
      
      const countQuery = {
        text: `
          SELECT COUNT(*) as total FROM transactions 
          WHERE time >= $1::date AND time <= ($2::date + interval '1 day - 1 second')
        `,
        values: [startDate, endDate],
      };
      
      const [transactionsResult, countResult] = await Promise.all([
        pool.query(transactionsQuery),
        pool.query(countQuery),
      ]);
      
      // Add pagination metadata headers
      const totalCount = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalCount / limit);
      
      res.set({
        'X-Total-Count': totalCount,
        'X-Total-Pages': totalPages,
        'X-Current-Page': Math.floor(offset / limit) + 1
      });
      
      res.json({
        rows: transactionsResult.rows,
        totalCount: totalCount,
        pagination: {
          limit,
          offset,
          currentPage: Math.floor(offset / limit) + 1,
          totalPages
        }
      });
    } catch (error) {
      next(error);
    }
  });
  /**
 * GET /api/transactions/by-time
 * Get time-bucketed transaction data
 */
router.get("/by-time", [
    query('interval')
      .isIn(VALID_TIME_INTERVALS)
      .withMessage(`Interval must be one of: ${VALID_TIME_INTERVALS.join(', ')}`),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    validateRequest
  ], async (req, res, next) => {
    const interval = req.query.interval;
    const limit = req.query.limit || 30;
    
    try {
      const pool = req.app.locals.pool;
      
      const query = {
        text: `
          SELECT 
            time_bucket($1, time) AS bucket,
            COUNT(*) as transaction_count,
            SUM(output_total) as total_volume,
            AVG(fee) as avg_fee,
            MAX(output_total) as max_transaction,
            MIN(output_total) as min_transaction
          FROM transactions
          GROUP BY bucket
          ORDER BY bucket DESC
          LIMIT $2
        `,
        values: [interval, limit],
      };
      
      const result = await pool.query(query);
      res.json(result.rows);
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * GET /api/transactions/search
   * Search transactions by hash
   */
  router.get("/search", [
    query('term').isString().isLength({ min: 3 }).withMessage('Search term must be at least 3 characters'),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    validateRequest
  ], async (req, res, next) => {
    const searchTerm = req.query.term;
    const limit = req.query.limit || 25;
    
    try {
      const pool = req.app.locals.pool;
      
      const transactionsQuery = {
        text: `
          SELECT * FROM transactions 
          WHERE hash ILIKE $1
          ORDER BY time DESC
          LIMIT $2
        `,
        values: [`%${searchTerm}%`, limit],
      };
      
      const countQuery = {
        text: `
          SELECT COUNT(*) as total FROM transactions 
          WHERE hash ILIKE $1
        `,
        values: [`%${searchTerm}%`],
      };
      
      const [transactionsResult, countResult] = await Promise.all([
        pool.query(transactionsQuery),
        pool.query(countQuery),
      ]);
      
      res.json({
        rows: transactionsResult.rows,
        totalCount: parseInt(countResult.rows[0].total),
      });
    } catch (error) {
      next(error);
    }
  });
  
  
  export default router;