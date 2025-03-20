<script>
    import { onMount } from 'svelte';
    import { TransactionService } from './services/TransactionService';
    
    // Create transaction service instance
    const transactionService = new TransactionService();
    
    // State variables
    let transactions = [];
    let totalCount = 0;
    let isLoading = true;
    let error = null;
    
    // Time-series data
    let timeSeriesData = [];
    let timeSeriesLoading = false;
    let timeSeriesError = null;
    
    // View mode
    let viewMode = 'table'; // 'table' or 'timeSeries'
    
    // Pagination state
    let currentPage = 0;
    let pageSize = 25;
    let searchTerm = '';
    
    // Time filtering
    let startTime = '';
    let endTime = '';
    let timeInterval = '1 day';
    let selectedTimeRange = '7d'; // Default to 7 days
    
    // Fetch regular transactions with pagination
    async function fetchTransactions() {
      isLoading = true;
      error = null;
      
      try {
        console.log("Fetching transactions...");
        const offset = currentPage * pageSize;
        let data;
        
        if (searchTerm) {
          data = await transactionService.searchTransactions(searchTerm, pageSize, offset);
        } else if (startTime && endTime) {
          data = await transactionService.getTransactionsByDateRange(startTime, endTime, pageSize, offset);
        } else {
          data = await transactionService.getTransactions(pageSize, offset);
        }
        
        console.log("Transactions data:", data);
        transactions = data.rows || [];
        totalCount = data.totalCount || 0;
        
        if (!transactions.length) {
          console.log("No transactions found in response");
        } else {
          console.log(`Loaded ${transactions.length} transactions, total count: ${totalCount}`);
        }
      } catch (err) {
        console.error('Error fetching transactions:', err);
        error = err.message;
        transactions = [];
      } finally {
        isLoading = false;
      }
    }
    
    // Fetch time-series data
    async function fetchTimeSeriesData() {
      timeSeriesLoading = true;
      timeSeriesError = null;
      
      try {
        // Calculate time range based on selection
        const now = new Date();
        let start = new Date(now);
        
        switch (selectedTimeRange) {
          case '1h':
            start.setHours(now.getHours() - 1);
            timeInterval = '5 minutes';
            break;
          case '24h':
            start.setDate(now.getDate() - 1);
            timeInterval = '1 hour';
            break;
          case '7d':
            start.setDate(now.getDate() - 7);
            timeInterval = '1 day';
            break;
          case '30d':
            start.setDate(now.getDate() - 30);
            timeInterval = '1 day';
            break;
          case '90d':
            start.setDate(now.getDate() - 90);
            timeInterval = '1 week';
            break;
          default:
            start.setDate(now.getDate() - 7);
            timeInterval = '1 day';
        }
        
        const startIso = start.toISOString();
        const endIso = now.toISOString();
        
        // Update the time range inputs
        startTime = startIso.substring(0, 10);
        endTime = endIso.substring(0, 10);
        
        // Use the service instead of direct fetch
        const data = await transactionService.getTransactionsByTime(timeInterval, 50);
        timeSeriesData = data;
      } catch (err) {
        console.error('Error fetching time series data:', err);
        timeSeriesError = err.message;
        timeSeriesData = [];
      } finally {
        timeSeriesLoading = false;
      }
    }
    
    // Handle pagination
    function goToPreviousPage() {
      if (currentPage > 0) {
        currentPage -= 1;
        console.log("Going to previous page:", currentPage);
        fetchTransactions();
      }
    }
    
    function goToNextPage() {
      currentPage += 1;
      console.log("Going to next page:", currentPage);
      fetchTransactions();
    }
    
    // Handle search
    function handleSearch() {
      currentPage = 0;
      fetchTransactions();
    }
    
    // Handle pageSize change
    function handlePageSizeChange(event) {
      pageSize = parseInt(event.target.value);
      currentPage = 0;
      fetchTransactions();
    }
    
    // Handle time range change
    function handleTimeRangeChange() {
      fetchTimeSeriesData();
      
      // Also update the transaction list if we're filtering by time
      if (viewMode === 'table' && startTime && endTime) {
        currentPage = 0;
        fetchTransactions();
      }
    }
    
    // Handle view mode change
    function setViewMode(mode) {
      viewMode = mode;
      
      if (mode === 'timeSeries' && timeSeriesData.length === 0) {
        fetchTimeSeriesData();
      }
    }
    
    // Handle time range form submission
    function handleTimeRangeSubmit(event) {
      event.preventDefault();
      currentPage = 0;
      fetchTransactions();
    }
    
    // Format functions
    function formatBTC(value) {
      return parseFloat(value).toFixed(8) + ' BTC';
    }
    
    function formatUSD(value) {
      return '$' + parseFloat(value).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
    
    function formatSize(bytes) {
      if (bytes < 1024) {
        return bytes + ' bytes';
      } else if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(2) + ' KB';
      } else {
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
      }
    }
    
    function formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleString();
    }
    
    function formatTimeBucket(bucket) {
      const date = new Date(bucket);
      return date.toLocaleString();
    }
    
    // Initialize data on component mount
    onMount(() => {
      console.log("Component mounted, fetching initial data");
      fetchTransactions();
    });
  </script>
  
  <main>
    <div class="container">
      <h1>Bitcoin Transactions</h1>
      
      <div class="view-controls">
        <button 
          class={viewMode === 'table' ? 'active' : ''} 
          on:click={() => setViewMode('table')}
        >
          Transaction List
        </button>
        <button 
          class={viewMode === 'timeSeries' ? 'active' : ''} 
          on:click={() => setViewMode('timeSeries')}
        >
          Time Series View
        </button>
      </div>
      
      {#if viewMode === 'table'}
        <!-- Filters for transaction table -->
        <div class="filters">
          
          <div class="filter-item">
            <label for="search">Search by hash</label>
            <input 
              type="text" 
              id="search" 
              bind:value={searchTerm} 
              placeholder="Enter transaction hash..."
            />
          </div>
          
          <div class="filter-item">
            <button on:click={handleSearch}>Search</button>
          </div>
        </div>
        
        <!-- Time range filter -->
        <div class="time-filter">
          <form on:submit={handleTimeRangeSubmit}>
            <div class="filter-row">
              <div class="filter-item">
                <label for="startTime">Start Date</label>
                <input 
                  type="date" 
                  id="startTime" 
                  bind:value={startTime}
                />
              </div>
              
              <div class="filter-item">
                <label for="endTime">End Date</label>
                <input 
                  type="date" 
                  id="endTime" 
                  bind:value={endTime}
                />
              </div>
              
              <div class="filter-item">
        
                <button type="submit">Apply Date Filter</button>
              </div>
            </div>
          </form>
        </div>
        
        <!-- Loading state -->
        {#if isLoading}
          <div class="loading">
            <p>Loading transactions...</p>
          </div>
        {/if}
        
        <!-- Error state -->
        {#if error}
          <div class="error">
            <p>Error: {error}</p>
          </div>
        {/if}
        
        <!-- Transactions table -->
        {#if !isLoading && !error && transactions.length > 0}
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Hash</th>
                  <th>Block ID</th>
                  <th>Time</th>
                  <th>Output Total</th>
                  <th>USD Value</th>
                  <th>Fee</th>
                  <th>Size</th>
                </tr>
              </thead>
              <tbody>
                {#each transactions as tx (tx.hash)}
                  <tr>
                    <td class="hash-cell" title={tx.hash}>{tx.hash}</td>
                    <td>{tx.block_id}</td>
                    <td>{formatDate(tx.time)}</td>
                    <td>{formatBTC(tx.output_total)}</td>
                    <td>{formatUSD(tx.output_total_usd)}</td>
                    <td>{formatBTC(tx.fee)}</td>
                    <td>{formatSize(tx.size)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
          
          <!-- Pagination -->
          <div class="pagination">
            <div class="pagination-info">
              Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, totalCount)} of {totalCount} entries
            </div>
            <div class="pagination-controls">
              <button on:click={goToPreviousPage} disabled={currentPage === 0}>
                Previous
              </button>
              <button on:click={goToNextPage} disabled={(currentPage + 1) * pageSize >= totalCount}>
                Next
              </button>
            </div>
          </div>
        {:else if !isLoading && !error}
          <div class="no-data">
            <p>No transactions found. Check your console for details.</p>
          </div>
        {/if}
      {:else if viewMode === 'timeSeries'}
        <!-- Time series view -->
        <div class="time-series-filters">
          <div class="filter-item">
            <label for="timeRange">Time Range</label>
            <select id="timeRange" bind:value={selectedTimeRange} on:change={handleTimeRangeChange}>
              <option value="1h">Last hour</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </div>
        
        <!-- Loading state -->
        {#if timeSeriesLoading}
          <div class="loading">
            <p>Loading time series data...</p>
          </div>
        {/if}
        
        <!-- Error state -->
        {#if timeSeriesError}
          <div class="error">
            <p>Error: {timeSeriesError}</p>
          </div>
        {/if}
        
        <!-- Time series data -->
        {#if !timeSeriesLoading && !timeSeriesError && timeSeriesData.length > 0}
          <div class="time-series-grid">
            <!-- First card: Transaction count -->
            <div class="time-series-card">
              <h3>Transaction Volume</h3>
              <div class="time-series-table">
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Transactions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each timeSeriesData as bucket}
                      <tr>
                        <td>{formatTimeBucket(bucket.bucket)}</td>
                        <td>{bucket.transaction_count}</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>
            
            <!-- Second card: Total volume -->
            <div class="time-series-card">
              <h3>BTC Volume</h3>
              <div class="time-series-table">
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Total Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each timeSeriesData as bucket}
                      <tr>
                        <td>{formatTimeBucket(bucket.bucket)}</td>
                        <td>{formatBTC(bucket.total_volume || 0)}</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>
            
            <!-- Third card: Average fee -->
            <div class="time-series-card">
              <h3>Average Fee</h3>
              <div class="time-series-table">
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Average Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each timeSeriesData as bucket}
                      <tr>
                        <td>{formatTimeBucket(bucket.bucket)}</td>
                        <td>{formatBTC(bucket.avg_fee || 0)}</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        {:else if !timeSeriesLoading && !timeSeriesError}
          <div class="no-data">
            <p>No time series data available.</p>
          </div>
        {/if}
      {/if}
    </div>
  </main>
  
  <style>
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    
    h1 {
      margin-bottom: 20px;
    }
    
    .view-controls {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    
    .view-controls button {
      padding: 10px 15px;
      background-color: #f2f2f2;
      color: #333;
    }
    
    .view-controls button.active {
      background-color: #4CAF50;
      color: white;
    }
    
    .filters, .time-filter, .time-series-filters {
      display: flex;
      gap: 15px;
      margin-bottom: 20px;
      padding: 15px;
      background-color: #f8f9fa;
      border-radius: 5px;
    }
    
    .filter-row {
      display: flex;
      gap: 15px;
      width: 100%;
    }
    
    .filter-item {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    
    .table-container, .time-series-table {
      overflow-x: auto;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    
    th {
      background-color: #f2f2f2;
      font-weight: bold;
    }
    
    tr:hover {
      background-color: #f5f5f5;
    }
    
    .hash-cell {
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .pagination {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 20px;
    }
    
    .pagination-controls {
      display: flex;
      gap: 10px;
    }
    
    button {
      padding: 8px 16px;
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    
    button:disabled {
      background-color: #cccccc;
      cursor: not-allowed;
    }
    
    button:not(:disabled):hover {
      background-color: #45a049;
    }
    
    .loading, .error, .no-data {
      padding: 20px;
      text-align: center;
    }
    
    .error {
      color: #721c24;
      background-color: #f8d7da;
      border: 1px solid #f5c6cb;
      border-radius: 4px;
    }
    
    input, select {
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    
    .time-series-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 20px;
    }
    
    .time-series-card {
      background-color: #f9f9f9;
      border-radius: 8px;
      padding: 15px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    .time-series-card h3 {
      margin-top: 0;
      margin-bottom: 15px;
      color: #333;
      font-size: 18px;
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
      .filters, .time-filter, .filter-row {
        flex-direction: column;
      }
      
      .time-series-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>