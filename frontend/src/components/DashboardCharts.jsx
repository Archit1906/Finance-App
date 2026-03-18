import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement);

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
        borderColor: '#10b981',
        backgroundColor: '#10b981',
        tension: 0.4,
        fill: false,
      },
      {
        label: 'Expense',
        data: trend?.map(t => t.expense) || [],
        borderColor: '#f43f5e',
        backgroundColor: '#f43f5e',
        tension: 0.4,
        fill: false,
      }
    ]
  };

  const donutData = {
    labels: category?.map(c => c.category) || [],
    datasets: [{
      data: category?.map(c => c.total) || [],
      backgroundColor: [
        '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#0ea5e9', '#64748b', '#14b8a6', '#84cc16', '#f472b6', '#38bdf8', '#c084fc', '#fb923c'
      ],
      borderWidth: 0,
      hoverOffset: 4
    }]
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
      <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
        <h3 className="text-lg font-bold text-gray-900 mb-4">6-Month Trend</h3>
        <div className="h-72">
          {trend ? (
            <Line 
              data={lineData} 
              options={{ maintainAspectRatio: false, plugins: { legend: { position: 'top' } } }} 
            />
          ) : (
            <div className="animate-pulse bg-gray-50 h-full rounded-xl w-full"></div>
          )}
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Expense Breakdown</h3>
        <div className="h-72 flex justify-center pb-4">
           {category?.length > 0 ? (
             <Doughnut 
               data={donutData} 
               options={{ 
                 maintainAspectRatio: false, 
                 cutout: '70%', 
                 plugins: { 
                   legend: { position: 'bottom', labels: { boxWidth: 12, padding: 15 } },
                   tooltip: {
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
             <div className="text-sm text-gray-500 flex items-center justify-center h-full w-full bg-gray-50 rounded-xl">
               No expenses this month
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
