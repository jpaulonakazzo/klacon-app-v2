import React, { useState, useMemo } from 'react';
import { 
  AppState, 
  FLOORS, 
  ALL_LOCATIONS, 
  Status,
  ServiceCategory
} from '../types';
import { cn } from '../lib/utils';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Legend,
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  TooltipProps
} from 'recharts';
import { motion } from 'motion/react';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Layers, 
  Building2, 
  TrendingUp, 
  Filter,
  BarChart3,
  PieChart as PieIcon,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';

interface DashboardScreenProps {
  state: AppState;
  onSelectLocation?: (locationId: string) => void;
  onOpenSettings?: () => void;
}

export function DashboardScreen({ state, onSelectLocation, onOpenSettings }: DashboardScreenProps) {
  const [selectedContractor, setSelectedContractor] = useState<string>('all');
  const [barChartMode, setBarChartMode] = useState<'percent' | 'count'>('percent');

  // All unique contractors present in locations
  const allContractors = useMemo(() => {
    const set = new Set<string>();
    Object.values(state.locations).forEach(loc => {
      Object.values(loc.services || {}).forEach(svc => {
        if (svc.contractor?.trim()) set.add(svc.contractor.trim());
      });
    });
    return Array.from(set).sort();
  }, [state.locations]);

  // Overall Services Status (Pie Chart Data)
  const pieData = useMemo(() => {
    let completed = 0;
    let inProgress = 0;
    let pending = 0;

    const locIds = Object.keys(state.locations);

    locIds.forEach(locId => {
      const loc = state.locations[locId];
      state.servicesList.forEach(svcName => {
        const svcData = loc.services?.[svcName];
        if (selectedContractor !== 'all' && svcData?.contractor?.trim() !== selectedContractor) {
          return;
        }

        const status = svcData?.status || 'pending';
        if (status === 'completed') completed++;
        else if (status === 'in_progress') inProgress++;
        else pending++;
      });
    });

    const total = completed + inProgress + pending;
    if (total === 0) return { data: [], total: 0, completed, inProgress, pending };

    const data = [
      { name: 'Concluído', value: completed, color: '#10b981', textColor: 'text-emerald-600 dark:text-emerald-400' },
      { name: 'Em Andamento', value: inProgress, color: '#f59e0b', textColor: 'text-amber-600 dark:text-amber-400' },
      { name: 'Pendente', value: pending, color: '#94a3b8', textColor: 'text-slate-500 dark:text-slate-400' }
    ].filter(d => d.value > 0);

    return { data, total, completed, inProgress, pending };
  }, [state.locations, state.servicesList, selectedContractor]);

  const overallPercent = pieData.total > 0 
    ? Math.round((pieData.completed / pieData.total) * 100) 
    : 0;

  // Categories Progress (Bar Chart Data)
  const categoriesData = useMemo(() => {
    const locIds = Object.keys(state.locations);
    const totalLocationsCount = locIds.length || 1;

    return state.categories.map(cat => {
      const subServices = cat.subServices || [];
      let catCompleted = 0;
      let catInProgress = 0;
      let catPending = 0;

      locIds.forEach(locId => {
        const loc = state.locations[locId];
        subServices.forEach(subName => {
          const svcData = loc.services?.[subName];
          if (selectedContractor !== 'all' && svcData?.contractor?.trim() !== selectedContractor) {
            return;
          }

          const status = svcData?.status || 'pending';
          if (status === 'completed') catCompleted++;
          else if (status === 'in_progress') catInProgress++;
          else catPending++;
        });
      });

      const catTotal = catCompleted + catInProgress + catPending;
      const catPercent = catTotal > 0 ? Math.round((catCompleted / catTotal) * 100) : 0;

      // Clean category name for chart label (remove emojis if any for concise x-axis)
      const cleanName = cat.name.replace(/[^\w\s\u00C0-\u00FF]/gi, '').trim() || cat.name;

      return {
        id: cat.id,
        rawName: cat.name,
        name: cleanName.length > 14 ? `${cleanName.slice(0, 12)}...` : cleanName,
        fullName: cat.name,
        completed: catCompleted,
        inProgress: catInProgress,
        pending: catPending,
        total: catTotal,
        subCount: subServices.length,
        percent: catPercent
      };
    });
  }, [state.categories, state.locations, selectedContractor]);

  // Floor by floor progress
  const floorData = useMemo(() => {
    return FLOORS.map(floor => {
      let floorCompleted = 0;
      let floorTotal = 0;

      floor.locations.forEach(locId => {
        const loc = state.locations[locId];
        state.servicesList.forEach(svcName => {
          const svcData = loc?.services?.[svcName];
          if (selectedContractor !== 'all' && svcData?.contractor?.trim() !== selectedContractor) {
            return;
          }
          floorTotal++;
          if (svcData?.status === 'completed') {
            floorCompleted++;
          }
        });
      });

      const percent = floorTotal > 0 ? Math.round((floorCompleted / floorTotal) * 100) : 0;

      return {
        id: floor.id,
        name: floor.name.replace('Pavimento', 'Pav.').replace('Térreo', 'Térreo'),
        fullName: floor.name,
        completed: floorCompleted,
        total: floorTotal,
        percent
      };
    });
  }, [state.locations, state.servicesList, selectedContractor]);

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-6 max-w-6xl mx-auto">
      
      {/* Header & Contractor Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 sm:p-5 rounded-2xl shadow-xs transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 leading-tight">
              Dashboard de Obras
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Acompanhamento analítico e métricas em tempo real
            </p>
          </div>
        </div>

        {/* Contractor Filter Dropdown / Pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Filter className="w-4 h-4 text-neutral-400" />
          <select 
            value={selectedContractor}
            onChange={(e) => setSelectedContractor(e.target.value)}
            className="text-xs font-semibold bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-600"
          >
            <option value="all">Todas as Empreiteiras</option>
            {allContractors.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* KPI: Overall Progress */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Progresso Geral</span>
            <TrendingUp className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-neutral-900 dark:text-neutral-100">
              {overallPercent}%
            </span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">concluído</span>
          </div>
          <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden mt-3">
            <div 
              className="bg-teal-500 dark:bg-teal-400 h-full transition-all duration-500 rounded-full"
              style={{ width: `${overallPercent}%` }}
            />
          </div>
        </div>

        {/* KPI: Completed Services */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Concluídos</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {pieData.completed}
            </span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">itens</span>
          </div>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-3">
            {pieData.total > 0 ? Math.round((pieData.completed / pieData.total) * 100) : 0}% do total da obra
          </p>
        </div>

        {/* KPI: In Progress */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Em Andamento</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
              {pieData.inProgress}
            </span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">itens</span>
          </div>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-3">
            {pieData.total > 0 ? Math.round((pieData.inProgress / pieData.total) * 100) : 0}% em execução
          </p>
        </div>

        {/* KPI: Pending */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Pendentes</span>
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-700 dark:text-slate-300">
              {pieData.pending}
            </span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">itens</span>
          </div>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-3">
            {pieData.total > 0 ? Math.round((pieData.pending / pieData.total) * 100) : 0}% aguardando
          </p>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Chart 1: Gráfico de Pizza (Status de Serviços) - 5 cols */}
        <div className="lg:col-span-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Status dos Serviços
              </h2>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
              {pieData.total} registros
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
            Distribuição de serviços Concluídos, Em Andamento e Pendentes
          </p>

          {pieData.data.length > 0 ? (
            <div className="flex flex-col items-center">
              <div className="w-full h-64 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData.data}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(val: number) => [`${val} serviços (${Math.round((val / pieData.total) * 100)}%)`, 'Quantidade']}
                      contentStyle={{
                        backgroundColor: '#171717',
                        borderColor: '#262626',
                        borderRadius: '0.75rem',
                        color: '#f5f5f5',
                        fontSize: '0.75rem'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center Percentage Display */}
                <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-neutral-900 dark:text-neutral-100">
                    {overallPercent}%
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Concluído
                  </span>
                </div>
              </div>

              {/* Custom Legend */}
              <div className="w-full grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                {pieData.data.map((item) => (
                  <div key={item.name} className="flex flex-col items-center text-center p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      {item.value}
                    </span>
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                      {Math.round((item.value / pieData.total) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-xs text-neutral-500 dark:text-neutral-400">
              Nenhum dado encontrado para o filtro selecionado.
            </div>
          )}
        </div>

        {/* Chart 2: Gráfico de Barras (Avanço das Categorias) - 7 cols */}
        <div className="lg:col-span-7 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Avanço das Categorias
              </h2>
            </div>

            {/* Mode Toggle: Percent vs Count */}
            <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl self-start sm:self-auto text-xs">
              <button
                type="button"
                onClick={() => setBarChartMode('percent')}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-bold transition-all",
                  barChartMode === 'percent'
                    ? "bg-white dark:bg-neutral-700 text-teal-700 dark:text-teal-300 shadow-xs"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                )}
              >
                % Conclusão
              </button>
              <button
                type="button"
                onClick={() => setBarChartMode('count')}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-bold transition-all",
                  barChartMode === 'count'
                    ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                )}
              >
                Qtd. Itens
              </button>
            </div>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
            Comparativo de execução de cada categoria cadastrada (Granitos, Portas, etc.)
          </p>

          {categoriesData.length > 0 ? (
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={categoriesData} 
                  margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11, fill: '#a3a3a3' }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#a3a3a3' }}
                    domain={barChartMode === 'percent' ? [0, 100] : ['auto', 'auto']}
                    unit={barChartMode === 'percent' ? '%' : ''}
                  />
                  <RechartsTooltip 
                    formatter={(val: number, name: string) => {
                      if (name === 'percent') return [`${val}% concluído`, 'Avanço'];
                      if (name === 'completed') return [`${val} concluídos`, 'Concluído'];
                      if (name === 'inProgress') return [`${val} em andamento`, 'Em Andamento'];
                      return [val, name];
                    }}
                    labelFormatter={(label, payload) => {
                      const item = payload?.[0]?.payload;
                      return item?.fullName || label;
                    }}
                    contentStyle={{
                      backgroundColor: '#171717',
                      borderColor: '#262626',
                      borderRadius: '0.75rem',
                      color: '#f5f5f5',
                      fontSize: '0.75rem'
                    }}
                  />
                  {barChartMode === 'percent' ? (
                    <Bar 
                      dataKey="percent" 
                      fill="#0d9488" 
                      radius={[6, 6, 0, 0]}
                    />
                  ) : (
                    <>
                      <Bar dataKey="completed" name="completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="inProgress" name="inProgress" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-16 text-center text-xs text-neutral-500 dark:text-neutral-400">
              Nenhuma categoria encontrada. Crie categorias em Ajustes.
            </div>
          )}
        </div>
      </div>

      {/* Detailed Category Progress Cards */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Detalhamento de Categorias & Subitens
            </h3>
          </div>
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
            >
              <span>Gerenciar Categorias</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categoriesData.map(cat => (
            <div 
              key={cat.id}
              className="p-4 rounded-xl border border-neutral-200/90 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 flex flex-col justify-between gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                    {cat.fullName}
                  </h4>
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {cat.subCount} {cat.subCount === 1 ? 'subitem' : 'subitens'} atrelados
                  </span>
                </div>
                <span className={cn(
                  "text-xs font-bold px-2 py-0.5 rounded-lg border",
                  cat.percent === 100
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300"
                    : cat.percent > 0
                      ? "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/80 dark:text-teal-300"
                      : "bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400"
                )}>
                  {cat.percent}%
                </span>
              </div>

              <div>
                <div className="w-full bg-neutral-200 dark:bg-neutral-700 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-teal-500 dark:bg-teal-400 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${cat.percent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 mt-1.5">
                  <span>{cat.completed} concluídos</span>
                  <span>{cat.total} total</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress by Floor (Pavimento) */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            Avanço por Pavimento
          </h3>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
          Taxa de conclusão dos serviços dividida por andar
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {floorData.map(floor => (
            <div 
              key={floor.id}
              className="p-3 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 flex flex-col justify-between"
            >
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate">
                {floor.name}
              </span>
              <div className="my-2">
                <span className="text-xl font-extrabold text-neutral-900 dark:text-neutral-100">
                  {floor.percent}%
                </span>
              </div>
              <div className="w-full bg-neutral-200 dark:bg-neutral-700 h-1.5 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-500 rounded-full",
                    floor.percent >= 80 ? "bg-emerald-500" : floor.percent >= 40 ? "bg-teal-500" : "bg-amber-500"
                  )}
                  style={{ width: `${floor.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
