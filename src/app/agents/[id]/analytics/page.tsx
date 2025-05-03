"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserButton } from "@clerk/nextjs";
import {
  Loader2,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  ChevronDown,
  Star,
} from "lucide-react";

interface Analytics {
  id: string;
  agentId: string;
  queryCount: number;
  responseTime: number | null;
  satisfactionScore: number | null;
  contentGaps: string | null;
  createdAt: string;
  updatedAt: string;
  chatCount?: number;
  messageCount?: number;
  dailyQueryCounts?: Array<{ date: string; count: number }>;
}

interface Agent {
  id: string;
  name: string;
  description?: string;
}

import { SocketProvider, useSocket } from "./socket-provider";

function AgentAnalyticsContent() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;
  const { socket, isConnected } = useSocket();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "custom">(
    "7d"
  );
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [dataSourceId, setDataSourceId] = useState<string>("");
  const [messageType, setMessageType] = useState<string>("");
  const [topic, setTopic] = useState<string>("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Fetch agent details
  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const response = await fetch(`/api/agents/${agentId}`);
        if (response.ok) {
          const data = await response.json();
          setAgent(data);
        } else {
          console.error("Failed to fetch agent");
        }
      } catch (error) {
        console.error("Error fetching agent:", error);
      }
    };

    fetchAgent();
  }, [agentId]);

  // Set date range based on selection
  useEffect(() => {
    const today = new Date();
    let start = new Date(today);
    let end = new Date(today);

    switch (dateRange) {
      case "7d":
        start.setDate(today.getDate() - 7);
        break;
      case "30d":
        start.setDate(today.getDate() - 30);
        break;
      case "90d":
        start.setDate(today.getDate() - 90);
        break;
      case "custom":
        // Use the custom dates set by the user
        return;
      default:
        start.setDate(today.getDate() - 7);
    }

    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  }, [dateRange]);

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);

      // Build query parameters
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (dataSourceId) params.append("dataSourceId", dataSourceId);
      if (messageType) params.append("messageType", messageType);
      if (topic) params.append("topic", topic);

      const queryString = params.toString() ? `?${params.toString()}` : "";
      const response = await fetch(
        `/api/agents/${agentId}/analytics${queryString}`
      );

      if (response.ok) {
        const data = await response.json();

        // Parse content gaps if it's a string
        if (data.contentGaps && typeof data.contentGaps === "string") {
          try {
            data.contentGaps = JSON.parse(data.contentGaps);
          } catch (e) {
            console.error("Error parsing content gaps:", e);
            data.contentGaps = {};
          }
        }

        setAnalytics(data);
      } else {
        console.error("Failed to fetch analytics");
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch and when filters change
  useEffect(() => {
    if (startDate && endDate) {
      fetchAnalytics();
    }
  }, [agentId, startDate, endDate, dataSourceId, messageType, topic]);

  // Listen for real-time updates
  useEffect(() => {
    if (!socket) return;

    // Listen for analytics updates
    socket.on("analytics_update", (data) => {
      console.log("Received real-time analytics update:", data);

      // Only update if it's for the current agent
      if (data.agentId === agentId) {
        setAnalytics((prevAnalytics) => {
          if (!prevAnalytics) return data;

          // Parse content gaps if it's a string
          let contentGaps = data.contentGaps;
          if (contentGaps && typeof contentGaps === "string") {
            try {
              contentGaps = JSON.parse(contentGaps);
            } catch (e) {
              console.error("Error parsing content gaps:", e);
              contentGaps = {};
            }
          }

          return {
            ...prevAnalytics,
            ...data,
            contentGaps,
          };
        });
      }
    });

    // Listen for new messages
    socket.on("new_message", (data) => {
      console.log("Received new message notification:", data);

      // If it's for the current agent, refresh analytics
      if (data.agentId === agentId) {
        fetchAnalytics();
      }
    });

    // Listen for new feedback
    socket.on("new_feedback", (data) => {
      console.log("Received new feedback notification:", data);

      // If it's for the current agent, refresh analytics
      if (data.agentId === agentId) {
        fetchAnalytics();
      }
    });

    return () => {
      socket.off("analytics_update");
      socket.off("new_message");
      socket.off("new_feedback");
    };
  }, [socket, agentId]);

  // Calculate max value for chart scaling
  const maxDailyCount = analytics?.dailyQueryCounts
    ? Math.max(...analytics.dailyQueryCounts.map((day) => day.count), 1)
    : 1;

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Content gaps data
  const contentGaps = analytics?.contentGaps
    ? typeof analytics.contentGaps === "string"
      ? JSON.parse(analytics.contentGaps)
      : analytics.contentGaps
    : {};

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="border-b border-neutral-200 dark:border-neutral-800">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Link href="/">
                <h1 className="text-2xl font-bold">Agennt</h1>
              </Link>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>

        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Link href="/">
              <h1 className="text-2xl font-bold">Agennt</h1>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link href={`/agents/${agentId}/edit`}>
              <Button variant="ghost">Edit Agent</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost">Dashboard</Button>
            </Link>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">
            Analytics: {agent?.name || "Agent"}
          </h1>
          <div className="flex space-x-4">
            <Link href="/analytics/compare">
              <Button variant="outline" size="sm">
                Compare Agents
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 bg-neutral-100 dark:bg-neutral-800 rounded-md p-1">
                <Button
                  variant={dateRange === "7d" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setDateRange("7d")}
                >
                  7D
                </Button>
                <Button
                  variant={dateRange === "30d" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setDateRange("30d")}
                >
                  30D
                </Button>
                <Button
                  variant={dateRange === "90d" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setDateRange("90d")}
                >
                  90D
                </Button>
                <Button
                  variant={dateRange === "custom" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setDateRange("custom")}
                >
                  Custom
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                {showAdvancedFilters ? "Hide Filters" : "Advanced Filters"}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <Download className="h-4 w-4" />
                    Export
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      // Build query parameters for export
                      const params = new URLSearchParams();
                      if (startDate) params.append("startDate", startDate);
                      if (endDate) params.append("endDate", endDate);
                      if (dataSourceId)
                        params.append("dataSourceId", dataSourceId);
                      if (messageType)
                        params.append("messageType", messageType);
                      if (topic) params.append("topic", topic);
                      params.append("format", "csv");

                      // Open export URL in new tab
                      window.open(
                        `/api/agents/${agentId}/analytics/export?${params.toString()}`,
                        "_blank"
                      );
                    }}
                  >
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      // Build query parameters for export
                      const params = new URLSearchParams();
                      if (startDate) params.append("startDate", startDate);
                      if (endDate) params.append("endDate", endDate);
                      if (dataSourceId)
                        params.append("dataSourceId", dataSourceId);
                      if (messageType)
                        params.append("messageType", messageType);
                      if (topic) params.append("topic", topic);
                      params.append("format", "json");

                      // Open export URL in new tab
                      window.open(
                        `/api/agents/${agentId}/analytics/export?${params.toString()}`,
                        "_blank"
                      );
                    }}
                  >
                    Export as JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Link href={`/agents/${agentId}/chat`}>
                <Button>Chat with Agent</Button>
              </Link>
            </div>
          </div>
        </div>

        {showAdvancedFilters && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Advanced Filters</CardTitle>
              <CardDescription>Refine your analytics data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dateRange === "custom" && (
                  <>
                    <div className="space-y-2">
                      <label
                        htmlFor="startDate"
                        className="text-sm font-medium"
                      >
                        Start Date
                      </label>
                      <input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full p-2 border border-neutral-200 dark:border-neutral-800 rounded-md"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="endDate" className="text-sm font-medium">
                        End Date
                      </label>
                      <input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full p-2 border border-neutral-200 dark:border-neutral-800 rounded-md"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <label htmlFor="dataSource" className="text-sm font-medium">
                    Data Source
                  </label>
                  <select
                    id="dataSource"
                    value={dataSourceId}
                    onChange={(e) => setDataSourceId(e.target.value)}
                    className="w-full p-2 border border-neutral-200 dark:border-neutral-800 rounded-md bg-white dark:bg-neutral-900"
                  >
                    <option value="">All Sources</option>
                    {analytics?.dataSources?.map((source) => (
                      <option key={source.id} value={source.id}>
                        {source.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="messageType" className="text-sm font-medium">
                    Message Type
                  </label>
                  <select
                    id="messageType"
                    value={messageType}
                    onChange={(e) => setMessageType(e.target.value)}
                    className="w-full p-2 border border-neutral-200 dark:border-neutral-800 rounded-md bg-white dark:bg-neutral-900"
                  >
                    <option value="">All Messages</option>
                    <option value="user">User Messages</option>
                    <option value="assistant">Assistant Responses</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="topic" className="text-sm font-medium">
                    Topic
                  </label>
                  <select
                    id="topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full p-2 border border-neutral-200 dark:border-neutral-800 rounded-md bg-white dark:bg-neutral-900"
                  >
                    <option value="">All Topics</option>
                    {analytics?.topics?.map((topicItem) => (
                      <option key={topicItem} value={topicItem}>
                        {topicItem}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDataSourceId("");
                  setMessageType("");
                  setTopic("");
                  if (dateRange === "custom") {
                    setDateRange("7d");
                  }
                }}
                className="mr-2"
              >
                Reset Filters
              </Button>
              <Button size="sm">Apply Filters</Button>
            </CardFooter>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                Total Queries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {analytics?.queryCount || 0}
              </div>
              <div className="flex items-center mt-1 text-xs">
                <span className="text-green-600 flex items-center">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  12%
                </span>
                <span className="text-neutral-500 ml-1">from last week</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                Avg. Response Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {analytics?.responseTime
                  ? Math.round(analytics.responseTime)
                  : 0}
                ms
              </div>
              <div className="flex items-center mt-1 text-xs">
                <span className="text-green-600 flex items-center">
                  <ArrowDownRight className="h-3 w-3 mr-1" />
                  15ms
                </span>
                <span className="text-neutral-500 ml-1">from last week</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                Satisfaction Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold flex items-center">
                {analytics?.satisfactionScore
                  ? (Math.round(analytics.satisfactionScore * 10) / 10).toFixed(
                      1
                    )
                  : "N/A"}
                {analytics?.satisfactionScore && (
                  <div className="flex ml-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.round(analytics.satisfactionScore || 0)
                            ? "text-yellow-500 fill-yellow-500"
                            : "text-neutral-400"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center mt-1 text-xs">
                <span className="text-green-600 flex items-center">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  0.2
                </span>
                <span className="text-neutral-500 ml-1">from last week</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                Total Chats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {analytics?.chatCount || 0}
              </div>
              <div className="flex items-center mt-1 text-xs">
                <span className="text-green-600 flex items-center">
                  <ArrowUpRight className="h-3 w-3 mr-1" />3
                </span>
                <span className="text-neutral-500 ml-1">from last week</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                Total Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {analytics?.messageCount || 0}
              </div>
              <div className="flex items-center mt-1 text-xs">
                <span className="text-green-600 flex items-center">
                  <ArrowUpRight className="h-3 w-3 mr-1" />8
                </span>
                <span className="text-neutral-500 ml-1">from last week</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Daily Queries</CardTitle>
              <CardDescription>Number of queries per day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 flex items-end space-x-2">
                {analytics?.dailyQueryCounts ? (
                  analytics.dailyQueryCounts.map((day) => (
                    <div
                      key={day.date}
                      className="flex flex-col items-center flex-1"
                    >
                      <div
                        className="w-full bg-blue-500 rounded-t"
                        style={{
                          height:
                            day.count > 0
                              ? `${(day.count / maxDailyCount) * 100}%`
                              : "4px",
                        }}
                      ></div>
                      <div className="mt-2 text-xs">{formatDate(day.date)}</div>
                      <div className="text-xs font-medium">{day.count}</div>
                    </div>
                  ))
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-400">
                    No data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Content Gaps</CardTitle>
              <CardDescription>
                Topics with insufficient coverage
              </CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(contentGaps).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(contentGaps).map(([topic, count]) => (
                    <div key={topic}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{topic}</span>
                        <span className="text-sm text-neutral-500">
                          {count as number} queries
                        </span>
                      </div>
                      <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2.5">
                        <div
                          className="bg-red-500 h-2.5 rounded-full"
                          style={{
                            width: `${Math.min(
                              ((count as number) / 20) * 100,
                              100
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-neutral-500">
                  No content gaps detected yet. This will populate as users
                  interact with your agent.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
            <CardDescription>
              Suggestions to improve your agent's performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(contentGaps).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(contentGaps)
                  .sort((a, b) => (b[1] as number) - (a[1] as number))
                  .slice(0, 1)
                  .map(([topic, count]) => (
                    <div
                      key={topic}
                      className="p-4 border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-900/20 rounded-md"
                    >
                      <h3 className="font-medium mb-2">
                        Add {topic} Documentation
                      </h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        {count as number} queries about {topic.toLowerCase()}{" "}
                        could not be answered accurately. Consider adding more
                        documentation on this topic.
                      </p>
                      <div className="mt-4">
                        <Link href={`/agents/${agentId}/sources/add`}>
                          <Button size="sm" variant="outline">
                            Add Content
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="p-4 border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20 rounded-md">
                <h3 className="font-medium mb-2">
                  Your agent is performing well
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  No significant content gaps detected. Continue monitoring as
                  usage increases.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <footer className="border-t border-neutral-200 dark:border-neutral-800 py-6 px-4">
        <div className="container mx-auto text-center text-sm text-neutral-600 dark:text-neutral-400">
          &copy; {new Date().getFullYear()} Agennt. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export default function AgentAnalyticsPage() {
  const params = useParams();
  const agentId = params.id as string;

  return (
    <SocketProvider agentId={agentId}>
      <AgentAnalyticsContent />
    </SocketProvider>
  );
}
