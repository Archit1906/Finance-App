import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement);

const DONUT_COLORS = {
  Housing: '#CC0000',
  Food: '#FF6B6B',
  Travel: '#FF9F43',
  Shopping: '#A855F7',
  Health: '#00C853',
  Entertainment: '#3B82F6',
  Utilities: '#06B6D4',
  Other: '#6B7280'
};

export default function DashboardCharts() {
  const { data: trend } = useQuery({
    queryKey: ['analytics', 'trend'],
    queryFn: async () => (await api.get('/analytics/trend')).data.data
  });

  const { data: category } = useQuery({
    queryKey: ['analytics', 'category'],
    queryFn: async () => (await api.get('/analytics/category')).data.data
  });

  const lineData = {
    labels: trend?.map(t => new Date(t.month + '-01').toLocaleDateString(undefined, {month: 'short'})) || [],
    datasets: [
      {
        label: 'Income',
        data: trend?.map(t => t.income) || [],
        borderColor: '#00C853',
        backgroundColor: '#00C853',
        tension: 0.4,
        fill: false,
      },
      {
        label: 'Expense',
        data: trend?.map(t => t.expense) || [],
        borderColor: '#CC0000',
        backgroundColor: '#CC0000',
        tension: 0.4,
        fill: false,
      }
    ]
  };

  const lineOptions = {
    maintainAspectRatio: false,
    plugins: { 
      legend: { 
        position: 'top',
        labels: { color: '#F5F5F5', font: { family: 'Inter', weight: 'bold' } } 
      } 
    },
    scales: {
      x: {
        grid: { color: '#2D0000', drawBorder: false },
        ticks: { color: '#B0A0A0', font: { family: 'Inter', weight: '600' } }
      },
      y: {
        grid: { color: '#2D0000', drawBorder: false },
        ticks: { color: '#B0A0A0', font: { family: 'Inter', weight: '600' }, callback: (v) => '₹' + v.toLocaleString('en-IN') }
      }
    }
  };

  const donutLabels = category?.map(c => c.category) || [];
  const donutDataRaw = category?.map(c => c.total) || [];
  const donutBgColors = donutLabels.map(cat => DONUT_COLORS[cat] || DONUT_COLORS.Other);

  const donutData = {
    labels: donutLabels,
    datasets: [{
      data: donutDataRaw,
      backgroundColor: donutBgColors,
      borderColor: '#1A0000',
      borderWidth: 2,
      hoverOffset: 6
    }]
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
      <div className="lg:col-span-2 bg-ignite-card p-6 rounded-2xl shadow-ignite-card border border-ignite-border hover:border-ignite-bhover transition-all">
        <h3 className="text-xl font-bold text-ignite-white mb-4 uppercase tracking-wider font-bebas">6-Month Trend</h3>
        <div className="h-72">
          {trend ? (
            <Line data={lineData} options={lineOptions} />
          ) : (
            <div className="animate-pulse bg-ignite-bg border border-ignite-border h-full rounded-xl w-full"></div>
          )}
        </div>
      </div>
      
      <div className="bg-ignite-card p-6 rounded-2xl shadow-ignite-card border border-ignite-border hover:border-ignite-bhover transition-all">
        <h3 className="text-xl font-bold text-ignite-white mb-4 uppercase tracking-wider font-bebas">Expense Breakdown</h3>
        <div className="h-72 flex justify-center pb-4">
           {category?.length > 0 ? (
             <Doughnut 
               data={donutData} 
               options={{ 
                 maintainAspectRatio: false, 
                 cutout: '72%', 
                 plugins: { 
                   legend: { position: 'bottom', labels: { boxWidth: 12, padding: 15, color: '#B0A0A0', font: { family: 'Inter', weight: 'bold' } } },
                   tooltip: {
                     backgroundColor: '#110000',
                     titleColor: '#F5F5F5',
                     bodyColor: '#F5F5F5',
                     borderColor: '#2D0000',
                     borderWidth: 1,
                     callbacks: {
                       label: function(context) {
                         let label = context.label || '';
                         if (label) label += ': ';
                         const total = context.dataset.data.reduce((a, b) => a + b, 0);
                         const value = context.raw;
                         const percentage = ((value / total) * 100).toFixed(1) + '%';
                         return label + '₹' + Number(value).toLocaleString('en-IN') + ' (' + percentage + ')';
                       }
                     }
                   }
                 } 
               }} 
             />
           ) : (
             <div className="text-sm text-ignite-muted font-bold flex items-center justify-center h-full w-full bg-ignite-bg rounded-xl border border-ignite-border">
               NO EXPENSES THIS MONTH
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
