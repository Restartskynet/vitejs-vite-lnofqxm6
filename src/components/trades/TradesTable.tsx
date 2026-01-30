import { useState, useMemo, useEffect } from 'react';
import type { Trade } from '../../engine/types';
import { Card, Badge, SearchInput } from '../ui';
import { formatMoney, cn } from '../../lib/utils';
import { TradeRow } from './TradeRow';

type SortField = 'date' | 'symbol' | 'pnl' | 'pnlPercent' | 'quantity';
type SortDirection = 'asc' | 'desc';

interface TradesTableProps {
  trades: Trade[];
  className?: string;
}

export function TradesTable({ trades, className }: TradesTableProps) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showActive, setShowActive] = useState(true);
  const [showClosed, setShowClosed] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);

  // Filter and sort trades
  const filteredTrades = useMemo(() => {
    let result = [...trades];
    
    // Filter by search
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(t => 
        t.symbol.toLowerCase().includes(searchLower)
      );
    }
    
    // Filter by status
    if (!showActive) result = result.filter(t => t.status !== 'ACTIVE');
    if (!showClosed) result = result.filter(t => t.status !== 'CLOSED');
    
    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'date':
          comparison = a.entryDate.getTime() - b.entryDate.getTime();
          break;
        case 'symbol':
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case 'pnl':
          comparison = a.totalPnL - b.totalPnL;
          break;
        case 'pnlPercent':
          comparison = a.pnlPercent - b.pnlPercent;
          break;
        case 'quantity':
          comparison = a.quantity - b.quantity;
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [trades, search, sortField, sortDirection, showActive, showClosed]);

  useEffect(() => {
    setPage(0);
  }, [search, sortField, sortDirection, showActive, showClosed]);

  const totalPages = Math.max(1, Math.ceil(filteredTrades.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const startIdx = currentPage * pageSize;
  const endIdx = Math.min(startIdx + pageSize, filteredTrades.length);

  useEffect(() => {
    if (page > totalPages - 1) {
      setPage(totalPages - 1);
    }
  }, [page, totalPages]);

  const paginatedTrades = useMemo(() => {
    return filteredTrades.slice(startIdx, endIdx);
  }, [filteredTrades, startIdx, endIdx]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Summary stats
  const stats = useMemo(() => {
    const closed = filteredTrades.filter(t => t.status === 'CLOSED');
    const wins = closed.filter(t => t.outcome === 'WIN');
    const losses = closed.filter(t => t.outcome === 'LOSS');
    const totalPnL = closed.reduce((sum, t) => sum + t.totalPnL, 0);
    
    return {
      total: filteredTrades.length,
      open: filteredTrades.filter(t => t.status === 'ACTIVE').length,
      closed: closed.length,
      wins: wins.length,
      losses: losses.length,
      totalPnL,
    };
  }, [filteredTrades]);

  const SortIcon = ({ field }: { field: SortField }) => (
    <span className={cn('ml-1', sortField === field ? 'text-white' : 'text-slate-600')}>
      {sortField === field ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );

  return (
    <Card noPadding className={className}>
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Trade History</h3>
            <p className="text-xs text-slate-500">
              {stats.total} trades • {stats.wins}W / {stats.losses}L • 
              <span className={cn('ml-1', stats.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {formatMoney(stats.totalPnL)}
              </span>
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
              placeholder="Search symbol..."
              inputSize="sm"
              className="w-40"
            />
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowActive(!showActive)}
                className={cn(
                  'px-2 py-1 text-xs rounded-lg border transition-all',
                  showActive 
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' 
                    : 'bg-transparent border-white/10 text-slate-500'
                )}
              >
                Active
              </button>
              <button
                onClick={() => setShowClosed(!showClosed)}
                className={cn(
                  'px-2 py-1 text-xs rounded-lg border transition-all',
                  showClosed 
                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-400' 
                    : 'bg-transparent border-white/10 text-slate-500'
                )}
              >
                Closed
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs text-slate-500 uppercase tracking-wider">
              <th className="p-3 w-8"></th>
              <th className="p-3 cursor-pointer hover:text-white" onClick={() => handleSort('date')}>
                Date <SortIcon field="date" />
              </th>
              <th className="p-3 cursor-pointer hover:text-white" onClick={() => handleSort('symbol')}>
                Symbol <SortIcon field="symbol" />
              </th>
              <th className="p-3">Side</th>
              <th className="p-3 cursor-pointer hover:text-white text-right" onClick={() => handleSort('quantity')}>
                Shares <SortIcon field="quantity" />
              </th>
              <th className="p-3 text-right">Entry</th>
              <th className="p-3 text-right">Exit/Stop</th>
              <th className="p-3 cursor-pointer hover:text-white text-right" onClick={() => handleSort('pnl')}>
                P&L <SortIcon field="pnl" />
              </th>
              <th className="p-3 cursor-pointer hover:text-white text-right" onClick={() => handleSort('pnlPercent')}>
                P&L % <SortIcon field="pnlPercent" />
              </th>
              <th className="p-3 text-right">Risk %</th>
              <th className="p-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTrades.map((trade) => (
              <TradeRow 
                key={trade.id}
                trade={trade}
                isExpanded={expandedId === trade.id}
                onToggle={() => toggleExpand(trade.id)}
              />
            ))}
          </tbody>
        </table>
        
        {filteredTrades.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-slate-500">No trades found</p>
          </div>
        )}
      </div>
      
      {/* Mobile List */}
      <div className="md:hidden divide-y divide-white/5">
        {paginatedTrades.map((trade) => (
          <div key={trade.id} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">{trade.symbol}</span>
                <Badge variant={trade.side === 'LONG' ? 'success' : 'danger'} size="sm">
                  {trade.side}
                </Badge>
              </div>
              <span className={cn('font-semibold', trade.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {trade.totalPnL >= 0 ? '+' : ''}{formatMoney(trade.totalPnL)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{trade.quantity} shares @ {formatMoney(trade.entryPrice)}</span>
              <Badge variant={trade.outcome === 'WIN' ? 'success' : trade.outcome === 'LOSS' ? 'danger' : 'neutral'} size="sm">
                {trade.outcome}
              </Badge>
            </div>
          </div>
        ))}
        
        {filteredTrades.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-slate-500">No trades found</p>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <label htmlFor="trades-page-size">Rows per page</label>
          <select
            id="trades-page-size"
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(0);
            }}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white focus:outline-none focus:border-sky-500/50"
          >
            {[5, 10, 25].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <span>
            Page {filteredTrades.length === 0 ? 0 : currentPage + 1} of {filteredTrades.length === 0 ? 0 : totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="rounded-md border border-white/10 px-2 py-1 text-xs text-white hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Previous page"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className="rounded-md border border-white/10 px-2 py-1 text-xs text-white hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
