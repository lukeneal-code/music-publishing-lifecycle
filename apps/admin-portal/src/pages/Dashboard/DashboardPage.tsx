import { Music, FileText, DollarSign, Users, ArrowUpRight, ArrowDownRight, LayoutDashboard } from 'lucide-react';

const stats = [
  {
    label: 'Total Works',
    value: '1,284',
    change: '+12%',
    trend: 'up' as const,
    icon: Music,
    iconBg: 'bg-notion-purple-bg',
    iconColor: 'text-notion-purple-text',
    borderColor: 'border-l-notion-purple-text',
  },
  {
    label: 'Active Deals',
    value: '156',
    change: '+8%',
    trend: 'up' as const,
    icon: FileText,
    iconBg: 'bg-notion-blue-bg',
    iconColor: 'text-notion-blue-text',
    borderColor: 'border-l-notion-blue-text',
  },
  {
    label: 'Q1 Revenue',
    value: '$847,250',
    change: '+23%',
    trend: 'up' as const,
    icon: DollarSign,
    iconBg: 'bg-notion-green-bg',
    iconColor: 'text-notion-green-text',
    borderColor: 'border-l-notion-green-text',
  },
  {
    label: 'Songwriters',
    value: '89',
    change: '+5%',
    trend: 'up' as const,
    icon: Users,
    iconBg: 'bg-notion-orange-bg',
    iconColor: 'text-notion-orange-text',
    borderColor: 'border-l-notion-orange-text',
  },
];

const recentActivity = [
  { type: 'work', title: 'New work registered: "Midnight Dreams"', time: '2 hours ago' },
  { type: 'deal', title: 'Deal DEAL-2024-015 signed with John Smith', time: '4 hours ago' },
  { type: 'royalty', title: 'Q4 2023 royalty statements sent', time: '1 day ago' },
  { type: 'usage', title: '1.2M new streams processed from Spotify', time: '1 day ago' },
  { type: 'work', title: 'Work "Summer Love" matched to 3 recordings', time: '2 days ago' },
];

const getActivityDot = (type: string) => {
  switch (type) {
    case 'work':
      return 'bg-notion-purple-text';
    case 'deal':
      return 'bg-notion-blue-text';
    case 'royalty':
      return 'bg-notion-green-text';
    default:
      return 'bg-notion-orange-text';
  }
};

export function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-notion-purple-bg rounded-notion-md flex items-center justify-center flex-shrink-0">
          <LayoutDashboard className="w-5 h-5 text-notion-purple-text" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-notion-text">Dashboard</h1>
          <p className="text-xs text-notion-text-secondary mt-0.5">
            Overview of your music publishing operations
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`p-4 rounded-notion-md border border-notion-border-light border-l-2 ${stat.borderColor} hover:bg-notion-bg-hover transition-colors duration-100`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-notion-text-secondary">{stat.label}</p>
                <p className="text-lg font-semibold text-notion-text mt-1">{stat.value}</p>
              </div>
              <div className={`w-8 h-8 rounded-notion flex items-center justify-center ${stat.iconBg}`}>
                <stat.icon className={`w-4 h-4 ${stat.iconColor}`} />
              </div>
            </div>
            <div className="mt-3 flex items-center text-xs">
              {stat.trend === 'up' ? (
                <ArrowUpRight className="w-3.5 h-3.5 text-notion-green-text mr-1" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5 text-notion-red-text mr-1" />
              )}
              <span className={stat.trend === 'up' ? 'text-notion-green-text' : 'text-notion-red-text'}>
                {stat.change}
              </span>
              <span className="text-notion-text-tertiary ml-1">from last quarter</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div>
          <h2 className="text-sm font-semibold text-notion-text mb-4">Recent Activity</h2>
          <div className="space-y-1">
            {recentActivity.map((activity, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-notion hover:bg-notion-bg-hover transition-colors duration-100"
              >
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${getActivityDot(activity.type)}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-notion-text">{activity.title}</p>
                  <p className="text-[11px] text-notion-text-tertiary mt-0.5">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-semibold text-notion-text mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <button className="p-4 border border-notion-border-light rounded-notion-md hover:bg-notion-bg-hover transition-colors duration-100 text-left group">
              <div className={`w-8 h-8 rounded-notion flex items-center justify-center bg-notion-purple-bg mb-3`}>
                <Music className="w-4 h-4 text-notion-purple-text" />
              </div>
              <p className="text-xs font-medium text-notion-text">Add Work</p>
              <p className="text-[11px] text-notion-text-tertiary mt-0.5">Register new composition</p>
            </button>
            <button className="p-4 border border-notion-border-light rounded-notion-md hover:bg-notion-bg-hover transition-colors duration-100 text-left group">
              <div className={`w-8 h-8 rounded-notion flex items-center justify-center bg-notion-blue-bg mb-3`}>
                <FileText className="w-4 h-4 text-notion-blue-text" />
              </div>
              <p className="text-xs font-medium text-notion-text">Create Deal</p>
              <p className="text-[11px] text-notion-text-tertiary mt-0.5">Draft new agreement</p>
            </button>
            <button className="p-4 border border-notion-border-light rounded-notion-md hover:bg-notion-bg-hover transition-colors duration-100 text-left group">
              <div className={`w-8 h-8 rounded-notion flex items-center justify-center bg-notion-green-bg mb-3`}>
                <DollarSign className="w-4 h-4 text-notion-green-text" />
              </div>
              <p className="text-xs font-medium text-notion-text">Calculate Royalties</p>
              <p className="text-[11px] text-notion-text-tertiary mt-0.5">Run period calculation</p>
            </button>
            <button className="p-4 border border-notion-border-light rounded-notion-md hover:bg-notion-bg-hover transition-colors duration-100 text-left group">
              <div className={`w-8 h-8 rounded-notion flex items-center justify-center bg-notion-orange-bg mb-3`}>
                <Users className="w-4 h-4 text-notion-orange-text" />
              </div>
              <p className="text-xs font-medium text-notion-text">Add Songwriter</p>
              <p className="text-[11px] text-notion-text-tertiary mt-0.5">Register new writer</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
