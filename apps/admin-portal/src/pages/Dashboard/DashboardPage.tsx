import { Music, FileText, DollarSign, Users, TrendingUp, TrendingDown } from 'lucide-react';

const stats = [
  {
    label: 'Total Works',
    value: '1,284',
    change: '+12%',
    trend: 'up',
    icon: Music,
    color: 'bg-purple-100 text-purple-600',
  },
  {
    label: 'Active Deals',
    value: '156',
    change: '+8%',
    trend: 'up',
    icon: FileText,
    color: 'bg-blue-100 text-blue-600',
  },
  {
    label: 'Q1 Revenue',
    value: '$847,250',
    change: '+23%',
    trend: 'up',
    icon: DollarSign,
    color: 'bg-green-100 text-green-600',
  },
  {
    label: 'Songwriters',
    value: '89',
    change: '+5%',
    trend: 'up',
    icon: Users,
    color: 'bg-orange-100 text-orange-600',
  },
];

const recentActivity = [
  { type: 'work', title: 'New work registered: "Midnight Dreams"', time: '2 hours ago' },
  { type: 'deal', title: 'Deal DEAL-2024-015 signed with John Smith', time: '4 hours ago' },
  { type: 'royalty', title: 'Q4 2023 royalty statements sent', time: '1 day ago' },
  { type: 'usage', title: '1.2M new streams processed from Spotify', time: '1 day ago' },
  { type: 'work', title: 'Work "Summer Love" matched to 3 recordings', time: '2 days ago' },
];

export function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Overview of your music publishing operations</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              {stat.trend === 'up' ? (
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
              )}
              <span className={stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}>
                {stat.change}
              </span>
              <span className="text-gray-500 ml-1">from last quarter</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div
                key={index}
                className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0"
              >
                <div
                  className={`w-2 h-2 rounded-full mt-2 ${
                    activity.type === 'work'
                      ? 'bg-purple-500'
                      : activity.type === 'deal'
                        ? 'bg-blue-500'
                        : activity.type === 'royalty'
                          ? 'bg-green-500'
                          : 'bg-orange-500'
                  }`}
                />
                <div>
                  <p className="text-sm text-gray-900">{activity.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
              <Music className="w-6 h-6 text-purple-600 mb-2" />
              <p className="font-medium text-gray-900">Add Work</p>
              <p className="text-sm text-gray-500">Register new composition</p>
            </button>
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
              <FileText className="w-6 h-6 text-blue-600 mb-2" />
              <p className="font-medium text-gray-900">Create Deal</p>
              <p className="text-sm text-gray-500">Draft new agreement</p>
            </button>
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
              <DollarSign className="w-6 h-6 text-green-600 mb-2" />
              <p className="font-medium text-gray-900">Calculate Royalties</p>
              <p className="text-sm text-gray-500">Run period calculation</p>
            </button>
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
              <Users className="w-6 h-6 text-orange-600 mb-2" />
              <p className="font-medium text-gray-900">Add Songwriter</p>
              <p className="text-sm text-gray-500">Register new writer</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
