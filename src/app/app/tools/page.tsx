import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Database, Download, Upload, BarChart3, Mail, Bell, Shield, Zap, Workflow, Code } from 'lucide-react';

export default function Tools() {
  // 工具分类配置
  const toolCategories = [
    {
      title: "Data Management",
      description: "Tools for data import, export, and management",
      tools: [
        {
          name: "Bulk Data Import",
          description: "Import client data from CSV or Excel files",
          icon: Upload,
          color: "text-blue-600",
          bgColor: "bg-blue-50"
        },
        {
          name: "Data Export",
          description: "Export processed documents and client information",
          icon: Download,
          color: "text-green-600",
          bgColor: "bg-green-50"
        },
        {
          name: "Database Backup",
          description: "Create and restore database backups",
          icon: Database,
          color: "text-purple-600",
          bgColor: "bg-purple-50"
        }
      ]
    },
    {
      title: "Automation & Workflow",
      description: "Automate repetitive tasks and create workflows",
      tools: [
        {
          name: "Workflow Builder",
          description: "Create custom workflows for document processing",
          icon: Workflow,
          color: "text-orange-600",
          bgColor: "bg-orange-50"
        },
        {
          name: "Auto Notifications",
          description: "Set up automated email and SMS notifications",
          icon: Bell,
          color: "text-yellow-600",
          bgColor: "bg-yellow-50"
        },
        {
          name: "Scheduled Reports",
          description: "Generate and send reports automatically",
          icon: BarChart3,
          color: "text-indigo-600",
          bgColor: "bg-indigo-50"
        }
      ]
    },
    {
      title: "Integration & API",
      description: "Connect with external systems and services",
      tools: [
        {
          name: "API Management",
          description: "Manage API keys and external integrations",
          icon: Code,
          color: "text-teal-600",
          bgColor: "bg-teal-50"
        },
        {
          name: "Email Integration",
          description: "Configure email services and templates",
          icon: Mail,
          color: "text-red-600",
          bgColor: "bg-red-50"
        },
        {
          name: "Security Center",
          description: "Manage security settings and permissions",
          icon: Shield,
          color: "text-gray-600",
          bgColor: "bg-gray-50"
        }
      ]
    }
  ];

  // 快速操作
  const quickActions = [
    {
      title: "System Health Check",
      description: "Run diagnostic checks on system performance",
      icon: Zap,
      action: "Run Check"
    },
    {
      title: "Clear Cache",
      description: "Clear temporary files and system cache",
      icon: Database,
      action: "Clear Cache"
    },
    {
      title: "Generate API Key",
      description: "Create new API key for external integrations",
      icon: Code,
      action: "Generate Key"
    }
  ];

  // 最近使用的工具
  const recentTools = [
    { name: "Data Export", lastUsed: "2 hours ago", usage: "high" },
    { name: "Workflow Builder", lastUsed: "1 day ago", usage: "medium" },
    { name: "Email Integration", lastUsed: "3 days ago", usage: "low" },
    { name: "Scheduled Reports", lastUsed: "1 week ago", usage: "medium" }
  ];

  const getUsageColor = (usage: string) => {
    switch (usage) {
      case 'high':
        return 'text-green-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Tools & Utilities</h1>
        <p className="mt-2 text-gray-600">Powerful tools to enhance your workflow and system management</p>
      </div>

      {/* 快速操作区域 */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="w-5 h-5 mr-2" />
            Quick Actions
          </CardTitle>
          <CardDescription>Frequently used system operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action, index) => {
              const IconComponent = action.icon;
              return (
                <div key={index} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center mb-3">
                    <IconComponent className="w-5 h-5 text-blue-600 mr-2" />
                    <h3 className="font-medium">{action.title}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{action.description}</p>
                  <Button size="sm" className="w-full">
                    {action.action}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 工具分类 */}
        <div className="lg:col-span-2 space-y-8">
          {toolCategories.map((category, categoryIndex) => (
            <Card key={categoryIndex}>
              <CardHeader>
                <CardTitle>{category.title}</CardTitle>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {category.tools.map((tool, toolIndex) => {
                    const IconComponent = tool.icon;
                    return (
                      <div key={toolIndex} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-start space-x-3">
                          <div className={`w-10 h-10 ${tool.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                            <IconComponent className={`w-5 h-5 ${tool.color}`} />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-1">{tool.name}</h4>
                            <p className="text-sm text-gray-600 mb-3">{tool.description}</p>
                            <Button variant="outline" size="sm">
                              Launch
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 侧边栏 */}
        <div className="space-y-6">
          {/* 最近使用的工具 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Tools</CardTitle>
              <CardDescription>Your most recently used tools</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentTools.map((tool, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div>
                      <p className="text-sm font-medium">{tool.name}</p>
                      <p className="text-xs text-gray-500">{tool.lastUsed}</p>
                    </div>
                    <div className={`text-xs font-medium ${getUsageColor(tool.usage)}`}>
                      {tool.usage}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 系统状态 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">API Status</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    Operational
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Database</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    Healthy
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Storage</span>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                    78% Used
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Backup</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    Up to date
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 系统设置 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">System Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="w-4 h-4 mr-2" />
                  General Settings
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Shield className="w-4 h-4 mr-2" />
                  Security Settings
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Bell className="w-4 h-4 mr-2" />
                  Notification Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 帮助和支持 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Help & Support</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <a href="#" className="block text-sm text-blue-600 hover:text-blue-800">
                  📖 Documentation
                </a>
                <a href="#" className="block text-sm text-blue-600 hover:text-blue-800">
                  🎥 Video Tutorials
                </a>
                <a href="#" className="block text-sm text-blue-600 hover:text-blue-800">
                  💬 Contact Support
                </a>
                <a href="#" className="block text-sm text-blue-600 hover:text-blue-800">
                  🐛 Report Bug
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 