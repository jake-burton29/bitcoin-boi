export class TransactionService {
    /**
   * Get transactions with pagination
   * @param {number} limit - Number of items per page
   * @param {number} offset - Starting offset
   * @returns {Promise<Object>} - Transactions data
   */
    async getTransactions(limit = 25, offset = 0) {
        try {
            const response = await fetch(`/api/transactions?limit=${limit}&offset=${offset}`);
            
            if (!response.ok) {
                throw new Error(await this.handleResponseError(response));
            }
            return await response.json();
            
        } catch (error) {
            console.error('Error fetching transactions:', error);
            throw error;
        }
    }
  /**
   * Get transactions by date range
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @param {number} limit - Number of items per page
   * @param {number} offset - Starting offset
   * @returns {Promise<Object>} - Transactions data
   */  
    async getTransactionsByDateRange(startDate, endDate, limit = 25, offset = 0) {
        try {
            const response = await fetch(`/api/transactions-range?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}&limit=${limit}&offset=${offset}`);
            
            if (!response.ok) {
                throw new Error(await this.handleResponseError(response));
            }
            return await response.json();
            
        } catch (error) {
            console.error('Error fetching transactions by date range:', error);
            throw error;
        }
    }

/**
   * Search transactions by hash
   * @param {string} term - Search term
   * @param {number} limit - Number of items to return
   * @returns {Promise<Object>} - Search results
   */
    async searchTransactions(term, limit = 25, offset = 0) {
        try {
            const response = await fetch(`/api/transactions/search?term=${encodeURIComponent(term)}&limit=${limit}`);
            
            if (!response.ok) {
              throw new Error(await this.handleErrorResponse(response));
            }
            
            return await response.json();
          } catch (error) {
            console.error('Error in TransactionService.searchTransactions:', error);
            throw error;
          }
        }
/**
   * Get time-bucketed transaction data
   * @param {string} interval - Time interval for buckets
   * @param {number} limit - Number of buckets to return
   * @returns {Promise<Array>} - Time series data
   */
async getTransactionsByTime(interval = '1 day', limit = 50) {
    try {
      const response = await fetch(`/api/transactions/by-time?interval=${encodeURIComponent(interval)}&limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(await this.handleErrorResponse(response));
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error in TransactionService.getTransactionsByTime:', error);
      throw error;
    }
  }
  /**
   * Handle error responses from the API
   * @param {Response} response - Fetch Response object
   * @returns {Promise<string>} - Error message
   */
  async handleErrorResponse(response) {
    try {
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        return errorData.message || errorData.error || `API error: ${response.status}`;
      } else {
        return `API error: ${response.status}`;
      }
    } catch (e) {
      return `API error: ${response.status}`;
    }
  }
    
    
}